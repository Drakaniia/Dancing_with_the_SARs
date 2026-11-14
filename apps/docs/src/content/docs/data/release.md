---
title: The NISAR release
description: The upstream GeoTIFF release behind every layer, what it contains, and the measured raster contract.
---

Every layer in the app is derived from one data release in the team's separate data-processing
repository,
[monteropeterdominic-arch/sarangani-davao-occidental-nisar](https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar).
This page describes what that release contains, as measured by the inventory. For how the two
repositories connect and which upstream products feed them, see [Data sources](/Dancing_with_the_SARs/data/sources/).

:::caution
The older `nisar-mindanao` repository is a draft. Do not use it.
:::

## Pinned source

|                |                                                                                |
| -------------- | ------------------------------------------------------------------------------ |
| Pinned commit  | `7ea38ff1b5c0dd4571b1935d01c5bd71ebf72862` (`main`; no tags or releases exist) |
| Size           | 212 files, 727,237,938 bytes                                                   |
| Local location | gitignored `data/`, populated by `scripts/tiles/fetch_data.py`                 |
| Pin record     | `data/.pin.json` (repo, commit, file and byte counts)                          |

The pin is what makes the manifest's `source` block citable. Bump it deliberately with
`fetch_data.py --commit <sha>`.

## Folders

| Folder         | Family                | Contents                                                               |
| -------------- | --------------------- | ---------------------------------------------------------------------- |
| `nisar/`       | radar                 | HH/HV backscatter by month and by date, month change, same-track pairs |
| `nisar_ml/`    | vegetation, landcover | Radar-estimated EVI/NDMI; land cover classes, confidence, change       |
| `earthquake/`  | earthquake            | Pre/post EVI and NBR, seasonal baselines, landslide candidates         |
| `landsat_hls/` | climate               | Quarterly EVI/NDMI/NDWI, anomalies, valid-observation counts           |
| `modis/`       | climate               | Monthly NDVI and land surface temperature, anomalies                   |
| `outlook/`     | outlook               | Twelve 12-band El Niño scenario rasters                                |
| `terrain/`     | terrain               | SRTM elevation, slope, aspect                                          |
| `boundary/`    | —                     | Area-of-interest GeoPackage (EPSG:32651 and EPSG:4326)                 |
| `tables/`      | —                     | CSV tables: ranked landslides, monthly means, outlook scenario         |

## Raster contract

`inventory.py` measures each file directly; it does not read values off the README. All
contract checks pass:

| Property      | Measured                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Count         | 186 GeoTIFFs: 174 single-band and 12 × 12-band outlook                                          |
| CRS           | 186 / 186 EPSG:32651 (WGS 84 / UTM 51N)                                                         |
| Compression   | 186 / 186 DEFLATE, tiled in 512 × 512 blocks                                                    |
| Overviews     | None on any raster; the pipeline builds its own pyramid                                         |
| dtypes        | int16, uint8, float32                                                                           |
| nodata        | −32768 (Int16), 255 (Byte), NaN (Float32)                                                       |
| Scale factors | dB `0.01` · indices `0.0001` · temperature/slope/aspect `0.01` · elevation `0.1` · classes none |
| Class codes   | Exactly the README vocabularies, with no stray codes                                            |

### Grids

| Grid                                           | Rasters | Used by                                                     |
| ---------------------------------------------- | ------- | ----------------------------------------------------------- |
| 5147 × 4810 @ 30 m, origin 648150 E / 735870 N | 108     | radar, vegetation, land cover, earthquake, Landsat, terrain |
| 618 × 578 @ 250 m                              | 33      | MODIS NDVI and NDVI anomaly                                 |
| 155 × 145 @ 1 km                               | 33      | MODIS land temperature and anomaly                          |
| 1091 × 573 @ 250 m                             | 8       | Outlook EVI/NDVI                                            |
| 274 × 144 @ 1 km                               | 4       | Outlook LST                                                 |

The outlook bands name their months verbatim (`2026-11 anomaly per +1 C ONI` … `2027-10 …`),
so the timeline is parsed from the band descriptions rather than guessed from file names.

## Area of interest

- Two features, Sarangani and Davao Occidental: 34 polygon parts, **5,268.4 km²**.
- Extent: **124.357–125.715 °E, 5.365–6.633 °N**. This is the manifest `bounds`, and the map
  fits to it on load.
- The pipeline converts the GeoPackage once to `apps/web/public/data/boundary.geojson` for MapLibre.

## What the release does not contain

- **No deformation rasters** (InSAR / uplift / subsidence). No public NISAR data exists before
  19 June 2026, so NISAR cannot measure the quake's uplift.
- No EPSG:4326 rasters.
- No QGIS `.qml` styles.
- No machine-readable index.
- No release tag.

That is why the app uses its own ramps, its own warp step, and families based on the data
itself instead of the original four "change types". See
[Design decisions](/Dancing_with_the_SARs/reference/decisions/).

## Tables

The CSVs are folded into `apps/web/public/data/tables.json` at pipeline time, so the app never parses
CSV:

- **Ranked landslides:** 152 clusters with rank, barangay, municipality, province, area,
  patches, location, slope, elevation, EVI before/after, and distance from the epicentre.
- **Monthly means for the area of interest:** 23 months of NDVI and daytime land temperature,
  with coverage.
- **Outlook scenario:** 12 months of rainfall normal/expected/p10/p90, EVI/NDVI/LST anomalies,
  and the share of land below normal greenness.
- **MODIS monthly series:** 321 rows, 2000–2026.
- **Epicentre:** 125.056 °E, 5.599 °N (USGS us7000srb1), offshore about 32 km south of Maasim,
  8 Jun 2026 07:37 PHT (UTC+8). Depth 57 km (USGS) / 33 km (PHIVOLCS).
