import { Bookmark, Download, Menu } from "lucide-react";
import { useState } from "react";
import { IconButton } from "@/shared/ui/IconButton";
import { Popover } from "@/shared/ui/Popover";
import { useBookmarkStore } from "@/stores/bookmarkStore";

export interface TopBarActionsProps {
  className?: string;
}

type OpenMenu = "bookmarks" | "export" | "settings" | null;

const MENU_HEADER =
  "text-panel-header text-[var(--color-text-muted)] uppercase";

/**
 * Global actions: Bookmarks, Export, and Settings. Each opens an anchored glass popover. Export and
 * the deeper bookmark/measure wiring land in later phases; the settings popover reports the
 * shipped palette.
 */
export function TopBarActions({ className }: TopBarActionsProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const bookmarks = useBookmarkStore((state) => state.bookmarks);

  const menuProps = (id: Exclude<OpenMenu, null>) => ({
    open: openMenu === id,
    onOpenChange: (open: boolean) => setOpenMenu(open ? id : null),
  });

  return (
    <nav
      aria-label="Primary"
      className={`flex items-center gap-1 ${className ?? ""}`}
    >
      <Popover
        {...menuProps("bookmarks")}
        label="Bookmarks"
        trigger={
          <IconButton label="Bookmarks">
            <Bookmark size={18} strokeWidth={1.5} />
          </IconButton>
        }
      >
        <div className="flex w-64 flex-col gap-2">
          <p className={MENU_HEADER}>Bookmarks</p>
          {bookmarks.length === 0 ? (
            <p className="text-caption text-[var(--color-text-muted)]">
              No bookmarks saved yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {bookmarks.map((bookmark) => (
                <li
                  key={bookmark.id}
                  className="truncate text-body text-[var(--color-text)]"
                >
                  {bookmark.name}
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
        <div className="flex w-64 flex-col gap-1">
          <p className={MENU_HEADER}>Export</p>
          <p className="text-caption text-[var(--color-text-muted)]">
            Data and image export arrive with the Tools panel.
          </p>
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
            <span className="text-caption text-[var(--color-text-muted)]">
              Warm light
            </span>
          </div>
        </div>
      </Popover>
    </nav>
  );
}
