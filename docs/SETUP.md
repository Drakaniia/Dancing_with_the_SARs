# Regenerating data, tiles and screenshots

`public/data/` (manifest, GeoJSON, tables) and `docs/screenshots/` are generated and committed.
`public/tiles/` (~480 MB of map PNGs) is generated but gitignored to keep clones small: a fresh
clone runs and lists every layer, but the map overlays stay blank until you run step 2 once.

## 1. Python tools (build machine only)

Python 3.11+:

```bash
python -m pip install rasterio numpy shapely pyproj pillow playwright
```

The screenshot script drives the installed Microsoft Edge (`channel="msedge"`), so no
`playwright install` browser download is needed.

## 2. Data, tiles and manifest

Details and failure rules live in [scripts/tiles/README.md](../scripts/tiles/README.md).

```bash
python scripts/tiles/fetch_data.py                 # ~727 MB upstream release -> data/ (gitignored), pinned in data/.pin.json
python scripts/tiles/inventory.py                  # check the release contract and tile budget -> data/inventory.json
python scripts/tiles/pipeline.py --families all    # -> public/tiles/, public/data/*.geojson, tables.json, manifest.json
python scripts/tiles/pipeline.py --check           # validate the manifest and the local tiles
```

Families: `radar, vegetation, landcover, earthquake, climate, outlook, terrain` (comma-separated).
Rebuilds are cached in `data/.cache/`; add `--full` to ignore it.

## 3. Screenshots

`docs/screenshots/*.png` come from [scripts/capture_screenshots.py](../scripts/capture_screenshots.py),
a headless Edge run at 1600 × 1000 against the Vite dev server:

```bash
pnpm dev                                    # terminal 1, serves http://127.0.0.1:5173
python scripts/capture_screenshots.py       # terminal 2; --url to point elsewhere
```

It waits for the "57 layers" status, collapses the radar and earthquake groups, then saves:

- `dashboard-light.png`: the default Sand Atlas theme.
- `dashboard-dark.png`: after switching to Night Atlas.
- `location-inspection.png`: back to light, after a map click at (430, 380).
- `data-provenance.png`: with the Data provenance dialog open.

If the layer count or button labels change, update the selectors in the script.
