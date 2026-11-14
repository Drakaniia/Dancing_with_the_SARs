import { create } from "zustand";
import { readSetting, writeSetting } from "@/shared/utils/settings";

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

/** Tauri store on desktop, localStorage in the browser (see `shared/utils/settings`). */
const BOOKMARKS_KEY = "ui.bookmarks";

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
  const value = await readSetting(BOOKMARKS_KEY);
  if (!Array.isArray(value)) return null;
  return value.filter(isBookmark);
}

async function persistBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await writeSetting(BOOKMARKS_KEY, bookmarks);
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
 * Loads persisted bookmarks. Safe to call more than once; keeps the in-memory state when nothing is
 * stored or storage is unavailable.
 */
export async function hydrateBookmarkStore(): Promise<void> {
  const persisted = await readPersistedBookmarks();
  if (!persisted) return;
  useBookmarkStore.setState({ bookmarks: persisted });
}

// Restore persisted bookmarks on module load; consumers that need to await it can call
// `hydrateBookmarkStore()` directly.
void hydrateBookmarkStore();
