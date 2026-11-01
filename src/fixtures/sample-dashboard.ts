import type { ChangeType, Dataset } from "@/shared/types/dataset";
import type { LayerConfig } from "@/shared/types/layer";
import type { SelectionPayload } from "@/shared/types/selection";
import { PHILIPPINES_BOUNDS } from "@/shared/utils/geo";

/**
 * Exact reference values for the dashboard. Seeded into the feature stores in demo mode so the
 * app reads like the reference at rest and screenshots can be diffed against it.
 *
 * Nothing here is computed: every string is quoted from the reference so a value drifting out of
 * sync is a visible diff rather than a silent recalculation.
 */

export const DASHBOARD = {
  title: "NISAR Surface Change Monitor",
  subtitle: "Philippines",
} as const;

export const DATA_STATUS = {
  label: "NISAR Data Loaded",
  state: "loaded",
} as const;

export const SEARCH_PLACEHOLDER =
  "Search Philippines (e.g., Manila, Cebu, Bicol...)";

export interface ChangeTypeFixture {
  changeType: ChangeType;
  /** Row label in the Surface Change Types panel. */
  label: string;
  /** Legend/readout unit for the type, e.g. `cm/year`. */
  unit: string;
  /** Reference toggle state: only Land Subsidence is on. */
  enabled: boolean;
}

export const CHANGE_TYPES: readonly ChangeTypeFixture[] = [
  {
    changeType: "elevation",
    label: "Elevation Change",
    unit: "cm",
    enabled: false,
  },
  {
    changeType: "subsidence",
    label: "Land Subsidence",
    unit: "cm/year",
    enabled: true,
  },
  {
    changeType: "vegetation",
    label: "Vegetation Change",
    unit: "%",
    enabled: false,
  },
  { changeType: "water", label: "Water Extent", unit: "km²", enabled: false },
];

export const TIME_SERIES = {
  range: ["Jan 2023", "Dec 2024"] as [string, string],
  currentDate: "Jun 2024",
  ticks: [
    "Jan 2023",
    "Apr 2023",
    "Jul 2023",
    "Oct 2023",
    "Jan 2024",
    "Apr 2024",
    "Jun 2024",
    "Oct 2024",
    "Dec 2024",
  ],
} as const;

/** Reference opacity, stored as a fraction; the UI renders it as `70%`. */
export const OPACITY = 0.7;

/**
 * Layer seed for the store. The four `change-type` entries drive the Surface Change Types
 * switches; only `subsidence` also appears in Map Layers, matching the reference (the other three
 * are unloaded change types, not map rows).
 */
export const SAMPLE_LAYERS: readonly LayerConfig[] = [
  {
    id: "elevation",
    name: "NISAR Surface Change (Elevation)",
    kind: "change-type",
    changeType: "elevation",
    visible: false,
    opacity: OPACITY,
    order: 0,
  },
  {
    id: "subsidence",
    name: "NISAR Surface Change (Subsidence)",
    kind: "change-type",
    changeType: "subsidence",
    visible: true,
    opacity: OPACITY,
    order: 1,
    showInLayerList: true,
  },
  {
    id: "vegetation",
    name: "NISAR Surface Change (Vegetation)",
    kind: "change-type",
    changeType: "vegetation",
    visible: false,
    opacity: OPACITY,
    order: 2,
  },
  {
    id: "water",
    name: "NISAR Surface Change (Water)",
    kind: "change-type",
    changeType: "water",
    visible: false,
    opacity: OPACITY,
    order: 3,
  },
  {
    id: "satellite-base",
    name: "Satellite (Base Map)",
    kind: "basemap",
    visible: true,
    opacity: 1,
    order: 4,
    showInLayerList: true,
  },
  {
    id: "admin-boundaries",
    name: "Administrative Boundaries",
    kind: "vector",
    visible: false,
    opacity: 1,
    order: 5,
    showInLayerList: true,
  },
  {
    id: "cities-labels",
    name: "Cities / Labels",
    kind: "labels",
    visible: true,
    opacity: 1,
    order: 6,
    showInLayerList: true,
  },
];

export const LEGEND = {
  ticks: [-10, -5, 0, 5, 10],
  notes: ["Negative values = uplift", "Positive values = subsidence"],
} as const;

export const LOCATION_INFO = {
  lng: 120.9842,
  lat: 14.5995,
  place: "Manila, Metro Manila",
  /** Land Subsidence Rate, in cm/year. */
  rate: 3.2,
  confidence: "High",
  dataSource: "NISAR (pre-processed)",
} as const;

/**
 * Phase 3 stub selection. The reference shows Location Info already populated, so the store is
 * seeded with this; the map click that replaces it lands in the map phase.
 */
export const SAMPLE_SELECTION: SelectionPayload = {
  lng: LOCATION_INFO.lng,
  lat: LOCATION_INFO.lat,
  placeName: LOCATION_INFO.place,
  rate: LOCATION_INFO.rate,
  confidence: LOCATION_INFO.confidence,
};

export interface QuickStat {
  id: string;
  label: string;
  value: string;
  /** Inline badge, e.g. `(4.2%)`. */
  badge?: string;
}

export const QUICK_STATS: readonly QuickStat[] = [
  { id: "area", label: "Total Area (PH)", value: "300,000 km²" },
  {
    id: "change",
    label: "Areas with Significant Change",
    value: "12,486 km²",
    badge: "(4.2%)",
  },
  { id: "updated", label: "Last Update", value: "Jun 15, 2024" },
];

export const SAMPLE_DATASET: Dataset = {
  id: "nisar-subsidence",
  name: "NISAR Surface Change (Subsidence)",
  changeType: "subsidence",
  dates: [...TIME_SERIES.ticks],
  bounds: PHILIPPINES_BOUNDS,
  crs: "EPSG:4326",
  units: "cm/year",
  source: "NISAR (pre-processed)",
};

export const SAMPLE_DATASETS: readonly Dataset[] = [SAMPLE_DATASET];

/** Sea/place labels the map style renders (consumed in the map phase). */
export const MAP_LABELS = [
  "South China Sea",
  "Philippine Sea",
  "Sulu Sea",
  "Luzon",
  "Manila",
  "Mindoro",
  "Panay",
  "Cebu",
  "Negros",
  "Mindanao",
  "Davao",
] as const;

export const SCALE_BAR = ["0", "100", "200", "300", "400 km"] as const;

export type ToolId = "measure" | "draw" | "bookmark" | "export";

export const TOOLS: readonly { id: ToolId; label: string }[] = [
  { id: "measure", label: "Measure" },
  { id: "draw", label: "Draw" },
  { id: "bookmark", label: "Bookmark" },
  { id: "export", label: "Export" },
];
