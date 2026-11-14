import { create } from "zustand";
import { useDatasetStore } from "@/stores/datasetStore";

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

const BASE_STEP_MS = 700;

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
  lastStep = now;

  const { manifest, datasets, currentDate, setCurrentDate } =
    useDatasetStore.getState();
  const dates = manifest?.dates ?? datasets[0]?.dates ?? [];
  const next = nextDate(dates, currentDate);
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
