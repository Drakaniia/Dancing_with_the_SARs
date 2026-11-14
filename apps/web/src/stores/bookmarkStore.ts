import { isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";

export interface Bookmark {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
}

const SETTINGS_STORE = "settings.json";
const BOOKMARKS_KEY = "ui.bookmarks";

/** Tauri is absent in the web build; persistence is skipped there and state stays in memory. */
function canPersist(): boolean {
  return typeof window !== "undefined" && isTauri();
}

function isBookmark(value: unknown): value is Bookmark {
  if (!value || typeof value !== "object") return false;
  const bookmark = value as Partial<Bookmark>;
  return (
    typeof bookmark.id === "string" &&
    typeof bookmark.name === "string" &&
    typeof bookmark.zoom === "number" &&
    Array.isArray(bookmark.center) &&
    bookmark.center.length === 2 &&
    bookmark.center.every((coordinate) => typeof coordinate === "number")
  );
}

async function readPersistedBookmarks(): Promise<Bookmark[] | null> {
  if (!canPersist()) return null;
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(SETTINGS_STORE, { autoSave: true });
    const value = await store.get<unknown>(BOOKMARKS_KEY);
    if (!Array.isArray(value)) return null;
    return value.filter(isBookmark);
  } catch {
    return null;
  }
}

async function persistBookmarks(bookmarks: Bookmark[]): Promise<void> {
  if (!canPersist()) return;
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(SETTINGS_STORE, { autoSave: true });
    await store.set(BOOKMARKS_KEY, bookmarks);
  } catch {
    // Persistence is best-effort; the in-memory state is still correct.
  }
}

export const useBookmarkStore = create<BookmarkState>((set) => ({
  bookmarks: [],

  addBookmark: (bookmark) =>
    set((state) => {
      const bookmarks = [...state.bookmarks, bookmark];
      void persistBookmarks(bookmarks);
      return { bookmarks };
    }),

  removeBookmark: (id) =>
    set((state) => {
      const bookmarks = state.bookmarks.filter(
        (bookmark) => bookmark.id !== id,
      );
      void persistBookmarks(bookmarks);
      return { bookmarks };
    }),
}));

/**
 * Loads persisted bookmarks. Safe to call more than once; resolves to the in-memory state when the
 * store is unavailable (web build, tests).
 */
export async function hydrateBookmarkStore(): Promise<void> {
  const persisted = await readPersistedBookmarks();
  if (!persisted) return;
  useBookmarkStore.setState({ bookmarks: persisted });
}

// Restore persisted bookmarks on module load; consumers that need to await it can call
// `hydrateBookmarkStore()` directly.
void hydrateBookmarkStore();
