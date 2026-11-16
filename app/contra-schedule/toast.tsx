"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { TabId } from "./tabs";

export type ToastState = {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  /** The tab its action leads to. Going there yourself makes the toast redundant. */
  leadsTo?: TabId;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const VISIBLE_MS = 5000;

/**
 * One toast at a time, at the bottom of the screen. A new one waits for the
 * old one to leave. Hovering or focusing it holds it there.
 */
export function Toast({
  toast,
  reduced,
  onDone,
}: {
  toast: ToastState | null;
  reduced: boolean;
  onDone: (id: number) => void;
}) {
  const timerRef = useRef(0);
  const holdRef = useRef(false);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });

  // A new toast gets the full time; re-renders of the same toast don't restart it.
  useEffect(() => {
    if (!toast) return;

    const id = toast.id;

    // A hold belongs to the toast that was hovered, not the one that replaced it.
    holdRef.current = false;
    timerRef.current = window.setTimeout(() => {
      if (!holdRef.current) doneRef.current(id);
    }, VISIBLE_MS);

    return () => window.clearTimeout(timerRef.current);
  }, [toast]);

  function hold(on: boolean) {
    holdRef.current = on;

    if (!on && toast) {
      const id = toast.id;

      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => doneRef.current(id), VISIBLE_MS / 2);
    }
  }

  return (
    <div className="cs-toasts" role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            className="cs-toast"
            initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
            animate={
              reduced
                ? { opacity: 1, transition: { duration: 0.15, ease: EASE_OUT } }
                : {
                    opacity: 1,
                    transform: "translateY(0px)",
                    transition: {
                      transform: { type: "spring", visualDuration: 0.3, bounce: 0.1 },
                      opacity: { duration: 0.15, ease: EASE_OUT },
                    },
                  }
            }
            // It leaves the way it came, a shorter distance and faster.
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }
                : { opacity: 0, transform: "translateY(8px)", transition: { duration: 0.12, ease: EASE_OUT } }
            }
            onPointerEnter={() => hold(true)}
            onPointerLeave={() => hold(false)}
            onFocus={() => hold(true)}
            onBlur={() => hold(false)}
          >
            <span className="cs-toast-text">{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                className="cs-toast-action"
                onClick={() => {
                  holdRef.current = false;
                  toast.action?.run();
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
