import {
  Bookmark,
  Download,
  type LucideIcon,
  Pencil,
  Ruler,
} from "lucide-react";
import { useState } from "react";
import { LOCATION_INFO, TOOLS, type ToolId } from "@/fixtures/sample-dashboard";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { ToolButton } from "./ToolButton";

const ICONS: Record<ToolId, LucideIcon> = {
  measure: Ruler,
  draw: Pencil,
  bookmark: Bookmark,
  export: Download,
};

/**
 * Tools: a four-up grid of Measure / Draw / Bookmark / Export.
 *
 * Bookmark writes to `bookmarkStore`; Measure and Draw toggle the active interaction mode (the map
 * modes they switch on arrive with the map phase); Export is a no-op until the export command
 * exists.
 */
export function ToolsPanel() {
  const [active, setActive] = useState<ToolId | null>(null);
  const addBookmark = useBookmarkStore((state) => state.addBookmark);

  const run = (id: ToolId) => {
    if (id === "export") return;

    if (id === "bookmark") {
      addBookmark({
        id: `bookmark-${Date.now()}`,
        name: LOCATION_INFO.place,
        center: [LOCATION_INFO.lng, LOCATION_INFO.lat],
        zoom: 8,
      });
      return;
    }

    setActive((current) => (current === id ? null : id));
  };

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {TOOLS.map((tool) => (
        <ToolButton
          key={tool.id}
          icon={ICONS[tool.id]}
          label={tool.label}
          active={active === tool.id}
          onClick={() => run(tool.id)}
        />
      ))}
    </div>
  );
}
