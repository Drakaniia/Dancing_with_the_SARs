import {
  Activity,
  ChevronDown,
  ChevronRight,
  CloudSun,
  Compass,
  Flame,
  Leaf,
  type LucideIcon,
  Mountain,
  Radar,
  Trees,
  TrendingDown,
  TriangleAlert,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { CHANGE_TYPES } from "@/fixtures/sample-dashboard";
import {
  type FamilyMeta,
  LAYER_FAMILIES,
  type LayerFamily,
} from "@/shared/types/dataset";
import { Switch } from "@/shared/ui/Switch";
import { gradientFromRamp } from "@/shared/utils/colorScales";
import { useLayerStore } from "@/stores/layerStore";
import { ChangeTypeRow } from "./ChangeTypeRow";
import { TOPICS, type TopicId } from "./topics";

const FAMILY_ICONS: Record<LayerFamily, LucideIcon> = {
  radar: Radar,
  vegetation: Leaf,
  landcover: Trees,
  earthquake: Flame,
  climate: CloudSun,
  outlook: Activity,
  terrain: Mountain,
};

const TOPIC_ICONS: Record<TopicId, LucideIcon> = {
  radar: Radar,
  quake: TriangleAlert,
  elnino: CloudSun,
  next: Activity,
};

export { TriangleAlert, TrendingDown, Waves, Compass };

/**
 * Grouped 7-family dataset catalogue (spec §6.5, D19).
 *
 * When the store has manifest-layer entries (the 7 data-native families: radar, vegetation,
 * landcover, earthquake, climate, outlook, terrain), renders collapsible family accordions with
 * colour-ramp swatches and period badges. If a test seeds legacy `change-type` rows, renders
 * those rows directly so legacy unit tests also pass seamlessly.
 */
export function ChangeTypeList() {
  const layers = useLayerStore((state) => state.layers);
  const activeLayerId = useLayerStore((state) => state.activeLayerId);
  const toggleVisibility = useLayerStore((state) => state.toggleVisibility);
  const setActive = useLayerStore((state) => state.setActive);

  const [expandedFamilies, setExpandedFamilies] = useState<
    Record<LayerFamily, boolean>
  >({
    radar: true,
    vegetation: false,
    landcover: false,
    earthquake: true,
    climate: false,
    outlook: false,
    terrain: false,
  });

  const manifestLayers = layers.filter((l) => l.kind === "manifest-layer");
  const legacyChangeLayers = layers.filter((l) => l.kind === "change-type");

  if (manifestLayers.length === 0 && legacyChangeLayers.length > 0) {
    return (
      <ul className="flex flex-col gap-0.5">
        {CHANGE_TYPES.map(({ changeType, label }) => {
          const layer = legacyChangeLayers.find(
            (candidate) => candidate.changeType === changeType,
          );
          if (!layer) return null;

          return (
            <li key={changeType}>
              <ChangeTypeRow
                changeType={changeType}
                label={label}
                visible={layer.visible}
                onToggle={() => toggleVisibility(layer.id)}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  const toggleFamily = (family: LayerFamily) => {
    setExpandedFamilies((prev) => ({ ...prev, [family]: !prev[family] }));
  };

  const renderFamily = (meta: FamilyMeta) => {
    const familyLayers = manifestLayers.filter((l) => l.family === meta.family);
    if (familyLayers.length === 0) return null;

    const isOpen = expandedFamilies[meta.family];
    const activeCount = familyLayers.filter((l) => l.visible).length;
    const Icon = FAMILY_ICONS[meta.family];

    return (
      <div
        key={meta.family}
        className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-panel-border)] bg-[var(--color-fill-1)]"
      >
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleFamily(meta.family)}
          className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-fill-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:outline-none"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon
              size={15}
              strokeWidth={1.75}
              className="shrink-0 text-[var(--color-accent)]"
            />
            <span className="truncate text-label text-[var(--color-text)]">
              {meta.label}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {activeCount > 0 ? (
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-1.5 py-0.2 text-[11px] font-semibold text-[var(--color-on-accent)] tabular-nums">
                {activeCount} on
              </span>
            ) : (
              <span className="font-display text-caption text-[var(--color-text-muted)] tabular-nums">
                {familyLayers.length}
              </span>
            )}
            {isOpen ? (
              <ChevronDown
                size={14}
                className="text-[var(--color-text-secondary)]"
              />
            ) : (
              <ChevronRight
                size={14}
                className="text-[var(--color-text-secondary)]"
              />
            )}
          </span>
        </button>

        {isOpen ? (
          <ul className="flex flex-col gap-0.5 border-t border-[var(--color-panel-border)] bg-[var(--color-panel)] p-1">
            {familyLayers.map((layer) => {
              const isFocused = layer.id === activeLayerId;
              const periodCount = layer.periods?.length ?? 1;
              return (
                <li
                  key={layer.id}
                  className={`flex min-h-9 items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 transition-colors duration-[var(--dur-fast)] ${
                    isFocused
                      ? "bg-[var(--color-fill-3)]"
                      : "hover:bg-[var(--color-fill-1)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActive(layer.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 rounded-[3px] border border-[var(--color-panel-border)]"
                      style={{
                        background: gradientFromRamp(
                          layer.ramp,
                          layer.classes,
                          "135deg",
                        ),
                      }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={`truncate text-body ${
                          layer.visible
                            ? "font-medium text-[var(--color-text)]"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {layer.name}
                      </span>
                      <span className="font-display text-[11px] text-[var(--color-text-muted)] tabular-nums">
                        {layer.units} ·{" "}
                        {periodCount === 1
                          ? (layer.periods?.[0] ?? "static")
                          : `${periodCount} dates`}
                      </span>
                    </span>
                  </button>
                  <Switch
                    checked={layer.visible}
                    onChange={() => toggleVisibility(layer.id)}
                    label={layer.name}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {TOPICS.map((topic, index) => {
        const families = topic.families
          .map((family) => LAYER_FAMILIES.find((m) => m.family === family))
          .filter((meta): meta is FamilyMeta => meta !== undefined)
          .filter((meta) =>
            manifestLayers.some((l) => l.family === meta.family),
          );
        if (families.length === 0) return null;
        const TopicIcon = TOPIC_ICONS[topic.id];

        return (
          <section
            key={topic.id}
            aria-labelledby={`topic-${topic.id}`}
            className="flex flex-col gap-1.5"
          >
            <header className="flex items-start gap-2 px-0.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-[var(--color-on-accent)]"
              >
                <TopicIcon size={13} strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span
                  id={`topic-${topic.id}`}
                  className="text-label font-semibold text-[var(--color-text)]"
                >
                  <span className="font-display text-[var(--color-text-muted)] tabular-nums">
                    {index + 1}
                  </span>{" "}
                  {topic.title}
                </span>
                <span className="text-caption text-[var(--color-text-secondary)]">
                  {topic.blurb}
                </span>
                <span className="font-display text-[11px] text-[var(--color-text-muted)]">
                  Satellites: {topic.satellites}
                </span>
              </span>
            </header>
            {families.map((meta) => renderFamily(meta))}
          </section>
        );
      })}
    </div>
  );
}
