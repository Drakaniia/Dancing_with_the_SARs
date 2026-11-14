# NISAR Surface Change Monitor

**Team:** The Cartographers — [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/find-a-team/the-cartographers/)

## About the Challenge

<div style="display: flex; align-items: center; gap: 24px;">
  <img src="apps/web/public/images/team-image.jpg" alt="The Cartographers" style="width: 300px; height: 250px; object-fit: cover; flex-shrink: 0;" />
  <div style="flex: 1;">
    <h3>Dancing with the SARs</h3>
    <p>Earth's surface is an endless dance of natural processes and human activities, but these changes are often difficult to visualize, understand, and communicate. From wetland loss to forest wildfires, earthquakes, farming activities, glacier movement, and more, Earth is in a constant waltz of surface changes. Your challenge is to build an interactive application that uses radar remote sensing data from the NASA-ISRO Synthetic Aperture Radar (NISAR) mission to track and visualize one or more types of surface change at locations around the world.</p>
  </div>
</div>

## Sample Screenshots

Representative desktop views of the running app, captured at 1600 × 1000. Click any image to view it at full size. To regenerate them, or the data and tiles behind them, see [docs/SETUP.md](docs/SETUP.md).

| Sand Atlas · Light Dashboard                                                                                                                                                                       | Night Atlas · Dark Dashboard                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Light dashboard showing the Sarangani and Davao Occidental radar overlay, layer controls, timeline, and inspector](docs/screenshots/dashboard-light.png)](docs/screenshots/dashboard-light.png) | [![Dark dashboard showing the same radar overlay with the Night Atlas interface](docs/screenshots/dashboard-dark.png)](docs/screenshots/dashboard-dark.png) |
| Explore surface-change layers, adjust opacity, and navigate the timeline.                                                                                                                          | View the same map workspace in the dark theme.                                                                                                              |

| Location Inspection                                                                                                                                                         | Dataset Provenance                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Selected map location with coordinates and sampled layer readings in the inspector](docs/screenshots/location-inspection.png)](docs/screenshots/location-inspection.png) | [![Dataset provenance dialog with release details, layer families, and scientific caveats](docs/screenshots/data-provenance.png)](docs/screenshots/data-provenance.png) |
| Click the map to inspect coordinates and layer readings.                                                                                                                    | Review the pinned data release, catalogue coverage, and interpretation limits.                                                                                          |

To refresh these images, start `pnpm dev --host 127.0.0.1 --port 5173`, then run `python scripts/capture_screenshots.py` in another terminal. The capture script requires Python Playwright and Microsoft Edge; it does not add frontend dependencies.

## Download

Installers for Windows, macOS and Linux are on the [Download page](https://drakaniia.github.io/Dancing_with_the_SARs/getting-started/download/) and the [GitHub Releases page](https://github.com/Drakaniia/Dancing_with_the_SARs/releases/latest).

## Getting Started

```bash
pnpm install
pnpm run tauri dev
```

## Build

```bash
pnpm run tauri build
```

## Documentation

Full documentation (user guide, data catalogue, tile pipeline, architecture) is published at [drakaniia.github.io/Dancing_with_the_SARs](https://drakaniia.github.io/Dancing_with_the_SARs/). It is an Astro Starlight site in `apps/docs`, deployed to GitHub Pages on every push to `main`:

```bash
pnpm docs:dev     # http://localhost:4321/Dancing_with_the_SARs/
pnpm docs:build   # static site in apps/docs/dist/
```

## Use of AI

In line with the NASA Space Apps Challenge rules on Super Intelligence (SI), this section lists where AI tools were used in this project.

- **Code:** The team used an AI coding assistant (Claude, by Anthropic) to help write and refactor parts of the React/TypeScript interface, the Tauri (Rust) commands, the Python tile pipeline and the test suite. All AI-assisted code was reviewed, tested and integrated by team members.
- **Documentation:** AI assistance was used to draft and edit parts of this README and the documentation site. The team checked all technical and scientific statements against the data release.
- **Data:** No AI-generated data is used. All map layers come from NASA, NASA-ISRO, USGS and NOAA products processed in the team's [data repository](https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar). The radar-estimated vegetation layers (EVI, NDMI) come from a conventional machine-learning regression model the team trained on satellite data; they are not produced by a generative AI tool.
- **Images, video and audio:** The screenshots were captured from the running app with a script, and the team photo is a real photograph. No AI-generated images, video or audio are included in this repository.

No AI-generated content uses or modifies NASA branding or design elements.

## Project Structure

The repository is a pnpm workspace:

- `apps/web`: the React + Vite frontend (`src/`, `public/`, `tests/`).
- `apps/desktop`: the Tauri v2 shell (`src-tauri/`), which wraps the `apps/web` build.
- `apps/docs`: the Astro Starlight documentation site.
- `scripts/`: the Python tile pipeline (writes into `apps/web/public/`) and screenshot capture.

Root scripts (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm tauri dev`) forward to the right package.

See the [architecture overview](https://drakaniia.github.io/Dancing_with_the_SARs/architecture/overview/) for how the parts fit together.

## Data and Credits

All map data comes from the team's data repository, [sarangani-davao-occidental-nisar](https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar), built from NASA-ISRO NISAR L2 GCOV, Landsat HLS L30, MODIS MOD13Q1/MOD11A2, GPM IMERG and SRTMGL1, plus the NOAA CPC Oceanic Niño Index. The basemap is Esri World Imagery. The full list of data, services and open-source software is on the [Credits and AI use](https://drakaniia.github.io/Dancing_with_the_SARs/about/credits/) page.

## Use of AI Tools

AI coding assistants (large language models) helped write and review parts of the application code, tile pipeline, tests and documentation. Team members reviewed and tested all AI-assisted work. AI tools did not create the scientific data: every map value comes from the satellite and climate products listed above. The screenshots in `docs/screenshots/` are real captures of the app.

## License

The source code is released under the [MIT License](LICENSE), © 2026 The Cartographers. The licence covers the code only. Third-party data shown in the app (NASA, NASA-ISRO, USGS, NOAA, Copernicus Sentinel and Esri) keeps its own terms; see [Data and Credits](#data-and-credits).
