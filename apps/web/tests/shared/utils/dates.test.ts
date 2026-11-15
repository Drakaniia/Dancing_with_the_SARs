import { describe, expect, it } from "vitest";
import { frameIndexFor } from "@/features/topics/topicsConfig";
import {
  formatDate,
  formatPeriod,
  interpolateDates,
  isDatedPeriod,
  isForecastPeriod,
  periodPrimary,
  resolvePeriod,
} from "@/shared/utils/dates";

describe("dates", () => {
  it("formats date for Philippines locale", () => {
    expect(formatDate("2024-01-15")).toContain("2024");
  });

  it("interpolates to nearest date", () => {
    const dates = ["2024-01-01", "2024-06-01", "2024-12-01"];
    expect(interpolateDates(dates, 0)).toBe("2024-01-01");
    expect(interpolateDates(dates, 1)).toBe("2024-12-01");
  });
});

describe("formatPeriod", () => {
  it("writes months, days and quarters in words", () => {
    expect(formatPeriod("2026-07")).toBe("July 2026");
    expect(formatPeriod("2026-07", "short")).toBe("Jul 2026");
    expect(formatPeriod("2026-06-28")).toBe("28 June 2026");
    expect(formatPeriod("2026-Q3")).toBe("Jul–Sep 2026");
    expect(formatPeriod("2026-06..09")).toBe("Jun–Sep 2026");
  });

  it("keeps the comparison in long form and drops it on ticks", () => {
    expect(formatPeriod("2026-10 (vs 2025-10)")).toBe(
      "October 2026 vs October 2025",
    );
    expect(formatPeriod("2026-10 (vs 2025-10)", "short")).toBe("Oct 2026");
  });

  it("leaves labels that are not dates alone", () => {
    expect(formatPeriod("static")).toBe("static");
    expect(formatPeriod("post-quake 2026")).toBe("post-quake 2026");
    expect(formatPeriod(null)).toBe("");
  });
});

describe("quarters among months", () => {
  const quarters = [
    "2025-Q1",
    "2025-Q2",
    "2025-Q3",
    "2025-Q4",
    "2026-Q1",
    "2026-Q2",
    "2026-Q3",
  ];

  it("treats a quarter as starting on its first month", () => {
    expect(periodPrimary("2026-Q3")).toBe("2026-07");
    expect(periodPrimary("2026-10 (vs 2025-10)")).toBe("2026-10");
  });

  it("picks the latest quarter for a later month (not one from last year)", () => {
    expect(resolvePeriod(quarters, "2026-10").resolved).toBe("2026-Q3");
    expect(resolvePeriod(quarters, "2026-05").resolved).toBe("2026-Q2");
    expect(resolvePeriod(quarters, "2025-01").resolved).toBe("2025-Q1");
  });

  it("snaps by value in a list that has months then quarters", () => {
    const mixed = ["2025-05", "2025-06", "2025-07", "2025-Q1", "2025-Q2", "2025-Q3"];
    expect(resolvePeriod(mixed, "2025-06-15").resolved).toBe("2025-06");
    expect(resolvePeriod(mixed, "2025-02").resolved).toBe("2025-Q1");
    expect(resolvePeriod(mixed, "2024-12").resolved).toBe("2025-Q1");
  });

  it("does not call observed 2026 quarters a forecast", () => {
    expect(isForecastPeriod("2026-Q1")).toBe(false);
    expect(isForecastPeriod("2026-Q3")).toBe(false);
    expect(isForecastPeriod("2026-11")).toBe(true);
  });
});

describe("isDatedPeriod", () => {
  it("accepts months, days and quarters but not picture labels", () => {
    expect(isDatedPeriod("2026-07")).toBe(true);
    expect(isDatedPeriod("2026-06-28")).toBe(true);
    expect(isDatedPeriod("2026-Q3")).toBe(true);
    expect(isDatedPeriod("3 → 10 Jun")).toBe(false);
    expect(isDatedPeriod("static")).toBe(false);
  });
});

describe("frameIndexFor", () => {
  const frames = ["2026-11", "2026-12", "2027-01"].map((label) => ({
    label,
    file: `${label}.webp`,
  }));

  it("follows the app's date through the picture frames", () => {
    expect(frameIndexFor(frames, "2026-12")).toBe(1);
    expect(frameIndexFor(frames, "2027-01")).toBe(2);
    expect(frameIndexFor(frames, "2026-10")).toBe(0);
  });

  it("uses the only frame of a one-picture map", () => {
    expect(frameIndexFor([{ label: "static", file: "a.webp" }], "2026-12")).toBe(
      0,
    );
  });
});
