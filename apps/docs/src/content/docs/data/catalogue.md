---
title: Layer catalogue
description: All 57 layers in the manifest, grouped by family, with units, periods and zoom range.
---

The manifest holds **318 layer-dates** for **57 unique layers**. Each table lists a layer's id
(as used in the manifest and the app), its display name, units, number of periods, and zoom
range.

Zoom ranges come from the tiling budget. Headline layers go to **z13**; dense time series stop
at **z11**.

## Radar Backscatter & Change (`radar`)

Thirty-three layer-dates. NISAR L-band GCOV backscatter in dB.

| Id                             | Name                            | Periods                                 | Zoom |
| ------------------------------ | ------------------------------- | --------------------------------------- | ---- |
| `radar-change-hh-monthly`      | HH Backscatter Change (monthly) | `2026-10 (vs 2026-09)`                  | 5–13 |
| `radar-change-hv-monthly`      | HV Backscatter Change (monthly) | `2026-10 (vs 2026-09)`                  | 5–13 |
| `radar-backscatter-hh-monthly` | HH Backscatter (monthly)        | 2: 2026-09, 2026-10                     | 5–13 |
| `radar-backscatter-hv-monthly` | HV Backscatter (monthly)        | 2: 2026-09, 2026-10                     | 5–13 |
| `radar-backscatter-hh-by-date` | HH Backscatter (by date)        | 8: 2026-06-28 … 2026-10-19              | 5–11 |
| `radar-backscatter-hv-by-date` | HV Backscatter (by date)        | 8: 2026-06-28 … 2026-10-19              | 5–11 |
| `radar-change-hh-t039a004`     | HH Same-Track Change (T039A004) | `2026-10-14 (vs 2026-09-20)`            | 5–11 |
| `radar-change-hh-t039a005`     | HH Same-Track Change (T039A005) | 3 pairs, `2026-09-20 (vs 2026-06-28)` … | 5–11 |
| `radar-change-hh-t075d085`     | HH Same-Track Change (T075D085) | `2026-10-17 (vs 2026-09-23)`            | 5–11 |
| `radar-change-hh-t075d086`     | HH Same-Track Change (T075D086) | `2026-10-17 (vs 2026-09-23)`            | 5–11 |
| `radar-change-hh-t111a005`     | HH Same-Track Change (T111A005) | `2026-10-19 (vs 2026-09-25)`            | 5–11 |
| `radar-change-hv-t039a004`     | HV Same-Track Change (T039A004) | `2026-10-14 (vs 2026-09-20)`            | 5–11 |
| `radar-change-hv-t039a005`     | HV Same-Track Change (T039A005) | `2026-10-14 (vs 2026-06-28)`            | 5–11 |
| `radar-change-hv-t075d085`     | HV Same-Track Change (T075D085) | `2026-10-17 (vs 2026-09-23)`            | 5–11 |
| `radar-change-hv-t111a005`     | HV Same-Track Change (T111A005) | `2026-10-19 (vs 2026-09-25)`            | 5–11 |

Same-track layers compare two passes over the same NISAR track and frame, named after the upstream
file (for example `T039A004`). Only same-geometry pairs are differenced.

## Vegetation & Plant Water (`vegetation`)

Twenty layer-dates. Machine-learning estimates of optical indices from radar, unitless.

| Id                        | Name                                       | Periods             | Zoom |
| ------------------------- | ------------------------------------------ | ------------------- | ---- |
| `vegetation-evi-monthly`  | NISAR Vegetation Greenness (EVI) (monthly) | 2: 2026-09, 2026-10 | 5–13 |
| `vegetation-ndmi-monthly` | NISAR Plant Moisture (NDMI) (monthly)      | 2: 2026-09, 2026-10 | 5–13 |
| `vegetation-evi-by-date`  | NISAR Vegetation Greenness (EVI) (by date) | 8 NISAR pass dates  | 5–11 |
| `vegetation-ndmi-by-date` | NISAR Plant Moisture (NDMI) (by date)      | 8 NISAR pass dates  | 5–11 |

## Land Cover & Change (`landcover`)

Four layer-dates.

| Id                           | Name                             | Units | Periods        |
| ---------------------------- | -------------------------------- | ----- | -------------- |
| `landcover-classes`          | Land Cover Classes (2020 & 2026) | class | 2020, 2026     |
| `landcover-change-2020-2026` | Land Cover Change (2026 vs 2020) | class | `2026 vs 2020` |
| `landcover-confidence-2026`  | Classifier Confidence (2026)     | %     | 2026           |

All land cover layers render at z5–13.

**Land cover classes:**

1. Closed forest
2. Open forest & mangrove
3. Brush / shrubs
4. Grassland
5. Annual crop
6. Perennial crop
7. Built-up & barren
8. Water & fishpond

**Change vs 2020:** 1 agree (no change, transparent on the map) · 2 forest → non-forest · 3 vegetation → built/bare ·
4 land → water · 5 other transition.

## 8 June 2026 Earthquake (`earthquake`)

Eleven layer-dates, all at z5–13. Optical indices (EVI, NBR) from Landsat HLS around the M7.8
event.

| Id                                | Name                                     | Periods                          |
| --------------------------------- | ---------------------------------------- | -------------------------------- |
| `earthquake-evi-pre`              | Pre-Quake EVI Composite                  | pre-quake 2025, pre-quake 2026   |
| `earthquake-evi-post`             | Post-Quake EVI Composite                 | post-quake 2025, post-quake 2026 |
| `earthquake-evi-change-2026`      | Quake EVI Change (Post minus Pre)        | `2026-06-09 (post minus pre)`    |
| `earthquake-evi-change-2025`      | Baseline 2025 Seasonal EVI Change        | `2025 seasonal change`           |
| `earthquake-evi-anomaly-2026`     | Quake EVI Excess Loss (vs 2025 Seasonal) | `2026 anomaly vs 2025 seasonal`  |
| `earthquake-nbr-change-2026`      | Quake NBR Change (Post minus Pre)        | `2026-06-09 (post minus pre)`    |
| `earthquake-nbr-change-2025`      | Baseline 2025 Seasonal NBR Change        | `2025 seasonal change`           |
| `earthquake-nbr-anomaly-2026`     | Quake NBR Excess Loss (vs 2025 Seasonal) | `2026 anomaly vs 2025 seasonal`  |
| `earthquake-landslide-candidates` | Post-Quake Landslide Candidates          | `2026-06..09`                    |

**Landslide candidate classes:** 1 checked, no slide · 2 possible landslide · 4 not checked
(cloudy) · 5 checked, no elevation data.

The 2025 layers are a **seasonal baseline**. The "excess loss" anomalies subtract normal
seasonal change from the 2026 change, so they isolate what the quake added.

## El Niño Time Series (`climate`)

A hundred and three layer-dates, all at z5–11.

| Id                           | Name                                | Units | Periods                   |
| ---------------------------- | ----------------------------------- | ----- | ------------------------- |
| `climate-hls-evi-quarterly`  | Landsat HLS EVI (Quarterly)         | index | 7: 2025-Q1 … 2026-Q3      |
| `climate-hls-ndmi-quarterly` | Landsat HLS NDMI (Quarterly)        | index | 7                         |
| `climate-hls-ndwi-quarterly` | Landsat HLS NDWI (Quarterly)        | index | 7                         |
| `climate-hls-evi-anomaly`    | Landsat HLS EVI Anomaly (vs 2025)   | index | 3: 2026-Q1 … Q3 (vs 2025) |
| `climate-hls-ndmi-anomaly`   | Landsat HLS NDMI Anomaly (vs 2025)  | index | 3                         |
| `climate-hls-ndwi-anomaly`   | Landsat HLS NDWI Anomaly (vs 2025)  | index | 3                         |
| `climate-hls-valid-obs`      | Landsat HLS Valid Observations      | count | 7 (diagnostic)            |
| `climate-modis-ndvi-monthly` | MODIS NDVI (Monthly)                | index | 23: 2024-12 … 2026-10     |
| `climate-modis-ndvi-anomaly` | MODIS NDVI Anomaly (vs 2025)        | index | 10: 2026-01 … 2026-10     |
| `climate-modis-lst-monthly`  | MODIS Land Temperature (Monthly)    | °C    | 23: 2024-12 … 2026-10     |
| `climate-modis-lst-anomaly`  | MODIS Temperature Anomaly (vs 2025) | °C    | 10: 2026-01 … 2026-10     |

:::note
`MODIS_LST_Day_2024-12_1km.tif` is nearly empty (126 valid pixels), so in practice the land
temperature series starts in 2025-01.
:::

## 12-Month El Niño Scenario (`outlook`)

A hundred and forty-four layer-dates: 12 products × 12 months, **2026-11 … 2027-10**, all at
z5–11.

| Index | Expected                | Anomaly                | Chance below normal                | El Niño sensitivity               |
| ----- | ----------------------- | ---------------------- | ---------------------------------- | --------------------------------- |
| EVI   | `outlook-evi-expected`  | `outlook-evi-anomaly`  | `outlook-evi-chance-below-normal`  | `outlook-evi-elnino-sensitivity`  |
| NDVI  | `outlook-ndvi-expected` | `outlook-ndvi-anomaly` | `outlook-ndvi-chance-below-normal` | `outlook-ndvi-elnino-sensitivity` |
| LST   | `outlook-lst-expected`  | `outlook-lst-anomaly`  | `outlook-lst-chance-below-normal`  | `outlook-lst-elnino-sensitivity`  |

Units:

- Expected values and anomalies: index, or °C for LST.
- Chance below normal: probability.
- Sensitivity: change per +1 °C of the Oceanic Niño Index (ONI).

## SRTM Terrain (`terrain`)

Three static layers at z5–13.

| Id                  | Name               | Units |
| ------------------- | ------------------ | ----- |
| `terrain-elevation` | SRTM Elevation     | m     |
| `terrain-slope`     | SRTM Terrain Slope | °     |
| `terrain-aspect`    | SRTM Slope Aspect  | °     |

## Tile totals by family

| Family     | Tiles      | Size         |
| ---------- | ---------- | ------------ |
| outlook    | 8,112      | 79.7 MB      |
| climate    | 6,245      | 50.6 MB      |
| earthquake | 4,834      | 134.9 MB     |
| radar      | 3,623      | 112.7 MB     |
| vegetation | 2,558      | 62.9 MB      |
| landcover  | 1,909      | 24.3 MB      |
| terrain    | 1,249      | 41.5 MB      |
| **Total**  | **28,530** | **506.5 MB** |
