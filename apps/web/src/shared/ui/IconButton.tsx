import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";
import { forwardRef, type ReactNode } from "react";
import { REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export type IconButtonSize = "sm" | "md";
export type IconButtonVariant = "glass" | "ghost";

export interface IconButtonProps extends Omit<
  HTMLMotionProps<"button">,
  "ref" | "children"
> {
  /** Accessible name — required, icon-only controls have no visible text. */
  label: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  /** The Lucide icon, sized by the caller (18px in practice). */
  children: ReactNode;
}

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: "h-[var(--icon-button-sm)] w-[var(--icon-button-sm)]",
  md: "h-[var(--icon-button-md)] w-[var(--icon-button-md)]",
};

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  glass:
    "glass border border-[var(--color-chrome-border)] shadow-[var(--shadow-2)]",
  ghost: "bg-transparent hover:bg-[var(--color-fill-2)]",
};

const BASE_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] transition-[filter,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]";

/** Icon-only action: map controls, top-bar actions, panel headers. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      size = "sm",
      variant = "glass",
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
        aria-label={label}
        aria-disabled={disabled}
        disabled={disabled}
        whileTap={disabled || reducedMotion ? undefined : { scale: 0.97 }}
        transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
        className={`${BASE_CLASS} disabled:pointer-events-none disabled:opacity-40 ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className ?? ""}`}
        {...rest}
      />
    );
  },
);

export interface IconLinkProps extends Omit<
  HTMLMotionProps<"a">,
  "ref" | "children"
> {
  /** Accessible name — required, icon-only controls have no visible text. */
  label: string;
  href: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  children: ReactNode;
}

/** IconButton's look for an external link; opens in a new tab (the system browser on desktop). */
export const IconLink = forwardRef<HTMLAnchorElement, IconLinkProps>(
  function IconLink(
    { label, size = "sm", variant = "glass", className, ...rest },
    ref,
  ) {
    const reducedMotion = useReducedMotion();

    return (
      <motion.a
        ref={ref}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
        className={`${BASE_CLASS} ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className ?? ""}`}
        {...rest}
      />
    );
  },
);
