/**
 * The "Explore" panel: four topics, each with a few simple views (one map at a time).
 * Layout and wording follow the team's design draft. Tile views point at manifest layer ids;
 * image views use pre-rendered overlays shipped in `public/data/extra/` (same colour ramps).
 */

export type TopicId = "radar" | "quake" | "elnino" | "next";

/** One frame of an image overlay (e.g. one month of the outlook). */
export interface ImageFrame {
  label: string;
  file: string;
}

export interface CustomLegend {
  /** Continuous ramp drawn as a gradient bar. */
  colors?: string[];
  min?: string;
  mid?: string;
  max?: string;
  /** Categorical keys drawn as swatches. */
  keys?: { color: string; label: string }[];
}

export type ViewOption =
  | { kind: "tiles"; label: string; layerId: string }
  | {
      kind: "images";
      label: string;
      frames: ImageFrame[];
      /** Use this manifest layer's ramp and units for the colour scale. */
      legendLayerId?: string;
      legend?: CustomLegend;
    };

export interface TopicView {
  id: string;
  chip: string;
  satellite: string;
  notes: string[];
  options: ViewOption[];
  /** Plain words under the colour scale: low end, high end. */
  lo?: string;
  hi?: string;
  /** Show the 305 possible landslides, coloured by the NISAR check. */
  landslideDots?: boolean;
  /** Draw the 2026 land-cover map faintly under this view (so "no change" is not blank). */
  landCoverUnderlay?: boolean;
}

export interface Topic {
  id: TopicId;
  title: string;
  satellites: string;
  views: TopicView[];
}

const OUTLOOK_MONTHS = [
  "2026-11",
  "2026-12",
  "2027-01",
  "2027-02",
  "2027-03",
  "2027-04",
  "2027-05",
  "2027-06",
  "2027-07",
  "2027-08",
  "2027-09",
  "2027-10",
];

const outlookFrames = (layerId: string): ImageFrame[] =>
  OUTLOOK_MONTHS.map((month) => ({
    label: month,
    file: `${layerId}_${month}.webp`,
  }));

/** Sentinel-1 coherence-loss ramp (percentage points), from the data release figures. */
const S1_RAMP = [
  "#2166ac",
  "#67a9cf",
  "#d1e5f0",
  "#f7f7f7",
  "#fddbc7",
  "#ef8a62",
  "#b2182b",
];

export const TOPICS: readonly Topic[] = [
  {
    id: "radar",
    title: "Space radar",
    satellites: "NISAR (NASA–ISRO)",
    views: [
      {
        id: "trees",
        chip: "🌳 Trees & plants",
        satellite: "NISAR L-band radar (HV)",
        notes: [
          "Bright = lots of trees and leaves",
          "Dark = water, bare ground or hill shadow",
          "Works through clouds, day and night",
        ],
        options: [
          {
            kind: "tiles",
            label: "Monthly",
            layerId: "radar-backscatter-hv-monthly",
          },
        ],
        lo: "bare or water",
        hi: "thick trees",
      },
      {
        id: "wet",
        chip: "💧 Wet ground",
        satellite: "NISAR L-band radar (HH)",
        notes: [
          "Brighter = wetter or bumpier ground",
          "October got brighter: the rain came back",
        ],
        options: [
          {
            kind: "tiles",
            label: "Monthly",
            layerId: "radar-backscatter-hh-monthly",
          },
        ],
        lo: "dry, smooth",
        hi: "wet or bumpy",
      },
      {
        id: "ai",
        chip: "🤖 AI plant map",
        satellite: "NISAR, taught by Landsat",
        notes: [
          "AI turned radar into a plant map",
          "See plants even under clouds",
          "Good for the big picture, not every field",
        ],
        options: [
          {
            kind: "tiles",
            label: "Monthly",
            layerId: "vegetation-evi-monthly",
          },
        ],
        lo: "few plants",
        hi: "lots of plants",
      },
      {
        id: "changed",
        chip: "🔄 What changed",
        satellite: "NISAR L-band radar",
        notes: [
          "September → October",
          "Teal = got wetter / more leaves",
          "Brown = got drier / fewer leaves",
        ],
        options: [
          {
            kind: "tiles",
            label: "Wet ground (HH)",
            layerId: "radar-change-hh-monthly",
          },
          {
            kind: "tiles",
            label: "Plants (HV)",
            layerId: "radar-change-hv-monthly",
          },
        ],
        lo: "drier",
        hi: "wetter",
      },
      {
        id: "land",
        chip: "🗺 Land types",
        satellite: "NISAR, taught by the 2020 land map",
        notes: [
          "Forest, farms, towns and water",
          "2026 map made from radar alone",
          '"Change" = places to check, not proof',
        ],
        options: [
          {
            kind: "tiles",
            label: "Land types",
            layerId: "landcover-classes",
          },
          {
            kind: "tiles",
            label: "Change since 2020",
            layerId: "landcover-change-2020-2026",
          },
        ],
        landCoverUnderlay: true,
      },
    ],
  },
  {
    id: "quake",
    title: "Earthquake",
    satellites: "Landsat · Sentinel-2 · NISAR · Sentinel-1",
    views: [
      {
        id: "landslides",
        chip: "⛰ Landslides + NISAR",
        satellite: "Landsat 8/9 + Sentinel-2 (HLS) · checked by NISAR",
        notes: [
          "8 June 2026, M7.8 quake · ★ = epicentre",
          "Landsat saw 305 possible landslides",
          "📡 NISAR checked them through the clouds",
          "NISAR sees bare ground at 194 (64%)",
          "Other steep hills: only 25% look this bare",
        ],
        options: [
          {
            kind: "tiles",
            label: "Plants lost",
            layerId: "earthquake-evi-anomaly-2026",
          },
          {
            kind: "tiles",
            label: "Before → after",
            layerId: "earthquake-evi-change-2026",
          },
          {
            kind: "tiles",
            label: "Before the quake",
            layerId: "earthquake-evi-pre",
          },
        ],
        lo: "lost plants",
        hi: "gained plants",
        landslideDots: true,
      },
      {
        id: "steep",
        chip: "📐 Steep hills",
        satellite: "SRTM (Space Shuttle radar)",
        notes: [
          "Landslides happen most on steep hills",
          "Most possible slides: slopes over 25°",
        ],
        options: [
          {
            kind: "images",
            label: "Slope",
            frames: [{ label: "static", file: "terrain_slope.webp" }],
            legendLayerId: "terrain-slope",
          },
        ],
        lo: "flat",
        hi: "very steep",
        landslideDots: true,
      },
      {
        id: "s1",
        chip: "📡 Radar check",
        satellite: "Sentinel-1 (Europe, Copernicus) · by Alfie Pelicano",
        notes: [
          "Radar looked just before and after the quake",
          "Red = signal stopped matching",
          "Near Glan, seen from both sides",
          "A clue, not proof (rain or harvests can do this too)",
        ],
        options: [
          {
            kind: "images",
            label: "Looking west (3 → 10 Jun)",
            frames: [{ label: "3 → 10 Jun", file: "s1_cohloss_t163.webp" }],
            legend: { colors: S1_RAMP, min: "−40", mid: "0", max: "+40 pp" },
          },
          {
            kind: "images",
            label: "Looking east (4 → 16 Jun)",
            frames: [{ label: "4 → 16 Jun", file: "s1_cohloss_t069.webp" }],
            legend: { colors: S1_RAMP, min: "−40", mid: "0", max: "+40 pp" },
          },
        ],
        lo: "signal steadier",
        hi: "signal lost",
      },
    ],
  },
  {
    id: "elnino",
    title: "El Niño",
    satellites: "NISAR · GPM · MODIS · Landsat",
    views: [
      {
        id: "radar-wet",
        chip: "📡 Radar wetness",
        satellite: "NISAR L-band radar (HH) + GPM rain",
        notes: [
          "El Niño dry spell: September rain only 44% of normal",
          "October rain came back (79%)",
          "NISAR saw the soil wet up: 32% of land wetter, 10% drier",
          "Biggest on farms (48%) and grassland (40%)",
        ],
        options: [
          {
            kind: "tiles",
            label: "Sep → Oct change",
            layerId: "radar-change-hh-monthly",
          },
          {
            kind: "tiles",
            label: "Each month",
            layerId: "radar-backscatter-hh-monthly",
          },
        ],
        lo: "drier",
        hi: "wetter",
      },
      {
        id: "green",
        chip: "🌿 Green plants",
        satellite: "Terra (MODIS)",
        notes: [
          "Darker green = more healthy plants",
          "Press ▶ and watch the dry months",
        ],
        options: [
          {
            kind: "tiles",
            label: "Monthly",
            layerId: "climate-modis-ndvi-monthly",
          },
          {
            kind: "tiles",
            label: "vs last year",
            layerId: "climate-modis-ndvi-anomaly",
          },
        ],
        lo: "few plants",
        hi: "lots of plants",
      },
      {
        id: "heat",
        chip: "🔥 Hot ground",
        satellite: "Terra (MODIS)",
        notes: ["Daytime ground temperature", "Red = hotter"],
        options: [
          {
            kind: "tiles",
            label: "Monthly",
            layerId: "climate-modis-lst-monthly",
          },
          {
            kind: "tiles",
            label: "vs last year",
            layerId: "climate-modis-lst-anomaly",
          },
        ],
        lo: "cooler",
        hi: "hotter",
      },
      {
        id: "plant-water",
        chip: "🍃 Plant water",
        satellite: "Landsat 8/9 + Sentinel-2 (HLS)",
        notes: [
          "Water inside the leaves",
          "Brown = thirsty plants",
          "Each step = 3 months",
        ],
        options: [
          {
            kind: "tiles",
            label: "Quarterly",
            layerId: "climate-hls-ndmi-quarterly",
          },
        ],
        lo: "thirsty",
        hi: "full of water",
      },
      {
        id: "water",
        chip: "🌊 Water on land",
        satellite: "Landsat 8/9 + Sentinel-2 (HLS)",
        notes: ["Dark blue = water", "Sea, rivers, ponds, fishponds"],
        options: [
          {
            kind: "tiles",
            label: "Quarterly",
            layerId: "climate-hls-ndwi-quarterly",
          },
        ],
        lo: "dry land",
        hi: "water",
      },
    ],
  },
  {
    id: "next",
    title: "The Next 12 Months",
    satellites: "NISAR · MODIS 2000–2026 · NOAA ONI",
    views: [
      {
        id: "watch",
        chip: "📡 Watch first",
        satellite: "NISAR radar (Oct 2026) + El Niño outlook",
        notes: [
          "El Niño hits plants hardest and NISAR already sees thin plant cover",
          "= 15% of the land (~770 km²)",
          "NISAR passes every 12 days → update every month",
          "A priority guide, not a forecast",
        ],
        options: [
          {
            kind: "images",
            label: "Watch list",
            frames: [
              { label: "Nov 2026 – Apr 2027", file: "nisar_watchlist.webp" },
            ],
            legend: {
              keys: [
                {
                  color: "#c8281e",
                  label: "Watch first (El Niño hits hard + NISAR: thin plants)",
                },
                {
                  color: "#f0a03c",
                  label: "El Niño hits hard, plants still thick",
                },
              ],
            },
          },
        ],
      },
      {
        id: "plants",
        chip: "🍂 Plants",
        satellite: "Terra (MODIS), 2000–2026",
        notes: [
          "If El Niño stays strong",
          "Brown = less green than normal",
          "A scenario, not a forecast",
        ],
        options: [
          {
            kind: "images",
            label: "Monthly",
            frames: outlookFrames("outlook-evi-anomaly"),
            legendLayerId: "outlook-evi-anomaly",
          },
        ],
        lo: "browner",
        hi: "greener",
      },
      {
        id: "chance",
        chip: "🎲 Chance of brown",
        satellite: "Terra (MODIS), 2000–2026",
        notes: ["How likely each place is to be browner than normal"],
        options: [
          {
            kind: "images",
            label: "Monthly",
            frames: outlookFrames("outlook-evi-chance-below-normal"),
            legendLayerId: "outlook-evi-chance-below-normal",
          },
        ],
        lo: "unlikely",
        hi: "very likely",
      },
      {
        id: "hot",
        chip: "🌡 Hot ground",
        satellite: "Terra (MODIS), 2000–2026",
        notes: ["Red = hotter than normal"],
        options: [
          { kind: "tiles", label: "Monthly", layerId: "outlook-lst-anomaly" },
        ],
        lo: "cooler",
        hi: "hotter",
      },
      {
        id: "dries",
        chip: "⚠ Dries first",
        satellite: "Terra (MODIS), 2000–2026",
        notes: [
          "Places that lost the most green in past El Niños",
          "Farms and young trees there may need help first",
        ],
        options: [
          {
            kind: "images",
            label: "Nov – Apr",
            frames: [
              {
                label: "Nov – Apr",
                file: "outlook-evi-elnino-sensitivity_NovApr.webp",
              },
            ],
            legendLayerId: "outlook-evi-elnino-sensitivity",
          },
        ],
        lo: "dries most",
        hi: "hardly changes",
      },
    ],
  },
];

/** Corners of every image in public/data/extra (lon/lat, clockwise from top-left). */
export const EXTRA_IMAGE_CORNERS: [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
] = [
  [124.330014, 6.659814],
  [125.742212, 6.659814],
  [125.742212, 5.33865],
  [124.330014, 5.33865],
];

export const EPICENTRE: [number, number] = [125.056, 5.599];

export function findTopic(id: TopicId): Topic {
  return TOPICS.find((t) => t.id === id) ?? TOPICS[0];
}

export function findView(topic: Topic, viewId: string): TopicView {
  return topic.views.find((v) => v.id === viewId) ?? topic.views[0];
}
