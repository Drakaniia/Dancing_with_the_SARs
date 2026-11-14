import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { type RefObject, useEffect, useState } from "react";
import type { LayerConfig } from "@/shared/types/layer";
import {
  PHILIPPINES_BOUNDS,
  SARANGANI_CENTER,
  SARANGANI_DAVOCC_BOUNDS,
  SARANGANI_ZOOM,
} from "@/shared/utils/geo";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUiStore } from "@/stores/uiStore";

maplibregl.setWorkerUrl(workerUrl);

export const BASEMAP_STYLE_URL = "/styles/basemap.json";

export type MapStatus = "initializing" | "ready" | "unsupported" | "error";

export const STYLE_LAYER_BY_STORE_ID: Record<string, string> = {
  "satellite-base": "basemap",
  "admin-boundaries": "admin-boundaries",
  "aoi-boundary": "aoi-boundary",
  "landslide-polygons": "landslide-polygons",
  "cities-labels": "cities-labels",
};

export interface LayerBinding {
  layerId: string;
  visible: boolean;
}

export function resolveLayerBindings(layers: LayerConfig[]): LayerBinding[] {
  const bindings: LayerBinding[] = [];
  for (const layer of layers) {
    const layerId = STYLE_LAYER_BY_STORE_ID[layer.id];
    if (layerId) {
      bindings.push({ layerId, visible: layer.visible });
    }
  }
  return bindings;
}

export function applyLayerBindings(
  map: Pick<maplibregl.Map, "getLayer" | "setLayoutProperty">,
  bindings: LayerBinding[],
): void {
  for (const binding of bindings) {
    if (map.getLayer(binding.layerId)) {
      map.setLayoutProperty(
        binding.layerId,
        "visibility",
        binding.visible ? "visible" : "none",
      );
    }
    if (
      binding.layerId === "aoi-boundary" &&
      map.getLayer("aoi-boundary-casing")
    ) {
      map.setLayoutProperty(
        "aoi-boundary-casing",
        "visibility",
        binding.visible ? "visible" : "none",
      );
    }
  }
}

export function webglSupported(): boolean {
  return (
    typeof WebGL2RenderingContext !== "undefined" ||
    typeof WebGLRenderingContext !== "undefined"
  );
}

export function createMap(container: HTMLElement): maplibregl.Map {
  const origin =
    typeof window !== "undefined" && window.location.origin.startsWith("http")
      ? window.location.origin
      : "";
  return new maplibregl.Map({
    container,
    style: `${origin}${BASEMAP_STYLE_URL}`,
    center: SARANGANI_CENTER,
    zoom: SARANGANI_ZOOM,
    maxBounds: PHILIPPINES_BOUNDS,
    attributionControl: false,
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });
}

export interface UseMapLibreResult {
  map: maplibregl.Map | null;
  status: MapStatus;
}

export function useMapLibre(
  containerRef: RefObject<HTMLElement | null>,
): UseMapLibreResult {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [status, setStatus] = useState<MapStatus>("initializing");
  const layers = useLayerStore((state) => state.layers);
  const flyToTarget = useUiStore((state) => state.flyToTarget);

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

    const handleLoad = () => {
      setStatus("ready");
      const bounds =
        useDatasetStore.getState().manifest?.bounds ?? SARANGANI_DAVOCC_BOUNDS;
      try {
        instance.fitBounds(
          [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]],
          ],
          { padding: 36, duration: 0 },
        );
      } catch {
        // ignore in headless mock
      }
    };

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      const { lng, lat } = event.lngLat;
      const activeTool = useUiStore.getState().activeTool;
      if (activeTool === "measure") {
        useUiStore.getState().addMeasurePoint([lng, lat]);
      }
      void useSelectionStore.getState().inspectCoordinate(lng, lat);
    };

    instance.on("load", handleLoad);
    instance.on("click", handleClick);
    if (instance.loaded()) handleLoad();
    setMap(instance);

    return () => {
      instance.off("load", handleLoad);
      instance.off("click", handleClick);
      instance.remove();
      setMap(null);
      setStatus("initializing");
    };
  }, [containerRef]);

  useEffect(() => {
    if (!map || status !== "ready") return;
    applyLayerBindings(map, resolveLayerBindings(layers));
  }, [map, status, layers]);

  useEffect(() => {
    if (!map || status !== "ready" || !flyToTarget) return;
    try {
      map.flyTo({
        center: [flyToTarget.lng, flyToTarget.lat],
        zoom: flyToTarget.zoom ?? 11.5,
        duration: 900,
      });
    } catch {
      // ignore in headless test
    }
  }, [map, status, flyToTarget]);

  return { map, status };
}
