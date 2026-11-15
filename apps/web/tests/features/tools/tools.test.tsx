import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ToolsPanel } from "@/features/tools/ToolsPanel";
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
