import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CHANGE_TYPES } from "@/fixtures/sample-dashboard";
import { gradientFor } from "@/shared/utils/colorScales";
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
      <dd className="truncate text-label text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

/**
 * Current View: the active layer's thumbnail beside its layer, date and opacity. The thumbnail
 * cross-fades when the layer or date changes.
 */
export function CurrentViewCard() {
  const active = useActiveLayer();
  const currentDate = useDatasetStore((state) => state.currentDate);
  const reducedMotion = useReducedMotion();

  const changeTypeMeta = active?.changeType
    ? CHANGE_TYPES.find((entry) => entry.changeType === active.changeType)
    : undefined;
  const layerLabel = changeTypeMeta?.label ?? active?.name ?? "—";
  const opacity = Math.round((active?.opacity ?? 0) * 100);
  const thumbnail = active?.changeType
    ? gradientFor(active.changeType)
    : FALLBACK_THUMBNAIL;

  return (
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
        <MetaRow label="Date" value={currentDate ?? "—"} />
        <MetaRow label="Opacity" value={`${opacity}%`} />
      </dl>
    </div>
  );
}
