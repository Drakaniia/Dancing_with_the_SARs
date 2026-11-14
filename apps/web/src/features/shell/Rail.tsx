import {
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { type ComponentType, useEffect, useRef } from "react";
import { IconButton } from "@/shared/ui/IconButton";
import { Panel } from "@/shared/ui/Panel";
import { Tooltip } from "@/shared/ui/Tooltip";
import { type PanelId, type RailSide, useUiStore } from "@/stores/uiStore";

export interface RailPanelDef {
  id: PanelId;
  title: string;
  icon: LucideIcon;
  Content: ComponentType;
}

/**
 * `inline` sits in the shell grid and can collapse to an icon strip; `sheet` lives inside a
 * `RailSheet` overlay, where the header button closes the sheet instead.
 */
export type RailPresentation = "inline" | "sheet";

export interface RailProps {
  side: RailSide;
  /** Accessible name of the `aside` landmark. */
  label: string;
  /** Short visible name in the rail header, also used in button labels. */
  title: string;
  panels: readonly RailPanelDef[];
  presentation?: RailPresentation;
  /** Sheet presentation only: closes the overlay. */
  onClose?: () => void;
  /** Width the expanded content keeps while the grid track animates, so panels never reflow. */
  expandedWidth?: string;
}

const COLLAPSE_ICON: Record<RailSide, LucideIcon> = {
  left: PanelLeftClose,
  right: PanelRightClose,
};
const EXPAND_ICON: Record<RailSide, LucideIcon> = {
  left: PanelLeftOpen,
  right: PanelRightOpen,
};

const RAIL_CLASS =
  "flex h-full min-h-0 flex-col bg-[var(--color-bg)] p-[var(--rail-pad)]";

/**
 * Structural side rail. Expanded, it shows a header (title + collapse control on the edge facing
 * the map) above its panels. Collapsed, it becomes a strip of panel icons: the top button restores
 * the rail as it was, and each icon reopens the rail scrolled to that panel with it unfolded.
 *
 * The strip is pinned to the rail's outer edge, so the icons stay put while the grid track
 * animates around them.
 */
export function Rail({
  side,
  label,
  title,
  panels,
  presentation = "inline",
  onClose,
  expandedWidth,
}: RailProps) {
  const storedExpanded = useUiStore((state) => state.expandedRails[side]);
  const setRailExpanded = useUiStore((state) => state.setRailExpanded);
  const setPanelOpen = useUiStore((state) => state.setPanelOpen);

  const isSheet = presentation === "sheet";
  const expanded = isSheet || storedExpanded;

  const railRef = useRef<HTMLElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  /** Set only by a user toggle, so hydration from settings never moves focus. */
  const pendingFocusRef = useRef<PanelId | "rail" | null>(null);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending === null) return;
    pendingFocusRef.current = null;

    if (!expanded) {
      expandRef.current?.focus();
      return;
    }
    if (pending === "rail") {
      collapseRef.current?.focus();
      return;
    }
    const section = railRef.current?.querySelector<HTMLElement>(
      `[data-panel-id="${pending}"]`,
    );
    section?.scrollIntoView?.({ block: "nearest" });
    section?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [expanded]);

  const collapse = () => {
    if (isSheet) {
      onClose?.();
      return;
    }
    pendingFocusRef.current = "rail";
    setRailExpanded(side, false);
  };

  const expand = (panel?: PanelId) => {
    if (panel) setPanelOpen(panel, true);
    pendingFocusRef.current = panel ?? "rail";
    setRailExpanded(side, true);
  };

  // The control sits on the edge that faces the map.
  const headerDirection = side === "left" ? "flex-row" : "flex-row-reverse";
  const tooltipSide = side === "left" ? "right" : "left";

  if (!expanded) {
    const ExpandIcon = EXPAND_ICON[side];
    return (
      <div
        className={`flex h-full min-h-0 ${side === "left" ? "justify-start" : "justify-end"}`}
      >
        <aside
          ref={railRef}
          aria-label={label}
          className={`${RAIL_CLASS} w-[var(--rail-collapsed-w)] shrink-0 items-center gap-1`}
        >
          <Tooltip content={`Expand ${title.toLowerCase()}`} side={tooltipSide}>
            <IconButton
              ref={expandRef}
              label={`Expand ${title.toLowerCase()}`}
              aria-expanded={false}
              variant="ghost"
              onClick={() => expand()}
            >
              <ExpandIcon size={18} strokeWidth={1.5} />
            </IconButton>
          </Tooltip>
          <span
            aria-hidden="true"
            className="my-1 h-px w-5 bg-[var(--color-panel-border)]"
          />
          {panels.map(({ id, title: panelTitle, icon: Icon }) => (
            <Tooltip key={id} content={panelTitle} side={tooltipSide}>
              <IconButton
                label={`Show ${panelTitle}`}
                variant="ghost"
                onClick={() => expand(id)}
                className="text-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
              >
                <Icon size={16} strokeWidth={1.5} />
              </IconButton>
            </Tooltip>
          ))}
        </aside>
      </div>
    );
  }

  const CollapseIcon = COLLAPSE_ICON[side];
  const collapseLabel = isSheet
    ? `Close ${title.toLowerCase()}`
    : `Collapse ${title.toLowerCase()}`;

  return (
    <div className="h-full min-h-0 min-w-0 overflow-hidden">
      <aside
        ref={railRef}
        aria-label={label}
        style={expandedWidth ? { minWidth: expandedWidth } : undefined}
        className={`${RAIL_CLASS} w-full gap-[var(--panel-gap)] overflow-y-auto`}
      >
        <div
          className={`flex shrink-0 items-center gap-2 ${headerDirection}`}
        >
          <span className="min-w-0 flex-1 truncate px-1 text-caption text-[var(--color-text-muted)]">
            {title}
          </span>
          <IconButton
            ref={collapseRef}
            label={collapseLabel}
            aria-expanded={isSheet ? undefined : true}
            variant="ghost"
            onClick={collapse}
          >
            <CollapseIcon size={18} strokeWidth={1.5} />
          </IconButton>
        </div>
        {panels.map(({ id, title: panelTitle, icon: Icon, Content }) => (
          <Panel
            key={id}
            id={id}
            title={panelTitle}
            icon={<Icon size={16} strokeWidth={1.5} />}
          >
            <Content />
          </Panel>
        ))}
      </aside>
    </div>
  );
}
