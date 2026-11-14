import {
  Activity,
  ChevronDown,
  ChevronRight,
  CloudSun,
  type LucideIcon,
  Radar,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { ChangeTypeList } from "@/features/change-types/ChangeTypeList";
import type { LayerConfig } from "@/shared/types/layer";
import { resolveManifestEntry, useDatasetStore } from "@/stores/datasetStore";
import { useLayerStore } from "@/stores/layerStore";
import { useTopicStore } from "@/stores/topicStore";
import {
  type CustomLegend,
  findTopic,
  findView,
  TOPICS,
  type TopicId,
  type TopicView,
  type ViewOption,
} from "./topicsConfig";

const TOPIC_ICONS: Record<TopicId, LucideIcon> = {
  radar: Radar,
  quake: TriangleAlert,
  elnino: CloudSun,
  next: Activity,
};

const pill =
  "rounded-[var(--radius-pill)] border px-2.5 py-1 text-caption transition-colors duration-[var(--dur-fast)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:outline-none";
const pillOff =
  "border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[var(--color-text)] hover:bg-[var(--color-fill-2)]";
const pillOn =
  "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]";

function formatValue(value: number, units?: string): string {
  if (units === "probability") return `${Math.round(value * 100)}%`;
  if (Math.abs(value) >= 100) return String(Math.round(value));
  return String(Number(value.toFixed(Math.abs(value) < 1 ? 2 : 1)));
}

function rampGradient(stops: [number, string][]): string {
  const first = stops[0][0];
  const last = stops[stops.length - 1][0];
  const span = last - first || 1;
  return `linear-gradient(90deg, ${stops
    .map(([v, c]) => `${c} ${(((v - first) / span) * 100).toFixed(1)}%`)
    .join(", ")})`;
}

function LegendBar({
  background,
  min,
  mid,
  max,
}: {
  background: string;
  min: string;
  mid: string;
  max: string;
}) {
  return (
    <>
      <div
        className="mt-2 h-3 rounded-[var(--radius-pill)] border border-[var(--color-panel-border)]"
        style={{ background }}
      />
      <div className="mt-0.5 flex justify-between font-display text-[11px] text-[var(--color-text-muted)] tabular-nums">
        <span>{min}</span>
        <span>{mid}</span>
        <span>{max}</span>
      </div>
    </>
  );
}

function Keys({ keys }: { keys: { color: string; label: string }[] }) {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
      {keys.map((key) => (
        <li key={key.label} className="flex items-center gap-1.5 text-caption">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-[3px] border border-black/15"
            style={{ background: key.color }}
          />
          {key.label}
        </li>
      ))}
    </ul>
  );
}

/** Colour scale for the map on screen: a bar with numbers, or colour keys for categories. */
export function TopicLegend({
  view,
  layer,
  custom,
}: {
  view: TopicView;
  layer?: LayerConfig;
  custom?: CustomLegend;
}) {
  let body: ReactNode = null;
  if (custom?.keys) {
    body = <Keys keys={custom.keys} />;
  } else if (custom?.colors) {
    body = (
      <LegendBar
        background={`linear-gradient(90deg, ${custom.colors.join(", ")})`}
        min={custom.min ?? ""}
        mid={custom.mid ?? ""}
        max={custom.max ?? ""}
      />
    );
  } else if (layer?.classes && layer.classes.length > 0) {
    body = (
      <Keys
        keys={layer.classes.map((c) => ({
          color: c.color,
          label: c.label.replace("->", "→"),
        }))}
      />
    );
  } else if (layer?.ramp && layer.ramp.stops.length > 1) {
    const stops = layer.ramp.stops;
    const units = layer.units === "probability" ? "" : (layer.units ?? "");
    body = (
      <LegendBar
        background={rampGradient(stops)}
        min={formatValue(stops[0][0], layer.units)}
        mid={formatValue(stops[Math.floor(stops.length / 2)][0], layer.units)}
        max={`${formatValue(stops[stops.length - 1][0], layer.units)} ${units}`.trim()}
      />
    );
  }
  if (!body) return null;
  return (
    <div className="mt-3" aria-label="Colour scale">
      <p className="font-display text-[11px] font-semibold tracking-[0.06em] text-[var(--color-text-muted)] uppercase">
        Colour scale
      </p>
      {body}
      {view.lo && view.hi && !custom?.keys && !layer?.classes?.length ? (
        <div className="mt-1 flex justify-between text-[11px] text-[var(--color-text-secondary)]">
          <span>◀ {view.lo}</span>
          <span>{view.hi} ▶</span>
        </div>
      ) : null}
      {view.landslideDots ? (
        <ul className="mt-2 flex flex-col gap-1 text-caption">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full border-2 border-[#fff8e8] bg-[#a50f15] shadow-[0_0_0_1px_rgba(0,0,0,.2)]"
            />
            Possible landslide · NISAR sees bare ground (194)
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full border-2 border-[#fff8e8] bg-[#f39c3d] shadow-[0_0_0_1px_rgba(0,0,0,.2)]"
            />
            Possible landslide · not confirmed by radar (111)
          </li>
          <li className="text-[#b0221a]">★ M7.8 epicentre, 8 June 2026</li>
        </ul>
      ) : null}
    </div>
  );
}

function WhyNisar() {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-3">
      <p className="text-label font-semibold text-[var(--color-text)]">
        🛰 Why NISAR?
      </p>
      <ul className="mt-1 list-disc pl-4 text-caption text-[var(--color-text-secondary)] marker:text-[var(--color-accent)]">
        <li>Long radar waves (24 cm) see through clouds and into forests</li>
        <li>Works day and night, every 12 days</li>
      </ul>
      {[
        ["Landslide spots that look bare to NISAR", 64, "var(--color-accent)"],
        [
          "Other steep hills that look this bare",
          25,
          "var(--color-text-muted)",
        ],
      ].map(([label, pct, color]) => (
        <div key={String(label)} className="mt-2 text-caption">
          <div className="flex justify-between">
            <span>{label}</span>
            <b className="tabular-nums">{pct}%</b>
          </div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-fill-2)]">
            <i
              className="block h-full rounded-[var(--radius-pill)]"
              style={{ width: `${pct}%`, background: String(color) }}
            />
          </div>
        </div>
      ))}
      <p className="mt-2 text-caption text-[var(--color-text-secondary)]">
        Sentinel-1 (short 5.5 cm waves): <b>could not tell them apart</b>
      </p>
    </div>
  );
}

function periodsFor(option: ViewOption, layer?: LayerConfig): string[] {
  if (option.kind === "images") return option.frames.map((f) => f.label);
  return layer?.periods ?? [];
}

/**
 * The "Explore" panel: four topic tabs, a few simple views per topic, one map at a time,
 * with bullet notes, the satellites used and a colour scale. The full layer list stays
 * available under "All maps".
 */
export function TopicsPanel() {
  const { topicId, viewId, option, frame } = useTopicStore();
  const selectTopic = useTopicStore((s) => s.selectTopic);
  const selectView = useTopicStore((s) => s.selectView);
  const selectOption = useTopicStore((s) => s.selectOption);
  const selectFrame = useTopicStore((s) => s.selectFrame);
  const layers = useLayerStore((s) => s.layers);
  const manifest = useDatasetStore((s) => s.manifest);
  const currentDate = useDatasetStore((s) => s.currentDate);
  const setCurrentDate = useDatasetStore((s) => s.setCurrentDate);
  const [showAll, setShowAll] = useState(false);

  const topic = findTopic(topicId);
  const view = findView(topic, viewId);
  const opt = view.options[option] ?? view.options[0];
  const layerId = opt.kind === "tiles" ? opt.layerId : opt.legendLayerId;
  const layer = layerId ? layers.find((l) => l.id === layerId) : undefined;
  const periods = periodsFor(opt, layer);
  const activePeriod =
    opt.kind === "images"
      ? (opt.frames[frame] ?? opt.frames[0])?.label
      : (resolveManifestEntry(manifest, opt.layerId, currentDate)
          .resolvedPeriod ?? periods[periods.length - 1]);

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Topics"
        className="grid grid-cols-4 gap-1.5"
      >
        {TOPICS.map((t, index) => {
          const Icon = TOPIC_ICONS[t.id];
          const selected = t.id === topicId;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectTopic(t.id)}
              className={`flex flex-col items-center gap-0.5 rounded-[var(--radius-sm)] border px-1 py-2 text-center text-[11px] leading-tight transition-colors duration-[var(--dur-fast)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:outline-none ${
                selected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                  : "border-[var(--color-panel-border)] bg-[var(--color-panel)] text-[var(--color-text)] hover:bg-[var(--color-fill-2)]"
              }`}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
              <span className="font-display opacity-70 tabular-nums">
                {index + 1}
              </span>
              <span>{t.title}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        aria-label={topic.title}
        className="flex flex-col gap-2"
      >
        <div>
          <h3 className="text-label font-semibold text-[var(--color-text)]">
            {topic.title}
          </h3>
          <p className="font-display text-[11px] text-[var(--color-text-muted)]">
            Satellites: {topic.satellites}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5" aria-label="Maps in this topic">
          {topic.views.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={v.id === view.id}
              onClick={() => selectView(v.id)}
              className={`${pill} ${v.id === view.id ? pillOn : pillOff}`}
            >
              {v.chip}
            </button>
          ))}
        </div>

        <div className="rounded-[var(--radius-sm)] border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-3">
          <p className="font-display text-[11px] text-[var(--color-text-muted)]">
            📡 {view.satellite}
          </p>
          <ul className="mt-1.5 list-disc pl-4 text-body text-[var(--color-text)] marker:text-[var(--color-accent)]">
            {view.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          {view.options.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1" aria-label="Map options">
              {view.options.map((o, index) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={index === option}
                  onClick={() => selectOption(index)}
                  className={`${pill} ${index === option ? pillOn : pillOff}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : null}

          {periods.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1" aria-label="Dates">
              {periods.map((period, index) => (
                <button
                  key={period}
                  type="button"
                  aria-pressed={period === activePeriod}
                  onClick={() => {
                    if (opt.kind === "images") selectFrame(index);
                    // keep the app's date in step (its "nearest period" note and the timeline)
                    if (/^\d{4}-\d{2}/.test(period)) setCurrentDate(period);
                  }}
                  className={`rounded-[var(--radius-sm)] border px-1.5 py-0.5 font-display text-[11px] tabular-nums ${
                    period === activePeriod ? pillOn : pillOff
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          ) : null}

          <TopicLegend
            view={view}
            layer={layer}
            custom={opt.kind === "images" ? opt.legend : undefined}
          />
        </div>

        {topic.id === "radar" || topic.id === "quake" ? <WhyNisar /> : null}
      </div>

      <div className="border-t border-dashed border-[var(--color-panel-border)] pt-2">
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((open) => !open)}
          className="flex w-full items-center gap-1 text-caption text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          {showAll ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          All maps (for experts)
        </button>
        {showAll ? (
          <div className="mt-2">
            <ChangeTypeList />
          </div>
        ) : null}
      </div>
    </div>
  );
}
