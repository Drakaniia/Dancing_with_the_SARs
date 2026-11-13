"""Inventory the pinned NISAR release (spec 5.1 step 1).

Walks the gitignored ``data/`` tree and records, for every GeoTIFF, the CRS, transform,
grid, band count, dtype, scale, offset, nodata, compression, tiling and a decimated read
of the pixel statistics. Then checks the release against the contract the manifest
depends on and estimates the committed tile budget (spec 5.2).

    python scripts/tiles/inventory.py                  # write data/inventory.json
    python scripts/tiles/inventory.py --no-stats       # tags only, no pixel reads
    python scripts/tiles/inventory.py --out /tmp/i.json

Exit status is 0 when there are no `fail` assertions, 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sqlite3
import sys
import time
from collections import Counter, defaultdict

import numpy as np
import rasterio
import rasterio.features
import shapely
from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon, mapping
from shapely.ops import transform as shapely_transform
from shapely.ops import unary_union

WEB_MERCATOR_HALF = 20037508.342789244
WEB_MERCATOR_SIZE = WEB_MERCATOR_HALF * 2
TILE_PX = 256

# README: 30 m layers are 5147 x 4810 at origin 648150 E / 735870 N.
EXPECTED_30M = {"width": 5147, "height": 4810, "origin": (648150.0, 735870.0)}

# Allowed compression: anything these don't cover is a red flag for the Rust/PNG path.
OK_COMPRESSION = {"DEFLATE", "LZW", "NONE", "ZSTD", "PACKBITS"}

# AOI masks are per-grid, so the same grid is only rasterised once.
_AOI_CACHE: dict[tuple, np.ndarray] = {}

# Layer kinds. expected_scale None = trust the file but report it (no contract to check).
# Class/terrain/product names are read from the named groups of the matched pattern.
KINDS: list[tuple[str, dict]] = [
    # radar
    (r"^nisar/backscatter_by_month/NISAR_(?P<pol>HH|HV)_dB_(?P<month>\d{4}-\d{2})_month",
     dict(family="radar", product="backscatter_monthly", units="dB", value_type="continuous",
          expected_scale=0.01, period="month")),
    (r"^nisar/backscatter_by_date/NISAR_(?P<pol>HH|HV)_dB_(?P<day>\d{8})_",
     dict(family="radar", product="backscatter_daily", units="dB", value_type="continuous",
          expected_scale=0.01, period="day")),
    (r"^nisar/change_by_month/NISAR_(?P<pol>HH|HV)_Change_month_(?P<month1>\d{4}-\d{2})_to_(?P<month2>\d{4}-\d{2})",
     dict(family="radar", product="change_monthly", units="dB", value_type="continuous",
          expected_scale=0.01, period="month_pair")),
    (r"^nisar/change_same_track/NISAR_(?P<pol>HH|HV)_Change_(?P<track>T\d{3}[AD]\d{3})_(?P<date1>\d{8})_to_(?P<date2>\d{8})",
     dict(family="radar", product="change_pair", units="dB", value_type="continuous",
          expected_scale=0.01, period="date_pair")),
    # vegetation
    (r"^nisar_ml/vegetation_by_month/NISAR_estimated_(?P<var>EVI|NDMI)_(?P<month>\d{4}-\d{2})_month",
     dict(family="vegetation", product="vegetation_monthly", units="index",
          value_type="continuous", expected_scale=0.0001, period="month")),
    (r"^nisar_ml/vegetation_by_date/NISAR_estimated_(?P<var>EVI|NDMI)_(?P<day>\d{8})_",
     dict(family="vegetation", product="vegetation_daily", units="index",
          value_type="continuous", expected_scale=0.0001, period="day")),
    # land cover
    (r"^nisar_ml/landcover/LandCover2020_8class",
     dict(family="landcover", product="landcover_2020", units="class", value_type="categorical",
          expected_scale=None, period="static", label="2020", classes="landcover")),
    (r"^nisar_ml/landcover/NISAR_LandCover_2026_",
     dict(family="landcover", product="landcover_2026", units="class", value_type="categorical",
          expected_scale=None, period="static", label="2026", classes="landcover")),
    (r"^nisar_ml/landcover/NISAR_LandCover_Change_vs_2020",
     dict(family="landcover", product="landcover_change", units="class", value_type="categorical",
          expected_scale=None, period="static", label="2026 vs 2020", classes="landcover_change")),
    (r"^nisar_ml/landcover/NISAR_LandCover_confidence_pct",
     dict(family="landcover", product="landcover_confidence", units="percent",
          value_type="continuous", expected_scale=None, period="static", label="2026")),
    # earthquake
    (r"^earthquake/HLS_(?P<var>EVI|NBR)_pre(?P<year>\d{4})_",
     dict(family="earthquake", product="quake_pre", units="index", value_type="continuous",
          expected_scale=0.0001, period="static", label="pre-quake {year}")),
    (r"^earthquake/HLS_(?P<var>EVI|NBR)_post(?P<year>\d{4})_",
     dict(family="earthquake", product="quake_post", units="index", value_type="continuous",
          expected_scale=0.0001, period="static", label="post-quake {year}")),
    (r"^earthquake/HLS_(?P<var>EVI|NBR)_Change_2025_sameSeason",
     dict(family="earthquake", product="quake_change_2025", units="index",
          value_type="continuous", expected_scale=0.0001, period="static",
          label="2025 seasonal change")),
    (r"^earthquake/HLS_(?P<var>EVI|NBR)_Change_(?P<year>\d{4})_post_minus_pre_8Jun",
     dict(family="earthquake", product="quake_change_2026", units="index",
          value_type="continuous", expected_scale=0.0001, period="static",
          label="{year}-06-09 (post minus pre)")),
    (r"^earthquake/HLS_(?P<var>EVI|NBR)_Change_(?P<year>\d{4})_minus_2025_seasonal",
     dict(family="earthquake", product="quake_anomaly", units="index", value_type="continuous",
          expected_scale=0.0001, period="static", label="{year} anomaly vs 2025 seasonal")),
    (r"^earthquake/Landslide_Candidates_after_8Jun2026_30m\.tif",
     dict(family="earthquake", product="landslides", units="class", value_type="categorical",
          expected_scale=None, period="static", label="2026-06..09", classes="landslide")),
    # climate: Landsat HLS quarterly
    (r"^landsat_hls/HLS_(?P<var>EVI|NDMI|NDWI)_Anomaly_(?P<year1>\d{4})Q(?P<q1>\d)_minus_(?P<year2>\d{4})Q(?P<q2>\d)",
     dict(family="climate", product="hls_anomaly", units="index", value_type="continuous",
          expected_scale=0.0001, period="quarter_pair")),
    (r"^landsat_hls/HLS_(?P<var>EVI|NDMI|NDWI)_(?P<year>\d{4})Q(?P<q>\d)_",
     dict(family="climate", product="hls_quarterly", units="index", value_type="continuous",
          expected_scale=0.0001, period="quarter")),
    (r"^landsat_hls/HLS_ValidObs_(?P<year>\d{4})Q(?P<q>\d)_",
     dict(family="climate", product="hls_validobs", units="count", value_type="count",
          expected_scale=None, period="quarter", diagnostic=True)),
    # climate: MODIS monthly
    (r"^modis/ndvi_monthly/MODIS_NDVI_Anomaly_(?P<month1>\d{4}-\d{2})_minus_(?P<month2>\d{4}-\d{2})",
     dict(family="climate", product="modis_ndvi_anomaly", units="index",
          value_type="continuous", expected_scale=0.0001, period="month_pair")),
    (r"^modis/ndvi_monthly/MODIS_NDVI_(?P<month>\d{4}-\d{2})_",
     dict(family="climate", product="modis_ndvi", units="index", value_type="continuous",
          expected_scale=0.0001, period="month")),
    (r"^modis/land_temperature_monthly/MODIS_LST_Anomaly_(?P<month1>\d{4}-\d{2})_minus_(?P<month2>\d{4}-\d{2})",
     dict(family="climate", product="modis_lst_anomaly", units="degC",
          value_type="continuous", expected_scale=0.01, period="month_pair")),
    (r"^modis/land_temperature_monthly/MODIS_LST_Day_(?P<month>\d{4}-\d{2})_",
     dict(family="climate", product="modis_lst", units="degC", value_type="continuous",
          expected_scale=0.01, period="month")),
    # outlook: 12 bands, one per month
    (r"^outlook/Outlook_(?P<var>EVI|NDVI)_(?P<field>expected|anomaly)_Nov2026_Oct2027",
     dict(family="outlook", product="outlook_vegetation", units="index",
          value_type="continuous", expected_scale=0.0001, period="bands")),
    (r"^outlook/Outlook_(?P<var>EVI|NDVI)_(?P<field>chance_below_normal|ElNino_sensitivity_per_degC)",
     dict(family="outlook", product="outlook_vegetation", units="percent_or_index",
          value_type="continuous", expected_scale=None, period="bands")),
    (r"^outlook/Outlook_LST_(?P<field>expected|anomaly)_Nov2026_Oct2027",
     dict(family="outlook", product="outlook_heat", units="degC", value_type="continuous",
          expected_scale=0.01, period="bands")),
    (r"^outlook/Outlook_(?P<var>LST)_(?P<field>chance_below_normal|ElNino_sensitivity_per_degC)",
     dict(family="outlook", product="outlook_heat", units="percent_or_degC",
          value_type="continuous", expected_scale=None, period="bands")),
    # terrain
    (r"^terrain/SRTM_elevation_m_",
     dict(family="terrain", product="elevation", units="m", value_type="continuous",
          expected_scale=0.1, period="static", label="static")),
    (r"^terrain/SRTM_slope_deg_",
     dict(family="terrain", product="slope", units="deg", value_type="continuous",
          expected_scale=0.01, period="static", label="static")),
    (r"^terrain/SRTM_aspect_deg_",
     dict(family="terrain", product="aspect", units="deg", value_type="continuous",
          expected_scale=0.01, period="static", label="static")),
]

CLASS_VOCAB = {
    "landcover": {1: "closed forest", 2: "open forest & mangrove", 3: "brush/shrubs",
                  4: "grassland", 5: "annual crop", 6: "perennial crop",
                  7: "built-up & barren", 8: "water & fishpond"},
    "landcover_change": {1: "agree", 2: "forest -> non-forest", 3: "vegetation -> built/bare",
                         4: "land -> water", 5: "other"},
    "landslide": {1: "checked, no slide", 2: "possible landslide", 4: "not checked (cloudy)",
                  5: "checked, no elevation data"},
}

# spec 5.2: headline layers z5-13, dense series z5-11.
DENSE_PRODUCTS = {"backscatter_daily", "change_pair", "vegetation_daily", "hls_quarterly",
                  "hls_anomaly", "hls_validobs", "modis_ndvi", "modis_ndvi_anomaly",
                  "modis_lst", "modis_lst_anomaly", "outlook_vegetation", "outlook_heat"}

BYTES_PER_TILE = 6000  # PNG8 estimate used for the byte budget
MAX_TILES = 30_000
MAX_BYTES = 150 * 1024 * 1024


# --------------------------------------------------------------------------- helpers

def is_bigtiff(path: str) -> bool | None:
    """Read the TIFF magic: 42 = classic, 43 = BigTIFF."""
    with open(path, "rb") as fh:
        header = fh.read(4)
    if len(header) < 4:
        return None
    return header[2:4] in (b"\x2b\x00", b"\x00\x2b")


def classify(rel: str) -> tuple[dict | None, re.Match | None]:
    for pattern, spec in KINDS:
        m = re.match(pattern, rel)
        if m:
            return spec, m
    return None, None


def periods_for(spec: dict, match: re.Match | None, descriptions: tuple) -> tuple[list[str], str | None]:
    """Return ([period ids], note-or-None) for one raster."""
    kind = spec["period"]
    gd = match.groupdict() if match else {}
    if kind == "month":
        return [gd["month"]], None
    if kind == "day":
        d = gd["day"]
        return [f"{d[:4]}-{d[4:6]}-{d[6:]}"], None
    if kind == "month_pair":
        a, b = sorted([gd["month1"], gd["month2"]])
        return [f"{b} (vs {a})"], None
    if kind == "date_pair":
        a, b = sorted([gd["date1"], gd["date2"]])
        fmt = lambda x: f"{x[:4]}-{x[4:6]}-{x[6:]}"  # noqa: E731
        return [f"{fmt(b)} (vs {fmt(a)})"], None
    if kind == "quarter":
        return [f"{gd['year']}-Q{gd['q']}"], None
    if kind == "quarter_pair":
        return [f"{gd['year1']}-Q{gd['q1']} (vs {gd['year2']}-Q{gd['q2']})"], None
    if kind == "static":
        try:
            label = spec.get("label", "static").format(**gd)
        except (KeyError, IndexError):
            label = spec.get("label", "static")
        return [label], None
    if kind == "bands":
        months = band_periods(descriptions)
        if months and all(months):
            return months, None
        return [], "12-band raster does not name a month on every band description"
    return [], f"unknown period kind {kind!r}"


MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def band_periods(descriptions: tuple) -> list[str]:
    """Map outlook band descriptions to period ids (YYYY-MM), preserving order."""
    out: list[str] = []
    for desc in descriptions:
        if not desc:
            out.append("")
            continue
        iso = re.search(r"(\d{4})-(\d{2})", desc)
        if iso:
            out.append(f"{iso.group(1)}-{iso.group(2)}")
            continue
        named = re.search(r"([A-Za-z]{3})[a-z]*\s*(\d{4})", desc)
        if named and named.group(1).lower() in MONTHS:
            out.append(f"{named.group(2)}-{MONTHS[named.group(1).lower()]:02d}")
            continue
        out.append("")
    return out


def raster_meta(path: str, stats_read: bool, categorical: bool = False,
                boundary_utm=None) -> dict:
    with rasterio.open(path) as src:
        bands = []
        for i in range(1, src.count + 1):
            bands.append({
                "index": i,
                "dtype": src.dtypes[i - 1],
                "nodata": None if src.nodatavals[i - 1] is None or math.isnan(src.nodatavals[i - 1])
                else src.nodatavals[i - 1],
                "nodataRaw": repr(src.nodatavals[i - 1]),
                "scale": src.scales[i - 1] if src.scales else None,
                "offset": src.offsets[i - 1] if src.offsets else None,
                "description": (src.descriptions[i - 1] if src.descriptions else None),
            })
        meta = {
            "crs": src.crs.to_string() if src.crs else None,
            "epsg": src.crs.to_epsg() if src.crs else None,
            "width": src.width,
            "height": src.height,
            "count": src.count,
            "boundsNative": list(src.bounds),
            "transform": [round(v, 6) for v in tuple(src.transform)[:6]],
            "compression": (src.compression.name if src.compression else None),
            "tiled": bool(src.profile.get("tiled", False)),
            "blockShape": list(src.block_shapes[0]) if src.block_shapes else None,
            "interleave": src.profile.get("interleave"),
            "overviews": src.overviews(1),
            "bands": bands,
        }
        if stats_read:
            meta["stats"] = pixel_stats(src, bands, categorical, boundary_utm)
    return meta


def aoi_grid_mask(src: rasterio.DatasetReader, shape: tuple, boundary_utm) -> np.ndarray | None:
    """Boolean mask of the AOI on the decimated read grid, cached per grid."""
    if boundary_utm is None:
        return None
    key = (tuple(src.transform)[:6], shape)
    cached = _AOI_CACHE.get(key)
    if cached is not None:
        return cached
    transform = src.transform * rasterio.Affine.scale(src.width / shape[1], src.height / shape[0])
    mask = rasterio.features.geometry_mask(
        [mapping(boundary_utm)], out_shape=shape, transform=transform,
        invert=True, all_touched=False,
    )
    _AOI_CACHE[key] = mask
    return mask


def pixel_stats(src: rasterio.DatasetReader, bands: list[dict], categorical: bool = False,
                boundary_utm=None) -> list[dict]:
    """Decimated read per band: coverage, value range, and the class codes present.

    `coverage` is against the whole raster extent (shows which layers are already clipped to
    the provinces); `coverageAoi` is the fraction of valid pixels *inside* the boundary, and
    is what the tile estimate uses.
    """
    target = 1024
    scale = min(1.0, target / max(src.width, src.height))
    shape = (max(1, int(src.height * scale)), max(1, int(src.width * scale)))
    aoi = aoi_grid_mask(src, shape, boundary_utm)
    n_aoi = int(aoi.sum()) if aoi is not None else None
    out = []
    for band in bands:
        arr = src.read(band["index"], out_shape=shape, resampling=rasterio.enums.Resampling.nearest)
        nodata = band["nodata"]
        valid = np.ones(arr.shape, dtype=bool)
        if nodata is not None:
            valid = arr != nodata
        if arr.dtype.kind == "f":
            valid &= np.isfinite(arr)
        n_valid = int(valid.sum())
        entry = {
            "sampledPixels": int(arr.size),
            "validPixels": n_valid,
            "coverage": round(n_valid / arr.size, 4) if arr.size else 0.0,
            "sampled": shape,
        }
        if n_aoi:
            entry["aoiPixels"] = n_aoi
            entry["coverageAoi"] = round(int((valid & aoi).sum()) / n_aoi, 4)
        if n_valid:
            vals = arr[valid].astype("float64") * (band["scale"] or 1.0) + (band["offset"] or 0.0)
            entry.update({
                "min": round(float(vals.min()), 6),
                "max": round(float(vals.max()), 6),
                "mean": round(float(vals.mean()), 6),
            })
            if categorical:
                codes, counts = np.unique(arr[valid], return_counts=True)
                entry["codes"] = {int(c): int(n) for c, n in list(zip(codes, counts))[:64]}
        out.append(entry)
    return out


def gpkg_geometries(path: str) -> tuple[list, dict]:
    """Read a GeoPackage's first geometry column. Returns (geometries, info)."""
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        cols = con.execute(
            "SELECT table_name, column_name, geometry_type_name, srs_id FROM gpkg_geometry_columns"
        ).fetchall()
        if not cols:
            raise RuntimeError(f"{path}: no gpkg_geometry_columns rows")
        table, column, gtype, srs = cols[0]
        rows = con.execute(f'SELECT "{column}" FROM "{table}"').fetchall()
        srs_row = con.execute("SELECT srs_name, organization, organization_coordsys_id FROM gpkg_spatial_ref_sys WHERE srs_id = ?", (srs,)).fetchone()
    finally:
        con.close()

    geoms = [shapely.from_wkb(strip_gpkg_header(row[0])) for row in rows if row[0]]
    info = {"table": table, "column": column, "geometryType": gtype, "srsId": srs,
            "srs": srs_row[0] if srs_row else None,
            "organization": f"{srs_row[1]}:{srs_row[2]}" if srs_row else None,
            "features": len(geoms)}
    return geoms, info


def strip_gpkg_header(blob: bytes) -> bytes:
    """GeoPackage stores a small binary header before the WKB payload."""
    if blob[:2] != b"GP":
        return blob
    flags = blob[3]
    envelope = [0, 32, 48, 48, 64][(flags >> 1) & 0x07]
    return blob[8 + envelope:]


def variant_of(match: re.Match | None, rel: str) -> str | None:
    """Polarisation, index or forecast field, so two layers never share a label."""
    if not match:
        return None
    gd = match.groupdict()
    if gd.get("field"):
        return f"{gd.get('var', '')}-{gd['field']}".strip("-")
    return gd.get("pol") or gd.get("var")


def read_vectors(data_dir: str, vectors: list[str]):
    """Describe vector files; return (entries, boundary in 4326, boundary in 32651)."""
    entries: list[dict] = []
    boundary_wgs = boundary_utm = None
    for rel in vectors:
        full = os.path.join(data_dir, *rel.split("/"))
        entry = {"path": rel, "sizeBytes": os.path.getsize(full),
                 "format": os.path.splitext(rel)[1].lower().lstrip(".")}
        if entry["format"] == "gpkg":
            try:
                geoms, layer_info = gpkg_geometries(full)
                entry["gpkg"] = layer_info
                entry["featureCount"] = len(geoms)
                if geoms:
                    merged = unary_union(geoms)
                    entry["geometryType"] = merged.geom_type
                    entry["parts"] = len(merged.geoms) if merged.geom_type == "MultiPolygon" else 1
                    entry["valid"] = bool(merged.is_valid)
                    entry["bounds"] = [round(v, 6) for v in merged.bounds]
                    if layer_info["srsId"] == 32651:
                        entry["areaKm2"] = round(merged.area / 1e6, 1)
                        boundary_utm = merged
                    elif layer_info["srsId"] == 4326:
                        boundary_wgs = merged
                        to_utm = Transformer.from_crs(4326, 32651, always_xy=True)
                        entry["areaKm2"] = round(shapely_transform(to_utm.transform, merged).area / 1e6, 1)
            except Exception as exc:  # noqa: BLE001 - inventory records, never crashes
                entry["error"] = f"{type(exc).__name__}: {exc}"
        entries.append(entry)

    if boundary_wgs is None and boundary_utm is not None:
        to_wgs = Transformer.from_crs(32651, 4326, always_xy=True)
        boundary_wgs = shapely_transform(to_wgs.transform, boundary_utm)
    if boundary_utm is None and boundary_wgs is not None:
        to_utm = Transformer.from_crs(4326, 32651, always_xy=True)
        boundary_utm = shapely_transform(to_utm.transform, boundary_wgs)
    return entries, boundary_wgs, boundary_utm


def family_of(rel: str) -> str:
    spec, _ = classify(rel)
    if spec:
        return spec["family"]
    top = rel.split("/")[0]
    return {"nisar": "radar", "nisar_ml": "vegetation", "earthquake": "earthquake",
            "landsat_hls": "climate", "modis": "climate", "outlook": "outlook",
            "terrain": "terrain", "boundary": "boundary", "tables": "tables",
            "scripts": "scripts"}.get(top, "other")


# ------------------------------------------------------------------ tile estimation

def aoi_mask(polygon: Polygon | MultiPolygon, cell_m: float) -> tuple[np.ndarray, dict]:
    """Boolean grid of points inside the AOI, in EPSG:3857."""
    minx, miny, maxx, maxy = polygon.bounds
    xs = np.arange(minx + cell_m / 2, maxx, cell_m)
    ys = np.arange(miny + cell_m / 2, maxy, cell_m)
    gx, gy = np.meshgrid(xs, ys)
    inside = shapely.contains_xy(polygon, gx, gy)
    return inside, {"cellMeters": round(cell_m, 1), "shape": list(inside.shape),
                    "insideCells": int(inside.sum()), "bounds3857": [round(v, 1) for v in polygon.bounds]}


def tiles_per_zoom(inside: np.ndarray, bounds: tuple, cell_m: float) -> dict[int, int]:
    minx, miny, maxx, maxy = bounds
    xs = np.arange(minx + cell_m / 2, maxx, cell_m)
    ys = np.arange(miny + cell_m / 2, maxy, cell_m)
    gx, gy = np.meshgrid(xs, ys)
    ix, iy = np.nonzero(inside)
    px, py = gx[ix, iy], gy[ix, iy]
    counts: dict[int, int] = {}
    for z in range(5, 14):
        span = WEB_MERCATOR_SIZE / (1 << z)
        tx = np.floor((px + WEB_MERCATOR_HALF) / span).astype("int64")
        ty = np.floor((WEB_MERCATOR_HALF - py) / span).astype("int64")
        counts[z] = int(np.unique(np.stack([tx, ty], axis=1), axis=0).shape[0])
    return counts


def zoom_range(product: str, family: str) -> tuple[int, int]:
    if product in DENSE_PRODUCTS:
        return 5, 11
    return 5, 13


# --------------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--data", default="data")
    ap.add_argument("--out", default=os.path.join("data", "inventory.json"))
    ap.add_argument("--no-stats", action="store_true", help="skip the decimated pixel reads")
    args = ap.parse_args()

    if not os.path.isdir(args.data):
        sys.exit(f"error: {args.data}/ not found; run scripts/tiles/fetch_data.py first")

    pin = {}
    pin_path = os.path.join(args.data, ".pin.json")
    if os.path.exists(pin_path):
        with open(pin_path, encoding="utf-8") as fh:
            pin = json.load(fh)

    files: list[str] = []
    out_abs = os.path.abspath(args.out)
    for root, dirs, names in os.walk(args.data):
        dirs[:] = [d for d in dirs if d != ".git" and not d.startswith(".cache")]
        for name in names:
            # our own artifacts are not part of the release
            if name == ".pin.json":
                continue
            full = os.path.join(root, name)
            if os.path.abspath(full) == out_abs:
                continue
            files.append(os.path.relpath(full, args.data).replace(os.sep, "/"))
    files.sort()

    rasters, vectors, tables, scripts, others = [], [], [], [], []
    for rel in files:
        ext = os.path.splitext(rel)[1].lower()
        if ext in (".tif", ".tiff"):
            rasters.append(rel)
        elif ext in (".gpkg", ".geojson", ".shp", ".kml"):
            vectors.append(rel)
        elif ext == ".csv":
            tables.append(rel)
        elif ext == ".py":
            scripts.append(rel)
        else:
            others.append(rel)

    assertions: list[dict] = []

    # ---- vectors first: the AOI mask is needed by the raster coverage read
    vector_info, boundary_wgs, boundary_utm = read_vectors(args.data, vectors)
    if boundary_utm is None:
        assertions.append({"level": "fail", "id": "boundary",
                           "message": "no EPSG:32651 boundary polygon found"})

    # ---- rasters
    layers: list[dict] = []
    unclassified: list[str] = []

    print(f"reading {len(rasters)} rasters from {args.data}/ ...", flush=True)
    started = time.time()
    for n, rel in enumerate(rasters, 1):
        spec, match = classify(rel)
        full = os.path.join(args.data, *rel.split("/"))
        issues: list[dict] = []
        bigtiff = is_bigtiff(full)

        if spec is None:
            unclassified.append(rel)
            spec = dict(family=family_of(rel), product="unknown", units="unknown",
                        value_type="unknown", expected_scale=None, period="static")

        meta = raster_meta(full, stats_read=not args.no_stats,
                           categorical=bool(spec.get("classes")), boundary_utm=boundary_utm)

        descriptions = tuple((b["description"] or "") for b in meta["bands"])
        period_list, period_note = periods_for(spec, match, descriptions)

        # contract checks
        if meta["epsg"] != 32651:
            issues.append({"level": "fail", "id": "crs",
                           "message": f"CRS {meta['crs']} != EPSG:32651"})
        if bigtiff:
            issues.append({"level": "fail", "id": "bigtiff", "message": "BigTIFF"})
        if (meta["compression"] or "").upper() not in OK_COMPRESSION:
            issues.append({"level": "fail", "id": "compression",
                           "message": f"{meta['compression']} compression"})

        expect_bands = 12 if spec.get("period") == "bands" else 1
        if meta["count"] != expect_bands:
            issues.append({"level": "fail" if spec.get("period") == "bands" else "warn",
                           "id": "bands", "message": f"{meta['count']} bands, expected {expect_bands}"})

        for band in meta["bands"]:
            dt = band["dtype"]
            nd = band["nodata"]
            want = {"int16": -32768, "uint8": 255}.get(dt)
            if want is not None and nd != want:
                issues.append({"level": "fail", "id": "nodata",
                               "message": f"band {band['index']} {dt} nodata {band['nodataRaw']} != {want}"})
            if dt.startswith("float") and nd is not None:
                issues.append({"level": "warn", "id": "nodata",
                               "message": f"band {band['index']} {dt} has nodata {nd} (expected NaN)"})
            if spec["expected_scale"] is not None and dt in ("int16", "uint16"):
                if band["scale"] is None or abs(band["scale"] - spec["expected_scale"]) > 1e-9:
                    issues.append({"level": "fail", "id": "scale",
                                   "message": f"band {band['index']} {dt} scale {band['scale']} != {spec['expected_scale']}"})
            if spec["expected_scale"] is None and dt == "int16" and band["scale"] in (None, 1.0):
                issues.append({"level": "warn", "id": "scale",
                               "message": f"band {band['index']} Int16 without a scale factor"})

        if spec.get("classes"):
            vocab = CLASS_VOCAB[spec["classes"]]
            codes = set()
            for st in meta.get("stats", []):
                codes |= set(st.get("codes", {}))
            stray = sorted(c for c in codes if c not in vocab)
            if stray:
                issues.append({"level": "fail", "id": "classes",
                               "message": f"codes {stray} not in the README vocabulary"})

        stats = meta.get("stats") or []
        if stats and stats[0]["validPixels"] == 0:
            issues.append({"level": "fail", "id": "empty", "message": "no valid pixels in the sampled window"})

        if meta["width"] != EXPECTED_30M["width"] or meta["height"] != EXPECTED_30M["height"]:
            if abs(meta["transform"][0] - 30) < 1e-6:
                issues.append({"level": "warn", "id": "grid",
                               "message": f"{meta['width']}x{meta['height']} at 30 m, README says "
                                          f"{EXPECTED_30M['width']}x{EXPECTED_30M['height']}"})

        layer = {
            "path": rel,
            "family": spec["family"],
            "product": spec["product"],
            "units": spec["units"],
            "valueType": spec["value_type"],
            "expectedScale": spec["expected_scale"],
            "diagnostic": bool(spec.get("diagnostic")),
            "sizeBytes": os.path.getsize(full),
            "bigtiff": bigtiff,
            "periods": period_list,
            "periodNote": period_note,
            "zoomRange": list(zoom_range(spec["product"], spec["family"])),
            "variant": variant_of(match, rel),
            "track": (match.groupdict().get("track") if match else None),
            **{k: meta[k] for k in ("crs", "epsg", "width", "height", "count", "transform",
                                    "compression", "tiled", "blockShape", "overviews",
                                    "boundsNative", "bands")},
            "stats": meta.get("stats"),
            "classes": spec.get("classes"),
            "issues": issues,
        }
        layers.append(layer)
        assertions.extend({"layer": rel, **iss} for iss in issues)
        if n % 40 == 0 or n == len(rasters):
            print(f"  {n}/{len(rasters)} rasters ({time.time() - started:.0f}s)", flush=True)

    if unclassified:
        assertions.append({"level": "fail", "id": "unclassified",
                           "message": f"{len(unclassified)} raster(s) match no kind: {unclassified}"})

    # ---- ask-the-team facts
    qml = [f for f in files if f.lower().endswith(".qml")]
    index_like = [f for f in files if re.search(r"(index|manifest|catalog|layers)\.(csv|json|ya?ml|txt)$", f, re.I)]
    csv_info = []
    for rel in tables:
        full = os.path.join(args.data, *rel.split("/"))
        head = ""
        with open(full, encoding="utf-8", errors="replace") as fh:
            head = fh.readline().strip()
        with open(full, encoding="utf-8", errors="replace") as fh:
            rows = sum(1 for _ in fh) - 1
        csv_info.append({"path": rel, "sizeBytes": os.path.getsize(full), "rows": max(rows, 0),
                         "columns": head.split(",")[:12]})

    # ---- tile estimate
    tile_estimate = None
    if boundary_wgs is not None:
        to_merc = Transformer.from_crs(4326, 3857, always_xy=True)
        poly = shapely_transform(to_merc.transform, boundary_wgs)
        z13_tile_m = WEB_MERCATOR_SIZE / (1 << 13)
        cell_m = z13_tile_m / 8
        inside, mask_info = aoi_mask(poly, cell_m)
        per_zoom = tiles_per_zoom(inside, poly.bounds, cell_m)

        # layer-dates grouped by product, coverage-weighted tiles
        by_product: dict[str, list[dict]] = defaultdict(list)
        for layer in layers:
            coverage = 1.0
            stats = layer.get("stats") or []
            if stats:
                coverage = max(stats[0].get("coverageAoi", stats[0]["coverage"]), 0.0)
            for p in layer["periods"] or ["static"]:
                by_product[layer["product"]].append(
                    {"period": p, "coverage": coverage, "layer": layer})

        family_rows: dict[str, dict] = defaultdict(
            lambda: {"layerDates": 0, "tiles": 0, "bytes": 0, "zoom": None})
        total_tiles = total_bytes = 0
        breakdown = []
        for product, entries in sorted(by_product.items()):
            lo, hi = entries[0]["layer"]["zoomRange"]
            tiles = 0
            for entry in entries:
                for z in range(lo, hi + 1):
                    tiles += per_zoom[z] * max(entry["coverage"], 0.02)
            tiles = int(round(tiles))
            row = {
                "product": product,
                "family": entries[0]["layer"]["family"],
                "layerDates": len(entries),
                "zoom": [lo, hi],
                "meanCoverage": round(sum(e["coverage"] for e in entries) / len(entries), 3),
                "tiles": tiles,
                "bytes": tiles * BYTES_PER_TILE,
            }
            breakdown.append(row)
            agg = family_rows[row["family"]]
            agg["layerDates"] += row["layerDates"]
            agg["tiles"] += row["tiles"]
            agg["bytes"] += row["bytes"]
            agg["zoom"] = [lo, hi]
            total_tiles += row["tiles"]
            total_bytes += row["bytes"]

        tile_estimate = {
            "method": ("AOI gridded at 1/8 of a z13 tile in EPSG:3857; a tile counts when any "
                       "in-AOI cell falls inside it. Per-layer tile counts are the AOI count "
                       "scaled by the layer's sampled valid-pixel coverage."),
            "bytesPerTile": BYTES_PER_TILE,
            "aoi": mask_info,
            "tilesPerLayerDate": per_zoom,
            "familyRows": {k: {**v, "bytes": v["bytes"]} for k, v in family_rows.items()},
            "products": breakdown,
            "totalTiles": total_tiles,
            "totalBytes": total_bytes,
            "maxTiles": MAX_TILES,
            "maxBytes": MAX_BYTES,
            "withinBudget": total_tiles <= MAX_TILES and total_bytes <= MAX_BYTES,
        }
        if total_tiles > MAX_TILES or total_bytes > MAX_BYTES:
            assertions.append({"level": "fail", "id": "budget",
                               "message": f"estimate {total_tiles} tiles / {total_bytes / 1e6:.0f} MB "
                                          f"exceeds {MAX_TILES} / {MAX_BYTES / 1e6:.0f} MB"})

    # ---- summary
    def counter(key: str):
        return dict(Counter(layer[key] for layer in layers))

    layer_dates = sum(len(layer["periods"]) or 1 for layer in layers)
    summary = {
        "files": len(files),
        "bytes": sum(os.path.getsize(os.path.join(args.data, *f.split("/"))) for f in files),
        "rasters": len(rasters),
        "rasterBytes": sum(layer["sizeBytes"] for layer in layers),
        "vectors": len(vectors),
        "tables": len(tables),
        "scripts": len(scripts),
        "layerDates": layer_dates,
        "byFamily": dict(Counter(layer["family"] for layer in layers)),
        "byProduct": counter("product"),
        "layerDatesByFamily": {
            fam: sum(len(l["periods"]) or 1 for l in layers if l["family"] == fam)
            for fam in sorted({l["family"] for l in layers})},
        "dtypes": dict(Counter(b["dtype"] for l in layers for b in l["bands"])),
        "compression": dict(Counter(l["compression"] for l in layers)),
        "crs": dict(Counter(l["crs"] for l in layers)),
        "nodata": dict(Counter(b["nodataRaw"] for l in layers for b in l["bands"])),
        "scales": dict(Counter(str(b["scale"]) for l in layers for b in l["bands"])),
        "grids": dict(Counter(f"{l['width']}x{l['height']}@{l['transform'][0]:.1f}m" for l in layers)),
        "bandsPerRaster": dict(Counter(l["count"] for l in layers)),
        "outlookBandDescriptions": next(
            ([b["description"] for b in l["bands"]] for l in layers if l["family"] == "outlook"), None),
        "tiled": dict(Counter(str(l["tiled"]) for l in layers)),
    }

    answers = {
        "qmlStyles": qml,
        "indexFiles": index_like,
        "releaseTags": "none (checked via API)",
        "boundaryFormat": [v["format"] for v in vector_info],
        "boundary": [v for v in vector_info if v["path"].startswith("boundary/")],
        "deformationLayers": [l["path"] for l in layers if re.search(
            r"(gunw|insar|deform|uplift|subsidence|unwrap)", l["path"], re.I)],
        "csv": csv_info,
        "webmapScripts": [s for s in scripts if "web_export" in s],
    }

    fails = [a for a in assertions if a["level"] == "fail"]
    warns = [a for a in assertions if a["level"] == "warn"]

    report = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": pin,
        "summary": summary,
        "answers": answers,
        "vectors": vector_info,
        "tables": csv_info,
        "scripts": scripts,
        "otherFiles": others,
        "tileEstimate": tile_estimate,
        "layers": layers,
        "assertions": assertions,
        "fails": len(fails),
        "warnings": len(warns),
    }

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
        fh.write("\n")

    # ---- console report
    print(f"\n{summary['rasters']} rasters, {summary['layerDates']} layer-dates, "
          f"{summary['bytes'] / 1e6:.0f} MB on disk")
    print("  by family: " + ", ".join(f"{k} {v}" for k, v in summary["layerDatesByFamily"].items()))
    print("  dtype: " + ", ".join(f"{k}×{v}" for k, v in summary["dtypes"].items()))
    print("  compression: " + ", ".join(f"{k}×{v}" for k, v in summary["compression"].items()))
    print("  crs: " + ", ".join(f"{k}×{v}" for k, v in summary["crs"].items()))
    print("  nodata: " + ", ".join(f"{k}×{v}" for k, v in summary["nodata"].items()))
    print("  scales: " + ", ".join(f"{k}×{v}" for k, v in summary["scales"].items()))
    print("  bands/raster: " + ", ".join(f"{k}×{v}" for k, v in summary["bandsPerRaster"].items()))
    print("  grids: " + ", ".join(f"{k}×{v}" for k, v in list(summary["grids"].items())[:6]))
    if tile_estimate:
        print(f"\ntile estimate: {tile_estimate['totalTiles']:,} tiles, "
              f"{tile_estimate['totalBytes'] / 1e6:.0f} MB "
              f"(budget {MAX_TILES:,} / {MAX_BYTES / 1e6:.0f} MB) -> "
              f"{'OK' if tile_estimate['withinBudget'] else 'OVER'}")
        for row in tile_estimate["products"]:
            print(f"  {row['family']:<11} {row['product']:<24} z{row['zoom'][0]}-{row['zoom'][1]} "
                  f"{row['layerDates']:>4} layer-dates  {row['tiles']:>7,} tiles  "
                  f"{row['bytes'] / 1e6:>6.1f} MB")
    print(f"\nannotations: {len(fails)} fail, {len(warns)} warn")
    for a in fails[:40]:
        print(f"  FAIL {a.get('layer', '(global)')}: {a['message']}")
    for a in warns[:25]:
        print(f"  warn {a.get('layer', '(global)')}: {a['message']}")
    if len(warns) > 25:
        print(f"  ... {len(warns) - 25} more warnings in {args.out}")
    print(f"\nwrote {args.out}")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
