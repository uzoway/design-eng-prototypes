"use client";

import { animate, motion, useMotionValue } from "motion/react";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type KeyboardEvent, type Ref, type RefObject } from "react";
import { LINKEDIN_EASE } from "./icons";
import { CARET } from "./paths";

export type CaretHandle = { nudge(): void };

/** caret-down-fill-small: nudges down a pixel on hover, flips when the menu opens. */
export function Caret({ open, reduced, handle }: { open: boolean; reduced: boolean; handle: Ref<CaretHandle> }) {
  const flip = useMotionValue(open ? 180 : 0);
  const drop = useMotionValue(0);
  const busy = useRef(0);
  const pathRef = useRef<SVGPathElement>(null);
  // rotate() with an explicit centre, so WebKit and Chrome pivot alike.
  const transform = () => `translate(0 ${Math.round(drop.get() * 1e4) / 1e4}) rotate(${Math.round(flip.get() * 100) / 100} 8 8.75)`;

  useLayoutEffect(() => {
    const apply = () => pathRef.current?.setAttribute("transform", transform());
    const stops = [flip.on("change", apply), drop.on("change", apply)];

    return () => stops.forEach((stop) => stop());
    // The motion values never change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const target = open ? 180 : 0;

    if (reduced) flip.jump(target);
    else animate(flip, target, { duration: 0.2, ease: LINKEDIN_EASE });
  }, [open, reduced, flip]);

  useImperativeHandle(handle, () => ({
    nudge() {
      if (reduced || performance.now() < busy.current) return;

      busy.current = performance.now() + 200;
      animate(drop, [drop.get(), 1, 0], { duration: 0.2, times: [0, 0.4, 1], ease: ["easeOut", "easeInOut"] });
    },
  }));

  return (
    <svg className="ln-caret" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true" focusable="false">
      <path ref={pathRef} fill="currentColor" d={CARET} transform={transform()} />
    </svg>
  );
}

type MenuProps = {
  id: string;
  reduced: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: (returnFocus: boolean) => void;
};

const ROWS = ["Settings & Privacy", "Help", "Sign out"];

/**
 * Me's dropdown, kept plain and inert: every item just closes it. It takes
 * focus on its first item, moves with the arrow keys and closes on Escape,
 * Tab or a click outside.
 */
export function MeMenu({ id, reduced, triggerRef, onClose }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    items()[0]?.focus({ preventScroll: true });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;

      onClose(false);
    };

    // Escape closes it wherever focus is, even if it's still on Me.
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      onClose(true);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [onClose, triggerRef]);

  const onKeyDown = (event: KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };

    switch (event.key) {
      case "ArrowDown":
        return move(index + 1);
      case "ArrowUp":
        return move(index - 1);
      case "Home":
        return move(0);
      case "End":
        return move(list.length - 1);
      case "Tab":
        return onClose(false);
    }
  };

  return (
    <motion.div
      ref={menuRef}
      id={id}
      className="ln-menu"
      role="menu"
      aria-label="Uzo Okafor"
      onKeyDown={onKeyDown}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.1, ease: "easeOut" } }}
      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* A menu holds only its items; the header is the menu's name instead. */}
      <div className="ln-menu-head" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ln-menu-avatar" src="/linkedin-nav/me.jpg" width="56" height="56" alt="" />
        <div>
          <p className="ln-menu-name">Uzo Okafor</p>
          <p className="ln-menu-headline">Design Engineer</p>
        </div>
      </div>
      <button type="button" role="menuitem" tabIndex={-1} className="ln-menu-pill" onClick={() => onClose(true)}>
        View profile
      </button>
      <div className="ln-menu-rule" role="separator" />
      {ROWS.map((row) => (
        <button key={row} type="button" role="menuitem" tabIndex={-1} className="ln-menu-row" onClick={() => onClose(true)}>
          {row}
        </button>
      ))}
    </motion.div>
  );
}
