"use client";

import { animate, AnimatePresence, motion, useMotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LINKEDIN_EASE } from "./icons";
import { formatCount } from "./state";

type BadgeProps = {
  kind: "dot" | "count";
  count: number;
  /** Goes up with every new event for this tab, even when the count can't (Home's dot). */
  pulse: number;
  reduced: boolean;
};

/** A pop with a little overshoot. */
const POP = { type: "spring", stiffness: 640, damping: 24 } as const;
/** Strong ease-out: quick to react, soft to land. */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/*
 * The badge belongs to its icon, so it comes out of the icon and goes back
 * into it: it starts (and ends) tucked towards the icon's middle, half size
 * and see-through. Opening the tab reads as the icon taking it in.
 */
const TUCKED = { x: -8, y: 6, scale: 0.5, opacity: 0 };
const SHOWN = { x: 0, y: 0, scale: 1, opacity: 1 };

/**
 * LinkedIn's red badge: a 16px pill, 16px right of the icon's left edge and
 * 2px above its top. Home's is a dot with a white centre; the others count,
 * rolling each new number up from below. Its name lives on the tab, so the
 * badge itself is hidden from screen readers.
 */
export function Badge({ kind, count, pulse, reduced }: BadgeProps) {
  const label = formatCount(count);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(16);
  const bump = useMotionValue(1);
  const seenPulse = useRef(pulse);

  // Two digits widen the pill; it eases there instead of jumping. offsetWidth
  // ignores any scale, so a count arriving mid-pop measures true.
  useLayoutEffect(() => {
    if (kind !== "count" || !sizerRef.current) return;

    setWidth(Math.max(16, sizerRef.current.offsetWidth));
  }, [kind, label]);

  // Another one on top of what's already waiting: the pill gives a small
  // bump, so a repeat is felt even when the number can't change (Home's dot,
  // or 99+). The first one is the entrance itself.
  useEffect(() => {
    if (pulse === seenPulse.current) return;

    seenPulse.current = pulse;
    if (!reduced) animate(bump, [bump.get(), 1.18, 1], { duration: 0.3, times: [0, 0.35, 1], ease: EASE_OUT });
  }, [pulse, reduced, bump]);

  const pill = useMemo(() => ({ width }), [width]);

  return (
    <motion.span
      className="ln-badge-slot"
      aria-hidden="true"
      initial={reduced ? { opacity: 0 } : TUCKED}
      animate={SHOWN}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.15 } }
          : {
              ...TUCKED,
              transition: {
                default: { duration: 0.18, ease: EASE_OUT },
                // Gone before it's all the way in, so it reads as absorbed, not shrunk.
                opacity: { duration: 0.12, ease: "linear" },
              },
            }
      }
      transition={{
        default: POP,
        opacity: { duration: reduced ? 0.15 : 0.08 },
      }}
    >
      <motion.span
        className="ln-badge"
        data-kind={kind}
        style={{ scale: bump }}
        initial={pill}
        animate={pill}
        transition={{ width: { duration: reduced ? 0 : 0.2, ease: LINKEDIN_EASE } }}
      >
        {kind === "dot" ? (
          <motion.span
            className="ln-badge-dot"
            initial={reduced ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              scale: { ...POP, delay: reduced ? 0 : 0.04 },
              opacity: { duration: 0.08, delay: reduced ? 0 : 0.04 },
            }}
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
    </motion.span>
  );
}
