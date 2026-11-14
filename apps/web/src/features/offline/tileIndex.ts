/**
 * Remote tile index published next to the tiles as `tiles/index.json` by
 * `scripts/r2/tiles.mjs`. Keys are relative to `tiles/`, sizes are bytes.
 */
export interface TileIndex {
  version: string;
  count: number;
  bytes: number;
  tiles: [key: string, size: number][];
}

export const TILE_INDEX_PATH = "tiles/index.json";

export function parseTileIndex(value: unknown): TileIndex {
  const raw = value as Partial<TileIndex> | null;
  if (!raw || typeof raw !== "object")
    throw new Error("Tile index is not an object");
  if (typeof raw.version !== "string" || !raw.version) {
    throw new Error("Tile index has no version");
  }
  if (!Array.isArray(raw.tiles))
    throw new Error("Tile index has no tiles list");
  let bytes = 0;
  for (const entry of raw.tiles) {
    if (
      !Array.isArray(entry) ||
      typeof entry[0] !== "string" ||
      !entry[0].endsWith(".png") ||
      typeof entry[1] !== "number" ||
      !Number.isFinite(entry[1]) ||
      entry[1] < 0
    ) {
      throw new Error(`Invalid tile index entry: ${JSON.stringify(entry)}`);
    }
    bytes += entry[1];
  }
  return {
    version: raw.version,
    count: raw.tiles.length,
    bytes,
    tiles: raw.tiles as [string, number][],
  };
}

/**
 * Runs `task` over `items` with at most `concurrency` in flight. Stops pulling
 * new items once `signal` aborts; in-flight tasks finish or reject on their own.
 */
export async function runPool<T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !signal?.aborted) {
      const item = items[next++];
      await task(item);
    }
  };
  const width = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: width }, worker));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}
