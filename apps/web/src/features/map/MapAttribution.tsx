import { MAP_ATTRIBUTION } from "@/features/about/credits";
import { useUiStore } from "@/stores/uiStore";

/**
 * Compact data credit in the map corner. MapLibre's own attribution control is
 * disabled, so this carries the required source credits (including the
 * Copernicus Sentinel line) and opens the full About & Credits dialog.
 */
export function MapAttribution() {
  const setAboutOpen = useUiStore((state) => state.setAboutOpen);

  return (
    <div className="flex max-w-[min(32rem,60vw)] items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-panel)]/85 px-2 py-0.5 text-[10px] leading-4 text-[var(--color-text-secondary)] shadow-[var(--shadow-1)]">
      <span className="truncate" title={MAP_ATTRIBUTION.join(" · ")}>
        {MAP_ATTRIBUTION.join(" · ")}
      </span>
      <button
        type="button"
        onClick={() => setAboutOpen(true)}
        className="shrink-0 font-medium text-[var(--color-accent)] hover:underline"
      >
        Credits
      </button>
    </div>
  );
}
