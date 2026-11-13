import type { LayerFamily } from "./dataset";

/** Confidence bands reported with a NISAR surface-change reading. */
export type Confidence = "Low" | "Med" | "High";

export interface LayerSampleReading {
  layerId: string;
  family: LayerFamily | string;
  name: string;
  period: string;
  value: number | null;
  raw: number | null;
  className?: string | null;
  classColor?: string | null;
  units: string;
  caveats: string[];
}

/** What a map click hands to the Location Info / Inspector panel. */
export interface SelectionPayload {
  lng: number;
  lat: number;
  placeName?: string;
  rate?: number;
  confidence?: Confidence;
  samples?: LayerSampleReading[];
  samplingLoading?: boolean;
  samplingMode?: "desktop-tiff" | "manifest-estimate";
}
