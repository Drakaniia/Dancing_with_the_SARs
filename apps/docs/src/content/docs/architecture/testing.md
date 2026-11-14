---
title: Testing and quality
description: The Vitest suites, Biome lint and format, Rust checks, and pipeline validation.
---

## Frontend tests (Vitest)

```bash
pnpm test           # vitest run
```

Configuration lives in `vite.config.ts`. It uses the `jsdom` environment, the
`tests/setup.ts` setup file, and runs `tests/**/*.test.{ts,tsx}`. Component tests use Testing
Library. `axe-core` is available for accessibility assertions.

| Suite | Covers |
| --- | --- |
| `tests/features/map/map.test.tsx` | Map layer bindings, scale and tile-path helpers |
| `tests/features/panels/panels.test.tsx` | Panel content and the manifest contract |
| `tests/features/shell/shell.test.tsx` | `AppShell` layout |
| `tests/features/timeline/playback.test.ts` | `nextDate` and the playback store |
| `tests/shared/utils/dates.test.ts` | Period resolution and sorting helpers |
| `tests/shared/utils/colorScales.test.ts` | Gradients from ramps and classes |
| `tests/shared/utils/geo.test.ts` | Geo helpers |
| `tests/shared-ui/primitives-states.test.tsx` | States of every primitive: Button, IconButton, Checkbox, Slider, Switch, SegmentedControl, Panel, StatusPill, Badge, Progress, Tooltip, Popover |
| `tests/shared-ui/panel.test.tsx`, `slider.test.tsx`, `switch.test.tsx` | Focused behaviour of those primitives |

## Lint and format (Biome)

```bash
pnpm lint           # biome check src tests
pnpm lint:fix       # apply safe fixes
pnpm format         # biome format --write src tests
```

Rules live in `biome.jsonc`.

## Type-check and build

```bash
pnpm build          # tsc && vite build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Pipeline validation

```bash
python -m unittest discover -s scripts/tiles -p "test_*.py"   # schema unit tests
python scripts/tiles/pipeline.py --check                      # manifest + tile spot check
```

`test_manifest_schema.py` covers the validator's edge cases. Examples:

- A minimal manifest passes.
- Pair-product periods (`… (vs …)`) are allowed.
- Percent-encoded tile paths are rejected.
- Tile paths with spaces are rejected.
- Tile paths naming another layer id are rejected.

## Documentation build

```bash
pnpm docs:build
```

Starlight fails the build on broken sidebar links and invalid frontmatter, so run this before
committing docs changes.
