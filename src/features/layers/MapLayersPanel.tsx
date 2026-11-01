import { useLayerStore } from "@/stores/layerStore";
import { LayerOrderControl } from "./LayerOrderControl";
import { LayerRow, LayerSwatch } from "./LayerRow";
import { OpacityControl } from "./OpacityControl";

/**
 * Map Layers: opacity for the active data layer, the layer rows, then the order control.
 *
 * Rows are the layers flagged `showInLayerList` in the store — the reference lists one NISAR row
 * plus the basemap, boundaries and label layers. Visibility is written back to `layerStore`, and
 * the base/label/boundary rows toggle the MapLibre style layers in the map phase.
 */
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
                <LayerSwatch kind={layer.kind} changeType={layer.changeType} />
              }
            />
          </li>
        ))}
      </ul>

      <LayerOrderControl />
    </div>
  );
}
