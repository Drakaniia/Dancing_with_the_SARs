import {
  Bookmark,
  Database,
  Download,
  Menu,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/app/providers/ThemeProvider";
import { IconButton } from "@/shared/ui/IconButton";
import { Popover } from "@/shared/ui/Popover";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { useDatasetStore } from "@/stores/datasetStore";
import { useActiveLayer } from "@/stores/layerStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUiStore } from "@/stores/uiStore";

export interface TopBarActionsProps {
  className?: string;
}

type OpenMenu = "bookmarks" | "export" | "settings" | null;

const MENU_HEADER =
  "text-panel-header text-[var(--color-text-muted)] uppercase";

export function TopBarActions({ className }: TopBarActionsProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const requestFlyTo = useUiStore((state) => state.requestFlyTo);
  const setProvenanceOpen = useUiStore((state) => state.setProvenanceOpen);
  const selected = useSelectionStore((state) => state.selected);
  const activeLayer = useActiveLayer();
  const currentDate = useDatasetStore((state) => state.currentDate);
  const manifest = useDatasetStore((state) => state.manifest);

  const menuProps = (id: Exclude<OpenMenu, null>) => ({
    open: openMenu === id,
    onOpenChange: (open: boolean) => setOpenMenu(open ? id : null),
  });

  const exportManifestSummary = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      activeLayer: activeLayer?.id,
      currentDate,
      selectedPoint: selected,
      source: manifest?.source ?? {
        repo: "https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar",
        commit: "7ea38ff1b5c0dd4571b1935d01c5bd71ebf72862",
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nisar-inspection-${currentDate ?? "snapshot"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNote("Saved inspection JSON snapshot.");
  };

  return (
    <nav
      aria-label="Primary"
      className={`flex items-center gap-1 ${className ?? ""}`}
    >
      <IconButton
        label={
          theme === "light"
            ? "Switch to Night Atlas dark mode"
            : "Switch to Sand Atlas light mode"
        }
        onClick={toggleTheme}
      >
        {theme === "light" ? (
          <Moon size={18} strokeWidth={1.5} />
        ) : (
          <Sun size={18} strokeWidth={1.5} />
        )}
      </IconButton>

      <IconButton
        label="Data provenance"
        onClick={() => setProvenanceOpen(true)}
      >
        <Database size={18} strokeWidth={1.5} />
      </IconButton>

      <Popover
        {...menuProps("bookmarks")}
        label="Bookmarks"
        trigger={
          <IconButton label="Bookmarks">
            <Bookmark size={18} strokeWidth={1.5} />
          </IconButton>
        }
      >
        <div className="flex w-72 flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className={MENU_HEADER}>Saved Viewpoints</p>
            <button
              type="button"
              onClick={() => {
                const lng = selected?.lng ?? 125.2869;
                const lat = selected?.lat ?? 6.1028;
                const name =
                  selected?.placeName ??
                  `Sarangani (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;
                addBookmark({
                  id: `bm-${Date.now()}`,
                  name,
                  center: [lng, lat],
                  zoom: 11,
                });
              }}
              className="rounded-[var(--radius-sm)] bg-[var(--color-fill-3)] px-2 py-0.5 text-caption text-[var(--color-text)] hover:bg-[var(--color-fill-4)]"
            >
              + Save Current
            </button>
          </div>
          {bookmarks.length === 0 ? (
            <p className="text-caption text-[var(--color-text-muted)]">
              No bookmarks saved yet. Click "+ Save Current" or the Bookmark
              tool to pin a viewpoint.
            </p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {bookmarks.map((bookmark) => (
                <li
                  key={bookmark.id}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 hover:bg-[var(--color-fill-2)]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      requestFlyTo(
                        bookmark.center[0],
                        bookmark.center[1],
                        bookmark.zoom,
                        bookmark.name,
                      );
                      setOpenMenu(null);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-body text-[var(--color-text)]"
                  >
                    {bookmark.name}
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
      </Popover>

      <Popover
        {...menuProps("export")}
        label="Export"
        trigger={
          <IconButton label="Export">
            <Download size={18} strokeWidth={1.5} />
          </IconButton>
        }
      >
        <div className="flex w-64 flex-col gap-2">
          <p className={MENU_HEADER}>Export Snapshot</p>
          <p className="text-caption text-[var(--color-text-secondary)]">
            Download the active layer state, inspected pixel readings, and
            manifest provenance as JSON.
          </p>
          <button
            type="button"
            onClick={exportManifestSummary}
            className="h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 text-label text-[var(--color-on-accent)] hover:brightness-95"
          >
            Download Inspection JSON
          </button>
          {exportNote ? (
            <p className="text-caption text-[var(--color-success)]">
              {exportNote}
            </p>
          ) : null}
        </div>
      </Popover>

      <Popover
        {...menuProps("settings")}
        label="Settings"
        align="end"
        trigger={
          <IconButton label="Settings">
            <Menu size={18} strokeWidth={1.5} />
          </IconButton>
        }
      >
        <div className="flex w-64 flex-col gap-3">
          <p className={MENU_HEADER}>Settings</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-[var(--color-text)]">
              Appearance
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-[var(--radius-sm)] bg-[var(--color-fill-3)] px-2.5 py-1 text-caption text-[var(--color-text)] hover:bg-[var(--color-fill-4)]"
            >
              {theme === "light" ? "Warm light" : "Night Atlas dark"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-[var(--color-text)]">
              Release Provenance
            </span>
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setProvenanceOpen(true);
              }}
              className="text-caption font-medium text-[var(--color-accent)] hover:underline"
            >
              Inspect 7ea38ff
            </button>
          </div>
        </div>
      </Popover>
    </nav>
  );
}
