import { Search } from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LocationEntry,
  PHILIPPINES_LOCATIONS,
} from "@/features/search/locations";
import { SEARCH_PLACEHOLDER } from "@/fixtures/sample-dashboard";
import { IconButton } from "@/shared/ui/IconButton";
import { Popover } from "@/shared/ui/Popover";
import { useSelectionStore } from "@/stores/selectionStore";
import { useUiStore } from "@/stores/uiStore";

export interface SearchSelection {
  name: string;
  center: [number, number];
  zoom?: number;
}

export interface GlobalSearchProps {
  compact?: boolean;
  onSelect?: (selection: SearchSelection) => void;
}

export function GlobalSearch({ compact = false, onSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestFlyTo = useUiStore((state) => state.requestFlyTo);
  const inspectCoordinate = useSelectionStore(
    (state) => state.inspectCoordinate,
  );

  useEffect(() => {
    if (compact && open) inputRef.current?.focus();
  }, [compact, open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return PHILIPPINES_LOCATIONS;
    return PHILIPPINES_LOCATIONS.filter(
      (location) =>
        location.name.toLowerCase().includes(normalized) ||
        (location.province ?? "").toLowerCase().includes(normalized),
    );
  }, [query]);

  const choose = (location: LocationEntry) => {
    setQuery(location.name);
    setOpen(false);
    requestFlyTo(
      location.center[0],
      location.center[1],
      location.zoom ?? 11.5,
      location.name,
    );
    void inspectCoordinate(
      location.center[0],
      location.center[1],
      location.province
        ? `${location.name}, ${location.province}`
        : location.name,
    );
    onSelect?.({
      name: location.name,
      center: location.center,
      zoom: location.zoom,
    });
  };

  const field = (
    <div className="relative flex w-full items-center">
      <Search
        aria-hidden="true"
        size={16}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-2.5 text-[var(--color-text-muted)]"
      />
      <input
        ref={inputRef}
        type="search"
        aria-label="Search locations"
        placeholder={SEARCH_PLACEHOLDER}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter" && results[0]) {
            choose(results[0]);
          }
        }}
        className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-chrome-border)] bg-[var(--color-fill-2)] pr-3 pl-8 text-body text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-panel)] focus-visible:outline-none"
      />
    </div>
  );

  const resultsList = (
    <div
      role="listbox"
      aria-label="Search results"
      className="max-h-64 overflow-y-auto"
    >
      {results.length === 0 ? (
        <p className="px-2 py-1.5 text-caption text-[var(--color-text-muted)]">
          No locations found in Mindanao or Philippines
        </p>
      ) : (
        results.map((location) => (
          <button
            key={location.name}
            type="button"
            role="option"
            aria-selected={false}
            onClick={() => choose(location)}
            className="flex w-full items-baseline justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-body text-[var(--color-text)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--color-fill-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:outline-none"
          >
            <span className="truncate font-medium">{location.name}</span>
            {location.province ? (
              <span className="shrink-0 text-caption text-[var(--color-text-secondary)]">
                {location.province}
              </span>
            ) : null}
          </button>
        ))
      )}
    </div>
  );

  if (compact) {
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        label="Search locations"
        align="end"
        trigger={
          <IconButton label="Search locations">
            <Search size={18} strokeWidth={1.5} />
          </IconButton>
        }
      >
        <div className="flex w-[min(20rem,72vw)] flex-col gap-2">
          {field}
          {resultsList}
        </div>
      </Popover>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Search locations"
      trigger={<div className="w-[clamp(18rem,28vw,28rem)]">{field}</div>}
    >
      {resultsList}
    </Popover>
  );
}
