import { motion, useReducedMotion } from "motion/react";
import { REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export interface ProgressProps {
  value: number;
  max?: number;
  /** Accessible name. Without it the bar is decorative and reports nothing. */
  label?: string;
  className?: string;
}

/** 2px determinate line, used for data-load feedback. */
export function Progress({
  value,
  max = 100,
  label,
  className,
}: ProgressProps) {
  const reducedMotion = useReducedMotion();
  const progress = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const trackClass = `h-[var(--progress-h)] w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-fill-track)] ${className ?? ""}`;
  const bar = (
    <motion.div
      initial={false}
      animate={{ scaleX: progress }}
      transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
      className="h-full w-full origin-left rounded-[var(--radius-pill)] bg-[var(--color-accent)]"
    />
  );

  if (!label) {
    return (
      <div aria-hidden="true" className={trackClass}>
        {bar}
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={trackClass}
    >
      {bar}
    </div>
  );
}
