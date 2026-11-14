import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import {
  offlineTilesAvailable,
  tileProtocolUrl,
} from "@/features/offline/tileCache";
import {
  resolveTileUrl,
  SARANGANI_DAVOCC_BOUNDS,
  tileSegment,
  tileTemplate,
} from "@/shared/utils/geo";
import { resolveManifestEntry, useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";

const BELOW_LAYER_ID = "aoi-boundary-casing";
const FALLBACK_BELOW_ID = "cities-labels";
const LAYER_PREFIX = "nisar-";
const SOURCE_SUFFIX = "-source";
// Remote tile host baked in at build time (see vite-env.d.ts); unset = public/tiles/.
const TILE_BASE_URL = import.meta.env.VITE_TILE_BASE_URL;

export interface TileOverlayProps {
  map: MapLibreMap | null;
  ready: boolean;
}

function layerIdFor(id: string): string {
  return `${LAYER_PREFIX}${id}`;
}

function sourceIdFor(id: string): string {
  return `${layerIdFor(id)}${SOURCE_SUFFIX}`;
}

function resolveOriginPrefix(): string {
  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    window.location.origin.startsWith("http")
  ) {
    return window.location.origin;
  }
  return "";
}

function removeOverlays(map: MapLibreMap, ids: string[]): void {
  for (const id of ids) {
    const layerId = layerIdFor(id);
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    const sourceId = sourceIdFor(id);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }
}

export function TileOverlay({ map, ready }: TileOverlayProps) {
  const layers = useLayerStore((state) => state.layers);
  const currentDate = useDatasetStore((state) => state.currentDate);
  const manifest = useDatasetStore((state) => state.manifest);

  const builtTilePathsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!map || !ready) return;
    const origin = resolveOriginPrefix();
    if (!origin) return;

    const beforeLabels = map.getLayer("cities-labels")
      ? "cities-labels"
      : undefined;

    if (!map.getSource("aoi-boundary-source")) {
      map.addSource("aoi-boundary-source", {
        type: "geojson",
        data: `${origin}/data/boundary.geojson`,
      });
    }
    if (!map.getLayer("aoi-boundary-casing")) {
      map.addLayer(
        {
          id: "aoi-boundary-casing",
          type: "line",
          source: "aoi-boundary-source",
          layout: {
            visibility: "visible",
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#1a1710",
            "line-width": 3.2,
            "line-opacity": 0.65,
          },
        },
        beforeLabels,
      );
    }
    if (!map.getLayer("aoi-boundary")) {
      map.addLayer(
        {
          id: "aoi-boundary",
          type: "line",
          source: "aoi-boundary-source",
          layout: {
            visibility: "visible",
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#f7f3ea",
            "line-width": 1.6,
            "line-dasharray": [3, 2],
            "line-opacity": 0.92,
          },
        },
        beforeLabels,
      );
    }

    if (!map.getSource("landslide-polygons-source")) {
      map.addSource("landslide-polygons-source", {
        type: "geojson",
        data: `${origin}/data/landslides.geojson`,
      });
    }
    if (!map.getLayer("landslide-polygons")) {
      map.addLayer(
        {
          id: "landslide-polygons",
          type: "fill",
          source: "landslide-polygons-source",
          layout: { visibility: "visible" },
          paint: {
            "fill-color": "#e31a1c",
            "fill-outline-color": "#fffdf8",
            "fill-opacity": 0.78,
          },
        },
        beforeLabels,
      );
    }
  }, [map, ready]);

  useEffect(() => {
    if (!map || !ready) return;

    const origin = resolveOriginPrefix();
    const useTileCache = offlineTilesAvailable();
    const bounds = manifest?.bounds ?? SARANGANI_DAVOCC_BOUNDS;

    const dataLayers = layers.filter(
      (layer) =>
        layer.kind === "manifest-layer" || layer.kind === "change-type",
    );

    const beforeId = map.getLayer(BELOW_LAYER_ID)
      ? BELOW_LAYER_ID
      : map.getLayer("admin-boundaries")
        ? "admin-boundaries"
        : map.getLayer(FALLBACK_BELOW_ID)
          ? FALLBACK_BELOW_ID
          : undefined;

    const visibleIds = new Set(
      dataLayers.filter((l) => l.visible).map((l) => l.id),
    );
    for (const oldId of Object.keys(builtTilePathsRef.current)) {
      if (!visibleIds.has(oldId)) {
        removeOverlays(map, [oldId]);
        delete builtTilePathsRef.current[oldId];
      }
    }

    for (const layer of dataLayers) {
      const layerId = layerIdFor(layer.id);
      const sourceId = sourceIdFor(layer.id);

      if (!layer.visible) {
        if (map.getLayer(layerId)) {
          removeOverlays(map, [layer.id]);
          delete builtTilePathsRef.current[layer.id];
        }
        continue;
      }

      const { entry, resolvedPeriod } = resolveManifestEntry(
        manifest,
        layer.id,
        currentDate,
      );
      const period =
        resolvedPeriod ?? layer.periods?.[0] ?? currentDate ?? "static";
      const relPath = entry?.tilePath
        ? entry.tilePath
        : tileTemplate(layer.id, tileSegment(period));
      const tilePath = useTileCache
        ? tileProtocolUrl(relPath)
        : resolveTileUrl(relPath, TILE_BASE_URL, origin);

      if (builtTilePathsRef.current[layer.id] !== tilePath) {
        removeOverlays(map, [layer.id]);
        builtTilePathsRef.current[layer.id] = tilePath;
      }

      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", layer.opacity);
        map.setLayoutProperty(layerId, "visibility", "visible");
        continue;
      }

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "raster",
          tiles: [tilePath],
          tileSize: 256,
          bounds,
          minzoom: entry?.minZoom ?? layer.minZoom ?? 5,
          maxzoom: entry?.maxZoom ?? layer.maxZoom ?? 13,
        });
      }

      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": layer.opacity,
            "raster-resampling":
              (entry?.valueType ?? layer.valueType) === "categorical"
                ? "nearest"
                : "linear",
          },
          layout: { visibility: "visible" },
        },
        beforeId,
      );
    }
  }, [map, ready, layers, currentDate, manifest]);

  return null;
}
