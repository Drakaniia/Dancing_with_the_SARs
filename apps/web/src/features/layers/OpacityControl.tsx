import { Slider } from "@/shared/ui/Slider";
import { useActiveLayer, useLayerStore } from "@/stores/layerStore";

/**
 * Opacity for the active data layer, read as a percentage: label on the left, value on the right,
 * slider beneath. Writes `layerStore.setOpacity` (the store keeps opacity as a fraction).
 */
export function OpacityControl() {
  const active = useActiveLayer();
  const setOpacity = useLayerStore((state) => state.setOpacity);
  const percent = Math.round((active?.opacity ?? 0) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label text-[var(--color-text-secondary)]">
          Opacity
        </span>
        <span className="text-label text-[var(--color-text)] tabular-nums">
          {percent}%
        </span>
      </div>
      <Slider
        value={percent}
        min={0}
        max={100}
        step={1}
        disabled={!active}
        onChange={(value) => {
          if (active) setOpacity(active.id, value / 100);
        }}
        aria-label="Layer opacity"
        ariaValueText={`${percent}%`}
      />
    </div>
  );
}
