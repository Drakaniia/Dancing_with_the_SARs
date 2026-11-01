import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { REDUCED_MOTION, SPRING_UI, SWITCH_TRAVEL_PX } from "@/styles/tokens";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name. Required unless the switch is wrapped in a labelled row. */
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * iOS-style toggle. Track 40x24 (tokens), knob 20x20 inset by 2px, so the knob travels 16px.
 * Press feedback starts on pointer-down; the knob slides on the UI spring and can be reversed
 * mid-flight because Motion animates from the live value.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
  className,
}: SwitchProps) {
  const reducedMotion = useReducedMotion();
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const [pressed, setPressed] = useState(false);

  const endPress = () => setPressed(false);

  return (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={endPress}
      onBlur={endPress}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-[var(--radius-pill)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] after:absolute after:inset-[calc(-1*var(--switch-inset))] after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-40 ${checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-control-track)]"} h-[var(--switch-h)] w-[var(--switch-w)] ${className ?? ""}`}
    >
      <motion.span
        data-switch-knob=""
        aria-hidden="true"
        initial={false}
        animate={{
          x: checked ? SWITCH_TRAVEL_PX : 0,
          scale: pressed ? 0.96 : 1,
        }}
        transition={
          reducedMotion ? { ...REDUCED_MOTION, duration: 0 } : SPRING_UI
        }
        className="pointer-events-none absolute top-[var(--switch-inset)] left-[var(--switch-inset)] h-[var(--switch-knob)] w-[var(--switch-knob)] rounded-full bg-[var(--color-on-accent)] shadow-[var(--shadow-1)]"
      />
    </button>
  );
}
