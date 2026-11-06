"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "motion/react";

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = "merchant-theme";
const THEME_TRANSITION_DURATION = 240;

function isValidTheme(theme) {
  return theme === "light" || theme === "dark";
}

function getStoredTheme() {
  try {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);

    return isValidTheme(theme) ? theme : null;
  } catch {
    return null;
  }
}

function getSystemTheme(mediaQuery) {
  return mediaQuery.matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }) {
  const reducedMotion = useReducedMotion();

  const [theme, setThemeState] = useState(null);

  const transitionTimerRef = useRef(null);
  const hasExplicitThemeRef = useRef(false);
  /* A page's own default, used until the visitor picks a theme. */
  const pageDefaultRef = useRef(null);
  const mediaQueryRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const storedTheme = getStoredTheme();

    mediaQueryRef.current = mediaQuery;
    hasExplicitThemeRef.current = Boolean(storedTheme);

    const initialTheme =
      storedTheme ?? pageDefaultRef.current ?? getSystemTheme(mediaQuery);

    applyTheme(initialTheme);
    setThemeState(initialTheme);

    function handleSystemThemeChange(event) {
      if (hasExplicitThemeRef.current || pageDefaultRef.current) return;

      const nextTheme = event.matches ? "dark" : "light";

      applyTheme(nextTheme);
      setThemeState(nextTheme);
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.clearTimeout(transitionTimerRef.current);
    };
  }, []);

  function setTheme(nextTheme) {
    if (!isValidTheme(nextTheme)) return;

    const root = document.documentElement;

    hasExplicitThemeRef.current = true;

    window.clearTimeout(transitionTimerRef.current);

    if (reducedMotion) {
      delete root.dataset.themeTransitioning;
    } else {
      root.dataset.themeTransitioning = "true";

      transitionTimerRef.current = window.setTimeout(() => {
        delete root.dataset.themeTransitioning;
      }, THEME_TRANSITION_DURATION);
    }

    applyTheme(nextTheme);
    setThemeState(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The selected theme still works for the current session.
    }
  }

  /* Not stored: other pages keep following the system. */
  function setPageDefault(pageTheme) {
    pageDefaultRef.current = isValidTheme(pageTheme) ? pageTheme : null;

    if (!mediaQueryRef.current || hasExplicitThemeRef.current) return;

    const nextTheme =
      pageDefaultRef.current ?? getSystemTheme(mediaQueryRef.current);

    applyTheme(nextTheme);
    setThemeState(nextTheme);
  }

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      setPageDefault,
      isReady: theme !== null,
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return context;
}

/**
 * Gives one page its own default theme (Figma's editor is dark) while the
 * visitor hasn't picked one. Pair it with an inline script for first paint.
 */
export function usePageDefaultTheme(pageTheme) {
  const { setPageDefault } = useTheme();

  useLayoutEffect(() => {
    setPageDefault(pageTheme);

    return () => setPageDefault(null);
    // setPageDefault only touches refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTheme]);
}
