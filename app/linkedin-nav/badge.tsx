"use client";

import { animate, AnimatePresence, motion, useMotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatCount } from "./state";

type BadgeProps = {
  kind: "dot" | "count";
  count: number;
  /** Goes up with every new event for this tab, even when the count can't (Home's dot). */
  pulse: number;
  reduced: boolean;
};

/** Strong ease-out: quick to react, soft to land. */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
/** Arriving: it travels out of the icon on a plain ease-out and lands without drifting past its spot. */
const TRAVEL = { duration: 0.22, ease: EASE_OUT };
/** Its size alone gets a small overshoot, so it pops rather than wobbles. */
const POP = { type: "spring", duration: 0.3, bounce: 0.3 } as const;
/**
 * Another event knocks the pill outwards from wherever it is: a spring
 * kicked with velocity, so events in quick succession build on each other
 * instead of restarting a keyframe. Peaks about 10% bigger, back in ~150ms.
 */
const KNOCK = { type: "spring", stiffness: 600, damping: 28, velocity: 5 } as const;
const KNOCK_PEAK = 1.1;
/** A new number rolls in; it's a response to the event, so it moves on arrival, not after a wind-up. */
const ROLL = { duration: 0.2, ease: EASE_OUT };

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
    // Kick only by the room left below one knock's peak, so a burst keeps
    // the pill swollen instead of pumping it ever bigger.
    if (!reduced) {
      const room = Math.min(Math.max((KNOCK_PEAK - bump.get()) / (KNOCK_PEAK - 1), 0), 1.2);

      animate(bump, 1, { ...KNOCK, velocity: bump.getVelocity() * 0.5 + KNOCK.velocity * room });
    }
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
        x: TRAVEL,
        y: TRAVEL,
        scale: POP,
        opacity: { duration: reduced ? 0.15 : 0.1, ease: EASE_OUT },
      }}
    >
      <motion.span
        className="ln-badge"
        data-kind={kind}
        style={{ scale: bump }}
        initial={pill}
        animate={pill}
        // Widens with the roll that needs the room, on the same curve.
        transition={{ width: reduced ? { duration: 0 } : ROLL }}
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
                // The old number also fades as it leaves, so two half-digits never share the pill for long.
                exit={
                  reduced
                    ? { opacity: 0, y: "0%" }
                    : { y: "-100%", opacity: 0, transition: { ...ROLL, opacity: { duration: 0.1, ease: EASE_OUT } } }
                }
                transition={reduced ? { duration: 0.12, ease: EASE_OUT } : ROLL}
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
