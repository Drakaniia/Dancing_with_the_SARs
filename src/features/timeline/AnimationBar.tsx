import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Slider } from "@/shared/ui/Slider";
import { useDatasetStore, useTimelineDates } from "@/stores/datasetStore";
import { DUR_MED, EASE_OUT, REDUCED_MOTION } from "@/styles/tokens";
import { PlaybackButton } from "./PlaybackButton";
import { usePlayback } from "./usePlayback";

/** How long the pointer must be still before the bar recedes. */
const IDLE_MS = 3000;
/** Opacity the bar settles at while idle — present, but out of the way. */
const IDLE_OPACITY = 0.4;

/**
 * Bottom-center glass bar: play/pause, the momentum scrub slider and the date tick row. Dragging
 * the slider pauses playback and releasing resumes it only if it was playing before the grab, so
 * a scrub is never destructive.
 */
export function AnimationBar() {
  const dates = useTimelineDates();
  const currentDate = useDatasetStore((state) => state.currentDate);
  const setCurrentDate = useDatasetStore((state) => state.setCurrentDate);
  const { playing, toggle, pause, play } = usePlayback();
  const reducedMotion = useReducedMotion();
  const [idle, setIdle] = useState(false);
  const wasPlayingRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);

  // Any pointer movement wakes the bar; it recedes again after a still period.
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      if (idleTimerRef.current !== null)
        window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      if (idleTimerRef.current !== null)
        window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  const lastIndex = Math.max(dates.length - 1, 0);
  const index = Math.max(dates.indexOf(currentDate ?? ""), 0);

  const stepTo = (next: number) => {
    const date = dates[Math.min(Math.max(next, 0), lastIndex)];
    if (date) setCurrentDate(date);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[var(--z-animation-bar)] flex justify-center px-3">
      <motion.div
        animate={{ opacity: idle ? IDLE_OPACITY : 1 }}
        transition={
          reducedMotion ? REDUCED_MOTION : { duration: DUR_MED, ease: EASE_OUT }
        }
        className="glass pointer-events-auto flex h-14 w-full max-w-2xl items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-chrome-border)] px-4 shadow-[var(--shadow-2)]"
      >
        <PlaybackButton playing={playing} onToggle={toggle} size="md" />

        <div className="min-w-0 flex-1">
          <Slider
            value={index}
            min={0}
            max={lastIndex}
            step={1}
            onChange={stepTo}
            onScrubStart={() => {
              wasPlayingRef.current = playing;
              pause();
            }}
            onScrubEnd={() => {
              if (wasPlayingRef.current) play();
            }}
            aria-label="Time series position"
            ariaValueText={currentDate ?? undefined}
          />

          <div className="flex justify-between pt-1 text-caption tabular-nums">
            {dates.map((date) => (
              <span
                key={date}
                className={`transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
                  date === currentDate
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {date}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
