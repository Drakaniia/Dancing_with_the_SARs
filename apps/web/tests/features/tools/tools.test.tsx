import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ToolsPanel } from "@/features/tools/ToolsPanel";
import { Toaster } from "@/shared/ui/Toaster";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useToastStore } from "@/stores/toastStore";
import { DEFAULT_EXPANDED_RAILS, DEFAULT_PANELS, useUiStore } from "@/stores/uiStore";

function resetUi(railMode: "wide" | "default" | "compact") {
  useUiStore.setState({
    railMode,
    activeTool: null,
    openRails: { left: false, right: false },
    expandedRails: { ...DEFAULT_EXPANDED_RAILS },
    panels: { ...DEFAULT_PANELS, "location-info": false },
  });
}

describe("revealInspector", () => {
  beforeEach(() => resetUi("wide"));

  it("expands the collapsed right rail with Location Info open on wide screens", () => {
    expect(useUiStore.getState().expandedRails.right).toBe(false);
    useUiStore.getState().revealInspector();
    const state = useUiStore.getState();
    expect(state.expandedRails.right).toBe(true);
    expect(state.panels["location-info"]).toBe(true);
    expect(state.openRails.right).toBe(false);
  });

  it("opens the right sheet instead on narrower screens", () => {
    resetUi("default");
    useUiStore.getState().revealInspector();
    const state = useUiStore.getState();
    expect(state.openRails.right).toBe(true);
    expect(state.panels["location-info"]).toBe(true);
  });
});

describe("Inspect tool", () => {
  beforeEach(() => resetUi("wide"));

  it("turns on and brings the inspector into view", async () => {
    render(<ToolsPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Inspect" }));

    const state = useUiStore.getState();
    expect(state.activeTool).toBe("draw");
    expect(state.expandedRails.right).toBe(true);
    expect(state.panels["location-info"]).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Inspect" }));
    expect(useUiStore.getState().activeTool).toBeNull();
  });
});

describe("Bookmark tool", () => {
  beforeEach(() => {
    resetUi("wide");
    useBookmarkStore.setState({ bookmarks: [] });
    useToastStore.setState({ toasts: [] });
    useSelectionStore.setState({
      selected: { lng: 125.2, lat: 5.9, placeName: "Glan, Sarangani" },
    });
  });

  it("confirms with a toast and lists the bookmark under the tools", async () => {
    render(
      <>
        <ToolsPanel />
        <Toaster />
      </>,
    );
    expect(screen.getByText(/No bookmarks yet/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Bookmark" }));

    expect(screen.getByRole("status")).toHaveTextContent("Bookmark saved: Glan, Sarangani");
    const list = screen.getByRole("list", { name: "Bookmarks (1)" });
    expect(within(list).getByRole("button", { name: "Glan, Sarangani" })).toBeInTheDocument();
  });

  it("flies to a saved bookmark and removes it", async () => {
    useBookmarkStore.setState({
      bookmarks: [{ id: "b1", name: "Malita", center: [125.6, 6.4], zoom: 11 }],
    });
    render(<ToolsPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Malita" }));
    expect(useUiStore.getState().flyToTarget).toMatchObject({ lng: 125.6, lat: 6.4, zoom: 11 });

    await userEvent.click(screen.getByRole("button", { name: "Remove bookmark Malita" }));
    expect(useBookmarkStore.getState().bookmarks).toEqual([]);
  });
});
