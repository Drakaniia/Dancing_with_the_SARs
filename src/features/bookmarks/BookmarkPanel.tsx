import { useBookmarkStore } from "@/stores/bookmarkStore";

export default function BookmarkPanel() {
  const bookmarks = useBookmarkStore((s) => s.bookmarks);

  if (bookmarks.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookmarks</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {bookmarks.map((b) => (
        <button
          key={b.id}
          type="button"
          className="text-left text-sm hover:underline"
        >
          {b.name}
        </button>
      ))}
    </div>
  );
}
