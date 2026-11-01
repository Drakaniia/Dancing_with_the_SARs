import { Search } from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PHILIPPINES_LOCATIONS } from "@/features/search/locations";
import { SEARCH_PLACEHOLDER } from "@/fixtures/sample-dashboard";
import { IconButton } from "@/shared/ui/IconButton";
import { Popover } from "@/shared/ui/Popover";

export interface SearchSelection {
  name: string;
  center: [number, number];
}

export interface GlobalSearchProps {
  /** Compact rail modes collapse the field to an icon that opens a search sheet. */
  compact?: boolean;
  /** Phase 4 wires this to the map fly-to. */
  onSelect?: (selection: SearchSelection) => void;
}

/**
 * Global location search. Results are filtered from the curated Philippines list and rendered in a
 * glass popover anchored under the field. In compact mode the field collapses to an icon.
 */
export function GlobalSearch({ compact = false, onSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The compact field only mounts inside the popover, so focus it on open rather than via autoFocus.
  useEffect(() => {
    if (compact && open) inputRef.current?.focus();
  }, [compact, open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return PHILIPPINES_LOCATIONS;
    return PHILIPPINES_LOCATIONS.filter((location) =>
      location.name.toLowerCase().includes(normalized),
    );
  }, [query]);

  const choose = (selection: SearchSelection) => {
    setQuery(selection.name);
    setOpen(false);
    onSelect?.(selection);
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
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter" && results[0]) {
            choose({ name: results[0].name, center: results[0].center });
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
          No locations found
        </p>
      ) : (
        results.map((location) => (
          <button
            key={location.name}
            type="button"
            role="option"
            aria-selected={false}
            onClick={() =>
              choose({ name: location.name, center: location.center })
            }
            className="block w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-body text-[var(--color-text)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--color-fill-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:outline-none"
          >
            {location.name}
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
        label="Search Philippines"
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
      label="Search Philippines"
      trigger={<div className="w-[clamp(20rem,32vw,30rem)]">{field}</div>}
    >
      {resultsList}
    </Popover>
  );
}
