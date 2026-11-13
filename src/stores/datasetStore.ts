import { create } from "zustand";
import { SAMPLE_DATASETS, TIME_SERIES } from "@/fixtures/sample-dashboard";
import type { Dataset } from "@/shared/types/dataset";
import {
  type Manifest,
  type ManifestLayer,
  type TablesPayload,
  validateManifest,
} from "@/shared/types/manifest";
import { resolvePeriod } from "@/shared/utils/dates";
import { useLayerStore } from "./layerStore";

export type ComparisonMode = "split" | "difference";

interface DatasetState {
  datasets: Dataset[];
  manifest: Manifest | null;
  tables: TablesPayload | null;
  manifestStatus: "idle" | "loading" | "ready" | "error";
  manifestError: string | null;
  tileErrorCount: number;
  failingLayers: string[];
  currentDate: string | null;
  comparisonEnabled: boolean;
  comparisonMode: ComparisonMode;
  comparisonDate: string | null;
  /** Split curtain position 0..100 (%). */
  splitPosition: number;
  range: [string, string];
  addDataset: (dataset: Dataset) => void;
  removeDataset: (id: string) => void;
  setCurrentDate: (date: string) => void;
  setComparisonEnabled: (enabled: boolean) => void;
  setComparisonMode: (mode: ComparisonMode) => void;
  setComparisonDate: (date: string) => void;
  setSplitPosition: (pos: number) => void;
  setManifest: (manifest: Manifest) => void;
  setTables: (tables: TablesPayload) => void;
  recordTileError: (layerId: string) => void;
  clearTileErrors: () => void;
  loadManifestAndTables: () => Promise<void>;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  datasets: [...SAMPLE_DATASETS],
  manifest: null,
  tables: null,
  manifestStatus: "idle",
  manifestError: null,
  tileErrorCount: 0,
  failingLayers: [],
  currentDate: TIME_SERIES.currentDate,
  comparisonEnabled: false,
  comparisonMode: "split",
  comparisonDate: "2026-09",
  splitPosition: 50,
  range: TIME_SERIES.range,

  addDataset: (dataset) =>
    set((state) => ({ datasets: [...state.datasets, dataset] })),

  removeDataset: (id) =>
    set((state) => ({
      datasets: state.datasets.filter((dataset) => dataset.id !== id),
    })),

  setCurrentDate: (date) => set({ currentDate: date }),

  setComparisonEnabled: (comparisonEnabled) => set({ comparisonEnabled }),

  setComparisonMode: (comparisonMode) => set({ comparisonMode }),

  setComparisonDate: (comparisonDate) => set({ comparisonDate }),

  setSplitPosition: (splitPosition) =>
    set({ splitPosition: Math.min(95, Math.max(5, splitPosition)) }),

  setManifest: (manifest) => {
    const dates =
      manifest.dates.length > 0 ? manifest.dates : [...TIME_SERIES.ticks];
    const defaultDate = dates.includes("2026-10 (vs 2026-09)")
      ? "2026-10 (vs 2026-09)"
      : dates.includes("2026-10")
        ? "2026-10"
        : (dates[dates.length - 1] ?? TIME_SERIES.currentDate);
    const range: [string, string] = [
      dates[0] ?? TIME_SERIES.range[0],
      dates[dates.length - 1] ?? TIME_SERIES.range[1],
    ];

    set({
      manifest,
      manifestStatus: "ready",
      manifestError: null,
      currentDate: defaultDate,
      range,
      datasets: [
        {
          id: "nisar-sarangani-davocc",
          name: "Sarangani & Davao Occidental NISAR Release",
          changeType: "radar",
          dates,
          bounds: manifest.bounds,
          crs: manifest.source.crs,
          units: "dB",
          source: manifest.source.attribution,
        },
      ],
    });
    useLayerStore.getState().hydrateFromManifest(manifest);
  },

  setTables: (tables) => set({ tables }),

  recordTileError: (layerId) =>
    set((state) => {
      const failingLayers = state.failingLayers.includes(layerId)
        ? state.failingLayers
        : [...state.failingLayers, layerId];
      return {
        tileErrorCount: state.tileErrorCount + 1,
        failingLayers,
      };
    }),

  clearTileErrors: () => set({ tileErrorCount: 0, failingLayers: [] }),

  loadManifestAndTables: async () => {
    if (
      get().manifestStatus === "loading" ||
      get().manifestStatus === "ready"
    ) {
      return;
    }
    if (typeof fetch !== "function") return;
    set({ manifestStatus: "loading", manifestError: null });
    try {
      const [manifestRes, tablesRes] = await Promise.all([
        fetch("/data/manifest.json"),
        fetch("/data/tables.json").catch(() => null),
      ]);
      if (!manifestRes.ok) {
        throw new Error(
          `HTTP ${manifestRes.status} loading /data/manifest.json`,
        );
      }
      const doc: unknown = await manifestRes.json();
      const problems = validateManifest(doc);
      if (problems.length > 0) {
        throw new Error(`Manifest validation failed: ${problems[0]}`);
      }
      get().setManifest(doc as Manifest);

      if (tablesRes?.ok) {
        const tablesData = (await tablesRes.json()) as TablesPayload;
        set({ tables: tablesData });
      }
    } catch (error) {
      set({
        manifestStatus: "error",
        manifestError: error instanceof Error ? error.message : String(error),
      });
    }
  },
}));

/** Timeline steps — the manifest's sorted dates (or the fallback dataset dates). */
export function useTimelineDates(): string[] {
  return useDatasetStore(
    (state) => state.manifest?.dates ?? state.datasets[0]?.dates ?? [],
  );
}

/**
 * Resolves the concrete `ManifestLayer` entry for `layerId` at `date` (snapping to the nearest
 * available period if `layerId` does not have an exact entry for `date`).
 */
export function resolveManifestEntry(
  manifest: Manifest | null,
  layerId: string,
  date: string | null,
): {
  entry: ManifestLayer | null;
  resolvedPeriod: string | null;
  exact: boolean;
} {
  if (!manifest) {
    return { entry: null, resolvedPeriod: date, exact: true };
  }
  const candidates = manifest.layers.filter((l) => l.id === layerId);
  if (candidates.length === 0) {
    return { entry: null, resolvedPeriod: null, exact: false };
  }
  const periods = candidates[0].periods;
  const resolution = resolvePeriod(periods, date);
  const entry =
    candidates.find((c) => c.period === resolution.resolved) ?? candidates[0];
  return {
    entry,
    resolvedPeriod: resolution.resolved,
    exact: resolution.exact,
  };
}
