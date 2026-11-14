import { BarChart3, Eye, MapPin, Palette } from "lucide-react";
import { CurrentViewCard } from "@/features/inspector/CurrentViewCard";
import { LegendPanel } from "@/features/inspector/LegendPanel";
import { LocationInfoPanel } from "@/features/inspector/LocationInfoPanel";
import { QuickStatsPanel } from "@/features/inspector/QuickStatsPanel";
import { Rail, type RailPanelDef, type RailPresentation } from "./Rail";

/**
 * Panel order is locked to the reference:
 * Current View → Legend → Location Info → Quick Stats.
 */
const RIGHT_PANELS: readonly RailPanelDef[] = [
  {
    id: "current-view",
    title: "Current View",
    icon: Eye,
    Content: CurrentViewCard,
  },
  { id: "legend", title: "Legend", icon: Palette, Content: LegendPanel },
  {
    id: "location-info",
    title: "Location Info",
    icon: MapPin,
    Content: LocationInfoPanel,
  },
  {
    id: "quick-stats",
    title: "Quick Stats",
    icon: BarChart3,
    Content: QuickStatsPanel,
  },
];

export interface RightRailProps {
  presentation?: RailPresentation;
  onClose?: () => void;
  expandedWidth?: string;
}

/** Right info rail. Starts collapsed to its icon strip on wide screens. */
export function RightRail(props: RightRailProps) {
  return (
    <Rail
      side="right"
      label="Location and layer information"
      title="Inspector"
      panels={RIGHT_PANELS}
      {...props}
    />
  );
}
