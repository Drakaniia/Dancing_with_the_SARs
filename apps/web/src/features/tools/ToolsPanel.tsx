import {
  Bookmark,
  Download,
  type LucideIcon,
  Pencil,
  Ruler,
} from "lucide-react";
import { LOCATION_INFO, TOOLS, type ToolId } from "@/fixtures/sample-dashboard";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { useDatasetStore } from "@/stores/datasetStore";
import { useActiveLayer } from "@/stores/layerStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUiStore } from "@/stores/uiStore";
import { ToolButton } from "./ToolButton";

const ICONS: Record<ToolId, LucideIcon> = {
  measure: Ruler,
  draw: Pencil,
  bookmark: Bookmark,
  export: Download,
};

export function ToolsPanel() {
  const activeTool = useUiStore((state) => state.activeTool);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const selected = useSelectionStore((state) => state.selected);
  const activeLayer = useActiveLayer();
  const currentDate = useDatasetStore((state) => state.currentDate);

  const run = (id: ToolId) => {
    if (id === "export") {
      const payload = {
        exportedAt: new Date().toISOString(),
        layer: activeLayer?.id,
        period: currentDate,
        selection: selected,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nisar-export-${currentDate ?? "snapshot"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (id === "bookmark") {
      const lng = selected?.lng ?? LOCATION_INFO.lng;
      const lat = selected?.lat ?? LOCATION_INFO.lat;
      const name = selected?.placeName ?? LOCATION_INFO.place;
      addBookmark({
        id: `bookmark-${Date.now()}`,
        name,
        center: [lng, lat],
        zoom: 11,
      });
      return;
    }

    setActiveTool(activeTool === id ? null : id);
  };

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {TOOLS.map((tool) => (
        <ToolButton
          key={tool.id}
          icon={ICONS[tool.id]}
          label={tool.label}
          active={activeTool === tool.id}
          onClick={() => run(tool.id)}
        />
      ))}
    </div>
  );
}
