import { useSyncExternalStore } from "react";

/** How often the page checks whether a scheduled post's time has come. */
const TICK = 15_000;

let current: number | null = null;
let timer = 0;
const listeners = new Set<() => void>();

function tick() {
  current = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1) {
    timer = window.setInterval(tick, TICK);
    // A tab that slept through its ticks catches up the moment it's looked at again.
    document.addEventListener("visibilitychange", tick);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    }
  };
}

function snapshot() {
  if (current === null) current = Date.now();

  return current;
}

/**
 * The time, to within 15 seconds. It's null on the server and while
 * hydrating: the page is a static export, so any date worked out at build
 * time would be wrong by the time someone opens it.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

/** The time right now, for the moment of an action. Moves the shared clock on with it. */
export function readNow(): number {
  const now = Date.now();

  if (current === null || now > current) {
    current = now;
    // Tell the page too, so a label never trails the action that just used this time.
    queueMicrotask(() => listeners.forEach((listener) => listener()));
  }

  return current;
}
