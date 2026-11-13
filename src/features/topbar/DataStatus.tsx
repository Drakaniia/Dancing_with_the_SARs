import { DATA_STATUS } from "@/fixtures/sample-dashboard";
import { StatusPill } from "@/shared/ui/StatusPill";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useUiStore } from "@/stores/uiStore";

/**
 * Global NISAR data status pill. Clicking opens the Provenance & Caveats modal (spec §6.4, D18).
 */
export function DataStatus() {
  const manifest = useDatasetStore((state) => state.manifest);
  const datasets = useDatasetStore((state) => state.datasets);
  const tileErrorCount = useDatasetStore((state) => state.tileErrorCount);
  const layers = useLayerStore((state) => state.layers);
  const setProvenanceOpen = useUiStore((state) => state.setProvenanceOpen);

  const loaded = datasets.length > 0;
  const dataLayerCount = layers.filter(
    (l) => l.kind === "manifest-layer" || l.kind === "change-type",
  ).length;

  const label = !loaded
    ? "Loading NISAR data..."
    : tileErrorCount > 0
      ? `${dataLayerCount} layers · ${tileErrorCount} tile warning(s)`
      : manifest
        ? `${dataLayerCount} layers · ${manifest.dates.length} dates (7ea38ff)`
        : DATA_STATUS.label;

  return (
    <button
      type="button"
      onClick={() => setProvenanceOpen(true)}
      aria-label="Open data provenance and caveats"
      className="rounded-[var(--radius-pill)] transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:outline-none"
    >
      <StatusPill status={loaded ? DATA_STATUS.state : "loading"}>
        {label}
      </StatusPill>
    </button>
  );
}
