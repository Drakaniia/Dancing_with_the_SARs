import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface ThemeContextValue {
  /** `prefers-reduced-motion: reduce` */
  reducedMotion: boolean;
  /** `prefers-reduced-transparency: reduce` */
  reducedTransparency: boolean;
  /** `prefers-contrast: more` */
  highContrast: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const REDUCED_TRANSPARENCY_QUERY = "(prefers-reduced-transparency: reduce)";
const HIGH_CONTRAST_QUERY = "(prefers-contrast: more)";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return;
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener("change", onChange);
    return () => mediaQueryList.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * The app ships a single warm light palette (see `src/styles/tokens.css`), so there is no theme to
 * switch. This provider only surfaces the OS accessibility preferences that the tokens and the
 * motion layer react to.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const reducedTransparency = useMediaQuery(REDUCED_TRANSPARENCY_QUERY);
  const highContrast = useMediaQuery(HIGH_CONTRAST_QUERY);

  const value = useMemo<ThemeContextValue>(
    () => ({ reducedMotion, reducedTransparency, highContrast }),
    [reducedMotion, reducedTransparency, highContrast],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
