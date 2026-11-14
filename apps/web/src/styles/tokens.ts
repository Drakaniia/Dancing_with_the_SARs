import type { Transition } from "motion/react";

/**
 * JS mirror of the tokens in `tokens.css` that CSS cannot hand to JavaScript.
 *
 * Springs are consumed by the Motion library as JS objects, so the `--spring-*` custom properties
 * in `tokens.css` are declared again here; the fixed control metrics below are the same values as
 * `--switch-*` / `--slider-*`. Keep both sides in sync — this is the only place a component reaches
 * for a numeric value that is not expressible as a CSS token.
 */

/** `--spring-ui` — default move/resize (critically damped). */
export const SPRING_UI: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.4,
};

/** `--spring-momentum` — only after a flick/drag release (slider, animation bar). */
export const SPRING_MOMENTUM: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.4,
};

/** `--spring-drawer` — panel collapse/expand. */
export const SPRING_DRAWER: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.3,
};

/** `--ease-out` — CSS-only state transitions, in seconds for Motion. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** `--dur-fast` in seconds (Motion durations are seconds; CSS uses the ms token). */
export const DUR_FAST = 0.12;

/** `--dur-med` in seconds. */
export const DUR_MED = 0.22;

/**
 * Reduced-motion substitution: opacity cross-fades only — no translate, no overshoot.
 * Pass this anywhere a spring or a slide would otherwise run.
 */
export const REDUCED_MOTION: Transition = { duration: DUR_MED, ease: EASE_OUT };

/** `--slider-thumb-w` — needed as a number to map pointer pixels to a value. */
export const SLIDER_THUMB_PX = 16;

/** `--switch-w - --switch-knob - 2 * --switch-inset` — the knob's travel in px. */
export const SWITCH_TRAVEL_PX = 16;

/** Pixels of travel a slider allows the thumb to overshoot past either end while dragging. */
export const SLIDER_OVERSHOOT_PX = 40;

/** Past-end resistance while dragging (0 = none, 1 = none). */
export const RUBBER_BAND = 0.3;

/** Deceleration rate for flick projection (§10): `v/1000 · d/(1-d)`. */
export const DECELERATION_RATE = 0.998;

/** Pointer velocity (px/ms) below which a release is a drop, not a flick. */
export const FLICK_VELOCITY_PX_PER_MS = 0.3;

/** How many ms between pointer samples the velocity estimate is smoothed over. */
export const VELOCITY_WINDOW_MS = 80;
