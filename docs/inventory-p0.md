# P0 inventory — Sarangani / Davao Occidental NISAR release

**Status:** complete · **Date:** 2026-11-02 · **Owner:** The Cartographers
**Spec:** `docs/real-data-integration-spec.md` §11 P0
**Artifacts:** `scripts/tiles/fetch_data.py`, `scripts/tiles/inventory.py`,
`data/inventory.json` (gitignored, generated), `data/.pin.json`

Everything below is measured from the files, not read off the README. Reproduce with the
commands at the end.

---

## 1. What was consumed

|               |                                                                                |
| ------------- | ------------------------------------------------------------------------------ |
| Repo          | `monteropeterdominic-arch/sarangani-davao-occidental-nisar`                    |
| Pinned commit | `7ea38ff1b5c0dd4571b1935d01c5bd71ebf72862` (`main`, no tags or releases exist) |
| Fetched       | 2026-11-02T06:24:31Z · 212 files · 727,237,938 bytes                           |
| Location      | gitignored `data/` (D3), populated by `fetch_data.py`                          |

A plain `git clone` of this repo stalls on a slow link (it negotiated for ~9 minutes and
delivered ~24 MB of 727 MB), so `fetch_data.py` pulls the same bytes from the pinned commit
in parallel and verifies every file against the size the Git tree reports. `data/` stays
gitignored either way; the pin is what makes the manifest's `source` block citable.

**Everything the spec assumed about format holds.** The only failure the inventory reports is
the tile-byte budget (§8), which is a plan problem, not a data problem.

## 2. Raster contract — all checks pass

| Property    | Expected (README)                                         | Measured                                                                                           |
| ----------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Count       | —                                                         | 186 GeoTIFFs (174 single-band, 12 × 12-band outlook)                                               |
| CRS         | EPSG:32651                                                | 186 / 186 EPSG:32651                                                                               |
| Compression | compressed GeoTIFF                                        | 186 / 186 DEFLATE                                                                                  |
| Tiling      | —                                                         | 186 / 186 tiled, 512 × 512 blocks                                                                  |
| Overviews   | —                                                         | **none on any raster**                                                                             |
| dtypes      | Int16 / Byte / Float32                                    | int16 ×162, uint8 ×12, float32 ×144                                                                |
| nodata      | −32768 / 255 / NaN                                        | −32768 ×162, 255 ×12, NaN ×144                                                                     |
| Scales      | dB 0.01 · index 0.0001 · °C/° 0.01 · m 0.1 · classes none | 0.01 ×68, 0.0001 ×93, 0.1 ×1, none ×156 — every Int16 continuous band carries its documented scale |
| Class codes | 1–8 / 1–5 / 1·2·4·5                                       | exactly those, no strays, in all five categorical rasters                                          |

Grids present:

| Grid                                           | Rasters | Used by                                                     |
| ---------------------------------------------- | ------- | ----------------------------------------------------------- |
| 5147 × 4810 @ 30 m, origin 648150 E / 735870 N | 108     | radar, vegetation, land cover, earthquake, Landsat, terrain |
| 618 × 578 @ 250 m                              | 33      | MODIS NDVI + NDVI anomaly                                   |
| 155 × 145 @ 1 km                               | 33      | MODIS land temperature + anomaly                            |
| 1091 × 573 @ 250 m                             | 8       | outlook EVI/NDVI                                            |
| 274 × 144 @ 1 km                               | 4       | outlook LST                                                 |

Outlook bands name their months verbatim (`2026-11 anomaly per +1 C ONI` … `2027-10 …`), so
the timeline is parsed from band descriptions, not guessed from file names. That answers the
open question in the reply draft.

## 3. Layer-dates

**318 layer-dates** across 186 files (outlook unfolds 12 rasters × 12 bands).

| Family       | Layer-dates | Products                                                                                                       |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `outlook`    | 144         | EVI/NDVI expected, anomaly, chance, sensitivity (8 × 12) · LST equivalents (4 × 12)                            |
| `climate`    | 103         | Landsat EVI/NDMI/NDWI quarterly 21, anomalies 9, ValidObs 7 · MODIS NDVI 23 + anomaly 10 · LST 23 + anomaly 10 |
| `radar`      | 33          | backscatter by month 4, by date 16, month change 2, same-track pairs 11                                        |
| `vegetation` | 20          | EVI/NDMI by month 4, by date 16                                                                                |
| `earthquake` | 11          | EVI/NBR pre/post/change 10, landslide candidates 1                                                             |
| `landcover`  | 4           | 2020, 2026, change vs 2020, confidence                                                                         |
| `terrain`    | 3           | elevation, slope, aspect                                                                                       |

This is higher than the spec's 200–260 estimate because the outlook 12-band rasters unfold to
12 periods each (spec §5.2 assumed 4 products × 12 months = 48; it is 12 rasters × 12 months =
144). That single correction is what pushes the byte budget (§8).

## 4. What the release does not contain

| Question                                                 | Answer                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `.qml` styles                                            | **none** anywhere in the repo                                                                              |
| Machine-readable index / catalog                         | **none** (only `README.md` prose)                                                                          |
| Release tag                                              | **none** — no tags, no releases (GitHub API)                                                               |
| Deformation rasters (GUNW / InSAR / uplift / subsidence) | **none** — spec premise confirmed                                                                          |
| EPSG:4326 rasters                                        | **none** — all 186 are EPSG:32651                                                                          |
| Boundary format (spec O7)                                | **GeoPackage**, twice: `AOI_…_EPSG32651.gpkg` and `AOI_…_EPSG4326.gpkg`                                    |
| Boundary content                                         | 1 layer each, `MULTIPOLYGON`, 2 features, 34 parts, valid, **5,268.4 km²** (README: 2,003 + 3,261 = 5,264) |
| Boundary extent (EPSG:4326)                              | 124.357 – 125.715 E, 5.365 – 6.633 N                                                                       |
| Webmap tile code                                         | **present**: `scripts/web_export.py`, `web_export_nisar2.py`, `web_export_outlook.py`                      |

The boundary needs a one-off GeoPackage → GeoJSON conversion for MapLibre. No re-export
needed from the team.

The four CSVs are all usable as-is: ranked landslides (152 rows: rank, barangay, municipality,
province, area_ha, patches), `MODIS_AOI_monthly_2000_2026.csv` (321 rows: evi, lst,
lst_valid_pct, ndvi, ndvi_davocc), the outlook scenario (12 rows: rain normal/expected/p10/p90,
pct normal), and `tables/AOI_monthly_means_2025_2026.csv` (23 rows).

## 5. Four deviations worth knowing before the pipeline

1. **`MODIS_LST_Day_2024-12_1km.tif` is effectively empty** — 126 valid pixels of 22,475,
   scattered; every other LST month has ~5,400 (the AOI at 1 km). The temperature series
   therefore starts 2025-01 in practice, not Dec 2024. Its anomaly counterpart does not exist
   either (anomalies start 2026-01). Asked the team to re-export; until then the manifest
   should mark it `no data`.
2. **NISAR by-date products are per-pass swaths, not province-wide**: coverage inside the AOI
   ranges from 4.4 % (HH 2026-09-30) and 13 % (2026-06-28) to 100 % (2026-09-23, 2026-10-17 HH).
   By-month backscatter and both change products are 100 %/98 %. The time slider must show a
   layer's coverage per date, otherwise a swath reads as "nothing changed". Elevation, land
   cover, earthquake and outlook layers are 100 % inside the AOI; Landsat quarters 96 %,
   anomalies 81 %, MODIS NDVI 83 %.
3. **`terrain/` is not clipped to the boundary** — SRTM rasters are valid over 95–100 % of the
   full grid (≈ 4× the province area) while every other family is ≈ 24 %. The pipeline's
   "bound mask applied last" step is therefore load-bearing for terrain, not just cosmetic.
4. **The outlook grids are wider than the MODIS grids** at the same nominal resolution
   (1091 × 573 @ 250 m vs 618 × 578; 274 × 144 @ 1 km vs 155 × 145). Outlook covers the AOI
   fully, but outlook and MODIS are not pixel-aligned — fine for display, resample before any
   pixel-wise comparison in the charts work (P7).

Also: **no raster has overviews**, so the warp step must build its own pyramid (COG with
overviews) or tiling will re-read full 25 Mpx bands for every zoom.

## 6. Tile budget — the one thing that fails

Method: the AOI polygon is gridded at 1/8 of a z13 tile in EPSG:3857 (611 m cells,
232 × 247); a tile counts when any in-AOI cell falls in it. Per-layer counts are the AOI count
scaled by the layer's measured valid-pixel fraction _inside_ the boundary.

Tiles per full-coverage layer-date by zoom (XYZ, 256 px):

| z     | 5   | 6   | 7   | 8   | 9   | 10  | 11  | 12  | 13  |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tiles | 1   | 2   | 2   | 3   | 6   | 13  | 34  | 98  | 301 |

Σ z5–13 = **460** per layer-date; Σ z5–11 = **61**.

| Family                 | z           | Layer-dates | Tiles      | @ 6 KB     |
| ---------------------- | ----------- | ----------- | ---------- | ---------- |
| outlook                | 5–11        | 144         | 8,784      | 52.7 MB    |
| climate                | 5–11        | 103         | 5,745      | 34.5 MB    |
| earthquake             | 5–13        | 11          | 5,060      | 30.4 MB    |
| radar                  | 5–13 / 5–11 | 33          | 3,667      | 22.0 MB    |
| vegetation             | 5–13 / 5–11 | 20          | 2,423      | 14.5 MB    |
| landcover              | 5–13        | 4           | 1,840      | 11.0 MB    |
| terrain                | 5–13        | 3           | 1,380      | 8.3 MB     |
| **Total as specified** |             | **318**     | **28,899** | **173 MB** |

Tiles stay under the 30,000 cap; **bytes do not** — 173 MB against the 150 MB ceiling at the
6 KB/tile average. Tile bytes are the estimate's soft spot: PNG8 of a 256 × 256 continuous
ramp lands around 4–8 KB, while the five categorical layer-dates will be far smaller than
average. Scenarios, using the pre-agreed trimming order in spec §5.2:

| Scenario                                             | Tiles  | @4 KB  | @6 KB  | @8 KB  |
| ---------------------------------------------------- | ------ | ------ | ------ | ------ |
| S0 — as specified                                    | 28,899 | 116 MB | 173 MB | 231 MB |
| S1 — outlook → 4 months (Nov 2026, Jan/Apr/Jul 2027) | 23,042 | 92 MB  | 138 MB | 184 MB |
| S2 — S1 + drop Landsat `ValidObs` (7 layer-dates)    | 22,651 | 91 MB  | 136 MB | 181 MB |
| S3 — S2 + coarsen `climate` to z5–10                 | 19,668 | 79 MB  | 118 MB | 157 MB |

**Recommendation:** adopt **S1** now — it is the first fallback in the agreed order, keeps every
family and every informative outlook product, and clears the cap at the 6 KB average. Measure
real PNG8 bytes on the radar family in P1 before spending the rest of the headroom, and apply
S2/S3 only if measurement says so. Record whichever trim ships in the manifest's `trimmed`
list so the provenance panel can state it.

## 7. Corrections to the spec

1. **Manifest bounds:** the spec's example `[125.0, 5.2, 126.4, 6.8]` is wrong for this AOI. The
   real extent is `[124.357, 5.365, 125.715, 6.633]` — the data reaches 0.64° further west. P3's
   `fitBounds` must use the generated value, not the example.
2. **Outlook layer-dates are 144, not 48** — 12 rasters × 12 bands. §5.2's table needs this
   correction; it is the reason S1 is required.
3. **Boundary is GeoPackage**, not "GeoJSON or shapefile" (O7 closed): one conversion step,
   both CRSs supplied.
4. **Six of the §8.2 requests are answered by the inventory** before sending: index absent, tag
   absent, `.qml` absent, 4326 rasters absent, GUNW absent, webmap scripts _present_.
5. **New pipeline requirement:** build overviews during warping (no source raster has any).

## 8. Reproduce

```bash
python scripts/tiles/fetch_data.py            # 727 MB into gitignored data/, pinned
python scripts/tiles/inventory.py             # -> data/inventory.json, exits 1 on a budget fail
python scripts/tiles/inventory.py --no-stats  # tags only, ~5 s
```

`inventory.py` exits non-zero when any `fail` assertion stands. Today that is exactly one:
`budget: estimate 28899 tiles / 173 MB exceeds 30000 / 157 MB`. Every data-contract assertion
(CRS, compression, dtype, nodata, scale, band count, class codes, empty rasters, unclassified
files) passes with zero warnings.

## 9. Next (P1)

Radar family end to end — warp UTM 51N → 3857 with overviews, nearest for classes and
area-weighted mean for continuous, boundary mask, BrBG ±3 dB ramp, z5–13 PNG8 with alpha,
manifest entries, and a measured byte-per-tile figure to settle §6.
