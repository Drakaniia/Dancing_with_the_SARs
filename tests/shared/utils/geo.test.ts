import { describe, expect, it } from "vitest";
import { PHILIPPINES_BOUNDS } from "@/shared/utils/geo";

describe("geo", () => {
  it("has correct Philippines bounds", () => {
    expect(PHILIPPINES_BOUNDS).toEqual([116, 4, 127, 21]);
  });
});
