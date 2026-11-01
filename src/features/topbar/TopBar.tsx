import { PanelLeft, PanelRight, Satellite } from "lucide-react";
import { DASHBOARD } from "@/fixtures/sample-dashboard";
import { IconButton } from "@/shared/ui/IconButton";
import { useUiStore } from "@/stores/uiStore";
import { DataStatus } from "./DataStatus";
import { GlobalSearch } from "./GlobalSearch";
import { TopBarActions } from "./TopBarActions";

/**
 * Top app bar: brand, global data status, centered search, and global actions.
 *
 * The `1fr auto 1fr` grid keeps the centre group (status + search) centred relative to the window
 * while the brand and actions flank it. On non-wide breakpoints the rails become overlays, so this
 * bar gains toggles for them; the search collapses to an icon in compact mode.
 */
export function TopBar() {
  const railMode = useUiStore((state) => state.railMode);
  const openRails = useUiStore((state) => state.openRails);
  const toggleRail = useUiStore((state) => state.toggleRail);

  const showLeftToggle = railMode === "compact";
  const showRightToggle = railMode !== "wide";

  return (
    <header className="relative z-[var(--z-topbar)] grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Satellite
          aria-hidden="true"
          size={24}
          strokeWidth={1.5}
          className="shrink-0 text-[var(--color-accent-cyan)]"
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-title text-[var(--color-text)]">
            {DASHBOARD.title}
          </span>
          <span className="truncate text-subtitle text-[var(--color-text-secondary)]">
            {DASHBOARD.subtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <DataStatus />
        <GlobalSearch compact={railMode === "compact"} />
      </div>

      <div className="flex items-center justify-end gap-1">
        {showLeftToggle ? (
          <IconButton
            label={openRails.left ? "Hide left rail" : "Show left rail"}
            aria-pressed={openRails.left}
            onClick={() => toggleRail("left")}
          >
            <PanelLeft size={18} strokeWidth={1.5} />
          </IconButton>
        ) : null}
        {showRightToggle ? (
          <IconButton
            label={openRails.right ? "Hide right rail" : "Show right rail"}
            aria-pressed={openRails.right}
            onClick={() => toggleRail("right")}
          >
            <PanelRight size={18} strokeWidth={1.5} />
          </IconButton>
        ) : null}
        <TopBarActions />
      </div>
    </header>
  );
}
