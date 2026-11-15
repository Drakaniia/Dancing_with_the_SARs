import { describe, expect, it } from "vitest";
import { measureGeoJson } from "@/features/map/overlays/MeasureOverlay";
import { useUiStore } from "@/stores/uiStore";

describe("measure overlay features", () => {
  it("draws nothing before the first click", () => {
    expect(measureGeoJson([]).features).toEqual([]);
  });

  it("draws a dot for the first point", () => {
    const { features } = measureGeoJson([[125.1, 5.9]]);
    expect(features).toHaveLength(1);
    expect(features[0].geometry).toEqual({ type: "Point", coordinates: [125.1, 5.9] });
  });

  it("draws both dots and the line between them for two points", () => {
    const { features } = measureGeoJson([
      [125.1, 5.9],
      [125.4, 6.1],
    ]);
    expect(features.map((f) => f.geometry.type)).toEqual(["LineString", "Point", "Point"]);
    expect(features[0].geometry.coordinates).toEqual([
      [125.1, 5.9],
      [125.4, 6.1],
    ]);
  });
});

describe("measure points in the UI store", () => {
  it("starts a new measurement on the third click and clears when the tool is switched off", () => {
    useUiStore.setState({ activeTool: "measure", measurePoints: [] });
    const { addMeasurePoint } = useUiStore.getState();
    addMeasurePoint([1, 1]);
    addMeasurePoint([2, 2]);
    expect(useUiStore.getState().measurePoints).toHaveLength(2);
    addMeasurePoint([3, 3]);
    expect(useUiStore.getState().measurePoints).toEqual([[3, 3]]);

    useUiStore.getState().setActiveTool(null);
    expect(useUiStore.getState().measurePoints).toEqual([]);
  });
});
