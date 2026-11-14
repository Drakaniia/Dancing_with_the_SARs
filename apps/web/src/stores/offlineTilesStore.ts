import { create } from "zustand";
import {
  clearTileCache,
  missingTileCache,
  remoteTileBase,
  remoteTileUrl,
  writeTileCache,
} from "@/features/offline/tileCache";
import {
  parseTileIndex,
  runPool,
  TILE_INDEX_PATH,
} from "@/features/offline/tileIndex";

/** Marker for a complete offline pack, kept in localStorage. */
export interface SavedTilePack {
  version: string;
  count: number;
  bytes: number;
  completedAt: string;
}

export type OfflinePhase =
  | "idle"
  | "checking"
  | "downloading"
  | "done"
  | "cancelled"
  | "error";

interface OfflineTilesState {
  phase: OfflinePhase;
  done: number;
  total: number;
  bytesDone: number;
  bytesTotal: number;
  failed: number;
  error: string | null;
  saved: SavedTilePack | null;
  start: () => Promise<void>;
  cancel: () => void;
  remove: () => Promise<void>;
}

const STORAGE_KEY = "nisar.offlineTiles.v1";
const CONCURRENCY = 6;
const RETRIES = 3;
const FLUSH_MS = 200;

function loadSaved(): SavedTilePack | null {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    return raw ? (JSON.parse(raw) as SavedTilePack) : null;
  } catch {
    return null;
  }
}

function storeSaved(pack: SavedTilePack | null): void {
  try {
    if (pack) localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the pack still works, only the marker is lost.
  }
}

async function fetchTile(
  url: string,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      // Network failure: retry unless the user cancelled.
      if (signal.aborted) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      continue;
    }
    if (response.ok) return await response.arrayBuffer();
    lastError = new Error(`HTTP ${response.status}`);
    // 4xx will not fix itself; only server errors are retried.
    if (response.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw lastError;
}

let controller: AbortController | null = null;

export const useOfflineTilesStore = create<OfflineTilesState>((set, get) => ({
  phase: "idle",
  done: 0,
  total: 0,
  bytesDone: 0,
  bytesTotal: 0,
  failed: 0,
  error: null,
  saved: loadSaved(),

  start: async () => {
    const { phase } = get();
    if (phase === "checking" || phase === "downloading") return;
    const base = remoteTileBase();
    if (!base) {
      set({
        phase: "error",
        error: "No tile host configured (VITE_TILE_BASE_URL).",
      });
      return;
    }
    controller = new AbortController();
    const { signal } = controller;
    set({ phase: "checking", error: null, failed: 0, done: 0, total: 0 });

    try {
      const response = await fetch(`${base}/${TILE_INDEX_PATH}`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error(`Tile index: HTTP ${response.status}`);
      const index = parseTileIndex(await response.json());
      const missing = new Set(await missingTileCache(index.tiles));
      const todo = index.tiles.filter(([key]) => missing.has(key));

      let done = index.count - todo.length;
      let bytesDone =
        index.bytes - todo.reduce((sum, [, size]) => sum + size, 0);
      let failed = 0;
      set({
        phase: "downloading",
        done,
        total: index.count,
        bytesDone,
        bytesTotal: index.bytes,
      });

      let lastFlush = 0;
      const flush = (force = false) => {
        const now = Date.now();
        if (!force && now - lastFlush < FLUSH_MS) return;
        lastFlush = now;
        set({ done, bytesDone, failed });
      };

      await runPool(
        todo,
        CONCURRENCY,
        async ([key, size]) => {
          try {
            const data = await fetchTile(remoteTileUrl(base, key), signal);
            await writeTileCache(key, data);
            done += 1;
            bytesDone += size;
          } catch {
            if (signal.aborted) return;
            failed += 1;
          }
          flush();
        },
        signal,
      );
      flush(true);

      if (signal.aborted) {
        set({ phase: "cancelled" });
      } else if (failed > 0) {
        set({
          phase: "error",
          error: `${failed} tile(s) failed. Download again to retry them.`,
        });
      } else {
        const saved: SavedTilePack = {
          version: index.version,
          count: index.count,
          bytes: index.bytes,
          completedAt: new Date().toISOString(),
        };
        storeSaved(saved);
        set({ phase: "done", saved });
      }
    } catch (error) {
      if (signal.aborted) set({ phase: "cancelled" });
      else
        set({
          phase: "error",
          error: error instanceof Error ? error.message : String(error),
        });
    } finally {
      controller = null;
    }
  },

  cancel: () => controller?.abort(),

  remove: async () => {
    controller?.abort();
    try {
      await clearTileCache();
      storeSaved(null);
      set({
        phase: "idle",
        saved: null,
        done: 0,
        total: 0,
        bytesDone: 0,
        bytesTotal: 0,
        failed: 0,
        error: null,
      });
    } catch (error) {
      set({
        phase: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
}));
