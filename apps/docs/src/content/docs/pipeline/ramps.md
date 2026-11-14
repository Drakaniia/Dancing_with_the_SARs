---
title: Colour ramps
description: The ramps and class tables in ramps.py, and how one definition drives both tiles and legends.
---

`scripts/tiles/ramps.py` is the **only** definition of what a value looks like. The PNG palette
and the manifest's `ramp` / `classes` entry are both generated from it, so a legend cannot drift
from the tiles.

Stops are defined on a normalised 0–1 scale. For each layer, `expand_stops()` maps them into the
layer's `domain` in data units before writing them into the manifest. For example, the `change`
ramp over a ±3 dB domain becomes stops at −3, −1.5, 0, 1.5 and 3 dB.

## Continuous ramps

| Key | Kind | Colours | Used for |
| --- | --- | --- | --- |
| `backscatter` | sequential | `#08131f → #2c3e6b → #2f8a8a → #8ec96f → #f7f7b0` | Absolute HH/HV dB: dark is smooth or absorbing, pale is rough or bright |
| `change` | diverging | `#8c510a → #d8b365 → #f5f5f5 → #5ab4ac → #01665e` | Backscatter change and index anomalies: brown is drying or loss, teal is wetting or gain |
| `vegetation` | sequential | `#8c510a → #dfc27d → #c7e9b4 → #41ab5d → #005a32` | EVI, NDVI, NBR |
| `moisture` | diverging | `#8c510a → #f6e8c3 → #f5f5f5 → #41b6c4 → #0c2c84` | NDMI |
| `water` | diverging | `#a6611a → #f5f5f5 → #74add1 → #2c7fb8 → #08306b` | NDWI |
| `temperature` | sequential | `#2166ac → #67a9cf → #f7f7f7 → #ef8a62 → #b2182b` | Daytime land surface temperature |
| `temperature_anomaly` | diverging | same as above | Temperature anomaly |
| `probability_drought` | diverging | `#01665e → #80cdc1 → #f5f5f5 → #dfc27d → #8c510a` | Chance of below-normal greenness |
| `confidence` | sequential | `#f7f3ea → #cbc3b0 → #8a5a2b → #2e2a1e` | Classifier confidence, valid-observation counts |
| `elevation` | sequential | `#1a6b3a → #8ec96f → #f6e8c3 → #b36b2c → #fffdf8` | SRTM elevation |
| `slope` | sequential | `#f7f3ea → #fed976 → #fd8d3c → #d94801 → #7f0000` | SRTM slope |
| `aspect` | sequential (cyclic) | `#2166ac → #41ab5d → #fd8d3c → #8c510a → #2166ac` | SRTM aspect, 0–360° |

Each palette has **64 colour levels** (indices 0–63), with index 255 reserved for transparency.
Sixty-four levels keep gradients smooth and make PNGs about four times smaller than full
palettes.

## Example domains

Most products have a fixed domain, so colours mean the same thing across dates:

| Product | Domain |
| --- | --- |
| Radar change (monthly and pairs) | −3 to +3 dB |
| NISAR EVI | 0–0.8 |
| NISAR NDMI | −0.2 to 0.6 |
| Quake EVI/NBR change and anomaly | −0.3 to +0.3 |
| Landsat quarterly indices | 0–0.85 |
| Landsat anomalies | −0.25 to +0.25 |
| MODIS NDVI / anomaly | 0.2–0.92 / ±0.15 |
| MODIS LST / anomaly | 18–35 °C / ±3 °C |
| Classifier confidence | 20–100 % |
| Elevation / slope / aspect | 0–2,200 m / 0–45° / 0–360° |
| Absolute backscatter | 2nd–98th percentile of valid pixels |

The manifest is authoritative: each entry's `domain` is the range its tiles were rendered with.

## Class tables

| Scheme | Codes |
| --- | --- |
| `landcover` | 1 Closed forest `#005a32` · 2 Open forest & mangrove `#238b45` · 3 Brush / shrubs `#74c476` · 4 Grassland `#c7e9b4` · 5 Annual crop `#dfc27d` · 6 Perennial crop `#a6611a` · 7 Built-up & barren `#b2182b` · 8 Water & fishpond `#2c7fb8` |
| `landcover_change` | 1 Agree (no change, **transparent**) · 2 Forest → non-forest `#b2182b` · 3 Vegetation → built / bare `#d94801` · 4 Land → water `#2c7fb8` · 5 Other transition `#8a5a2b` |
| `landslide` | 1 Checked, no slide `#d6cfbd` · 2 Possible landslide `#b2182b` · 4 Not checked (cloudy) `#74add1` · 5 Checked, no elevation data `#dfc27d` |

The labels follow the upstream README's wording.

## Changing a ramp

1. Edit the ramp or class table in `ramps.py`.
2. Run the pipeline for the affected families. The ramp key is part of each layer-date's
   signature, so the layers that use it are rebuilt automatically.
3. The manifest's `ramp` / `classes` update in the same run, so legends follow.
