import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  cloneElement,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { DUR_MED, EASE_OUT, REDUCED_MOTION } from "@/styles/tokens";

export type PopoverSide = "top" | "bottom";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The trigger; receives click handling plus `aria-expanded` / `aria-controls`. */
  trigger: ReactElement<{
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
    "aria-expanded"?: boolean;
    "aria-haspopup"?: "dialog";
    "aria-controls"?: string;
  }>;
  /** Accessible name for the popover surface. */
  label: string;
  side?: PopoverSide;
  align?: PopoverAlign;
  className?: string;
  children: ReactNode;
}

const SIDE_CLASS: Record<PopoverSide, string> = {
  top: "bottom-full mb-2",
  bottom: "top-full mt-2",
};

const ORIGIN_X: Record<PopoverAlign, string> = {
  start: "left",
  center: "center",
  end: "right",
};

/**
 * Anchored floating surface. It scales from its trigger's edge, dismisses on Escape or an outside
 * press, and hands focus back to the trigger when it closes with focus inside.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  label,
  side = "bottom",
  align = "start",
  className,
  children,
}: PopoverProps) {
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Outside press and Escape both dismiss.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        wrapperRef.current?.contains(target)
      )
        return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onOpenChange(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  // Focus returns to the trigger only if it was inside the popover when it closed.
  useEffect(() => {
    if (open) return;
    const panel = panelRef.current;
    if (!panel?.contains(document.activeElement)) return;
    const triggerNode = wrapperRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    triggerNode?.focus();
  }, [open]);

  const offset = reducedMotion ? 0 : side === "bottom" ? -4 : 4;
  const alignClass =
    align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2";

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      {cloneElement(trigger, {
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        "aria-controls": open ? panelId : undefined,
        onClick: (event: ReactMouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event);
          onOpenChange(!open);
        },
      })}
      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            initial={{ opacity: 0, y: offset, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: offset, scale: 0.98 }}
            transition={
              reducedMotion
                ? REDUCED_MOTION
                : { duration: DUR_MED, ease: EASE_OUT }
            }
            style={{
              x: align === "center" ? "-50%" : 0,
              transformOrigin: `${side === "bottom" ? "top" : "bottom"} ${ORIGIN_X[align]}`,
            }}
            className={`glass absolute z-[var(--z-popover)] min-w-[12rem] rounded-[var(--radius-md)] border border-[var(--color-chrome-border)] p-[var(--panel-pad)] text-body text-[var(--color-text)] shadow-[var(--shadow-pop)] ${SIDE_CLASS[side]} ${alignClass} ${className ?? ""}`}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
