---
title: Frontend
description: Feature folders, Zustand stores, the map overlay, shared UI primitives and design tokens.
---

The frontend is the `web` workspace package in `apps/web`. Its code lives in `apps/web/src/`,
and the `@` alias points at that folder (`apps/web/vite.config.ts`). Paths below are relative
to `apps/web`.

## App shell

`src/app/App.tsx` renders `ThemeProvider` → `AppShell`. The shell:

- Mounts `useRailMode()` to track the `wide` / `default` / `compact` breakpoints.
- Starts `loadManifestAndTables()`.
- Lays out `TopBar`, `LeftRail`, `MapCanvas` and `RightRail` in a CSS grid. In narrower modes,
  rails move into `RailSheet` overlays.
- Mounts `ProvenanceModal`.

## Feature folders

| Folder | Responsibility |
| --- | --- |
| `features/topbar` | `TopBar`, `GlobalSearch`, `DataStatus` pill, `TopBarActions` (theme, provenance, bookmarks, export, settings) |
| `features/shell` | `LeftRail`, `RightRail`, `RailSheet`, `useRailMode` |
| `features/map` | `MapCanvas`, `useMapLibre`, `MapControls`, `ScaleBar`, `NorthIndicator`, `overlays/TileOverlay` |
| `features/change-types` | The family-grouped layer list (`ChangeTypeList`, `ChangeTypeRow`) |
| `features/layers` | `MapLayersPanel`, `LayerRow`, `OpacityControl`, `LayerOrderControl` |
| `features/timeline` | `TimeSeriesPanel`, `AnimationBar`, `PlaybackButton`, `usePlayback` |
| `features/comparison` | `ComparisonPanel` |
| `features/inspector` | `CurrentViewCard`, `LegendPanel`, `LocationInfoPanel`, `QuickStatsPanel` |
| `features/tools` | `ToolsPanel`, `ToolButton` |
| `features/bookmarks` | `BookmarkPanel` |
| `features/provenance` | `ProvenanceModal` |
| `features/search` | The `locations.ts` gazetteer and `findNearestPlace()` |
| `features/data` | `FileImport`, `tileCache`, `geoTiffWorker` (stubs; see below) |

## Stores

| Store | State |
| --- | --- |
| `datasetStore` | `manifest`, `tables`, load status and error, `currentDate`, range, comparison settings, and the tile-error count with the failing layers. Exposes `useTimelineDates()` and `resolveManifestEntry()`. |
| `layerStore` | The layer list (manifest layers plus basemap, boundary, landslide polygons and labels), visibility, opacity, order, and `activeLayerId`. `hydrateFromManifest()` builds it from the manifest. |
| `selectionStore` | The selected point and its samples. `inspectCoordinate()` calls Tauri `sample_layers`, or falls back to placeholders. |
| `uiStore` | Rail mode, open rails and panels, active tool, measure points, fly-to requests, provenance dialog. Panel state persists through the Tauri store. |
| `bookmarkStore` | Saved viewpoints, persisted through `@tauri-apps/plugin-store` in the desktop app. |
| `usePlaybackStore` | Playback state and speed, driven by a `requestAnimationFrame` loop. Lives in `features/timeline`. |

The Tauri plugins are imported dynamically and only used inside Tauri, so the same bundle runs
in a plain browser.

## Map and overlays

- **`useMapLibre`** creates the map from `public/styles/basemap.json` and fits the manifest
  `bounds` on load. It routes clicks to the measure tool and the inspector, and handles
  fly-to requests.
- **`TileOverlay`** reconciles MapLibre with the layer store:
  - One raster source and layer per visible manifest layer, inserted below the boundary and
    label layers.
  - Each source's URL comes from the manifest entry that `resolveManifestEntry()` picks for the
    current date.
  - Opacity and visibility are applied in place, without re-requesting tiles.
  - `datasetStore` has a tile-error channel (`recordTileError()`, `tileErrorCount`,
    `failingLayers`) that the data status pill and provenance dialog already display. **Nothing
    calls it yet**: `TileOverlay` does not subscribe to MapLibre source `error` events, so the
    warning state never appears today.

:::note[Dev server tile fallback]
In `pnpm dev`, a small Vite plugin (`transparentTileFallback`) answers missing `/tiles/*.png`
requests with a 1×1 transparent PNG instead of the SPA's HTML fallback. Missing tiles then show
as empty instead of throwing decode errors.
:::

## Shared code

- **`shared/ui`:** primitives built on the design tokens: `Badge`, `Button`, `Checkbox`,
  `IconButton`, `Panel`, `Popover`, `Progress`, `SegmentedControl`, `Slider`, `StatusPill`,
  `Switch`, `Tooltip`.
- **`shared/types`:** `dataset.ts` (`LayerFamily`, `LAYER_FAMILIES`), `layer.ts`,
  `manifest.ts` (types and `validateManifest`), `selection.ts`.
- **`shared/utils`:**
  - `dates.ts`: `resolvePeriod`, `periodSortKey`, `isForecastPeriod`.
  - `colorScales.ts`: gradients from ramps and classes, for swatches and legends.
  - `geo.ts`: bounds and helpers.

## Design tokens

`src/styles/tokens.css` defines both themes as CSS custom properties: colours, radii, shadows,
z-indices, spring timings and more. Sand Atlas uses a sand scale with a terracotta accent
(`#a9471c`); Night Atlas uses `#11151a` with `#e06d42`. `tokens.ts` mirrors the motion values
for JavaScript. Components reference tokens such as `var(--color-panel)`, never raw colours.

## Unused surfaces

Some groundwork is present but not wired into the main flow:

- `FileImport` (renders nothing yet).
- The `tileCache.ts` helpers and the Rust `read_tile_cache` / `write_tile_cache` commands.
- The `geoTiffWorker` stub.
- The `export_screenshot` command (the UI exports JSON today).
- `datasetStore.recordTileError()` (see [Map and overlays](#map-and-overlays)).
