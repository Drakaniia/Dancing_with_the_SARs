/** Philippines extent, `[west, south, east, north]` — the map's `maxBounds`. */
export const PHILIPPINES_BOUNDS: [number, number, number, number] = [
  116, 4, 127, 21,
];

/** Map center at rest, `[lng, lat]` — the reference dashboard's framing. */
export const PHILIPPINES_CENTER: [number, number] = [122, 13];

/** Zoom that frames the whole archipelago, matching the reference dashboard. */
export const PHILIPPINES_ZOOM = 5;

/** Web Mercator ground resolution at the equator and zoom 0, in meters per pixel. */
export const EQUATOR_METERS_PER_PIXEL = 156543.03392;

/**
 * Web Mercator ground resolution at `lat` / `zoom`, in meters per pixel. Drives the scale bar, so
 * it lives next to the map framing rather than inside the component.
 */
export function metersPerPixel(lat: number, zoom: number): number {
  return (
    (EQUATOR_METERS_PER_PIXEL * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
  );
}

/**
 * Raster-source URL template for a change type on a given date, for MapLibre's `tiles` array.
 * The date is part of the path, so a date change retargets the overlay by rebuilding the source.
 */
export function tileTemplate(changeType: string, date: string): string {
  return `tiles/${changeType}/${date}/{z}/{x}/{y}.png`;
}
