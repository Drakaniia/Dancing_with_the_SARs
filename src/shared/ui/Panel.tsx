import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { type PanelId, useUiStore } from "@/stores/uiStore";
import {
  DUR_FAST,
  EASE_OUT,
  REDUCED_MOTION,
  SPRING_DRAWER,
} from "@/styles/tokens";

export type PanelVariant = "panel" | "glass";

export interface PanelProps {
  /** Store key — the open/closed state is shared and persisted per panel. */
  id: PanelId;
  title: string;
  /** Leading 16px glyph, tinted with `--color-accent-cyan`. */
  icon?: ReactNode;
  /** Used when the store has no entry for `id`. */
  defaultOpen?: boolean;
  /** `glass` drops the opaque body for use inside floating chrome. */
  variant?: PanelVariant;
  className?: string;
  children: ReactNode;
}

/**
 * The structural backbone of both rails: a 40px header button over a body that collapses on the
 * drawer spring. The body is `aria-hidden` and inert while closed, so collapsed content is out of
 * the tab order even mid-animation.
 */
export function Panel({
  id,
  title,
  icon,
  defaultOpen = true,
  variant = "panel",
  className,
  children,
}: PanelProps) {
  const reducedMotion = useReducedMotion();
  const storedOpen = useUiStore((state) => state.panels[id]);
  const togglePanel = useUiStore((state) => state.togglePanel);
  const open = storedOpen ?? defaultOpen;

  const titleId = useId();
  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    (body as HTMLElement & { inert: boolean }).inert = !open;
  }, [open]);

  return (
    <section
      aria-labelledby={titleId}
      className={`overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-panel-border)] shadow-[var(--shadow-1)] ${variant === "glass" ? "glass" : "bg-[var(--color-panel)]"} ${className ?? ""}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => togglePanel(id)}
        className="flex h-[var(--panel-header-h)] w-full items-center gap-2 bg-[var(--color-panel-header)] px-3 text-panel-header text-[var(--color-text-secondary)] uppercase transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--color-fill-2)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
      >
        {icon ? (
          <span
            aria-hidden="true"
            className="flex text-[var(--color-accent-cyan)]"
          >
            {icon}
          </span>
        ) : null}
        <span id={titleId} className="flex-1 text-left">
          {title}
        </span>
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={
            reducedMotion ? { ...REDUCED_MOTION, duration: 0 } : SPRING_DRAWER
          }
          className="flex text-[var(--color-text-muted)]"
        >
          <ChevronDown size={16} strokeWidth={1.5} />
        </motion.span>
      </button>
      <motion.div
        id={bodyId}
        ref={bodyRef}
        aria-hidden={!open}
        initial={false}
        animate={open ? "open" : "closed"}
        variants={{
          open: { height: "auto", opacity: 1 },
          closed: { height: 0, opacity: 0 },
        }}
        transition={{
          height: reducedMotion ? REDUCED_MOTION : SPRING_DRAWER,
          // Content fades out ahead of the height so the mask reads, never a jump.
          opacity: reducedMotion
            ? REDUCED_MOTION
            : { duration: DUR_FAST, ease: EASE_OUT },
        }}
        className="overflow-hidden"
      >
        <div className="border-t border-[var(--color-panel-border)] p-[var(--panel-pad)]">
          {children}
        </div>
      </motion.div>
    </section>
  );
}
