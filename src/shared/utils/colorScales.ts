import type { ChangeType } from "@/shared/types/dataset";
import type { ColorScale } from "@/shared/types/layer";

/**
 * Data colormaps. These are data semantics, not chrome: the only place raw color values are
 * allowed, and they do not invert with the theme.
 *
 * Subsidence runs blue → white → red over the legend's -10…10 cm/year range (negative = uplift,
 * positive = subsidence), matching the reference legend.
 */
export const COLOR_SCALES: Record<ChangeType, ColorScale> = {
  elevation: {
    changeType: "elevation",
    stops: [
      { value: -2, color: "#2166ac" },
      { value: 0, color: "#f7f7f7" },
      { value: 2, color: "#b2182b" },
    ],
  },
  subsidence: {
    changeType: "subsidence",
    stops: [
      { value: -10, color: "#2166ac" },
      { value: 0, color: "#f7f7f7" },
      { value: 10, color: "#b2182b" },
    ],
  },
  vegetation: {
    changeType: "vegetation",
    stops: [
      { value: 0, color: "#8c510a" },
      { value: 0.5, color: "#f6e8c3" },
      { value: 1, color: "#1a9850" },
    ],
  },
  water: {
    changeType: "water",
    stops: [
      { value: 0, color: "transparent" },
      { value: 1, color: "#2c7fb8" },
    ],
  },
};

/** CSS gradient built from a scale's stops, in stop order. */
export function gradientFor(changeType: ChangeType, angle = "135deg"): string {
  const colors = COLOR_SCALES[changeType].stops.map((stop) => stop.color);
  return `linear-gradient(${angle}, ${colors.join(", ")})`;
}
