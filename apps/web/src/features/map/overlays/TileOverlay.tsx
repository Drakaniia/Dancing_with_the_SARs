import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { offlineTilesAvailable, tileProtocolUrl } from "@/features/offline/tileCache";
import { isFramePending, setFramePending } from "@/features/timeline/frameLoading";
import { layerTimelineSteps, stepIndexFor } from "@/features/timeline/timelineSteps";
import type { LayerConfig } from "@/shared/types/layer";
import type { Manifest, ManifestLayer } from "@/shared/types/manifest";
import { fetchDataFile } from "@/shared/utils/dataSource";
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

/** Origin plus the Vite base path (e.g. `/Dancing_with_the_SARs/app` on GitHub Pages). */
export function resolveOriginPrefix(): string {
  if (
    typeof window !== "undefined" &&
    window.location?.origin &&
    window.location.origin.startsWith("http")
  ) {
    return `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/+$/, "");
  }
  return "";
}

/**
 * Adds an empty GeoJSON source, then fills it from the remote data host (bundled copy as the
 * fallback). Features appear as soon as the file arrives.
 */
function addDataGeojson(map: MapLibreMap, sourceId: string, file: string): void {
  map.addSource(sourceId, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  void fetchDataFile(file)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      const source = map.getSource(sourceId);
      if (source && "setData" in source) {
        (source as GeoJSONSource).setData(data);
      }
    })
    .catch(() => undefined);
}

/** One date of one layer on the map: its own raster source and layer. */
interface Slot {
  path: string;
  sourceId: string;
  layerId: string;
  addedAt: number;
  /** While > now, this date is fading out under the date that replaced it; 0 otherwise. */
  hideAt: number;
  /** A tile of this source has arrived (guards against "loaded" before any tile was asked for). */
  sawTile: boolean;
  ready: boolean;
}

/** Slots per data layer id: the date on screen, the date being loaded, the next date. */
type SlotPool = Record<string, Slot[]>;

/** A slow or missing date is shown anyway after this long, so the map never freezes. */
const SLOT_READY_TIMEOUT_MS = 5000;
/** A source with no tiles in view counts as loaded once it has had this long to ask for them. */
const SLOT_SETTLE_MS = 500;
/**
 * A loaded date fades in on top of the one it replaces, which stays drawn underneath until the
 * fade ends: a soft change instead of a hard cut, and never a gap showing the basemap.
 */
const FADE_MS = 240;
const FADE_TRANSITION = { duration: FADE_MS, delay: 0 };
const NO_TRANSITION = { duration: 0, delay: 0 };
let fadeTimer: number | null = null;

function fadeEnabled(): boolean {
  return !(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Sync once more when the fade is over, to drop the date that faded out. */
function scheduleFadeEnd(map: MapLibreMap, pool: SlotPool): void {
  if (fadeTimer !== null) window.clearTimeout(fadeTimer);
  fadeTimer = window.setTimeout(() => {
    fadeTimer = null;
    syncFrames(map, pool);
  }, FADE_MS + 32);
}

function cancelFadeEnd(): void {
  if (fadeTimer !== null) window.clearTimeout(fadeTimer);
  fadeTimer = null;
}
let slotSeq = 0;

/** Style layer ids bottom to top (cheap: does not serialise the whole style). */
export function layerOrder(map: MapLibreMap): string[] {
  const withOrder = map as MapLibreMap & { getLayersOrder?: () => string[] };
  return typeof withOrder.getLayersOrder === "function"
    ? withOrder.getLayersOrder()
    : map.getStyle().layers.map((l) => l.id);
}

function removeSlot(map: MapLibreMap, slot: Slot): void {
  if (map.getLayer(slot.layerId)) map.removeLayer(slot.layerId);
  if (map.getSource(slot.sourceId)) map.removeSource(slot.sourceId);
}

/** Tile URL template for a layer at a date (remote host, bundled copy, or offline cache). */
export function tilePathFor(
  layer: LayerConfig,
  manifest: Manifest | null,
  date: string | null,
): { tilePath: string; entry: ManifestLayer | null } {
  const { entry, resolvedPeriod } = resolveManifestEntry(manifest, layer.id, date);
  const period = resolvedPeriod ?? layer.periods?.[0] ?? date ?? "static";
  const relPath = entry?.tilePath ? entry.tilePath : tileTemplate(layer.id, tileSegment(period));
  const tilePath = offlineTilesAvailable()
    ? tileProtocolUrl(relPath)
    : resolveTileUrl(relPath, TILE_BASE_URL, resolveOriginPrefix());
  return { tilePath, entry };
}

/** The date after `date` in this layer's own timeline (null for one-date layers). */
function nextDateFor(layer: LayerConfig, date: string | null): string | null {
  const steps = layerTimelineSteps(layer.periods, []);
  if (steps.length < 2) return null;
  return steps[(stepIndexFor(steps, date) + 1) % steps.length] ?? null;
}

/**
 * Draws every visible data layer at the current date without flashing blank: the new date is
 * loaded underneath at zero opacity and only swapped in once its tiles have arrived (the old
 * date stays on screen meanwhile), and the following date is fetched ahead of time. Reports
 * whether a date is still loading so playback can wait for it.
 */
let syncing = false;
let syncAgain = false;

function syncFrames(map: MapLibreMap, pool: SlotPool): void {
  // Adding a source can fire map events that ask for another sync; run those after this one
  // instead of inside it.
  if (syncing) {
    syncAgain = true;
    return;
  }
  syncing = true;
  try {
    do {
      syncAgain = false;
      syncFramesOnce(map, pool);
    } while (syncAgain);
  } finally {
    syncing = false;
  }
}

function syncFramesOnce(map: MapLibreMap, pool: SlotPool): void {
  const { layers } = useLayerStore.getState();
  const { manifest, currentDate } = useDatasetStore.getState();
  const bounds = manifest?.bounds ?? SARANGANI_DAVOCC_BOUNDS;
  const beforeId = map.getLayer(BELOW_LAYER_ID)
    ? BELOW_LAYER_ID
    : map.getLayer("admin-boundaries")
      ? "admin-boundaries"
      : map.getLayer(FALLBACK_BELOW_ID)
        ? FALLBACK_BELOW_ID
        : undefined;

  const dataLayers = layers.filter(
    (layer) => layer.kind === "manifest-layer" || layer.kind === "change-type",
  );
  const visible = new Map(dataLayers.filter((l) => l.visible).map((l) => [l.id, l]));

  // Layers switched off: drop all their dates.
  for (const id of Object.keys(pool)) {
    if (!visible.has(id)) {
      for (const slot of pool[id]) removeSlot(map, slot);
      delete pool[id];
    }
  }

  let pending = false;
  const now = Date.now();

  for (const layer of visible.values()) {
    if (!pool[layer.id]) pool[layer.id] = [];
    const slots = pool[layer.id];
    const ensure = (date: string | null): Slot => {
      const { tilePath, entry } = tilePathFor(layer, manifest, date);
      let slot = slots.find((s) => s.path === tilePath);
      if (!slot || !map.getLayer(slot.layerId)) {
        if (slot) removeSlot(map, slot);
        slotSeq += 1;
        const layerId = `${layerIdFor(layer.id)}@${slotSeq}`;
        slot = {
          path: tilePath,
          sourceId: `${layerId}${SOURCE_SUFFIX}`,
          layerId,
          addedAt: now,
          sawTile: false,
          ready: false,
          hideAt: 0,
        };
        const kept = slot;
        const index = slots.findIndex((s) => s.path === tilePath);
        if (index >= 0) slots.splice(index, 1);
        slots.push(kept);
        map.addSource(kept.sourceId, {
          type: "raster",
          tiles: [tilePath],
          tileSize: 256,
          bounds,
          minzoom: entry?.minZoom ?? layer.minZoom ?? 5,
          maxzoom: entry?.maxZoom ?? layer.maxZoom ?? 13,
        });
        map.addLayer(
          {
            id: kept.layerId,
            type: "raster",
            source: kept.sourceId,
            paint: {
              "raster-opacity": 0,
              "raster-opacity-transition": { duration: 0, delay: 0 },
              "raster-fade-duration": 0,
              // a little extra contrast so the data stands out from the light basemap
              "raster-contrast": 0.12,
              "raster-saturation": 0.15,
              "raster-resampling":
                (entry?.valueType ?? layer.valueType) === "categorical" ? "nearest" : "linear",
            },
            layout: { visibility: "visible" },
          },
          beforeId,
        );
      }
      if (!slot.ready) {
        const loaded =
          map.isSourceLoaded(slot.sourceId) &&
          (slot.sawTile || now - slot.addedAt > SLOT_SETTLE_MS);
        if (loaded || now - slot.addedAt > SLOT_READY_TIMEOUT_MS) {
          slot.ready = true;
        }
      }
      return slot;
    };

    const want = ensure(currentDate);
    const nextDate = nextDateFor(layer, currentDate);
    const ahead = nextDate ? ensure(nextDate) : null;

    // What is on screen now: the wanted date once loaded, else whatever was showing before.
    const shownBefore = slots.find(
      (s) =>
        s !== want &&
        s !== ahead &&
        map.getLayer(s.layerId) &&
        map.getPaintProperty(s.layerId, "raster-opacity") !== 0 &&
        s.hideAt === 0,
    );
    const show = want.ready || !shownBefore ? want : shownBefore;
    if (!want.ready) pending = true;

    // A different date takes over: fade it in over the outgoing one (only the latest outgoing
    // date is kept; rapid scrubbing drops the older ones at once).
    const outgoing = slots.find(
      (s) =>
        s !== show &&
        s.hideAt === 0 &&
        map.getLayer(s.layerId) &&
        map.getPaintProperty(s.layerId, "raster-opacity") !== 0,
    );
    if (outgoing && fadeEnabled() && map.getLayer(show.layerId)) {
      for (const s of slots) s.hideAt = 0;
      outgoing.hideAt = now + FADE_MS;
      map.setPaintProperty(show.layerId, "raster-opacity-transition", FADE_TRANSITION);
      scheduleFadeEnd(map, pool);
    }
    show.hideAt = 0;

    for (const slot of [...slots]) {
      const fading = slot.hideAt > now;
      const keep = slot === want || slot === ahead || slot === show || fading;
      if (!keep) {
        removeSlot(map, slot);
        slots.splice(slots.indexOf(slot), 1);
        continue;
      }
      if (map.getLayer(slot.layerId)) {
        map.setPaintProperty(
          slot.layerId,
          "raster-opacity",
          slot === show || fading ? layer.opacity : 0,
        );
      }
    }
    // Fade over: opacity changes (the opacity slider) apply at once again.
    if (!slots.some((s) => s.hideAt > now) && map.getLayer(show.layerId)) {
      map.setPaintProperty(show.layerId, "raster-opacity-transition", NO_TRANSITION);
    }
    // The shown date sits on top of this layer's hidden dates (only moved when it is not).
    const order = layerOrder(map);
    const showAt = order.indexOf(show.layerId);
    if (showAt >= 0 && slots.some((s) => s !== show && order.indexOf(s.layerId) > showAt)) {
      map.moveLayer(show.layerId, beforeId);
    }
  }

  // Sweep any date layer the pool no longer tracks.
  const tracked = new Set(Object.values(pool).flatMap((slots) => slots.map((s) => s.layerId)));
  for (const id of layerOrder(map)) {
    if (id.startsWith(LAYER_PREFIX) && id.includes("@") && !tracked.has(id)) {
      const source = map.getLayer(id)?.source;
      map.removeLayer(id);
      if (source && map.getSource(source)) map.removeSource(source);
    }
  }

  setFramePending(pending);
}

/**
 * The study-area outline and the 305 landslide polygons, below the labels. Safe to call again:
 * anything already on the map is left alone. Shared by the main map and the comparison map.
 */
export function addReferenceLayers(map: MapLibreMap): void {
  const beforeLabels = map.getLayer("cities-labels") ? "cities-labels" : undefined;

  if (!map.getSource("aoi-boundary-source")) {
    addDataGeojson(map, "aoi-boundary-source", "boundary.geojson");
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
          "line-color": "#fffaf0",
          "line-width": 3.6,
          "line-opacity": 0.95,
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
          "line-color": "#3b2a17",
          "line-width": 1.8,
          "line-opacity": 0.92,
        },
      },
      beforeLabels,
    );
  }

  if (!map.getSource("landslide-polygons-source")) {
    addDataGeojson(map, "landslide-polygons-source", "landslides.geojson");
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
}

export function TileOverlay({ map, ready }: TileOverlayProps) {
  const layers = useLayerStore((state) => state.layers);
  const currentDate = useDatasetStore((state) => state.currentDate);
  const manifest = useDatasetStore((state) => state.manifest);

  const slotsRef = useRef<SlotPool>({});
  const syncRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!map || !ready) return;
    if (!resolveOriginPrefix()) return;
    addReferenceLayers(map);
  }, [map, ready]);

  // Re-run the frame sync whenever the map finishes loading a source, so a date that was still
  // loading is swapped in as soon as its tiles arrive.
  useEffect(() => {
    if (!map || !ready) return;
    // Tiles arrive in bursts (dozens per date); one sync per animation frame is enough.
    let scheduled: number | null = null;
    const scheduleSync = () => {
      if (scheduled !== null) return;
      scheduled = requestAnimationFrame(() => {
        scheduled = null;
        syncRef.current();
      });
    };
    const onData = (event: { sourceId?: string; tile?: unknown }) => {
      if (!event.sourceId?.startsWith(LAYER_PREFIX)) return;
      if (event.tile) {
        for (const slots of Object.values(slotsRef.current)) {
          const slot = slots.find((s) => s.sourceId === event.sourceId);
          if (slot) slot.sawTile = true;
        }
      }
      scheduleSync();
    };
    const onIdle = () => scheduleSync();
    // Re-check a slow date now and then so the timeout can swap it in.
    const timer = window.setInterval(() => {
      if (isFramePending()) syncRef.current();
    }, 400);
    map.on("sourcedata", onData);
    map.on("idle", onIdle);
    return () => {
      if (scheduled !== null) cancelAnimationFrame(scheduled);
      window.clearInterval(timer);
      map.off("sourcedata", onData);
      map.off("idle", onIdle);
    };
  }, [map, ready]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: syncFrames reads the stores itself; these deps are the triggers that re-run it.
  useEffect(() => {
    if (!map || !ready) return;
    syncRef.current = () => syncFrames(map, slotsRef.current);
    syncRef.current();
  }, [map, ready, layers, currentDate, manifest]);

  useEffect(
    () => () => {
      setFramePending(false);
      cancelFadeEnd();
    },
    [],
  );

  return null;
}
