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
the **"57 layers"** status, collapses the radar and earthquake groups, then saves the files
below, in this order. Each image is the committed copy, so this page always shows the current
output.

## Output

### Light dashboard

`dashboard-light.png`: the default Sand Atlas theme.

![The Sand Atlas light dashboard](../../../../../../docs/screenshots/dashboard-light.png)

### Dark dashboard

`dashboard-dark.png`: after switching to Night Atlas.

![The Night Atlas dark dashboard](../../../../../../docs/screenshots/dashboard-dark.png)

### Location inspection

`location-inspection.png`: back to light, after a map click at (430, 380).

![A selected location with coordinates and sampled layer readings](../../../../../../docs/screenshots/location-inspection.png)

### Data provenance

`data-provenance.png`: with the data provenance dialog open.

![The data provenance dialog](../../../../../../docs/screenshots/data-provenance.png)

### Layers panels

`layers-change-types.png`, `layers-map-layers.png` and `layers-legend.png`: cropped panels for
the layers guide.

![The Surface Change Types panel](../../../../../../docs/screenshots/layers-change-types.png)

![The Map Layers panel](../../../../../../docs/screenshots/layers-map-layers.png)

![The legend for the active layer](../../../../../../docs/screenshots/layers-legend.png)

### Timeline

`timeline-panel.png` and `timeline-animation-bar.png`: the cropped Time Series panel and the map
animation bar.

![The Time Series panel](../../../../../../docs/screenshots/timeline-panel.png)

![The animation bar over the map](../../../../../../docs/screenshots/timeline-animation-bar.png)

### Search

`search-results.png`: the search box with results for "Sarangani".

![Search results for "Sarangani"](../../../../../../docs/screenshots/search-results.png)

### Measure tool

`tools-panel.png` and `measure-distance.png`: Measure active, and the distance badge after two
clicks.

![The Tools panel with Measure active](../../../../../../docs/screenshots/tools-panel.png)

![The measurement badge between two clicked points](../../../../../../docs/screenshots/measure-distance.png)

### Bookmarks

`bookmarks-menu.png`: the Bookmarks menu with the Malalan viewpoint saved.

![The Bookmarks menu with a saved viewpoint](../../../../../../docs/screenshots/bookmarks-menu.png)

### Comparison view

`comparison-panel.png`: the Comparison View panel, enabled. `comparison-view.png`: the full
dashboard with the split curtain, after a fresh reload.

![The Comparison View panel](../../../../../../docs/screenshots/comparison-panel.png)

![The map split by the comparison curtain](../../../../../../docs/screenshots/comparison-view.png)

## Notes

:::caution
If the layer count or button labels change, update the selectors in
`scripts/capture_screenshots.py`.
:::

For overlays to appear in the screenshots, generate the tiles first; see
[Pipeline overview](/Dancing_with_the_SARs/pipeline/overview/).
