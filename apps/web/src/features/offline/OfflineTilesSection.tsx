import { isTauri } from "@tauri-apps/api/core";
import { ExternalLink } from "lucide-react";
import { DESKTOP_DOWNLOAD_URL } from "@/features/about/credits";
import { Progress } from "@/shared/ui/Progress";
import { useOfflineTilesStore } from "@/stores/offlineTilesStore";
import { offlineTilesAvailable } from "./tileCache";
import { formatBytes } from "./tileIndex";

const BUTTON =
  "h-7 rounded-[var(--radius-sm)] px-2.5 text-caption disabled:opacity-50";
const PRIMARY = `${BUTTON} bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:brightness-95`;
const SECONDARY = `${BUTTON} bg-[var(--color-fill-3)] text-[var(--color-text)] hover:bg-[var(--color-fill-4)]`;

/** Browser build: offline tiles need the desktop cache, so point to the installers instead. */
function DesktopAppPrompt() {
  return (
    <section
      aria-label="Offline map tiles"
      className="flex flex-col gap-2 border-t border-[var(--color-panel-border)] pt-3"
    >
      <span className="text-label text-[var(--color-text)]">
        Offline Map Tiles
      </span>
      <p className="text-caption text-[var(--color-text-secondary)]">
        The web version streams map overlays from the internet. To use the map
        offline, get the desktop app.
      </p>
      <a
        href={DESKTOP_DOWNLOAD_URL}
        target="_blank"
        rel="noreferrer"
        className={`${PRIMARY} inline-flex w-fit items-center gap-1`}
      >
        Get the desktop app
        <ExternalLink size={13} />
      </a>
    </section>
  );
}

/**
 * Settings entry for the hybrid tile mode: tiles stream from the remote host by
 * default, and this downloads the whole pyramid into the desktop tile cache.
 * The browser build shows a link to the desktop app instead; nothing renders on
 * desktop when no remote host is configured.
 */
export function OfflineTilesSection({
  available = offlineTilesAvailable(),
  desktop = typeof window !== "undefined" && isTauri(),
}: {
  available?: boolean;
  desktop?: boolean;
}) {
  const phase = useOfflineTilesStore((s) => s.phase);
  const done = useOfflineTilesStore((s) => s.done);
  const total = useOfflineTilesStore((s) => s.total);
  const bytesDone = useOfflineTilesStore((s) => s.bytesDone);
  const bytesTotal = useOfflineTilesStore((s) => s.bytesTotal);
  const error = useOfflineTilesStore((s) => s.error);
  const saved = useOfflineTilesStore((s) => s.saved);
  const start = useOfflineTilesStore((s) => s.start);
  const cancel = useOfflineTilesStore((s) => s.cancel);
  const remove = useOfflineTilesStore((s) => s.remove);

  if (!available) return desktop ? null : <DesktopAppPrompt />;

  const busy = phase === "checking" || phase === "downloading";

  let status: string;
  if (phase === "checking") status = "Checking the tile index...";
  else if (phase === "downloading")
    status = `${done.toLocaleString()} / ${total.toLocaleString()} tiles · ${formatBytes(bytesDone)} of ${formatBytes(bytesTotal)}`;
  else if (phase === "cancelled")
    status = "Download paused. Resume to fetch the remaining tiles.";
  else if (saved)
    status = `Saved for offline use · ${saved.count.toLocaleString()} tiles · ${formatBytes(saved.bytes)}`;
  else
    status =
      "Map overlays stream from the internet. Download them once (about 500 MB) to use the map offline.";

  return (
    <section
      aria-label="Offline map tiles"
      className="flex flex-col gap-2 border-t border-[var(--color-panel-border)] pt-3"
    >
      <span className="text-label text-[var(--color-text)]">
        Offline Map Tiles
      </span>
      <p
        className="text-caption text-[var(--color-text-secondary)]"
        aria-live="polite"
      >
        {status}
      </p>
      {phase === "downloading" ? (
        <Progress value={done} max={total} label="Offline tile download" />
      ) : null}
      {error && phase === "error" ? (
        <p className="text-caption text-[var(--color-danger)]">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {busy ? (
          <button type="button" onClick={cancel} className={SECONDARY}>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className={PRIMARY}
          >
            {phase === "cancelled" || phase === "error"
              ? "Resume download"
              : saved
                ? "Check for updates"
                : "Download for offline"}
          </button>
        )}
        {saved || phase === "cancelled" || phase === "error" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className={SECONDARY}
          >
            Remove offline tiles
          </button>
        ) : null}
      </div>
    </section>
  );
}
