import { describe, expect, it } from "vitest";
import { COLOR_SCALES } from "@/shared/utils/colorScales";

describe("colorScales", () => {
  it("has scales for all 4 change types", () => {
    expect(Object.keys(COLOR_SCALES)).toEqual([
      "elevation",
      "subsidence",
      "vegetation",
      "water",
    ]);
  });
});
