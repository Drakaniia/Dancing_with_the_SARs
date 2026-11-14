---
title: Tiles and manifest
description: How pipeline.py warps, masks, colours and tiles each layer-date, caches work, and validates its output.
---

```bash
python scripts/tiles/pipeline.py --families all          # everything
python scripts/tiles/pipeline.py --families radar,terrain
python scripts/tiles/pipeline.py --families radar --full # ignore the cache
python scripts/tiles/pipeline.py --check                 # validate only
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--families` | `all` | Comma-separated families, or `all` |
| `--full` | off | Ignore the incremental cache and rebuild |
| `--check` | off | Validate the existing manifest and spot-check tiles, then exit |
| `--data` | `data` | Where the release and `inventory.json` live |

The pipeline requires `data/inventory.json` with a pinned source commit. Run
[`fetch_data.py` and `inventory.py`](/pipeline/fetch-inventory/) first.

## Per layer-date

For each layer-date (one band of one source raster):

1. **Read and scale.** Read the band, mark nodata (or NaN) as invalid, then apply the band's
   scale and offset. Values are in real units from here on.
2. **Warp.** Reproject from EPSG:32651 to Web Mercator (EPSG:3857) in memory.
   - **Categorical layers** use **nearest neighbour**, so class codes stay intact.
   - **Continuous layers** use an **area-weighted average** that ignores nodata.
3. **Mask.** Blank every pixel outside the area-of-interest boundary. The mask is computed once
   per grid and cached. This is the step that clips the unclipped SRTM terrain.
4. **Coverage and domain.** Record the fraction of the area with valid data, and the
   colour domain: fixed per product, or the 2nd–98th percentile for absolute backscatter.
5. **Colour.** Map values through the layer's ramp, or its class table, to a **PNG8 palette**:
   64 ramp levels, with index 255 transparent. nodata and transparent classes become alpha 0.
6. **Tile.** Cut 256 × 256 XYZ tiles from `minZoom` to `maxZoom`, and **skip fully transparent
   tiles**. Output goes to `apps/web/public/tiles/<id>/<segment>/{z}/{x}/{y}.png`.

### Zoom ranges

| Layers | Zoom |
| --- | --- |
| Headline: monthly radar and vegetation, land cover, earthquake, terrain | z5–13 |
| Dense series: radar and vegetation by date, same-track pairs, climate, outlook | z5–11 |

## After tiling

- **Vectors and tables.** The boundary and landslide polygons are written as GeoJSON
  (coordinates rounded to five decimals). The CSV tables are folded into `tables.json`.
- **Manifest.** One entry per layer-date, plus the `dates` union, `bounds`, `source` (from the
  pin), and `totals` by family. See [Manifest format](/data/manifest/).
- **Schema check.** The new manifest is validated by `manifest_schema.py`. If it fails, it is
  **not written**.
- **Report.** A table per product: layer-dates, tiles, bytes, average bytes per tile, and zoom
  range. It closes with the total against the budget.
- **Budget gate.** The run fails above **35,000 tiles** or **600 MiB**.
- **Spot check.** For each layer-date, one tile is decoded and checked to be 256 × 256.

The current output is 318 layer-dates and 28,530 tiles (about 506.5 MB), within budget.

## Incremental rebuilds

Every layer-date has a **signature**, a hash of everything that changes its bytes:

- The source path, size and mtime.
- The pipeline version (`2.1.0`).
- The band, ramp, classes, fixed domain, zoom range and scale factor.

State lives in `data/.cache/state.json`. On the next run, each layer-date is handled as follows:

| Situation | Action |
| --- | --- |
| Same signature, all tiles on disk | **Reuse**, pruning any stray tiles |
| No state, but tiles already on disk | **Adopt** them, taking coverage and domain from the inventory |
| Anything else, or `--full` | Warp and tile again |

Tiles and state for layers that a run no longer produces (within the families it was asked to
build) are deleted.

## `--check`

```bash
python scripts/tiles/pipeline.py --check
# apps/web/public/data/manifest.json: valid (318 layers, 81 dates, 28,530 tiles / 506.5 MB)
```

This runs the schema validator plus the tile spot check against the existing manifest, without
touching any data. Use it after copying tiles from another machine.
