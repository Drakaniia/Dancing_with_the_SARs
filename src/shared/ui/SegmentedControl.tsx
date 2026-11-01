import { motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export interface SegmentedOption<Value extends string = string> {
  value: Value;
  label: string;
}

export interface SegmentedControlProps<Value extends string = string> {
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  "aria-label": string;
  disabled?: boolean;
  className?: string;
}

/**
 * Pill-shaped segmented control built on native radio inputs — the selection is real form state,
 * so the browser owns name/checked semantics and the tab stop. The selected segment is a raised
 * pill that slides on the UI spring, so a rapid re-selection retargets one element rather than
 * restarting a transition.
 */
export function SegmentedControl<Value extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<Value>) {
  const reducedMotion = useReducedMotion();
  const groupName = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef(new Map<Value, HTMLLabelElement>());
  const [indicator, setIndicator] = useState({ x: 0, width: 0 });

  const measure = useCallback(() => {
    const selected = segmentRefs.current.get(value);
    if (!selected) return;
    setIndicator({ x: selected.offsetLeft, width: selected.offsetWidth });
  }, [value]);

  // Layout effect: the indicator must land on the selected segment in the same paint.
  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  const select = (next: Value) => {
    if (next === value) return;
    onChange(next);
    segmentRefs.current
      .get(next)
      ?.querySelector<HTMLInputElement>("input")
      ?.focus();
  };

  // Native radios arrow between siblings in the browser; mirror it here so behaviour is identical
  // under test and inside the Tauri webview.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const index = options.findIndex((option) => option.value === value);
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step !== 0) {
      event.preventDefault();
      const next =
        options[Math.min(Math.max(index + step, 0), options.length - 1)];
      if (next) select(next.value);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next =
        event.key === "Home" ? options[0] : options[options.length - 1];
      if (next) select(next.value);
    }
  };

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-fill-2)] p-[var(--control-inset)] ${disabled ? "opacity-40" : ""} ${className ?? ""}`}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: indicator.x, width: indicator.width }}
        transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
        className="pointer-events-none absolute top-[var(--control-inset)] left-0 h-[var(--segment-h)] rounded-[var(--radius-pill)] bg-[var(--color-fill-4)]"
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            ref={(node) => {
              if (node) segmentRefs.current.set(option.value, node);
              else segmentRefs.current.delete(option.value);
            }}
            className={`relative z-10 inline-flex h-[var(--segment-h)] items-center justify-center rounded-[var(--radius-pill)] px-3 text-label transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] ${selected ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-focus)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-bg)]">
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
