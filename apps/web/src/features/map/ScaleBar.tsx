import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useState } from "react";
import { SCALE_BAR } from "@/fixtures/sample-dashboard";
import { metersPerPixel } from "@/shared/utils/geo";

const SEGMENT_METERS = 10_000;
const MIN_ZOOM = 3;

export interface ScaleBarProps {
  map: MapLibreMap | null;
}

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

  const rawSegmentWidth = SEGMENT_METERS / resolution;
  const segmentWidth = Math.min(Math.max(rawSegmentWidth, 24), 56);
  const totalWidth = segmentWidth * (SCALE_BAR.length - 1);

  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      <div className="flex h-1.5">
        {SCALE_BAR.slice(0, -1).map((label, index) => (
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
        {SCALE_BAR.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
