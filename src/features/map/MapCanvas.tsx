import { useRef } from "react";
import { AnimationBar } from "@/features/timeline/AnimationBar";
import { MapControls } from "./MapControls";
import { NorthIndicator } from "./NorthIndicator";
import { TileOverlay } from "./overlays/TileOverlay";
import { ScaleBar } from "./ScaleBar";
import { useMapLibre } from "./useMapLibre";

const FALLBACK_MESSAGE = {
  unsupported: "Map unavailable — WebGL is required",
  error: "Map failed to load",
} as const;

/**
 * The center map cell: the MapLibre container plus every floating piece of chrome. Chrome is
 * layered above the canvas and only the controls themselves take pointer events, so dragging
 * anywhere else still pans the map.
 */
export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, status } = useMapLibre(containerRef);
  const failed = status === "unsupported" || status === "error";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--color-bg-elevated)]">
      {/* `h-full w-full` rather than `absolute inset-0`: MapLibre's own `.maplibregl-map`
          rule sets `position: relative`, which wins over Tailwind's `absolute` utility and
          collapses an `absolute inset-0` container to zero height — clipping the canvas away. */}
      <div ref={containerRef} className="h-full w-full" />

      {failed ? (
        <div className="absolute inset-0 grid place-items-center p-6">
          <p className="text-body text-[var(--color-text-muted)]">
            {status === "unsupported"
              ? FALLBACK_MESSAGE.unsupported
              : FALLBACK_MESSAGE.error}
          </p>
        </div>
      ) : null}

      <TileOverlay map={map} ready={status === "ready"} />

      <div className="pointer-events-none absolute inset-0 z-[var(--z-map-chrome)]">
        <div className="pointer-events-auto absolute top-3 right-3">
          <MapControls map={map} />
        </div>
        <div className="pointer-events-auto absolute bottom-3 left-3 flex flex-col items-start gap-2">
          <NorthIndicator map={map} />
          <ScaleBar map={map} />
        </div>
      </div>

      <AnimationBar />
    </div>
  );
}
