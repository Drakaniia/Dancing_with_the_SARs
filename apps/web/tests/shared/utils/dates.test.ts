import { describe, expect, it } from "vitest";
import { formatDate, interpolateDates } from "@/shared/utils/dates";

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
