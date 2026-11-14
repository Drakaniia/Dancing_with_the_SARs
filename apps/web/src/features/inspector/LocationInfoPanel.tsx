import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LOCATION_INFO } from "@/fixtures/sample-dashboard";
import type { SelectionPayload } from "@/shared/types/selection";
import { useSelectionStore } from "@/stores/selectionStore";
import { REDUCED_MOTION } from "@/styles/tokens";

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
      <dt className="truncate text-label text-[var(--color-text-secondary)]">
        {label}
      </dt>
      <dd
        className={`shrink-0 font-display text-label tabular-nums ${TONE_CLASS[tone]}`}
      >
        {value}
      </dd>
    </div>
  );
}

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
                label="Primary Reading"
                value={
                  selected.samples && selected.samples.length > 0
                    ? `${selected.rate} ${selected.samples[0].units}`
                    : `${selected.rate} cm/year`
                }
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

          {selected.samples && selected.samples.length > 0 ? (
            <div className="flex flex-col gap-1.5 border-t border-[var(--color-panel-border)] pt-2">
              <div className="flex items-center justify-between text-caption text-[var(--color-text-muted)]">
                <span>Sampled Raster Values</span>
                <span>
                  {selected.samplingMode === "desktop-tiff"
                    ? "GeoTIFF Direct"
                    : "AOI Domain Readout"}
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {selected.samples.map((sample) => (
                  <li
                    key={`${sample.layerId}-${sample.period}`}
                    className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] bg-[var(--color-fill-1)] px-2 py-1"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-caption font-medium text-[var(--color-text)]">
                        {sample.name}
                      </span>
                      <span className="shrink-0 font-display text-caption font-semibold text-[var(--color-accent)] tabular-nums">
                        {sample.className
                          ? sample.className
                          : sample.value !== null
                            ? `${sample.value} ${sample.units}`
                            : "nodata"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                      <span>Period: {sample.period}</span>
                      {sample.caveats[0] ? (
                        <span className="max-w-[11rem] truncate">
                          {sample.caveats[0]}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
