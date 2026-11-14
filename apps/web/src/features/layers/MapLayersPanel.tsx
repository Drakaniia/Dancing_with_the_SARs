import { useLayerStore } from "@/stores/layerStore";
import { LayerOrderControl } from "./LayerOrderControl";
import { LayerRow, LayerSwatch } from "./LayerRow";
import { OpacityControl } from "./OpacityControl";

export function MapLayersPanel() {
  const layers = useLayerStore((state) => state.layers);
  const toggleVisibility = useLayerStore((state) => state.toggleVisibility);

  const rows = layers
    .filter((layer) => layer.showInLayerList)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-3">
      <OpacityControl />

      <ul className="flex flex-col gap-0.5">
        {rows.map((layer) => (
          <li key={layer.id}>
            <LayerRow
              label={layer.name}
              checked={layer.visible}
              onToggle={() => toggleVisibility(layer.id)}
              swatch={
                <LayerSwatch
                  kind={layer.kind}
                  changeType={layer.changeType}
                  ramp={layer.ramp}
                  classes={layer.classes}
                />
              }
            />
          </li>
        ))}
      </ul>

      <LayerOrderControl />
    </div>
  );
}
