import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ChangeTypeList } from "@/features/change-types/ChangeTypeList";
import { CurrentViewCard } from "@/features/inspector/CurrentViewCard";
import { LegendPanel } from "@/features/inspector/LegendPanel";
import { LocationInfoPanel } from "@/features/inspector/LocationInfoPanel";
import { QuickStatsPanel } from "@/features/inspector/QuickStatsPanel";
import { MapLayersPanel } from "@/features/layers/MapLayersPanel";
import {
  SAMPLE_DATASETS,
  SAMPLE_LAYERS,
  SAMPLE_SELECTION,
  TIME_SERIES,
} from "@/fixtures/sample-dashboard";
import { gradientFor } from "@/shared/utils/colorScales";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useSelectionStore } from "@/stores/selectionStore";

/** The stores are module singletons; every test starts from the reference seed. */
function resetStores() {
  useLayerStore.setState({
    layers: SAMPLE_LAYERS.map((layer) => ({ ...layer })),
    activeLayerId: "subsidence",
  });
  useDatasetStore.setState({
    datasets: [...SAMPLE_DATASETS],
    currentDate: TIME_SERIES.currentDate,
    range: TIME_SERIES.range,
  });
  useSelectionStore.setState({ selected: SAMPLE_SELECTION });
}

function layerById(id: string) {
  const layer = useLayerStore
    .getState()
    .layers.find((candidate) => candidate.id === id);
  if (!layer) throw new Error(`missing layer ${id}`);
  return layer;
}

beforeEach(resetStores);

describe("panel content", () => {
  it("seeds the reference layer set into the store", () => {
    const changeTypes = useLayerStore
      .getState()
      .layers.filter((layer) => layer.kind === "change-type");

    expect(changeTypes.map((layer) => layer.visible)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(
      useLayerStore
        .getState()
        .layers.filter((layer) => layer.showInLayerList)
        .map((layer) => layer.name),
    ).toEqual([
      "NISAR Surface Change (Subsidence)",
      "Satellite (Base Map)",
      "Administrative Boundaries",
      "Cities / Labels",
    ]);
  });

  it("toggling a change type row updates layerStore visibility", async () => {
    render(<ChangeTypeList />);

    const toggle = screen.getByRole("switch", { name: "Land Subsidence" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await userEvent.click(toggle);

    expect(layerById("subsidence").visible).toBe(false);
  });

  it("lists the reference map layers and the reference opacity", () => {
    render(<MapLayersPanel />);

    for (const name of [
      "NISAR Surface Change (Subsidence)",
      "Satellite (Base Map)",
      "Administrative Boundaries",
      "Cities / Labels",
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("opacity slider writes back to layerStore", () => {
    render(<MapLayersPanel />);

    fireEvent.keyDown(screen.getByRole("slider", { name: "Layer opacity" }), {
      key: "ArrowLeft",
    });

    expect(Math.round(layerById("subsidence").opacity * 100)).toBe(69);
  });

  it("layer order buttons reorder the active layer", async () => {
    render(<MapLayersPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "Move layer up" }),
    );

    expect(useLayerStore.getState().layers.map((layer) => layer.id)).toEqual([
      "subsidence",
      "elevation",
      "vegetation",
      "water",
      "satellite-base",
      "admin-boundaries",
      "cities-labels",
    ]);
  });

  it("shows a muted hint before a selection and the fixture values after one", () => {
    useSelectionStore.setState({ selected: null });
    const { rerender } = render(<LocationInfoPanel />);
    expect(
      screen.getByText("Click the map to inspect a location"),
    ).toBeInTheDocument();

    useSelectionStore.setState({ selected: SAMPLE_SELECTION });
    rerender(<LocationInfoPanel />);

    expect(screen.getByText("14.5995° N, 120.9842° E")).toBeInTheDocument();
    expect(screen.getByText("Manila, Metro Manila")).toBeInTheDocument();
    expect(screen.getByText("3.2 cm/year")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("NISAR (pre-processed)")).toBeInTheDocument();
  });

  it("reflects the active layer, date and opacity in Current View", () => {
    render(<CurrentViewCard />);

    expect(screen.getByText("Land Subsidence")).toBeInTheDocument();
    expect(screen.getByText("Jun 2024")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("draws the legend from COLOR_SCALES with the fixture ticks and notes", () => {
    render(<LegendPanel />);

    expect(screen.getByText("Land Subsidence (cm/year)")).toBeInTheDocument();

    const scale = screen.getByRole("img");
    expect(scale.getAttribute("style")).toContain(gradientFor("subsidence"));

    for (const tick of ["-10", "-5", "0", "5", "10"]) {
      expect(screen.getByText(tick)).toBeInTheDocument();
    }
    expect(screen.getByText("Negative values = uplift")).toBeInTheDocument();
    expect(
      screen.getByText("Positive values = subsidence"),
    ).toBeInTheDocument();
  });

  it("renders the reference quick stats", () => {
    render(<QuickStatsPanel />);

    expect(screen.getByText("300,000 km²")).toBeInTheDocument();
    expect(screen.getByText("12,486 km²")).toBeInTheDocument();
    expect(screen.getByText("(4.2%)")).toBeInTheDocument();
    expect(screen.getByText("Jun 15, 2024")).toBeInTheDocument();
  });
});
