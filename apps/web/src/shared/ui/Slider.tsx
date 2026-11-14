import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DECELERATION_RATE,
  FLICK_VELOCITY_PX_PER_MS,
  REDUCED_MOTION,
  RUBBER_BAND,
  SLIDER_OVERSHOOT_PX,
  SLIDER_THUMB_PX,
  SPRING_MOMENTUM,
  SPRING_UI,
  VELOCITY_WINDOW_MS,
} from "@/styles/tokens";

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Quantisation in value units; also the arrow-key step. `0` disables snapping. */
  step?: number;
  /** Fired when a pointer grab starts (e.g. playback pauses while scrubbing). */
  onScrubStart?: () => void;
  /** Fired once the release settle finishes — a flick may outlive the pointer. */
  onScrubEnd?: () => void;
  /** Flick release hands momentum to the spring. Default `true`. */
  momentum?: boolean;
  disabled?: boolean;
  /** Announced value, when the raw number is not meaningful (dates, etc.). */
  ariaValueText?: string;
  className?: string;
  "aria-label": string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * The marquee gesture component: opacity and time scrub.
 *
 * The thumb is driven by one motion value in rail pixels. A pointer grab writes to it 1:1
 * (`setPointerCapture` + grab offset), a release hands the pointer velocity to the momentum spring,
 * and every other source (prop change, arrow key) animates the same value — so motion always starts
 * from the live position and any gesture can be reversed mid-flight.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  onScrubStart,
  onScrubEnd,
  momentum = true,
  disabled = false,
  ariaValueText,
  className,
  "aria-label": ariaLabel,
}: SliderProps) {
  const reducedMotion = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const thumbX = useMotionValue(0);
  const [railWidth, setRailWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  // Gesture bookkeeping kept in refs: these must never trigger a re-render mid-drag.
  const onChangeRef = useRef(onChange);
  const onScrubStartRef = useRef(onScrubStart);
  const onScrubEndRef = useRef(onScrubEnd);
  const grabOffsetRef = useRef(SLIDER_THUMB_PX / 2);
  const samplesRef = useRef<{ x: number; t: number }[]>([]);
  const velocityRef = useRef(0);
  /** True from pointer-down until the release settle finishes; blocks prop→thumb syncs. */
  const scrubbingRef = useRef(false);
  /** Mirror of `dragging` so a settle resolving after a fresh grab cannot end the new gesture. */
  const draggingRef = useRef(false);
  /** False until the thumb has been placed once; the first placement is a jump. */
  const placedRef = useRef(false);
  const measuredTravelRef = useRef(0);

  useEffect(() => {
    onChangeRef.current = onChange;
    onScrubStartRef.current = onScrubStart;
    onScrubEndRef.current = onScrubEnd;
  });

  const travel = Math.max(railWidth - SLIDER_THUMB_PX, 0);
  const span = max - min || 1;

  const fractionForValue = useCallback(
    (next: number) => (clamp(next, min, max) - min) / span,
    [min, span, max],
  );

  const xToValue = useCallback(
    (x: number) => min + (travel > 0 ? clamp(x, 0, travel) / travel : 0) * span,
    [min, span, travel],
  );

  const snapValue = useCallback(
    (next: number) => {
      const snapped =
        step > 0 ? min + Math.round((next - min) / step) * step : next;
      return clamp(snapped, min, max);
    },
    [min, max, step],
  );

  const xForValue = useCallback(
    (next: number) => fractionForValue(next) * travel,
    [travel, fractionForValue],
  );

  // Measure the rail; the thumb mapping is expressed in its pixels.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => setRailWidth(rail.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(measure);
      observer.observe(rail);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Any value change that is not part of a gesture moves the thumb on the UI spring. The first
  // placement and any re-measure are jumps: the thumb must never slide in from 0 on mount.
  useEffect(() => {
    if (scrubbingRef.current) return;
    const target = xForValue(value);
    const layoutChanged = measuredTravelRef.current !== travel;
    measuredTravelRef.current = travel;
    if (!placedRef.current || layoutChanged || reducedMotion) {
      placedRef.current = true;
      thumbX.jump(target);
      return;
    }
    const controls = animate(thumbX, target, SPRING_UI);
    return () => controls.stop();
  }, [value, xForValue, travel, thumbX, reducedMotion]);

  const emitFromX = useCallback(
    (x: number) => onChangeRef.current(snapValue(xToValue(x))),
    [snapValue, xToValue],
  );

  const trackVelocity = useCallback((x: number, t: number) => {
    const samples = samplesRef.current;
    samples.push({ x, t });
    while (samples.length > 1 && t - samples[0].t > VELOCITY_WINDOW_MS)
      samples.shift();
    const [first] = samples;
    const dt = t - first.t;
    velocityRef.current = dt > 0 ? (x - first.x) / dt : 0;
  }, []);

  /** 1:1 tracking, with resistance past either end instead of a hard stop. */
  const applyPointer = useCallback(
    (pointerX: number, width: number) => {
      const usable = Math.max(width - SLIDER_THUMB_PX, 0);
      const raw = pointerX - grabOffsetRef.current;
      const left =
        raw < 0
          ? raw * RUBBER_BAND
          : raw > usable
            ? usable + (raw - usable) * RUBBER_BAND
            : raw;
      const bounded = clamp(
        left,
        -SLIDER_OVERSHOOT_PX,
        usable + SLIDER_OVERSHOOT_PX,
      );
      thumbX.jump(bounded);
      emitFromX(left);
    },
    [emitFromX, thumbX],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0))
      return;
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const thumbLeft = thumbX.get();
    // Grabbing the thumb keeps that point under the finger; tapping elsewhere centres it.
    const grabbedThumb =
      Math.abs(pointerX - (thumbLeft + SLIDER_THUMB_PX / 2)) <= SLIDER_THUMB_PX;
    grabOffsetRef.current = grabbedThumb
      ? pointerX - thumbLeft
      : SLIDER_THUMB_PX / 2;

    thumbX.stop();
    samplesRef.current = [{ x: pointerX, t: event.timeStamp }];
    velocityRef.current = 0;
    scrubbingRef.current = true;
    draggingRef.current = true;
    setDragging(true);
    setActive(true);
    onScrubStartRef.current?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    applyPointer(pointerX, rect.width);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    trackVelocity(pointerX, event.timeStamp);
    applyPointer(pointerX, rect.width);
  };

  const endScrub = useCallback(() => {
    if (draggingRef.current) return;
    scrubbingRef.current = false;
    setDragging(false);
    setActive(false);
    onScrubEndRef.current?.();
  }, []);

  const releaseDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    flick: boolean,
  ) => {
    if (!dragging) return;
    draggingRef.current = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const start = thumbX.get();
    const pxPerSecond = (flick ? velocityRef.current : 0) * 1000;
    // Projection (§10): v/1000 · d/(1-d) — the resting offset of a decaying flick.
    const projected =
      start +
      (pxPerSecond / 1000) * (DECELERATION_RATE / (1 - DECELERATION_RATE));
    const target = xForValue(snapValue(xToValue(projected)));

    if (reducedMotion || Math.abs(target - start) < 0.5) {
      thumbX.jump(target);
      endScrub();
      return;
    }

    const controls = animate(thumbX, target, {
      ...(flick ? SPRING_MOMENTUM : SPRING_UI),
      onUpdate: (latest) => emitFromX(latest),
    });
    void controls.then(endScrub);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const flick =
      momentum && Math.abs(velocityRef.current) > FLICK_VELOCITY_PX_PER_MS;
    releaseDrag(event, flick);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const increment = step > 0 ? step : 1;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = value + increment;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = value - increment;
        break;
      case "PageUp":
        next = value + increment * 10;
        break;
      case "PageDown":
        next = value - increment * 10;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next !== null) onChangeRef.current(snapValue(next));
  };

  const fillWidth = useTransform(thumbX, (x) => x + SLIDER_THUMB_PX / 2);
  const thumbScale = active ? 1.125 : hovered ? 1.06 : 1;

  return (
    <div
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={ariaValueText}
      aria-disabled={disabled}
      aria-orientation="horizontal"
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={(event) => {
        if (dragging) releaseDrag(event, false);
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className={`relative flex w-full touch-none items-center select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${disabled ? "pointer-events-none opacity-40" : "cursor-grab active:cursor-grabbing"} h-[var(--slider-hit-h)] ${className ?? ""}`}
    >
      <div ref={railRef} data-slider-rail="" className="relative w-full">
        <div className="h-[var(--slider-track-h)] w-full rounded-[var(--radius-pill)] bg-[var(--color-fill-track)]" />
        <motion.div
          aria-hidden="true"
          style={{ width: fillWidth }}
          className="pointer-events-none absolute top-1/2 left-0 h-[var(--slider-track-h)] -translate-y-1/2 rounded-[var(--radius-pill)] bg-[var(--color-accent)]"
        />
        <motion.div
          data-slider-thumb=""
          aria-hidden="true"
          style={{ x: thumbX, y: "-50%" }}
          animate={{ scale: thumbScale }}
          transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
          className={`pointer-events-none absolute top-1/2 left-0 h-[var(--slider-thumb-w)] w-[var(--slider-thumb-w)] rounded-full bg-[var(--color-on-accent)] shadow-[var(--shadow-1)] ${hovered || active ? "ring-2 ring-[var(--color-accent)]" : ""}`}
        />
      </div>
    </div>
  );
}
