import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { type RefObject, useEffect, useState } from "react";
import {
  createTileProtocolHandler,
  offlineTilesAvailable,
  TILE_PROTOCOL,
} from "@/features/offline/tileCache";
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

// Desktop + remote tile host: overlays load via nisar-tile:// (offline cache first).
if (offlineTilesAvailable()) {
  maplibregl.addProtocol(TILE_PROTOCOL, createTileProtocolHandler());
}

// BASE_URL is `/` on desktop and the sub-path on GitHub Pages.
export const BASEMAP_STYLE_URL = `${import.meta.env.BASE_URL}styles/basemap.json`;

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

export const TERRAIN_SOURCE_ID = "terrain-dem";
export const TERRAIN_EXAGGERATION = 1.5;
export const TERRAIN_PITCH = 50;
export const MAX_PITCH = 75;

type TerrainMap = Pick<
  maplibregl.Map,
  "getSource" | "getTerrain" | "setTerrain" | "easeTo"
>;

/**
 * Switch between the flat map and 3D terrain. The NISAR rasters and GeoJSON
 * layers stay in place: MapLibre drapes them over the DEM surface.
 * Returns false when nothing changed (already in that mode, or no DEM source).
 */
export function applyTerrain(
  map: TerrainMap,
  enabled: boolean,
  duration = 800,
): boolean {
  if (Boolean(map.getTerrain()) === enabled) return false;
  if (enabled && !map.getSource(TERRAIN_SOURCE_ID)) return false;
  map.setTerrain(
    enabled
      ? { source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION }
      : null,
  );
  map.easeTo({ pitch: enabled ? TERRAIN_PITCH : 0, duration });
  return true;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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
    maxPitch: MAX_PITCH,
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
  const terrain3d = useUiStore((state) => state.terrain3d);

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
        // 3D is on by default: tilt now and step back a little so both provinces stay in view.
        if (useUiStore.getState().terrain3d) {
          const center = instance.getCenter();
          instance.jumpTo({
            pitch: TERRAIN_PITCH,
            zoom: instance.getZoom() - 0.25,
            center: [center.lng, center.lat - 0.08],
          });
        }
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
    if (!map || status !== "ready") return;
    try {
      applyTerrain(map, terrain3d, prefersReducedMotion() ? 0 : 800);
    } catch (error) {
      console.error("Failed to toggle 3D terrain", error);
    }
  }, [map, status, terrain3d]);

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
