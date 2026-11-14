---
title: Manifest format
description: The schema of apps/web/public/data/manifest.json, the single contract between the tile pipeline and the app.
---

`apps/web/public/data/manifest.json` is the **only contract** between the pipeline and the app. The
pipeline generates it, and the app reads nothing else to learn about layers. There is no fixture
layer list, no guessed file names, and no globbing.

It is checked on both sides of the boundary:

- **Python:** `scripts/tiles/manifest_schema.py`. The pipeline refuses to write a manifest that
  fails it.
- **TypeScript:** `validateManifest()` in `apps/web/src/shared/types/manifest.ts`. The app rejects an
  invalid manifest at startup and shows the error state.

## Top level

```jsonc
{
  "schemaVersion": 1,
  "generator": {
    "name": "nisar-tile-pipeline",
    "version": "2.1.0",
    "generatedAt": "2026-11-13T06:52:37Z",
  },
  "source": {
    "repo": "https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar",
    "commit": "1505baefd6f0443f80379a8979c995dc2c90bed5",
    "crs": "EPSG:32651",
    "resolutionMeters": 30,
    "attribution": "NISAR L2 GCOV (NASA-ISRO, provisional) · Landsat HLS L30 v2.0 · MODIS MOD13Q1/MOD11A2 · GPM IMERG V07 · SRTMGL1 · NOAA CPC",
  },
  "bounds": [124.357, 5.3655, 125.7153, 6.633], // [west, south, east, north], EPSG:4326
  "dates": ["2020", "2024-12", "…", "static"], // sorted union of every layer's periods
  "trimmed": [], // budget trims applied, if any
  "totals": { "tiles": 28530, "bytes": 506533670, "byFamily": { "…": {} } },
  "layers": [
    /* one entry per layer-date */
  ],
}
```

| Field           | Rule                                                    |
| --------------- | ------------------------------------------------------- |
| `schemaVersion` | Must be `1`                                             |
| `generator`     | `name`, `version`, `generatedAt` are non-empty strings  |
| `source.repo`   | An `https://` URL                                       |
| `source.commit` | A 7–40 character hex SHA                                |
| `source.crs`    | Must be `EPSG:32651`                                    |
| `bounds`        | `west < east`, `south < north`, inside EPSG:4326        |
| `dates`         | **Exactly** the sorted union of every layer's `periods` |
| `totals`        | Optional; integer `tiles` and `bytes`                   |
| `trimmed`       | Optional list of strings                                |

## Layer entries

There is **one entry per layer-date**: 318 entries for 57 unique ids. Entries that share an
`id` must agree on `periods[]`.

```jsonc
{
  "id": "radar-change-hh-monthly",
  "family": "radar",
  "name": "HH Backscatter Change (monthly)",
  "units": "dB",
  "valueType": "continuous", // continuous | categorical | count
  "sourceFile": "nisar/change_by_month/NISAR_HH_Change_month_2026-09_to_2026-10_30m.tif",
  "band": 1,
  "scaleFactor": 0.01,
  "nodata": -32768,
  "period": "2026-10 (vs 2026-09)", // this entry's period
  "periods": ["2026-10 (vs 2026-09)"], // all periods of this layer, sorted
  "tilePath": "tiles/radar-change-hh-monthly/2026-10-vs-2026-09/{z}/{x}/{y}.png",
  "minZoom": 5,
  "maxZoom": 13,
  "ramp": {
    "kind": "diverging",
    "stops": [
      [-3, "#8c510a"],
      [-1.5, "#d8b365"],
      [0, "#f5f5f5"],
      [1.5, "#5ab4ac"],
      [3, "#01665e"],
    ],
  },
  "domain": [-3, 3],
  "coverage": 1, // optional: fraction of the AOI with data
  "caveats": [
    "Backscatter change, not ground deformation: no public NISAR data exists before 19 June 2026, so NISAR cannot measure the quake's uplift",
    "Does not capture the 8 June 2026 quake directly: first NISAR scene is 28 June 2026",
  ],
}
```

### Validation rules

- **`id`**: lowercase ASCII with dashes (`^[a-z0-9][a-z0-9-]*$`). `(id, period)` pairs are unique.
- **`tilePath`**: `tiles/<id>/<segment>/{z}/{x}/{y}.png`. The second segment must equal `id`.
  It must be URL-safe: no spaces, no `%`, no parentheses.
- **`period`**: must be one of `periods`. `periods` must be sorted by the period sort key.
- **`band`**: a positive integer. `scaleFactor` is positive. `nodata` is a number or `null`.
- **Zoom**: `0 ≤ minZoom ≤ maxZoom ≤ 22`.
- **`domain`**: `[lo, hi]` with `lo < hi`.
- **`ramp`**: `kind` is `sequential` or `diverging`, with at least two `[value, "#rrggbb"]`
  stops in ascending order.
- **Categorical layers**: need `classes[]` of `{ code, label, color }`, with codes 0–254 and no
  duplicates.

## Periods and tile segments

Periods are free-form labels: `2026-10`, `2025-Q3`, `2026-06-28`, `2026-10 (vs 2026-09)`,
`pre-quake 2026`, `static`. They are **sorted by their primary date** (the part before
`(vs`), then by the full label. Python and TypeScript use the same key
(`period_sort_key` / `periodSortKey`).

The tile directory for a period is a URL-safe slug made by `tile_segment()`:

| Period                 | Tile segment         |
| ---------------------- | -------------------- |
| `2026-10`              | `2026-10`            |
| `2026-10 (vs 2026-09)` | `2026-10-vs-2026-09` |
| `2026 vs 2020`         | `2026-vs-2020`       |
| `pre-quake 2026`       | `pre-quake-2026`     |

This replaced the old `tiles/{changeType}/{date}/…` template, whose `Jun 2024` dates turned
into `Jun%202024` and fell through to the SPA's HTML fallback.

## Value handling

- **`scaleFactor` is applied once.** The inspector multiplies the raw value by it. Tiles are
  coloured after the multiplication, so tile colours and inspector values agree.
- **`nodata` becomes alpha 0** in tiles and "nodata" in the inspector. It is never a colour.
- **Continuous domains** are fixed per product where a fixed range is scientifically meaningful:
  dB change ±3, EVI 0–0.85, temperature anomaly ±3 °C, elevation 0–2,200 m, and so on.
  Absolute backscatter has no fixed domain; it uses the 2nd–98th percentile of valid pixels.
  See [Colour ramps](/Dancing_with_the_SARs/pipeline/ramps/).

## Companion files

| File                                      | Contents                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/public/data/tables.json`        | Ranked landslides, monthly means for the area of interest, outlook scenario, MODIS series, epicentre (typed as `TablesPayload`) |
| `apps/web/public/data/boundary.geojson`   | Area-of-interest outline (EPSG:4326)                                                                                            |
| `apps/web/public/data/landslides.geojson` | 305 landslide candidate polygons                                                                                                |
