import { Calendar, ChevronLeft, ChevronRight, Gauge } from "lucide-react";
import { useRef } from "react";
import { TIME_SERIES } from "@/fixtures/sample-dashboard";
import { IconButton } from "@/shared/ui/IconButton";
import { Slider } from "@/shared/ui/Slider";
import { isForecastPeriod, resolvePeriod } from "@/shared/utils/dates";
import { useDatasetStore, useTimelineDates } from "@/stores/datasetStore";
import { useActiveLayer } from "@/stores/layerStore";
import { PlaybackButton } from "./PlaybackButton";
import { PLAYBACK_SPEEDS, usePlayback } from "./usePlayback";

export function TimeSeriesPanel() {
  const dates = useTimelineDates();
  const currentDate = useDatasetStore((state) => state.currentDate);
  const range = useDatasetStore((state) => state.range);
  const setCurrentDate = useDatasetStore((state) => state.setCurrentDate);
  const active = useActiveLayer();
  const { playing, speed, toggle, pause, play, setSpeed } = usePlayback();
  const wasPlayingRef = useRef(false);

  const steps = dates.length > 0 ? dates : [...TIME_SERIES.ticks];
  const lastIndex = Math.max(steps.length - 1, 0);
  const index = Math.max(steps.indexOf(currentDate ?? ""), 0);

  const stepTo = (nextIndex: number) => {
    const date = steps[Math.min(Math.max(nextIndex, 0), lastIndex)];
    if (date) setCurrentDate(date);
  };

  const snap = resolvePeriod(active?.periods, currentDate);
  const forecast = isForecastPeriod(currentDate ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar
            aria-hidden="true"
            size={16}
            strokeWidth={1.5}
            className="shrink-0 text-[var(--color-text-secondary)]"
          />
          <span className="font-display text-label text-[var(--color-text)] tabular-nums">
            {range[0]} – {range[1]}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Gauge
            aria-hidden="true"
            size={13}
            className="text-[var(--color-text-muted)]"
          />
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              aria-label={`Playback speed ${s}x`}
              className={`rounded px-1.5 py-0.5 font-display text-[11px] tabular-nums transition-colors ${
                speed === s
                  ? "bg-[var(--color-accent)] font-semibold text-[var(--color-on-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-fill-2)]"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PlaybackButton playing={playing} onToggle={toggle} />
        <IconButton
          label="Previous date"
          variant="ghost"
          disabled={index <= 0}
          onClick={() => stepTo(index - 1)}
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </IconButton>
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
            aria-label="Timeline position"
            ariaValueText={currentDate ?? undefined}
          />
        </div>
        <IconButton
          label="Next date"
          variant="ghost"
          disabled={index >= lastIndex}
          onClick={() => stepTo(index + 1)}
        >
          <ChevronRight size={18} strokeWidth={1.5} />
        </IconButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          {forecast ? (
            <span className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-warning)] bg-[var(--color-fill-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-warning)]">
              El Nino Scenario
            </span>
          ) : (
            <span className="rounded-[var(--radius-sm)] bg-[var(--color-fill-2)] px-1.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]">
              Observed
            </span>
          )}
          {!snap.exact && snap.resolved ? (
            <span className="font-display text-[11px] text-[var(--color-warning)] tabular-nums">
              snapped: {snap.resolved}
            </span>
          ) : null}
        </div>
        <p className="font-display text-caption font-medium text-[var(--color-text)] tabular-nums">
          {currentDate}
        </p>
      </div>
    </div>
  );
}
