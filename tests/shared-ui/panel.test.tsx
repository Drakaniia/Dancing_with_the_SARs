import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Panel } from "@/shared/ui/Panel";
import { DEFAULT_PANELS, useUiStore } from "@/stores/uiStore";

const body = (id: string) => document.getElementById(id) as HTMLElement;
const header = () =>
  screen.getByRole("button", { name: /Surface Change Types/i });

function renderPanel() {
  return render(
    <Panel id="change-types" title="Surface Change Types">
      <p>Land Subsidence</p>
    </Panel>,
  );
}

beforeEach(() => {
  useUiStore.setState({ panels: { ...DEFAULT_PANELS } });
});

describe("Panel", () => {
  it("starts expanded and wires the header to the body", () => {
    renderPanel();

    const control = header();
    expect(control).toHaveAttribute("aria-expanded", "true");

    const controls = control.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(body(controls as string)).toBeInTheDocument();
    expect(body(controls as string)).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText("Land Subsidence")).toBeInTheDocument();
  });

  it("collapses on click and records the state in the store", async () => {
    renderPanel();

    await userEvent.click(header());
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(useUiStore.getState().panels["change-types"]).toBe(false);

    const controls = header().getAttribute("aria-controls") as string;
    expect(body(controls)).toHaveAttribute("aria-hidden", "true");
    await waitFor(() => {
      expect((body(controls) as HTMLElement).inert).toBe(true);
    });
  });

  it("toggles from the keyboard", async () => {
    renderPanel();

    header().focus();
    await userEvent.keyboard("{Enter}");
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(useUiStore.getState().panels["change-types"]).toBe(false);

    await userEvent.keyboard("[Space]");
    expect(header()).toHaveAttribute("aria-expanded", "true");
    expect(useUiStore.getState().panels["change-types"]).toBe(true);
  });

  it("follows the store when the state changes elsewhere", async () => {
    renderPanel();
    expect(header()).toHaveAttribute("aria-expanded", "true");

    useUiStore.getState().togglePanel("change-types");
    await waitFor(() => {
      expect(header()).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("honours defaultOpen when the store has no entry for the panel", async () => {
    const empty = { ...DEFAULT_PANELS };
    for (const id of Object.keys(empty)) delete empty[id as keyof typeof empty];
    useUiStore.setState({ panels: empty });

    render(
      <Panel id="change-types" title="Surface Change Types" defaultOpen={false}>
        <p>Land Subsidence</p>
      </Panel>,
    );
    expect(header()).toHaveAttribute("aria-expanded", "false");

    // The first activation writes an explicit preference into the store.
    await userEvent.click(header());
    expect(useUiStore.getState().panels["change-types"]).toBe(true);
  });
});
