import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";
import { forwardRef } from "react";
import { REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Text actions: primary/secondary/ghost/danger, pressed on pointer-down. */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:brightness-110 active:brightness-95",
  secondary:
    "bg-[var(--color-fill-3)] text-[var(--color-text)] hover:brightness-110 active:brightness-95",
  ghost:
    "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-fill-1)]",
  danger:
    "bg-[var(--color-danger)] text-[var(--color-on-accent)] hover:brightness-110 active:brightness-95",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-[var(--button-sm-h)] px-3",
  md: "h-[var(--button-md-h)] px-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      type = "button",
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const reducedMotion = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-disabled={disabled}
        whileTap={disabled || reducedMotion ? undefined : { scale: 0.97 }}
        transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
        className={`inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius-md)] text-label whitespace-nowrap transition-[filter,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-40 ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className ?? ""}`}
        {...rest}
      />
    );
  },
);
