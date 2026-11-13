import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHANGE_TYPES, LEGEND } from "@/fixtures/sample-dashboard";
import { gradientFor, gradientFromRamp } from "@/shared/utils/colorScales";
import { useActiveLayer } from "@/stores/layerStore";
import { DUR_MED, EASE_OUT, REDUCED_MOTION } from "@/styles/tokens";

export function LegendPanel() {
  const active = useActiveLayer();
  const reducedMotion = useReducedMotion();

  const isLegacyChangeType = active?.kind === "change-type";
  const changeType = active?.changeType ?? "subsidence";
  const meta = isLegacyChangeType
    ? CHANGE_TYPES.find((entry) => entry.changeType === changeType)
    : undefined;

  const title = meta
    ? `${meta.label} (${meta.unit})`
    : active
      ? `${active.name}${active.units ? ` (${active.units})` : ""}`
      : "Legend";

  const classes = active?.classes;
  const domain = active?.domain;
  const ticks = isLegacyChangeType
    ? LEGEND.ticks
    : domain
      ? [
          domain[0],
          Number(((domain[0] * 3 + domain[1]) / 4).toFixed(2)),
          Number(((domain[0] + domain[1]) / 2).toFixed(2)),
          Number(((domain[0] + domain[1] * 3) / 4).toFixed(2)),
          domain[1],
        ]
      : LEGEND.ticks;

  const notes = isLegacyChangeType
    ? LEGEND.notes
    : active?.caveats && active.caveats.length > 0
      ? active.caveats
      : LEGEND.notes;

  const bgGradient =
    active?.kind === "manifest-layer"
      ? gradientFromRamp(active.ramp, active.classes, "90deg")
      : gradientFor(changeType, "135deg");

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={active?.id ?? changeType}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={
          reducedMotion ? REDUCED_MOTION : { duration: DUR_MED, ease: EASE_OUT }
        }
        className="flex flex-col gap-2"
      >
        <p className="text-label text-[var(--color-text)]">{title}</p>

        {classes && classes.length > 0 ? (
          <ul className="grid grid-cols-1 gap-1 pt-0.5">
            {classes.map((cls) => (
              <li
                key={cls.code}
                className="flex items-center justify-between gap-2 text-caption text-[var(--color-text)]"
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-[2px] border border-[var(--color-panel-border)]"
                    style={{ backgroundColor: cls.color }}
                  />
                  <span className="truncate">{cls.label}</span>
                </span>
                <span className="font-display text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  #{cls.code}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div
              role="img"
              aria-label={`${title} colour scale from ${ticks[0]} to ${ticks[ticks.length - 1]}`}
              className="h-3 w-full rounded-[var(--radius-sm)] border border-[var(--color-panel-border)]"
              style={{ background: bgGradient }}
            />

            <div className="flex justify-between font-display text-caption text-[var(--color-text-secondary)] tabular-nums">
              {ticks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col gap-0.5 pt-0.5 text-caption text-[var(--color-text-muted)]">
          {notes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
