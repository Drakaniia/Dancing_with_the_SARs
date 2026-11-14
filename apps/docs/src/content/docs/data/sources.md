---
title: Data sources
description: Where the real data comes from, including the team's companion data repository and the upstream satellite and climate products behind it.
---

The app does not process satellite data itself. All of its real data comes from a **separate
companion repository** maintained by The Cartographers. That repository is where the team
processes the raw satellite products into analysis-ready GeoTIFFs. This repository then turns
those files into map tiles and a manifest.

## Companion data repository

**[monteropeterdominic-arch/sarangani-davao-occidental-nisar](https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar)**

|             |                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role        | The team's data-processing repo: NISAR, Landsat, MODIS, climate and terrain products for Sarangani and Davao Occidental                                                            |
| Commit used | [`1505baefd6f0443f80379a8979c995dc2c90bed5`](https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar/tree/1505baefd6f0443f80379a8979c995dc2c90bed5) on `main` |
| Contents    | 212 files (727 MB): 186 GeoTIFFs, the area-of-interest boundary, CSV tables, processing scripts                                                                                    |
| Grid        | EPSG:32651 (UTM 51N), 30 m                                                                                                                                                         |

:::caution
The older `nisar-mindanao` repository is a draft. Do not use it.
:::

### How the two repositories connect

```text
sarangani-davao-occidental-nisar        (team data repo: raw products -> GeoTIFFs)
            │  scripts/tiles/fetch_data.py, pinned to one commit
            ▼
data/  (gitignored local copy)
            │  scripts/tiles/pipeline.py
            ▼
public/tiles/ + public/data/manifest.json   (this repo: what the app reads)
```

The commit is pinned in `data/.pin.json` and repeated in the manifest's `source` block. Every
tile, legend and inspector value can therefore be traced to an exact version of the data repo.
The app shows the same link in its provenance dialog and includes it in every JSON export. To
move to a newer data release, run `fetch_data.py --commit <sha>`, then rebuild with the
pipeline. See [Fetch and inventory](/Dancing_with_the_SARs/pipeline/fetch-inventory/).

## Upstream products

The data repo builds its GeoTIFFs from these public products:

| Product                                                                                                        | Provider     | Used for                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| [NISAR L2 GCOV](https://nisar.jpl.nasa.gov/) (provisional), distributed by [ASF DAAC](https://asf.alaska.edu/) | NASA-ISRO    | Radar backscatter and change. Also the input for the radar-estimated vegetation (EVI, NDMI) and the 2026 land cover. |
| [Harmonized Landsat Sentinel-2 (HLS) L30 v2.0](https://hls.gsfc.nasa.gov/)                                     | NASA / USGS  | Earthquake EVI/NBR before and after, landslide screening, quarterly EVI/NDMI/NDWI time series                        |
| [MODIS MOD13Q1](https://lpdaac.usgs.gov/products/mod13q1v061/)                                                 | NASA LP DAAC | Monthly NDVI and anomalies, NDVI outlook                                                                             |
| [MODIS MOD11A2](https://lpdaac.usgs.gov/products/mod11a2v061/)                                                 | NASA LP DAAC | Monthly daytime land surface temperature and anomalies, temperature outlook                                          |
| [GPM IMERG V07](https://gpm.nasa.gov/data/imerg)                                                               | NASA         | Rainfall in the El Niño outlook scenario                                                                             |
| [SRTMGL1](https://lpdaac.usgs.gov/products/srtmgl1v003/)                                                       | NASA LP DAAC | Elevation, slope and aspect; elevation checks for landslide candidates                                               |
| [NOAA CPC Oceanic Niño Index](https://www.cpc.ncep.noaa.gov/)                                                  | NOAA         | El Niño sensitivity (per +1 °C ONI) in the 12-month outlook                                                          |

The attribution string in the manifest reads: _NISAR L2 GCOV (NASA-ISRO, provisional) · Landsat
HLS L30 v2.0 · MODIS MOD13Q1/MOD11A2 · GPM IMERG V07 · SRTMGL1 · NOAA CPC_.

## Basemap

The satellite basemap under the overlays is
[Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9).
It is display context only and is not part of the analysis.

## Related pages

- [The NISAR release](/Dancing_with_the_SARs/data/release/): the measured contents and raster contract of the data repo.
- [Layer catalogue](/Dancing_with_the_SARs/data/catalogue/): every layer derived from it.
- [Provenance and limitations](/Dancing_with_the_SARs/data/limitations/): what the data can and cannot show.
