---
title: Installation
description: Install the toolchain, run the desktop app, and load the map tiles.
---

The repository is a **pnpm workspace**. The React frontend lives in `apps/web`, the Tauri shell
that wraps it in `apps/desktop`, and this documentation site in `apps/docs`.

## Prerequisites

| Tool                                                                                                               | Needed for                      | Notes                                              |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------- |
| [Node.js](https://nodejs.org/)                                                                                     | Frontend, docs                  | A current LTS release                              |
| [pnpm](https://pnpm.io/)                                                                                           | Package manager                 | Workspace defined in `pnpm-workspace.yaml`         |
| [Rust](https://www.rust-lang.org/tools/install) + [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/) | Desktop build                   | On Windows: Microsoft C++ Build Tools and WebView2 |
| Python 3.11+                                                                                                       | Tile pipeline, screenshots only | Build machine only; never needed at runtime        |

## Clone and install

```bash
git clone https://github.com/Drakaniia/Dancing_with_the_SARs.git
cd Dancing_with_the_SARs
pnpm install
```

`pnpm install` installs every workspace package (`apps/web`, `apps/desktop`, `apps/docs`). Install scripts are
allowed only for the packages listed under `allowBuilds` in `pnpm-workspace.yaml`.

## Run the desktop app

```bash
pnpm run tauri dev
```

This starts the Vite dev server and opens the Tauri window. Pixel sampling in the
[inspector](/Dancing_with_the_SARs/guide/inspecting/) and persisted bookmarks need this desktop shell.

To run only the web frontend in a browser:

```bash
pnpm dev            # http://localhost:5173
```

The web build lists every layer and draws the map, but Tauri-only features (pixel sampling,
the persisted store) are unavailable there.

## Load the map tiles

`apps/web/public/data/` (manifest, GeoJSON, tables) is committed, so a fresh clone starts and lists every
layer. The **raster tiles are not committed**: `apps/web/public/tiles/` is ~507 MB and gitignored. Until
you generate them, the overlays stay blank.

Generate them once on a build machine (details in [Tile pipeline](/Dancing_with_the_SARs/pipeline/overview/)):

```bash
python -m pip install rasterio numpy shapely pyproj pillow
python scripts/tiles/fetch_data.py               # ~727 MB upstream release -> data/
python scripts/tiles/inventory.py                # check the release contract
python scripts/tiles/pipeline.py --families all  # -> apps/web/public/tiles/, apps/web/public/data/
python scripts/tiles/pipeline.py --check         # validate the manifest and tiles
```

:::note
The pixel inspector reads the original GeoTIFFs from `data/`. If you only copy tiles in from
another machine, the map renders but the inspector returns no values until `fetch_data.py` has
populated `data/`.
:::

## Host the tiles on Cloudflare R2

The installers stream tiles from a remote host instead of bundling them. Cloudflare R2's free tier
(10 GB storage, no egress fees) holds the whole pyramid. The app reads
`<VITE_TILE_BASE_URL>/tiles/<id>/<segment>/{z}/{x}/{y}.png`. Without the variable it falls back to
`apps/web/public/tiles/`.

`scripts/r2/tiles.mjs` automates the whole setup with the repo's `wrangler` CLI. Enable R2 once in
the Cloudflare dashboard (the free tier needs a payment method on file), then:

```bash
pnpm exec wrangler login          # once; allow R2 access
pnpm r2:tiles --github            # setup + upload; --github also sets the release variable
pnpm r2:tiles --dry-run           # print the plan without changing anything
```

`pnpm r2:tiles` runs these steps:

1. **Bucket.** Creates `nisar-tiles` (override with `--bucket` or `R2_BUCKET`) unless it exists.
   Add `--location apac` (or another hint) to choose where it is stored.
2. **CORS.** Allows `GET`/`HEAD` from any origin. MapLibre fetches tiles with CORS, and the desktop
   app runs on `http://tauri.localhost` (Windows) or `tauri://localhost` (macOS, Linux).
3. **Public URL.** Enables the bucket's `r2.dev` URL and writes it to `apps/web/.env.local` as
   `VITE_TILE_BASE_URL`. With `--github` it also runs `gh variable set TILE_BASE_URL`, which
   `release.yml` bakes into the installers. The `r2.dev` URL is rate-limited, so connect a custom
   domain for heavy traffic.
4. **Index.** Writes `apps/web/public/tiles/index.json`: every tile key and size, plus a version
   hash. The desktop app's offline download reads it.
5. **Upload.** Runs `wrangler r2 object put` for each tile, 8 in parallel (`--concurrency`), with
   retries. Progress is saved to `data/.r2-upload-<bucket>.json`, so a re-run only uploads new or
   changed tiles (`--force` re-uploads all). `index.json` is published last.

6. **Data files.** Publishes `manifest.json`, `tables.json`, `boundary.geojson` and
   `landslides.geojson` from `apps/web/public/data/` to `<bucket>/data/`, manifest last. The app
   fetches `<VITE_TILE_BASE_URL>/data/<file>` first (revalidated, 60 s cache) and falls back to the
   copy bundled in the installer when the host is unset, offline or errors. To change the data
   without a release, rebuild with the pipeline and run `pnpm r2:data`; it takes seconds. Keep
   the manifest's `tilePath` values compatible with the tiles already in the bucket.

Wrangler has no bulk upload, so the first upload starts one process per tile and takes a while.
It costs about 28,500 write operations, well inside the free 1 million per month. Run
`pnpm r2:upload` after each pipeline rebuild, or `pnpm r2:setup` to redo only the bucket
settings.

:::note
The pipeline skips fully transparent tiles, so the bucket returns 404 for them. The desktop app
answers those with a transparent tile. The browser build logs the misses in the console.
:::

## Offline map tiles (desktop)

With `VITE_TILE_BASE_URL` set, the desktop app loads overlays cache-first: each tile is read from
`<app cache dir>/tiles/` and fetched from R2 only on a miss. Every fetched tile is kept, so areas
you have viewed keep working offline.

**Settings → Offline Map Tiles → Download for offline** fetches the whole pyramid (about 500 MB)
from `tiles/index.json`. It downloads 6 tiles at a time and skips tiles already cached at the
right size, so **Resume download** and **Check for updates** only fetch what is missing or
changed. **Remove offline tiles** clears the cache. The basemap and the pixel inspector's
GeoTIFFs are not part of the download.

## Build a release

```bash
pnpm run tauri build
```

This runs `tsc && vite build` in `apps/web` and then bundles the Rust shell. Installers are
written under `apps/desktop/src-tauri/target/release/bundle/`.

Pushing a `v*` tag (for example `v0.2.0`) runs `.github/workflows/release.yml`, which builds
Windows, macOS and Linux installers and attaches them to a draft GitHub Release. Bump `version`
in `apps/desktop/src-tauri/tauri.conf.json` first; installer file names use that version.

## Run this documentation

```bash
pnpm docs:dev       # http://localhost:4321/Dancing_with_the_SARs/
pnpm docs:build     # static site in apps/docs/dist/
pnpm docs:preview   # serve the built site
```
