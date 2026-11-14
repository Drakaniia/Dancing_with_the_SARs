import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  cloneElement,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { DUR_FAST, EASE_OUT, REDUCED_MOTION } from "@/styles/tokens";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipTriggerProps {
  "aria-describedby"?: string;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onBlur?: FocusEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
}

export interface TooltipProps {
  content: ReactNode;
  /** The trigger. It receives the hover/focus handlers plus `aria-describedby` while open. */
  children: ReactElement<TooltipTriggerProps>;
  side?: TooltipSide;
  /** Hover delay before the tooltip appears; focus shows it immediately. */
  delayMs?: number;
  className?: string;
}

const OFFSET_CLASS: Record<TooltipSide, string> = {
  top: "left-1/2 bottom-full mb-2",
  bottom: "left-1/2 top-full mt-2",
  left: "top-1/2 right-full mr-2 whitespace-nowrap",
  right: "top-1/2 left-full ml-2 whitespace-nowrap",
};

/** Start position, a few px toward the trigger, so enter and exit share one path. */
const NUDGE: Record<TooltipSide, { x?: number; y?: number }> = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
};

const ORIGIN: Record<TooltipSide, string> = {
  top: "bottom center",
  bottom: "top center",
  left: "center right",
  right: "center left",
};

/**
 * Anchored hint. Enter and exit run along the same path from the trigger's edge, and the surface is
 * glass — the material reserved for floating chrome. The trigger owns the handlers, so the wrapper
 * stays a non-interactive positioning box.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  delayMs = 400,
  className,
}: TooltipProps) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const show = (delay: number) => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimer();
    setOpen(false);
  };

  const vertical = side === "top" || side === "bottom";
  const nudge = reducedMotion ? {} : NUDGE[side];

  return (
    <span className="relative inline-flex">
      {cloneElement(children, {
        "aria-describedby": open ? tooltipId : undefined,
        onMouseEnter: () => show(delayMs),
        onMouseLeave: hide,
        onFocus: () => show(0),
        onBlur: hide,
        onKeyDown: (event) => {
          if (event.key === "Escape") hide();
        },
      })}
      <AnimatePresence>
        {open ? (
          <motion.span
            role="tooltip"
            id={tooltipId}
            initial={{ opacity: 0, ...nudge, scale: 0.98 }}
            animate={{ opacity: 1, ...(vertical ? { y: 0 } : { x: 0 }), scale: 1 }}
            exit={{ opacity: 0, ...nudge, scale: 0.98 }}
            transition={
              reducedMotion
                ? REDUCED_MOTION
                : { duration: DUR_FAST, ease: EASE_OUT }
            }
            style={{
              ...(vertical ? { x: "-50%" } : { y: "-50%" }),
              transformOrigin: ORIGIN[side],
            }}
            className={`glass pointer-events-none absolute z-[var(--z-popover)] max-w-[18rem] rounded-[var(--radius-md)] border border-[var(--color-chrome-border)] px-2 py-1 text-caption text-[var(--color-text)] shadow-[var(--shadow-pop)] ${OFFSET_CLASS[side]} ${className ?? ""}`}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
