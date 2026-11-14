import type { Map as MapLibreMap } from "maplibre-gl";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { REDUCED_MOTION, SPRING_UI } from "@/styles/tokens";

export interface NorthIndicatorProps {
  map: MapLibreMap | null;
}

/**
 * Small north indicator above the scale bar. The rose rotates against the map bearing on the UI
 * spring, so `N` always points to true north. Decorative (`aria-hidden`).
 */
export function NorthIndicator({ map }: NorthIndicatorProps) {
  const [bearing, setBearing] = useState(0);
  const reducedMotion = useReducedMotion();

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

  return (
    <div
      aria-hidden="true"
      className="glass grid h-8 w-8 place-items-center rounded-full border border-[var(--color-chrome-border)] text-[var(--color-text)] shadow-[var(--shadow-2)]"
    >
      <motion.span
        className="grid h-full w-full place-items-center"
        animate={{ rotate: -bearing }}
        transition={reducedMotion ? REDUCED_MOTION : SPRING_UI}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
          <path
            d="M12 1.5 15.5 13 12 11 8.5 13Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M12 22.5 8.5 13 12 15 15.5 13Z"
            fill="currentColor"
            opacity="0.55"
          />
        </svg>
      </motion.span>
    </div>
  );
}
