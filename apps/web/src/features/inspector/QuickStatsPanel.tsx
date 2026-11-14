import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Clock,
  Flame,
  Map as MapIcon,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { QUICK_STATS } from "@/fixtures/sample-dashboard";
import { Badge } from "@/shared/ui/Badge";
import { useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUiStore } from "@/stores/uiStore";

const ICONS: readonly LucideIcon[] = [MapIcon, TrendingUp, Clock];

type TabId = "summary" | "landslides" | "climate" | "outlook";

export function QuickStatsPanel() {
  const [tab, setTab] = useState<TabId>("summary");
  const tables = useDatasetStore((state) => state.tables);
  const setCurrentDate = useDatasetStore((state) => state.setCurrentDate);
  const setVisibility = useLayerStore((state) => state.setVisibility);
  const requestFlyTo = useUiStore((state) => state.requestFlyTo);
  const inspectCoordinate = useSelectionStore(
    (state) => state.inspectCoordinate,
  );

  const landslides = tables?.landslidesRanked ?? [];
  const aoiMonthly = tables?.aoiMonthlyMeans ?? [];
  const outlookRows = tables?.outlookScenario ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Sub-navigation tabs for Overview, Ranked Landslides, MODIS Climate Series, and El Nino Scenario */}
      <div
        role="tablist"
        aria-label="Analytics views"
        className="grid grid-cols-4 gap-1 rounded-[var(--radius-sm)] bg-[var(--color-fill-2)] p-0.5"
      >
        {(
          [
            { id: "summary", label: "Stats" },
            { id: "landslides", label: "Slides" },
            { id: "climate", label: "Series" },
            { id: "outlook", label: "Outlook" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-[4px] py-1 text-caption font-medium transition-colors ${
              tab === item.id
                ? "bg-[var(--color-panel)] text-[var(--color-text)] shadow-[var(--shadow-1)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
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
                    <span className="font-display text-label text-[var(--color-text)] tabular-nums">
                      {stat.value}
                    </span>
                    {stat.badge ? <Badge>{stat.badge}</Badge> : null}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      ) : null}

      {tab === "landslides" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-caption text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1 font-medium text-[var(--color-text)]">
              <Flame size={13} className="text-[var(--color-danger)]" />
              Post-8 Jun M7.8 Ranked Sites
            </span>
            <span className="font-display tabular-nums">
              {landslides.length || 152} clusters
            </span>
          </div>

          {landslides.length === 0 ? (
            <p className="text-caption text-[var(--color-text-muted)]">
              Loading ranked landslide clusters from tables.json...
            </p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-0.5">
              {landslides.slice(0, 25).map((site) => (
                <li key={site.rank}>
                  <button
                    type="button"
                    onClick={() => {
                      setVisibility("earthquake-landslide-candidates", true);
                      setVisibility("landslide-polygons", true);
                      requestFlyTo(
                        site.lng,
                        site.lat,
                        13,
                        `${site.barangay}, ${site.municipality}`,
                      );
                      void inspectCoordinate(
                        site.lng,
                        site.lat,
                        `${site.barangay}, ${site.municipality} (${site.province})`,
                      );
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-panel-border)] bg-[var(--color-fill-1)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-fill-2)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-caption font-medium text-[var(--color-text)]">
                        #{site.rank} {site.barangay}, {site.municipality}
                      </div>
                      <div className="font-display text-[11px] text-[var(--color-text-muted)] tabular-nums">
                        {site.province} · {site.slopeDeg}° slope · {site.elevM}{" "}
                        m · EVI {site.eviBefore}→{site.eviAfter}
                      </div>
                    </div>
                    <span className="shrink-0 rounded bg-[var(--color-fill-3)] px-1.5 py-0.5 font-display text-caption font-semibold text-[var(--color-danger)] tabular-nums">
                      {site.areaHa.toFixed(1)} ha
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "climate" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-caption">
            <span className="font-medium text-[var(--color-text)]">
              AOI Monthly NDVI & Day LST (2025–2026)
            </span>
            <span className="font-display text-[var(--color-accent)] tabular-nums">
              {aoiMonthly.length} mos
            </span>
          </div>

          {aoiMonthly.length > 1 ? (
            <div className="flex flex-col gap-2">
              {/* Hand-crafted SVG Dual Sparkline Chart (O1: zero external chart library) */}
              <svg
                viewBox="0 0 260 90"
                className="h-24 w-full overflow-visible rounded-[var(--radius-sm)] border border-[var(--color-panel-border)] bg-[var(--color-fill-1)] p-2"
                role="img"
                aria-label="AOI Monthly NDVI and Daytime Land Temperature chart"
              >
                {(() => {
                  const pts = aoiMonthly.filter((r) => r.lstCoverPct > 10);
                  if (pts.length < 2) return null;
                  const ndviMin = 0.75;
                  const ndviMax = 0.88;
                  const lstMin = 24.0;
                  const lstMax = 28.0;

                  const ndviPath = pts
                    .map((r, i) => {
                      const x = 8 + (i / (pts.length - 1)) * 244;
                      const y =
                        78 -
                        ((r.ndviMean - ndviMin) / (ndviMax - ndviMin)) * 66;
                      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ");

                  const lstPath = pts
                    .map((r, i) => {
                      const x = 8 + (i / (pts.length - 1)) * 244;
                      const y =
                        78 -
                        ((r.lstDayMeanC - lstMin) / (lstMax - lstMin)) * 66;
                      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ");

                  return (
                    <>
                      <path
                        d={ndviPath}
                        fill="none"
                        stroke="var(--color-success)"
                        strokeWidth="2"
                      />
                      <path
                        d={lstPath}
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth="1.75"
                        strokeDasharray="3 2"
                      />
                    </>
                  );
                })()}
              </svg>

              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                  NDVI Mean (0.78–0.86)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                  LST Day (24.7–27.1 °C)
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-panel-border)]">
                <table className="w-full text-left font-display text-[11px] tabular-nums">
                  <thead className="bg-[var(--color-panel-header)] text-[var(--color-text-secondary)]">
                    <tr>
                      <th className="px-2 py-1">Month</th>
                      <th className="px-2 py-1">NDVI</th>
                      <th className="px-2 py-1">LST °C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aoiMonthly.slice(-10).map((row) => (
                      <tr
                        key={row.month}
                        onClick={() => setCurrentDate(row.month)}
                        className="cursor-pointer border-t border-[var(--color-panel-border)] hover:bg-[var(--color-fill-2)]"
                      >
                        <td className="px-2 py-1 font-medium text-[var(--color-text)]">
                          {row.month}
                        </td>
                        <td className="px-2 py-1 text-[var(--color-success)]">
                          {row.ndviMean.toFixed(3)}
                        </td>
                        <td className="px-2 py-1 text-[var(--color-accent)]">
                          {row.lstDayMeanC.toFixed(1)}°
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-caption text-[var(--color-text-muted)]">
              Loading monthly MODIS & HLS series...
            </p>
          )}
        </div>
      ) : null}

      {tab === "outlook" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-caption">
            <span className="flex items-center gap-1 font-medium text-[var(--color-text)]">
              <Activity size={13} className="text-[var(--color-warning)]" />
              El Nino Scenario (Nov 2026–Oct 2027)
            </span>
          </div>

          {outlookRows.length > 0 ? (
            <div className="max-h-52 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-panel-border)]">
              <table className="w-full text-left font-display text-[11px] tabular-nums">
                <thead className="bg-[var(--color-panel-header)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-2 py-1">Month</th>
                    <th className="px-2 py-1">Rain</th>
                    <th className="px-2 py-1">EVI Δ</th>
                    <th className="px-2 py-1">LST Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {outlookRows.map((row) => (
                    <tr
                      key={row.month}
                      onClick={() => {
                        setVisibility("outlook-evi-anomaly", true);
                        setCurrentDate(row.month);
                      }}
                      className="cursor-pointer border-t border-[var(--color-panel-border)] hover:bg-[var(--color-fill-2)]"
                    >
                      <td className="px-2 py-1 font-medium text-[var(--color-text)]">
                        {row.month}
                      </td>
                      <td className="px-2 py-1 text-[var(--color-text-secondary)]">
                        {Math.round(row.rainExpectedMm)} mm ({row.rainPctNormal}
                        %)
                      </td>
                      <td
                        className={`px-2 py-1 ${
                          row.eviAnomalyMean < -0.03
                            ? "text-[var(--color-danger)]"
                            : "text-[var(--color-text)]"
                        }`}
                      >
                        {row.eviAnomalyMean > 0 ? "+" : ""}
                        {row.eviAnomalyMean.toFixed(3)}
                      </td>
                      <td
                        className={`px-2 py-1 ${
                          row.lstDayAnomalyC > 0.5
                            ? "text-[var(--color-danger)]"
                            : "text-[var(--color-text)]"
                        }`}
                      >
                        {row.lstDayAnomalyC > 0 ? "+" : ""}
                        {row.lstDayAnomalyC.toFixed(2)}°
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-caption text-[var(--color-text-muted)]">
              Loading 12-month El Nino scenario table...
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
