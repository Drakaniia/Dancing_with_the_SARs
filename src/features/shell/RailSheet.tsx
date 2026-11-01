import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";
import {
  DUR_MED,
  EASE_OUT,
  REDUCED_MOTION,
  SPRING_DRAWER,
} from "@/styles/tokens";

export type RailSide = "left" | "right";

export interface RailSheetProps {
  side: RailSide;
  open: boolean;
  onClose: () => void;
  /** Accessible name for the sheet. */
  label: string;
  /** The rail to render inside the sheet. */
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIDE_CLASS: Record<RailSide, string> = {
  left: "left-0 w-[var(--rail-left-w-wide)] border-r",
  right: "right-0 w-[var(--rail-right-w)] border-l",
};

/**
 * Compact/default-mode overlay wrapper for a rail. The scrim and the rail enter and exit on the
 * same edge; Escape or a scrim press closes, and focus returns to whatever opened it (the top-bar
 * toggle). It is a true modal, so Tab is trapped between its first and last controls.
 *
 * Reduced motion swaps the slide for an opacity cross-fade — no translate, no spring.
 */
export function RailSheet({
  side,
  open,
  onClose,
  label,
  children,
}: RailSheetProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  const offset = reducedMotion ? 0 : side === "left" ? "-100%" : "100%";

  return (
    <AnimatePresence>
      {open ? (
        <div
          ref={containerRef}
          className="fixed inset-x-0 top-14 bottom-0 z-[var(--z-rails)]"
        >
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              reducedMotion
                ? REDUCED_MOTION
                : { duration: DUR_MED, ease: EASE_OUT }
            }
            className="absolute inset-0 bg-[var(--color-scrim)]"
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0, x: offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: offset }}
            transition={reducedMotion ? REDUCED_MOTION : SPRING_DRAWER}
            className={`absolute inset-y-0 flex max-w-[85vw] flex-col overflow-y-auto border-[var(--color-panel-border)] bg-[var(--color-bg)] shadow-[var(--shadow-pop)] ${SIDE_CLASS[side]}`}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
