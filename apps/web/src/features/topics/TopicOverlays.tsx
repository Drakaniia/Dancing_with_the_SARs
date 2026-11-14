import type {
  GeoJSONSource,
  ImageSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import { useEffect } from "react";
import { resolveTileUrl, SARANGANI_DAVOCC_BOUNDS } from "@/shared/utils/geo";
import { resolveManifestEntry, useDatasetStore } from "@/stores/datasetStore";
import { useTopicStore } from "@/stores/topicStore";
import {
  EPICENTRE,
  EXTRA_IMAGE_CORNERS,
  findTopic,
  findView,
} from "./topicsConfig";

const BELOW_ID = "aoi-boundary-casing";
const IMAGE_SOURCE = "topic-image-source";
const IMAGE_LAYER = "topic-image";
const UNDERLAY_SOURCE = "topic-landcover-underlay-source";
const UNDERLAY_LAYER = "topic-landcover-underlay";
const CHANGE_LAYER = "nisar-landcover-change-2020-2026";
const DOTS_SOURCE = "topic-landslides-source";
const DOTS_LAYER = "topic-landslides";
const EPI_SOURCE = "topic-epicentre-source";
const EPI_LAYERS = [
  "topic-epicentre-ring-3",
  "topic-epicentre-ring-2",
  "topic-epicentre-ring-1",
  "topic-epicentre-star",
  "topic-epicentre-label",
];
const TILE_BASE_URL = import.meta.env.VITE_TILE_BASE_URL;

/** Absolute URL of a file the app ships in `public/` (works on Pages sub-paths and desktop). */
function publicUrl(rel: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const origin =
    typeof window !== "undefined" && window.location?.origin?.startsWith("http")
      ? window.location.origin
      : "";
  return `${origin}${base}/${rel}`;
}

function beforeId(map: MapLibreMap): string | undefined {
  return map.getLayer(BELOW_ID) ? BELOW_ID : undefined;
}

function removeLayerAndSource(
  map: MapLibreMap,
  layerIds: string[],
  sourceId: string,
): void {
  for (const id of layerIds) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

function setVisible(map: MapLibreMap, ids: string[], visible: boolean): void {
  for (const id of ids) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }
}

function ensureEpicentre(map: MapLibreMap): void {
  if (map.getSource(EPI_SOURCE)) return;
  map.addSource(EPI_SOURCE, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "M7.8 epicentre · 8 June 2026" },
          geometry: { type: "Point", coordinates: EPICENTRE },
        },
      ],
    },
  });
  const rings: [string, number, number][] = [
    [EPI_LAYERS[0], 46, 0.1],
    [EPI_LAYERS[1], 30, 0.18],
    [EPI_LAYERS[2], 16, 0.3],
  ];
  for (const [id, radius, opacity] of rings) {
    map.addLayer({
      id,
      type: "circle",
      source: EPI_SOURCE,
      layout: { visibility: "none" },
      paint: {
        "circle-radius": radius,
        "circle-color": "#d7301f",
        "circle-opacity": opacity,
        "circle-stroke-color": "#d7301f",
        "circle-stroke-width": 1,
        "circle-stroke-opacity": 0.6,
        "circle-pitch-alignment": "map",
      },
    });
  }
  map.addLayer({
    id: EPI_LAYERS[3],
    type: "symbol",
    source: EPI_SOURCE,
    layout: {
      visibility: "none",
      "text-field": "★",
      "text-size": 30,
      "text-allow-overlap": true,
      "text-font": ["Noto Sans Regular"],
    },
    paint: {
      "text-color": "#b0221a",
      "text-halo-color": "#fff8e8",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: EPI_LAYERS[4],
    type: "symbol",
    source: EPI_SOURCE,
    layout: {
      visibility: "none",
      "text-field": ["get", "name"],
      "text-size": 13,
      "text-offset": [0, 2.4],
      "text-allow-overlap": true,
      "text-font": ["Noto Sans Regular"],
    },
    paint: {
      "text-color": "#7a1b14",
      "text-halo-color": "#fff8e8",
      "text-halo-width": 2,
    },
  });
}

function ensureLandslideDots(map: MapLibreMap): void {
  if (map.getSource(DOTS_SOURCE)) return;
  map.addSource(DOTS_SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer({
    id: DOTS_LAYER,
    type: "circle",
    source: DOTS_SOURCE,
    layout: { visibility: "none" },
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        7,
        2,
        9,
        3.5,
        12,
        7,
      ],
      "circle-color": ["match", ["get", "nisar"], "bare", "#a50f15", "#f39c3d"],
      "circle-stroke-color": "#fff8e8",
      "circle-stroke-width": 1,
      "circle-opacity": 0.95,
    },
  });
  void fetch(publicUrl("data/extra/landslides_nisar_check.geojson"))
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const source = map.getSource(DOTS_SOURCE) as GeoJSONSource | undefined;
      if (data && source) source.setData(data);
    })
    .catch(() => undefined);
}

/**
 * Map layers the Explore panel adds on top of the tile overlays: pre-rendered image maps
 * (Sentinel-1 radar check, outlook months, slope, NISAR watch list), a faint 2026 land-cover
 * underlay for the change map, and the earthquake markers.
 */
export function TopicOverlays({
  map,
  ready,
}: {
  map: MapLibreMap | null;
  ready: boolean;
}) {
  const { topicId, viewId, option, frame } = useTopicStore();
  const started = useTopicStore((s) => s.started);
  const applyStart = useTopicStore((s) => s.applyStart);
  const manifest = useDatasetStore((s) => s.manifest);

  // Show the opening view once the real layers are in the store.
  useEffect(() => {
    if (manifest && !started) applyStart();
  }, [manifest, started, applyStart]);

  useEffect(() => {
    if (!map || !ready) return;
    const topic = findTopic(topicId);
    const view = findView(topic, viewId);
    const opt = view.options[option] ?? view.options[0];

    // 1. Image overlay (one at a time).
    try {
      if (opt.kind === "images") {
        const file = (opt.frames[frame] ?? opt.frames[0]).file;
        const url = publicUrl(`data/extra/${file}`);
        const source = map.getSource(IMAGE_SOURCE) as ImageSource | undefined;
        if (source) {
          source.updateImage({ url, coordinates: EXTRA_IMAGE_CORNERS });
        } else {
          map.addSource(IMAGE_SOURCE, {
            type: "image",
            url,
            coordinates: EXTRA_IMAGE_CORNERS,
          });
          map.addLayer(
            {
              id: IMAGE_LAYER,
              type: "raster",
              source: IMAGE_SOURCE,
              paint: {
                "raster-opacity": 0.95,
                "raster-resampling": "nearest",
              },
            },
            beforeId(map),
          );
        }
      } else {
        removeLayerAndSource(map, [IMAGE_LAYER], IMAGE_SOURCE);
      }
    } catch (error) {
      console.error("Failed to update the topic image overlay", error);
    }

    // 2. Faint 2026 land cover under the change map, so "no change" is not blank.
    try {
      const wantUnderlay =
        Boolean(view.landCoverUnderlay) &&
        opt.kind === "tiles" &&
        opt.layerId === "landcover-change-2020-2026";
      if (wantUnderlay && !map.getSource(UNDERLAY_SOURCE)) {
        const { entry } = resolveManifestEntry(
          manifest,
          "landcover-classes",
          "2026",
        );
        if (entry?.tilePath) {
          map.addSource(UNDERLAY_SOURCE, {
            type: "raster",
            tiles: [
              resolveTileUrl(
                entry.tilePath,
                TILE_BASE_URL,
                publicUrl("").replace(/\/+$/, ""),
              ),
            ],
            tileSize: 256,
            bounds: manifest?.bounds ?? SARANGANI_DAVOCC_BOUNDS,
            minzoom: entry.minZoom ?? 5,
            maxzoom: entry.maxZoom ?? 11,
          });
          map.addLayer(
            {
              id: UNDERLAY_LAYER,
              type: "raster",
              source: UNDERLAY_SOURCE,
              paint: {
                "raster-opacity": 0.35,
                "raster-saturation": -0.6,
                "raster-resampling": "nearest",
              },
            },
            map.getLayer(CHANGE_LAYER) ? CHANGE_LAYER : beforeId(map),
          );
        }
      } else if (!wantUnderlay) {
        removeLayerAndSource(map, [UNDERLAY_LAYER], UNDERLAY_SOURCE);
      }
    } catch (error) {
      console.error("Failed to update the land-cover underlay", error);
    }

    // 3. Earthquake markers.
    try {
      const quake = topic.id === "quake";
      if (quake) ensureEpicentre(map);
      setVisible(map, EPI_LAYERS, quake);
      if (view.landslideDots) ensureLandslideDots(map);
      setVisible(map, [DOTS_LAYER], Boolean(view.landslideDots));
      for (const id of [DOTS_LAYER, ...EPI_LAYERS]) {
        if (map.getLayer(id)) map.moveLayer(id);
      }
    } catch (error) {
      console.error("Failed to update the earthquake markers", error);
    }
  }, [map, ready, topicId, viewId, option, frame, manifest]);

  // Keep the land-cover underlay below the change tiles when TileOverlay adds them later.
  useEffect(() => {
    if (!map || !ready) return;
    const keepOrder = () => {
      if (map.getLayer(UNDERLAY_LAYER) && map.getLayer(CHANGE_LAYER)) {
        const ids = map.getStyle().layers.map((l) => l.id);
        if (ids.indexOf(UNDERLAY_LAYER) > ids.indexOf(CHANGE_LAYER)) {
          map.moveLayer(UNDERLAY_LAYER, CHANGE_LAYER);
        }
      }
    };
    map.on("styledata", keepOrder);
    return () => {
      map.off("styledata", keepOrder);
    };
  }, [map, ready]);

  return null;
}
