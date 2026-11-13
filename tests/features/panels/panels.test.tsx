import fs from "node:fs";
import path from "node:path";
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
  QUICK_STATS,
  SAMPLE_DATASETS,
  SAMPLE_LAYERS,
  SAMPLE_SELECTION,
  TIME_SERIES,
} from "@/fixtures/sample-dashboard";
import { type Manifest, validateManifest } from "@/shared/types/manifest";
import { resolvePeriod } from "@/shared/utils/dates";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useSelectionStore } from "@/stores/selectionStore";

function resetStores() {
  useLayerStore.setState({
    layers: SAMPLE_LAYERS.map((layer) => ({ ...layer })),
    activeLayerId: SAMPLE_LAYERS[0].id,
  });
  useDatasetStore.setState({
    datasets: [...SAMPLE_DATASETS],
    manifest: null,
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

describe("panel content & manifest contract", () => {
  it("validates the committed public/data/manifest.json with zero errors", () => {
    const manifestPath = path.resolve(
      process.cwd(),
      "public/data/manifest.json",
    );
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const doc = JSON.parse(raw) as Manifest;
    const errors = validateManifest(doc);
    expect(errors).toEqual([]);
    expect(doc.layers.length).toBe(318);
  });

  it("snaps timeline periods to nearest available date when exact period is absent", () => {
    const periods = ["2026-09", "2026-10"];
    expect(resolvePeriod(periods, "2026-09-25")).toEqual({
      requested: "2026-09-25",
      resolved: "2026-09",
      exact: false,
      isForecast: false,
    });
    expect(resolvePeriod(["2026-11", "2027-04"], "2027-02")).toEqual({
      requested: "2027-02",
      resolved: "2026-11",
      exact: false,
      isForecast: true,
    });
  });

  it("toggling a dataset layer row updates layerStore visibility", async () => {
    render(<ChangeTypeList />);

    const toggle = screen.getByRole("switch", {
      name: "HH Backscatter Change (monthly)",
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await userEvent.click(toggle);

    expect(layerById("radar-change-hh-monthly").visible).toBe(false);
  });

  it("lists the map layers and opacity percentage", () => {
    render(<MapLayersPanel />);

    expect(
      screen.getByText("HH Backscatter Change (monthly)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Satellite (Esri World Imagery)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sarangani & Davao Occidental Boundary"),
    ).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("opacity slider writes back to layerStore", () => {
    render(<MapLayersPanel />);

    fireEvent.keyDown(screen.getByRole("slider", { name: "Layer opacity" }), {
      key: "ArrowLeft",
    });

    expect(Math.round(layerById("radar-change-hh-monthly").opacity * 100)).toBe(
      77,
    );
  });

  it("shows a muted hint before a selection and the inspected values after one", () => {
    useSelectionStore.setState({ selected: null });
    const { rerender } = render(<LocationInfoPanel />);
    expect(
      screen.getByText("Click the map to inspect a location"),
    ).toBeInTheDocument();

    useSelectionStore.setState({ selected: SAMPLE_SELECTION });
    rerender(<LocationInfoPanel />);

    expect(screen.getByText("5.7760° N, 125.5013° E")).toBeInTheDocument();
    expect(
      screen.getByText("Malalan, Jose Abad Santos, Davao Occidental"),
    ).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("reflects the active layer, date and opacity in Current View", () => {
    render(<CurrentViewCard />);

    expect(
      screen.getByText("HH Backscatter Change (monthly)"),
    ).toBeInTheDocument();
    expect(screen.getByText("2026-10 (vs 2026-09)")).toBeInTheDocument();
  });

  it("draws continuous and categorical legends from the active layer", () => {
    const { rerender } = render(<LegendPanel />);
    expect(
      screen.getByText("HH Backscatter Change (monthly) (dB)"),
    ).toBeInTheDocument();

    useLayerStore.setState({
      activeLayerId: "earthquake-landslide-candidates",
    });
    rerender(<LegendPanel />);
    expect(screen.getByText("Possible landslide")).toBeInTheDocument();
    expect(screen.getByText("Not checked (cloudy)")).toBeInTheDocument();
  });

  it("renders the quick stats and switches analytics tabs", async () => {
    render(<QuickStatsPanel />);

    for (const stat of QUICK_STATS) {
      expect(screen.getByText(stat.value)).toBeInTheDocument();
    }

    await userEvent.click(screen.getByRole("tab", { name: "Slides" }));
    expect(
      screen.getByText("Post-8 Jun M7.8 Ranked Sites"),
    ).toBeInTheDocument();
  });
});
