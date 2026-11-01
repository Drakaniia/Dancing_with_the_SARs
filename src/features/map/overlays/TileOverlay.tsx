import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { tileTemplate } from "@/shared/utils/geo";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";

/** Overlay layers are inserted beneath this style layer so the reference labels stay on top. */
const BELOW_LAYER_ID = "admin-boundaries";
const LAYER_PREFIX = "nisar-";
const SOURCE_SUFFIX = "-source";

export interface TileOverlayProps {
  map: MapLibreMap | null;
  /** True once the style has loaded; sources cannot be added before that. */
  ready: boolean;
}

function layerIdFor(id: string): string {
  return `${LAYER_PREFIX}${id}`;
}

function sourceIdFor(id: string): string {
  return `${layerIdFor(id)}${SOURCE_SUFFIX}`;
}

function removeOverlays(map: MapLibreMap, ids: string[]): void {
  for (const id of ids) {
    const layerId = layerIdFor(id);
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    const sourceId = sourceIdFor(id);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }
}

/**
 * The NISAR raster overlay. Renders nothing: it reconciles one raster source + layer per
 * change-type layer in `layerStore`, sitting between the basemap and the reference layers.
 *
 * The tile template embeds the current date, so a date change rebuilds the sources (MapLibre
 * cannot retarget an existing raster source). Opacity and visibility are applied in place, so
 * scrubbing the opacity slider never rebuilds anything.
 */
export function TileOverlay({ map, ready }: TileOverlayProps) {
  const layers = useLayerStore((state) => state.layers);
  const currentDate = useDatasetStore((state) => state.currentDate);
  const builtDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !ready) return;

    const changeLayers = layers.filter((layer) => layer.kind === "change-type");

    if (builtDateRef.current !== currentDate) {
      removeOverlays(
        map,
        changeLayers.map((layer) => layer.id),
      );
      builtDateRef.current = currentDate;
    }

    const beforeId = map.getLayer(BELOW_LAYER_ID) ? BELOW_LAYER_ID : undefined;

    for (const layer of changeLayers) {
      if (!layer.changeType) continue;
      const layerId = layerIdFor(layer.id);
      const sourceId = sourceIdFor(layer.id);

      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", layer.opacity);
        map.setLayoutProperty(
          layerId,
          "visibility",
          layer.visible ? "visible" : "none",
        );
        continue;
      }

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "raster",
          tiles: [tileTemplate(layer.changeType, currentDate ?? "")],
          tileSize: 256,
        });
      }

      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: { "raster-opacity": layer.opacity },
          layout: { visibility: layer.visible ? "visible" : "none" },
        },
        beforeId,
      );
    }
  }, [map, ready, layers, currentDate]);

  return null;
}
