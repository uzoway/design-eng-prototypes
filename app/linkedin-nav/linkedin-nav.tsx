"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { Controls } from "./controls";
import type { IconHandle } from "./icons";
import { NavBar } from "./nav-bar";
import { PhoneBar } from "./phone-bar";
import { ANNOUNCEMENT, INITIAL, navReducer, TARGET, type Simulated, type Tab } from "./state";
import "./linkedin-nav.css";

type Layout = "desktop" | "phone";

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribeReduced(listener: () => void) {
  const query = window.matchMedia(REDUCE);

  query.addEventListener("change", listener);

  return () => query.removeEventListener("change", listener);
}

/*
 * The server can't know the setting, so it renders the animated icons and
 * the static ones take over right after hydration, without a mismatch.
 */
function useReduced() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
}

/** A simulated event's motion leads; its badge follows a beat later. */
const BADGE_AFTER = 120;

/**
 * Both layouts are always rendered and CSS picks one, so crossing 640px
 * never flashes. Every selection and simulated event goes to both sets of
 * icons, so whichever you see next is already in the right state.
 */
export function LinkedInNav() {
  const reduced = useReduced();
  const [state, dispatch] = useReducer(navReducer, INITIAL);
  const [zoom, setZoom] = useState<1 | 2>(1);
  const [announcement, setAnnouncement] = useState("");

  /* The latest selection, read synchronously so rapid clicks never act on a stale one. */
  const selectedRef = useRef(state.selected);
  const handles = useRef(new Map<string, IconHandle>());
  const refCallbacks = useRef(new Map<string, (handle: IconHandle | null) => void>());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;

    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const iconRef = useCallback(
    (layout: Layout) => (tab: Tab) => {
      const key = `${layout}:${tab}`;
      let callback = refCallbacks.current.get(key);

      if (!callback) {
        callback = (handle) => {
          if (handle) handles.current.set(key, handle);
          else handles.current.delete(key);
        };
        refCallbacks.current.set(key, callback);
      }

      return callback;
    },
    [],
  );

  const each = (tab: Tab, run: (handle: IconHandle) => void) => {
    for (const layout of ["desktop", "phone"] as const) {
      const handle = handles.current.get(`${layout}:${tab}`);

      if (handle) run(handle);
    }
  };

  const select = (tab: Tab) => {
    const previous = selectedRef.current;

    // Already here: Home hops back to the top, the rest give a small "yep, you're here".
    if (tab === previous) {
      each(tab, (handle) => handle.reselect());
      return;
    }

    selectedRef.current = tab;
    each(previous, (handle) => handle.deactivate());

    // The badge goes once the fill lands (Home's as the lights reach the roof).
    let cleared = false;

    each(tab, (handle) =>
      handle.activate(() => {
        if (cleared || selectedRef.current !== tab) return;

        cleared = true;
        dispatch({ type: "clear", tab });
      }),
    );
    dispatch({ type: "select", tab });
  };

  /** Hover and focus hints only exist on the desktop bar. */
  const hint = (tab: Tab, direction: number) => {
    handles.current.get(`desktop:${tab}`)?.hint(direction);
  };

  /** Press feedback goes to the icon under the finger only, not its twin in the other layout. */
  const press = useCallback(
    (layout: Layout) => (tab: Tab, down: boolean) => {
      const handle = handles.current.get(`${layout}:${tab}`);

      if (down) handle?.press();
      else handle?.release();
    },
    [],
  );

  const simulate = (event: Simulated) => {
    const tab = TARGET[event];

    // A new post lands in the feed, so Home stirs; everything else alerts its own tab.
    each(tab, (handle) => handle.alert());

    timers.current.push(window.setTimeout(() => dispatch({ type: "simulate", event }), BADGE_AFTER));

    // A trailing no-break space makes a repeat announcement a new string, so it's read again.
    setAnnouncement((current) => (current === ANNOUNCEMENT[event] ? `${ANNOUNCEMENT[event]} ` : ANNOUNCEMENT[event]));
  };

  return (
    <>
      <div className="ln-desktop">
        <div className="ln-stage" style={{ "--ln-zoom": zoom } as React.CSSProperties}>
          <div className="ln-zoom">
            <NavBar
              state={state}
              reduced={reduced}
              onSelect={select}
              iconRef={iconRef("desktop")}
              hint={hint}
              press={press("desktop")}
            />
          </div>
          <Controls zoom={zoom} reduced={reduced} onZoom={setZoom} onSimulate={simulate} />
        </div>
      </div>

      <div className="ln-phone">
        <div className="ln-phone-frame">
          <div className="ln-phone-content">
            <p className="ln-phone-intro">
              Tap a tab to see its icon move, or simulate a notification and watch the bell ring.
            </p>
            <Controls zoom={1} reduced={reduced} onZoom={setZoom} onSimulate={simulate} />
          </div>
          <PhoneBar
            state={state}
            reduced={reduced}
            onSelect={select}
            iconRef={iconRef("phone")}
            press={press("phone")}
          />
        </div>
      </div>

      <p className="ln-footer">A concept by Uzo Okafor. Not affiliated with LinkedIn.</p>

      <p className="ln-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
