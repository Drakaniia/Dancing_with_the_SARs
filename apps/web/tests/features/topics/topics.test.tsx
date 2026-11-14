import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TOPICS } from "@/features/topics/topicsConfig";
import { TopicsPanel } from "@/features/topics/TopicsPanel";
import type { LayerConfig } from "@/shared/types/layer";
import { useLayerStore } from "@/stores/layerStore";
import { useTopicStore } from "@/stores/topicStore";

function manifestLayer(id: string, visible = false): LayerConfig {
  return {
    id,
    name: id,
    kind: "manifest-layer",
    visible,
    opacity: 0.95,
    order: 0,
    units: "dB",
    periods: ["2026-09", "2026-10"],
    ramp: {
      kind: "diverging",
      stops: [
        [-3, "#8c510a"],
        [0, "#f5f5f5"],
        [3, "#01665e"],
      ],
    },
  };
}

const IDS = [
  "radar-change-hh-monthly",
  "radar-change-hv-monthly",
  "radar-backscatter-hv-monthly",
  "earthquake-evi-anomaly-2026",
  "terrain-slope",
];

function visibleIds(): string[] {
  return useLayerStore
    .getState()
    .layers.filter((l) => l.kind === "manifest-layer" && l.visible)
    .map((l) => l.id);
}

beforeEach(() => {
  useLayerStore.setState({
    layers: IDS.map((id) =>
      manifestLayer(id, id === "radar-change-hh-monthly"),
    ),
    activeLayerId: "radar-change-hh-monthly",
  });
  useTopicStore.setState({
    topicId: "radar",
    viewId: "changed",
    option: 0,
    frame: 0,
  });
});

describe("Explore panel (topics)", () => {
  it("shows the four topics as tabs", () => {
    render(<TopicsPanel />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs.map((t) => t.textContent)).toEqual(
      TOPICS.map((t, i) => `${i + 1}${t.title}`),
    );
  });

  it("every view has notes and at least one map option", () => {
    for (const topic of TOPICS) {
      for (const view of topic.views) {
        expect(view.notes.length).toBeGreaterThan(0);
        expect(view.options.length).toBeGreaterThan(0);
      }
    }
  });

  it("shows one map at a time when a view is picked", async () => {
    render(<TopicsPanel />);
    await userEvent.click(
      screen.getByRole("button", { name: "🌳 Trees & plants" }),
    );
    expect(visibleIds()).toEqual(["radar-backscatter-hv-monthly"]);
  });

  it("switching topic shows that topic's first map", async () => {
    render(<TopicsPanel />);
    await userEvent.click(screen.getByRole("tab", { name: /Earthquake/ }));
    expect(useTopicStore.getState().topicId).toBe("quake");
    expect(visibleIds()).toEqual(["earthquake-evi-anomaly-2026"]);
  });

  it("image views hide the tile layers and still show a colour scale", async () => {
    render(<TopicsPanel />);
    await userEvent.click(screen.getByRole("tab", { name: /Earthquake/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "📐 Steep hills" }),
    );
    expect(visibleIds()).toEqual([]);
    expect(screen.getByLabelText("Colour scale")).toBeInTheDocument();
  });

  it("keeps the full layer list under All maps", async () => {
    render(<TopicsPanel />);
    const toggle = screen.getByRole("button", { name: /All maps/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
