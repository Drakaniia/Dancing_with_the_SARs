import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { Slider } from "@/shared/ui/Slider";
import { Switch } from "@/shared/ui/Switch";
import {
  type ComparisonMode,
  useDatasetStore,
  useTimelineDates,
} from "@/stores/datasetStore";

export type { ComparisonMode };

const OPTIONS = [
  { value: "split", label: "Before / After" },
  { value: "difference", label: "Difference" },
] as const;

export function ComparisonPanel() {
  const enabled = useDatasetStore((state) => state.comparisonEnabled);
  const setEnabled = useDatasetStore((state) => state.setComparisonEnabled);
  const mode = useDatasetStore((state) => state.comparisonMode);
  const setMode = useDatasetStore((state) => state.setComparisonMode);
  const comparisonDate = useDatasetStore((state) => state.comparisonDate);
  const setComparisonDate = useDatasetStore((state) => state.setComparisonDate);
  const splitPosition = useDatasetStore((state) => state.splitPosition);
  const setSplitPosition = useDatasetStore((state) => state.setSplitPosition);
  const dates = useTimelineDates();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body text-[var(--color-text)]">
          Enable comparison
        </span>
        <Switch
          checked={enabled}
          onChange={setEnabled}
          label="Comparison View"
        />
      </div>

      <SegmentedControl
        options={OPTIONS}
        value={mode}
        onChange={setMode}
        disabled={!enabled}
        aria-label="Comparison mode"
      />

      {enabled ? (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="comparison-baseline-select"
              className="text-caption text-[var(--color-text-secondary)]"
            >
              Baseline Period
            </label>
            <select
              id="comparison-baseline-select"
              value={comparisonDate ?? dates[0] ?? "2026-09"}
              onChange={(e) => setComparisonDate(e.target.value)}
              className="h-7 rounded-[var(--radius-sm)] border border-[var(--color-panel-border)] bg-[var(--color-fill-2)] px-2 font-display text-caption text-[var(--color-text)] tabular-nums"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-caption text-[var(--color-text-secondary)]">
            <span>Split Curtain Position</span>
            <span className="font-display tabular-nums">
              {Math.round(splitPosition)}%
            </span>
          </div>
          <Slider
            value={Math.round(splitPosition)}
            min={5}
            max={95}
            step={1}
            onChange={setSplitPosition}
            aria-label="Split curtain position"
            ariaValueText={`${Math.round(splitPosition)}%`}
          />
        </div>
      ) : null}
    </div>
  );
}
