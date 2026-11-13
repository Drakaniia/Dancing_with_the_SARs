import type { ReactNode } from "react";
import type { ChangeType } from "@/shared/types/dataset";
import type { LayerKind } from "@/shared/types/layer";
import type { ClassEntry, Ramp } from "@/shared/types/manifest";
import { Checkbox } from "@/shared/ui/Checkbox";
import { gradientFor, gradientFromRamp } from "@/shared/utils/colorScales";

export interface LayerSwatchProps {
  kind: LayerKind;
  changeType?: ChangeType;
  ramp?: Ramp;
  classes?: ClassEntry[];
}

export function LayerSwatch({
  kind,
  changeType,
  ramp,
  classes,
}: LayerSwatchProps) {
  const base = "h-5 w-5 shrink-0 rounded-[var(--radius-sm)] border";

  if (kind === "manifest-layer") {
    return (
      <span
        aria-hidden="true"
        className={`${base} border-[var(--color-panel-border)]`}
        style={{ background: gradientFromRamp(ramp, classes, "135deg") }}
      />
    );
  }

  if (kind === "change-type" && changeType) {
    return (
      <span
        aria-hidden="true"
        className={`${base} border-[var(--color-panel-border)]`}
        style={{ background: gradientFor(changeType, "135deg") }}
      />
    );
  }

  if (kind === "basemap") {
    return (
      <span
        aria-hidden="true"
        className={`${base} border-[var(--color-panel-border)]`}
        style={{
          background:
            "linear-gradient(135deg, var(--color-accent-cyan), var(--color-bg-elevated))",
        }}
      />
    );
  }

  if (kind === "vector") {
    return (
      <span
        aria-hidden="true"
        className={`${base} border-dashed border-[var(--color-text-muted)] bg-[var(--color-fill-1)]`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${base} grid place-items-center border-[var(--color-panel-border)] bg-[var(--color-fill-2)] text-caption text-[var(--color-text-secondary)]`}
    >
      Aa
    </span>
  );
}

export interface LayerRowProps {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  swatch: ReactNode;
}

export function LayerRow({ label, checked, onToggle, swatch }: LayerRowProps) {
  return (
    <Checkbox
      checked={checked}
      onChange={onToggle}
      className="h-9 w-full gap-2 rounded-[var(--radius-sm)] px-1.5 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--color-fill-1)]"
    >
      {swatch}
      <span className="flex-1 truncate text-body text-[var(--color-text)]">
        {label}
      </span>
    </Checkbox>
  );
}
