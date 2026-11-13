# Tile pipeline (build time only)

Turns the upstream GeoTIFF release into committed PNG tiles plus
`public/data/manifest.json`. See `docs/real-data-integration-spec.md` §5.

Nothing here runs at app build or runtime: the output is committed, so `cargo build` and
CI never need GDAL, rasterio or Python.

## Requirements

Python 3.11+ with `rasterio`, `numpy`, `shapely`, `pyproj`. Build machine only:

```bash
python -m pip install rasterio numpy shapely pyproj
```

## Data

The upstream release (~727 MB) is not vendored. It lands in the gitignored `data/` tree,
pinned to one commit:

```bash
python scripts/tiles/fetch_data.py            # resolve main, download, write data/.pin.json
python scripts/tiles/fetch_data.py --verify    # re-check sizes against the pin
```

`data/.pin.json` records the repo, the exact commit, and the file/byte counts, which is what
the manifest's `source` block cites. Bump the pin deliberately with `--commit <sha>`.

## Inventory

`inventory.py` is spec §11 P0: read every raster's metadata and statistics, check the
release against the contract the manifest depends on, and estimate the committed tile
budget before any tiling work starts.

```bash
python scripts/tiles/inventory.py            # -> data/inventory.json
python scripts/tiles/inventory.py --no-stats # tags only, no pixel reads
```

It exits non-zero if any `fail` assertion is present: missing or wrong scale factor on an
Int16 band, unexpected CRS, BigTIFF, JPEG compression, multi-band rasters that are not the
12-band outlook stack, nodata that does not match the README, class codes outside the README
vocabulary, unclassified files, or a tile estimate over the 30,000 tile / 150 MB budget.
`warn` assertions are recorded but do not fail the run.
