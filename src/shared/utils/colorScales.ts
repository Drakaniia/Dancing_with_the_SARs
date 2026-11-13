import type { ChangeType } from "@/shared/types/dataset";
import type { ColorScale } from "@/shared/types/layer";
import type { ClassEntry, Ramp } from "@/shared/types/manifest";

/**
 * Scientific data colormaps. These are data semantics, not UI chrome: they match the exact
 * ramps in `scripts/tiles/ramps.py` and do not invert with the light/dark theme.
 */
export const COLOR_SCALES: Record<string, ColorScale> = {
  elevation: {
    changeType: "elevation",
    stops: [
      { value: 0, color: "#1a6b3a" },
      { value: 440, color: "#8ec96f" },
      { value: 990, color: "#f6e8c3" },
      { value: 1650, color: "#b36b2c" },
      { value: 2200, color: "#fffdf8" },
    ],
  },
  subsidence: {
    changeType: "subsidence",
    stops: [
      { value: -3, color: "#8c510a" },
      { value: 0, color: "#f5f5f5" },
      { value: 3, color: "#01665e" },
    ],
  },
  vegetation: {
    changeType: "vegetation",
    stops: [
      { value: 0, color: "#8c510a" },
      { value: 0.3, color: "#dfc27d" },
      { value: 0.55, color: "#c7e9b4" },
      { value: 0.8, color: "#41ab5d" },
      { value: 1, color: "#005a32" },
    ],
  },
  water: {
    changeType: "water",
    stops: [
      { value: -0.6, color: "#a6611a" },
      { value: 0, color: "#f5f5f5" },
      { value: 0.4, color: "#08306b" },
    ],
  },
  radar: {
    changeType: "radar",
    stops: [
      { value: -3, color: "#8c510a" },
      { value: -1.5, color: "#d8b365" },
      { value: 0, color: "#f5f5f5" },
      { value: 1.5, color: "#5ab4ac" },
      { value: 3, color: "#01665e" },
    ],
  },
  landcover: {
    changeType: "landcover",
    stops: [
      { value: 1, color: "#005a32" },
      { value: 4, color: "#c7e9b4" },
      { value: 6, color: "#a6611a" },
      { value: 8, color: "#2c7fb8" },
    ],
  },
  earthquake: {
    changeType: "earthquake",
    stops: [
      { value: -0.3, color: "#8c510a" },
      { value: 0, color: "#f5f5f5" },
      { value: 0.3, color: "#01665e" },
    ],
  },
  climate: {
    changeType: "climate",
    stops: [
      { value: 18, color: "#2166ac" },
      { value: 26, color: "#f7f7f7" },
      { value: 35, color: "#b2182b" },
    ],
  },
  outlook: {
    changeType: "outlook",
    stops: [
      { value: 0, color: "#01665e" },
      { value: 0.5, color: "#f5f5f5" },
      { value: 1, color: "#8c510a" },
    ],
  },
  terrain: {
    changeType: "terrain",
    stops: [
      { value: 0, color: "#1a6b3a" },
      { value: 1000, color: "#f6e8c3" },
      { value: 2200, color: "#fffdf8" },
    ],
  },
};

/** CSS gradient built from a scale's stops, in stop order. */
export function gradientFor(changeType: ChangeType, angle = "90deg"): string {
  const scale = COLOR_SCALES[changeType] ?? COLOR_SCALES.radar;
  const colors = scale.stops.map((stop) => stop.color);
  return `linear-gradient(${angle}, ${colors.join(", ")})`;
}

/** CSS gradient directly from a manifest layer's `ramp` or `classes`. */
export function gradientFromRamp(
  ramp?: Ramp,
  classes?: ClassEntry[],
  angle = "90deg",
): string {
  if (classes && classes.length > 0) {
    const colors = classes.map((c) => c.color);
    return `linear-gradient(${angle}, ${colors.join(", ")})`;
  }
  if (ramp && ramp.stops.length > 0) {
    const colors = ramp.stops.map((s) => s[1]);
    return `linear-gradient(${angle}, ${colors.join(", ")})`;
  }
  return gradientFor("radar", angle);
}
