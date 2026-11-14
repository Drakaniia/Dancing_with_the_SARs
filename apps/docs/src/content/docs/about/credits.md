---
title: Credits and AI use
description: The data, services, open-source software and AI tools used to build the NISAR Surface Change Monitor.
---

Every external resource used to build the app is listed here, as the NASA Space Apps
submission rules require.

## NASA data

- [NISAR](https://nisar.jpl.nasa.gov/) L2 GCOV (NASA-ISRO, provisional), distributed by the
  [Alaska Satellite Facility DAAC](https://asf.alaska.edu/).
- [Harmonized Landsat Sentinel-2 (HLS) L30 v2.0](https://hls.gsfc.nasa.gov/).
- [MODIS MOD13Q1 v061](https://lpdaac.usgs.gov/products/mod13q1v061/) and
  [MOD11A2 v061](https://lpdaac.usgs.gov/products/mod11a2v061/) (NASA LP DAAC).
- [GPM IMERG V07](https://gpm.nasa.gov/data/imerg).
- [SRTMGL1 v003](https://lpdaac.usgs.gov/products/srtmgl1v003/) (NASA LP DAAC).

How each product is used is described in [Data sources](/Dancing_with_the_SARs/data/sources/).

## Other data and services

- [NOAA CPC Oceanic Niño Index](https://www.cpc.ncep.noaa.gov/), for the El Niño outlook.
- [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9)
  and Esri World Boundaries and Places, for the basemap and reference labels (display only).
- [MapLibre demo font glyphs](https://demotiles.maplibre.org/), for map label fonts.
- The team's own data repository,
  [sarangani-davao-occidental-nisar](https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar).

## Open-source software

- **App interface:** [React](https://react.dev/), [MapLibre GL JS](https://maplibre.org/),
  [Zustand](https://github.com/pmndrs/zustand), [Tailwind CSS](https://tailwindcss.com/),
  [Motion](https://motion.dev/) and [Lucide](https://lucide.dev/) icons, built with
  [Vite](https://vite.dev/) and [TypeScript](https://www.typescriptlang.org/).
- **Desktop shell:** [Tauri](https://tauri.app/) with its dialog, fs and store plugins,
  [serde](https://serde.rs/), [base64](https://crates.io/crates/base64) and
  [image-tiff](https://github.com/image-rs/image-tiff).
- **Tile pipeline:** [rasterio](https://rasterio.readthedocs.io/), [NumPy](https://numpy.org/),
  [Shapely](https://shapely.readthedocs.io/), [pyproj](https://pyproj4.github.io/pyproj/) and
  [Pillow](https://python-pillow.org/).
- **Testing:** [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/),
  [jsdom](https://github.com/jsdom/jsdom), [axe-core](https://github.com/dequelabs/axe-core) and
  [Playwright](https://playwright.dev/) (screenshot capture).
- **Documentation:** [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/).

Each package keeps its own licence. The full dependency list is in the `package.json`,
`Cargo.toml` and lock files in the [repository](https://github.com/Drakaniia/Dancing_with_the_SARs).

## Use of AI tools

The team used AI coding assistants (large language models) to help write and review parts of
this repository's application code, tile pipeline scripts, tests and documentation. Team members
reviewed, tested and edited all AI-assisted work before including it.

AI tools did not create the scientific data. Every map value comes from the satellite and
climate products listed above, through the pinned data release and the tile pipeline. The
screenshots in this documentation are real captures of the running app. No AI-generated content
uses NASA logos, flags or mission identifiers.
