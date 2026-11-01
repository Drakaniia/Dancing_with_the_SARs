import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { type RefObject, useEffect, useState } from "react";
import type { LayerConfig } from "@/shared/types/layer";
import {
  PHILIPPINES_BOUNDS,
  PHILIPPINES_CENTER,
  PHILIPPINES_ZOOM,
} from "@/shared/utils/geo";
import { useLayerStore } from "@/stores/layerStore";

maplibregl.setWorkerUrl(workerUrl);

/** MapLibre style document, served from `public/styles/basemap.json`. */
export const BASEMAP_STYLE_URL = "/styles/basemap.json";

export type MapStatus = "initializing" | "ready" | "unsupported" | "error";

/**
 * Store layer id → MapLibre style layer id, for the layers the style owns. The NISAR overlay
 * layers are built by `TileOverlay` instead, because their sources are date-dependent.
 */
export const STYLE_LAYER_BY_STORE_ID: Record<string, string> = {
  "satellite-base": "basemap",
  "admin-boundaries": "admin-boundaries",
  "cities-labels": "cities-labels",
};

export interface LayerBinding {
  /** MapLibre style layer id. */
  layerId: string;
  visible: boolean;
}

/** Pure mapping from store layers to the style layers they drive. */
export function resolveLayerBindings(layers: LayerConfig[]): LayerBinding[] {
  const bindings: LayerBinding[] = [];
  for (const layer of layers) {
    const layerId = STYLE_LAYER_BY_STORE_ID[layer.id];
    if (layerId) bindings.push({ layerId, visible: layer.visible });
  }
  return bindings;
}

/** Applies store-driven visibility to the style layers, skipping any the style does not define. */
export function applyLayerBindings(
  map: Pick<maplibregl.Map, "getLayer" | "setLayoutProperty">,
  bindings: LayerBinding[],
): void {
  for (const binding of bindings) {
    if (!map.getLayer(binding.layerId)) continue;
    map.setLayoutProperty(
      binding.layerId,
      "visibility",
      binding.visible ? "visible" : "none",
    );
  }
}

/**
 * Whether the environment can host a WebGL map. Checked before constructing MapLibre so a
 * headless/test environment (or a device without WebGL) falls back to a message instead of
 * throwing from deep inside the renderer.
 */
export function webglSupported(): boolean {
  return (
    typeof WebGL2RenderingContext !== "undefined" ||
    typeof WebGLRenderingContext !== "undefined"
  );
}

export function createMap(container: HTMLElement): maplibregl.Map {
  return new maplibregl.Map({
    container,
    style: BASEMAP_STYLE_URL,
    center: PHILIPPINES_CENTER,
    zoom: PHILIPPINES_ZOOM,
    maxBounds: PHILIPPINES_BOUNDS,
    attributionControl: false,
  });
}

export interface UseMapLibreResult {
  /** The live map, or `null` before the style has loaded / when WebGL is unavailable. */
  map: maplibregl.Map | null;
  status: MapStatus;
}

/**
 * Owns the MapLibre lifecycle: creates the map on mount, destroys it on unmount, and keeps the
 * style's chrome layers (basemap, boundaries, labels) in sync with `layerStore`.
 */
export function useMapLibre(
  containerRef: RefObject<HTMLElement | null>,
): UseMapLibreResult {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [status, setStatus] = useState<MapStatus>("initializing");
  const layers = useLayerStore((state) => state.layers);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!webglSupported()) {
      setStatus("unsupported");
      return;
    }

    let instance: maplibregl.Map;
    try {
      instance = createMap(container);
    } catch (error) {
      console.error("Failed to create the MapLibre map", error);
      setStatus("error");
      return;
    }

    const handleLoad = () => setStatus("ready");
    instance.on("load", handleLoad);
    if (instance.loaded()) setStatus("ready");
    setMap(instance);

    return () => {
      instance.off("load", handleLoad);
      instance.remove();
      setMap(null);
      setStatus("initializing");
    };
  }, [containerRef]);

  // Style layers only exist once the style has loaded, so the first application waits for `ready`.
  useEffect(() => {
    if (!map || status !== "ready") return;
    applyLayerBindings(map, resolveLayerBindings(layers));
  }, [map, status, layers]);

  return { map, status };
}
