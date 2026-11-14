---
title: Comparison view
description: Compare the current period with a baseline period using the split curtain or difference mode.
---

The **Comparison View** panel in the left rail sets up a before/after comparison between a
**baseline period** and the **current** timeline period.

## Turning it on

1. Open **Comparison View** in the left rail.
2. Switch **Enable comparison** on.
3. Pick a mode:
   - **Before / After:** a split curtain across the map.
   - **Difference:** labels the comparison as baseline vs current.
4. Choose a **Baseline Period** from the drop-down. It lists every period in `manifest.dates`.
   The default is `2026-09`.

A badge in the top-left of the map summarises the comparison, for example
`Before: 2026-09 vs Current: 2026-10 (vs 2026-09)`. The current side shows the active layer's
**resolved** period, so snapping is visible here too.

## The split curtain

- Drag the handle across the map, or use the **Split Curtain Position** slider (5–95 %).
- With the handle focused, the **←** and **→** keys move it in 5 % steps.

:::note[Current status]
The comparison state (mode, baseline period and curtain position) is fully wired in
`datasetStore`, and the curtain and labels render. **Drawing the baseline period's tiles on the
"before" side of the curtain is not implemented yet.** `TileOverlay` still renders only the
current period. Until it is, use the pair products, which are real computed differences:

- `radar-change-hh-monthly` / `radar-change-hv-monthly`: Oct vs Sep 2026.
- The same-track change layers, for example `2026-10-14 (vs 2026-09-20)`.
- `earthquake-evi-change-2026` / `earthquake-nbr-change-2026`: post minus pre.
- `landcover-change-2020-2026`.
:::

See [Roadmap and history](/reference/roadmap/) for the outstanding work.
