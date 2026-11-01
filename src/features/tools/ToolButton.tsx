import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * One tool: 20px icon over a caption. Active state is an accent tint with a 2px accent ring; press
 * feedback starts on pointer-down.
 */
export function ToolButton({
  icon: Icon,
  label,
  active = false,
  onClick,
}: ToolButtonProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-1 py-2 text-caption transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
        active
          ? "bg-[var(--color-fill-3)] text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-fill-1)] hover:text-[var(--color-text)]"
      }`}
    >
      <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
      <span>{label}</span>
    </motion.button>
  );
}
