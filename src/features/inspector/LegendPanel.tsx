import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHANGE_TYPES, LEGEND } from "@/fixtures/sample-dashboard";
import { gradientFor } from "@/shared/utils/colorScales";
import { useActiveLayer } from "@/stores/layerStore";
import { DUR_MED, EASE_OUT, REDUCED_MOTION } from "@/styles/tokens";

/**
 * Legend: the active change type's colormap, its tick values and the reading note. The gradient is
 * built from `COLOR_SCALES` — never a hand-picked ramp — so the legend always matches the map. It
 * cross-fades when the change type changes.
 */
export function LegendPanel() {
  const active = useActiveLayer();
  const reducedMotion = useReducedMotion();

  const changeType = active?.changeType ?? "subsidence";
  const meta = CHANGE_TYPES.find((entry) => entry.changeType === changeType);
  const title = meta
    ? `${meta.label} (${meta.unit})`
    : (active?.name ?? "Legend");
  const ticks = LEGEND.ticks;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={changeType}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={
          reducedMotion ? REDUCED_MOTION : { duration: DUR_MED, ease: EASE_OUT }
        }
        className="flex flex-col gap-2"
      >
        <p className="text-label text-[var(--color-text)]">{title}</p>

        <div
          role="img"
          aria-label={`${title} colour scale from ${ticks[0]} to ${ticks[ticks.length - 1]}`}
          className="h-3 w-full rounded-[var(--radius-sm)] border border-[var(--color-panel-border)]"
          style={{ background: gradientFor(changeType) }}
        />

        <div className="flex justify-between text-caption text-[var(--color-text-secondary)] tabular-nums">
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="flex flex-col gap-0.5 text-caption text-[var(--color-text-muted)]">
          {LEGEND.notes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
