import type { ChangeType, LayerFamily } from "./dataset";
import type { ClassEntry, Ramp } from "./manifest";

export type LayerKind =
  | "change-type"
  | "manifest-layer"
  | "basemap"
  | "vector"
  | "labels";

export interface LayerConfig {
  id: string;
  /** Human-readable layer title. */
  name: string;
  kind: LayerKind;
  family?: LayerFamily;
  changeType?: ChangeType;
  visible: boolean;
  /** Overlay opacity as a fraction (`0.75` renders as `75%`). */
  opacity: number;
  order: number;
  /** Shown in the Map Layers stack panel. */
  showInLayerList?: boolean;
  units?: string;
  valueType?: "continuous" | "categorical" | "count";
  periods?: string[];
  ramp?: Ramp;
  domain?: [number, number];
  classes?: ClassEntry[];
  caveats?: string[];
  coverage?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface ColorScale {
  changeType: ChangeType;
  stops: { value: number; color: string }[];
}
