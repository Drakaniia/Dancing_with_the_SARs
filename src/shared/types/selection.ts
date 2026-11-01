/** Confidence bands reported with a NISAR surface-change reading. */
export type Confidence = "Low" | "Med" | "High";

/** What a map click (or the Phase 3 stub) hands to the Location Info panel. */
export interface SelectionPayload {
  lng: number;
  lat: number;
  placeName?: string;
  /** Surface change rate at the point, in the active layer's units. */
  rate?: number;
  confidence?: Confidence;
}
