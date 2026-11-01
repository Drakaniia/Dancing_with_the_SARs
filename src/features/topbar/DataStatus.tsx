import { DATA_STATUS } from "@/fixtures/sample-dashboard";
import { StatusPill } from "@/shared/ui/StatusPill";
import { useDatasetStore } from "@/stores/datasetStore";

/**
 * Global NISAR data state, mirrored from `datasetStore`. A populated dataset store reads the
 * fixture's "loaded" label; an empty one reads as still loading.
 */
export function DataStatus() {
  const loaded = useDatasetStore((state) => state.datasets.length > 0);

  return (
    <StatusPill status={loaded ? DATA_STATUS.state : "loading"}>
      {loaded ? DATA_STATUS.label : "Loading NISAR data…"}
    </StatusPill>
  );
}
