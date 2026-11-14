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
import { type RailMode, useUiStore } from "@/stores/uiStore";
import { ThemeProvider } from "./providers/ThemeProvider";

const COLUMNS: Record<RailMode, string> = {
  wide: "var(--rail-left-w-wide) 1fr var(--rail-right-w)",
  default: "var(--rail-left-w-default) 1fr",
  compact: "1fr",
};

export function AppShell() {
  useRailMode();
  const railMode = useUiStore((state) => state.railMode);
  const openRails = useUiStore((state) => state.openRails);
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
