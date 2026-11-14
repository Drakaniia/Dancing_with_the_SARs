---
title: Roadmap and history
description: How the project evolved from the original four-change-type spec to the real-data dashboard, and what is still open.
---

## The original plan

The first technical spec (`docs/nisar-spec.md`) described four surface change types over the
whole Philippines (about 4–21 °N, 116–127 °E):

- **Elevation change:** deformation from earthquakes, volcanism, landslides.
- **Land subsidence:** ground sinking or uplift.
- **Vegetation change:** HH/HV backscatter.
- **Water extent:** flooding and water bodies.

Planned features included time-series animation at 24 fps or more, multi-layer controls,
side-by-side comparison, location search, bookmarks, and export. Delivery was planned in six
phases: foundation, data layer, single layer, multi-layer, advanced features, polish.

## What changed

When the team's real GeoTIFF release arrived, two facts reshaped the app:

1. **There is no deformation layer.** Uplift needs GUNW interferometry spanning 8 June 2026,
   and the first NISAR scene is 28 June. Elevation change and subsidence could not be filled
   honestly.
2. **The calendars clash.** Daily NISAR passes, quarterly Landsat, monthly MODIS and a
   forecast range cannot share one tick list.

The [real-data integration spec](/reference/decisions/) replaced change types with seven
data-native families, a generated manifest, a global timeline with per-layer snapping, and real
pixel sampling.

## Build order (P0–P8)

| Phase | Scope | Status |
| --- | --- | --- |
| P0 | Inventory: fetch, contract checks, tile estimate | Done, at commit `7ea38ff` |
| P1 | Pipeline: warp → ramp → tile → manifest → report, incremental, budget gate, schema test | Done (pipeline 2.1.0) |
| P2 | App data model: manifest types and validator, stores, timeline union and snapping, families, legends | Done |
| P3 | Map: manifest-driven `TileOverlay`, boundary GeoJSON, fit to the area of interest | Done; tile-error reporting not wired |
| P4 | Inspector: Rust decoder, `sample_layers`, scale/nodata/class handling | Done |
| P5 | Provenance: status pill and provenance dialog with limits | Done |
| P6 | Catalogue: all families tiled | Done: 318 layer-dates |
| P7 | Plain data: ranked landslides, monthly chart, outlook table | Done (Quick Stats) |
| P8 | Verification: lint, test, build, `cargo check`, pipeline check, manual spot checks against QGIS | Ongoing |

## Open work

- **Comparison rendering:** draw the baseline period's tiles on the "before" side of the split
  curtain. Today only the UI state and curtain exist. See [Comparison view](/guide/comparison/).
- **Tile-error reporting:** hook MapLibre source `error` events into
  `datasetStore.recordTileError()` so the data status warning works.
- **Faster sampling:** cache decoded bands across clicks, or decode only the block that contains
  the pixel.
- **Deformation layers:** add elevation/subsidence once GUNW interferograms spanning the quake
  are available.
- **Unused groundwork:** file import, the tile cache, the GeoTIFF worker, and PNG screenshot
  export.
- **Tile distribution:** a release artifact or object storage, so fresh clones do not need to run
  the pipeline.
- **Docs deployment:** this site builds locally today; hosting is not set up yet.

## Long-term ideas

These come from the original spec's future enhancements:

- Live NASA/ISRO data feeds and periodic updates.
- A web version from the same React frontend.
- Statistical tools and trend detection.
- Alerts for significant surface change.
- A mobile field app.
- 3D terrain flyovers.
- Predictive modelling.
