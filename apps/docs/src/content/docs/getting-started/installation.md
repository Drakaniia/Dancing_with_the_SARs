---
title: Installation
description: Install the toolchain, run the desktop app, and load the map tiles.
---

The repository is a **pnpm workspace**. The desktop app lives at the root, and this
documentation site lives in `apps/docs`.

## Prerequisites

| Tool | Needed for | Notes |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | Frontend, docs | A current LTS release |
| [pnpm](https://pnpm.io/) | Package manager | Workspace defined in `pnpm-workspace.yaml` |
| [Rust](https://www.rust-lang.org/tools/install) + [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/) | Desktop build | On Windows: Microsoft C++ Build Tools and WebView2 |
| Python 3.11+ | Tile pipeline, screenshots only | Build machine only; never needed at runtime |

## Clone and install

```bash
git clone https://github.com/Drakaniia/Dancing_with_the_SARs.git
cd Dancing_with_the_SARs
pnpm install
```

`pnpm install` installs both workspace projects (the app and `apps/docs`). Install scripts are
allowed only for the packages listed under `allowBuilds` in `pnpm-workspace.yaml`.

## Run the desktop app

```bash
pnpm run tauri dev
```

This starts the Vite dev server and opens the Tauri window. Pixel sampling in the
[inspector](/guide/inspecting/) and persisted bookmarks need this desktop shell.

To run only the web frontend in a browser:

```bash
pnpm dev            # http://localhost:5173
```

The web build lists every layer and draws the map, but Tauri-only features (pixel sampling,
the persisted store) are unavailable there.

## Load the map tiles

`public/data/` (manifest, GeoJSON, tables) is committed, so a fresh clone starts and lists every
layer. The **raster tiles are not committed**: `public/tiles/` is ~507 MB and gitignored. Until
you generate them, the overlays stay blank.

Generate them once on a build machine (details in [Tile pipeline](/pipeline/overview/)):

```bash
python -m pip install rasterio numpy shapely pyproj pillow
python scripts/tiles/fetch_data.py               # ~727 MB upstream release -> data/
python scripts/tiles/inventory.py                # check the release contract
python scripts/tiles/pipeline.py --families all  # -> public/tiles/, public/data/
python scripts/tiles/pipeline.py --check         # validate the manifest and tiles
```

:::note
The pixel inspector reads the original GeoTIFFs from `data/`. If you only copy tiles in from
another machine, the map renders but the inspector returns no values until `fetch_data.py` has
populated `data/`.
:::

## Build a release

```bash
pnpm run tauri build
```

This runs `tsc && vite build` and then bundles the Rust shell. Installers are written under
`src-tauri/target/release/bundle/`.

## Run this documentation

```bash
pnpm docs:dev       # http://localhost:4321
pnpm docs:build     # static site in apps/docs/dist/
pnpm docs:preview   # serve the built site
```
