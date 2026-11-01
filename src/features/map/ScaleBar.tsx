import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useState } from "react";
import { metersPerPixel } from "@/shared/utils/geo";

/** Bar geometry: four 100 km segments, labelled `0 100 200 300 400 km` per the reference. */
const LABELS = ["0", "100", "200", "300", "400 km"];
const SEGMENT_METERS = 100_000;
/** Below this zoom the bar would outgrow the map, so it is hidden rather than clipped. */
const MIN_ZOOM = 3;

export interface ScaleBarProps {
  map: MapLibreMap | null;
}

/**
 * Bottom-left scale bar: alternating light/dark segments whose width tracks the map's ground
 * resolution. Decorative (`aria-hidden`) — it mirrors map state the user already perceives.
 */
export function ScaleBar({ map }: ScaleBarProps) {
  const [resolution, setResolution] = useState<number | null>(null);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      setZoom(map.getZoom());
      setResolution(metersPerPixel(map.getCenter().lat, map.getZoom()));
    };
    update();
    map.on("zoom", update);
    map.on("moveend", update);
    return () => {
      map.off("zoom", update);
      map.off("moveend", update);
    };
  }, [map]);

  if (resolution === null || zoom < MIN_ZOOM) return null;

  const segmentWidth = SEGMENT_METERS / resolution;
  const totalWidth = segmentWidth * (LABELS.length - 1);

  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      <div className="flex h-1.5">
        {LABELS.slice(0, -1).map((label, index) => (
          <span
            key={label}
            className={`h-full border border-[var(--color-chrome-border)] ${
              index % 2 === 0
                ? "bg-[var(--color-text)]"
                : "bg-[var(--color-bg)]"
            }`}
            style={{ width: `${segmentWidth}px` }}
          />
        ))}
      </div>
      <div
        className="flex justify-between text-caption text-[var(--color-text)] tabular-nums"
        style={{ width: `${totalWidth}px` }}
      >
        {LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
