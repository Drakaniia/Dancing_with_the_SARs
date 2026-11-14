import { useEffect } from "react";
import { AboutModal } from "@/features/about/AboutModal";
import { MapCanvas } from "@/features/map/MapCanvas";
import { ProvenanceModal } from "@/features/provenance/ProvenanceModal";
import { LeftRail } from "@/features/shell/LeftRail";
import { RailSheet } from "@/features/shell/RailSheet";
import { RightRail } from "@/features/shell/RightRail";
import { useRailMode } from "@/features/shell/useRailMode";
import { TopBar } from "@/features/topbar/TopBar";
import { useDatasetStore } from "@/stores/datasetStore";
import { type RailMode, type RailSide, useUiStore } from "@/stores/uiStore";
import { ThemeProvider } from "./providers/ThemeProvider";

const COLLAPSED_W = "var(--rail-collapsed-w)";
const RIGHT_W = "var(--rail-right-w)";

function leftWidth(railMode: RailMode): string {
  return railMode === "wide"
    ? "var(--rail-left-w-wide)"
    : "var(--rail-left-w-default)";
}

/** The map is always the only flexible track; inline rails are fixed or collapsed strips. */
function gridColumns(
  railMode: RailMode,
  expanded: Record<RailSide, boolean>,
): string {
  if (railMode === "compact") return "1fr";
  const left = expanded.left ? leftWidth(railMode) : COLLAPSED_W;
  if (railMode === "default") return `${left} 1fr`;
  const right = expanded.right ? RIGHT_W : COLLAPSED_W;
  return `${left} 1fr ${right}`;
}

export function AppShell() {
  useRailMode();
  const railMode = useUiStore((state) => state.railMode);
  const openRails = useUiStore((state) => state.openRails);
  const expandedRails = useUiStore((state) => state.expandedRails);
  const toggleRail = useUiStore((state) => state.toggleRail);
  const loadManifestAndTables = useDatasetStore(
    (state) => state.loadManifestAndTables,
  );

  useEffect(() => {
    void loadManifestAndTables();
  }, [loadManifestAndTables]);

  const leftIsSheet = railMode === "compact";
  const rightIsSheet = railMode !== "wide";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <TopBar />

      <div
        className="grid min-h-0 flex-1 transition-[grid-template-columns] duration-[var(--dur-med)] ease-[var(--ease-out)] motion-reduce:transition-none"
        style={{ gridTemplateColumns: gridColumns(railMode, expandedRails) }}
        data-rail-mode={railMode}
      >
        {leftIsSheet ? null : <LeftRail expandedWidth={leftWidth(railMode)} />}

        <main className="relative min-h-0 overflow-hidden bg-[var(--color-bg-elevated)]">
          <MapCanvas />
        </main>

        {rightIsSheet ? null : <RightRail expandedWidth={RIGHT_W} />}
      </div>

      <RailSheet
        side="left"
        open={leftIsSheet && openRails.left}
        onClose={() => toggleRail("left")}
        label="Surface change controls"
      >
        <LeftRail presentation="sheet" onClose={() => toggleRail("left")} />
      </RailSheet>
      <RailSheet
        side="right"
        open={rightIsSheet && openRails.right}
        onClose={() => toggleRail("right")}
        label="Location and layer information"
      >
        <RightRail
          presentation="sheet"
          onClose={() => toggleRail("right")}
        />
      </RailSheet>

      <ProvenanceModal />
      <AboutModal />
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
