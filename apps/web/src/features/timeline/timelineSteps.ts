import { findTopic, findView } from "@/features/topics/topicsConfig";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useTopicStore } from "@/stores/topicStore";
import { periodSortKey, resolvePeriod } from "@/shared/utils/dates";
import { useMemo } from "react";

/**
 * Timeline steps for one layer: its own periods in chronological order. A layer with a single
 * period has a one-step timeline (nothing to play); a static layer, or no layer, falls back to
 * the global dates.
 */
export function layerTimelineSteps(
  periods: readonly string[] | undefined,
  fallback: string[],
): string[] {
  const real = (periods ?? []).filter((p) => p !== "static");
  if (real.length === 0) return fallback;
  if (real.length === 1) return real;
  return [...new Set(real)].sort((a, b) =>
    periodSortKey(a).localeCompare(periodSortKey(b)),
  );
}

/**
 * Frame labels of the Explore panel's picture map (e.g. the 12 outlook months), or null when the
 * current view is a tile layer. Only used while no tile layer is on the map.
 */
export function topicImageSteps(
  topic: { topicId: Parameters<typeof findTopic>[0]; viewId: string; option: number },
  anyTileLayerVisible: boolean,
): string[] | null {
  if (anyTileLayerVisible) return null;
  const view = findView(findTopic(topic.topicId), topic.viewId);
  const opt = view.options[topic.option] ?? view.options[0];
  if (opt?.kind !== "images") return null;
  return opt.frames.map((f) => f.label);
}

type Layers = ReturnType<typeof useLayerStore.getState>["layers"];

function isVisibleTileLayer(l: Layers[number]): boolean {
  return (l.kind === "manifest-layer" || l.kind === "change-type") && l.visible;
}

function anyTileLayerVisible(layers: Layers): boolean {
  return layers.some(isVisibleTileLayer);
}

/** Whether a visible tile layer other than the active one has more than one date to play. */
function otherLayerHasDates(layers: Layers, activeId: string | null): boolean {
  return layers.some(
    (l) =>
      l.id !== activeId &&
      isVisibleTileLayer(l) &&
      new Set((l.periods ?? []).filter((p) => p !== "static")).size > 1,
  );
}

/**
 * Steps for the active layer. A one-date active layer gives a one-step timeline, unless another
 * visible layer still has dates to move through; then the global dates are used.
 */
function activeLayerSteps(
  periods: readonly string[] | undefined,
  othersHaveDates: boolean,
  fallback: string[],
): string[] {
  const steps = layerTimelineSteps(periods, fallback);
  return steps.length === 1 && othersHaveDates && fallback.length > 1
    ? fallback
    : steps;
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
  const images = topicImageSteps(
    useTopicStore.getState(),
    anyTileLayerVisible(layers),
  );
  if (images) return images;
  const active = layers.find((layer) => layer.id === activeLayerId);
  return activeLayerSteps(
    active?.periods,
    otherLayerHasDates(layers, activeLayerId),
    globalDates(),
  );
}

/** Reactive steps for the active layer, used by the timeline UI. */
export function useTimelineSteps(): string[] {
  const periods = useLayerStore(
    (state) =>
      state.layers.find((layer) => layer.id === state.activeLayerId)?.periods,
  );
  const tilesOn = useLayerStore((state) => anyTileLayerVisible(state.layers));
  const othersHaveDates = useLayerStore((state) =>
    otherLayerHasDates(state.layers, state.activeLayerId),
  );
  const topicId = useTopicStore((s) => s.topicId);
  const viewId = useTopicStore((s) => s.viewId);
  const option = useTopicStore((s) => s.option);
  const fallback = useDatasetStore(
    (state) => state.manifest?.dates ?? state.datasets[0]?.dates ?? [],
  );
  return useMemo(
    () =>
      topicImageSteps({ topicId, viewId, option }, tilesOn) ??
      activeLayerSteps(periods, othersHaveDates, fallback),
    [periods, othersHaveDates, fallback, tilesOn, topicId, viewId, option],
  );
}
