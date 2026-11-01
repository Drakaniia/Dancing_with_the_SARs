import { create } from "zustand";
import { SAMPLE_LAYERS } from "@/fixtures/sample-dashboard";
import type { LayerConfig } from "@/shared/types/layer";

interface LayerState {
  layers: LayerConfig[];
  /** Layer the opacity control and Current View card act on. */
  activeLayerId: string;
  toggleVisibility: (id: string) => void;
  setOpacity: (id: string, opacity: number) => void;
  setActive: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}

/**
 * Layer state, seeded from the reference fixture. Change-type rows in the Surface Change Types
 * panel and the data row in Map Layers are the *same* store entry, so the two panels cannot
 * drift out of sync.
 */
export const useLayerStore = create<LayerState>((set) => ({
  layers: SAMPLE_LAYERS.map((layer) => ({ ...layer })),
  activeLayerId: "subsidence",

  toggleVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer,
      ),
    })),

  setOpacity: (id, opacity) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, opacity } : layer,
      ),
    })),

  setActive: (id) => set({ activeLayerId: id }),

  reorder: (fromIndex, toIndex) =>
    set((state) => {
      const { layers } = state;
      const lastIndex = layers.length - 1;
      if (
        fromIndex < 0 ||
        fromIndex > lastIndex ||
        toIndex < 0 ||
        toIndex > lastIndex
      ) {
        return state;
      }
      const next = [...layers];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return {
        layers: next.map((layer, index) => ({ ...layer, order: index })),
      };
    }),
}));

/** The layer the opacity control and Current View card read. */
export function useActiveLayer(): LayerConfig | undefined {
  return useLayerStore((state) =>
    state.layers.find((layer) => layer.id === state.activeLayerId),
  );
}
