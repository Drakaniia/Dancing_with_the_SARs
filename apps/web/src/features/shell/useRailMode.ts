import { useEffect } from "react";
import { resolveRailMode, useUiStore } from "@/stores/uiStore";

/** Mirrors `--breakpoint-wide` / `--breakpoint-default`; media queries cannot read custom props. */
const WIDE_QUERY = "(min-width: 1440px)";
const DEFAULT_QUERY = "(min-width: 1024px)";

/**
 * Keeps `uiStore.railMode` in sync with the viewport breakpoints (wide / default / compact).
 *
 * The two queries only provide the change *signal*; the mode itself is derived from the viewport
 * width by `resolveRailMode`, so the thresholds stay in one place. Mount once, near the app root.
 */
export function useRailMode(): void {
  const setRailMode = useUiStore((state) => state.setRailMode);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return;

    const update = () => setRailMode(resolveRailMode(window.innerWidth));
    const queryLists = [
      window.matchMedia(WIDE_QUERY),
      window.matchMedia(DEFAULT_QUERY),
    ];

    update();
    for (const queryList of queryLists)
      queryList.addEventListener("change", update);
    return () => {
      for (const queryList of queryLists)
        queryList.removeEventListener("change", update);
    };
  }, [setRailMode]);
}
