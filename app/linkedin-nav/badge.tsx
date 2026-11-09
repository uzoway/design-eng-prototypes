"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { LINKEDIN_EASE } from "./icons";
import { formatCount } from "./state";

type BadgeProps = {
  kind: "dot" | "count";
  count: number;
  reduced: boolean;
};

/** A pop with a little overshoot, from the badge's centre. */
const POP = { type: "spring", stiffness: 640, damping: 24 } as const;

/**
 * LinkedIn's red badge: a 16px pill, 16px right of the icon's left edge and
 * 2px above its top. Home's is a dot with a white centre; the others count,
 * rolling each new number up from below. Its name lives on the tab, so the
 * badge itself is hidden from screen readers.
 */
export function Badge({ kind, count, reduced }: BadgeProps) {
  const label = formatCount(count);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(16);

  // Two digits widen the pill; it eases there instead of jumping. offsetWidth
  // ignores the pop's scale, so a count arriving mid-pop measures true.
  useLayoutEffect(() => {
    if (kind !== "count" || !sizerRef.current) return;

    setWidth(Math.max(16, sizerRef.current.offsetWidth));
  }, [kind, label]);

  const target = useMemo(() => ({ opacity: 1, scale: 1, width }), [width]);

  return (
    <motion.span
      className="ln-badge"
      data-kind={kind}
      aria-hidden="true"
      initial={reduced ? { opacity: 0, scale: 1, width } : { opacity: 0, scale: 0.3, width }}
      animate={target}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { opacity: 0, scale: 0, transition: { duration: 0.15, ease: "easeIn" } }
      }
      transition={{
        scale: POP,
        opacity: { duration: reduced ? 0.15 : 0.08 },
        width: { duration: reduced ? 0 : 0.2, ease: LINKEDIN_EASE },
      }}
    >
      {kind === "dot" ? (
        <motion.span
          className="ln-badge-dot"
          initial={reduced ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: reduced ? 0 : 0.04, scale: { ...POP, delay: 0.04 }, opacity: { duration: 0.08, delay: 0.04 } }}
        />
      ) : (
        <span className="ln-badge-window">
          <AnimatePresence initial={false}>
            <motion.span
              key={label}
              className="ln-badge-count"
              initial={reduced ? { opacity: 0, y: "0%" } : { y: "100%" }}
              animate={{ opacity: 1, y: "0%" }}
              exit={reduced ? { opacity: 0, y: "0%" } : { y: "-100%" }}
              transition={{ duration: reduced ? 0.12 : 0.2, ease: LINKEDIN_EASE }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
          <span ref={sizerRef} className="ln-badge-sizer">
            {label}
          </span>
        </span>
      )}
    </motion.span>
  );
}
