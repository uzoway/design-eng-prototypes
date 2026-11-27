"use client";

import { useCallback, useEffect, useRef } from "react";
import type { IconHandle, Tab } from "./nav-icons";

/** How long a clicked icon stays filled before it settles back to its outline. */
const HOLD = 520;

/**
 * Drives the animated nav icons for a bar. Clicks play an icon's full
 * animation, but the page doesn't change, so the icon settles back to its
 * outline afterwards and the selection stays where LinkedIn has it. Hover
 * and keyboard focus play the short hint; a press sinks the icon until
 * it's let go.
 */
export function useIconMoves() {
  const handles = useRef(new Map<Tab, IconHandle>());
  const callbacks = useRef(new Map<Tab, (handle: IconHandle | null) => void>());
  const lit = useRef(new Map<Tab, number>());
  const pressed = useRef<Tab | null>(null);

  useEffect(() => {
    const timers = lit.current;

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  /** A stable ref callback per tab. */
  const iconRef = useCallback((tab: Tab) => {
    let callback = callbacks.current.get(tab);

    if (!callback) {
      callback = (handle) => {
        if (handle) handles.current.set(tab, handle);
        else handles.current.delete(tab);
      };
      callbacks.current.set(tab, callback);
    }

    return callback;
  }, []);

  const settleLater = useCallback((tab: Tab, handle: IconHandle) => {
    window.clearTimeout(lit.current.get(tab));
    lit.current.set(
      tab,
      window.setTimeout(() => {
        lit.current.delete(tab);
        handle.deactivate();
      }, HOLD),
    );
  }, []);

  /** A click on a tab that isn't the page you're on. */
  const play = useCallback(
    (tab: Tab) => {
      const handle = handles.current.get(tab);

      if (!handle) return;

      // Clicked again while it's still filled: it acknowledges, and stays a moment longer.
      if (lit.current.has(tab)) {
        handle.reselect();
        settleLater(tab, handle);

        return;
      }

      lit.current.set(tab, 0);
      handle.activate(() => settleLater(tab, handle));
    },
    [settleLater],
  );

  /** A click on the tab you're already on. */
  const reselect = useCallback((tab: Tab) => handles.current.get(tab)?.reselect(), []);

  const hint = useCallback((tab: Tab, direction = 1) => handles.current.get(tab)?.hint(direction), []);

  const press = useCallback((tab: Tab) => {
    pressed.current = tab;
    handles.current.get(tab)?.press();
  }, []);

  /** Pointer up, or off the button before it: the icon comes back up. */
  const release = useCallback((tab: Tab) => {
    if (pressed.current !== tab) return;

    pressed.current = null;
    handles.current.get(tab)?.release();
  }, []);

  return { iconRef, play, reselect, hint, press, release };
}
