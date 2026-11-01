import { create } from "zustand";
import { SAMPLE_SELECTION } from "@/fixtures/sample-dashboard";
import type { SelectionPayload } from "@/shared/types/selection";

interface SelectionState {
  selected: SelectionPayload | null;
  select: (payload: SelectionPayload) => void;
  clear: () => void;
}

/**
 * Ephemeral map selection, in memory only.
 *
 * Seeded with the reference point so the dashboard reads like the reference at rest; the map click
 * that drives it lands in the map phase. `clear()` restores the panel's empty state.
 */
export const useSelectionStore = create<SelectionState>((set) => ({
  selected: SAMPLE_SELECTION,
  select: (payload) => set({ selected: payload }),
  clear: () => set({ selected: null }),
}));
