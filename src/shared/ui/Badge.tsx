import type { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  className?: string;
}

/** Small bordered chip for inline metadata, e.g. the `(4.2%)` on Quick Stats. */
export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--color-panel-border)] bg-[var(--color-fill-1)] px-1.5 py-0.5 text-caption text-[var(--color-text-secondary)] ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
