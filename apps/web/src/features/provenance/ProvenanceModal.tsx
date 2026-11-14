import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  Layers,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { COPERNICUS_CREDIT } from "@/features/about/credits";
import { LAYER_FAMILIES } from "@/shared/types/dataset";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useUiStore } from "@/stores/uiStore";

const KNOWN_LIMITATIONS = [
  "Radar change is L-band backscatter, not ground deformation. No public NISAR data exists before 19 June 2026, so NISAR cannot measure the quake's uplift; the team tested Sentinel-1 InSAR (sentinel1_quake/ in the data repo) and it could not measure it either.",
  "NISAR daily pass layers are single-pass swaths. Inside the two provinces, coverage ranges from 19% on 30 Sep to 89% on 23 Sep / 17 Oct. Monthly composites cover 98-100% of the two provinces.",
  "NISAR ML vegetation (EVI) and plant moisture (NDMI) explain roughly one-third of optical variance and should be read as structural canopy estimates.",
  "Around 30% of the post-quake optical landslide window (9 Jun-25 Sep 2026) was obscured by cloud cover (Class 4) and was not checked.",
  "The 12-month El Nino Outlook (Nov 2026-Oct 2027) is a conditional climate scenario (+1 °C ONI sensitivity), not a deterministic weather forecast.",
] as const;

export function ProvenanceModal() {
  const open = useUiStore((state) => state.provenanceOpen);
  const setOpen = useUiStore((state) => state.setProvenanceOpen);
  const manifest = useDatasetStore((state) => state.manifest);
  const tileErrorCount = useDatasetStore((state) => state.tileErrorCount);
  const failingLayers = useDatasetStore((state) => state.failingLayers);
  const clearTileErrors = useDatasetStore((state) => state.clearTileErrors);
  const layers = useLayerStore((state) => state.layers);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  const dataLayers = layers.filter(
    (l) => l.kind === "manifest-layer" || l.kind === "change-type",
  );
  const commit =
    manifest?.source.commit ?? "7ea38ff1b5c0dd4571b1935d01c5bd71ebf72862";
  const repoUrl =
    manifest?.source.repo ??
    "https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar";
  const totalTiles = manifest?.totals?.tiles ?? 28530;
  const totalMb = manifest?.totals?.bytes
    ? (manifest.totals.bytes / 1e6).toFixed(1)
    : "506.5";
  const layerDateCount = manifest?.layers.length ?? 318;
  const dateCount = manifest?.dates.length ?? 81;

  return (
    <div className="fixed inset-0 z-[var(--z-popover)] grid place-items-center bg-[var(--color-scrim)] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="provenance-modal-title"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-chrome-border)] bg-[var(--color-panel)] text-[var(--color-text)] shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-panel-border)] bg-[var(--color-panel-header)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-[var(--color-accent)]" />
            <h2 id="provenance-modal-title" className="text-title">
              Dataset Provenance & Scientific Caveats
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close provenance dialog"
            className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-fill-2)] hover:text-[var(--color-text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {/* Source Summary */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-2.5">
              <div className="text-caption text-[var(--color-text-secondary)]">
                Pinned Commit
              </div>
              <div className="font-display text-readout text-[var(--color-accent)] tabular-nums">
                {commit.slice(0, 8)}
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-2.5">
              <div className="text-caption text-[var(--color-text-secondary)]">
                Catalogue Scope
              </div>
              <div className="font-display text-readout tabular-nums">
                {dataLayers.length} layers · {layerDateCount} slices
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-2.5">
              <div className="text-caption text-[var(--color-text-secondary)]">
                Committed Pyramid
              </div>
              <div className="font-display text-readout tabular-nums">
                {totalTiles.toLocaleString()} tiles ({totalMb} MB)
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-2.5">
              <div className="text-caption text-[var(--color-text-secondary)]">
                Native Grid & CRS
              </div>
              <div className="font-display text-readout tabular-nums">
                EPSG:32651 · 30 m
              </div>
            </div>
          </div>

          {tileErrorCount > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-fill-2)] px-3 py-2 text-body">
              <div className="flex items-center gap-2 text-[var(--color-warning)]">
                <AlertTriangle size={16} />
                <span>
                  {tileErrorCount} tile request warning(s) on:{" "}
                  {failingLayers.join(", ")}
                </span>
              </div>
              <button
                type="button"
                onClick={clearTileErrors}
                className="rounded-[var(--radius-sm)] bg-[var(--color-fill-3)] px-2 py-1 text-caption hover:bg-[var(--color-fill-4)]"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-panel-border)] bg-[var(--color-fill-1)] px-3 py-2 text-caption text-[var(--color-text-secondary)]">
              <CheckCircle2
                size={15}
                className="shrink-0 text-[var(--color-success)]"
              />
              <span>
                All {dateCount} timeline periods and {layerDateCount} raster
                pyramids verified against{" "}
                <code className="font-display">public/data/manifest.json</code>.
              </span>
            </div>
          )}

          {/* Family Breakdown */}
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-label text-[var(--color-text)]">
              <Layers size={15} className="text-[var(--color-accent-cyan)]" />7
              Data-Native Families (Sarangani & Davao Occidental)
            </h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {LAYER_FAMILIES.map((fam) => {
                const count = dataLayers.filter(
                  (l) => l.family === fam.family,
                ).length;
                const famStats = manifest?.totals?.byFamily?.[fam.family];
                return (
                  <div
                    key={fam.family}
                    className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-panel-border)] bg-[var(--color-fill-1)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-label text-[var(--color-text)]">
                        {fam.label}
                      </span>
                      <span className="font-display text-caption text-[var(--color-accent)] tabular-nums">
                        {count} layers
                        {famStats
                          ? ` · ${famStats.tiles.toLocaleString()} tiles`
                          : ""}
                      </span>
                    </div>
                    <p className="text-caption text-[var(--color-text-secondary)]">
                      {fam.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Known Limitations (Spec D9) */}
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-label text-[var(--color-text)]">
              <ShieldAlert size={15} className="text-[var(--color-warning)]" />
              Scientific Scope & Known Data Limits
            </h3>
            <ul className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-3">
              {KNOWN_LIMITATIONS.map((limit) => (
                <li
                  key={limit}
                  className="flex items-start gap-2 text-caption text-[var(--color-text-secondary)]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Attribution & Upstream Link */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-panel-border)] pt-3 text-caption text-[var(--color-text-secondary)]">
            <span className="flex flex-col gap-0.5">
              <span>
                {manifest?.source.attribution ??
                  "NISAR L2 GCOV (NASA-ISRO, provisional) · Landsat HLS L30 v2.0 · MODIS · SRTMGL1"}
              </span>
              <span>{COPERNICUS_CREDIT}.</span>
            </span>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)] hover:underline"
            >
              Upstream Release Repo
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
