/** Philippines extent, `[west, south, east, north]` — the map's `maxBounds`. */
export const PHILIPPINES_BOUNDS: [number, number, number, number] = [
  116, 4, 127, 21,
];

/** Sarangani & Davao Occidental AOI extent `[west, south, east, north]` in EPSG:4326. */
export const SARANGANI_DAVOCC_BOUNDS: [number, number, number, number] = [
  124.357, 5.3655, 125.7153, 6.633,
];

/** Default center over Sarangani & Davao Occidental `[lng, lat]`. */
export const SARANGANI_CENTER: [number, number] = [125.18, 5.98];

/** Legacy archipelago center kept for tests and reset-to-archipelago action. */
export const PHILIPPINES_CENTER: [number, number] = [122, 13];

/** Zoom that frames Sarangani & Davao Occidental at startup. */
export const SARANGANI_ZOOM = 8.4;

/** Zoom that frames the whole archipelago. */
export const PHILIPPINES_ZOOM = 5;

/** Web Mercator ground resolution at the equator and zoom 0, in meters per pixel. */
export const EQUATOR_METERS_PER_PIXEL = 156543.03392;

/**
 * Web Mercator ground resolution at `lat` / `zoom`, in meters per pixel.
 */
export function metersPerPixel(lat: number, zoom: number): number {
  return (
    (EQUATOR_METERS_PER_PIXEL * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
  );
}

/**
 * URL-safe period segment matching `scripts/tiles/pipeline.py:tile_segment`.
 */
export function tileSegment(period: string): string {
  return period
    .toLowerCase()
    .split(" (vs ")
    .join("-vs-")
    .split(")")
    .join("")
    .split(" ")
    .join("-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/**
 * Raster-source URL template for a layer on a given period.
 */
export function tileTemplate(
  changeTypeOrLayerId: string,
  date: string,
): string {
  return `tiles/${changeTypeOrLayerId}/${date}/{z}/{x}/{y}.png`;
}

/**
 * Absolute URL for a relative tile path such as `tiles/<id>/<segment>/{z}/{x}/{y}.png`.
 * A configured remote base (`VITE_TILE_BASE_URL`, e.g. a Cloudflare R2 bucket holding the
 * `tiles/` prefix) wins; otherwise tiles come from the app's own origin (`public/tiles/`).
 */
export function resolveTileUrl(
  relPath: string,
  remoteBase: string | undefined,
  origin: string,
): string {
  const remote = remoteBase?.trim().replace(/\/+$/, "");
  if (remote) return `${remote}/${relPath}`;
  return origin ? `${origin}/${relPath}` : `/${relPath}`;
}
