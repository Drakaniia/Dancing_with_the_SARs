import type { ChangeType, Dataset } from "@/shared/types/dataset";
import type { LayerConfig } from "@/shared/types/layer";
import type { SelectionPayload } from "@/shared/types/selection";
import { SARANGANI_DAVOCC_BOUNDS } from "@/shared/utils/geo";

/**
 * Chrome labels and default seed values before `/data/manifest.json` finishes hydrating (and for
 * unit tests that run in isolation without a network server).
 */

export const DASHBOARD = {
  title: "NISAR Surface Change Monitor",
  subtitle: "Sarangani & Davao Occidental · Mindanao",
} as const;

export const DATA_STATUS = {
  label: "NISAR Release 7ea38ff · 318 Layer-Dates",
  state: "loaded",
} as const;

export const SEARCH_PLACEHOLDER =
  "Search Mindanao & Philippines (Alabel, Glan, Malita, M7.8 Epicentre...)";

export interface ChangeTypeFixture {
  changeType: ChangeType;
  label: string;
  unit: string;
  enabled: boolean;
}

export const CHANGE_TYPES: readonly ChangeTypeFixture[] = [
  {
    changeType: "elevation",
    label: "Elevation Change",
    unit: "m",
    enabled: false,
  },
  {
    changeType: "subsidence",
    label: "Land Subsidence",
    unit: "dB",
    enabled: true,
  },
  {
    changeType: "vegetation",
    label: "Vegetation Change",
    unit: "EVI",
    enabled: false,
  },
  {
    changeType: "water",
    label: "Water Extent",
    unit: "NDWI",
    enabled: false,
  },
];

export const TIME_SERIES = {
  range: ["2024-12", "2027-10"] as [string, string],
  currentDate: "2026-10 (vs 2026-09)",
  ticks: [
    "2025-Q1",
    "2025-06",
    "2025-12",
    "2026-06-28",
    "2026-09",
    "2026-10",
    "2026-10 (vs 2026-09)",
    "2027-01",
    "2027-04",
  ],
} as const;

export const OPACITY = 0.78;

export const SAMPLE_LAYERS: readonly LayerConfig[] = [
  {
    id: "radar-change-hh-monthly",
    name: "HH Backscatter Change (monthly)",
    kind: "manifest-layer",
    family: "radar",
    changeType: "radar",
    visible: true,
    opacity: OPACITY,
    order: 0,
    showInLayerList: true,
    units: "dB",
    valueType: "continuous",
    periods: ["2026-10 (vs 2026-09)"],
    domain: [-3, 3],
    ramp: {
      kind: "diverging",
      stops: [
        [-3, "#8c510a"],
        [-1.5, "#d8b365"],
        [0, "#f5f5f5"],
        [1.5, "#5ab4ac"],
        [3, "#01665e"],
      ],
    },
    caveats: [
      "Backscatter change, not ground deformation",
      "Does not show the 8 June 2026 quake: first pass is 28 June 2026",
    ],
    coverage: 0.98,
    minZoom: 5,
    maxZoom: 13,
  },
  {
    id: "radar-change-hv-monthly",
    name: "HV Backscatter Change (monthly)",
    kind: "manifest-layer",
    family: "radar",
    changeType: "radar",
    visible: false,
    opacity: OPACITY,
    order: 1,
    showInLayerList: true,
    units: "dB",
    valueType: "continuous",
    periods: ["2026-10 (vs 2026-09)"],
    domain: [-3, 3],
    ramp: {
      kind: "diverging",
      stops: [
        [-3, "#8c510a"],
        [-1.5, "#d8b365"],
        [0, "#f5f5f5"],
        [1.5, "#5ab4ac"],
        [3, "#01665e"],
      ],
    },
    caveats: ["Backscatter change, not ground deformation"],
    coverage: 0.98,
    minZoom: 5,
    maxZoom: 13,
  },
  {
    id: "earthquake-landslide-candidates",
    name: "Post-Quake Landslide Candidates",
    kind: "manifest-layer",
    family: "earthquake",
    changeType: "earthquake",
    visible: false,
    opacity: 0.85,
    order: 2,
    showInLayerList: true,
    units: "class",
    valueType: "categorical",
    periods: ["2026-06..09"],
    domain: [1, 5],
    classes: [
      { code: 1, label: "Checked, no slide", color: "#d6cfbd" },
      { code: 2, label: "Possible landslide", color: "#b2182b" },
      { code: 4, label: "Not checked (cloudy)", color: "#74add1" },
      { code: 5, label: "Checked, no elevation data", color: "#dfc27d" },
    ],
    caveats: [
      "~30% of the post-quake optical window was cloud-obscured (class 4)",
    ],
    coverage: 1,
    minZoom: 5,
    maxZoom: 13,
  },
  {
    id: "vegetation-evi-monthly",
    name: "NISAR Vegetation Greenness (EVI) (monthly)",
    kind: "manifest-layer",
    family: "vegetation",
    changeType: "vegetation",
    visible: false,
    opacity: OPACITY,
    order: 3,
    showInLayerList: false,
    units: "index",
    valueType: "continuous",
    periods: ["2026-09", "2026-10"],
    domain: [0, 0.8],
    ramp: {
      kind: "sequential",
      stops: [
        [0, "#8c510a"],
        [0.24, "#dfc27d"],
        [0.44, "#c7e9b4"],
        [0.64, "#41ab5d"],
        [0.8, "#005a32"],
      ],
    },
    caveats: [
      "ML estimate from NISAR radar backscatter; explains ~1/3 of optical variance",
    ],
    coverage: 1,
    minZoom: 5,
    maxZoom: 13,
  },
  {
    id: "landcover-classes",
    name: "Land Cover Classes (2020 & 2026)",
    kind: "manifest-layer",
    family: "landcover",
    changeType: "landcover",
    visible: false,
    opacity: OPACITY,
    order: 4,
    showInLayerList: false,
    units: "class",
    valueType: "categorical",
    periods: ["2020", "2026"],
    domain: [1, 8],
    classes: [
      { code: 1, label: "Closed forest", color: "#005a32" },
      { code: 2, label: "Open forest & mangrove", color: "#238b45" },
      { code: 3, label: "Brush / shrubs", color: "#74c476" },
      { code: 4, label: "Grassland", color: "#c7e9b4" },
      { code: 5, label: "Annual crop", color: "#dfc27d" },
      { code: 6, label: "Perennial crop", color: "#a6611a" },
      { code: 7, label: "Built-up & barren", color: "#b2182b" },
      { code: 8, label: "Water & fishpond", color: "#2c7fb8" },
    ],
    caveats: ["2026 NISAR-derived 8-class land cover classification"],
    coverage: 1,
    minZoom: 5,
    maxZoom: 13,
  },
  {
    id: "satellite-base",
    name: "Satellite (Esri World Imagery)",
    kind: "basemap",
    visible: true,
    opacity: 1,
    order: 100,
    showInLayerList: true,
  },
  {
    id: "aoi-boundary",
    name: "Sarangani & Davao Occidental Boundary",
    kind: "vector",
    visible: true,
    opacity: 1,
    order: 101,
    showInLayerList: true,
  },
  {
    id: "landslide-polygons",
    name: "M7.8 Landslide Candidate Polygons (305)",
    kind: "vector",
    visible: true,
    opacity: 0.9,
    order: 102,
    showInLayerList: true,
  },
  {
    id: "cities-labels",
    name: "Municipalities & Reference Labels",
    kind: "labels",
    visible: true,
    opacity: 1,
    order: 103,
    showInLayerList: true,
  },
];

export const LEGEND = {
  ticks: [-3, -1.5, 0, 1.5, 3],
  notes: [
    "Brown (-dB) = drying or surface smoothing",
    "Teal (+dB) = wetting or canopy roughening",
  ],
} as const;

export const LOCATION_INFO = {
  lng: 125.5013,
  lat: 5.776,
  place: "Malalan, Jose Abad Santos, Davao Occidental",
  rate: 1.05,
  confidence: "High" as const,
  dataSource: "NISAR L2 GCOV · HLS L30 · SRTM 30 m (EPSG:32651)",
} as const;

export const SAMPLE_SELECTION: SelectionPayload = {
  lng: LOCATION_INFO.lng,
  lat: LOCATION_INFO.lat,
  placeName: LOCATION_INFO.place,
  rate: LOCATION_INFO.rate,
  confidence: LOCATION_INFO.confidence,
  samplingMode: "manifest-estimate",
  samples: [
    {
      layerId: "radar-change-hh-monthly",
      family: "radar",
      name: "HH Backscatter Change (monthly)",
      period: "2026-10 (vs 2026-09)",
      value: 1.05,
      raw: 105,
      units: "dB",
      caveats: ["Backscatter change, not ground deformation"],
    },
    {
      layerId: "earthquake-evi-change-2026",
      family: "earthquake",
      name: "Quake EVI Change (Post minus Pre)",
      period: "2026-06-09 (post minus pre)",
      value: -0.54,
      raw: -5400,
      units: "index",
      caveats: ["Rank #1 landslide cluster (16.82 ha, 35.5° slope)"],
    },
    {
      layerId: "terrain-elevation",
      family: "terrain",
      name: "SRTM Elevation",
      period: "static",
      value: 317,
      raw: 3170,
      units: "m",
      caveats: ["SRTM 30 m digital elevation model"],
    },
  ],
};

export interface QuickStat {
  id: string;
  label: string;
  value: string;
  badge?: string;
}

export const QUICK_STATS: readonly QuickStat[] = [
  {
    id: "area",
    label: "AOI Coverage (2 Provinces)",
    value: "5,268.4 km²",
    badge: "30 m UTM 51N",
  },
  {
    id: "landslides",
    label: "M7.8 Landslide Candidates",
    value: "305 polygons",
    badge: "152 ranked sites",
  },
  {
    id: "catalogue",
    label: "Committed Release Catalogue",
    value: "318 layer-dates",
    badge: "186 GeoTIFFs",
  },
];

export const SAMPLE_DATASET: Dataset = {
  id: "nisar-sarangani-davocc",
  name: "Sarangani & Davao Occidental NISAR Release",
  changeType: "radar",
  dates: [...TIME_SERIES.ticks],
  bounds: SARANGANI_DAVOCC_BOUNDS,
  crs: "EPSG:32651",
  units: "dB",
  source: "NISAR L2 GCOV · HLS · MODIS · SRTM (7ea38ff)",
};

export const SAMPLE_DATASETS: readonly Dataset[] = [SAMPLE_DATASET];

export const MAP_LABELS = [
  "Celebes Sea",
  "Davao Gulf",
  "Sarangani Bay",
  "Alabel",
  "Glan",
  "Malapatan",
  "Maasim",
  "Kiamba",
  "Maitum",
  "Malungon",
  "Malita",
  "Santa Maria",
  "Don Marcelino",
  "Jose Abad Santos",
  "Sarangani Island",
] as const;

export const SCALE_BAR = ["0", "10", "20", "30", "40 km"] as const;

export type ToolId = "measure" | "draw" | "bookmark" | "export";

export const TOOLS: readonly { id: ToolId; label: string }[] = [
  { id: "measure", label: "Measure" },
  { id: "draw", label: "Inspect" },
  { id: "bookmark", label: "Bookmark" },
  { id: "export", label: "Export" },
];
