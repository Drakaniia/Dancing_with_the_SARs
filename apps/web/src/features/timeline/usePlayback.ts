import { create } from "zustand";
import { useDatasetStore } from "@/stores/datasetStore";
import { framePendingFor, isFramePending } from "./frameLoading";
import { getTimelineSteps, stepIndexFor } from "./timelineSteps";

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

/** Time each date stays on screen at 1× once it has loaded. */
export const BASE_STEP_MS = 900;
/** Longest the loop waits for a slow frame before moving on anyway. */
export const MAX_FRAME_WAIT_MS = 6000;

export function nextDate(
  dates: string[],
  current: string | null,
): string | null {
  if (dates.length === 0) return null;
  const index = current ? dates.indexOf(current) : -1;
  return dates[(index + 1) % dates.length] ?? dates[0];
}

let frame: number | null = null;
let lastStep = 0;

function stopLoop(): void {
  if (frame === null) return;
  cancelAnimationFrame(frame);
  frame = null;
}

function tick(now: number): void {
  frame = requestAnimationFrame(tick);

  const { playing, speed } = usePlaybackStore.getState();
  if (!playing || now - lastStep < BASE_STEP_MS / speed) return;
  // Hold the date until its map has finished drawing (or it is clearly stuck).
  // Restart the step clock while waiting, so a slow date still stays a full step once loaded.
  if (isFramePending() && framePendingFor() < MAX_FRAME_WAIT_MS) {
    lastStep = now;
    return;
  }
  lastStep = now;

  const { currentDate, setCurrentDate } = useDatasetStore.getState();
  const steps = getTimelineSteps();
  if (steps.length < 2) return;
  const here = steps[stepIndexFor(steps, currentDate)];
  const next = nextDate(steps, here);
  if (next) setCurrentDate(next);
}

function startLoop(): void {
  if (frame !== null) return;
  lastStep = performance.now();
  frame = requestAnimationFrame(tick);
}

interface PlaybackState {
  playing: boolean;
  speed: PlaybackSpeed;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  playing: false,
  speed: 1,

  play: () => {
    if (get().playing) return;
    set({ playing: true });
    startLoop();
  },

  pause: () => {
    if (!get().playing) return;
    set({ playing: false });
    stopLoop();
  },

  toggle: () => (get().playing ? get().pause() : get().play()),

  setSpeed: (speed) => set({ speed }),
}));

export interface UsePlaybackResult {
  playing: boolean;
  speed: PlaybackSpeed;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
}

export function usePlayback(): UsePlaybackResult {
  const playing = usePlaybackStore((state) => state.playing);
  const speed = usePlaybackStore((state) => state.speed);
  const play = usePlaybackStore((state) => state.play);
  const pause = usePlaybackStore((state) => state.pause);
  const toggle = usePlaybackStore((state) => state.toggle);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);

  return { playing, speed, play, pause, toggle, setSpeed };
}
