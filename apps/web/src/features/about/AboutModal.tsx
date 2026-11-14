import { isTauri } from "@tauri-apps/api/core";
import { ExternalLink, Info, Satellite, Scale, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useUiStore } from "@/stores/uiStore";
import {
  COPERNICUS_CREDIT,
  CREDITS_DOCS_URL,
  DATA_CREDITS,
  LICENSE_URL,
} from "./credits";

const LINK =
  "inline-flex items-center gap-1 font-medium text-[var(--color-accent)] hover:underline";

function useAppVersion(open: boolean): string | null {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    if (!open || version || !isTauri()) return;
    let cancelled = false;
    import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then((v) => {
        if (!cancelled) setVersion(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, version]);
  return version;
}

export function AboutModal() {
  const open = useUiStore((state) => state.aboutOpen);
  const setOpen = useUiStore((state) => state.setAboutOpen);
  const version = useAppVersion(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-popover)] grid place-items-center bg-[var(--color-scrim)] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        className="flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-chrome-border)] bg-[var(--color-panel)] text-[var(--color-text)] shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-panel-border)] bg-[var(--color-panel-header)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-[var(--color-accent)]" />
            <h2 id="about-modal-title" className="text-title">
              About & Credits
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close about dialog"
            className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-fill-2)] hover:text-[var(--color-text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-1">
            <p className="text-label text-[var(--color-text)]">
              NISAR Surface Change Monitor
              {version ? (
                <span className="ml-2 font-display text-caption text-[var(--color-text-secondary)] tabular-nums">
                  v{version}
                </span>
              ) : null}
            </p>
            <p className="text-caption text-[var(--color-text-secondary)]">
              Built by The Cartographers for the NASA Space Apps Challenge
              2026.
            </p>
          </div>

          <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-panel-border)] bg-[var(--color-fill-1)] px-3 py-2 text-body text-[var(--color-text)]">
            <Satellite
              size={16}
              className="mt-0.5 shrink-0 text-[var(--color-accent-cyan)]"
            />
            <span>{COPERNICUS_CREDIT}.</span>
          </p>

          {DATA_CREDITS.map((group) => (
            <section key={group.title} className="flex flex-col gap-1.5">
              <h3 className="text-label text-[var(--color-text)]">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="text-caption text-[var(--color-text-secondary)]"
                  >
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[var(--color-text)] hover:underline"
                      >
                        {item.label}
                      </a>
                    ) : (
                      item.label
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-panel-border)] pt-3 text-caption text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <Scale size={14} />
              Code: MIT License, © 2026 The Cartographers
            </span>
            <span className="flex items-center gap-3">
              <a href={LICENSE_URL} target="_blank" rel="noreferrer" className={LINK}>
                License
                <ExternalLink size={13} />
              </a>
              <a
                href={CREDITS_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className={LINK}
              >
                Full credits
                <ExternalLink size={13} />
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
