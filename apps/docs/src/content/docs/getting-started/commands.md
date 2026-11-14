---
title: Project commands
description: Every script in the workspace, and what it does.
---

All commands run from the repository root.

## App (root package)

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server for the frontend only |
| `pnpm build` | Type-check (`tsc`) and build the frontend into `dist/` |
| `pnpm preview` | Serve the built frontend |
| `pnpm tauri dev` | Run the desktop app with hot reload |
| `pnpm tauri build` | Build desktop installers |
| `pnpm test` | Run the Vitest suite once |
| `pnpm lint` | Biome check of `src` and `tests` |
| `pnpm lint:fix` | Biome check with safe fixes applied |
| `pnpm format` | Biome format of `src` and `tests` |

## Documentation (`apps/docs`)

| Command | What it does |
| --- | --- |
| `pnpm docs:dev` | Starlight dev server at `http://localhost:4321` |
| `pnpm docs:build` | Build the static docs into `apps/docs/dist/` |
| `pnpm docs:preview` | Serve the built docs |

These are shortcuts for `pnpm --filter docs <script>`.

## Rust

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## Python (build machine only)

| Command | What it does |
| --- | --- |
| `python scripts/tiles/fetch_data.py` | Download the pinned upstream release into `data/` |
| `python scripts/tiles/fetch_data.py --verify` | Re-check local file sizes against the pin |
| `python scripts/tiles/fetch_data.py --commit <sha>` | Deliberately move the pin to another commit |
| `python scripts/tiles/inventory.py` | Check the release contract and tile budget → `data/inventory.json` |
| `python scripts/tiles/inventory.py --no-stats` | Tags-only inventory, no pixel reads (~5 s) |
| `python scripts/tiles/pipeline.py --families all` | Tiles, GeoJSON, tables and manifest |
| `python scripts/tiles/pipeline.py --families radar,terrain` | Rebuild only some families |
| `python scripts/tiles/pipeline.py --full` | Rebuild without the incremental cache |
| `python scripts/tiles/pipeline.py --check` | Validate the manifest and spot-check tiles |
| `python scripts/tiles/manifest_schema.py public/data/manifest.json` | Schema check alone |
| `python -m unittest discover -s scripts/tiles -p "test_*.py"` | Pipeline schema tests (unittest) |
| `python scripts/capture_screenshots.py` | Regenerate `docs/screenshots/*.png` |
