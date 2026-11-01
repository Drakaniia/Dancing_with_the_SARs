import { Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUR_FAST, EASE_OUT, REDUCED_MOTION } from "@/styles/tokens";

export type PlaybackButtonSize = "sm" | "md";

export interface PlaybackButtonProps {
  playing: boolean;
  onToggle: () => void;
  /** `sm` is the 32px rail control; `md` is the 36px control in the animation bar. */
  size?: PlaybackButtonSize;
  disabled?: boolean;
}

const SIZE_CLASS: Record<PlaybackButtonSize, string> = {
  sm: "h-[var(--button-sm-h)] w-[var(--button-sm-h)]",
  md: "h-[var(--button-md-h)] w-[var(--button-md-h)]",
};

/**
 * Round play/pause control. The icon morphs with an opacity cross-fade; press feedback starts on
 * pointer-down. The play loop it drives is the shared `usePlayback` store.
 */
export function PlaybackButton({
  playing,
  onToggle,
  size = "sm",
  disabled = false,
}: PlaybackButtonProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-pressed={playing}
      aria-label={playing ? "Pause" : "Play"}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onToggle}
      whileTap={disabled || reducedMotion ? undefined : { scale: 0.94 }}
      transition={
        reducedMotion ? REDUCED_MOTION : { duration: DUR_FAST, ease: EASE_OUT }
      }
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] ${SIZE_CLASS[size]} transition-[filter] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-40`}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={playing ? "pause" : "play"}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={
            reducedMotion
              ? REDUCED_MOTION
              : { duration: DUR_FAST, ease: EASE_OUT }
          }
          className="flex"
        >
          {playing ? (
            <Pause aria-hidden="true" size={16} strokeWidth={1.5} />
          ) : (
            <Play aria-hidden="true" size={16} strokeWidth={1.5} />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
