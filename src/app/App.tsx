import { MapCanvas } from "@/features/map/MapCanvas";
import { LeftRail } from "@/features/shell/LeftRail";
import { RailSheet } from "@/features/shell/RailSheet";
import { RightRail } from "@/features/shell/RightRail";
import { useRailMode } from "@/features/shell/useRailMode";
import { TopBar } from "@/features/topbar/TopBar";
import { type RailMode, useUiStore } from "@/stores/uiStore";
import { ThemeProvider } from "./providers/ThemeProvider";

/** Column tracks per breakpoint — the map is the only flexible track. */
const COLUMNS: Record<RailMode, string> = {
  wide: "var(--rail-left-w-wide) 1fr var(--rail-right-w)",
  default: "var(--rail-left-w-default) 1fr",
  compact: "1fr",
};

/**
 * Shell composition. Region order is locked to the reference: top bar, then left rail · map · right
 * rail. On `default` the right rail becomes an overlay sheet; on `compact` both rails do and push
 * nothing.
 */
export function AppShell() {
  useRailMode();
  const railMode = useUiStore((state) => state.railMode);
  const openRails = useUiStore((state) => state.openRails);
  const toggleRail = useUiStore((state) => state.toggleRail);

  const leftIsSheet = railMode === "compact";
  const rightIsSheet = railMode !== "wide";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <TopBar />

      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: COLUMNS[railMode] }}
        data-rail-mode={railMode}
      >
        {leftIsSheet ? null : <LeftRail />}

        <main className="relative min-h-0 overflow-hidden bg-[var(--color-bg-elevated)]">
          <MapCanvas />
        </main>

        {rightIsSheet ? null : <RightRail />}
      </div>

      <RailSheet
        side="left"
        open={leftIsSheet && openRails.left}
        onClose={() => toggleRail("left")}
        label="Surface change controls"
      >
        <LeftRail />
      </RailSheet>
      <RailSheet
        side="right"
        open={rightIsSheet && openRails.right}
        onClose={() => toggleRail("right")}
        label="Location and layer information"
      >
        <RightRail />
      </RailSheet>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
