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
import { Rail, type RailPanelDef, type RailPresentation } from "./Rail";

/**
 * Panel order is locked to the reference:
 * Surface Change Types → Time Series → Map Layers → Comparison View → Tools.
 */
const LEFT_PANELS: readonly RailPanelDef[] = [
  {
    id: "change-types",
    title: "Surface Change Types",
    icon: Layers,
    Content: ChangeTypeList,
  },
  {
    id: "time-series",
    title: "Time Series",
    icon: CalendarRange,
    Content: TimeSeriesPanel,
  },
  {
    id: "map-layers",
    title: "Map Layers",
    icon: MapIcon,
    Content: MapLayersPanel,
  },
  {
    id: "comparison",
    title: "Comparison View",
    icon: Columns2,
    Content: ComparisonPanel,
  },
  { id: "tools", title: "Tools", icon: Wrench, Content: ToolsPanel },
];

export interface LeftRailProps {
  presentation?: RailPresentation;
  onClose?: () => void;
  expandedWidth?: string;
}

/** Left control rail. */
export function LeftRail(props: LeftRailProps) {
  return (
    <Rail
      side="left"
      label="Surface change controls"
      title="Controls"
      panels={LEFT_PANELS}
      {...props}
    />
  );
}
