import { CheckCircle2, X } from "lucide-react";
import { useToastStore } from "@/stores/toastStore";

/**
 * Short confirmations, stacked at the top centre of the window. An `<output>` (implicit
 * role=status) so screen readers announce each one politely.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <output
      aria-live="polite"
      className="pointer-events-none fixed top-16 left-1/2 z-[var(--z-toast)] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-[min(28rem,90vw)] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-chrome-border)] bg-[var(--color-panel)] py-2 pr-2 pl-3 text-body text-[var(--color-text)] shadow-[var(--shadow-pop)]"
        >
          <CheckCircle2
            aria-hidden="true"
            size={16}
            className="shrink-0 text-[var(--color-success)]"
          />
          <span className="min-w-0 flex-1 truncate">{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(toast.id)}
            className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-fill-2)] hover:text-[var(--color-text)]"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </output>
  );
}
