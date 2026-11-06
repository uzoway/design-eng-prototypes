"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "../components/theme-provider";

/**
 * A Figma icon button that flips the site theme. It shows where you're going
 * (the moon in light mode); the tooltip says it in words.
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
    <div className="fd-theme" data-ready={isReady ? "" : undefined}>
      <button type="button" className="fd-icon-button fd-theme-button" aria-label={label} onClick={() => setTheme(next)}>
        {/* Both icons share one grid cell, so they cross-fade in place. */}
        <AnimatePresence initial={false}>
          <motion.svg
            key={next}
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -60, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 60, scale: 0.6 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            {next === "dark" ? (
              <path d="M16.5 14.2A5.5 5.5 0 0 1 9.8 7.5a5.5 5.5 0 1 0 6.7 6.7Z" strokeLinejoin="round" />
            ) : (
              <>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 5.5v1.5M12 17v1.5M5.5 12H7M17 12h1.5M7.4 7.4l1.1 1.1M15.5 15.5l1.1 1.1M7.4 16.6l1.1-1.1M15.5 8.5l1.1-1.1" />
              </>
            )}
          </motion.svg>
        </AnimatePresence>
      </button>
      {/* The button already says this; the tooltip is for sighted mouse users. */}
      <span className="fd-tooltip" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
