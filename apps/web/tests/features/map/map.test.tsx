import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapCanvas } from "@/features/map/MapCanvas";
import {
  applyLayerBindings,
  applyTerrain,
  resolveLayerBindings,
  STYLE_LAYER_BY_STORE_ID,
  TERRAIN_EXAGGERATION,
  TERRAIN_PITCH,
  TERRAIN_SOURCE_ID,
} from "@/features/map/useMapLibre";
import { SAMPLE_LAYERS } from "@/fixtures/sample-dashboard";
import { metersPerPixel, tileSegment, tileTemplate } from "@/shared/utils/geo";
import { useLayerStore } from "@/stores/layerStore";
import { useUiStore } from "@/stores/uiStore";

type MapLike = Parameters<typeof applyLayerBindings>[0];
type TerrainMapLike = Parameters<typeof applyTerrain>[0];

function fakeTerrainMap(hasDem: boolean) {
  let terrain: unknown = null;
  const pitches: number[] = [];
  const map = {
    getSource: (id: string) =>
      hasDem && id === TERRAIN_SOURCE_ID ? { id } : undefined,
    getTerrain: () => terrain,
    setTerrain: (value: unknown) => {
      terrain = value;
    },
    easeTo: (options: { pitch: number }) => {
      pitches.push(options.pitch);
    },
  } as unknown as TerrainMapLike;
  return { map, pitches, getTerrain: () => terrain };
}

function fakeMap(existing: string[]) {
  const calls: { layerId: string; value: unknown }[] = [];
  const map = {
    getLayer: (id: string) => (existing.includes(id) ? { id } : undefined),
    setLayoutProperty: (id: string, _property: string, value: unknown) => {
      calls.push({ layerId: id, value });
    },
  } as unknown as MapLike;
  return { map, calls };
}

describe("map layer bindings", () => {
  it("maps store layer ids to style layer ids and skips raster overlay layers", () => {
    const bindings = resolveLayerBindings([...SAMPLE_LAYERS]);

    expect(bindings).toEqual([
      { layerId: "basemap", visible: true },
      { layerId: "aoi-boundary", visible: true },
      { layerId: "landslide-polygons", visible: true },
      { layerId: "cities-labels", visible: true },
    ]);
    expect(Object.keys(STYLE_LAYER_BY_STORE_ID)).toHaveLength(5);
  });

  it("applies visibility only to style layers the style actually defines", () => {
    const { map, calls } = fakeMap(["basemap", "cities-labels"]);

    applyLayerBindings(map, [
      { layerId: "basemap", visible: false },
      { layerId: "admin-boundaries", visible: true },
      { layerId: "cities-labels", visible: true },
    ]);

    expect(calls).toEqual([
      { layerId: "basemap", value: "none" },
      { layerId: "cities-labels", value: "visible" },
    ]);
  });

  it("renders the WebGL fallback instead of throwing in a headless environment", () => {
    useLayerStore.setState({
      layers: SAMPLE_LAYERS.map((layer) => ({ ...layer })),
    });

    render(<MapCanvas />);

    expect(
      screen.getByText("Map unavailable — WebGL is required"),
    ).toBeInTheDocument();
  });
});

describe("3D terrain toggle", () => {
  it("drapes the map over the DEM and pitches the camera, then flattens it back", () => {
    const { map, pitches, getTerrain } = fakeTerrainMap(true);

    expect(applyTerrain(map, true, 0)).toBe(true);
    expect(getTerrain()).toEqual({
      source: TERRAIN_SOURCE_ID,
      exaggeration: TERRAIN_EXAGGERATION,
    });

    expect(applyTerrain(map, true, 0)).toBe(false);

    expect(applyTerrain(map, false, 0)).toBe(true);
    expect(getTerrain()).toBeNull();
    expect(pitches).toEqual([TERRAIN_PITCH, 0]);
  });

  it("stays flat when the style has no DEM source", () => {
    const { map, pitches, getTerrain } = fakeTerrainMap(false);

    expect(applyTerrain(map, true, 0)).toBe(false);
    expect(getTerrain()).toBeNull();
    expect(pitches).toEqual([]);
  });

  it("toggles the 3D flag in the UI store", () => {
    useUiStore.setState({ terrain3d: false });
    useUiStore.getState().toggleTerrain3d();
    expect(useUiStore.getState().terrain3d).toBe(true);
    useUiStore.getState().setTerrain3d(false);
    expect(useUiStore.getState().terrain3d).toBe(false);
  });
});

describe("map scale & tile path helpers", () => {
  it("resolves ground resolution per Web Mercator", () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(156543.03392, 5);
    expect(metersPerPixel(0, 1)).toBeCloseTo(78271.51696, 4);
    expect(metersPerPixel(60, 0)).toBeCloseTo(156543.03392 * 0.5, 4);
  });

  it("normalizes period strings into URL-safe tile segments without spaces", () => {
    expect(tileSegment("2026-10 (vs 2026-09)")).toBe("2026-10-vs-2026-09");
    expect(
      tileTemplate(
        "radar-change-hh-monthly",
        tileSegment("2026-10 (vs 2026-09)"),
      ),
    ).toBe("tiles/radar-change-hh-monthly/2026-10-vs-2026-09/{z}/{x}/{y}.png");
  });
});
