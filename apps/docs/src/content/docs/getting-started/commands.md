---
title: Project commands
description: Every script in the workspace, and what it does.
---

All commands run from the repository root. The root `package.json` only holds shortcuts that
forward to the workspace packages with `pnpm --filter`.

## App (`apps/web` and `apps/desktop`)

| Command            | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `pnpm dev`         | Vite dev server for the frontend only (`apps/web`)              |
| `pnpm build`       | Type-check (`tsc`) and build the frontend into `apps/web/dist/` |
| `pnpm preview`     | Serve the built frontend                                        |
| `pnpm tauri dev`   | Run the desktop app (`apps/desktop`) with hot reload            |
| `pnpm tauri build` | Build desktop installers                                        |
| `pnpm test`        | Run the Vitest suite once                                       |
| `pnpm lint`        | Biome check of `apps/web/src` and `apps/web/tests`              |
| `pnpm lint:fix`    | Biome check with safe fixes applied                             |
| `pnpm format`      | Biome format of `apps/web/src` and `apps/web/tests`             |

## Documentation (`apps/docs`)

| Command             | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `pnpm docs:dev`     | Starlight dev server at `http://localhost:4321/Dancing_with_the_SARs/` |
| `pnpm docs:build`   | Build the static docs into `apps/docs/dist/`                           |
| `pnpm docs:preview` | Serve the built docs                                                   |

These are shortcuts for `pnpm --filter docs <script>`. The site is served under the
`/Dancing_with_the_SARs/` base path (as on GitHub Pages), so internal links in content must
include it, for example `[Download](/Dancing_with_the_SARs/getting-started/download/)`.
`.github/workflows/docs.yml` deploys it to GitHub Pages on every push to `main` that touches
the docs.

## Rust

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Cloudflare R2 (build machine only)

Needs `pnpm exec wrangler login` once. See
[Host the tiles on Cloudflare R2](/Dancing_with_the_SARs/getting-started/installation/#host-the-tiles-on-cloudflare-r2).

| Command          | What it does                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm r2:tiles`  | Bucket, CORS, public URL, then upload tiles and data files                                      |
| `pnpm r2:setup`  | Redo only the bucket, CORS and public URL                                                       |
| `pnpm r2:upload` | Upload changed tiles, then the data files                                                       |
| `pnpm r2:data`   | Upload only `manifest.json`, `tables.json` and the GeoJSON to `data/` (seconds, no app release) |

## Python (build machine only)

| Command                                                                      | What it does                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `python scripts/tiles/fetch_data.py`                                         | Download the pinned upstream release into `data/`                  |
| `python scripts/tiles/fetch_data.py --verify`                                | Re-check local file sizes against the pin                          |
| `python scripts/tiles/fetch_data.py --commit <sha>`                          | Deliberately move the pin to another commit                        |
| `python scripts/tiles/inventory.py`                                          | Check the release contract and tile budget → `data/inventory.json` |
| `python scripts/tiles/inventory.py --no-stats`                               | Tags-only inventory, no pixel reads (~5 s)                         |
| `python scripts/tiles/pipeline.py --families all`                            | Tiles, GeoJSON, tables and manifest                                |
| `python scripts/tiles/pipeline.py --families radar,terrain`                  | Rebuild only some families                                         |
| `python scripts/tiles/pipeline.py --full`                                    | Rebuild without the incremental cache                              |
| `python scripts/tiles/pipeline.py --check`                                   | Validate the manifest and spot-check tiles                         |
| `python scripts/tiles/manifest_schema.py apps/web/public/data/manifest.json` | Schema check alone                                                 |
| `python -m unittest discover -s scripts/tiles -p "test_*.py"`                | Pipeline schema tests (unittest)                                   |
| `python scripts/capture_screenshots.py`                                      | Regenerate `docs/screenshots/*.png`                                |
