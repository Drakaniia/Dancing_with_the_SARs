import { GripVertical, Ruler, X } from "lucide-react";
import { useRef } from "react";
import { formatCoords } from "@/features/inspector/LocationInfoPanel";
import { AnimationBar } from "@/features/timeline/AnimationBar";
import { resolveManifestEntry, useDatasetStore } from "@/stores/datasetStore";
import { useActiveLayer } from "@/stores/layerStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUiStore } from "@/stores/uiStore";
import { MapControls } from "./MapControls";
import { NorthIndicator } from "./NorthIndicator";
import { TileOverlay } from "./overlays/TileOverlay";
import { ScaleBar } from "./ScaleBar";
import { useMapLibre } from "./useMapLibre";

const FALLBACK_MESSAGE = {
  unsupported: "Map unavailable — WebGL is required",
  error: "Map failed to load",
} as const;

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, status } = useMapLibre(containerRef);
  const failed = status === "unsupported" || status === "error";

  const active = useActiveLayer();
  const manifest = useDatasetStore((state) => state.manifest);
  const currentDate = useDatasetStore((state) => state.currentDate);
  const comparisonEnabled = useDatasetStore((state) => state.comparisonEnabled);
  const comparisonMode = useDatasetStore((state) => state.comparisonMode);
  const comparisonDate = useDatasetStore((state) => state.comparisonDate);
  const splitPosition = useDatasetStore((state) => state.splitPosition);
  const setSplitPosition = useDatasetStore((state) => state.setSplitPosition);

  const selected = useSelectionStore((state) => state.selected);
  const activeTool = useUiStore((state) => state.activeTool);
  const measurePoints = useUiStore((state) => state.measurePoints);
  const clearMeasurePoints = useUiStore((state) => state.clearMeasurePoints);

  const { resolvedPeriod, exact } = resolveManifestEntry(
    manifest,
    active?.id ?? "",
    currentDate,
  );

  const measuredKm =
    measurePoints.length === 2
      ? haversineKm(measurePoints[0], measurePoints[1])
      : null;

  return (
    <div
      id="nisar-map-viewport"
      className="relative h-full w-full overflow-hidden bg-[var(--color-bg-elevated)]"
    >
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

      {/* Interactive Split Curtain when Before / After Comparison is active */}
      {comparisonEnabled ? (
        <div className="pointer-events-none absolute inset-0 z-[15]">
          <div
            className="pointer-events-auto absolute inset-y-0 w-1 -translate-x-1/2 cursor-ew-resize bg-[var(--color-accent)] shadow-[var(--shadow-2)]"
            style={{ left: `${splitPosition}%` }}
            role="slider"
            tabIndex={0}
            aria-label="Comparison split curtain"
            aria-valuemin={5}
            aria-valuemax={95}
            aria-valuenow={Math.round(splitPosition)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setSplitPosition(splitPosition - 5);
              if (e.key === "ArrowRight") setSplitPosition(splitPosition + 5);
            }}
            onPointerDown={(e) => {
              const parent = e.currentTarget.parentElement;
              if (!parent) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              const move = (ev: PointerEvent) => {
                const rect = parent.getBoundingClientRect();
                const pct = ((ev.clientX - rect.left) / rect.width) * 100;
                setSplitPosition(pct);
              };
              const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
          >
            <span className="absolute top-1/2 left-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-chrome-border)] bg-[var(--color-panel)] text-[var(--color-text)] shadow-[var(--shadow-2)]">
              <GripVertical size={15} />
            </span>
          </div>

          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-chrome-border)] bg-[var(--color-panel)] px-3 py-1.5 text-caption text-[var(--color-text)] shadow-[var(--shadow-1)]">
            <span className="font-medium text-[var(--color-accent)]">
              {comparisonMode === "split" ? "Before" : "Baseline"}:
            </span>
            <span className="font-display tabular-nums">
              {comparisonDate ?? "2026-09"}
            </span>
            <span className="text-[var(--color-text-muted)]">vs</span>
            <span className="font-medium text-[var(--color-accent-cyan)]">
              Current:
            </span>
            <span className="font-display tabular-nums">
              {resolvedPeriod ?? currentDate}
            </span>
          </div>
        </div>
      ) : null}

      {/* Top-left HUD badge: active dataset period snap + measure/inspect readout */}
      <div className="pointer-events-none absolute inset-0 z-[var(--z-map-chrome)]">
        <div className="pointer-events-auto absolute top-3 left-3 flex flex-col gap-2">
          {active && !exact && resolvedPeriod ? (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-chrome-border)] bg-[var(--color-panel)] px-3 py-1.5 text-caption text-[var(--color-text)] shadow-[var(--shadow-1)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
              <span>
                Showing nearest period for{" "}
                <strong className="font-medium">{active.name}</strong>:{" "}
                <span className="font-display tabular-nums">
                  {resolvedPeriod}
                </span>
              </span>
            </div>
          ) : null}

          {activeTool === "measure" ? (
            <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-chrome-border)] bg-[var(--color-panel)] px-3 py-1.5 text-caption text-[var(--color-text)] shadow-[var(--shadow-1)]">
              <Ruler size={14} className="text-[var(--color-accent)]" />
              {measurePoints.length === 0 ? (
                <span>Click first point on map to measure distance</span>
              ) : measurePoints.length === 1 ? (
                <span>
                  Origin:{" "}
                  <span className="font-display tabular-nums">
                    {formatCoords({
                      lng: measurePoints[0][0],
                      lat: measurePoints[0][1],
                    })}
                  </span>{" "}
                  · Click second point
                </span>
              ) : (
                <span>
                  Distance:{" "}
                  <strong className="font-display text-[var(--color-accent)] tabular-nums">
                    {measuredKm?.toFixed(2)} km
                  </strong>{" "}
                  ({((measuredKm ?? 0) * 1000).toFixed(0)} m)
                </span>
              )}
              {measurePoints.length > 0 ? (
                <button
                  type="button"
                  onClick={clearMeasurePoints}
                  aria-label="Clear measurement"
                  className="rounded p-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-fill-2)] hover:text-[var(--color-text)]"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          ) : null}

          {selected && !comparisonEnabled ? (
            <div className="hidden items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-chrome-border)] bg-[var(--color-panel)] px-2.5 py-1 text-caption text-[var(--color-text-secondary)] shadow-[var(--shadow-1)] sm:flex">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
              <span className="font-display text-[var(--color-text)] tabular-nums">
                {formatCoords(selected)}
              </span>
              {selected.placeName ? (
                <span className="max-w-[14rem] truncate">
                  · {selected.placeName}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

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
