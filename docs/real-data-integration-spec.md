# Real-Data Integration Spec — Sarangani / Davao Occidental NISAR release

**Status:** draft for review · **Created:** 2026-11-02 · **Owner:** The Cartographers
**Supersedes:** the four-change-type data model described in `docs/nisar-spec.md`
**Closes:** `docs/todo-nisar-overlay-tiles.md` (no tiles answered the overlay requests)
**Answers:** "we got the response — what is the next step?"

---

## 1. Why this is the next step

`docs/response.md` is a **data handoff**, not a feature request. The teammate shipped a finished
GeoTIFF release and asked one thing back: _"let me know if anything's missing or if you need a
different format for the app."_ Meanwhile the app is already known-broken in exactly the place
that data was supposed to fill:

- `src/shared/utils/geo.ts → tileTemplate()` builds `tiles/{changeType}/{date}/{z}/{x}/{y}.png`.
- Nothing serves those paths. `public/` has a styles folder and images, no `tiles/`. Vite's SPA
  fallback answers `200 text/html`, MapLibre cannot decode it, and the overlay paints nothing —
  documented in `docs/todo-nisar-overlay-tiles.md`.
- Every value the dashboard shows is a fixture: `CHANGE_TYPES`, `SAMPLE_LAYERS`, `TIME_SERIES`,
  `LOCATION_INFO` in `src/fixtures/sample-dashboard.ts`, plus `DATA_STATUS.label = "NISAR Data
Loaded"` which is displayed unconditionally and cannot be false.

So the next step is a single, connected piece of work: **a reproducible tile pipeline that turns
the handoff GeoTIFFs into committed raster tiles, a manifest that replaces the fixture layer
model, and the app changes needed to read that manifest** — including a working inspector that
samples the real files instead of printing `3.2 cm/year`.

### 1.1 What the handoff actually contains (verified against their README)

| Property | Value                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| CRS      | EPSG:32651 (WGS 84 / UTM 51N) for every raster and the boundary; boundary also in EPSG:4326                          |
| Grid     | 30 m, 5147 × 4810 px, origin 648150 E / 735870 N (north-up)                                                          |
| Coverage | Sarangani + Davao Occidental only; pixels outside the dissolved boundary are nodata                                  |
| Storage  | Compressed GeoTIFF; most layers Int16 with a **scale factor in metadata**                                            |
| Nodata   | −32768 (Int16), 255 (Byte), NaN (Float32)                                                                            |
| Scales   | radar dB `0.01` · EVI/NDVI/NDMI/NDWI/NBR `0.0001` · temp/slope/aspect `0.01` · elevation `0.1` · classes none (Byte) |
| Repo     | `github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar` (old `nisar-mindanao` is a draft, do not use) |

Families present: `nisar/`, `nisar_ml/`, `earthquake/`, `landsat_hls/`, `modis/`, `outlook/`,
`terrain/`, `boundary/`, `tables/`, `scripts/`.

Two facts drive most of the design:

1. **There is no subsidence/elevation-deformation layer.** Their README says uplift needs NISAR
   GUNW interferometry spanning 8 June, which they did not produce; the first scene is 28 June,
   _after_ the quake. The app's `ChangeType` union (`elevation | subsidence | vegetation | water`)
   cannot be honestly filled.
2. **The cadences clash.** NISAR daily passes (28 Jun, 20/23/25/30 Sep, 14/17/19 Oct 2026),
   Landsat HLS quarterly (2025 Q1 – 2026 Q3), MODIS monthly (Dec 2024 – Oct 2026), and a forecast
   range (Nov 2026 – Oct 2027) cannot share the fixture's `Jan 2023 … Dec 2024` tick list.

---

## 2. Decisions taken in this session

| #   | Decision                                                      | Chosen                                                                    | Rejected alternatives                                                 |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| D1  | Layer taxonomy                                                | **Replace the four change types with data-native families**               | keep labels and remap; keep count and redefine; defer taxonomy        |
| D2  | Tile delivery                                                 | **Pre-generated PNG tiles, committed under `public/tiles/`**              | runtime Rust generation; artifact download; reuse their webmap tiles  |
| D3  | Data vendoring                                                | **git submodule / clone into gitignored `data/`**                         | commit GeoTIFFs; release ZIP download                                 |
| D4  | Layer scope                                                   | **Everything in the repo**                                                | radar+vegetation+earthquake; +land cover+outlook; minimal proof set   |
| D5  | Schedule                                                      | **No hard deadline; build it properly**                                   | deadline-first demo path; two-stage                                   |
| D6  | Pyramid                                                       | **z5–z13, PNG8 with alpha, hard tile/byte cap**                           | WebP; z5–z15; z5–z11                                                  |
| D7  | Time model                                                    | **Global date + per-layer valid date sets**                               | per-layer timelines; unified calendar; pairs-only                     |
| D8  | Inspector                                                     | **Real pixel values under the cursor**                                    | metadata-only; CSV-driven values                                      |
| D9  | Caveats                                                       | **Surface the teammate's own limitations in the UI, per layer**           | one About panel; keep caveats out of the app                          |
| D10 | Colour                                                        | **Our ramps, generated into both tiles and legends**                      | their QGIS `.qml`; per-family hand-tuned ramps in one manifest        |
| D11 | Sampling path                                                 | **Rust reads the GeoTIFF directly on click**                              | precomputed value grids; value tile siblings; approximate from colour |
| D12 | Ask the team                                                  | **all six requests** (§8.2)                                               | partial                                                               |
| D13 | `docs/todo.md` restructure (pnpm workspace / folder redesign) | **Stays separate; this spec is data only**                                | fold in; partial                                                      |
| D14 | Plain tables                                                  | **In scope now — ranked lists + charts**                                  | defer; summary prose only                                             |
| D15 | Regeneration                                                  | **Generated manifest + incremental regeneration**                         | full regen; append-only                                               |
| D16 | GeoTIFF reader (Rust)                                         | **Pure-Rust `tiff` (+ geotransform from tags; `utm` for the projection)** | GDAL bindings; no decoder                                             |
| D17 | Web build                                                     | **Dropped for this step** — Tauri desktop only                            | degrade gracefully; web parity                                        |
| D18 | Data state                                                    | **Full provenance panel** (commit, timestamp, counts, per-layer details)  | simple pill; per-layer coverage only                                  |
| D19 | Left rail                                                     | **Grouped accordion by family**                                           | same-shape list of families; four family rows                         |
| D20 | Verification                                                  | **Manifest schema test + tile spot-checks + app unit tests**              | manual spot-checks; golden-image hashes                               |

---

## 3. Target layer model

`ChangeType` (`src/shared/types/dataset.ts`) is retired as the organising concept. A **family** owns
layers; a **layer** owns dates.

```ts
export type LayerFamily =
  | "radar" // nisar/            backscatter, monthly/daily change, same-track pairs
  | "vegetation" // nisar_ml/         EVI + NDMI estimated from radar
  | "landcover" // nisar_ml/landcover/
  | "earthquake" // earthquake/       before/after EVI+NBR, landslides
  | "climate" // landsat_hls/ modis/  El Niño time series
  | "outlook" // outlook/          12-month El Niño scenario
  | "terrain"; // terrain/          SRTM elevation, slope, aspect
```

| Family       | UI label                   | Layers (initial set)                                                                                                        | Units              | Date axis                              |
| ------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------- |
| `radar`      | Radar Backscatter & Change | HH/HV monthly backscatter; HH/HV by-date backscatter; HH/HV Sep→Oct change; same-track change pairs                         | dB                 | monthly + 8 daily dates                |
| `vegetation` | Vegetation & Plant Water   | EVI monthly, NDMI monthly, EVI by date, NDMI by date                                                                        | index (0–1, −1–1)  | monthly + 8 daily dates                |
| `landcover`  | Land Cover & Change        | 2026 classes, classifier confidence, change vs 2020, 2020 classes                                                           | class / % / class  | 2020, 2026                             |
| `earthquake` | 8 June 2026 Earthquake     | EVI before/after, NBR before/after, 2026−2025 seasonal difference, landslide candidates + polygon overlay                   | index / class      | before, after                          |
| `climate`    | El Niño Time Series        | Landsat EVI/NDMI/NDWI quarterly + anomalies + valid-obs count; MODIS NDVI monthly, land temperature monthly, both anomalies | index / °C / count | 2025-Q1 … 2026-Q3; Dec 2024 … Oct 2026 |
| `outlook`    | 12-Month Outlook           | EVI expected, EVI anomaly, temp expected, temp anomaly (12 bands each)                                                      | index / °C         | 2026-11 … 2027-10                      |
| `terrain`    | Terrain                    | Elevation, slope, aspect                                                                                                    | m / ° / °          | static                                 |

Class vocabularies that must be carried verbatim into legends (from their README):

- Land cover 1–8: closed forest, open forest & mangrove, brush/shrubs, grassland, annual crop,
  perennial crop, built-up & barren, water & fishpond.
- Change vs 2020: 1 agree · 2 forest → non-forest · 3 vegetation → built/bare · 4 land → water ·
  5 other.
- Landslide candidates: 1 checked/no slide · 2 possible landslide · 4 not checked (cloudy) ·
  5 checked but no elevation data.

Boundary (`boundary/`, EPSG:4326 copy) becomes a real vector layer: the framing outline and the
clip mask, replacing the Esri raster boundary row as the "Administrative Boundaries" entry.

---

## 4. Manifest — the contract between pipeline and app

A single generated file, committed with the tiles: **`public/data/manifest.json`**, typed in
`src/shared/types/manifest.ts`.

```jsonc
{
  "schemaVersion": 1,
  "generator": {
    "name": "nisar-tile-pipeline",
    "version": "1.0.0",
    "generatedAt": "2026-11-02T09:14:00Z",
  },
  "source": {
    "repo": "https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar",
    "commit": "<pinned sha>",
    "crs": "EPSG:32651",
    "resolutionMeters": 30,
    "attribution": "NISAR L2 GCOV (NASA–ISRO, provisional) · Landsat HLS L30 v2.0 · MODIS MOD13Q1/MOD11A2 · GPM IMERG V07 · SRTMGL1 · NOAA CPC",
  },
  "bounds": [125.0, 5.2, 126.4, 6.8], // AOI in EPSG:4326, derived from the boundary
  "dates": ["2020-01-01", "2025-Q1", "..."], // global, sorted union of every layer's periods
  "layers": [
    {
      "id": "radar-backscatter-hv-monthly",
      "family": "radar",
      "name": "HV Backscatter (monthly)",
      "units": "dB",
      "valueType": "continuous",
      "sourceFile": "nisar/backscatter_by_month/<file>.tif",
      "band": 1,
      "scaleFactor": 0.01,
      "nodata": -32768,
      "period": "2026-09", // this layer-date
      "tilePath": "tiles/radar-backscatter-hv-monthly/2026-09/{z}/{x}/{y}.png",
      "ramp": {
        "kind": "diverging",
        "stops": [
          [-3, "#8c510a"],
          [0, "#f5f5f5"],
          [3, "#01665e"],
        ],
      },
      "domain": [-3, 3], // fixed or percentile-clipped
      "minZoom": 5,
      "maxZoom": 13,
      "caveats": ["radar change is backscatter, not deformation"],
    },
  ],
}
```

Rules:

- **`tilePath` replaces `tileTemplate()`.** Path segments are ASCII/URL-safe (`2026-09`,
  `2025-Q3`, `2026-11`) — this is the fix for the `Jun%202024` space bug called out in
  `docs/todo-nisar-overlay-tiles.md`. No percent-encoding anywhere.
- **App reads only the manifest.** No fixture layer list, no guessed file names, no globbing.
- **Continuous domains** are computed by the pipeline (2nd/98th percentile over valid pixels) and
  written into the manifest, except where a fixed domain is scientifically meaningful (dB change
  ±3, indices by type, temperature anomaly ±2 °C). Categorical layers carry `classes[]` with
  code → label → colour.
- **`scaleFactor` is applied once**: the inspector multiplies raw Int16 by it; tiles are rendered
  after the multiplication, so tile colours and inspector values agree.
- **Nodata → alpha 0**, never a colour. Class 1 of the change raster ("agree") is transparent.
- A schema test validates this file in the pipeline **and** in the app test suite.

---

## 5. Pipeline (`scripts/tiles/`)

Build-time only. Python 3 + GDAL/rasterio is acceptable **because the output is committed** — the
app's Cargo build and CI never need GDAL (consistent with D16).

### 5.1 Steps

1. **Inventory** — clone/pull `data/` (submodule, gitignored), walk the tree, read every GeoTIFF's
   CRS, transform, band count, dtype, scale, nodata, compression. Emit `inventory.json` and fail
   loudly on anything unexpected (BigTIFF, JPEG-compressed tiles, multi-band stacks that are not
   the 12-band outlook rasters, missing scale factors on Int16).
2. **Warp** — UTM 51N → EPSG:3857, aligned to a fixed 3857 grid, cached as COG under
   `data/.cache/`. Nearest-neighbour for classes and class-derived rasters; area-weighted average
   ignoring nodata for continuous layers. Bound mask applied last so nothing bleeds outside the
   provinces.
3. **Ramp + encode** — apply the ramp from the layer definition to RGBA in numpy, write 256×256
   **PNG8 with alpha** tiles.
4. **Tile** — z5–z13 (see budget), XYZ scheme, skip tiles that are fully transparent.
5. **Manifest** — write `public/data/manifest.json` (the entry per layer-date), plus
   `public/data/legend` data folded into the same file.
6. **Report** — tile count, byte total, per-family breakdown, longest and widest layers. Non-zero
   exit if the budget in §5.2 is exceeded.

Incremental by default (D15): a layer-date is regenerated only when its source file mtime/size or
the pipeline version changed. `--full` forces everything.

### 5.2 Size budget (this is the constraint that "everything" forces)

Rough arithmetic from the grid: at z13 a tile is ~4.9 km across at this latitude; the two provinces
cover ~5,260 km², so ~250–400 tiles at z13 and ~1.3× that across z5–z13 ≈ **350–550 tiles per
layer-date**. The catalogue is ~200–260 layer-dates once the 12-band outlook rasters are unfolded
into months:

| Family     | Approx. layer-dates                                    |
| ---------- | ------------------------------------------------------ |
| radar      | 4 + 16 + 2 + 11–22 ≈ 33–44                             |
| vegetation | 4 + 16 = 20                                            |
| landcover  | 4                                                      |
| earthquake | 8–12 rasters + 1 class raster                          |
| climate    | 28 Landsat + 4 anomalies + 46 MODIS + 2 anomalies ≈ 80 |
| outlook    | 4 products × 12 months = 48                            |
| terrain    | 3                                                      |

That is **~90k tiles** at the naive estimate — well past what a git repo should carry. The budget
therefore has a shape, not just a ceiling:

- **Headline layers** (`radar` change/backscatter by month, `earthquake`, `landcover`): z5–**13**.
- **Dense series** (`climate`, `outlook`, radar by-date, vegetation by-date): z5–**11**.
- **Hard cap:** ≤ 30,000 tiles **and** ≤ 150 MB committed; the pipeline prints the report and fails
  rather than silently committing a 1 GB tree.
- If the cap is hit, the fallback order is: drop outlook to 4 representative months (Nov/Jan/Apr/Jul)
  → drop Landsat `ValidObs` → coarsen `climate` to z10. Record whichever trimming was applied in
  the manifest (`"trimmed": [...]`) so the provenance panel can say so.

### 5.3 Ramp definitions (D10)

| Value kind           | Ramp                                          | Domain     | Notes                                                                                            |
| -------------------- | --------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| radar dB change      | diverging BrBG: `#8c510a → #f5f5f5 → #01665e` | ±3 dB      | brown = drying, teal = wetting — matches their narrative (HH −0.55 dB Jun→Sep, +1.05 dB Sep→Oct) |
| radar backscatter dB | sequential dark→light (viridis-like)          | percentile | absolute HH/HV                                                                                   |
| EVI / NDVI           | sequential `#8c510a → #f6e8c3 → #1a9850`      | 0–1        | reuses `COLOR_SCALES.vegetation`                                                                 |
| NDMI                 | diverging brown→white→blue                    | −0.2–0.6   | wet→dry                                                                                          |
| NDWI / water         | transparent → `#2c7fb8`                       | 0–1        | reuses `COLOR_SCALES.water`                                                                      |
| land temperature     | diverging `#2166ac → #f7f7f7 → #b2182b`       | 15–35 °C   | anomalies use ±2 °C                                                                              |
| elevation / slope    | sequential grey→brown→white / amber→red       | percentile | terrain                                                                                          |
| classes              | fixed per code, ColorBrewer-flavoured         | —          | legend prints the README class names                                                             |

`src/shared/utils/colorScales.ts` is the single source of truth, extended from
`Record<ChangeType, ColorScale>` to per-family scales; the pipeline imports the same values through
a generated JSON to avoid two ramps drifting.

---

## 6. App changes

### 6.1 Data model and stores

- `src/shared/types/dataset.ts`: delete `ChangeType`; add `LayerFamily`, `Period`, `ManifestLayer`,
  `Manifest`, `ClassEntry`, `Ramp`.
- New `src/shared/types/manifest.ts` + runtime validator (hand-written guard or zod-free equivalent —
  no new dependency decided yet).
- `datasetStore`: load `/data/manifest.json` once at startup; hold `manifest`, `currentDate`,
  `layersByFamily`, `periodsByLayer`; expose `resolvePeriod(layerId, currentDate)` which snaps to
  the **nearest available period** and reports the snap so the UI can say
  `nearest available: 2026-10-19`.
- `layerStore`: seeded from the manifest instead of `SAMPLE_LAYERS`; visibility defaults per family
  (radar change on, everything else off) so first paint is legible.
- `src/fixtures/sample-dashboard.ts` shrinks to chrome-only fixtures (`DASHBOARD`, `SEARCH_PLACEHOLDER`,
  `MAP_LABELS`, `SCALE_BAR`, `TOOLS`). All data fixtures are deleted — this is the point of the
  exercise.

### 6.2 Map

- `TileOverlay` keeps its reconciliation shape (one raster source + layer per visible layer, inserted
  below `admin-boundaries`, opacity/visibility applied in place) but takes `tilePath` from the
  manifest. It also **stops treating a 200-HTML response as success**: hook the source's `error`
  event and report it to the data store so §6.4 can show it.
- Boundary GeoJSON from `boundary/` (EPSG:4326 copy) is added as a line layer above the overlays,
  replacing the Esri raster "Administrative Boundaries" row as the meaningful boundary.
- On first load, `fitBounds` to the manifest AOI (the data covers two provinces, not the
  archipelago); `PHILIPPINES_BOUNDS` stays as `maxBounds` so the user can still roam.
- When the current date changes, sources rebuild (unchanged behaviour), but only for layers that
  have data at that period; a layer with none is hidden and flagged, not left pointing at 404s.

### 6.3 Inspector (real values, D8/D11)

New Tauri command set in `src-tauri/src/commands/sample.rs`:

```rust
#[tauri::command]
async fn sample_layers(app: AppHandle, lng: f64, lat: f64, period: String) -> Result<Vec<LayerSample>, String>
// LayerSample { layerId, value: Option<f64>, raw: Option<i64>, className: Option<String>, units }
```

- Project WGS84 → UTM 51N (EPSG:32651, zone 51N) with `utm`; row/col from the GeoTIFF geotransform
  read from tags (`ModelTiepoint`, `ModelPixelScale`), not assumed.
- Decode only the strip/tile containing the pixel with the `tiff` crate; this is the main technical
  risk (§9.1) — if a strip cannot be decoded without reading the whole band, cache one decoded band
  per open file in an LRU and accept the first-click cost.
- Apply `scaleFactor`, map `nodata` to `None`, map class codes to labels, return the manifest
  `caveats` alongside.
- Non-desktop builds: command unavailable → `LocationInfoPanel` renders
  _"Pixel sampling runs in the desktop app"_ (D17 keeps the web build out of scope, but the panel
  must not lie).
- Alongside the values, the panel keeps coordinates + nearest place name (existing `formatCoords`),
  then per-layer rows: family, layer, value, units, and the layer's caveats.

### 6.4 Data status + provenance (D18)

- `DataStatus` reads the manifest: `42 layers · 19 dates`; a failed tile request flips it to a
  warning state with a count of failing layers (closes the "silent missing tiles" gap).
- Clicking the pill opens a **provenance panel** (new `src/features/provenance/`): source repo +
  pinned commit, generation timestamp, generator version, per-family layer counts, tile/byte totals,
  any `trimmed` entries, and the attribution string from the manifest.
- The teammate's limitations (D9) appear as a compact "Limits of this data" list in the same panel
  and inline per layer: ML vegetation explains ~⅓ of variance; ~30% of the landslide window is
  cloud-unchecked; the outlook is a scenario, not a forecast; radar does not show the quake itself;
  uplift would need GUNW.

### 6.5 Left rail (D19)

`ChangeTypeList` → `FamilyList`: collapsible family sections (Radar, Vegetation, Land cover,
Earthquake, El Niño, Outlook, Terrain), each row one layer with swatch + toggle. Panel title
`Surface Change Types` → `Datasets`. `MapLayersPanel` lists only layers that are visible or pinned
(`showInLayerList` semantics survive), so it does not become a 60-row wall.

### 6.6 Legends

`LegendPanel` reads `ramp`, `domain`/`classes`, and `units` from the manifest per selected layer,
plus the two notes that survive from the fixture. Class legends print labels, not numbers.

### 6.7 Plain data, charts and ranked lists (D14)

- `earthquake/.../Possible_landslides_after_8Jun2026_ranked.csv` → ranked list panel (area, nearest
  place), row click flies to the cluster and selects it.
- `tables/` monthly area averages + `MODIS_AOI_monthly_2000_2026.csv` → a monthly series chart.
- `Outlook_Nov2026_Oct2027_ElNino_scenario.csv` → month-by-month table with rainfall range.
- CSVs are imported into the manifest generation step as small committed JSON, so the app never
  parses CSV at runtime.
- **Open decision (§10, O1):** no charting library is in `package.json`. Recommendation: a small
  SVG line/bar component in `src/shared/ui`, no new dependency, matching the token discipline.

---

## 7. Time model in practice (D7)

- One global `currentDate`; the period list is the sorted union across layers (`manifest.dates`).
- Each layer publishes `periods[]`; `resolvePeriod()` snaps to the nearest period at or before the
  selection, falling back to the nearest after it. The selected date in `TimeSeriesPanel` shows the
  requested date, and a chip shows the snap when they differ.
- Playback (`usePlayback`, `AnimationBar`, `PlaybackButton`) operates on `manifest.dates` and needs
  no change beyond sourcing the list.
- Forecast periods (`2026-11 … 2027-10`) are visually distinguished (dashed tick / "scenario" tag)
  so observation and projection never read as the same thing.
- Pair products (Sep→Oct change, before/after, 2020 vs 2026, same-track pairs) are ordinary layers
  at a single period labelled `2026-10 (vs 2026-09)` rather than a new interaction.

---

## 8. Deliverables

### 8.1 In this spec

1. `scripts/tiles/` pipeline: inventory, warp, ramp, tile, manifest, report, `--full`.
2. `data/` submodule + `README` note on how to fetch and regenerate.
3. `public/tiles/**` and `public/data/manifest.json` committed, within budget.
4. Typed manifest + validator; stores rewired; fixtures deleted.
5. `TileOverlay` manifest-driven, boundary GeoJSON layer, AOI fit, tile-error reporting.
6. Rust `sample_layers` command + inspector rewrite.
7. Provenance panel, data status, per-family accordion, legend rewrite.
8. Ranked landslide list, monthly chart, outlook table.
9. Tests: manifest schema, pipeline spot-check, store/layer-model, existing 12 test files updated.

### 8.2 The reply we owe the teammate

Send after the inventory pass, requesting (D12, all six):

1. **EPSG:4326 (or pre-warped 3857) copies** of the headline rasters — removes the warp step from
   our pipeline and its resampling risk.
2. **A tagged release or pinned commit** — so the manifest can cite exactly what was consumed.
3. **QGIS `.qml` styles** — to check our ramps against what the team actually reviewed.
4. **A machine-readable index** — path, family, date, units, scale, nodata, class names per file.
5. **GUNW/InSAR deformation spanning 8 June 2026** — the only way elevation/subsidence returns as a
   real layer rather than a footnote.
6. **The webmap's tile-generation code** — to compare or reuse their renderers.

Also report back what we found missing: no deformation layers, no EPSG:4326 rasters, no index file,
no `.qml` in the README listing, and (from inventory) any compression/dtype surprises.

### 8.3 Explicitly out of scope

- The `docs/todo.md` pnpm-workspace / folder-architecture redesign (D13) — separate work.
- Web/GitHub Pages parity (D17); the page may be stale until later.
- Live NASA/ISRO fetch, 3D terrain, mobile, alerting (`docs/nisar-spec.md` "future enhancements").
- Producing GUNW data ourselves; we only request it.
- The unused cache surface: `tileCache.ts` stubs, Rust `read_tile_cache`/`write_tile_cache`, the
  `geoTiffWorker` stub, and `FileImport` (returns `null`) stay as-is unless they block a step.

---

## 9. Risks

1. **`tiff` crate decode coverage.** Pure-Rust support for LZW/DEFLATE GeoTIFF is good; JPEG-in-TIFF
   or BigTIFF is not. Inventory (5.1 step 1) must fail loudly. _Fallback:_ read the one band we need
   through `gdal` behind a feature flag, or extend the pipeline to emit tiny sampled JSON grids.
2. **Committed tile size.** The budget in §5.2 is an estimate derived from the AOI; the first real
   count may blow it. Trimming order is pre-agreed so this does not become a debate mid-build.
3. **Warp resampling on 30 m Int16 saves** can shift class boundaries by a pixel; classes use nearest
   neighbour to keep codes intact.
4. **Provisional NISAR data** — the release is "provisional"; the provenance panel must show that
   word rather than implying final calibration.
5. **Fixture-shaped tests.** 12 existing test files reference `CHANGE_TYPES`, `SAMPLE_LAYERS`,
   `TIME_SERIES`. Deleting fixtures will break them; updating them is part of the work, not a
   regression.
6. **"Everything" vs honesty.** Some layers (e.g. `ValidObs`) are diagnostics, not story layers. They
   ship, but off by default and last in the family, so the first screen stays readable.

---

## 10. Open questions

| #   | Question                                                                       | Recommendation                                                 |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| O1  | Chart implementation for the tables work                                       | hand-rolled SVG in `src/shared/ui`, no dependency              |
| O2  | All 12 outlook months as separate periods, or 4 representatives?               | all 12 if the budget allows; trimming rule already covers it   |
| O3  | Does the repo actually contain `.qml` files, a release tag, and an index file? | verify in inventory; the reply (§8.2) adapts to what is there  |
| O4  | Default map framing — provinces (AOI) or Philippines?                          | AOI on load, `PHILIPPINES_BOUNDS` as `maxBounds`               |
| O5  | Keep the "NISAR Surface Change Monitor / Philippines" title?                   | keep title, subtitle `Sarangani & Davao Occidental`            |
| O6  | Do landed CSVs get a checksum/version so the provenance panel can cite them?   | yes, fold into the manifest's `source` block                   |
| O7  | Does `boundary/` arrive as GeoJSON or shapefile?                               | verify in inventory; shapefile means a one-off conversion step |

---

## 11. Build order

- [x] **P0 — Inventory.** Clone `data/`, run the inventory step, confirm compression/scale/nodata,
      locate `.qml`/index/boundary format, produce the first tile-count estimate, send the §8.2 reply.
      **Done 2026-11-02** at commit `1505bae` — results in `docs/inventory-p0.md`, reply in
      `docs/reply-to-team.md`. Contract holds; viewport bounds and the outlook layer-date count
      need correcting, and the byte budget requires the S1 trim (outlook → 4 months).
- [ ] **P1 — Pipeline.** Warp → ramp → tile → manifest → report, `--full`/incremental, budget gate,
      schema test. Output for one family (`radar`) end to end.
- [ ] **P2 — App data model.** Manifest types + validator, store rewiring, fixtures removed, timeline
      union + snapping, accordion families, legends from the manifest.
- [ ] **P3 — Map.** Manifest-driven `TileOverlay`, tile-error surface, boundary GeoJSON, AOI fit.
- [ ] **P4 — Inspector.** Rust decoder + `sample_layers`, projection, scale/nodata/class handling,
      inspector rewrite, caveats inline.
- [ ] **P5 — Provenance.** Status pill from the manifest, provenance panel with limits list.
- [ ] **P6 — Catalogue.** Remaining families tiled and switched on; budget report reviewed and any
      trimming recorded.
- [ ] **P7 — Plain data.** Ranked list, monthly chart, outlook table.
- [ ] **P8 — Verification.** `pnpm lint`, `pnpm test`, `pnpm build`,
      `cargo check --manifest-path src-tauri/Cargo.toml`, pipeline manifest/spend check; manual pass:
      toggle every family, scrub to a period a layer lacks, click a point and compare the value to
      QGIS.

## 12. Acceptance criteria

- [ ] No request from the app 404s or receives HTML: every `manifest.tilePath` resolves to a PNG that
      decodes, and a deliberately broken layer surfaces a visible error instead of a blank map.
- [ ] Every visible layer's legend matches the tile colours because both come from the same ramp
      definition.
- [ ] Scrubbing to a period a layer does not cover hides that layer with an explicit "no data at this
      date — nearest: …" state.
- [ ] Clicking the map returns values that match QGIS for the same pixel on at least radar,
      vegetation, land cover and terrain layers (spot-checked, recorded in the PR).
- [ ] The provenance panel reports the pinned commit, generation time, layer counts, committed tile
      count/bytes, and the five known limitations.
- [ ] Committed tiles stay within 30,000 tiles / 150 MB, and the pipeline fails if they do not.
- [ ] `pnpm test` green with the updated fixture-shaped tests; `cargo check` clean.
- [ ] No data fixture remains in `src/fixtures/sample-dashboard.ts`.
