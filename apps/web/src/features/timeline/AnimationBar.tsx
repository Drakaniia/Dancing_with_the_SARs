import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/shared/ui/Slider";
import { isForecastPeriod } from "@/shared/utils/dates";
import { useDatasetStore, useTimelineDates } from "@/stores/datasetStore";
import { DUR_MED, EASE_OUT, REDUCED_MOTION } from "@/styles/tokens";
import { PlaybackButton } from "./PlaybackButton";
import { usePlayback } from "./usePlayback";

const IDLE_MS = 3000;
const IDLE_OPACITY = 0.55;
const MAX_VISIBLE_TICKS = 9;

export function AnimationBar() {
  const dates = useTimelineDates();
  const currentDate = useDatasetStore((state) => state.currentDate);
  const setCurrentDate = useDatasetStore((state) => state.setCurrentDate);
  const { playing, toggle, pause, play } = usePlayback();
  const reducedMotion = useReducedMotion();
  const [idle, setIdle] = useState(false);
  const wasPlayingRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);

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

  const visibleTicks = useMemo(() => {
    if (dates.length <= MAX_VISIBLE_TICKS) return dates;
    const out: string[] = [];
    for (let i = 0; i < MAX_VISIBLE_TICKS; i++) {
      const idx = Math.round(
        (i * (dates.length - 1)) / (MAX_VISIBLE_TICKS - 1),
      );
      out.push(dates[idx]);
    }
    return Array.from(new Set(out));
  }, [dates]);

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

          <div className="flex justify-between pt-1 font-display text-[11px] tabular-nums">
            {visibleTicks.map((date) => {
              const active = date === currentDate;
              const forecast = isForecastPeriod(date);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setCurrentDate(date)}
                  className={`truncate px-0.5 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
                    active
                      ? "font-semibold text-[var(--color-accent)]"
                      : forecast
                        ? "border-b border-dashed border-[var(--color-warning)] text-[var(--color-text-secondary)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {date.split(" (vs ")[0]}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
