"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

export type ToastState = {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  /** The detach this toast is about, so ⌘Z can clear it. */
  recordId?: number;
};

const EASE: [number, number, number, number] = [0.2, 0, 0, 1];
const VISIBLE_MS = 5000;

/**
 * Figma's "visual bell": a dark pill above the toolbar. Hovering or focusing
 * it holds it on screen. Its words are announced by the editor's live region,
 * so the pill itself stays quiet for screen readers.
 */
export function Toast({
  toast,
  reducedMotion,
  onDone,
  onAction,
}: {
  toast: ToastState | null;
  reducedMotion: boolean;
  onDone: () => void;
  /** The pill is about to be replaced, so focus needs somewhere to go. */
  onAction: () => void;
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

    // A hold belongs to the toast that was hovered, not the one that replaced it.
    holdRef.current = false;
    timerRef.current = window.setTimeout(() => {
      if (!holdRef.current) doneRef.current();
    }, VISIBLE_MS);

    return () => window.clearTimeout(timerRef.current);
  }, [toast]);

  function hold(on: boolean) {
    holdRef.current = on;

    if (!on && toast) {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => doneRef.current(), VISIBLE_MS / 2);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {toast && (
        <motion.div
          key={toast.id}
          className="fd-toast"
          data-canvas-ui
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
          animate={
            reducedMotion
              ? { opacity: 1, transition: { duration: 0.12, ease: EASE } }
              : { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.16, ease: EASE } }
          }
          exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE } }}
          onPointerEnter={() => hold(true)}
          onPointerLeave={() => hold(false)}
          onFocus={() => hold(true)}
          onBlur={() => hold(false)}
        >
          <span className="fd-toast-text">{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              className="fd-toast-action"
              onClick={() => {
                holdRef.current = false;
                toast.action?.run();
                onAction();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
