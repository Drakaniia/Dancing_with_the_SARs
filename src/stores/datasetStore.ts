import { create } from "zustand";
import { SAMPLE_DATASETS, TIME_SERIES } from "@/fixtures/sample-dashboard";
import type { Dataset } from "@/shared/types/dataset";

interface DatasetState {
  datasets: Dataset[];
  currentDate: string | null;
  /** Selected time-series range, `[start, end]`. */
  range: [string, string];
  addDataset: (dataset: Dataset) => void;
  removeDataset: (id: string) => void;
  setCurrentDate: (date: string) => void;
}

/** Dataset state, seeded with the reference NISAR subsidence dataset. */
export const useDatasetStore = create<DatasetState>((set) => ({
  datasets: [...SAMPLE_DATASETS],
  currentDate: TIME_SERIES.currentDate,
  range: TIME_SERIES.range,

  addDataset: (dataset) =>
    set((state) => ({ datasets: [...state.datasets, dataset] })),

  removeDataset: (id) =>
    set((state) => ({
      datasets: state.datasets.filter((dataset) => dataset.id !== id),
    })),

  setCurrentDate: (date) => set({ currentDate: date }),
}));

/** Timeline steps — the current dataset's dates, in the order the store holds them. */
export function useTimelineDates(): string[] {
  return useDatasetStore((state) => state.datasets[0]?.dates ?? []);
}
