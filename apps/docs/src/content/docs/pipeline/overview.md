---
title: Pipeline overview
description: The build-time Python pipeline that turns the upstream GeoTIFF release into map tiles, vectors, tables and the manifest.
---

The tile pipeline in `scripts/tiles/` runs at **build time only**. Nothing in it runs when the
app builds or runs, so `cargo build`, `pnpm build` and CI never need GDAL, rasterio or Python.

```text
 GitHub release (pinned commit)
        │  fetch_data.py
        ▼
 data/  (gitignored, ~727 MB, data/.pin.json)
        │  inventory.py         contract checks + tile budget
        ▼
 data/inventory.json
        │  pipeline.py          warp → mask → ramp → tile → manifest
        ▼
 apps/web/public/tiles/<id>/<period>/{z}/{x}/{y}.png   (gitignored, ~507 MB)
 apps/web/public/data/manifest.json                     (committed)
 apps/web/public/data/tables.json                       (committed)
 apps/web/public/data/boundary.geojson, landslides.geojson (committed)
```

## Scripts

| Script | Role |
| --- | --- |
| `fetch_data.py` | Download the upstream release at a pinned commit, verifying sizes |
| `inventory.py` | Read every raster's metadata and statistics, check the release contract, and estimate the tile budget |
| `pipeline.py` | Warp, mask, colour and tile every layer-date; export vectors and tables; write and validate the manifest |
| `ramps.py` | Colour ramps and class tables shared by tiles and legends |
| `manifest_schema.py` | Dependency-free manifest validator, used by the pipeline and runnable on its own |
| `test_manifest_schema.py` | `unittest` cases for the validator |

## Requirements

Python 3.11+ on the build machine:

```bash
python -m pip install rasterio numpy shapely pyproj pillow
```

`manifest_schema.py` imports nothing outside the standard library, so the manifest can be
checked anywhere Python runs.

## End-to-end run

```bash
python scripts/tiles/fetch_data.py                 # ~727 MB -> data/, pinned in data/.pin.json
python scripts/tiles/inventory.py                  # -> data/inventory.json
python scripts/tiles/pipeline.py --families all    # -> apps/web/public/tiles/, apps/web/public/data/*
python scripts/tiles/pipeline.py --check           # validate manifest + spot-check tiles
```

Families are `radar, vegetation, landcover, earthquake, climate, outlook, terrain`. Pass any
comma-separated subset to `--families`.

## What is committed

| Path | Committed | Why |
| --- | --- | --- |
| `apps/web/public/data/manifest.json` | Yes | The app's only description of layers |
| `apps/web/public/data/tables.json` | Yes | Quick Stats tables |
| `apps/web/public/data/*.geojson` | Yes | Boundary and landslide polygons |
| `apps/web/public/tiles/` | **No** | About 507 MB; regenerate locally |
| `data/` | **No** | The 727 MB upstream release |

A fresh clone therefore runs and lists every layer, but the raster overlays stay blank until the
pipeline has run once.

Continue with [Fetch and inventory](/pipeline/fetch-inventory/).
