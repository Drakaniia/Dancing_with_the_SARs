import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Slider } from "@/shared/ui/Slider";

/** Rail geometry used by every pointer assertion: 200px wide, 16px thumb → 184px of travel. */
const RAIL_WIDTH = 200;
const TRAVEL = RAIL_WIDTH - 16;

function mockRailRect() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: RAIL_WIDTH,
    bottom: 24,
    width: RAIL_WIDTH,
    height: 24,
    toJSON: () => ({}),
  } as DOMRect);
}

/** Synthetic pointer event with a controllable `timeStamp`, which is what drives velocity. */
function pointerEvent(type: string, clientX: number, timeStamp: number) {
  const event = new PointerEvent(type, {
    clientX,
    pointerId: 1,
    isPrimary: true,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "timeStamp", { value: timeStamp });
  return event;
}

function Harness({
  initial,
  onChange,
  onScrubStart,
  onScrubEnd,
}: {
  initial: number;
  onChange?: (value: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Slider
      value={value}
      min={0}
      max={100}
      step={1}
      aria-label="Opacity"
      onScrubStart={onScrubStart}
      onScrubEnd={onScrubEnd}
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
    />
  );
}

const slider = () => screen.getByRole("slider");
const valueNow = () => Number(slider().getAttribute("aria-valuenow"));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Slider", () => {
  it("exposes slider semantics", () => {
    mockRailRect();
    render(<Harness initial={30} />);

    expect(slider()).toHaveAttribute("aria-label", "Opacity");
    expect(slider()).toHaveAttribute("aria-valuemin", "0");
    expect(slider()).toHaveAttribute("aria-valuemax", "100");
    expect(valueNow()).toBe(30);
    expect(slider()).toHaveAttribute("tabindex", "0");
  });

  it("tracks the pointer 1:1 — the thumb moves exactly as far as the pointer", () => {
    mockRailRect();
    render(<Harness initial={0} />);

    fireEvent(slider(), pointerEvent("pointerdown", 100, 0));
    // Tap away from the thumb centres it on the pointer: 100 - 8 = 92/184 → 50%.
    expect(valueNow()).toBe(50);

    const thumb = document.querySelector("[data-slider-thumb]") as HTMLElement;
    fireEvent(slider(), pointerEvent("pointermove", 150, 16));
    // Same 50px of pointer travel must produce 50px of thumb travel (pointer - grab offset).
    expect(valueNow()).toBe(77);
    expect(thumb).toBeTruthy();

    fireEvent(slider(), pointerEvent("pointermove", 192, 32));
    expect(valueNow()).toBe(100);
  });

  it("respects the grab offset when the press lands on the thumb", () => {
    mockRailRect();
    render(<Harness initial={50} />);

    // value 50 → thumb spans 92…108px, so a grab at its centre must not jump.
    fireEvent(slider(), pointerEvent("pointerdown", 100, 0));
    expect(valueNow()).toBe(50);

    fireEvent(slider(), pointerEvent("pointermove", 60, 16));
    expect(valueNow()).toBe(28);
  });

  it("rubber-bands visually but clamps the value at both ends", () => {
    mockRailRect();
    render(<Harness initial={50} />);

    fireEvent(slider(), pointerEvent("pointerdown", -120, 0));
    expect(valueNow()).toBe(0);

    fireEvent(slider(), pointerEvent("pointermove", 480, 16));
    expect(valueNow()).toBe(100);
  });

  it("hands a flick to the spring and can be grabbed again mid-flight", () => {
    mockRailRect();
    const onScrubStart = vi.fn();
    const onScrubEnd = vi.fn();
    render(
      <Harness
        initial={0}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
      />,
    );

    fireEvent(slider(), pointerEvent("pointerdown", 100, 0));
    fireEvent(slider(), pointerEvent("pointermove", 150, 16));
    fireEvent(slider(), pointerEvent("pointerup", 150, 20));
    expect(onScrubStart).toHaveBeenCalledTimes(1);

    // Flick projected past the end, so the settle is a real animation — interrupt it.
    fireEvent(slider(), pointerEvent("pointerdown", 40, 30));
    expect(valueNow()).toBe(17);
    expect(onScrubStart).toHaveBeenCalledTimes(2);

    fireEvent(slider(), pointerEvent("pointerup", 40, 40));
    expect(onScrubEnd).toHaveBeenCalled();
  });

  it("steps with the keyboard and jumps to the ends", () => {
    mockRailRect();
    render(<Harness initial={50} />);

    fireEvent.keyDown(slider(), { key: "ArrowRight" });
    expect(valueNow()).toBe(51);

    fireEvent.keyDown(slider(), { key: "ArrowLeft" });
    fireEvent.keyDown(slider(), { key: "ArrowLeft" });
    expect(valueNow()).toBe(49);

    fireEvent.keyDown(slider(), { key: "End" });
    expect(valueNow()).toBe(100);

    fireEvent.keyDown(slider(), { key: "Home" });
    expect(valueNow()).toBe(0);
  });

  it("ignores pointer input while disabled", () => {
    mockRailRect();
    const onChange = vi.fn();
    const { rerender } = render(
      <Slider value={25} onChange={onChange} aria-label="Opacity" disabled />,
    );

    expect(slider()).toHaveAttribute("aria-disabled", "true");
    expect(slider()).toHaveAttribute("tabindex", "-1");
    fireEvent(slider(), pointerEvent("pointerdown", 100, 0));
    expect(onChange).not.toHaveBeenCalled();

    rerender(<Slider value={25} onChange={onChange} aria-label="Opacity" />);
    fireEvent(slider(), pointerEvent("pointerdown", 100, 0));
    expect(onChange).toHaveBeenCalled();
  });

  it("maps the value through min/max/step", () => {
    mockRailRect();
    const onChange = vi.fn();
    render(
      <Slider
        value={0}
        min={-10}
        max={10}
        step={0.5}
        aria-label="Depth"
        onChange={onChange}
      />,
    );

    fireEvent(slider(), pointerEvent("pointerdown", 8 + TRAVEL, 0));
    // 100% of the travel → the max, not the min.
    expect(onChange).toHaveBeenCalledWith(10);
  });
});
