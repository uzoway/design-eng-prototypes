"use client";

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { Badge } from "./badge";
import { LINKEDIN_EASE, NavIcon, type IconHandle } from "./icons";
import { Caret, MeMenu, type CaretHandle } from "./me-menu";
import { LABELS, TABS, tabName, type NavState, type Tab } from "./state";

/** Every item is 80px wide, edge to edge, as measured on linkedin.com. */
export const ITEM_WIDTH = 80;
const ME = TABS.length;
/** Where linkedin-nav.css swaps to the phone bar. */
const PHONE_LAYOUT = "(max-width: 640px)";

/** The hover line: snappy, critically damped, retargeted from its current velocity. */
const HOVER_SPRING = { type: "spring", stiffness: 520, damping: 46 } as const;
const HOVER_FADE = { duration: 0.12, ease: "easeOut" } as const;
/*
 * The selected line moves on LinkedIn's curve, but not as a rigid bar: its
 * leading edge sets off for the new tab first and the trailing edge follows,
 * so it stretches on the way and lands at its own width.
 */
const LEAD = { duration: 0.2, ease: LINKEDIN_EASE };
const TRAIL = { duration: 0.3, ease: LINKEDIN_EASE };

type NavBarProps = {
  state: NavState;
  reduced: boolean;
  onSelect: (tab: Tab) => void;
  iconRef: (tab: Tab) => (handle: IconHandle | null) => void;
  hint: (tab: Tab, direction: number) => void;
  press: (tab: Tab, down: boolean) => void;
};

/**
 * LinkedIn's desktop top nav, from Home to Me. Two lines sit under it: the
 * selected line, solid, which only moves on click, and a faint hover line
 * that follows the pointer and keyboard focus between tabs.
 */
export function NavBar({ state, reduced, onSelect, iconRef, hint, press }: NavBarProps) {
  const selectedIndex = TABS.indexOf(state.selected);

  const lineLeft = useMotionValue(selectedIndex * ITEM_WIDTH);
  const lineRight = useMotionValue((selectedIndex + 1) * ITEM_WIDTH);
  const hoverX = useMotionValue(selectedIndex * ITEM_WIDTH);
  const hoverOpacity = useMotionValue(0);
  const underlineTransform = useTransform(
    [lineLeft, lineRight],
    ([left, right]: number[]) => `translateX(${left}px) scaleX(${(right - left) / ITEM_WIDTH})`,
  );
  const hoverTransform = useTransform(hoverX, (x) => `translateX(${x}px)`);

  const pointerAt = useRef<number | null>(null);
  const focusAt = useRef<number | null>(null);
  const lastFocus = useRef<number | null>(null);
  const pressedAt = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const lineShown = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  // Each opening is a new menu, so one reopened while the last is still
  // leaving mounts afresh and takes focus, instead of reviving the old one.
  const [menuSerial, setMenuSerial] = useState(0);
  const meRef = useRef<HTMLButtonElement>(null);
  const caretRef = useRef<CaretHandle>(null);
  const menuId = useId();

  /* The selected line moves on every change; on first load it's already in place. */
  useEffect(() => {
    const left = selectedIndex * ITEM_WIDTH;
    const right = left + ITEM_WIDTH;

    if (reduced) {
      lineLeft.jump(left);
      lineRight.jump(right);

      return;
    }

    const rightwards = left > lineLeft.get();

    animate(lineLeft, left, rightwards ? TRAIL : LEAD);
    animate(lineRight, right, rightwards ? LEAD : TRAIL);
  }, [selectedIndex, reduced, lineLeft, lineRight]);

  /*
   * The hover line goes wherever the pointer is, else wherever keyboard
   * focus is. It fades in where it's needed rather than sliding in from
   * somewhere else, and fades out where it stands, including over Me,
   * which is a menu and never takes a line.
   */
  const placeLine = useCallback(() => {
    const target = pointerAt.current ?? focusAt.current;

    if (target === null || target === ME) {
      if (lineShown.current) animate(hoverOpacity, 0, HOVER_FADE);
      lineShown.current = false;

      return;
    }

    const x = target * ITEM_WIDTH;

    if (!lineShown.current || reduced) {
      hoverX.jump(x);
    } else {
      animate(hoverX, x, HOVER_SPRING);
    }

    if (!lineShown.current) animate(hoverOpacity, 1, HOVER_FADE);
    lineShown.current = true;
  }, [hoverOpacity, hoverX, reduced]);

  const indexOf = (event: { currentTarget: HTMLElement }) => Number(event.currentTarget.dataset.index);

  const enter = (event: PointerEvent<HTMLButtonElement>) => {
    // Touch has no hover: no hint, no line.
    if (event.pointerType === "touch") return;

    const index = indexOf(event);
    const box = event.currentTarget.getBoundingClientRect();
    // Came in from the left half: the pointer is travelling right.
    const direction = event.clientX < box.left + box.width / 2 ? 1 : -1;

    pointerAt.current = index;
    placeLine();

    if (index === ME) caretRef.current?.nudge();
    else hint(TABS[index], direction);
  };

  /*
   * Pressing sinks the icon and darkens the hover line; letting go pops it
   * back out. Dragging off before letting go cancels, as a button should,
   * and the icon comes back without a selection.
   */
  const setPressed = (index: number | null) => {
    pressedAt.current = index;
    navRef.current?.toggleAttribute("data-pressed", index !== null && index !== ME);
  };

  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    const index = indexOf(event);

    setPressed(index);
    if (index !== ME) press(TABS[index], true);
  };

  const up = () => {
    const index = pressedAt.current;

    if (index === null) return;

    setPressed(null);
    if (index !== ME) press(TABS[index], false);
  };

  const leave = (event: PointerEvent) => {
    up();
    if (event.pointerType === "touch") return;

    pointerAt.current = null;
    placeLine();
  };

  const focus = (event: FocusEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.matches(":focus-visible")) return;

    const index = indexOf(event);
    // Shift-Tab and arrows back play the hint the other way.
    const direction = lastFocus.current !== null && index < lastFocus.current ? -1 : 1;

    focusAt.current = index;
    lastFocus.current = index;
    placeLine();

    // The pointer's already played the hint if it's resting here.
    if (pointerAt.current === index) return;

    if (index === ME) caretRef.current?.nudge();
    else hint(TABS[index], direction);
  };

  const blur = () => {
    focusAt.current = null;
    placeLine();
  };

  /* The phone layout has no Me tab, so its menu can't be left open behind it. */
  useEffect(() => {
    if (!menuOpen) return;

    const phone = window.matchMedia(PHONE_LAYOUT);
    const close = () => {
      if (phone.matches) setMenuOpen(false);
    };

    phone.addEventListener("change", close);

    return () => phone.removeEventListener("change", close);
  }, [menuOpen]);

  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) meRef.current?.focus();
  }, []);

  return (
    <div className="ln-bar">
      <nav ref={navRef} className="ln-nav" aria-label="Primary">
        <ul className="ln-items" onPointerLeave={leave}>
          {TABS.map((tab, index) => {
            const selected = tab === state.selected;
            const count = state.counts[tab];

            return (
              <li key={tab} className="ln-li">
                <button
                  type="button"
                  className="ln-item"
                  aria-current={selected ? "page" : undefined}
                  aria-label={tabName(tab, count)}
                  onClick={() => onSelect(tab)}
                  data-index={index}
                  onPointerEnter={enter}
                  onPointerDown={down}
                  onPointerUp={up}
                  onPointerCancel={up}
                  onPointerLeave={up}
                  onFocus={focus}
                  onBlur={blur}
                >
                  <span className="ln-icon-box">
                    <NavIcon tab={tab} selected={selected} handle={iconRef(tab)} reduced={reduced} />
                    <AnimatePresence initial={false}>
                      {count > 0 && (
                        <Badge
                          key="badge"
                          kind={tab === "home" ? "dot" : "count"}
                          count={count}
                          pulse={state.pulses[tab]}
                          reduced={reduced}
                        />
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="ln-label">{LABELS[tab]}</span>
                </button>
              </li>
            );
          })}

          <li className="ln-li ln-me">
            <button
              ref={meRef}
              type="button"
              className="ln-item"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
              onClick={() => {
                if (!menuOpen) setMenuSerial((serial) => serial + 1);
                setMenuOpen(!menuOpen);
              }}
              data-index={ME}
              onPointerEnter={enter}
              onPointerDown={down}
              onPointerUp={up}
              onPointerCancel={up}
              onPointerLeave={up}
              onFocus={focus}
              onBlur={blur}
            >
              <span className="ln-icon-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ln-avatar" src="/linkedin-nav/me.jpg" width="24" height="24" alt="" />
              </span>
              <span className="ln-label ln-me-label">
                Me
                <Caret open={menuOpen} reduced={reduced} handle={caretRef} />
              </span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <MeMenu key={menuSerial} id={menuId} reduced={reduced} triggerRef={meRef} onClose={closeMenu} />
              )}
            </AnimatePresence>
          </li>
        </ul>

        {/* Drawn under the selected line, so a click reads as the two merging. */}
        <motion.span
          className="ln-hover-line"
          aria-hidden="true"
          style={{ transform: hoverTransform, opacity: hoverOpacity }}
        />
        <motion.span className="ln-underline" aria-hidden="true" style={{ transform: underlineTransform }} />
      </nav>
    </div>
  );
}
