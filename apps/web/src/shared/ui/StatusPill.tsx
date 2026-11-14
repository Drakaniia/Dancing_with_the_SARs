import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export type StatusPillStatus = "loaded" | "loading" | "error";

export interface StatusPillProps {
  status?: StatusPillStatus;
  children: ReactNode;
  className?: string;
}

const DOT_CLASS: Record<StatusPillStatus, string> = {
  loaded: "bg-[var(--color-success)]",
  loading: "bg-[var(--color-accent)]",
  error: "bg-[var(--color-danger)]",
};

/**
 * Dot + caption for global data-load state ("NISAR Data Loaded"). Rendered as `<output>`, whose
 * implicit role is `status` — a polite live region, so state changes are announced.
 */
export function StatusPill({
  status = "loaded",
  children,
  className,
}: StatusPillProps) {
  const reducedMotion = useReducedMotion();
  const pulsing = status === "loading" && !reducedMotion;

  return (
    <output
      className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-fill-2)] px-2 py-1 text-caption text-[var(--color-text-secondary)] ${className ?? ""}`}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={pulsing ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
        transition={
          pulsing
            ? { duration: 1.2, repeat: Number.POSITIVE_INFINITY }
            : { duration: 0 }
        }
        className={`h-[var(--status-dot)] w-[var(--status-dot)] shrink-0 rounded-full ${DOT_CLASS[status]}`}
      />
      {children}
    </output>
  );
}
