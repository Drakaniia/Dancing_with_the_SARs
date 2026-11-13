"""Colour ramps and categorical class tables for the tile renderer and legends (spec §5.3, D10).

A ramp or class table is the only definition of what a value looks like: the PNG palette and the
manifest's `ramp` / `classes` entry come from the same definition, so a legend cannot drift from
the tiles.

Stops are normalised 0..1 here; the pipeline expands them into data units with the layer's domain
(`expand_stops`) before writing them into the manifest.
"""

from __future__ import annotations

import numpy as np

# Indices 0..63 are ramp colours; 255 is transparent (64 levels gives smooth gradients & ~4x smaller PNGs).
PALETTE_COLORS = 64
TRANSPARENT = 255

HexColor = str

RAMPS: dict[str, dict] = {
    # Absolute backscatter (dB): dark = smooth/absorbing, pale = rough/bright.
    "backscatter": {
        "kind": "sequential",
        "stops": [
            (0.0, "#08131f"),
            (0.25, "#2c3e6b"),
            (0.5, "#2f8a8a"),
            (0.75, "#8ec96f"),
            (1.0, "#f7f7b0"),
        ],
    },
    # Backscatter change & vegetation/moisture anomalies: brown = drying/loss, teal = wetting/gain.
    "change": {
        "kind": "diverging",
        "stops": [
            (0.0, "#8c510a"),
            (0.25, "#d8b365"),
            (0.5, "#f5f5f5"),
            (0.75, "#5ab4ac"),
            (1.0, "#01665e"),
        ],
    },
    # Vegetation index (EVI, NDVI, NBR): barren ochre -> dry grass -> dense tropical canopy.
    "vegetation": {
        "kind": "sequential",
        "stops": [
            (0.0, "#8c510a"),
            (0.3, "#dfc27d"),
            (0.55, "#c7e9b4"),
            (0.8, "#41ab5d"),
            (1.0, "#005a32"),
        ],
    },
    # Plant moisture (NDMI): dry brown -> neutral -> canopy moisture blue-teal.
    "moisture": {
        "kind": "diverging",
        "stops": [
            (0.0, "#8c510a"),
            (0.33, "#f6e8c3"),
            (0.5, "#f5f5f5"),
            (0.75, "#41b6c4"),
            (1.0, "#0c2c84"),
        ],
    },
    # Surface water index (NDWI): land neutral -> shallow -> deep water blue.
    "water": {
        "kind": "diverging",
        "stops": [
            (0.0, "#a6611a"),
            (0.45, "#f5f5f5"),
            (0.65, "#74add1"),
            (0.85, "#2c7fb8"),
            (1.0, "#08306b"),
        ],
    },
    # Daytime land surface temperature (°C): cool highland -> warm lowland -> hot dry-season.
    "temperature": {
        "kind": "sequential",
        "stops": [
            (0.0, "#2166ac"),
            (0.3, "#67a9cf"),
            (0.5, "#f7f7f7"),
            (0.75, "#ef8a62"),
            (1.0, "#b2182b"),
        ],
    },
    # Temperature anomaly (°C): cooler blue -> neutral -> warmer red.
    "temperature_anomaly": {
        "kind": "diverging",
        "stops": [
            (0.0, "#2166ac"),
            (0.25, "#67a9cf"),
            (0.5, "#f7f7f7"),
            (0.75, "#ef8a62"),
            (1.0, "#b2182b"),
        ],
    },
    # Probability of below-normal greenness (0..1): teal safe -> neutral -> drought amber/brown.
    "probability_drought": {
        "kind": "diverging",
        "stops": [
            (0.0, "#01665e"),
            (0.35, "#80cdc1"),
            (0.5, "#f5f5f5"),
            (0.75, "#dfc27d"),
            (1.0, "#8c510a"),
        ],
    },
    # Classifier confidence (%) & valid observations count.
    "confidence": {
        "kind": "sequential",
        "stops": [
            (0.0, "#f7f3ea"),
            (0.35, "#cbc3b0"),
            (0.7, "#8a5a2b"),
            (1.0, "#2e2a1e"),
        ],
    },
    # SRTM Elevation (m): coastal lowland green -> foothill -> ridge -> volcanic peak.
    "elevation": {
        "kind": "sequential",
        "stops": [
            (0.0, "#1a6b3a"),
            (0.2, "#8ec96f"),
            (0.45, "#f6e8c3"),
            (0.75, "#b36b2c"),
            (1.0, "#fffdf8"),
        ],
    },
    # SRTM Slope (deg): flat -> moderate -> steep landslide-prone escarpments.
    "slope": {
        "kind": "sequential",
        "stops": [
            (0.0, "#f7f3ea"),
            (0.25, "#fed976"),
            (0.5, "#fd8d3c"),
            (0.75, "#d94801"),
            (1.0, "#7f0000"),
        ],
    },
    # SRTM Aspect (deg 0..360): compass cycle.
    "aspect": {
        "kind": "sequential",
        "stops": [
            (0.0, "#2166ac"),
            (0.25, "#41ab5d"),
            (0.5, "#fd8d3c"),
            (0.75, "#8c510a"),
            (1.0, "#2166ac"),
        ],
    },
}

# Categorical class definitions (spec §3, README verbatim labels).
# `transparentCodes` are rendered as alpha 0 in tiles (e.g. class 1 "agree" on landcover_change).
CLASS_SCHEMES: dict[str, dict] = {
    "landcover": {
        "transparentCodes": set(),
        "classes": [
            {"code": 1, "label": "Closed forest", "color": "#005a32"},
            {"code": 2, "label": "Open forest & mangrove", "color": "#238b45"},
            {"code": 3, "label": "Brush / shrubs", "color": "#74c476"},
            {"code": 4, "label": "Grassland", "color": "#c7e9b4"},
            {"code": 5, "label": "Annual crop", "color": "#dfc27d"},
            {"code": 6, "label": "Perennial crop", "color": "#a6611a"},
            {"code": 7, "label": "Built-up & barren", "color": "#b2182b"},
            {"code": 8, "label": "Water & fishpond", "color": "#2c7fb8"},
        ],
    },
    "landcover_change": {
        "transparentCodes": {1},  # spec §4: Class 1 of the change raster ("agree") is transparent.
        "classes": [
            {"code": 1, "label": "Agree (no change)", "color": "#ded8c9"},
            {"code": 2, "label": "Forest -> non-forest", "color": "#b2182b"},
            {"code": 3, "label": "Vegetation -> built / bare", "color": "#d94801"},
            {"code": 4, "label": "Land -> water", "color": "#2c7fb8"},
            {"code": 5, "label": "Other transition", "color": "#8a5a2b"},
        ],
    },
    "landslide": {
        "transparentCodes": set(),
        "classes": [
            {"code": 1, "label": "Checked, no slide", "color": "#d6cfbd"},
            {"code": 2, "label": "Possible landslide", "color": "#b2182b"},
            {"code": 4, "label": "Not checked (cloudy)", "color": "#74add1"},
            {"code": 5, "label": "Checked, no elevation data", "color": "#dfc27d"},
        ],
    },
}


def hex_to_rgb(color: str) -> tuple[int, int, int]:
    value = color.lstrip("#")
    if len(value) != 6:
        raise ValueError(f"expected #rrggbb, got {color!r}")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def expand_stops(stops: list[tuple[float, str]], domain: list[float]) -> list[list]:
    """Normalised stops -> `[[value, '#rrggbb'], ...]` over the layer's domain."""
    lo, hi = float(domain[0]), float(domain[1])
    return [[round(lo + t * (hi - lo), 4), color] for t, color in stops]


def palette_for(stops: list[list], colors: int = PALETTE_COLORS) -> np.ndarray:
    """`(colors, 3)` uint8 lookup table, linearly interpolated between stops."""
    absolute = [(float(value), hex_to_rgb(color)) for value, color in stops]
    lo, hi = absolute[0][0], absolute[-1][0]
    span = hi - lo
    lut = np.zeros((colors, 3), dtype=np.uint8)
    last = len(absolute) - 1
    for i in range(colors):
        value = lo + span * i / (colors - 1)
        for j in range(last):
            left, right = absolute[j], absolute[j + 1]
            if value <= right[0] or j == last - 1:
                width = right[0] - left[0]
                t = 0.0 if width == 0 else min(max((value - left[0]) / width, 0.0), 1.0)
                lut[i] = [round(a + (b - a) * t) for a, b in zip(left[1], right[1])]
                break
    return lut


def colorize(values: np.ndarray, domain: list[float], stops: list[list]) -> tuple[np.ndarray, bytes] | None:
    """Map a continuous value window to PNG palette indices plus the 768-byte palette.

    Returns None when the window has no valid pixels, so the caller can skip the tile.
    """
    valid = np.isfinite(values)
    if not valid.any():
        return None
    lo, hi = float(domain[0]), float(domain[1])
    width = hi - lo
    idx = np.full(values.shape, TRANSPARENT, dtype=np.uint8)
    if width <= 0:
        idx[valid] = 0
    else:
        scaled = np.clip((values[valid] - lo) / width, 0.0, 1.0) * (PALETTE_COLORS - 1)
        idx[valid] = np.round(scaled).astype(np.uint8)
    palette = palette_for(stops, PALETTE_COLORS)
    lut = np.zeros((256, 3), dtype=np.uint8)
    lut[:PALETTE_COLORS] = palette
    return idx, lut.tobytes()


def colorize_classes(values: np.ndarray, scheme_key: str) -> tuple[np.ndarray, bytes] | None:
    """Map a categorical code window to PNG palette indices plus the 768-byte palette."""
    scheme = CLASS_SCHEMES[scheme_key]
    transparent_codes = scheme["transparentCodes"]
    classes = scheme["classes"]

    valid = np.isfinite(values)
    if not valid.any():
        return None

    codes = np.round(values).astype(np.int32)
    idx = np.full(values.shape, TRANSPARENT, dtype=np.uint8)
    lut = np.zeros((256, 3), dtype=np.uint8)

    painted = False
    for slot, entry in enumerate(classes):
        code = int(entry["code"])
        if code in transparent_codes:
            continue
        mask = valid & (codes == code)
        if mask.any():
            idx[mask] = slot
            painted = True
        lut[slot] = hex_to_rgb(entry["color"])

    if not painted:
        return None
    return idx, lut.tobytes()
