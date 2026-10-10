import type { Transition } from "motion/react";

export const SPRING: Transition = { type: "spring", duration: 0.32, bounce: 0 };

// For small, frequent state changes: under 150 ms so they never feel slow.
export const QUICK: Transition = { duration: 0.14, ease: [0.23, 1, 0.32, 1] };
