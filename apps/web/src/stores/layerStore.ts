import { create } from "zustand";
import { SAMPLE_LAYERS } from "@/fixtures/sample-dashboard";
import type { LayerConfig } from "@/shared/types/layer";
import type { Manifest, ManifestLayer } from "@/shared/types/manifest";

interface LayerState {
  layers: LayerConfig[];
  /** Layer the opacity control, Legend, and Current View card act on. */
  activeLayerId: string;
  toggleVisibility: (id: string) => void;
  setVisibility: (id: string, visible: boolean) => void;
  setOpacity: (id: string, opacity: number) => void;
  setActive: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  hydrateFromManifest: (manifest: Manifest) => void;
}

/** Data layers start almost opaque so they stand out from the light basemap. */
const DATA_OPACITY = 0.95;

const DEFAULT_VISIBLE_IDS = new Set(["radar-change-hh-monthly"]);
const DEFAULT_PINNED_IDS = new Set([
  "radar-change-hh-monthly",
  "radar-change-hv-monthly",
  "earthquake-landslide-candidates",
  "earthquake-evi-change-2026",
  "vegetation-evi-monthly",
  "landcover-classes",
  "climate-modis-ndvi-monthly",
  "outlook-evi-anomaly",
  "terrain-elevation",
]);

export const useLayerStore = create<LayerState>((set) => ({
  layers: SAMPLE_LAYERS.map((layer) => ({ ...layer })),
  activeLayerId: SAMPLE_LAYERS[0]?.id ?? "radar-change-hh-monthly",

  toggleVisibility: (id) =>
    set((state) => {
      const target = state.layers.find((l) => l.id === id);
      const nextVisible = target ? !target.visible : true;
      return {
        activeLayerId:
          nextVisible &&
          target &&
          (target.kind === "manifest-layer" || target.kind === "change-type")
            ? id
            : state.activeLayerId,
        layers: state.layers.map((layer) =>
          layer.id === id
            ? {
                ...layer,
                visible: nextVisible,
                showInLayerList: layer.showInLayerList || nextVisible,
              }
            : layer,
        ),
      };
    }),

  setVisibility: (id, visible) =>
    set((state) => ({
      activeLayerId: visible ? id : state.activeLayerId,
      layers: state.layers.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              visible,
              showInLayerList: layer.showInLayerList || visible,
            }
          : layer,
      ),
    })),

  setOpacity: (id, opacity) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, opacity } : layer,
      ),
    })),

  setActive: (id) => set({ activeLayerId: id }),

  reorder: (fromIndex, toIndex) =>
    set((state) => {
      const { layers } = state;
      const lastIndex = layers.length - 1;
      if (
        fromIndex < 0 ||
        fromIndex > lastIndex ||
        toIndex < 0 ||
        toIndex > lastIndex
      ) {
        return state;
      }
      const next = [...layers];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return {
        layers: next.map((layer, index) => ({ ...layer, order: index })),
      };
    }),

  hydrateFromManifest: (manifest) =>
    set((state) => {
      // Group manifest entries by unique layer `id`
      const byId = new Map<string, ManifestLayer>();
      for (const entry of manifest.layers) {
        if (!byId.has(entry.id)) {
          byId.set(entry.id, entry);
        }
      }

      const manifestLayers: LayerConfig[] = [];
      let order = 0;
      for (const [id, entry] of byId.entries()) {
        const existing = state.layers.find((l) => l.id === id);
        const visible = existing
          ? existing.visible
          : DEFAULT_VISIBLE_IDS.has(id);
        const showInLayerList =
          visible ||
          DEFAULT_PINNED_IDS.has(id) ||
          Boolean(existing?.showInLayerList);

        manifestLayers.push({
          id,
          name: entry.name,
          kind: "manifest-layer",
          family: entry.family,
          changeType: entry.family,
          visible,
          opacity:
            existing?.kind === "manifest-layer"
              ? existing.opacity
              : DATA_OPACITY,
          order: order++,
          showInLayerList,
          units: entry.units,
          valueType: entry.valueType,
          periods: entry.periods,
          ramp: entry.ramp,
          domain: entry.domain,
          classes: entry.classes,
          caveats: entry.caveats,
          coverage: entry.coverage,
          minZoom: entry.minZoom,
          maxZoom: entry.maxZoom,
        });
      }

      const chromeLayers: LayerConfig[] = [
        {
          id: "satellite-base",
          name: "Satellite (Esri World Imagery)",
          kind: "basemap",
          visible: false,
          opacity: 1,
          order: order++,
          showInLayerList: true,
        },
        {
          id: "aoi-boundary",
          name: "Sarangani & Davao Occidental Boundary",
          kind: "vector",
          visible: true,
          opacity: 1,
          order: order++,
          showInLayerList: true,
        },
        {
          id: "landslide-polygons",
          name: "M7.8 Landslide Candidate Polygons (305)",
          kind: "vector",
          visible: true,
          opacity: 0.9,
          order: order++,
          showInLayerList: true,
        },
        {
          id: "cities-labels",
          name: "Municipalities & Reference Labels",
          kind: "labels",
          visible: true,
          opacity: 1,
          order: order++,
          showInLayerList: true,
        },
      ];

      const nextActive = manifestLayers.some(
        (l) => l.id === state.activeLayerId,
      )
        ? state.activeLayerId
        : (manifestLayers[0]?.id ?? "radar-change-hh-monthly");

      return {
        layers: [...manifestLayers, ...chromeLayers],
        activeLayerId: nextActive,
      };
    }),
}));

/** The layer the opacity control, Legend, and Current View card read. */
export function useActiveLayer(): LayerConfig | undefined {
  return useLayerStore((state) =>
    state.layers.find((layer) => layer.id === state.activeLayerId),
  );
}
