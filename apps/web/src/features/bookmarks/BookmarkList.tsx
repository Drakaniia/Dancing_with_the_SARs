import { MapPin, Trash2 } from "lucide-react";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { useUiStore } from "@/stores/uiStore";

/** Saved bookmarks: click one to fly there, or remove it. Shown under the Tools buttons. */
export function BookmarkList() {
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const requestFlyTo = useUiStore((state) => state.requestFlyTo);

  return (
    <div className="flex flex-col gap-1.5">
      <h3
        id="tools-bookmarks-title"
        className="text-panel-header text-[var(--color-text-muted)] uppercase"
      >
        Bookmarks{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
      </h3>
      {bookmarks.length === 0 ? (
        <p className="text-caption text-[var(--color-text-muted)]">
          No bookmarks yet. Click a spot on the map, then Bookmark to save it.
        </p>
      ) : (
        <ul
          aria-labelledby="tools-bookmarks-title"
          className="flex max-h-48 flex-col gap-0.5 overflow-y-auto"
        >
          {bookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className="flex items-center gap-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-fill-1)]"
            >
              <button
                type="button"
                onClick={() =>
                  requestFlyTo(bookmark.center[0], bookmark.center[1], bookmark.zoom, bookmark.name)
                }
                title={`Fly to ${bookmark.name}`}
                className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1 text-left text-body text-[var(--color-text)]"
              >
                <MapPin
                  aria-hidden="true"
                  size={14}
                  className="shrink-0 text-[var(--color-accent)]"
                />
                <span className="truncate">{bookmark.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Remove bookmark ${bookmark.name}`}
                onClick={() => removeBookmark(bookmark.id)}
                className="rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
