import { describe, expect, it } from "vitest";
import { curtainClip, syncBaselineLayers } from "@/features/comparison/ComparisonMap";
import type { LayerConfig } from "@/shared/types/layer";

type FakeMap = Parameters<typeof syncBaselineLayers>[0];

function fakeMap(initial: string[] = []) {
  const layers = new Map<string, { source?: string; paint?: Record<string, unknown> }>(
    initial.map((id) => [id, {}]),
  );
  const sources = new Set<string>();
  const paint: { id: string; value: unknown }[] = [];
  const map = {
    getLayer: (id: string) => layers.get(id),
    getSource: (id: string) => (sources.has(id) ? { id } : undefined),
    addSource: (id: string) => {
      sources.add(id);
    },
    addLayer: (layer: { id: string; source: string; paint: Record<string, unknown> }) => {
      layers.set(layer.id, layer);
    },
    removeLayer: (id: string) => {
      layers.delete(id);
    },
    removeSource: (id: string) => {
      sources.delete(id);
    },
    setPaintProperty: (id: string, _prop: string, value: unknown) => {
      paint.push({ id, value });
    },
  } as unknown as FakeMap;
  return { map, layers, sources, paint };
}

const radar = (visible: boolean, opacity = 0.9): LayerConfig => ({
  id: "radar-backscatter-hh-monthly",
  name: "HH Backscatter (monthly)",
  kind: "manifest-layer",
  visible,
  opacity,
  order: 0,
  periods: ["2026-09", "2026-10"],
});

describe("comparison curtain", () => {
  it("clips the baseline map to the left of the curtain", () => {
    expect(curtainClip(50)).toBe("inset(0 50.00% 0 0)");
    expect(curtainClip(5)).toBe("inset(0 95.00% 0 0)");
    expect(curtainClip(120)).toBe("inset(0 0.00% 0 0)");
  });
});

describe("baseline layers", () => {
  it("draws each visible data layer at the baseline date and skips hidden ones", () => {
    const { map, layers } = fakeMap();
    syncBaselineLayers(map, [radar(true)], null, "2026-09", []);

    const ids = [...layers.keys()];
    expect(ids).toHaveLength(1);
    expect(ids[0]).toMatch(/^compare-radar-backscatter-hh-monthly\|.*2026-09/);
    expect(layers.get(ids[0])?.paint?.["raster-opacity"]).toBe(0.9);

    const hidden = fakeMap();
    syncBaselineLayers(hidden.map, [radar(false)], null, "2026-09", []);
    expect(hidden.layers.size).toBe(0);
  });

  it("swaps the layer when the baseline date changes and drops it when switched off", () => {
    const { map, layers, sources } = fakeMap();
    syncBaselineLayers(map, [radar(true)], null, "2026-09", []);
    const first = [...layers.keys()][0];

    syncBaselineLayers(map, [radar(true)], null, "2026-10", [...layers.keys()]);
    const second = [...layers.keys()];
    expect(second).toHaveLength(1);
    expect(second[0]).not.toBe(first);
    expect(second[0]).toMatch(/2026-10/);
    expect(sources.has(`${first}-source`)).toBe(false);

    syncBaselineLayers(map, [radar(false)], null, "2026-10", [...layers.keys()]);
    expect(layers.size).toBe(0);
    expect(sources.size).toBe(0);
  });

  it("follows the layer's opacity slider", () => {
    const { map, layers, paint } = fakeMap();
    syncBaselineLayers(map, [radar(true, 0.9)], null, "2026-09", []);
    syncBaselineLayers(map, [radar(true, 0.4)], null, "2026-09", [...layers.keys()]);
    expect(paint.at(-1)?.value).toBe(0.4);
  });
});
