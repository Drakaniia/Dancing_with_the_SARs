---
title: Design decisions
description: The decision log from the real-data integration spec, with what was chosen, what was rejected, and where the implementation ended up.
---

These decisions were taken when the team's GeoTIFF release replaced the original fixture data.
The source is `docs/real-data-integration-spec.md`. The **Outcome** column records where the
implementation actually landed.

| # | Decision | Chosen | Rejected alternatives | Outcome |
| --- | --- | --- | --- | --- |
| D1 | Layer taxonomy | Replace the four change types with data-native families | Keep labels and remap; redefine; defer | 7 families (`radar` … `terrain`) |
| D2 | Tile delivery | Pre-generated PNG tiles under `public/tiles/` | Runtime Rust generation; artifact download; reuse the team's webmap tiles | Pre-generated, but **gitignored** (~507 MB) instead of committed |
| D3 | Data vendoring | Clone into a gitignored `data/` | Commit GeoTIFFs; release ZIP | `fetch_data.py` with a pinned commit |
| D4 | Layer scope | Everything in the release | Subsets | All 318 layer-dates |
| D5 | Schedule | No hard deadline; build it properly | Deadline-first demo | — |
| D6 | Pyramid | z5–z13, PNG8 with alpha, hard cap | WebP; z5–z15; z5–z11 | z5–13 headline, z5–11 dense series; 64-colour palettes |
| D7 | Time model | Global date plus per-layer period sets | Per-layer timelines; unified calendar; pairs only | `manifest.dates` with `resolvePeriod()` snapping |
| D8 | Inspector | Real pixel values under the cursor | Metadata only; CSV values | `sample_layers` in desktop |
| D9 | Caveats | The release's own limits, per layer, in the UI | One About panel; none | Provenance dialog plus per-layer `caveats[]` |
| D10 | Colour | Our ramps, generated into tiles **and** legends | The team's QGIS `.qml`; hand-tuned | `ramps.py` → palette + manifest |
| D11 | Sampling path | Rust reads the GeoTIFF on click | Precomputed grids; value tiles; colour lookup | As chosen |
| D12 | Ask the team | All six requests (see below) | Partial | Five were answered by the inventory itself |
| D13 | Workspace restructure | Separate from the data work | Fold in | The pnpm workspace arrived later with `apps/docs` |
| D14 | Plain tables | Ranked lists and charts in scope now | Defer | Quick Stats tabs from `tables.json` |
| D15 | Regeneration | Generated manifest plus incremental regeneration | Full regen; append-only | Signature-based cache in `data/.cache/state.json` |
| D16 | GeoTIFF reader | Pure-Rust `tiff` with the geotransform from tags | GDAL bindings | As chosen, with a hand-written UTM 51N projection |
| D17 | Web build | Dropped for this step; Tauri desktop only | Graceful degradation; parity | The web build runs, with placeholder inspection |
| D18 | Data state | Full provenance panel | Simple pill; coverage only | `ProvenanceModal` |
| D19 | Left rail | Grouped accordion by family | Flat list | As chosen |
| D20 | Verification | Manifest schema test, tile spot checks, app unit tests | Manual checks; golden images | `manifest_schema.py` (both sides), `--check`, Vitest |

## Requests sent to the team (D12)

1. EPSG:4326 or pre-warped EPSG:3857 copies of the headline rasters.
2. A tagged release or pinned commit.
3. QGIS `.qml` styles.
4. A machine-readable index of files.
5. **GUNW/InSAR deformation spanning 8 June 2026**, the only way to bring real
   elevation/subsidence layers back.
6. The webmap's tile-generation code.

The inventory showed that the release has no index, no tag, no `.qml`, no 4326 rasters and no
GUNW, but does include webmap export scripts.

## Budget: plan versus reality

The spec planned to **commit** tiles under a cap of 30,000 tiles and 150 MB, trimming the
outlook to four months if needed. The real catalogue (all 12 outlook months, 28,530 tiles,
about 507 MB) was kept whole. Instead, the tiles were **gitignored** and the pipeline's gate was
raised to 35,000 tiles / 600 MiB. The manifest's `trimmed` list is empty.
