"use client";

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Badge } from "./badge";
import { LINKEDIN_EASE, NavIcon, type IconHandle } from "./icons";
import { POST } from "./paths";
import { LABELS, tabName, type NavState, type Tab } from "./state";

/** The iOS app's bar, in order. Messaging and Me live elsewhere on the phone. */
const PHONE_TABS = ["home", "network", "post", "notifications", "jobs"] as const;

type PhoneTab = (typeof PHONE_TABS)[number];

type PhoneBarProps = {
  state: NavState;
  reduced: boolean;
  onSelect: (tab: Tab) => void;
  iconRef: (tab: Tab) => (handle: IconHandle | null) => void;
  press: (tab: Tab, down: boolean) => void;
};

/**
 * LinkedIn's iOS tab bar: five equal tabs, the selected one marked by a
 * line at the top of the bar, under the hairline. A tap plays the tab's full
 * animation; there's no hover here.
 */
export function PhoneBar({ state, reduced, onSelect, iconRef, press }: PhoneBarProps) {
  const index = PHONE_TABS.indexOf(state.selected as PhoneTab);
  const position = useMotionValue(Math.max(0, index));
  // Each step is one tab: the indicator's own width plus the 5pt of inset around it.
  const transform = useTransform(position, (value) => `translateX(calc(${value} * (100% + 5px)))`);
  const visible = index >= 0;

  // A finger sinks the icon; lifting it (or sliding off) pops it back.
  const pressed = useRef<Tab | null>(null);
  const down = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    const tab = event.currentTarget.dataset.tab as Tab;

    pressed.current = tab;
    press(tab, true);
  };
  const up = () => {
    if (pressed.current) press(pressed.current, false);
    pressed.current = null;
  };

  useEffect(() => {
    if (index < 0) return;

    if (reduced) position.jump(index);
    else animate(position, index, { duration: 0.26, ease: LINKEDIN_EASE });
  }, [index, reduced, position]);

  return (
    <nav className="ln-phone-bar" aria-label="Primary">
      <ul className="ln-phone-items">
        {PHONE_TABS.map((tab) =>
          tab === "post" ? (
            <li key={tab} className="ln-phone-li">
              <PostButton reduced={reduced} />
            </li>
          ) : (
            <li key={tab} className="ln-phone-li">
              <button
                type="button"
                className="ln-phone-item"
                aria-current={tab === state.selected ? "page" : undefined}
                aria-label={tabName(tab, state.counts[tab])}
                onClick={() => onSelect(tab)}
                data-tab={tab}
                onPointerDown={down}
                onPointerUp={up}
                onPointerCancel={up}
                onPointerLeave={up}
              >
                <span className="ln-icon-box">
                  <NavIcon tab={tab} selected={tab === state.selected} handle={iconRef(tab)} reduced={reduced} />
                  <AnimatePresence initial={false}>
                    {state.counts[tab] > 0 && (
                      <Badge
                        key="badge"
                        kind={tab === "home" ? "dot" : "count"}
                        count={state.counts[tab]}
                        reduced={reduced}
                      />
                    )}
                  </AnimatePresence>
                </span>
                <span className="ln-phone-label">{LABELS[tab]}</span>
              </button>
            </li>
          ),
        )}
      </ul>
      <motion.span className="ln-phone-indicator" aria-hidden="true" style={{ transform, opacity: visible ? 1 : 0 }} />
    </nav>
  );
}

/** Post never takes a selected state: a tap presses it and spins the plus a quarter turn. */
function PostButton({ reduced }: { reduced: boolean }) {
  const turn = useMotionValue(0);
  const plusRef = useRef<SVGPathElement>(null);

  useLayoutEffect(
    () =>
      turn.on("change", (value) => {
        plusRef.current?.setAttribute("transform", `rotate(${Math.round(value * 100) / 100} 12 12)`);
      }),
    [turn],
  );

  const spin = () => {
    if (reduced) return;

    // A quarter turn looks the same at the end, so each tap can add another.
    animate(turn, Math.round(turn.get() / 90) * 90 + 90, {
      type: "spring",
      stiffness: 380,
      damping: 26,
    });
  };

  return (
    <motion.button
      type="button"
      className="ln-phone-item ln-post"
      onClick={spin}
      whileTap={reduced ? undefined : { scale: 0.9 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
    >
      <span className="ln-icon-box">
        <svg
          className="ln-icon"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={POST.square} />
          <path ref={plusRef} fill="currentColor" d={POST.plus} />
        </svg>
      </span>
      <span className="ln-phone-label">Post</span>
    </motion.button>
  );
}
