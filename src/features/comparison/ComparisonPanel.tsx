import { useState } from "react";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { Switch } from "@/shared/ui/Switch";

export type ComparisonMode = "split" | "difference";

const OPTIONS = [
  { value: "split", label: "Before / After" },
  { value: "difference", label: "Difference" },
] as const;

/**
 * Comparison View: an enable switch and the mode segmented control, which stays dimmed and
 * non-interactive until comparison is on. The map behaviour lands with the map phase; the state
 * lives here for now.
 */
export function ComparisonPanel() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<ComparisonMode>("split");

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
    </div>
  );
}
