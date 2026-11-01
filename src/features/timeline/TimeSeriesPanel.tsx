import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { TIME_SERIES } from "@/fixtures/sample-dashboard";
import { IconButton } from "@/shared/ui/IconButton";
import { Slider } from "@/shared/ui/Slider";
import { useDatasetStore, useTimelineDates } from "@/stores/datasetStore";
import { PlaybackButton } from "./PlaybackButton";
import { usePlayback } from "./usePlayback";

/**
 * Time Series: the range readout, a step/scrub control row, and the current date. The slider walks
 * the dataset's dates and play drives the shared playback loop, the same one the animation bar
 * uses — so the two controls can never disagree about what is playing.
 */
export function TimeSeriesPanel() {
  const dates = useTimelineDates();
  const currentDate = useDatasetStore((state) => state.currentDate);
  const range = useDatasetStore((state) => state.range);
  const setCurrentDate = useDatasetStore((state) => state.setCurrentDate);
  const { playing, toggle, pause, play } = usePlayback();
  /** Whether playback was running when the scrub began, so release can restore it. */
  const wasPlayingRef = useRef(false);

  const steps = dates.length > 0 ? dates : [...TIME_SERIES.ticks];
  const lastIndex = Math.max(steps.length - 1, 0);
  const index = Math.max(steps.indexOf(currentDate ?? ""), 0);

  const stepTo = (nextIndex: number) => {
    const date = steps[Math.min(Math.max(nextIndex, 0), lastIndex)];
    if (date) setCurrentDate(date);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Calendar
          aria-hidden="true"
          size={16}
          strokeWidth={1.5}
          className="shrink-0 text-[var(--color-text-secondary)]"
        />
        <span className="text-label text-[var(--color-text)]">
          {range[0]} – {range[1]}
        </span>
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

      <p className="text-right text-caption text-[var(--color-text-secondary)] tabular-nums">
        {currentDate}
      </p>
    </div>
  );
}
