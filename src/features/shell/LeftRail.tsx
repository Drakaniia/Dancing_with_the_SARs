import {
  CalendarRange,
  Columns2,
  Layers,
  Map as MapIcon,
  Wrench,
} from "lucide-react";
import { ChangeTypeList } from "@/features/change-types/ChangeTypeList";
import { ComparisonPanel } from "@/features/comparison/ComparisonPanel";
import { MapLayersPanel } from "@/features/layers/MapLayersPanel";
import { TimeSeriesPanel } from "@/features/timeline/TimeSeriesPanel";
import { ToolsPanel } from "@/features/tools/ToolsPanel";
import { Panel } from "@/shared/ui/Panel";

/**
 * Left control rail. Panel order is locked to the reference:
 * Surface Change Types → Time Series → Map Layers → Comparison View → Tools.
 */
export function LeftRail() {
  return (
    <aside
      aria-label="Surface change controls"
      className="flex h-full min-h-0 w-full flex-col gap-[var(--panel-gap)] overflow-y-auto bg-[var(--color-bg)] p-[var(--rail-pad)]"
    >
      <Panel
        id="change-types"
        title="Surface Change Types"
        icon={<Layers size={16} strokeWidth={1.5} />}
      >
        <ChangeTypeList />
      </Panel>
      <Panel
        id="time-series"
        title="Time Series"
        icon={<CalendarRange size={16} strokeWidth={1.5} />}
      >
        <TimeSeriesPanel />
      </Panel>
      <Panel
        id="map-layers"
        title="Map Layers"
        icon={<MapIcon size={16} strokeWidth={1.5} />}
      >
        <MapLayersPanel />
      </Panel>
      <Panel
        id="comparison"
        title="Comparison View"
        icon={<Columns2 size={16} strokeWidth={1.5} />}
      >
        <ComparisonPanel />
      </Panel>
      <Panel
        id="tools"
        title="Tools"
        icon={<Wrench size={16} strokeWidth={1.5} />}
      >
        <ToolsPanel />
      </Panel>
    </aside>
  );
}
