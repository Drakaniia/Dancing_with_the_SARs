"""Generate the committed map tiles, vector GeoJSONs, table JSONs, and manifest for all 7 families.

    python scripts/tiles/inventory.py                        # contract + estimate first
    python scripts/tiles/pipeline.py --families all          # all 7 families + vectors + tables
    python scripts/tiles/pipeline.py --families radar --full # ignore the cache
    python scripts/tiles/pipeline.py --check                 # validate the committed manifest

Per layer-date (spec 5.1): warp EPSG:32651 -> EPSG:3857 with overviews and the boundary
mask, render the ramp or categorical classes into a PNG8 palette, cut z5-z13/z11 XYZ tiles
(skipping empty ones), export boundary/landslide GeoJSONs and CSV tables as JSON, then
write `public/data/manifest.json` and report measured tiles and bytes against the budget.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import re
import shutil
import sqlite3
import sys
import time
from collections import defaultdict

import numpy as np
import rasterio
import rasterio.features
import shapely
from PIL import Image
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.warp import calculate_default_transform, reproject
from rasterio.windows import from_bounds
from shapely.geometry import mapping
from shapely.ops import transform as shapely_transform

import manifest_schema
from inventory import read_vectors, strip_gpkg_header
from ramps import CLASS_SCHEMES, RAMPS, TRANSPARENT, colorize, colorize_classes, expand_stops

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = "data"
CACHE_DIR = os.path.join(DATA_DIR, ".cache")
TILE_ROOT = os.path.join("public", "tiles")
PUBLIC_DATA_DIR = os.path.join("public", "data")
MANIFEST_PATH = os.path.join(PUBLIC_DATA_DIR, "manifest.json")

PIPELINE_NAME = "nisar-tile-pipeline"
PIPELINE_VERSION = "2.1.0"

WEB_MERCATOR_HALF = 20037508.342789244
WEB_MERCATOR_SIZE = WEB_MERCATOR_HALF * 2
TILE_PX = 256
OVERVIEWS = [2, 4, 8, 16, 32, 64]

MAX_TILES = 35_000
MAX_BYTES = 600 * 1024 * 1024

ATTRIBUTION = (
    "NISAR L2 GCOV (NASA-ISRO, provisional) · Landsat HLS L30 v2.0 · "
    "MODIS MOD13Q1/MOD11A2 · GPM IMERG V07 · SRTMGL1 · NOAA CPC"
)

FAMILY_ORDER = ["radar", "vegetation", "landcover", "earthquake", "climate", "outlook", "terrain"]
SUPPORTED_FAMILIES = set(FAMILY_ORDER)

# Product metadata: display order, default ramp, fixed domain (None = 2nd/98th percentile).
PRODUCTS = {
    # radar
    "backscatter_monthly": dict(order=0, ramp="backscatter", domain=None, units="dB"),
    "backscatter_daily": dict(order=1, ramp="backscatter", domain=None, units="dB"),
    "change_monthly": dict(order=2, ramp="change", domain=[-3.0, 3.0], units="dB"),
    "change_pair": dict(order=3, ramp="change", domain=[-3.0, 3.0], units="dB"),
    # vegetation
    "vegetation_monthly": dict(order=10, ramp="vegetation", domain=[0.0, 0.8], units="index"),
    "vegetation_daily": dict(order=11, ramp="vegetation", domain=[0.0, 0.8], units="index"),
    # landcover
    "landcover_2026": dict(order=20, ramp="vegetation", domain=[1.0, 8.0], units="class"),
    "landcover_change": dict(order=21, ramp="change", domain=[1.0, 5.0], units="class"),
    "landcover_2020": dict(order=22, ramp="vegetation", domain=[1.0, 8.0], units="class"),
    "landcover_confidence": dict(order=23, ramp="confidence", domain=[20.0, 100.0], units="%"),
    # earthquake
    "landslides": dict(order=30, ramp="change", domain=[1.0, 5.0], units="class"),
    "quake_change_2026": dict(order=31, ramp="change", domain=[-0.3, 0.3], units="index"),
    "quake_anomaly": dict(order=32, ramp="change", domain=[-0.3, 0.3], units="index"),
    "quake_pre": dict(order=33, ramp="vegetation", domain=[0.0, 0.85], units="index"),
    "quake_post": dict(order=34, ramp="vegetation", domain=[0.0, 0.85], units="index"),
    "quake_change_2025": dict(order=35, ramp="change", domain=[-0.3, 0.3], units="index"),
    # climate
    "hls_quarterly": dict(order=40, ramp="vegetation", domain=[0.0, 0.85], units="index"),
    "hls_anomaly": dict(order=41, ramp="change", domain=[-0.25, 0.25], units="index"),
    "modis_ndvi": dict(order=42, ramp="vegetation", domain=[0.2, 0.92], units="index"),
    "modis_ndvi_anomaly": dict(order=43, ramp="change", domain=[-0.15, 0.15], units="index"),
    "modis_lst": dict(order=44, ramp="temperature", domain=[18.0, 35.0], units="degC"),
    "modis_lst_anomaly": dict(order=45, ramp="temperature_anomaly", domain=[-3.0, 3.0], units="degC"),
    "hls_validobs": dict(order=46, ramp="confidence", domain=[1.0, 16.0], units="count"),
    # outlook
    "outlook_vegetation": dict(order=50, ramp="vegetation", domain=[0.1, 0.85], units="index"),
    "outlook_heat": dict(order=51, ramp="temperature", domain=[19.0, 36.0], units="degC"),
    # terrain
    "elevation": dict(order=60, ramp="elevation", domain=[0.0, 2200.0], units="m"),
    "slope": dict(order=61, ramp="slope", domain=[0.0, 45.0], units="deg"),
    "aspect": dict(order=62, ramp="aspect", domain=[0.0, 360.0], units="deg"),
}

CAVEATS = {
    "backscatter_monthly": [
        "Provisional NISAR calibration; backscatter intensity, not ground deformation",
    ],
    "backscatter_daily": [
        "Single pass swath, not province-wide: coverage varies from 4% to 100% by date",
        "Provisional NISAR calibration; backscatter intensity, not ground deformation",
    ],
    "change_monthly": [
        "Backscatter change, not ground deformation (uplift/subsidence requires GUNW interferometry)",
        "Does not capture the 8 June 2026 quake directly: first NISAR scene is 28 June 2026",
    ],
    "change_pair": [
        "Same orbit track only: do not compare values across tracks 39, 75, and 111",
        "Backscatter change, not ground deformation",
    ],
    "vegetation_monthly": [
        "ML estimate from NISAR radar backscatter; explains ~1/3 of optical variance",
    ],
    "vegetation_daily": [
        "Single pass swath; ML estimate from NISAR radar explains ~1/3 of optical variance",
    ],
    "landcover_2026": [
        "2026 NISAR-derived 8-class land cover classification",
    ],
    "landcover_2020": [
        "2020 baseline 8-class land cover reference",
    ],
    "landcover_change": [
        "Class 1 (agree) is rendered transparent so transitions stand out over the basemap",
    ],
    "landcover_confidence": [
        "Classifier confidence percentage for 2026 land cover",
    ],
    "landslides": [
        "~30% of the post-quake optical window was cloud-obscured (class 4)",
        "No elevation data south of 5.9°N in the candidate check (class 5)",
    ],
    "quake_change_2026": [
        "Optical HLS difference (9 Jun-25 Sep minus 1 Mar-7 Jun 2026) around the 8 June M7.8 earthquake",
    ],
    "quake_anomaly": [
        "2026 post-quake change minus 2025 same-season change to isolate non-seasonal loss",
    ],
    "quake_pre": [
        "Pre-earthquake optical HLS composite (1 Mar-7 Jun)",
    ],
    "quake_post": [
        "Post-earthquake optical HLS composite (9 Jun-25 Sep)",
    ],
    "quake_change_2025": [
        "2025 reference seasonal difference across the same calendar window",
    ],
    "hls_quarterly": [
        "Landsat HLS 30 m quarterly composite",
    ],
    "hls_anomaly": [
        "2026 quarter minus the matching 2025 quarter",
    ],
    "hls_validobs": [
        "Diagnostic layer: number of cloud-free Landsat HLS observations in the quarter",
    ],
    "modis_ndvi": [
        "MODIS 250 m monthly vegetation index (MOD13Q1)",
    ],
    "modis_ndvi_anomaly": [
        "2026 month minus the matching 2025 month",
    ],
    "modis_lst": [
        "MODIS 1 km daytime land surface temperature; 2024-12 has sparse valid pixels (2.2% AOI)",
    ],
    "modis_lst_anomaly": [
        "2026 month minus the matching 2025 month; extreme cold pixels reflect residual cloud",
    ],
    "outlook_vegetation": [
        "12-month El Nino scenario projection (Nov 2026-Oct 2027), not a deterministic forecast",
    ],
    "outlook_heat": [
        "12-month El Nino daytime temperature scenario (Nov 2026-Oct 2027), not a deterministic forecast",
    ],
    "elevation": [
        "SRTM 30 m digital elevation model clipped to Sarangani & Davao Occidental",
    ],
    "slope": [
        "Terrain slope in degrees derived from SRTM 30 m",
    ],
    "aspect": [
        "Slope aspect compass direction (0-360 deg) derived from SRTM 30 m",
    ],
}


# --------------------------------------------------------------------------- naming

def tile_segment(period: str) -> str:
    """URL-safe path segment for a period: `2026-10 (vs 2026-09)` -> `2026-10-vs-2026-09`."""
    segment = period.lower().replace(" (vs ", "-vs-").replace(")", "").replace(" ", "-")
    segment = re.sub(r"[^a-z0-9.-]", "", segment)
    return segment.strip("-")


def describe_layer(layer: dict) -> dict:
    """Stable id, human-readable name, ramp, domain, units and caveats for any inventory raster."""
    family = layer["family"]
    product = layer["product"]
    meta = PRODUCTS[product]
    variant = (layer.get("variant") or "").strip()
    var_up = variant.upper()
    var_lo = variant.lower().replace("_", "-")

    ramp_key = meta["ramp"]
    fixed_domain = list(meta["domain"]) if meta["domain"] is not None else None
    units = meta["units"]
    caveats = list(CAVEATS.get(product, []))

    if family == "radar":
        pol = (variant or "xx").upper()
        if product == "change_pair":
            track = (layer["track"] or "notrack").upper()
            return {
                "id": f"radar-change-{pol.lower()}-{track.lower()}",
                "name": f"{pol} Same-Track Change ({track})",
                "product": product,
                "rampKey": ramp_key,
                "fixedDomain": fixed_domain,
                "units": units,
                "caveats": caveats,
            }
        suffix = {"backscatter_monthly": "monthly", "backscatter_daily": "by-date",
                  "change_monthly": "monthly"}[product]
        verb = "Backscatter Change" if product == "change_monthly" else "Backscatter"
        return {
            "id": f"radar-{product.split('_')[0]}-{pol.lower()}-{suffix}",
            "name": f"{pol} {verb} ({'by date' if suffix == 'by-date' else 'monthly'})",
            "product": product,
            "rampKey": ramp_key,
            "fixedDomain": fixed_domain,
            "units": units,
            "caveats": caveats,
        }

    if family == "vegetation":
        if var_up == "NDMI":
            ramp_key = "moisture"
            fixed_domain = [-0.2, 0.6]
        else:
            ramp_key = "vegetation"
            fixed_domain = [0.0, 0.8]
        suffix = "monthly" if product == "vegetation_monthly" else "by-date"
        label_var = "Plant Moisture (NDMI)" if var_up == "NDMI" else "Vegetation Greenness (EVI)"
        return {
            "id": f"vegetation-{var_lo}-{suffix}",
            "name": f"NISAR {label_var} ({'monthly' if suffix == 'monthly' else 'by date'})",
            "product": product,
            "rampKey": ramp_key,
            "fixedDomain": fixed_domain,
            "units": units,
            "caveats": caveats,
        }

    if family == "landcover":
        names = {
            "landcover_2026": ("landcover-classes", "Land Cover Classes (2020 & 2026)"),
            "landcover_2020": ("landcover-classes", "Land Cover Classes (2020 & 2026)"),
            "landcover_change": ("landcover-change-2020-2026", "Land Cover Change (2026 vs 2020)"),
            "landcover_confidence": ("landcover-confidence-2026", "Classifier Confidence (2026)"),
        }
        lid, lname = names[product]
        return {
            "id": lid,
            "name": lname,
            "product": product,
            "rampKey": ramp_key,
            "fixedDomain": fixed_domain,
            "units": units,
            "caveats": caveats,
        }

    if family == "earthquake":
        if product == "landslides":
            return {
                "id": "earthquake-landslide-candidates",
                "name": "Post-Quake Landslide Candidates",
                "product": product,
                "rampKey": ramp_key,
                "fixedDomain": fixed_domain,
                "units": units,
                "caveats": caveats,
            }
        eq_names = {
            "quake_change_2026": (f"earthquake-{var_lo}-change-2026", f"Quake {var_up} Change (Post minus Pre)"),
            "quake_anomaly": (f"earthquake-{var_lo}-anomaly-2026", f"Quake {var_up} Excess Loss (vs 2025 Seasonal)"),
            "quake_pre": (f"earthquake-{var_lo}-pre", f"Pre-Quake {var_up} Composite"),
            "quake_post": (f"earthquake-{var_lo}-post", f"Post-Quake {var_up} Composite"),
            "quake_change_2025": (f"earthquake-{var_lo}-change-2025", f"Baseline 2025 Seasonal {var_up} Change"),
        }
        lid, lname = eq_names[product]
        return {
            "id": lid,
            "name": lname,
            "product": product,
            "rampKey": ramp_key,
            "fixedDomain": fixed_domain,
            "units": units,
            "caveats": caveats,
        }

    if family == "climate":
        if product == "hls_quarterly":
            if var_up == "NDMI":
                ramp_key, fixed_domain = "moisture", [-0.2, 0.6]
            elif var_up == "NDWI":
                ramp_key, fixed_domain = "water", [-0.6, 0.4]
            else:
                ramp_key, fixed_domain = "vegetation", [0.0, 0.85]
            return {
                "id": f"climate-hls-{var_lo}-quarterly",
                "name": f"Landsat HLS {var_up} (Quarterly)",
                "product": product,
                "rampKey": ramp_key,
                "fixedDomain": fixed_domain,
                "units": units,
                "caveats": caveats,
            }
        if product == "hls_anomaly":
            if var_up == "NDMI":
                ramp_key, fixed_domain = "moisture", [-0.25, 0.25]
            elif var_up == "NDWI":
                ramp_key, fixed_domain = "water", [-0.25, 0.25]
            else:
                ramp_key, fixed_domain = "change", [-0.25, 0.25]
            return {
                "id": f"climate-hls-{var_lo}-anomaly",
                "name": f"Landsat HLS {var_up} Anomaly (vs 2025)",
                "product": product,
                "rampKey": ramp_key,
                "fixedDomain": fixed_domain,
                "units": units,
                "caveats": caveats,
            }
        climate_map = {
            "modis_ndvi": ("climate-modis-ndvi-monthly", "MODIS NDVI (Monthly)"),
            "modis_ndvi_anomaly": ("climate-modis-ndvi-anomaly", "MODIS NDVI Anomaly (vs 2025)"),
            "modis_lst": ("climate-modis-lst-monthly", "MODIS Land Temperature (Monthly)"),
            "modis_lst_anomaly": ("climate-modis-lst-anomaly", "MODIS Temperature Anomaly (vs 2025)"),
            "hls_validobs": ("climate-hls-valid-obs", "Landsat HLS Valid Observations"),
        }
        lid, lname = climate_map[product]
        return {
            "id": lid,
            "name": lname,
            "product": product,
            "rampKey": ramp_key,
            "fixedDomain": fixed_domain,
            "units": units,
            "caveats": caveats,
        }

    if family == "outlook":
        # variant is e.g. EVI-expected, EVI-anomaly, EVI-chance_below_normal, EVI-ElNino_sensitivity_per_degC,
        # anomaly, expected, LST-chance_below_normal, LST-ElNino_sensitivity_per_degC
        v = variant
        if product == "outlook_heat" and not v.upper().startswith("LST"):
            v = f"LST-{v}"
        parts = v.split("-", 1)
        sensor = parts[0].upper()
        field = parts[1] if len(parts) > 1 else "expected"

        if field == "expected":
            if sensor == "LST":
                ramp_key, fixed_domain, units = "temperature", [19.0, 36.0], "degC"
                lname = "Outlook Expected Land Temperature"
            else:
                ramp_key, fixed_domain, units = "vegetation", [0.1, 0.85], "index"
                lname = f"Outlook Expected {sensor}"
            lid = f"outlook-{sensor.lower()}-expected"
        elif field == "anomaly":
            if sensor == "LST":
                ramp_key, fixed_domain, units = "temperature_anomaly", [-2.5, 2.5], "degC"
                lname = "Outlook Land Temperature Anomaly"
            else:
                ramp_key, fixed_domain, units = "change", [-0.15, 0.15], "index"
                lname = f"Outlook {sensor} Anomaly"
            lid = f"outlook-{sensor.lower()}-anomaly"
        elif field == "chance_below_normal":
            ramp_key, fixed_domain, units = "probability_drought", [0.0, 1.0], "probability"
            lid = f"outlook-{sensor.lower()}-chance-below-normal"
            lname = f"Outlook {sensor} Chance Below Normal"
        else:
            if sensor == "LST":
                ramp_key, fixed_domain, units = "temperature_anomaly", [-1.0, 1.0], "degC/degC"
            else:
                ramp_key, fixed_domain, units = "change", [-0.08, 0.08], "index/degC"
            lid = f"outlook-{sensor.lower()}-elnino-sensitivity"
            lname = f"Outlook {sensor} El Nino Sensitivity (per +1 °C ONI)"

        return {
            "id": lid,
            "name": lname,
            "product": product,
            "rampKey": ramp_key,
            "fixedDomain": fixed_domain,
            "units": units,
            "caveats": caveats,
        }

    if family == "terrain":
        terrain_map = {
            "elevation": ("terrain-elevation", "SRTM Elevation"),
            "slope": ("terrain-slope", "SRTM Terrain Slope"),
            "aspect": ("terrain-aspect", "SRTM Slope Aspect"),
        }
        lid, lname = terrain_map[product]
        return {
            "id": lid,
            "name": lname,
            "product": product,
            "rampKey": ramp_key,
            "fixedDomain": fixed_domain,
            "units": units,
            "caveats": caveats,
        }

    raise ValueError(f"Unhandled layer family/product: {family} / {product}")


def layer_items(inventory: dict, family: str) -> list[dict]:
    """Expand the inventory into one work item per layer-date (unfolding multi-band rasters)."""
    items: list[dict] = []
    for layer in inventory["layers"]:
        if layer["family"] != family:
            continue
        meta = PRODUCTS[layer["product"]]
        base = describe_layer(layer)
        periods = layer["periods"]
        multi_band = len(layer["bands"]) > 1 and len(periods) == len(layer["bands"])

        for idx, period in enumerate(periods):
            band_index = idx + 1 if multi_band else 1
            band_meta = layer["bands"][band_index - 1]
            items.append({
                **base,
                "family": family,
                "valueType": layer["valueType"],
                "classesKey": layer.get("classes"),
                "sourceFile": layer["path"],
                "band": band_index,
                "scaleFactor": float(band_meta["scale"] or 1.0),
                "nodata": band_meta["nodata"],
                "period": period,
                "segment": tile_segment(period),
                "minZoom": layer["zoomRange"][0],
                "maxZoom": layer["zoomRange"][1],
                "order": (
                    FAMILY_ORDER.index(family),
                    meta["order"],
                    base["id"],
                    manifest_schema.period_sort_key(period),
                ),
            })
    seen: dict[tuple, str] = {}
    for item in items:
        key = (item["id"], item["period"])
        if key in seen:
            raise SystemExit(
                f"error: two sources map to layer {item['id']} / {item['period']}: "
                f"{seen[key]} and {item['sourceFile']}"
            )
        seen[key] = item["sourceFile"]
    items.sort(key=lambda item: item["order"])
    return items


# ----------------------------------------------------------------------- warping

def signature(item: dict) -> str:
    """Everything that changes the bytes of a layer-date's tiles."""
    source = os.path.join(ROOT, DATA_DIR, *item["sourceFile"].split("/"))
    stat = os.stat(source)
    raw = "|".join([
        str(os.path.abspath(source)),
        str(stat.st_size),
        str(stat.st_mtime_ns),
        PIPELINE_VERSION,
        str(item["band"]),
        item["rampKey"],
        str(item["classesKey"]),
        str(item["fixedDomain"]),
        str(item["minZoom"]),
        str(item["maxZoom"]),
        str(item["scaleFactor"]),
    ])
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def domain_for(item: dict, values: np.ndarray) -> list[float]:
    if item["fixedDomain"] is not None:
        return [float(v) for v in item["fixedDomain"]]
    sample = values[::4, ::4]
    sample = sample[np.isfinite(sample)]
    if sample.size == 0:
        return [-1.0, 1.0]
    lo, hi = (round(float(v), 2) for v in np.percentile(sample, [2, 98]))
    if hi <= lo:
        return [float(math.floor(lo)), float(math.ceil(lo) + 1)]
    return [lo, hi]


def warp_to_mercator(item: dict, boundary_merc, cog_path: str) -> dict:
    """Warp one band to EPSG:3857, mask to the AOI, write a COG with overviews."""
    source = os.path.join(ROOT, DATA_DIR, *item["sourceFile"].split("/"))
    band_idx = item["band"]
    is_categorical = item["valueType"] == "categorical"
    resampling = Resampling.nearest if is_categorical else Resampling.average

    with rasterio.open(source) as src:
        raw = src.read(band_idx)
        nodata = src.nodatavals[band_idx - 1]
        if nodata is None or (isinstance(nodata, float) and math.isnan(nodata)):
            valid = np.isfinite(raw) if np.issubdtype(raw.dtype, np.floating) else np.ones(raw.shape, bool)
        else:
            valid = raw != nodata
        scale = float(src.scales[band_idx - 1] or 1.0) if src.scales else 1.0
        offset = float(src.offsets[band_idx - 1] or 0.0) if src.offsets else 0.0
        values = raw.astype("float32") * scale + offset
        values[~valid] = np.nan
        transform, width, height = calculate_default_transform(
            src.crs, "EPSG:3857", src.width, src.height, *src.bounds
        )
        dst = np.full((height, width), np.nan, dtype="float32")
        reproject(
            source=values,
            destination=dst,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs="EPSG:3857",
            resampling=resampling,
            src_nodata=np.nan,
            dst_nodata=np.nan,
        )

    inside = rasterio.features.geometry_mask(
        [mapping(boundary_merc)],
        out_shape=dst.shape,
        transform=transform,
        invert=True,
        all_touched=False,
    )
    dst[~inside] = np.nan
    coverage = float(np.isfinite(dst)[inside].mean()) if inside.any() else 0.0
    domain = domain_for(item, dst)

    os.makedirs(os.path.dirname(cog_path), exist_ok=True)
    profile = dict(
        driver="GTiff",
        width=width,
        height=height,
        count=1,
        dtype="float32",
        crs="EPSG:3857",
        transform=transform,
        nodata=np.nan,
        tiled=True,
        blockxsize=512,
        blockysize=512,
        compress="deflate",
        predictor=3,
        BIGTIFF="IF_SAFER",
    )
    with rasterio.open(cog_path, "w", **profile) as ds:
        ds.write(dst, 1)
        ds.build_overviews(OVERVIEWS, resampling)
    bounds = rasterio.transform.array_bounds(height, width, transform)
    return {"coverage": round(coverage, 4), "domain": domain, "bounds": bounds}


# ------------------------------------------------------------------------ tiling

def tiles_for_bounds(bounds: tuple, zoom: int):
    span = WEB_MERCATOR_SIZE / (1 << zoom)
    limit = (1 << zoom) - 1
    x0 = max(0, math.floor((bounds[0] + WEB_MERCATOR_HALF) / span))
    x1 = min(limit, math.floor((bounds[2] + WEB_MERCATOR_HALF) / span))
    y0 = max(0, math.floor((WEB_MERCATOR_HALF - bounds[3]) / span))
    y1 = min(limit, math.floor((WEB_MERCATOR_HALF - bounds[1]) / span))
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            yield x, y, span


def tile_bounds(x: int, y: int, span: float) -> tuple[float, float, float, float]:
    west = x * span - WEB_MERCATOR_HALF
    north = WEB_MERCATOR_HALF - y * span
    return west, north - span, west + span, north


def write_png(idx: np.ndarray, palette: bytes, path: str) -> None:
    img = Image.fromarray(idx, mode="P")
    img.putpalette(palette)
    img.save(path, format="PNG", compress_level=6, transparency=TRANSPARENT)


_MASK_CACHE: dict[tuple, tuple] = {}


def get_grid_mask(src_crs, src_width: int, src_height: int, src_bounds: tuple, boundary_merc) -> tuple:
    key = (str(src_crs), src_width, src_height, tuple(round(b, 2) for b in src_bounds))
    cached = _MASK_CACHE.get(key)
    if cached is not None:
        return cached
    transform, width, height = calculate_default_transform(
        src_crs, "EPSG:3857", src_width, src_height, *src_bounds
    )
    inside = rasterio.features.geometry_mask(
        [mapping(boundary_merc)],
        out_shape=(height, width),
        transform=transform,
        invert=True,
        all_touched=False,
    )
    bounds = rasterio.transform.array_bounds(height, width, transform)
    res = (transform, width, height, inside, bounds)
    _MASK_CACHE[key] = res
    return res


def warp_and_tile_in_memory(item: dict, boundary_merc) -> dict:
    """Warp one band to EPSG:3857 in memory, mask to AOI, and slice PNG8 tiles directly."""
    source = os.path.join(ROOT, DATA_DIR, *item["sourceFile"].split("/"))
    band_idx = item["band"]
    is_categorical = item["valueType"] == "categorical"
    resampling = Resampling.nearest if is_categorical else Resampling.average

    with rasterio.open(source) as src:
        raw = src.read(band_idx)
        nodata = src.nodatavals[band_idx - 1]
        if nodata is None or (isinstance(nodata, float) and math.isnan(nodata)):
            valid = np.isfinite(raw) if np.issubdtype(raw.dtype, np.floating) else np.ones(raw.shape, bool)
        else:
            valid = raw != nodata
        scale = float(src.scales[band_idx - 1] or 1.0) if src.scales else 1.0
        offset = float(src.offsets[band_idx - 1] or 0.0) if src.offsets else 0.0
        values = raw.astype("float32") * scale + offset
        values[~valid] = np.nan

        transform, width, height, inside, bounds = get_grid_mask(
            src.crs, src.width, src.height, tuple(src.bounds), boundary_merc
        )
        dst = np.full((height, width), np.nan, dtype="float32")
        reproject(
            source=values,
            destination=dst,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs="EPSG:3857",
            resampling=resampling,
            src_nodata=np.nan,
            dst_nodata=np.nan,
        )

    dst[~inside] = np.nan
    coverage = float(np.isfinite(dst)[inside].mean()) if inside.any() else 0.0
    domain = domain_for(item, dst)
    stops = expand_stops(RAMPS[item["rampKey"]]["stops"], domain)

    out_dir = os.path.join(ROOT, TILE_ROOT, item["id"], item["segment"])
    shutil.rmtree(out_dir, ignore_errors=True)
    written: list[str] = []

    with rasterio.io.MemoryFile() as memfile:
        profile = dict(
            driver="GTiff",
            width=width,
            height=height,
            count=1,
            dtype="float32",
            crs="EPSG:3857",
            transform=transform,
            nodata=np.nan,
            tiled=True,
            blockxsize=256,
            blockysize=256,
        )
        with memfile.open(**profile) as ds:
            ds.write(dst, 1)
            for zoom in range(item["minZoom"], item["maxZoom"] + 1):
                z_dir = os.path.join(out_dir, str(zoom))
                for x, y, span in tiles_for_bounds(bounds, zoom):
                    window = from_bounds(*tile_bounds(x, y, span), ds.transform)
                    tile_vals = ds.read(
                        1,
                        window=window,
                        boundless=True,
                        fill_value=np.nan,
                        out_shape=(TILE_PX, TILE_PX),
                        resampling=resampling,
                    )
                    if is_categorical:
                        rendered = colorize_classes(tile_vals, item["classesKey"])
                    else:
                        rendered = colorize(tile_vals, domain, stops)
                    if rendered is None:
                        continue
                    path = os.path.join(z_dir, str(x), f"{y}.png")
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    write_png(*rendered, path)
                    written.append(os.path.relpath(path, ROOT).replace(os.sep, "/"))

    return {"coverage": round(coverage, 4), "domain": domain, "tiles": written}


def tile_layer(cog_path: str, item: dict, bounds: tuple, domain: list[float],
               stops: list[list]) -> list[str]:
    out_dir = os.path.join(ROOT, TILE_ROOT, item["id"], item["segment"])
    shutil.rmtree(out_dir, ignore_errors=True)
    written: list[str] = []
    is_categorical = item["valueType"] == "categorical"
    resampling = Resampling.nearest if is_categorical else Resampling.average

    with rasterio.open(cog_path) as ds:
        for zoom in range(item["minZoom"], item["maxZoom"] + 1):
            for x, y, span in tiles_for_bounds(bounds, zoom):
                window = from_bounds(*tile_bounds(x, y, span), ds.transform)
                values = ds.read(
                    1,
                    window=window,
                    boundless=True,
                    fill_value=np.nan,
                    out_shape=(TILE_PX, TILE_PX),
                    resampling=resampling,
                )
                if is_categorical:
                    rendered = colorize_classes(values, item["classesKey"])
                else:
                    rendered = colorize(values, domain, stops)
                if rendered is None:
                    continue
                path = os.path.join(out_dir, str(zoom), str(x), f"{y}.png")
                os.makedirs(os.path.dirname(path), exist_ok=True)
                write_png(*rendered, path)
                written.append(os.path.relpath(path, ROOT).replace(os.sep, "/"))
    return written


def find_existing_tiles(item: dict) -> list[str]:
    """Discover already-generated PNG tiles on disk for a layer-date."""
    out_dir = os.path.join(ROOT, TILE_ROOT, item["id"], item["segment"])
    if not os.path.isdir(out_dir):
        return []
    found: list[str] = []
    for dirpath, _, names in os.walk(out_dir):
        for name in names:
            if name.endswith(".png"):
                full = os.path.join(dirpath, name)
                found.append(os.path.relpath(full, ROOT).replace(os.sep, "/"))
    found.sort()
    return found


# ----------------------------------------------------------------- vectors & tables

def round_coords(coords, precision: int = 5):
    if isinstance(coords, (list, tuple)):
        if coords and isinstance(coords[0], (int, float)):
            return [round(float(c), precision) for c in coords]
        return [round_coords(c, precision) for c in coords]
    return coords


def export_vectors_and_tables(data_dir: str) -> None:
    """Convert GPKG vectors to GeoJSON and CSV tables to JSON under `public/data/`."""
    out_dir = os.path.join(ROOT, PUBLIC_DATA_DIR)
    os.makedirs(out_dir, exist_ok=True)

    # 1. Boundary GeoJSON (EPSG:4326)
    b_path = os.path.join(data_dir, "boundary", "AOI_DavaoOccidental_Sarangani_EPSG4326.gpkg")
    if os.path.exists(b_path):
        con = sqlite3.connect(f"file:{b_path}?mode=ro", uri=True)
        try:
            rows = con.execute(
                'SELECT fid, geom, province, area_km2 FROM "AOI_DavaoOccidental_Sarangani_EPSG4326"'
            ).fetchall()
        finally:
            con.close()
        features = []
        for fid, blob, province, area_km2 in rows:
            geom = shapely.from_wkb(strip_gpkg_header(blob)).simplify(0.0002, preserve_topology=True)
            gdict = mapping(geom)
            gdict["coordinates"] = round_coords(gdict["coordinates"], 5)
            features.append({
                "type": "Feature",
                "id": fid,
                "properties": {"province": province, "areaKm2": round(float(area_km2), 1)},
                "geometry": gdict,
            })
        with open(os.path.join(out_dir, "boundary.geojson"), "w", encoding="utf-8") as fh:
            json.dump({"type": "FeatureCollection", "features": features}, fh, separators=(",", ":"))

    # 2. Landslide polygons GeoJSON (reproject EPSG:32651 -> EPSG:4326)
    l_path = os.path.join(data_dir, "earthquake", "Landslide_Candidates_v2.gpkg")
    if os.path.exists(l_path):
        to_wgs = Transformer.from_crs(32651, 4326, always_xy=True)
        con = sqlite3.connect(f"file:{l_path}?mode=ro", uri=True)
        try:
            rows = con.execute(
                'SELECT fid, geom, area_ha, dist_epi_km, slope_mean, elev_mean, evipre_mean, evipost_mean, province '
                'FROM "Landslide_Candidates_v2"'
            ).fetchall()
        finally:
            con.close()
        features = []
        for fid, blob, area_ha, dist_km, slope, elev, evi_pre, evi_post, prov in rows:
            geom_utm = shapely.from_wkb(strip_gpkg_header(blob))
            geom_wgs = shapely_transform(to_wgs.transform, geom_utm)
            gdict = mapping(geom_wgs)
            gdict["coordinates"] = round_coords(gdict["coordinates"], 5)
            features.append({
                "type": "Feature",
                "id": fid,
                "properties": {
                    "areaHa": round(float(area_ha or 0), 2),
                    "kmFromEpicentre": round(float(dist_km or 0), 1),
                    "slopeDeg": round(float(slope or 0), 1),
                    "elevM": round(float(elev or 0), 0),
                    "eviBefore": round(float(evi_pre or 0), 3),
                    "eviAfter": round(float(evi_post or 0), 3),
                    "province": prov or "Sarangani / Davao Occidental",
                },
                "geometry": gdict,
            })
        with open(os.path.join(out_dir, "landslides.geojson"), "w", encoding="utf-8") as fh:
            json.dump({"type": "FeatureCollection", "features": features}, fh, separators=(",", ":"))

    # 3. Ranked Landslides CSV -> JSON
    ranked_csv = os.path.join(data_dir, "earthquake", "Possible_landslides_after_8Jun2026_ranked.csv")
    ranked_rows = []
    if os.path.exists(ranked_csv):
        with open(ranked_csv, encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                ranked_rows.append({
                    "rank": int(r["rank"]),
                    "barangay": r["barangay (OSM)"].strip() or "Unmapped barangay",
                    "municipality": r["municipality (OSM)"].strip() or "Unmapped municipality",
                    "province": r["province"].strip(),
                    "areaHa": float(r["area_ha"]),
                    "patches": int(r["patches"]),
                    "lat": float(r["lat"]),
                    "lng": float(r["lon"]),
                    "slopeDeg": float(r["slope_deg"]),
                    "elevM": float(r["elev_m"]),
                    "eviBefore": float(r["EVI_before"]),
                    "eviAfter": float(r["EVI_after"]),
                    "kmFromEpicentre": float(r["km_from_epicentre"]),
                })

    # 4. AOI Monthly Means 2025-2026 CSV -> JSON
    aoi_csv = os.path.join(data_dir, "tables", "AOI_monthly_means_2025_2026.csv")
    aoi_rows = []
    if os.path.exists(aoi_csv):
        with open(aoi_csv, encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                aoi_rows.append({
                    "month": r["month"].strip(),
                    "ndviMean": float(r["ndvi_mean"]),
                    "ndviCoverPct": float(r["ndvi_cover_pct"]),
                    "lstDayMeanC": float(r["lst_day_mean_C"]),
                    "lstCoverPct": float(r["lst_cover_pct"]),
                })

    # 5. Outlook Scenario CSV -> JSON
    outlook_csv = os.path.join(data_dir, "outlook", "Outlook_Nov2026_Oct2027_ElNino_scenario.csv")
    outlook_rows = []
    if os.path.exists(outlook_csv):
        with open(outlook_csv, encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                outlook_rows.append({
                    "month": r["month"].strip(),
                    "rainNormalMm": float(r["rain_normal_mm"]),
                    "rainExpectedMm": float(r["rain_expected_mm"]),
                    "rainP10Mm": float(r["rain_p10_mm"]),
                    "rainP90Mm": float(r["rain_p90_mm"]),
                    "rainPctNormal": float(r["rain_pct_normal"]),
                    "eviAnomalyMean": float(r["evi_anomaly_area_mean"]),
                    "eviExpectedMean": float(r["evi_expected_area_mean"]),
                    "eviAnomSarangani": float(r["evi_anom_sarangani"]),
                    "eviAnomDavaoOccidental": float(r["evi_anom_davao_occidental"]),
                    "pctLandBelowNormalGreenness": float(r["pct_land_below_normal_greenness_ge_2in3"]),
                    "ndviAnomalyMean": float(r["ndvi_anomaly_area_mean"]),
                    "lstDayAnomalyC": float(r["lst_day_anomaly_C"]),
                })

    # 6. MODIS AOI Monthly 2000-2026 CSV -> JSON (recent 60 months + full summary)
    modis_csv = os.path.join(data_dir, "outlook", "MODIS_AOI_monthly_2000_2026.csv")
    modis_rows = []
    if os.path.exists(modis_csv):
        with open(modis_csv, encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                if not r.get("month"):
                    continue
                modis_rows.append({
                    "month": r["month"].strip(),
                    "evi": round(float(r["evi"]), 4) if r.get("evi") else None,
                    "lst": round(float(r["lst"]), 2) if r.get("lst") else None,
                    "ndvi": round(float(r["ndvi"]), 4) if r.get("ndvi") else None,
                    "ndviDavaoOccidental": round(float(r["ndvi_davocc"]), 4) if r.get("ndvi_davocc") else None,
                    "ndviSarangani": round(float(r["ndvi_sarangani"]), 4) if r.get("ndvi_sarangani") else None,
                    "validPct": round(float(r["valid_pct"]), 1) if r.get("valid_pct") else None,
                })

    tables_payload = {
        "epicentre": {
            "lng": 125.14699,
            "lat": 6.02153,
            "label": "M7.8 Epicentre · 8 Jun 2026, 07:37 PST · 33 km depth",
        },
        "landslidesRanked": ranked_rows,
        "aoiMonthlyMeans": aoi_rows,
        "outlookScenario": outlook_rows,
        "modisMonthlySeries": modis_rows,
    }
    with open(os.path.join(out_dir, "tables.json"), "w", encoding="utf-8") as fh:
        json.dump(tables_payload, fh, indent=1)
        fh.write("\n")


# ----------------------------------------------------------------------- manifest

def tile_totals() -> dict:
    root = os.path.join(ROOT, TILE_ROOT)
    totals = {"tiles": 0, "bytes": 0, "byLayer": defaultdict(lambda: {"tiles": 0, "bytes": 0})}
    for dirpath, _, names in os.walk(root):
        for name in names:
            if not name.endswith(".png"):
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            size = os.path.getsize(full)
            totals["tiles"] += 1
            totals["bytes"] += size
            bucket = totals["byLayer"][rel.split("/")[0]]
            bucket["tiles"] += 1
            bucket["bytes"] += size
    return totals


def manifest_entry(item: dict, result: dict) -> dict:
    domain = [round(float(v), 4) for v in result["domain"]]
    entry = {
        "id": item["id"],
        "family": item["family"],
        "name": item["name"],
        "units": item["units"],
        "valueType": item["valueType"],
        "sourceFile": item["sourceFile"],
        "band": item["band"],
        "scaleFactor": item["scaleFactor"],
        "nodata": item["nodata"],
        "period": item["period"],
        "periods": [],
        "tilePath": f"tiles/{item['id']}/{item['segment']}/{{z}}/{{x}}/{{y}}.png",
        "minZoom": item["minZoom"],
        "maxZoom": item["maxZoom"],
        "ramp": {
            "kind": RAMPS[item["rampKey"]]["kind"],
            "stops": expand_stops(RAMPS[item["rampKey"]]["stops"], domain),
        },
        "domain": domain,
        "coverage": result["coverage"],
        "caveats": list(item["caveats"]),
    }
    if item["valueType"] == "categorical" and item.get("classesKey"):
        entry["classes"] = CLASS_SCHEMES[item["classesKey"]]["classes"]
    return entry


def build_manifest(entries: list[dict], existing: dict | None, pin: dict,
                   boundary_wgs, families: set[str]) -> dict:
    kept = []
    if existing:
        kept = [layer for layer in existing.get("layers", [])
                if layer.get("family") not in families]
    layers = sorted(kept + entries, key=lambda layer: (
        FAMILY_ORDER.index(layer["family"]) if layer["family"] in FAMILY_ORDER else len(FAMILY_ORDER),
        layer["id"],
        manifest_schema.period_sort_key(layer["period"]),
    ))

    periods_by_id: dict[str, set[str]] = defaultdict(set)
    for layer in layers:
        periods_by_id[layer["id"]].add(layer["period"])
    for layer in layers:
        layer["periods"] = sorted(periods_by_id[layer["id"]], key=manifest_schema.period_sort_key)

    totals = tile_totals()
    family_of = {layer["id"]: layer["family"] for layer in layers}
    by_family: dict[str, dict] = defaultdict(lambda: {"tiles": 0, "bytes": 0})
    for layer_id, counts in totals["byLayer"].items():
        family = family_of.get(layer_id, "unknown")
        by_family[family]["tiles"] += counts["tiles"]
        by_family[family]["bytes"] += counts["bytes"]

    west, south, east, north = boundary_wgs.bounds
    return {
        "schemaVersion": 1,
        "generator": {
            "name": PIPELINE_NAME,
            "version": PIPELINE_VERSION,
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "source": {
            "repo": pin["repo"],
            "commit": pin["commit"],
            "crs": "EPSG:32651",
            "resolutionMeters": 30,
            "attribution": ATTRIBUTION,
        },
        "bounds": [round(west, 4), round(south, 4), round(east, 4), round(north, 4)],
        "dates": sorted({layer["period"] for layer in layers},
                        key=manifest_schema.period_sort_key),
        "trimmed": existing.get("trimmed", []) if existing else [],
        "totals": {
            "tiles": totals["tiles"],
            "bytes": totals["bytes"],
            "byFamily": {family: by_family[family] for family in sorted(by_family)},
        },
        "layers": layers,
    }


def write_manifest(doc: dict) -> None:
    target = os.path.join(ROOT, MANIFEST_PATH)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = f"{target}.tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    os.replace(tmp, target)


# ---------------------------------------------------------------------- state/cache

def load_state() -> dict:
    path = os.path.join(ROOT, CACHE_DIR, "state.json")
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save_state(state: dict) -> None:
    path = os.path.join(ROOT, CACHE_DIR, "state.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=1, sort_keys=True)
        fh.write("\n")
    os.replace(tmp, path)


def reusable(entry: dict | None, sig: str) -> bool:
    if not entry or entry.get("signature") != sig:
        return False
    tiles = entry.get("tiles") or []
    return bool(tiles) and all(os.path.exists(os.path.join(ROOT, path)) for path in tiles)


def prune_tiles(item: dict, keep: list[str]) -> int:
    out_dir = os.path.join(ROOT, TILE_ROOT, item["id"], item["segment"])
    if not os.path.isdir(out_dir):
        return 0
    keep_abs = {os.path.normpath(os.path.join(ROOT, path)) for path in keep}
    removed = 0
    for dirpath, _, names in os.walk(out_dir, topdown=False):
        for name in names:
            full = os.path.normpath(os.path.join(dirpath, name))
            if full not in keep_abs:
                os.remove(full)
                removed += 1
        if not os.listdir(dirpath):
            os.rmdir(dirpath)
    return removed


def boundary_geometry(data_dir: str):
    folder = os.path.join(data_dir, "boundary")
    names = sorted(name for name in os.listdir(folder)
                   if name.lower().endswith((".gpkg", ".geojson")))
    preferred = [name for name in names if "4326" in name] or names
    if not preferred:
        raise SystemExit(f"error: no boundary vector in {folder}")
    vectors = [f"boundary/{name}" for name in preferred[:1]]
    _, boundary_wgs, _ = read_vectors(data_dir, vectors)
    if boundary_wgs is None:
        raise SystemExit(f"error: could not read a polygon from {vectors[0]}")
    return boundary_wgs


# ------------------------------------------------------------------------- report

def print_report(rows: list[dict], totals: dict, elapsed: float) -> None:
    print(f"\n{'product':<22}{'layer-dates':>12}{'tiles':>8}{'bytes':>11}{'B/tile':>9}  zoom")
    for row in rows:
        per_tile = row["bytes"] / max(row["tiles"], 1)
        print(f"{row['product']:<22}{row['layerDates']:>12}{row['tiles']:>8,}"
              f"{row['bytes'] / 1e6:>10.1f}M{per_tile:>9.0f}  z{row['minZoom']}-{row['maxZoom']}")
    print(f"{'committed total':<22}{'':>12}{totals['tiles']:>8,}"
          f"{totals['bytes'] / 1e6:>10.1f}M")
    print(f"budget: {totals['tiles']:,} / {MAX_TILES:,} tiles · "
          f"{totals['bytes'] / 1e6:.1f} / {MAX_BYTES / 1e6:.0f} MB "
          f"-> {'OK' if totals['tiles'] <= MAX_TILES and totals['bytes'] <= MAX_BYTES else 'OVER'}"
          f"  ({elapsed:.0f}s)")


def spot_check(doc: dict) -> list[str]:
    """One decode per layer plus a tile-directory check for the committed tree."""
    problems: list[str] = []
    for layer in doc["layers"]:
        folder = os.path.join(ROOT, "public", *layer["tilePath"].split("/")[:3])
        pngs = []
        for dirpath, _, names in os.walk(folder):
            pngs.extend(os.path.join(dirpath, name) for name in names if name.endswith(".png"))
        if not pngs:
            problems.append(f"{layer['id']} / {layer['period']}: no tiles under "
                            f"{os.path.relpath(folder, ROOT)}")
            continue
        try:
            with Image.open(pngs[0]) as img:
                img.load()
                if img.size != (TILE_PX, TILE_PX):
                    problems.append(f"{pngs[0]}: {img.size} is not {TILE_PX}x{TILE_PX}")
        except Exception as exc:  # noqa: BLE001 - reported, not raised
            problems.append(f"{pngs[0]}: {type(exc).__name__}: {exc}")
    return problems


# --------------------------------------------------------------------------- main

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--families", default="all",
                    help="comma-separated families or 'all'")
    ap.add_argument("--full", action="store_true", help="ignore the cache and rebuild everything")
    ap.add_argument("--check", action="store_true", help="validate the committed manifest and tiles")
    ap.add_argument("--data", default=DATA_DIR)
    args = ap.parse_args(argv)

    manifest_abs = os.path.join(ROOT, MANIFEST_PATH)
    if args.check:
        if not os.path.exists(manifest_abs):
            print(f"error: {MANIFEST_PATH} does not exist", file=sys.stderr)
            return 1
        with open(manifest_abs, encoding="utf-8") as fh:
            doc = json.load(fh)
        problems = manifest_schema.validate(doc) + spot_check(doc)
        if problems:
            print(f"{MANIFEST_PATH}: {len(problems)} problem(s)", file=sys.stderr)
            for problem in problems:
                print(f"  {problem}", file=sys.stderr)
            return 1
        print(f"{MANIFEST_PATH}: valid ({len(doc['layers'])} layers, {len(doc['dates'])} dates, "
              f"{doc['totals']['tiles']:,} tiles / {doc['totals']['bytes'] / 1e6:.1f} MB)")
        return 0

    if args.families.strip().lower() == "all":
        families = set(FAMILY_ORDER)
    else:
        families = {name.strip() for name in args.families.split(",") if name.strip()}
    unknown = families - SUPPORTED_FAMILIES
    if unknown:
        print(f"error: unknown family/families: {', '.join(sorted(unknown))}. "
              f"Supported: {', '.join(FAMILY_ORDER)}.", file=sys.stderr)
        return 2

    inventory_path = os.path.join(ROOT, args.data, "inventory.json")
    if not os.path.exists(inventory_path):
        print(f"error: {os.path.relpath(inventory_path, ROOT)} not found; "
              f"run scripts/tiles/inventory.py first", file=sys.stderr)
        return 2
    with open(inventory_path, encoding="utf-8") as fh:
        inventory = json.load(fh)

    pin = inventory.get("source") or {}
    if not pin.get("commit"):
        print("error: inventory has no pinned source commit; rerun fetch_data.py", file=sys.stderr)
        return 2

    # Export boundary/landslide GeoJSONs and tabular JSONs first
    export_vectors_and_tables(os.path.join(ROOT, args.data))

    boundary_wgs = boundary_geometry(os.path.join(ROOT, args.data))
    to_mercator = Transformer.from_crs(4326, 3857, always_xy=True)
    boundary_merc = shapely_transform(to_mercator.transform, boundary_wgs)

    # Index inventory stats by (path, band) so existing on-disk tiles can adopt coverage/domain quickly
    inv_stats_by_path: dict[tuple[str, int], dict] = {}
    for lyr in inventory["layers"]:
        st_list = lyr.get("stats") or []
        for idx_b, st in enumerate(st_list):
            inv_stats_by_path[(lyr["path"], idx_b + 1)] = st

    items = []
    for family in [f for f in FAMILY_ORDER if f in families]:
        items.extend(layer_items(inventory, family))
    if not items:
        print(f"error: no layer-dates for {', '.join(sorted(families))} in the inventory",
              file=sys.stderr)
        return 2

    existing = None
    if os.path.exists(manifest_abs):
        with open(manifest_abs, encoding="utf-8") as fh:
            existing = json.load(fh)

    state = load_state()
    if args.full:
        state = {}
    rows: dict[str, dict] = {}
    entries: list[dict] = []
    failed = False
    started = time.time()

    print(f"{len(items)} layer-dates for {', '.join(f for f in FAMILY_ORDER if f in families)} "
          f"· pin {pin['commit'][:8]} · {PIPELINE_NAME} {PIPELINE_VERSION}", flush=True)

    for number, item in enumerate(items, 1):
        key = f"{item['id']}/{item['segment']}"
        sig = signature(item)
        entry = state.get(key)
        began = time.time()

        disk_tiles = find_existing_tiles(item) if not args.full else []
        if not args.full and reusable(entry, sig):
            result = {"coverage": entry["coverage"], "domain": entry["domain"],
                      "tiles": entry["tiles"]}
            removed = prune_tiles(item, entry["tiles"])
            status = f"reuse ({len(entry['tiles'])} tiles" + (f", pruned {removed}" if removed else "") + ")"
        elif not args.full and disk_tiles and len(disk_tiles) > 0:
            st = inv_stats_by_path.get((item["sourceFile"], item["band"]), {})
            cov = float(st.get("coverageAoi", st.get("coverage", 1.0)))
            if item["fixedDomain"] is not None:
                dom = [float(v) for v in item["fixedDomain"]]
            else:
                lo = round(float(st.get("min", -18.0)), 2)
                hi = round(float(st.get("max", -5.0)), 2)
                dom = [lo, hi if hi > lo else lo + 1.0]
            result = {"coverage": round(cov, 4), "domain": dom, "tiles": disk_tiles}
            state[key] = {"signature": sig, "source": item["sourceFile"],
                          "coverage": result["coverage"], "domain": dom,
                          "tiles": disk_tiles}
            status = f"adopted on-disk ({len(disk_tiles)} tiles)"
        else:
            result = warp_and_tile_in_memory(item, boundary_merc)
            state[key] = {"signature": sig, "source": item["sourceFile"],
                          "coverage": result["coverage"], "domain": result["domain"],
                          "tiles": result["tiles"]}
            status = f"{len(result['tiles'])} tiles, domain {result['domain'][0]}..{result['domain'][1]}"

        entries.append(manifest_entry(item, result))
        tile_bytes = sum(os.path.getsize(os.path.join(ROOT, path)) for path in result["tiles"])
        row = rows.setdefault(item["product"], {
            "product": item["product"], "layerDates": 0, "tiles": 0, "bytes": 0,
            "minZoom": item["minZoom"], "maxZoom": item["maxZoom"],
        })
        row["layerDates"] += 1
        row["tiles"] += len(result["tiles"])
        row["bytes"] += tile_bytes
        if number % 10 == 0 or number == len(items) or "adopted" not in status and "reuse" not in status:
            print(f"[{number:>3}/{len(items)}] {item['id']:<42} {item['period']:<24} "
                  f"cov {result['coverage'] * 100:>5.1f}%  {status}  ({time.time() - began:.1f}s)",
                  flush=True)
        if number % 20 == 0:
            save_state(state)

    # drop tiles and state for layer-dates this run no longer produces
    new_keys = {f"{item['id']}/{item['segment']}" for item in items}
    produced_ids = {item["id"] for item in items}
    stale_ids = set()
    if existing:
        stale_ids = {layer["id"] for layer in existing.get("layers", [])
                     if layer.get("family") in families and layer["id"] not in produced_ids}
    for layer_id in sorted(stale_ids):
        shutil.rmtree(os.path.join(ROOT, TILE_ROOT, layer_id), ignore_errors=True)
    state = {k: v for k, v in state.items() if k in new_keys or k.split("/")[0] not in produced_ids}
    save_state(state)

    document = build_manifest(entries, existing, pin, boundary_wgs, families)
    problems = manifest_schema.validate(document)
    if problems:
        print(f"\nmanifest failed its schema check ({len(problems)} problems):", file=sys.stderr)
        for problem in problems[:30]:
            print(f"  {problem}", file=sys.stderr)
        failed = True
    else:
        write_manifest(document)

    print_report(sorted(rows.values(), key=lambda row: PRODUCTS[row["product"]]["order"]),
                 document["totals"], time.time() - started)

    tiles = document["totals"]["tiles"]
    total_bytes = document["totals"]["bytes"]
    if tiles > MAX_TILES or total_bytes > MAX_BYTES:
        print(f"\nbudget exceeded: {tiles:,} tiles / {total_bytes / 1e6:.1f} MB exceeds "
              f"{MAX_TILES:,} / {MAX_BYTES / 1e6:.0f} MB.", file=sys.stderr)
        failed = True

    if not failed:
        problems = spot_check(document)
        if problems:
            print(f"\ntile spot-check failed ({len(problems)} problems):", file=sys.stderr)
            for problem in problems[:30]:
                print(f"  {problem}", file=sys.stderr)
            failed = True
        else:
            print(f"\nwrote {MANIFEST_PATH} ({len(document['layers'])} layer-dates, "
                  f"{len(document['dates'])} dates)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
