import { BarChart3, Eye, MapPin, Palette } from "lucide-react";
import { CurrentViewCard } from "@/features/inspector/CurrentViewCard";
import { LegendPanel } from "@/features/inspector/LegendPanel";
import { LocationInfoPanel } from "@/features/inspector/LocationInfoPanel";
import { QuickStatsPanel } from "@/features/inspector/QuickStatsPanel";
import { Panel } from "@/shared/ui/Panel";

/**
 * Right info rail. Panel order is locked to the reference:
 * Current View → Legend → Location Info → Quick Stats.
 */
export function RightRail() {
  return (
    <aside
      aria-label="Location and layer information"
      className="flex h-full min-h-0 w-full flex-col gap-[var(--panel-gap)] overflow-y-auto bg-[var(--color-bg)] p-[var(--rail-pad)]"
    >
      <Panel
        id="current-view"
        title="Current View"
        icon={<Eye size={16} strokeWidth={1.5} />}
      >
        <CurrentViewCard />
      </Panel>
      <Panel
        id="legend"
        title="Legend"
        icon={<Palette size={16} strokeWidth={1.5} />}
      >
        <LegendPanel />
      </Panel>
      <Panel
        id="location-info"
        title="Location Info"
        icon={<MapPin size={16} strokeWidth={1.5} />}
      >
        <LocationInfoPanel />
      </Panel>
      <Panel
        id="quick-stats"
        title="Quick Stats"
        icon={<BarChart3 size={16} strokeWidth={1.5} />}
      >
        <QuickStatsPanel />
      </Panel>
    </aside>
  );
}
