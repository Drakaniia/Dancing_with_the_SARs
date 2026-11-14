import { Compass, Focus, Layers, Minus, Mountain, Plus } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { LayerRow, LayerSwatch } from "@/features/layers/LayerRow";
import { IconButton } from "@/shared/ui/IconButton";
import { Popover } from "@/shared/ui/Popover";
import { SARANGANI_DAVOCC_BOUNDS } from "@/shared/utils/geo";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useUiStore } from "@/stores/uiStore";
import { REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export interface MapControlsProps {
  map: MapLibreMap | null;
}

export function MapControls({ map }: MapControlsProps) {
  const [bearing, setBearing] = useState(0);
  const [layersOpen, setLayersOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const layers = useLayerStore((state) => state.layers);
  const toggleVisibility = useLayerStore((state) => state.toggleVisibility);
  const terrain3d = useUiStore((state) => state.terrain3d);
  const toggleTerrain3d = useUiStore((state) => state.toggleTerrain3d);
  const bounds = useDatasetStore(
    (state) => state.manifest?.bounds ?? SARANGANI_DAVOCC_BOUNDS,
  );

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

  const fitAoi = () => {
    if (!map) return;
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: 36, duration: 750, pitch: map.getPitch() },
    );
  };

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
        label="Frame Sarangani & Davao Occidental AOI"
        size="md"
        disabled={!map}
        onClick={fitAoi}
      >
        <Focus size={18} strokeWidth={1.5} />
      </IconButton>

      <IconButton
        label="Reset north"
        size="md"
        disabled={!map}
        onClick={() =>
          map?.easeTo(terrain3d ? { bearing: 0 } : { bearing: 0, pitch: 0 })
        }
      >
        <motion.span
          className="flex"
          animate={{ rotate: -bearing }}
          transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
        >
          <Compass size={18} strokeWidth={1.5} />
        </motion.span>
      </IconButton>

      <IconButton
        label={terrain3d ? "Switch to 2D map" : "Switch to 3D terrain"}
        title={terrain3d ? "2D map" : "3D terrain"}
        size="md"
        disabled={!map}
        aria-pressed={terrain3d}
        onClick={toggleTerrain3d}
        className={terrain3d ? "text-[var(--color-accent)]" : undefined}
      >
        <Mountain size={18} strokeWidth={1.5} />
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
        <ul className="flex w-64 max-h-80 overflow-y-auto flex-col gap-0.5">
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
      </Popover>
    </div>
  );
}
