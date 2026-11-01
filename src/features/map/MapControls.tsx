import { Compass, Layers, Minus, Plus } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { LayerRow, LayerSwatch } from "@/features/layers/LayerRow";
import { IconButton } from "@/shared/ui/IconButton";
import { Popover } from "@/shared/ui/Popover";
import { useLayerStore } from "@/stores/layerStore";
import { REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export interface MapControlsProps {
  map: MapLibreMap | null;
}

/**
 * Top-right map chrome: zoom in / zoom out / compass reset / layer switcher. Glass `36px` buttons;
 * the compass needle tracks the map bearing on the UI spring.
 */
export function MapControls({ map }: MapControlsProps) {
  const [bearing, setBearing] = useState(0);
  const [layersOpen, setLayersOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const layers = useLayerStore((state) => state.layers);
  const toggleVisibility = useLayerStore((state) => state.toggleVisibility);

  useEffect(() => {
    if (!map) return;
    const sync = () => setBearing(map.getBearing());
    sync();
    map.on("rotate", sync);
    map.on("move", sync);
    return () => {
      map.off("rotate", sync);
      map.off("move", sync);
    };
  }, [map]);

  const rows = layers
    .filter((layer) => layer.showInLayerList)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-2">
      <IconButton
        label="Zoom in"
        size="md"
        disabled={!map}
        onClick={() => map?.zoomIn()}
      >
        <Plus size={18} strokeWidth={1.5} />
      </IconButton>

      <IconButton
        label="Zoom out"
        size="md"
        disabled={!map}
        onClick={() => map?.zoomOut()}
      >
        <Minus size={18} strokeWidth={1.5} />
      </IconButton>

      <IconButton
        label="Reset north"
        size="md"
        disabled={!map}
        onClick={() => map?.easeTo({ bearing: 0, pitch: 0 })}
      >
        <motion.span
          className="flex"
          animate={{ rotate: -bearing }}
          transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
        >
          <Compass size={18} strokeWidth={1.5} />
        </motion.span>
      </IconButton>

      <Popover
        open={layersOpen}
        onOpenChange={setLayersOpen}
        label="Map layers"
        align="end"
        trigger={
          <IconButton label="Map layers" size="md">
            <Layers size={18} strokeWidth={1.5} />
          </IconButton>
        }
      >
        <ul className="flex w-56 flex-col gap-0.5">
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
                  />
                }
              />
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}
