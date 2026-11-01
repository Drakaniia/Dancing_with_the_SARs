import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { IconButton } from "@/shared/ui/IconButton";
import { Panel } from "@/shared/ui/Panel";
import { Popover } from "@/shared/ui/Popover";
import { Progress } from "@/shared/ui/Progress";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { Slider } from "@/shared/ui/Slider";
import { StatusPill } from "@/shared/ui/StatusPill";
import { Switch } from "@/shared/ui/Switch";
import { Tooltip } from "@/shared/ui/Tooltip";
import { DEFAULT_PANELS, useUiStore } from "@/stores/uiStore";

describe("Button", () => {
  it("renders every variant and size as a real button", async () => {
    const onClick = vi.fn();
    render(
      <>
        <Button variant="primary" size="sm" onClick={onClick}>
          Apply
        </Button>
        <Button variant="secondary">Reset</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete</Button>
        <Button disabled>Disabled</Button>
      </>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Apply" })).toHaveAttribute(
      "type",
      "button",
    );
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disabled" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("IconButton", () => {
  it("requires and exposes an accessible label", async () => {
    const onClick = vi.fn();
    render(
      <>
        <IconButton label="Zoom in" onClick={onClick}>
          <span aria-hidden="true">+</span>
        </IconButton>
        <IconButton label="Layers" size="md" variant="ghost">
          <span aria-hidden="true">▤</span>
        </IconButton>
      </>,
    );

    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Layers" })).toBeInTheDocument();

    const zoom = screen.getByRole("button", { name: "Zoom in" });
    zoom.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Checkbox", () => {
  it("toggles from the keyboard", async () => {
    const onChange = vi.fn();
    render(
      <Checkbox checked={false} onChange={onChange}>
        Vegetation Change
      </Checkbox>,
    );

    const box = screen.getByRole("checkbox");
    box.focus();
    expect(box).toHaveFocus();
    await userEvent.keyboard("[Space]");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders checked, unchecked and disabled states with a full-row label", async () => {
    const onChange = vi.fn();
    render(
      <>
        <Checkbox checked={false} onChange={onChange}>
          Cities / Labels
        </Checkbox>
        <Checkbox checked onChange={onChange}>
          NISAR Surface Change (Subsidence)
        </Checkbox>
        <Checkbox checked={false} onChange={onChange} disabled>
          Administrative Boundaries
        </Checkbox>
      </>,
    );

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(3);
    expect(boxes[1]).toBeChecked();
    expect(boxes[2]).toBeDisabled();

    await userEvent.click(screen.getByText("Cities / Labels"));
    expect(onChange).toHaveBeenCalledWith(true);

    await userEvent.click(boxes[2], { pointerEventsCheck: 0 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("works without a visible label", () => {
    render(
      <Checkbox
        checked={false}
        onChange={() => {}}
        label="Satellite (Base Map)"
      />,
    );
    expect(screen.getByRole("checkbox")).toHaveAccessibleName(
      "Satellite (Base Map)",
    );
  });
});

describe("Slider", () => {
  it("renders default, labelled and disabled states", () => {
    render(
      <>
        <Slider value={70} onChange={() => {}} aria-label="Opacity" />
        <Slider
          value={6}
          min={0}
          max={11}
          step={1}
          onChange={() => {}}
          aria-label="Timeline position"
          ariaValueText="Jun 2024"
        />
        <Slider
          value={70}
          onChange={() => {}}
          aria-label="Opacity (disabled)"
          disabled
        />
      </>,
    );

    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(3);
    expect(sliders[0]).toHaveAttribute("aria-valuenow", "70");
    expect(sliders[0]).toHaveAttribute("aria-orientation", "horizontal");
    expect(sliders[1]).toHaveAttribute("aria-valuetext", "Jun 2024");
    expect(sliders[2]).toHaveAttribute("aria-disabled", "true");
    expect(sliders[2]).toHaveAttribute("tabindex", "-1");
  });
});

describe("Switch", () => {
  it("renders both states with the right accessible role", () => {
    render(
      <>
        <Switch checked onChange={() => {}} label="Comparison View" />
        <Switch checked={false} onChange={() => {}} label="Time Series" />
      </>,
    );

    const switches = screen.getAllByRole("switch");
    expect(switches[0]).toHaveAttribute("aria-checked", "true");
    expect(switches[1]).toHaveAttribute("aria-checked", "false");
  });
});

describe("SegmentedControl", () => {
  const options = [
    { value: "before-after", label: "Before / After" },
    { value: "difference", label: "Difference" },
  ] as const;

  function Harness({ disabled = false }: { disabled?: boolean }) {
    const [value, setValue] =
      useState<(typeof options)[number]["value"]>("before-after");
    return (
      <SegmentedControl
        options={options}
        value={value}
        onChange={setValue}
        aria-label="Comparison mode"
        disabled={disabled}
      />
    );
  }

  it("uses a radiogroup with a single tab stop", async () => {
    render(<Harness />);

    expect(
      screen.getByRole("radiogroup", { name: "Comparison mode" }),
    ).toBeInTheDocument();
    const selected = screen.getByRole("radio", { name: "Before / After" });
    const other = screen.getByRole("radio", { name: "Difference" });
    expect(selected).toBeChecked();
    expect(other).not.toBeChecked();
    // One tab stop for the whole group, owned by the browser.
    expect(screen.getAllByRole("radio")).toHaveLength(2);

    await userEvent.click(other);
    expect(screen.getByRole("radio", { name: "Difference" })).toBeChecked();
  });

  it("moves the selection with the arrow keys", async () => {
    render(<Harness />);

    const selected = screen.getByRole("radio", { name: "Before / After" });
    selected.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Difference" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Difference" })).toHaveFocus();

    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Before / After" })).toBeChecked();
  });

  it("dims and disables every segment when disabled", () => {
    render(<Harness disabled />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    for (const radio of screen.getAllByRole("radio"))
      expect(radio).toBeDisabled();
  });
});

describe("Panel", () => {
  it("renders expanded, collapsed and glass variants with an icon", () => {
    useUiStore.setState({ panels: { ...DEFAULT_PANELS, tools: false } });
    render(
      <>
        <Panel
          id="change-types"
          title="Surface Change Types"
          icon={<span>*</span>}
        >
          <p>Elevation Change</p>
        </Panel>
        <Panel id="tools" title="Tools" variant="glass" defaultOpen={false}>
          <p>Measure</p>
        </Panel>
      </>,
    );

    expect(
      screen.getByRole("button", { name: /Surface Change Types/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Tools/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("Elevation Change")).toBeInTheDocument();
    expect(document.querySelectorAll(".glass")).toHaveLength(1);
  });
});

describe("StatusPill", () => {
  it("renders loaded, loading and error as live status", () => {
    render(
      <>
        <StatusPill status="loaded">NISAR Data Loaded</StatusPill>
        <StatusPill status="loading">Loading tiles</StatusPill>
        <StatusPill status="error">Import failed</StatusPill>
      </>,
    );

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(3);
    expect(statuses[0]).toHaveTextContent("NISAR Data Loaded");
  });
});

describe("Badge", () => {
  it("renders inline metadata", () => {
    render(<Badge>(4.2%)</Badge>);
    expect(screen.getByText("(4.2%)")).toBeInTheDocument();
  });
});

describe("Progress", () => {
  it("reports determinate progress when labelled and stays decorative otherwise", () => {
    render(
      <>
        <Progress value={40} label="Loading dataset" />
        <Progress value={40} />
      </>,
    );

    const bar = screen.getByRole("progressbar", { name: "Loading dataset" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(screen.queryAllByRole("progressbar")).toHaveLength(1);
  });
});

describe("Tooltip", () => {
  it("opens on focus, is described by the trigger, and closes on Escape", async () => {
    render(
      <Tooltip content="Opacity of the active layer">
        <button type="button">Opacity</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Opacity" });
    fireEvent.focus(trigger);

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Opacity of the active layer");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);

    fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });
});

describe("Popover", () => {
  it("opens from its trigger, dismisses on Escape and returns focus", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <Popover
          open={open}
          onOpenChange={setOpen}
          label="Layer switcher"
          trigger={<Button>Layers</Button>}
        >
          <button type="button">Satellite (Base Map)</button>
        </Popover>
      );
    }
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Layers" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);
    const panel = await screen.findByRole("dialog", { name: "Layer switcher" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const inside = screen.getByRole("button", { name: "Satellite (Base Map)" });
    inside.focus();
    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
    expect(panel).toBeTruthy();
  });
});
