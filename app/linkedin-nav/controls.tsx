"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "../components/theme-provider";
import type { Simulated } from "./state";

type ControlsProps = {
  zoom: 1 | 2;
  reduced: boolean;
  onZoom: (zoom: 1 | 2) => void;
  onSimulate: (event: Simulated) => void;
};

const EVENTS: { event: Simulated; label: string }[] = [
  { event: "notification", label: "New notification" },
  { event: "message", label: "New message" },
  { event: "post", label: "New post in feed" },
];

/** The demo's own controls: quiet, below the bar, and deliberately not LinkedIn's. */
export function Controls({ zoom, reduced, onZoom, onSimulate }: ControlsProps) {
  return (
    <div className="ln-controls">
      <div className="ln-control-group" role="group" aria-label="Simulate">
        <span className="ln-control-label" aria-hidden="true">
          Simulate
        </span>
        {EVENTS.map(({ event, label }) => (
          <button key={event} type="button" className="ln-control" data-event={event} onClick={() => onSimulate(event)}>
            {label}
          </button>
        ))}
      </div>

      <div className="ln-control-group ln-size" role="group" aria-label="Size">
        {([1, 2] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="ln-control"
            aria-pressed={zoom === value}
            aria-label={value === 1 ? "Actual size" : "Double size"}
            onClick={() => onZoom(value)}
          >
            {value}×
          </button>
        ))}
      </div>

      <ThemeToggle reduced={reduced} />
    </div>
  );
}

/** Flips the site theme, showing where you're going (the moon in light mode). */
function ThemeToggle({ reduced }: { reduced: boolean }) {
  const { theme, setTheme, isReady } = useTheme() as {
    theme: "light" | "dark" | null;
    setTheme: (theme: "light" | "dark") => void;
    isReady: boolean;
  };

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="ln-control ln-theme"
      data-ready={isReady ? "" : undefined}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
    >
      {/* Both icons share one grid cell, so they cross-fade in place. */}
      <AnimatePresence initial={false}>
        <motion.svg
          key={next}
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          initial={reduced ? { opacity: 0 } : { opacity: 0, rotate: -60, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, rotate: 60, scale: 0.6 }}
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
  );
}
