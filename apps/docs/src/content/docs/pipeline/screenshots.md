---
title: Screenshots
description: Regenerating the committed dashboard screenshots used in the README and these docs.
---

`docs/screenshots/*.png` are generated and committed. These docs reference the same files
directly, so regenerating them updates the documentation too.

## Requirements

- Python with `playwright` installed (`python -m pip install playwright`).
- Microsoft Edge. The script drives the installed Edge (`channel="msedge"`), so no
  `playwright install` browser download is needed.

The capture script adds no frontend dependencies.

## Capture

```bash
pnpm dev --host 127.0.0.1 --port 5173      # terminal 1
python scripts/capture_screenshots.py       # terminal 2; --url to point elsewhere
```

The run is a headless Edge session at **1600 × 1000** against the Vite dev server. It waits for
the **"57 layers"** status, collapses the radar and earthquake groups, then saves:

| File | View |
| --- | --- |
| `dashboard-light.png` | The default Sand Atlas theme |
| `dashboard-dark.png` | After switching to Night Atlas |
| `location-inspection.png` | Back to light, after a map click at (430, 380) |
| `data-provenance.png` | With the data provenance dialog open |

:::caution
If the layer count or button labels change, update the selectors in
`scripts/capture_screenshots.py`.
:::

For overlays to appear in the screenshots, generate the tiles first; see
[Pipeline overview](/pipeline/overview/).
