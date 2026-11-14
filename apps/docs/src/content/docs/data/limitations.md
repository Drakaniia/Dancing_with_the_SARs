---
title: Provenance and limitations
description: Where the data comes from, how the app proves it, and the scientific limits you must keep in mind.
---

The app is designed to never imply more than the data supports. Every layer cites its source
file, every manifest cites a pinned commit, and the release's own limitations are shown in the
UI: once in the provenance dialog, and per layer as caveats.

## Provenance in the app

The **Dataset Provenance & Scientific Caveats** dialog opens from the data status pill, the
database icon, or **Settings → Release Provenance**. It reports:

- **Pinned commit:** `1505bae1`, the exact upstream release consumed.
- **Catalogue scope:** 57 layers, 318 slices.
- **Tile pyramid:** 28,530 tiles, about 506.5 MB.
- **Native grid and CRS:** EPSG:32651, 30 m.
- **Tile health:** a confirmation that all 81 periods and 318 pyramids are listed in the
  manifest. A warning panel with failing layers is built in, but no tile errors are reported to
  it yet (see [Frontend](/Dancing_with_the_SARs/architecture/frontend/#map-and-overlays)).
- **Per-family breakdown:** layer and tile counts per family.
- **Attribution:** NISAR L2 GCOV (NASA-ISRO, provisional) · Landsat HLS L30 v2.0 · MODIS
  MOD13Q1/MOD11A2 · GPM IMERG V07 · SRTMGL1 · NOAA CPC.

Exports carry the same `source` block, so a shared reading stays traceable. See
[Export snapshot](/Dancing_with_the_SARs/guide/tools/#export-snapshot).

## Known data limits

These five limits come from the release itself and appear verbatim in the provenance dialog.

1. **Radar change is backscatter, not deformation.** Radar layers show L-band backscatter, not
   ground deformation. No public NISAR data exists before 19 June 2026, so NISAR cannot
   measure the quake's uplift. The team tested Sentinel-1 InSAR (`sentinel1_quake/` in the data
   repo) and it could not measure it either. The first NISAR scene in the release is 28 June
   2026, after the quake, so radar does not show the quake itself.
2. **Daily passes are swaths.** NISAR by-date layers are single-pass swaths. Inside the two
   provinces, coverage ranges from 19 % (30 Sep) to 89 % (23 Sep, 17 Oct). Monthly composites
   cover 98–100 %.
3. **ML vegetation is approximate.** The NISAR-derived EVI and NDMI explain roughly one third
   of optical variance. Read them as structural canopy estimates.
4. **Landslide checks are incomplete.** About 30 % of the post-quake optical window
   (9 Jun – 25 Sep 2026) was cloud-obscured (class 4, not checked).
5. **The outlook is a scenario.** The 12-month El Niño outlook (Nov 2026 – Oct 2027) is a
   conditional climate scenario (sensitivity per +1 °C ONI), not a deterministic weather forecast.

## Per-layer caveats

Each manifest entry carries `caveats[]`. The inspector shows the first caveat next to each
sampled value. For example, the default radar change layer carries:

- _Backscatter change, not ground deformation: no public NISAR data exists before 19 June 2026, so NISAR cannot measure the quake's uplift._
- _Does not capture the 8 June 2026 quake directly: first NISAR scene is 28 June 2026._

## Other things to know

- **The NISAR data is provisional.** It is not final calibration, and the attribution says so.
- **One raster is nearly empty.** `MODIS_LST_Day_2024-12_1km.tif` has only 126 valid pixels.
- **Terrain is not clipped upstream.** SRTM covers the full grid. The pipeline's boundary mask
  clips it.
- **Outlook and MODIS grids are not pixel-aligned.** This is fine for display; resample before
  any pixel-wise comparison.
- **Browser inspection uses placeholders.** Outside the desktop app, inspector values are
  placeholders, not measurements. See [Inspecting locations](/Dancing_with_the_SARs/guide/inspecting/).
