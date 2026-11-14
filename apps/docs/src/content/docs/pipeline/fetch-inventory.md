---
title: Fetch and inventory
description: Download the pinned upstream release and check it against the raster contract before any tiling.
---

## Fetch the release

```bash
python scripts/tiles/fetch_data.py                 # resolve main, download, write data/.pin.json
python scripts/tiles/fetch_data.py --commit <sha>  # fetch a specific commit (bump the pin)
python scripts/tiles/fetch_data.py --verify        # re-check local sizes against the pin
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--repo` | the upstream release repo | Source repository |
| `--commit` | `main` | Commit SHA or ref to pin |
| `--dest` | `data` | Destination folder (gitignored) |
| `--jobs` | `16` | Parallel downloads |
| `--verify` | off | Check file sizes against `data/.pin.json` without downloading |

### Why not `git clone`?

A plain clone of the release repository stalled on a slow link: it negotiated for about nine
minutes and delivered only about 24 MB of 727 MB. `fetch_data.py` downloads the same blobs from
the pinned commit in parallel, with retries, and verifies every file against the size the Git
tree reports.

### The pin

`data/.pin.json` records the repository, the exact commit, and the file and byte counts. The
manifest's `source` block cites it, so every tile and value is traceable to one commit. Today
the pin is `7ea38ff1b5c0dd4571b1935d01c5bd71ebf72862` (212 files, 727,237,938 bytes).

## Inventory

`inventory.py` reads every raster's metadata and statistics, checks the release against the
contract the manifest depends on, and estimates the tile budget **before** any tiling starts.

```bash
python scripts/tiles/inventory.py            # full run -> data/inventory.json
python scripts/tiles/inventory.py --no-stats # tags only, no pixel reads (~5 s)
```

### Assertions

The run exits non-zero if any **fail** assertion stands:

- A missing or wrong scale factor on an Int16 band.
- An unexpected CRS (anything other than EPSG:32651).
- BigTIFF, or JPEG compression.
- Multi-band rasters other than the 12-band outlook stack.
- nodata that does not match the README (−32768 / 255 / NaN).
- Class codes outside the README vocabulary.
- Unclassified files.
- A tile estimate over budget.

**Warn** assertions are recorded but do not fail the run.

### What it measures

- Per raster: CRS, transform, band count, dtype, scale, nodata, compression, tiling, and
  overviews.
- Per band: valid-pixel statistics and coverage **inside** the area-of-interest boundary.
- Band descriptions: the outlook months are parsed from them (`2026-11 anomaly per +1 C ONI` …).
- Vectors: the boundary GeoPackage (feature count, parts, validity, area, extent).
- Tile budget: the area of interest is gridded at one eighth of a z13 tile in EPSG:3857, and
  tiles per zoom are counted.

### Tiles per full-coverage layer-date

| z | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tiles | 1 | 2 | 2 | 3 | 6 | 13 | 34 | 98 | 301 |

That is 460 tiles per layer-date at z5–13, and 61 at z5–11. This is why dense time series stop
at z11.

### Findings from the first inventory (P0)

- The full contract holds: 186 rasters, all EPSG:32651, DEFLATE, tiled, with documented
  scales and nodata.
- There are **318 layer-dates**, not the 200–260 first estimated, because each of the 12
  outlook rasters unfolds into 12 months.
- No raster has overviews, so the pipeline must build its own pyramid.
- `terrain/` is not clipped to the boundary, so the pipeline's boundary mask is load-bearing for
  terrain.
- The real area-of-interest bounds are `[124.357, 5.365, 125.715, 6.633]`. The original
  spec's example bounds were 0.64° too far east.
