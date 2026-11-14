import { resolveTileUrl } from "./geo";

/**
 * Small data files (`manifest.json`, `tables.json`, `boundary.geojson`, `landslides.geojson`)
 * are published to the same remote host as the tiles, under `data/`, so data can change without
 * a new app release. The copy bundled in `public/data/` stays as the offline / failure fallback.
 */

const REMOTE_BASE = import.meta.env.VITE_TILE_BASE_URL;

/** Remote URL for a data file, or `null` when no remote host is configured. */
export function remoteDataUrl(
  file: string,
  remoteBase: string | undefined = REMOTE_BASE,
): string | null {
  if (!remoteBase?.trim()) return null;
  return resolveTileUrl(`data/${file}`, remoteBase, "");
}

/**
 * Fetches `data/<file>`: the remote copy first (revalidated, so updates show up quickly),
 * then the bundled one when the remote is unset, unreachable or answers with an error.
 */
export async function fetchDataFile(
  file: string,
  remoteBase: string | undefined = REMOTE_BASE,
): Promise<Response> {
  const remote = remoteDataUrl(file, remoteBase);
  if (remote) {
    try {
      const res = await fetch(remote, { cache: "no-cache" });
      if (res.ok) return res;
    } catch {
      // Offline or blocked: use the bundled copy below.
    }
  }
  return fetch(`${import.meta.env.BASE_URL}data/${file}`);
}
