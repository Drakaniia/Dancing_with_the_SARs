import { isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import type { ToolId } from "@/fixtures/sample-dashboard";

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
export type AnalyticsTab = "inspector" | "landslides" | "climate" | "outlook";

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

export interface FlyToTarget {
  lng: number;
  lat: number;
  zoom?: number;
  label?: string;
  timestamp: number;
}

export interface UiState {
  railMode: RailMode;
  openRails: Record<RailSide, boolean>;
  panels: Record<PanelId, boolean>;
  provenanceOpen: boolean;
  activeTool: ToolId | null;
  analyticsTab: AnalyticsTab;
  flyToTarget: FlyToTarget | null;
  measurePoints: [number, number][];
  /** 3D terrain view (pitched camera over a DEM) instead of the flat map. */
  terrain3d: boolean;
  setPanelOpen: (id: PanelId, open: boolean) => void;
  togglePanel: (id: PanelId) => void;
  setRailMode: (mode: RailMode) => void;
  toggleRail: (side: RailSide) => void;
  setProvenanceOpen: (open: boolean) => void;
  setActiveTool: (tool: ToolId | null) => void;
  setAnalyticsTab: (tab: AnalyticsTab) => void;
  requestFlyTo: (
    lng: number,
    lat: number,
    zoom?: number,
    label?: string,
  ) => void;
  addMeasurePoint: (pt: [number, number]) => void;
  clearMeasurePoints: () => void;
  setTerrain3d: (enabled: boolean) => void;
  toggleTerrain3d: () => void;
}

const SETTINGS_STORE = "settings.json";
const PANELS_KEY = "ui.panels";

const BREAKPOINT_DEFAULT = 1024;
const BREAKPOINT_WIDE = 1440;

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
    // Best-effort persistence.
  }
}

export const useUiStore = create<UiState>((set) => ({
  railMode: "wide",
  openRails: { left: false, right: false },
  panels: { ...DEFAULT_PANELS },
  provenanceOpen: false,
  activeTool: null,
  analyticsTab: "inspector",
  flyToTarget: null,
  measurePoints: [],
  terrain3d: false,

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

  setProvenanceOpen: (provenanceOpen) => set({ provenanceOpen }),

  setActiveTool: (activeTool) =>
    set((state) => ({
      activeTool,
      measurePoints: activeTool === "measure" ? state.measurePoints : [],
    })),

  setAnalyticsTab: (analyticsTab) => set({ analyticsTab }),

  requestFlyTo: (lng, lat, zoom = 11.5, label) =>
    set({
      flyToTarget: { lng, lat, zoom, label, timestamp: Date.now() },
    }),

  addMeasurePoint: (pt) =>
    set((state) => ({
      measurePoints:
        state.measurePoints.length >= 2 ? [pt] : [...state.measurePoints, pt],
    })),

  clearMeasurePoints: () => set({ measurePoints: [] }),

  setTerrain3d: (terrain3d) => set({ terrain3d }),

  toggleTerrain3d: () => set((state) => ({ terrain3d: !state.terrain3d })),
}));

export function resolveRailMode(width: number): RailMode {
  if (width >= BREAKPOINT_WIDE) return "wide";
  if (width >= BREAKPOINT_DEFAULT) return "default";
  return "compact";
}

export async function hydrateUiStore(): Promise<void> {
  const persisted = await readPersistedPanels();
  if (!persisted) return;
  useUiStore.setState((state) => ({
    panels: { ...state.panels, ...persisted },
  }));
}

void hydrateUiStore();
