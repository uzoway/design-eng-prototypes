"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "../components/theme-provider";

const SUN =
  "M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Zm-8 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13Zm3.536-1.464a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-1.06-1.06a.75.75 0 0 1 0-1.06Z";

const MOON =
  "M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z";

/**
 * A Primer IconButton that flips the site theme. It shows where you're going
 * (the moon in light mode), and the tooltip says so in words.
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
    <div className="ta-theme" data-ready={isReady ? "" : undefined}>
      <button
        type="button"
        className="ta-theme-button"
        aria-label={label}
        onClick={() => setTheme(next)}
      >
        {/* Both icons share one grid cell, so they cross-fade in place. */}
        <AnimatePresence initial={false}>
          <motion.svg
            key={next}
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            className="ta-octicon"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -60, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 60, scale: 0.6 }}
            transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
          >
            <path d={next === "dark" ? MOON : SUN} />
          </motion.svg>
        </AnimatePresence>
      </button>
      {/* The button already says this; the tooltip is for sighted mouse users. */}
      <span className="ta-theme-tip" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
