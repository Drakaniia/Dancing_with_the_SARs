import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { IconButton } from "@/shared/ui/IconButton";
import { useActiveLayer, useLayerStore } from "@/stores/layerStore";

/**
 * Layer Order: moves the active layer one step up or down in the stack and writes
 * `layerStore.reorder`. The step buttons disable at the ends of the list.
 */
export function LayerOrderControl() {
  const layers = useLayerStore((state) => state.layers);
  const reorder = useLayerStore((state) => state.reorder);
  const active = useActiveLayer();

  const index = active
    ? layers.findIndex((layer) => layer.id === active.id)
    : -1;
  const lastIndex = layers.length - 1;

  const move = (delta: number) => {
    if (index < 0) return;
    const to = index + delta;
    if (to < 0 || to > lastIndex) return;
    reorder(index, to);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-label text-[var(--color-text-secondary)]">
        <ChevronsUpDown aria-hidden="true" size={16} strokeWidth={1.5} />
        Layer Order
      </span>
      <div className="flex items-center gap-1">
        <IconButton
          label="Move layer up"
          variant="ghost"
          disabled={index <= 0}
          onClick={() => move(-1)}
        >
          <ChevronUp size={16} strokeWidth={1.5} />
        </IconButton>
        <IconButton
          label="Move layer down"
          variant="ghost"
          disabled={index < 0 || index >= lastIndex}
          onClick={() => move(1)}
        >
          <ChevronDown size={16} strokeWidth={1.5} />
        </IconButton>
      </div>
    </div>
  );
}
