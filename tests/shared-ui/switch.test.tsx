import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "@/shared/ui/Switch";

const knob = () => document.querySelector("[data-switch-knob]") as HTMLElement;

describe("Switch", () => {
  it("exposes switch semantics", () => {
    render(
      <Switch checked={false} onChange={() => {}} label="Land Subsidence" />,
    );

    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(control).toHaveAccessibleName("Land Subsidence");
    expect(control).toHaveAttribute("type", "button");
  });

  it("toggles on click", async () => {
    const onChange = vi.fn();
    render(
      <Switch checked={false} onChange={onChange} label="Land Subsidence" />,
    );

    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("toggles from the keyboard", async () => {
    const onChange = vi.fn();
    render(
      <Switch checked={true} onChange={onChange} label="Land Subsidence" />,
    );

    const control = screen.getByRole("switch");
    control.focus();
    expect(control).toHaveFocus();

    await userEvent.keyboard("[Space]");
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("stays inert while disabled", async () => {
    const onChange = vi.fn();
    render(
      <Switch
        checked={false}
        onChange={onChange}
        label="Land Subsidence"
        disabled
      />,
    );

    const control = screen.getByRole("switch");
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(control, { pointerEventsCheck: 0 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("slides the knob by the token travel when checked", async () => {
    const { rerender } = render(
      <Switch checked={false} onChange={() => {}} label="Land Subsidence" />,
    );
    await waitFor(() => {
      expect(knob().style.transform).not.toContain("16px");
    });

    rerender(
      <Switch checked={true} onChange={() => {}} label="Land Subsidence" />,
    );
    await waitFor(() => {
      expect(knob().style.transform).toContain("translateX(16px)");
    });
  });
});
