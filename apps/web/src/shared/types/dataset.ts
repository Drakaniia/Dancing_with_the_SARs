export type LayerFamily =
  | "radar"
  | "vegetation"
  | "landcover"
  | "earthquake"
  | "climate"
  | "outlook"
  | "terrain";

export type ChangeType =
  | "elevation"
  | "subsidence"
  | "vegetation"
  | "water"
  | LayerFamily;

export interface FamilyMeta {
  family: LayerFamily;
  label: string;
  shortLabel: string;
  description: string;
  cadence: string;
}

export const LAYER_FAMILIES: readonly FamilyMeta[] = [
  {
    family: "radar",
    label: "Radar Backscatter & Change",
    shortLabel: "Radar",
    description:
      "NISAR L-band HH/HV monthly, daily pass swaths, and same-track change pairs",
    cadence: "Monthly & 8 pass dates (Jun-Oct 2026)",
  },
  {
    family: "vegetation",
    label: "Vegetation & Plant Water",
    shortLabel: "Vegetation",
    description:
      "NISAR ML-estimated EVI greenness and NDMI canopy moisture at 30 m",
    cadence: "Monthly & 8 pass dates",
  },
  {
    family: "landcover",
    label: "Land Cover & Change",
    shortLabel: "Land Cover",
    description:
      "8-class land cover (2020 & 2026), transition map, and classifier confidence",
    cadence: "2020 vs 2026",
  },
  {
    family: "earthquake",
    label: "8 June 2026 Earthquake",
    shortLabel: "Earthquake",
    description:
      "M7.8 pre/post optical EVI & NBR composites, excess loss, and 305 landslide candidates",
    cadence: "Pre/Post 8 Jun 2026",
  },
  {
    family: "climate",
    label: "El Nino Time Series",
    shortLabel: "Climate",
    description:
      "Landsat HLS quarterly indices (30 m) and MODIS monthly NDVI & land temperature",
    cadence: "Dec 2024-Oct 2026",
  },
  {
    family: "outlook",
    label: "12-Month El Nino Scenario",
    shortLabel: "Outlook",
    description:
      "Projected greenness, temperature anomaly, drought probability, and ONI sensitivity",
    cadence: "Nov 2026-Oct 2027 (Scenario)",
  },
  {
    family: "terrain",
    label: "SRTM Terrain",
    shortLabel: "Terrain",
    description:
      "30 m digital elevation model, slope gradient, and compass aspect",
    cadence: "Static baseline",
  },
] as const;

export interface Dataset {
  id: string;
  name: string;
  changeType: ChangeType;
  dates: string[];
  bounds: [number, number, number, number];
  crs: string;
  units: string;
  source: string;
}

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}
