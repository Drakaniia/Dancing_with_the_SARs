import {Easing, interpolate} from 'remotion';

export const ease = Easing.bezier(0.65, 0, 0.35, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const linear = (t: number) => t;

/** 0→1 progress between frames a and b, clamped. */
export const prog = (frame: number, a: number, b: number, easing: (t: number) => number = linear) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** Fade in over [from, from + d] and out over [to - d, to]. */
export const inOut = (frame: number, from: number, to: number, d = 12) =>
  Math.min(prog(frame, from, from + d), 1 - prog(frame, to - d, to));

export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
