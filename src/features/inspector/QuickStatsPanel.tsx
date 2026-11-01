import type { LucideIcon } from "lucide-react";
import { Clock, Map as MapIcon, TrendingUp } from "lucide-react";
import { QUICK_STATS } from "@/fixtures/sample-dashboard";
import { Badge } from "@/shared/ui/Badge";

/** One leading icon per stat row, in reference order: area, change, last update. */
const ICONS: readonly LucideIcon[] = [MapIcon, TrendingUp, Clock];

/**
 * Quick Stats: three fixture-backed rows, each with a leading icon, a label, a tabular readout and
 * an optional badge. Recomputed from the dataset once datasets are loaded at runtime.
 */
export function QuickStatsPanel() {
  return (
    <dl className="flex flex-col gap-2.5">
      {QUICK_STATS.map((stat, index) => {
        const Icon = ICONS[index] ?? MapIcon;

        return (
          <div key={stat.id} className="flex items-start gap-2">
            <Icon
              aria-hidden="true"
              size={16}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0 text-[var(--color-accent-cyan)]"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <dt className="text-caption text-[var(--color-text-secondary)]">
                {stat.label}
              </dt>
              <dd className="flex items-center gap-1.5">
                <span className="text-label text-[var(--color-text)] tabular-nums">
                  {stat.value}
                </span>
                {stat.badge ? <Badge>{stat.badge}</Badge> : null}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
