import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import {
  DEFAULT_EXPANDED_RAILS,
  DEFAULT_PANELS,
  useUiStore,
} from "@/stores/uiStore";

const LEFT_PANELS = [
  "Surface Change Types",
  "Time Series",
  "Map Layers",
  "Comparison View",
  "Tools",
];
const RIGHT_PANELS = ["Current View", "Legend", "Location Info", "Quick Stats"];

/** Drives the breakpoint watcher; jsdom has no real layout, so `innerWidth` is the input. */
function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
}

/** Panel `section`s carry their name via `aria-labelledby`; read it back in DOM order. */
function regionTitles(): string[] {
  return screen.queryAllByRole("region").map((region) => {
    const labelledBy = region.getAttribute("aria-labelledby");
    return (
      (labelledBy
        ? document.getElementById(labelledBy)?.textContent
        : ""
      )?.trim() ?? ""
    );
  });
}

beforeEach(() => {
  setViewportWidth(1600);
  useUiStore.setState({
    railMode: "wide",
    openRails: { left: false, right: false },
    expandedRails: { ...DEFAULT_EXPANDED_RAILS },
    panels: { ...DEFAULT_PANELS },
  });
});

function gridColumns(): string {
  return (screen.getByRole("main").parentElement as HTMLElement).style
    .gridTemplateColumns;
}

describe("AppShell", () => {
  it("starts wide with the left rail open and the right rail collapsed to its icon strip", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getAllByRole("complementary")).toHaveLength(2);
    expect(regionTitles()).toEqual(LEFT_PANELS);
    for (const title of RIGHT_PANELS) {
      expect(
        screen.getByRole("button", { name: `Show ${title}` }),
      ).toBeInTheDocument();
    }
    expect(gridColumns()).toBe(
      "var(--rail-left-w-wide) 1fr var(--rail-collapsed-w)",
    );
  });

  it("expands the right rail in the locked panel order and collapses it again", async () => {
    render(<App />);

    await userEvent.click(
      screen.getByRole("button", { name: "Expand inspector" }),
    );
    expect(regionTitles()).toEqual([...LEFT_PANELS, ...RIGHT_PANELS]);
    expect(gridColumns()).toBe(
      "var(--rail-left-w-wide) 1fr var(--rail-right-w)",
    );
    const collapse = screen.getByRole("button", {
      name: "Collapse inspector",
    });
    expect(collapse).toHaveFocus();

    await userEvent.click(collapse);
    expect(regionTitles()).toEqual(LEFT_PANELS);
    expect(useUiStore.getState().expandedRails.right).toBe(false);
    expect(
      screen.getByRole("button", { name: "Expand inspector" }),
    ).toHaveFocus();
  });

  it("opens the rail at a strip panel, unfolding that panel", async () => {
    useUiStore.getState().setPanelOpen("legend", false);
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: "Show Legend" }));

    expect(useUiStore.getState().panels.legend).toBe(true);
    const legendHeader = screen.getByRole("button", { name: "Legend" });
    expect(legendHeader).toHaveAttribute("aria-expanded", "true");
    expect(legendHeader).toHaveFocus();
  });

  it("collapses the left rail to a strip the same way", async () => {
    render(<App />);

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse controls" }),
    );
    expect(regionTitles()).toEqual([]);
    expect(gridColumns()).toBe(
      "var(--rail-collapsed-w) 1fr var(--rail-collapsed-w)",
    );
    expect(
      screen.getByRole("button", { name: "Show Time Series" }),
    ).toBeInTheDocument();
  });

  it("overlays the right rail at the default breakpoint while the left stays inline", async () => {
    setViewportWidth(1200);
    render(<App />);

    expect(regionTitles()).toEqual(LEFT_PANELS);
    expect(screen.getAllByRole("complementary")).toHaveLength(1);

    await userEvent.click(
      screen.getByRole("button", { name: "Show right rail" }),
    );
    await screen.findByRole("dialog", {
      name: "Location and layer information",
    });
    expect(regionTitles()).toEqual([...LEFT_PANELS, ...RIGHT_PANELS]);
  });

  it("turns both rails into overlay sheets in compact mode and pushes nothing", async () => {
    setViewportWidth(800);
    render(<App />);

    expect(screen.queryAllByRole("region")).toHaveLength(0);
    expect(screen.queryAllByRole("complementary")).toHaveLength(0);

    const toggle = screen.getByRole("button", { name: "Show left rail" });
    await userEvent.click(toggle);

    const sheet = await screen.findByRole("dialog", {
      name: "Surface change controls",
    });
    expect(regionTitles()).toEqual(LEFT_PANELS);
    expect(sheet.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(toggle).toHaveFocus();
    });
  });
});
