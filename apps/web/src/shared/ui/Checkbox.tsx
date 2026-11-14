import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
import { DUR_FAST, REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label; the whole row becomes the click target. */
  children?: ReactNode;
  /** Accessible name when there is no visible label. */
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** 18x18 box, native input visually hidden, full-row click target. */
export function Checkbox({
  checked,
  onChange,
  children,
  label,
  disabled,
  id,
  className,
}: CheckboxProps) {
  const reducedMotion = useReducedMotion();
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label
      htmlFor={checkboxId}
      className={`group inline-flex items-center gap-2 text-body text-[var(--color-text)] ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${className ?? ""}`}
    >
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={children ? undefined : label}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ scale: checked ? [0.9, 1] : 1 }}
        transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
        className={`relative flex h-[var(--checkbox-size)] w-[var(--checkbox-size)] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-control)] border-[color:var(--color-panel-border)] bg-[var(--color-fill-1)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-focus)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-bg)]`}
      >
        <motion.span
          initial={false}
          animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.6 }}
          transition={
            reducedMotion ? REDUCED_MOTION : { duration: DUR_FAST * 1.25 }
          }
          className="flex items-center justify-center text-[var(--color-on-accent)]"
        >
          <Check size={12} strokeWidth={1.5} />
        </motion.span>
      </motion.span>
      {children}
    </label>
  );
}
