import { beforeEach, describe, expect, it } from "vitest";
import { nextDate, usePlaybackStore } from "@/features/timeline/usePlayback";
import { TIME_SERIES } from "@/fixtures/sample-dashboard";

const dates = [...TIME_SERIES.ticks];

beforeEach(() => {
  usePlaybackStore.getState().pause();
  usePlaybackStore.setState({ speed: 1 });
});

describe("nextDate", () => {
  it("steps forward through the series", () => {
    expect(nextDate(dates, "2025-Q1")).toBe("2025-06");
    expect(nextDate(dates, "2026-09")).toBe("2026-10");
  });

  it("wraps from the last date back to the first", () => {
    expect(nextDate(dates, "2027-04")).toBe("2025-Q1");
  });

  it("starts at the first date when the current date is unknown", () => {
    expect(nextDate(dates, null)).toBe("2025-Q1");
    expect(nextDate(dates, "Not a date")).toBe("2025-Q1");
  });

  it("returns null when there is no series", () => {
    expect(nextDate([], "2025-Q1")).toBeNull();
  });
});

describe("playback store", () => {
  it("shares one playing flag across consumers", () => {
    expect(usePlaybackStore.getState().playing).toBe(false);

    usePlaybackStore.getState().play();
    expect(usePlaybackStore.getState().playing).toBe(true);

    usePlaybackStore.getState().toggle();
    expect(usePlaybackStore.getState().playing).toBe(false);
  });

  it("clamps nothing but accepts every reference speed", () => {
    for (const speed of [0.5, 1, 2, 4] as const) {
      usePlaybackStore.getState().setSpeed(speed);
      expect(usePlaybackStore.getState().speed).toBe(speed);
    }
  });

  it("pause is idempotent and leaves the loop stopped", () => {
    usePlaybackStore.getState().pause();
    usePlaybackStore.getState().pause();
    expect(usePlaybackStore.getState().playing).toBe(false);
  });
});
