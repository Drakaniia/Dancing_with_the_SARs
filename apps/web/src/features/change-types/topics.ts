import type { LayerFamily } from "@/shared/types/dataset";

export type TopicId = "radar" | "quake" | "elnino" | "next";

export interface TopicMeta {
  id: TopicId;
  /** Short title shown on the topic card. */
  title: string;
  /** One plain-language sentence: what this topic shows. */
  blurb: string;
  /** Satellites / sources behind the layers in this topic. */
  satellites: string;
  /** Layer families shown under this topic, in display order. */
  families: readonly LayerFamily[];
}

/**
 * The four topics the left rail is organised by (F1–F4 in the team's design draft).
 * Every one of the seven data families belongs to exactly one topic.
 */
export const TOPICS: readonly TopicMeta[] = [
  {
    id: "radar",
    title: "Space radar",
    blurb: "NISAR's radar sees the ground through clouds, day and night.",
    satellites: "NISAR (NASA–ISRO) L-band radar",
    families: ["radar", "vegetation", "landcover"],
  },
  {
    id: "quake",
    title: "Earthquake",
    blurb:
      "Where the 8 June M7.8 quake may have caused landslides, and which hills are steep.",
    satellites: "Landsat 8/9 + Sentinel-2 (HLS) · SRTM",
    families: ["earthquake", "terrain"],
  },
  {
    id: "elnino",
    title: "El Niño",
    blurb: "How plants and land heat changed through the dry months.",
    satellites: "Landsat 8/9 + Sentinel-2 (HLS) · MODIS",
    families: ["climate"],
  },
  {
    id: "next",
    title: "The Next 12 Months",
    blurb:
      "What could happen to plants and heat if El Niño stays strong (a scenario, not a forecast).",
    satellites: "MODIS 2000–2026 · NOAA ONI",
    families: ["outlook"],
  },
] as const;

/**
 * Secondary layers (single passes, single-track pairs, helper and baseline layers). They sit
 * under "More maps" in each group so the main list stays short; a secondary layer that is
 * switched on or selected is always shown.
 */
const EXTRA_LAYER_PATTERNS: readonly RegExp[] = [
  /\(by date\)/i,
  /same-track/i,
  /valid observations/i,
  /^baseline/i,
  /composite/i,
  /classifier confidence/i,
  /slope aspect/i,
  /sensitivity/i,
];

export function isExtraLayer(name: string): boolean {
  return EXTRA_LAYER_PATTERNS.some((pattern) => pattern.test(name));
}
