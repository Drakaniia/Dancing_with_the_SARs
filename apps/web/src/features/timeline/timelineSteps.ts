import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { periodSortKey, resolvePeriod } from "@/shared/utils/dates";
import { useMemo } from "react";

/**
 * Timeline steps for one layer: its own periods in chronological order. Falls back to the global
 * dates when the layer has fewer than two real periods (static or single-period layers).
 */
export function layerTimelineSteps(
  periods: readonly string[] | undefined,
  fallback: string[],
): string[] {
  const real = (periods ?? []).filter((p) => p !== "static");
  if (real.length < 2) return fallback;
  return [...new Set(real)].sort((a, b) =>
    periodSortKey(a).localeCompare(periodSortKey(b)),
  );
}

/** Index of `current` within `steps`, snapping to the nearest period when it is not a step. */
export function stepIndexFor(steps: string[], current: string | null): number {
  if (steps.length === 0) return 0;
  const resolved = resolvePeriod(steps, current).resolved;
  return Math.max(steps.indexOf(resolved ?? ""), 0);
}

function globalDates(): string[] {
  const { manifest, datasets } = useDatasetStore.getState();
  return manifest?.dates ?? datasets[0]?.dates ?? [];
}

/** Non-reactive read used by the playback loop. */
export function getTimelineSteps(): string[] {
  const { layers, activeLayerId } = useLayerStore.getState();
  const active = layers.find((layer) => layer.id === activeLayerId);
  return layerTimelineSteps(active?.periods, globalDates());
}

/** Reactive steps for the active layer, used by the timeline UI. */
export function useTimelineSteps(): string[] {
  const periods = useLayerStore(
    (state) =>
      state.layers.find((layer) => layer.id === state.activeLayerId)?.periods,
  );
  const fallback = useDatasetStore(
    (state) => state.manifest?.dates ?? state.datasets[0]?.dates ?? [],
  );
  return useMemo(
    () => layerTimelineSteps(periods, fallback),
    [periods, fallback],
  );
}
