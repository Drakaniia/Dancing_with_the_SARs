import { CHANGE_TYPES } from "@/fixtures/sample-dashboard";
import { useLayerStore } from "@/stores/layerStore";
import { ChangeTypeRow } from "./ChangeTypeRow";

/**
 * Surface Change Types. Rows come from the fixture (order and labels) and their toggle state is
 * read from `layerStore`, filtering the layer list by change type — so flipping a row here also
 * flips that layer's row in Map Layers, because they are one store entry.
 */
export function ChangeTypeList() {
  const layers = useLayerStore((state) => state.layers);
  const toggleVisibility = useLayerStore((state) => state.toggleVisibility);

  return (
    <ul className="flex flex-col gap-0.5">
      {CHANGE_TYPES.map(({ changeType, label }) => {
        const layer = layers.find(
          (candidate) =>
            candidate.kind === "change-type" &&
            candidate.changeType === changeType,
        );
        if (!layer) return null;

        return (
          <li key={changeType}>
            <ChangeTypeRow
              changeType={changeType}
              label={label}
              visible={layer.visible}
              onToggle={() => toggleVisibility(layer.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
