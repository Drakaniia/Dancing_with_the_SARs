import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE_STEP_MS,
  usePlaybackStore,
} from "@/features/timeline/usePlayback";
import {
  isFramePending,
  setFramePending,
} from "@/features/timeline/frameLoading";
import {
  getTimelineSteps,
  layerTimelineSteps,
  stepIndexFor,
} from "@/features/timeline/timelineSteps";
import type { Manifest } from "@/shared/types/manifest";
import { resolvePeriod } from "@/shared/utils/dates";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";

const manifest = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../public/data/manifest.json"),
    "utf8",
  ),
) as Manifest;

afterEach(() => {
  setFramePending(false);
  usePlaybackStore.getState().pause();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("layerTimelineSteps", () => {
  const fallback = ["a", "b", "c"];

  it("sorts a layer's periods chronologically and drops duplicates", () => {
    expect(
      layerTimelineSteps(
        ["2026-10", "2025-12", "2026-01", "2026-01"],
        fallback,
      ),
    ).toEqual(["2025-12", "2026-01", "2026-10"]);
  });

  it("falls back to the global dates for static layers or no layer", () => {
    expect(layerTimelineSteps(["static"], fallback)).toBe(fallback);
    expect(layerTimelineSteps(undefined, fallback)).toBe(fallback);
  });

  it("gives a single-period layer a one-step timeline (nothing to play)", () => {
    expect(layerTimelineSteps(["2026-10 (vs 2026-09)"], fallback)).toEqual([
      "2026-10 (vs 2026-09)",
    ]);
  });
});

describe("stepIndexFor", () => {
  const steps = ["2026-11", "2026-12", "2027-01"];

  it("finds exact steps and snaps unknown dates", () => {
    expect(stepIndexFor(steps, "2026-12")).toBe(1);
    expect(stepIndexFor(steps, "2020")).toBe(0);
    expect(stepIndexFor(steps, null)).toBe(0);
    expect(stepIndexFor([], "2026-12")).toBe(0);
  });
});

describe("real manifest playback", () => {
  const layers = manifest.layers.filter(
    (l, i, all) => all.findIndex((x) => x.id === l.id) === i,
  );

  it("every multi-period layer steps through only its own periods, each a new frame", () => {
    for (const layer of layers) {
      const steps = layerTimelineSteps(layer.periods, manifest.dates);
      if (steps === manifest.dates) continue;
      expect(new Set(steps).size).toBe(steps.length);
      const frames = steps.map((s) => resolvePeriod(layer.periods, s).resolved);
      expect(new Set(frames).size).toBe(steps.length);
    }
  });

  it("tick advances the active layer one period at a time and wraps", () => {
    const layer = layers.find((l) => l.id === "outlook-ndvi-expected");
    expect(layer).toBeDefined();
    useDatasetStore.getState().setManifest(manifest);
    useLayerStore.getState().setActive("outlook-ndvi-expected");
    const steps = getTimelineSteps();
    expect(steps).toHaveLength(12);

    let now = 0;
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    useDatasetStore.getState().setCurrentDate(steps[0]);
    usePlaybackStore.getState().setSpeed(1);
    usePlaybackStore.getState().play();

    const seen: (string | null)[] = [];
    for (let i = 0; i < steps.length; i++) {
      now += BASE_STEP_MS + 1;
      callbacks.shift()?.(now);
      seen.push(useDatasetStore.getState().currentDate);
    }
    expect(seen).toEqual([...steps.slice(1), steps[0]]);
  });
});

describe("playback waits for the map", () => {
  it("holds the date while the frame is still loading, then moves on", () => {
    useDatasetStore.getState().setManifest(manifest);
    useLayerStore.getState().setActive("outlook-ndvi-expected");
    const steps = getTimelineSteps();

    let now = 0;
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    useDatasetStore.getState().setCurrentDate(steps[0]);
    usePlaybackStore.getState().play();

    setFramePending(true);
    expect(isFramePending()).toBe(true);
    now += BASE_STEP_MS + 1;
    callbacks.shift()?.(now);
    expect(useDatasetStore.getState().currentDate).toBe(steps[0]);

    setFramePending(false);
    now += 1;
    callbacks.shift()?.(now);
    expect(useDatasetStore.getState().currentDate).toBe(steps[1]);
  });
});
