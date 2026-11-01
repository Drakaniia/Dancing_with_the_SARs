import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LOCATION_INFO } from "@/fixtures/sample-dashboard";
import type { SelectionPayload } from "@/shared/types/selection";
import { useSelectionStore } from "@/stores/selectionStore";
import { REDUCED_MOTION } from "@/styles/tokens";

/** `14.5995° N, 120.9842° E` — four decimals, hemisphere suffix. */
export function formatCoords({
  lat,
  lng,
}: Pick<SelectionPayload, "lat" | "lng">): string {
  const latitude = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const longitude = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
  return `${latitude}, ${longitude}`;
}

interface MetricRowProps {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
}

const TONE_CLASS: Record<NonNullable<MetricRowProps["tone"]>, string> = {
  default: "text-[var(--color-text)]",
  danger: "text-[var(--color-danger)]",
  success: "text-[var(--color-success)]",
};

function MetricRow({ label, value, tone = "default" }: MetricRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-label text-[var(--color-text-secondary)]">{label}</dt>
      <dd className={`text-label tabular-nums ${TONE_CLASS[tone]}`}>{value}</dd>
    </div>
  );
}

/**
 * Location Info: the selected point's coordinates and place, then the metric rows. Before any
 * selection it shows a muted hint; rows cross-fade when the selection changes.
 */
export function LocationInfoPanel() {
  const selected = useSelectionStore((state) => state.selected);
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion ? REDUCED_MOTION : { duration: 0.15 };

  return (
    <AnimatePresence initial={false}>
      {selected ? (
        <motion.div
          key="selected"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-readout text-[var(--color-text)] tabular-nums">
              {formatCoords(selected)}
            </span>
            {selected.placeName ? (
              <span className="text-body text-[var(--color-text-secondary)]">
                {selected.placeName}
              </span>
            ) : null}
          </div>

          <dl className="flex flex-col gap-1.5">
            {selected.rate !== undefined ? (
              <MetricRow
                label="Land Subsidence Rate"
                value={`${selected.rate} cm/year`}
                tone="danger"
              />
            ) : null}
            <MetricRow
              label="Confidence"
              value={selected.confidence ?? "Low"}
              tone="success"
            />
            <MetricRow label="Data Source" value={LOCATION_INFO.dataSource} />
          </dl>
        </motion.div>
      ) : (
        <motion.p
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="text-body text-[var(--color-text-muted)]"
        >
          Click the map to inspect a location
        </motion.p>
      )}
    </AnimatePresence>
  );
}
