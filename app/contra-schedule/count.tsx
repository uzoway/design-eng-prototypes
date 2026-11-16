"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const roll = {
  enter: (direction: number) => ({
    opacity: 0,
    transform: `translateY(${direction > 0 ? 60 : -60}%)`,
    filter: "blur(2px)",
  }),
  rest: { opacity: 1, transform: "translateY(0%)", filter: "blur(0px)" },
  exit: (direction: number) => ({
    opacity: 0,
    transform: `translateY(${direction > 0 ? -60 : 60}%)`,
    filter: "blur(2px)",
  }),
};

const fade = {
  enter: { opacity: 0 },
  rest: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * A number that rolls: up when it grows, down when it shrinks. The direction
 * is worked out in render from the value it last showed (the "store the
 * previous value" pattern), so the outgoing digit leaves the right way too.
 */
export function Count({ value, label, reduced }: { value: number; label: string; reduced: boolean }) {
  const [shown, setShown] = useState(value);
  const [direction, setDirection] = useState(1);

  if (value !== shown) {
    setDirection(value > shown ? 1 : -1);
    setShown(value);
  }

  return (
    <span className="cs-count" aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.span
          key={label}
          className="cs-count-digit"
          custom={direction}
          variants={reduced ? fade : roll}
          initial="enter"
          animate="rest"
          exit="exit"
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
