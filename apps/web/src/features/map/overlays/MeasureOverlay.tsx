import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

export const MEASURE_SOURCE = "measure-source";
export const MEASURE_LINE_LAYER = "measure-line";
export const MEASURE_POINT_LAYER = "measure-points";

type MeasureFeature =
  | {
      type: "Feature";
      properties: { index: number };
      geometry: { type: "Point"; coordinates: number[] };
    }
  | {
      type: "Feature";
      properties: Record<string, never>;
      geometry: { type: "LineString"; coordinates: number[][] };
    };

export interface MeasureFeatureCollection {
  type: "FeatureCollection";
  features: MeasureFeature[];
}

/** The measured points as map features: a dot per point and the line between two. */
export function measureGeoJson(points: readonly [number, number][]): MeasureFeatureCollection {
  const features: MeasureFeature[] = points.map((coordinates, index) => ({
    type: "Feature",
    properties: { index },
    geometry: { type: "Point", coordinates: [...coordinates] },
  }));
  if (points.length >= 2) {
    features.unshift({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: points.map((p) => [...p]) },
    });
  }
  return { type: "FeatureCollection", features };
}

function ensureLayers(map: MapLibreMap): void {
  if (!map.getSource(MEASURE_SOURCE)) {
    map.addSource(MEASURE_SOURCE, { type: "geojson", data: measureGeoJson([]) });
  }
  if (!map.getLayer(MEASURE_LINE_LAYER)) {
    map.addLayer({
      id: MEASURE_LINE_LAYER,
      type: "line",
      source: MEASURE_SOURCE,
      filter: ["==", ["geometry-type"], "LineString"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#c2410c",
        "line-width": 2.5,
        "line-dasharray": [2, 1.5],
      },
    });
  }
  if (!map.getLayer(MEASURE_POINT_LAYER)) {
    map.addLayer({
      id: MEASURE_POINT_LAYER,
      type: "circle",
      source: MEASURE_SOURCE,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#c2410c",
        "circle-stroke-color": "#fffaf0",
        "circle-stroke-width": 2,
        "circle-pitch-alignment": "map",
      },
    });
  }
}

/**
 * Draws the Measure tool's points and the line between them. The layers go on top of every
 * other layer; they are emptied (not removed) when the tool is off.
 */
export function MeasureOverlay({ map, ready }: { map: MapLibreMap | null; ready: boolean }) {
  const measurePoints = useUiStore((state) => state.measurePoints);
  const measuring = useUiStore((state) => state.activeTool === "measure");

  useEffect(() => {
    if (!map || !ready) return;
    try {
      ensureLayers(map);
      const source = map.getSource(MEASURE_SOURCE) as GeoJSONSource | undefined;
      source?.setData(measureGeoJson(measuring ? measurePoints : []));
      // Other overlays add layers later; keep the measurement drawn above them.
      const order = map.getLayersOrder?.() ?? [];
      const top = order.slice(-2);
      if (top[0] !== MEASURE_LINE_LAYER || top[1] !== MEASURE_POINT_LAYER) {
        map.moveLayer(MEASURE_LINE_LAYER);
        map.moveLayer(MEASURE_POINT_LAYER);
      }
    } catch (error) {
      console.error("Failed to draw the measurement", error);
    }
  }, [map, ready, measurePoints, measuring]);

  // Crosshair cursor while a map-click tool is active.
  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvasContainer?.();
    if (!canvas) return;
    canvas.style.cursor = measuring ? "crosshair" : "";
    return () => {
      canvas.style.cursor = "";
    };
  }, [map, measuring]);

  return null;
}
