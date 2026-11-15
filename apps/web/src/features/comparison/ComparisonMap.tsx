import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { addReferenceLayers, layerOrder, tilePathFor } from "@/features/map/overlays/TileOverlay";
import {
  applyLayerBindings,
  applyTerrain,
  BASEMAP_STYLE_URL,
  MAX_PITCH,
  resolveLayerBindings,
} from "@/features/map/useMapLibre";
import { syncTopicImage } from "@/features/topics/TopicOverlays";
import { findTopic, findView } from "@/features/topics/topicsConfig";
import type { LayerConfig } from "@/shared/types/layer";
import type { Manifest } from "@/shared/types/manifest";
import { PHILIPPINES_BOUNDS, SARANGANI_DAVOCC_BOUNDS } from "@/shared/utils/geo";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useTopicStore } from "@/stores/topicStore";
import { useUiStore } from "@/stores/uiStore";

const LAYER_PREFIX = "compare-";
const BELOW_IDS = ["aoi-boundary-casing", "admin-boundaries", "cities-labels"];

/** The CSS clip that shows the baseline map only to the left of the curtain. */
export function curtainClip(splitPosition: number): string {
  const pct = Math.min(100, Math.max(0, splitPosition));
  return `inset(0 ${(100 - pct).toFixed(2)}% 0 0)`;
}

/** Copy the main map's camera, so the two maps line up pixel for pixel. */
function syncCamera(from: maplibregl.Map, to: maplibregl.Map): void {
  to.jumpTo({
    center: from.getCenter(),
    zoom: from.getZoom(),
    bearing: from.getBearing(),
    pitch: from.getPitch(),
  });
}

/** One raster layer per visible data layer, at the baseline date (no timeline cross-fades). */
export function syncBaselineLayers(
  map: Pick<
    maplibregl.Map,
    "getLayer" | "getSource" | "addSource" | "addLayer" | "removeLayer" | "removeSource"
  > & { setPaintProperty: maplibregl.Map["setPaintProperty"] },
  layers: LayerConfig[],
  manifest: Manifest | null,
  date: string | null,
  order: string[],
): void {
  const bounds = manifest?.bounds ?? SARANGANI_DAVOCC_BOUNDS;
  const beforeId = BELOW_IDS.find((id) => map.getLayer(id));
  const wanted = new Map<
    string,
    { layer: LayerConfig; tilePath: string; minZoom?: number; maxZoom?: number }
  >();
  for (const layer of layers) {
    if (!layer.visible) continue;
    if (layer.kind !== "manifest-layer" && layer.kind !== "change-type") continue;
    const { tilePath, entry } = tilePathFor(layer, manifest, date);
    wanted.set(`${LAYER_PREFIX}${layer.id}|${tilePath}`, {
      layer,
      tilePath,
      minZoom: entry?.minZoom ?? layer.minZoom,
      maxZoom: entry?.maxZoom ?? layer.maxZoom,
    });
  }

  // Drop layers that were switched off or now point at another date.
  for (const id of order) {
    if (id.startsWith(LAYER_PREFIX) && !wanted.has(id)) {
      map.removeLayer(id);
      if (map.getSource(`${id}-source`)) map.removeSource(`${id}-source`);
    }
  }

  for (const [id, { layer, tilePath, minZoom, maxZoom }] of wanted) {
    if (!map.getLayer(id)) {
      map.addSource(`${id}-source`, {
        type: "raster",
        tiles: [tilePath],
        tileSize: 256,
        bounds,
        minzoom: minZoom ?? 5,
        maxzoom: maxZoom ?? 13,
      });
      map.addLayer(
        {
          id,
          type: "raster",
          source: `${id}-source`,
          paint: {
            "raster-opacity": layer.opacity,
            "raster-fade-duration": 0,
            "raster-contrast": 0.12,
            "raster-saturation": 0.15,
            "raster-resampling": layer.valueType === "categorical" ? "nearest" : "linear",
          },
        },
        beforeId,
      );
    } else {
      map.setPaintProperty(id, "raster-opacity", layer.opacity);
    }
  }
}

/**
 * The "before" side of the comparison swipe: a second, non-interactive map stacked on the main
 * one and clipped to the left of the curtain. It follows the main map's camera and draws the same
 * basemap, data layers and Explore picture map at the baseline period. In Difference mode it is
 * blended with `mix-blend-mode: difference`, so unchanged pixels go black and change stands out.
 */
export function ComparisonMap({ main }: { main: maplibregl.Map | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [compare, setCompare] = useState<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  const comparisonMode = useDatasetStore((state) => state.comparisonMode);
  const splitPosition = useDatasetStore((state) => state.splitPosition);
  const comparisonDate = useDatasetStore((state) => state.comparisonDate);
  const manifest = useDatasetStore((state) => state.manifest);
  const layers = useLayerStore((state) => state.layers);
  const terrain3d = useUiStore((state) => state.terrain3d);
  const topicId = useTopicStore((state) => state.topicId);
  const viewId = useTopicStore((state) => state.viewId);
  const option = useTopicStore((state) => state.option);

  // Create the baseline map once the main one exists; it lives as long as comparison is on.
  useEffect(() => {
    const container = containerRef.current;
    if (!main || !container) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container,
        // Same absolute style URL as the main map (see createMap).
        style: `${window.location.origin.startsWith("http") ? window.location.origin : ""}${BASEMAP_STYLE_URL}`,
        center: main.getCenter(),
        zoom: main.getZoom(),
        bearing: main.getBearing(),
        pitch: main.getPitch(),
        maxBounds: PHILIPPINES_BOUNDS,
        maxPitch: MAX_PITCH,
        interactive: false,
        attributionControl: false,
      });
    } catch (error) {
      console.error("Failed to create the comparison map", error);
      return;
    }

    const follow = () => syncCamera(main, instance);
    const onLoad = () => {
      addReferenceLayers(instance);
      follow();
      setLoaded(true);
    };
    instance.on("load", onLoad);
    main.on("move", follow);
    setCompare(instance);

    return () => {
      main.off("move", follow);
      instance.off("load", onLoad);
      instance.remove();
      setCompare(null);
      setLoaded(false);
    };
  }, [main]);

  // Basemap / boundary / label switches and the data layers at the baseline date.
  useEffect(() => {
    if (!compare || !loaded) return;
    try {
      applyLayerBindings(compare, resolveLayerBindings(layers));
      const date = comparisonDate ?? manifest?.dates[0] ?? null;
      syncBaselineLayers(compare, layers, manifest, date, layerOrder(compare));
    } catch (error) {
      console.error("Failed to update the comparison layers", error);
    }
  }, [compare, loaded, layers, manifest, comparisonDate]);

  // The Explore panel's picture map, at the baseline date (outlook months snap to the nearest).
  useEffect(() => {
    if (!compare || !loaded) return;
    try {
      const view = findView(findTopic(topicId), viewId);
      const opt = view.options[option] ?? view.options[0];
      const date = comparisonDate ?? manifest?.dates[0] ?? null;
      syncTopicImage(compare, opt, date, BELOW_IDS.find((id) => compare.getLayer(id)));
    } catch (error) {
      console.error("Failed to update the comparison picture map", error);
    }
  }, [compare, loaded, topicId, viewId, option, comparisonDate, manifest]);

  // Same 3D terrain as the main map, so both sides drape over the same surface.
  useEffect(() => {
    if (!compare || !loaded || !main) return;
    try {
      applyTerrain(compare, terrain3d, 0);
      syncCamera(main, compare);
    } catch (error) {
      console.error("Failed to toggle terrain on the comparison map", error);
    }
  }, [compare, loaded, main, terrain3d]);

  return (
    <div
      aria-hidden="true"
      data-testid="comparison-map"
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{
        clipPath: curtainClip(splitPosition),
        mixBlendMode: comparisonMode === "difference" ? "difference" : undefined,
      }}
    >
      {/* MapLibre makes its container position: relative, so it cannot be the inset box. */}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
