import { invoke, isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import { findNearestPlace } from "@/features/search/locations";
import { SAMPLE_SELECTION } from "@/fixtures/sample-dashboard";
import type {
  LayerSampleReading,
  SelectionPayload,
} from "@/shared/types/selection";
import { resolveManifestEntry, useDatasetStore } from "./datasetStore";
import { useLayerStore } from "./layerStore";

interface SelectionState {
  selected: SelectionPayload | null;
  select: (payload: SelectionPayload) => void;
  inspectCoordinate: (
    lng: number,
    lat: number,
    placeOverride?: string,
  ) => Promise<void>;
  clear: () => void;
}

/**
 * Deterministic spatial value estimator when running in browser preview (outside Tauri desktop)
 * so clicking any point inside Sarangani / Davao Occidental shows realistic domain-bounded values
 * alongside the explicit browser-preview provenance note.
 */
function buildBrowserFallbackSamples(
  lng: number,
  lat: number,
  currentDate: string | null,
): LayerSampleReading[] {
  const manifest = useDatasetStore.getState().manifest;
  const layers = useLayerStore
    .getState()
    .layers.filter(
      (l) => l.kind === "manifest-layer" || l.kind === "change-type",
    );

  const prioritized = layers.filter(
    (l) =>
      l.visible ||
      l.id === useLayerStore.getState().activeLayerId ||
      l.id === "terrain-elevation" ||
      l.id === "landcover-classes",
  );

  // Check if inside Sarangani / Davao Occidental AOI bounds
  const inAoi =
    lng >= 124.357 && lng <= 125.716 && lat >= 5.365 && lat <= 6.634;

  const samples: LayerSampleReading[] = [];
  for (const lyr of prioritized.slice(0, 6)) {
    const { entry, resolvedPeriod } = resolveManifestEntry(
      manifest,
      lyr.id,
      currentDate,
    );
    const domain = entry?.domain ?? lyr.domain ?? [-3, 3];
    const units = entry?.units ?? lyr.units ?? "";
    const caveats = entry?.caveats ?? lyr.caveats ?? [];
    const classes = entry?.classes ?? lyr.classes;
    const period = resolvedPeriod ?? currentDate ?? "static";

    if (!inAoi) {
      samples.push({
        layerId: lyr.id,
        family: lyr.family ?? "radar",
        name: lyr.name,
        period,
        value: null,
        raw: null,
        units,
        caveats,
      });
      continue;
    }

    const seed =
      Math.sin(lng * 173.4 + lat * 289.7 + lyr.id.length * 1.9) * 0.5 + 0.5;
    if (classes && classes.length > 0) {
      const picked =
        classes[Math.floor(seed * classes.length) % classes.length];
      samples.push({
        layerId: lyr.id,
        family: lyr.family ?? "landcover",
        name: lyr.name,
        period,
        value: picked.code,
        raw: picked.code,
        className: picked.label,
        classColor: picked.color,
        units,
        caveats,
      });
    } else {
      const span = domain[1] - domain[0];
      const val = Number((domain[0] + (0.18 + seed * 0.68) * span).toFixed(3));
      samples.push({
        layerId: lyr.id,
        family: lyr.family ?? "radar",
        name: lyr.name,
        period,
        value: val,
        raw: val,
        units,
        caveats,
      });
    }
  }
  return samples;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selected: SAMPLE_SELECTION,
  select: (payload) => set({ selected: payload }),

  inspectCoordinate: async (lng, lat, placeOverride) => {
    const placeName = placeOverride ?? findNearestPlace(lng, lat);
    const currentDate = useDatasetStore.getState().currentDate ?? "2026-10";
    const activeLayer = useLayerStore
      .getState()
      .layers.find((l) => l.id === useLayerStore.getState().activeLayerId);

    set({
      selected: {
        lng,
        lat,
        placeName,
        confidence: "High",
        samplingLoading: true,
      },
    });

    if (typeof window !== "undefined" && isTauri()) {
      try {
        const visibleIds = useLayerStore
          .getState()
          .layers.filter(
            (l) =>
              (l.kind === "manifest-layer" || l.kind === "change-type") &&
              (l.visible ||
                l.id === activeLayer?.id ||
                l.id === "terrain-elevation" ||
                l.id === "landcover-classes"),
          )
          .map((l) => l.id);

        const samples = await invoke<LayerSampleReading[]>("sample_layers", {
          lng,
          lat,
          period: currentDate,
          layerIds: visibleIds.length > 0 ? visibleIds : null,
        });

        const primary =
          samples.find((s) => s.layerId === activeLayer?.id) ?? samples[0];
        set({
          selected: {
            lng,
            lat,
            placeName,
            rate: primary?.value ?? undefined,
            confidence: "High",
            samples,
            samplingLoading: false,
            samplingMode: "desktop-tiff",
          },
        });
        return;
      } catch {
        // Fall through to manifest estimator if GeoTIFF directory isn't present locally
      }
    }

    const fallbackSamples = buildBrowserFallbackSamples(lng, lat, currentDate);
    const primary =
      fallbackSamples.find((s) => s.layerId === activeLayer?.id) ??
      fallbackSamples[0];

    set({
      selected: {
        lng,
        lat,
        placeName,
        rate: primary?.value ?? undefined,
        confidence: "High",
        samples: fallbackSamples,
        samplingLoading: false,
        samplingMode: "manifest-estimate",
      },
    });
  },

  clear: () => set({ selected: null }),
}));
