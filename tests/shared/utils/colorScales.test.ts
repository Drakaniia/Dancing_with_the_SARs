import { describe, expect, it } from "vitest";
import { COLOR_SCALES, gradientFromRamp } from "@/shared/utils/colorScales";

describe("colorScales", () => {
  it("has scales for legacy change types and all 7 data-native families", () => {
    expect(Object.keys(COLOR_SCALES)).toEqual([
      "elevation",
      "subsidence",
      "vegetation",
      "water",
      "radar",
      "landcover",
      "earthquake",
      "climate",
      "outlook",
      "terrain",
    ]);
  });

  it("builds a CSS linear-gradient from manifest ramp stops or classes", () => {
    const grad = gradientFromRamp({
      kind: "diverging",
      stops: [
        [-3, "#8c510a"],
        [0, "#f5f5f5"],
        [3, "#01665e"],
      ],
    });
    expect(grad).toContain("#8c510a");
    expect(grad).toContain("#01665e");
  });
});
