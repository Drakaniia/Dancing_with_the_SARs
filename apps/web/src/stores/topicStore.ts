import { create } from "zustand";
import {
  findTopic,
  findView,
  type TopicId,
  type ViewOption,
} from "@/features/topics/topicsConfig";
import { useLayerStore } from "./layerStore";

interface TopicState {
  topicId: TopicId;
  viewId: string;
  /** Index into the view's options (e.g. HH vs HV). */
  option: number;
  /** Index into an image option's frames (e.g. the outlook month). */
  frame: number;
  selectTopic: (topicId: TopicId) => void;
  selectView: (viewId: string) => void;
  selectOption: (option: number) => void;
  selectFrame: (frame: number) => void;
}

/**
 * Show exactly one data layer (or none, for image views) so each view is one clear map.
 * Chrome layers (basemap, boundary, labels) are left alone.
 */
export function applyViewOption(option: ViewOption | undefined): void {
  const targetId =
    option?.kind === "tiles" ? option.layerId : (option?.legendLayerId ?? null);
  const showTiles = option?.kind === "tiles";
  useLayerStore.setState((state) => ({
    activeLayerId: targetId ?? state.activeLayerId,
    layers: state.layers.map((layer) => {
      if (layer.kind !== "manifest-layer") return layer;
      const visible = showTiles && layer.id === targetId;
      return {
        ...layer,
        visible,
        showInLayerList: layer.showInLayerList || visible,
      };
    }),
  }));
}

function currentOption(
  topicId: TopicId,
  viewId: string,
  option: number,
): ViewOption | undefined {
  const view = findView(findTopic(topicId), viewId);
  return view.options[option] ?? view.options[0];
}

/** Starts on Space radar → What changed, which matches the layer shown when the app opens. */
export const useTopicStore = create<TopicState>((set, get) => ({
  topicId: "radar",
  viewId: "changed",
  option: 0,
  frame: 0,

  selectTopic: (topicId) => {
    const view = findTopic(topicId).views[0];
    set({ topicId, viewId: view.id, option: 0, frame: 0 });
    applyViewOption(view.options[0]);
  },

  selectView: (viewId) => {
    const { topicId } = get();
    set({ viewId, option: 0, frame: 0 });
    applyViewOption(currentOption(topicId, viewId, 0));
  },

  selectOption: (option) => {
    const { topicId, viewId } = get();
    set({ option, frame: 0 });
    applyViewOption(currentOption(topicId, viewId, option));
  },

  selectFrame: (frame) => set({ frame }),
}));
