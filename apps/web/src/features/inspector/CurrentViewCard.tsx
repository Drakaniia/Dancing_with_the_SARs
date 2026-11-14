import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHANGE_TYPES } from "@/fixtures/sample-dashboard";
import { gradientFor, gradientFromRamp } from "@/shared/utils/colorScales";
import { resolvePeriod } from "@/shared/utils/dates";
import { useDatasetStore } from "@/stores/datasetStore";
import { useActiveLayer } from "@/stores/layerStore";
import { DUR_MED, EASE_OUT, REDUCED_MOTION } from "@/styles/tokens";

const FALLBACK_THUMBNAIL =
  "linear-gradient(135deg, var(--color-accent-cyan), var(--color-bg-elevated))";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-caption text-[var(--color-text-secondary)]">
        {label}
      </dt>
      <dd className="truncate font-display text-label text-[var(--color-text)] tabular-nums">
        {value}
      </dd>
    </div>
  );
}

export function CurrentViewCard() {
  const active = useActiveLayer();
  const currentDate = useDatasetStore((state) => state.currentDate);
  const reducedMotion = useReducedMotion();

  const changeTypeMeta = active?.changeType
    ? CHANGE_TYPES.find((entry) => entry.changeType === active.changeType)
    : undefined;
  const layerLabel =
    active?.kind === "change-type"
      ? (changeTypeMeta?.label ?? active.name)
      : (active?.name ?? "None");
  const opacity = Math.round((active?.opacity ?? 0) * 100);
  const thumbnail =
    active?.kind === "manifest-layer"
      ? gradientFromRamp(active.ramp, active.classes, "135deg")
      : active?.changeType
        ? gradientFor(active.changeType, "135deg")
        : FALLBACK_THUMBNAIL;

  const snap = resolvePeriod(active?.periods, currentDate);
  const coveragePct =
    active?.coverage !== undefined
      ? `${Math.round(active.coverage * 100)}% AOI`
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-[4.5rem] shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-panel-border)]">
          <AnimatePresence initial={false}>
            <motion.span
              key={`${active?.id ?? "none"}-${currentDate ?? "none"}`}
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={
                reducedMotion
                  ? REDUCED_MOTION
                  : { duration: DUR_MED, ease: EASE_OUT }
              }
              className="absolute inset-0"
              style={{ background: thumbnail }}
            />
          </AnimatePresence>
        </div>

        <dl className="flex min-w-0 flex-1 flex-col gap-1">
          <MetaRow label="Layer" value={layerLabel} />
          <MetaRow label="Date" value={currentDate ?? "static"} />
          <MetaRow
            label="Opacity"
            value={coveragePct ? `${opacity}% · ${coveragePct}` : `${opacity}%`}
          />
        </dl>
      </div>

      {!snap.exact && snap.resolved ? (
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-fill-2)] px-2 py-1 text-caption text-[var(--color-warning)]">
          Nearest available period for this layer:{" "}
          <span className="font-display font-medium tabular-nums">
            {snap.resolved}
          </span>
        </div>
      ) : null}
    </div>
  );
}
