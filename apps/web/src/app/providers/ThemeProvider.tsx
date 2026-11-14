import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
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
const STORAGE_KEY = "nisar.theme";

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

function readInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore storage errors
  }
  return "light";
}

/**
 * Provides both the Field Atlas light theme and Night Atlas dark theme (`data-theme` on `<html>`),
 * plus OS accessibility preferences (`reducedMotion`, `reducedTransparency`, `highContrast`).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const reducedTransparency = useMediaQuery(REDUCED_TRANSPARENCY_QUERY);
  const highContrast = useMediaQuery(HIGH_CONTRAST_QUERY);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      reducedMotion,
      reducedTransparency,
      highContrast,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      reducedMotion,
      reducedTransparency,
      highContrast,
    ],
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
