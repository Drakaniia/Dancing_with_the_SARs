export type ChangeType = "elevation" | "subsidence" | "vegetation" | "water";

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
