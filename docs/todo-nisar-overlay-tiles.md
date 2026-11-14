# TODO — NISAR change-type overlay tiles are missing

**Status:** open · **Blocks:** the Surface Change Types layers (subsidence, elevation,
vegetation, water) rendering anything on the map · **Added:** 2026-10-14

## The gap

`TileOverlay` builds one raster source per `change-type` layer and points it at the template
in [`src/shared/utils/geo.ts`](../apps/web/src/shared/utils/geo.ts):

```
tiles/{changeType}/{date}/{z}/{x}/{y}.png
```

Nothing answers those paths. There is **no `public/tiles/` directory** in the repo, so the
request falls through to Vite's SPA fallback:

```
GET /tiles/subsidence/Jun%202024/7/106/59.png
→ HTTP/1.1 200 OK
  Content-Type: text/html        # index.html, not a PNG
```

Because the response is `200`, it looks like success in the network tab, but MapLibre cannot
decode HTML as an image:

```
InvalidStateError: The source image could not be decoded.
```

repeated once per tile, per zoom, per layer. The overlay paints nothing. The basemap,
reference labels and all chrome render correctly underneath, so this is easy to miss.

## What it should look like

Per [`docs/nisar-spec.md`](nisar-spec.md) → "Tile Generation":

- 256×256 PNG, XYZ scheme, zoom levels 0–15.
- Colour ramps:
  - **Subsidence** — purple (high subsidence) → white (stable)
  - **Elevation** — red (uplift) → blue (subsidence)
  - **Vegetation** — green (healthy) → brown (stressed)
  - **Water** — blue (water) → transparent (land)

The spec's directory layout omits the date segment; the implementation inserted one after the
change type so a date change can retarget the source. Keep the implemented template (with the
date) rather than reverting to the spec's shorter path.

## Exact inputs the UI asks for

- **Change types** (`SAMPLE_LAYERS` in [`src/fixtures/sample-dashboard.ts`](../apps/web/src/fixtures/sample-dashboard.ts)):
  `elevation`, `subsidence`, `vegetation`, `water`.
- **Dates** (`TIME_SERIES.ticks`): `Jan 2023`, `Apr 2023`, `Jul 2023`, `Oct 2023`, `Jan 2024`,
  `Apr 2024`, `Jun 2024`, `Oct 2024`, `Dec 2024`.
- **Date encoding:** the value is interpolated raw, so the space arrives percent-encoded —
  `Jun%202024`. A generator must write directories with a literal space (`Jun 2024/`) or the
  template must be changed in lockstep. Pick one and keep them consistent.
- **Extent:** `PHILIPPINES_BOUNDS` = `[116, 4, 127, 21]` (EPSG:4326).

## Acceptance criteria

- [ ] Every `tiles/{changeType}/{date}/{z}/{x}/{y}.png` the UI requests returns
      `Content-Type: image/png` and decodes without `InvalidStateError`.
- [ ] With **Land Subsidence** enabled the overlay is visibly drawn over the basemap.
- [ ] Toggling a change-type row shows/hides its overlay; moving the opacity slider changes
      its opacity without any tile re-request (see `TileOverlay`).
- [ ] Scrubbing the timeline to another date swaps the overlay to that date's tiles.
- [ ] Overlay layers still sit _below_ `admin-boundaries` / `cities-labels`.

## Where the code lives

- Request template: [`tileTemplate`](../apps/web/src/shared/utils/geo.ts) in `src/shared/utils/geo.ts`.
- Source/layer reconciliation: [`src/features/map/overlays/TileOverlay.tsx`](../apps/web/src/features/map/overlays/TileOverlay.tsx).
- Only tiles for the **current** date are fetched at a time — a generator does not need every
  date present upfront, but every date the user can scrub to must exist.

## Related

- The `invalid`/`error` fallback in `TileOverlay` gives no signal when tiles are absent; the
  app still shows "NISAR Data Loaded". Consider surfacing a missing-data state as part of this
  work (tracked separately).
