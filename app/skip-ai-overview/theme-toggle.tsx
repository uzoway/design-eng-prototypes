"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "../components/theme-provider";
import { DarkModeIcon, LightModeIcon } from "./icons";

/**
 * A Google header icon button that flips the site theme. It shows where
 * you're going (the moon in light mode); the tooltip says it in words.
 */
export function ThemeToggle() {
  const { theme, setTheme, isReady } = useTheme() as {
    theme: "light" | "dark" | null;
    setTheme: (theme: "light" | "dark") => void;
    isReady: boolean;
  };
  const reducedMotion = useReducedMotion() ?? false;

  const next = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${next} theme`;

  return (
    <div className="sk-theme" data-ready={isReady ? "" : undefined}>
      <button type="button" className="sk-icon-button" aria-label={label} onClick={() => setTheme(next)}>
        {/* Both icons share one grid cell, so they cross-fade in place. */}
        <AnimatePresence initial={false}>
          <motion.span
            key={next}
            className="sk-icon-cell"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -60, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 60, scale: 0.6 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            {next === "dark" ? <DarkModeIcon /> : <LightModeIcon />}
          </motion.span>
        </AnimatePresence>
      </button>
      {/* The button already says this; the tooltip is for sighted mouse users. */}
      <span className="sk-tooltip" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
