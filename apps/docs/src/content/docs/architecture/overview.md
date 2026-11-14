---
title: Architecture overview
description: The tech stack, repository layout and data flow of the NISAR Surface Change Monitor.
---

## Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | [Tauri v2](https://tauri.app/) (Rust), with the dialog, fs and store plugins |
| UI | React 18 + TypeScript, built with Vite 6 |
| Map | [MapLibre GL JS](https://maplibre.org/) with an Esri World Imagery basemap |
| State | [Zustand](https://zustand.docs.pmnd.rs/) stores |
| Styling | Tailwind CSS v4 + design tokens (`apps/web/src/styles/tokens.css`) |
| Motion | `motion` (Framer Motion), respecting reduced-motion |
| Icons | `lucide-react` |
| GeoTIFF reads | Pure-Rust [`tiff`](https://crates.io/crates/tiff) crate; no GDAL |
| Tests and lint | Vitest + Testing Library + axe-core, Biome |
| Data pipeline | Python 3.11+: rasterio, numpy, shapely, pyproj, Pillow (build time only) |
| Docs | Astro + Starlight (`apps/docs`) |

## Repository layout

```text
.
├── apps/
│   ├── web/              # React frontend (pnpm package "web")
│   │   ├── public/
│   │   │   ├── data/     # manifest.json, tables.json, *.geojson   (committed)
│   │   │   ├── tiles/    # generated XYZ PNG tiles                  (gitignored)
│   │   │   ├── styles/basemap.json
│   │   │   └── images/
│   │   ├── src/
│   │   │   ├── app/      # App shell, ThemeProvider, entry point
│   │   │   ├── features/ # one folder per UI feature
│   │   │   ├── shared/   # ui primitives, types, utils
│   │   │   ├── stores/   # Zustand stores
│   │   │   ├── styles/   # tokens.css / tokens.ts
│   │   │   └── fixtures/ # chrome-only fixtures (labels, tools, defaults)
│   │   ├── tests/        # Vitest suites
│   │   └── vite.config.ts
│   ├── desktop/          # Tauri shell (pnpm package "desktop")
│   │   └── src-tauri/    # Rust shell and commands
│   └── docs/             # this documentation (Astro Starlight)
├── docs/                 # specs, inventory notes, screenshots
├── scripts/
│   ├── tiles/            # fetch, inventory, pipeline, ramps, manifest schema
│   └── capture_screenshots.py
├── biome.jsonc
├── pnpm-workspace.yaml
└── package.json          # root shortcuts that forward to the packages
```

## Data flow

```text
upstream GeoTIFF release ──► scripts/tiles (Python, build time)
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
   apps/web/public/tiles/**.png       apps/web/public/data/manifest.json + tables.json
              │                                     │
              │                      datasetStore.loadManifestAndTables()
              │                       ├─ validateManifest()
              │                       └─ layerStore.hydrateFromManifest()
              ▼                                     │
   MapLibre raster sources ◄── TileOverlay ◄────────┘
                                     ▲
   click ─► selectionStore.inspectCoordinate()
              ├─ Tauri: invoke("sample_layers") ─► Rust reads data/*.tif
              └─ browser: placeholder readings
```

1. **At startup**, `AppShell` calls `datasetStore.loadManifestAndTables()`. It fetches
   `/data/manifest.json` and `/data/tables.json`, validates the manifest, and seeds the layer
   store.
2. **`TileOverlay`** keeps one MapLibre raster source and layer per visible data layer. It
   resolves each layer's period for the current date and points the source at that entry's
   `tilePath`.
3. **On a map click**, `selectionStore` asks the Rust backend for real pixel values, or falls
   back to placeholders outside Tauri.
4. **The right rail** (legend, Current View, Location Info, Quick Stats) reads from the same
   stores.

## Design principles

- **The manifest is the contract.** The app never guesses file names or globs directories.
- **One ramp definition** drives tiles and legends.
- **Be honest in the UI.** Snapped periods, partial coverage, failing tiles and data limits are
  always visible.
- **No runtime GIS dependencies.** All heavy geoprocessing happens at build time in Python.
  The app only reads PNGs, JSON and, for sampling, GeoTIFF pixels.

More detail: [Frontend](/Dancing_with_the_SARs/architecture/frontend/) · [Tauri backend](/Dancing_with_the_SARs/architecture/backend/) ·
[Testing and quality](/Dancing_with_the_SARs/architecture/testing/).
