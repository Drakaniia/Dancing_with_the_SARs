import type { ChangeType } from "./dataset";

/**
 * What the layer represents: a NISAR change-type raster, the Esri basemap, the boundary vector
 * layer, or the place-label layer. Only `change-type` layers carry a `changeType`.
 */
export type LayerKind = "change-type" | "basemap" | "vector" | "labels";

export interface LayerConfig {
  id: string;
  /** Row label, e.g. `NISAR Surface Change (Subsidence)`. */
  name: string;
  kind: LayerKind;
  changeType?: ChangeType;
  visible: boolean;
  /** Overlay opacity as a fraction (`0.7` renders as `70%`). */
  opacity: number;
  order: number;
  /**
   * Listed in the Map Layers panel. The reference lists one change-type row (subsidence); the
   * other three change types exist only as Surface Change Types rows.
   */
  showInLayerList?: boolean;
}

export interface ColorScale {
  changeType: ChangeType;
  stops: { value: number; color: string }[];
}
