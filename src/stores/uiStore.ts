import { isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";

export type PanelId =
  | "change-types"
  | "time-series"
  | "map-layers"
  | "comparison"
  | "tools"
  | "current-view"
  | "legend"
  | "location-info"
  | "quick-stats";

export type RailMode = "wide" | "default" | "compact";
export type RailSide = "left" | "right";

export const PANEL_IDS: readonly PanelId[] = [
  "change-types",
  "time-series",
  "map-layers",
  "comparison",
  "tools",
  "current-view",
  "legend",
  "location-info",
  "quick-stats",
];

/** Every panel starts expanded, matching the reference dashboard. */
export const DEFAULT_PANELS: Record<PanelId, boolean> = {
  "change-types": true,
  "time-series": true,
  "map-layers": true,
  comparison: true,
  tools: true,
  "current-view": true,
  legend: true,
  "location-info": true,
  "quick-stats": true,
};

export interface UiState {
  railMode: RailMode;
  openRails: Record<RailSide, boolean>;
  panels: Record<PanelId, boolean>;
  setPanelOpen: (id: PanelId, open: boolean) => void;
  togglePanel: (id: PanelId) => void;
  setRailMode: (mode: RailMode) => void;
  toggleRail: (side: RailSide) => void;
}

const SETTINGS_STORE = "settings.json";
const PANELS_KEY = "ui.panels";

/** Mirrors `--breakpoint-default` / `--breakpoint-wide` in src/styles/tokens.css. */
const BREAKPOINT_DEFAULT = 1024;
const BREAKPOINT_WIDE = 1440;

/** Tauri is absent in the web build; persistence is skipped there and state stays in memory. */
function canPersist(): boolean {
  return typeof window !== "undefined" && isTauri();
}

function isPanelId(value: string): value is PanelId {
  return (PANEL_IDS as readonly string[]).includes(value);
}

async function readPersistedPanels(): Promise<Partial<
  Record<PanelId, boolean>
> | null> {
  if (!canPersist()) return null;
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(SETTINGS_STORE, { autoSave: true });
    const value = await store.get<Record<string, boolean>>(PANELS_KEY);
    if (!value || typeof value !== "object") return null;
    const panels: Partial<Record<PanelId, boolean>> = {};
    for (const [id, open] of Object.entries(value)) {
      if (isPanelId(id) && typeof open === "boolean") panels[id] = open;
    }
    return panels;
  } catch {
    return null;
  }
}

async function persistPanels(panels: Record<PanelId, boolean>): Promise<void> {
  if (!canPersist()) return;
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(SETTINGS_STORE, { autoSave: true });
    await store.set(PANELS_KEY, panels);
  } catch {
    // Persistence is best-effort; the in-memory state is still correct.
  }
}

export const useUiStore = create<UiState>((set) => ({
  railMode: "wide",
  // Overlay rails (compact/default) start closed; wide rails ignore this flag.
  openRails: { left: false, right: false },
  panels: { ...DEFAULT_PANELS },

  setPanelOpen: (id, open) =>
    set((state) => {
      if (state.panels[id] === open) return state;
      const panels = { ...state.panels, [id]: open };
      void persistPanels(panels);
      return { panels };
    }),

  togglePanel: (id) =>
    set((state) => {
      const panels = { ...state.panels, [id]: !state.panels[id] };
      void persistPanels(panels);
      return { panels };
    }),

  setRailMode: (railMode) => set({ railMode }),

  toggleRail: (side) =>
    set((state) => ({
      openRails: { ...state.openRails, [side]: !state.openRails[side] },
    })),
}));

export function resolveRailMode(width: number): RailMode {
  if (width >= BREAKPOINT_WIDE) return "wide";
  if (width >= BREAKPOINT_DEFAULT) return "default";
  return "compact";
}

/**
 * Loads the persisted panel collapse state. Safe to call more than once; resolves to the
 * in-memory defaults when the store is unavailable (web build, tests).
 */
export async function hydrateUiStore(): Promise<void> {
  const persisted = await readPersistedPanels();
  if (!persisted) return;
  useUiStore.setState((state) => ({
    panels: { ...state.panels, ...persisted },
  }));
}

// Restore persisted panels on module load; consumers that need to await it can call
// `hydrateUiStore()` directly.
void hydrateUiStore();
