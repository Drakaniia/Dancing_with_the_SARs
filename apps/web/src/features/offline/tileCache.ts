import { invoke, isTauri } from "@tauri-apps/api/core";

/**
 * Desktop tile cache: thin wrappers over the Tauri `read_tile_cache` /
 * `write_tile_cache` commands (apps/desktop/src-tauri/src/commands/fs_cache.rs)
 * plus the MapLibre protocol that serves cached tiles before the network.
 */

export const TILE_PROTOCOL = "nisar-tile";
const TILE_PREFIX = "tiles/";

// 1x1 transparent PNG, returned for tiles the pipeline skipped as fully transparent.
const EMPTY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export function remoteTileBase(): string | null {
  const base = import.meta.env.VITE_TILE_BASE_URL?.trim().replace(/\/+$/, "");
  return base ? base : null;
}

/** Offline tiles need the desktop shell (for the cache) and a remote host (to fill it). */
export function offlineTilesAvailable(): boolean {
  return (
    typeof window !== "undefined" && isTauri() && remoteTileBase() !== null
  );
}

/** `tiles/<id>/<segment>/{z}/{x}/{y}.png` -> `<id>/<segment>/{z}/{x}/{y}.png`. */
export function tileKeyFromPath(relPath: string): string {
  const path = relPath.replace(/^\/+/, "");
  return path.startsWith(TILE_PREFIX) ? path.slice(TILE_PREFIX.length) : path;
}

export function tileProtocolUrl(relPath: string): string {
  return `${TILE_PROTOCOL}://${tileKeyFromPath(relPath)}`;
}

export function remoteTileUrl(base: string, key: string): string {
  return `${base}/${TILE_PREFIX}${key}`;
}

function toArrayBuffer(data: unknown): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
  }
  // The postMessage IPC fallback delivers raw responses as number arrays.
  if (Array.isArray(data)) return new Uint8Array(data).buffer;
  return new ArrayBuffer(0);
}

export async function readTileCache(key: string): Promise<ArrayBuffer | null> {
  const data = toArrayBuffer(await invoke("read_tile_cache", { key }));
  return data.byteLength > 0 ? data : null;
}

export async function writeTileCache(
  key: string,
  data: ArrayBuffer,
): Promise<void> {
  await invoke("write_tile_cache", new Uint8Array(data), {
    headers: { "x-tile-key": key },
  });
}

/** Keys from `entries` that are not cached or whose cached size differs. */
export function missingTileCache(
  entries: [string, number][],
): Promise<string[]> {
  return invoke<string[]>("missing_tile_cache", { entries });
}

export function clearTileCache(): Promise<void> {
  return invoke("clear_tile_cache");
}

function emptyPng(): ArrayBuffer {
  return Uint8Array.from(atob(EMPTY_PNG_BASE64), (c) => c.charCodeAt(0)).buffer;
}

export interface TileProtocolDeps {
  read?: (key: string) => Promise<ArrayBuffer | null>;
  write?: (key: string, data: ArrayBuffer) => Promise<void>;
  fetchFn?: typeof fetch;
  /** Remote host; defaults to `VITE_TILE_BASE_URL`. */
  base?: string | null;
}

/**
 * Cache-first tile loader for `nisar-tile://<key>` URLs: serve the cached tile,
 * else fetch it from the remote host and keep a copy, so tiles seen once also
 * work offline.
 */
export function createTileProtocolHandler(deps: TileProtocolDeps = {}) {
  const read = deps.read ?? readTileCache;
  const write = deps.write ?? writeTileCache;
  const fetchFn = deps.fetchFn ?? ((input, init) => fetch(input, init));
  return async (
    params: { url: string },
    abortController: AbortController,
  ): Promise<{ data: ArrayBuffer }> => {
    const key = params.url.slice(`${TILE_PROTOCOL}://`.length);
    const cached = await read(key).catch(() => null);
    if (cached) return { data: cached };

    const base = deps.base !== undefined ? deps.base : remoteTileBase();
    if (!base)
      throw new Error(`Tile ${key} is not cached and no tile host is set`);
    const response = await fetchFn(remoteTileUrl(base, key), {
      signal: abortController.signal,
    });
    if (response.status === 404) return { data: emptyPng() };
    if (!response.ok) throw new Error(`Tile ${key}: HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    // Copy first: MapLibre may transfer `data` to a worker before the write reads it.
    void write(key, data.slice(0)).catch(() => undefined);
    return { data };
  };
}
