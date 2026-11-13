import {
  Activity,
  CloudSun,
  Flame,
  Leaf,
  type LucideIcon,
  Mountain,
  Radar,
  Trees,
  TrendingDown,
  TriangleAlert,
  Waves,
} from "lucide-react";
import type { ChangeType } from "@/shared/types/dataset";
import { Switch } from "@/shared/ui/Switch";

const ICONS: Record<ChangeType, LucideIcon> = {
  elevation: TriangleAlert,
  subsidence: TrendingDown,
  vegetation: Leaf,
  water: Waves,
  radar: Radar,
  landcover: Trees,
  earthquake: Flame,
  climate: CloudSun,
  outlook: Activity,
  terrain: Mountain,
};

const ICON_CLASS: Record<ChangeType, string> = {
  elevation: "text-[var(--color-warning)]",
  subsidence: "text-[var(--color-accent-cyan)]",
  vegetation: "text-[var(--color-success)]",
  water: "text-[var(--color-accent)]",
  radar: "text-[var(--color-accent)]",
  landcover: "text-[var(--color-success)]",
  earthquake: "text-[var(--color-danger)]",
  climate: "text-[var(--color-accent-cyan)]",
  outlook: "text-[var(--color-warning)]",
  terrain: "text-[var(--color-text-secondary)]",
};

export interface ChangeTypeRowProps {
  changeType: ChangeType;
  label: string;
  visible: boolean;
  onToggle: (visible: boolean) => void;
}

export function ChangeTypeRow({
  changeType,
  label,
  visible,
  onToggle,
}: ChangeTypeRowProps) {
  const Icon = ICONS[changeType] ?? Radar;

  return (
    <div className="flex h-9 items-center gap-2 rounded-[var(--radius-sm)] px-1.5 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--color-fill-1)]">
      <Icon
        aria-hidden="true"
        size={18}
        strokeWidth={1.5}
        className={`shrink-0 ${ICON_CLASS[changeType] ?? "text-[var(--color-accent)]"}`}
      />
      <span
        className={`flex-1 truncate text-body ${
          visible
            ? "text-[var(--color-text)]"
            : "text-[var(--color-text-secondary)]"
        }`}
      >
        {label}
      </span>
      <Switch checked={visible} onChange={onToggle} label={label} />
    </div>
  );
}
