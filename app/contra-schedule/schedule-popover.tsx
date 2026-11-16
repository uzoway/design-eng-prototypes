"use client";

import { animate, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { ChevronRightIcon, TrashIcon } from "./icons";
import { formatWhenInline, quickPicks } from "./schedule";
import { ScheduleCalendar } from "./schedule-calendar";

export type PopoverMode = "new" | "reschedule";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/**
 * The popover grows to the calendar's height and back. A strong ease-out, not
 * a spring: a spring starts from rest, so the incoming view had faded in
 * while the height had barely moved and then caught up late. This moves at
 * once, ahead of the content.
 */
const RESIZE = { duration: 0.24, ease: EASE_OUT } as const;
const WIDTH = 320;
/** Kept clear of the column's edges, which on a phone are the screen's. */
const EDGE = 8;
/** The gap between the trigger and the popover: Contra's menus sit 8px off theirs. */
const OFFSET = 8;

type Place = { left: number; top?: number; bottom?: number; originX: number; side: "below" | "above" };

/**
 * The schedule popover, in Contra's menu style. Two views share it: quick
 * picks, and a calendar with a time list. Both stay mounted and stacked, so
 * switching between them is only ever a change of target and can be
 * interrupted at any point.
 */
export function SchedulePopover({
  ref,
  anchor,
  container,
  openId,
  mode,
  value,
  now,
  reduced,
  onPick,
  onRemove,
  onClose,
}: {
  ref: Ref<HTMLDivElement>;
  /** The control it opened from. */
  anchor: HTMLElement;
  /** The column it's positioned in, so it scrolls with the page. */
  container: HTMLElement;
  /**
   * Counts each time it's opened. Opened again while it was still closing,
   * it's the same popover turned round, and this is how it knows to start over.
   */
  openId: number;
  mode: PopoverMode;
  value: number | null;
  now: number;
  reduced: boolean;
  onPick: (at: number) => void;
  onRemove?: () => void;
  onClose: (reason: "escape" | "outside") => void;
}) {
  const [view, setView] = useState<"picks" | "custom">("picks");
  const [place, setPlace] = useState<Place | null>(null);
  const [opened, setOpened] = useState(openId);

  // Reopened mid-close: back to the quick picks, as if it had opened fresh.
  if (opened !== openId) {
    setOpened(openId);
    setView("picks");
  }

  const rootRef = useRef<HTMLDivElement | null>(null);
  const picksRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const customTriggerRef = useRef<HTMLButtonElement>(null);

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;

      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  /* ------------------------------------------------------------------------ */
  /* Position: under its trigger, inside the column                           */
  /* ------------------------------------------------------------------------ */

  const position = useCallback(
    (keepSide?: Place["side"]) => {
      const box = container.getBoundingClientRect();
      // A chip's button sits inside its pill; the popover lines up with the pill.
      const trigger = (anchor.closest<HTMLElement>("[data-pop-anchor]") ?? anchor).getBoundingClientRect();
      const width = Math.min(WIDTH, box.width - EDGE * 2);
      const centre = trigger.left + trigger.width / 2 - box.left;

      // Opens from the trigger's own side: right-aligned to a trigger on the right, left-aligned otherwise.
      const fromRight = centre > box.width / 2;
      const wanted = fromRight ? trigger.right - box.left - width : trigger.left - box.left;
      const left = Math.round(Math.max(EDGE, Math.min(wanted, box.width - width - EDGE)));

      /*
       * It opens on the side with room for its taller view, the calendar, so
       * switching views never runs it off the screen. With room on neither
       * side (a phone) it opens below, where the page can scroll to it: above,
       * it could grow past the top of the page, out of reach.
       */
      const tallest = Math.max(picksRef.current?.offsetHeight ?? 0, customRef.current?.offsetHeight ?? 0);
      const needed = tallest + OFFSET + EDGE;
      const below = window.innerHeight - trigger.bottom;
      const above = trigger.top;
      const side = keepSide ?? (below >= needed || above < needed ? "below" : "above");

      setPlace({
        left,
        originX: Math.round(centre - left),
        side,
        ...(side === "below"
          ? { top: Math.round(trigger.bottom - box.top + OFFSET) }
          : { bottom: Math.round(box.bottom - trigger.top + OFFSET) }),
      });
    },
    [anchor, container],
  );

  const sideRef = useRef<Place["side"] | undefined>(undefined);
  const placeRef = useRef<Place | null>(null);

  useEffect(() => {
    placeRef.current = place;
  }, [place]);

  /**
   * Scrolls the page just enough to show the popover at a height it's heading
   * for, when that would run past the screen's edge (the calendar on a phone).
   */
  function reveal(target: number) {
    const at = placeRef.current;

    if (!at) return;

    const box = container.getBoundingClientRect();
    const behavior = reduced ? "instant" : "smooth";

    if (at.side === "below" && at.top !== undefined) {
      const over = box.top + at.top + target - (window.innerHeight - EDGE);

      if (over > 0) window.scrollBy({ top: over, behavior });
    } else if (at.side === "above" && at.bottom !== undefined) {
      const over = EDGE - (box.bottom - at.bottom - target);

      if (over > 0) window.scrollBy({ top: -over, behavior });
    }
  }

  useLayoutEffect(() => {
    position(sideRef.current);
  }, [position]);

  useEffect(() => {
    sideRef.current = place?.side;
  }, [place?.side]);

  useEffect(() => {
    // The trigger moves when the window is resized or the card around it changes height.
    const update = () => position(sideRef.current);
    const observer = new ResizeObserver(update);

    observer.observe(container);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [container, position]);

  /* ------------------------------------------------------------------------ */
  /* Height: follows whichever view is showing                                */
  /* ------------------------------------------------------------------------ */

  const height = useMotionValue<number | string>("auto");
  const shown = useRef<"picks" | "custom" | null>(null);

  useLayoutEffect(() => {
    const node = (view === "picks" ? picksRef : customRef).current;

    if (!node) return;

    const first = shown.current === null;
    const switched = shown.current !== view;

    shown.current = view;

    let controls: ReturnType<typeof animate> | undefined;

    // Opening is a jump to the right height; changing view is the ease-out.
    if (first || reduced || !switched) height.jump(node.offsetHeight);
    else controls = animate(height as never, node.offsetHeight, RESIZE);

    if (switched) reveal(node.offsetHeight);

    // A view that changes height by itself (an evening pick expiring) is followed at once.
    const observer = new ResizeObserver(() => {
      if (controls) return;

      height.jump(node.offsetHeight);
    });

    observer.observe(node);
    controls?.then(() => {
      controls = undefined;
      height.jump(node.offsetHeight);
    });

    return () => {
      observer.disconnect();
      controls?.stop();
    };
    // reveal reads the latest placement through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, reduced, view]);

  /* ------------------------------------------------------------------------ */
  /* Focus and dismissal                                                      */
  /* ------------------------------------------------------------------------ */

  // Focus goes to the first pick each time the popover opens. It can't before
  // the popover is placed: it's hidden until then.
  const placed = place !== null;

  useEffect(() => {
    if (!placed) return;

    // Opened low on a phone, the page scrolls just enough to show it all.
    reveal(picksRef.current?.offsetHeight ?? 0);
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, openId]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;

      // A press on the trigger is the trigger's to handle: it closes what it opened.
      if (rootRef.current?.contains(target) || anchor.contains(target)) return;

      onClose("outside");
    }

    // Escape closes it wherever focus is: a click on the popover's own
    // background leaves focus on the page, and Safari never focuses a clicked button.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;

      event.preventDefault();
      onClose("escape");
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchor, onClose]);

  function onKeyDown(event: React.KeyboardEvent) {
    // Focus stays inside while it's open: Tab wraps from the last control to the first.
    if (event.key === "Tab") {
      const root = rootRef.current;

      if (!root) return;

      const stops = [...root.querySelectorAll<HTMLElement>("button, [tabindex]")].filter(
        (node) => node.tabIndex >= 0 && !node.closest("[inert]") && !(node as HTMLButtonElement).disabled,
      );

      if (stops.length === 0) return;

      const first = stops[0];
      const last = stops[stops.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onMenuKeyDown(event: React.KeyboardEvent) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;

    if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
    else if (event.key === "ArrowUp") next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "ArrowRight" && document.activeElement === customTriggerRef.current) {
      event.preventDefault();
      showCustom();

      return;
    }

    if (next >= 0) {
      event.preventDefault();
      items[next].focus();
    }
  }

  function showCustom() {
    setView("custom");
  }

  function showPicks() {
    setView("picks");
  }

  // Back from the calendar, focus returns to the row that led there. After the
  // render, because the picks are inert until they're the view on show again.
  const lastView = useRef(view);

  useEffect(() => {
    if (view === "picks" && lastView.current === "custom") customTriggerRef.current?.focus({ preventScroll: true });

    lastView.current = view;
  }, [view]);

  const picks = quickPicks(now);
  const title = mode === "reschedule" ? "Reschedule" : "Schedule post";
  const subtitle =
    value !== null
      ? `Goes out ${formatWhenInline(value, now)}`
      : "Pick when it goes out. It’ll wait in Scheduled till then.";

  const slide = (active: boolean, from: number) =>
    active
      ? {
          opacity: 1,
          transform: "translateX(0px)",
          // In just after the old view has mostly gone, so the two never sit half-faded on top of each other.
          transition: { duration: 0.2, ease: EASE_OUT, delay: reduced ? 0 : 0.05 },
        }
      : {
          opacity: 0,
          transform: reduced ? "translateX(0px)" : `translateX(${from}px)`,
          transition: { duration: 0.08, ease: EASE_OUT },
        };

  return (
    <motion.div
      ref={setRoot}
      className="cs-pop"
      role="dialog"
      aria-label={mode === "reschedule" ? "Reschedule post" : "Schedule post"}
      data-side={place?.side}
      style={{
        left: place?.left,
        top: place?.top,
        bottom: place?.bottom,
        width: Math.min(WIDTH, container.clientWidth - EDGE * 2),
        // Grows out of the control that opened it.
        transformOrigin: place ? `${place.originX}px ${place.side === "below" ? "top" : "bottom"}` : undefined,
        visibility: place ? "visible" : "hidden",
      }}
      // Scales out of its trigger, whichever side that's on: the origin carries the direction.
      initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(0.96)" }}
      animate={{
        opacity: 1,
        transform: "scale(1)",
        transition: { duration: 0.18, ease: EASE_OUT },
      }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }
          : { opacity: 0, transform: "scale(0.96)", transition: { duration: 0.12, ease: EASE_OUT } }
      }
      onKeyDown={onKeyDown}
    >
      <motion.div className="cs-pop-body" style={{ height }}>
        <motion.div
          ref={picksRef}
          className="cs-pop-view"
          inert={view !== "picks"}
          initial={false}
          animate={slide(view === "picks", -12)}
        >
          <div className="cs-pop-head">
            <h2 className="cs-pop-title">{title}</h2>
            <p className="cs-pop-sub">{subtitle}</p>
          </div>

          <div ref={menuRef} className="cs-menu" role="menu" aria-label={title} onKeyDown={onMenuKeyDown}>
            {picks.map((pick) => (
              <button
                key={pick.id}
                type="button"
                role="menuitem"
                className="cs-menu-item"
                onClick={() => onPick(pick.at.getTime())}
              >
                <span>{pick.label}</span>
                <span className="cs-menu-hint">{pick.hint}</span>
              </button>
            ))}

            <div className="cs-menu-rule" role="separator" />

            <button
              ref={customTriggerRef}
              type="button"
              role="menuitem"
              className="cs-menu-item"
              aria-haspopup="true"
              onClick={showCustom}
            >
              <span>Pick date &amp; time</span>
              <ChevronRightIcon className="cs-menu-chevron" />
            </button>

            {mode === "new" && value !== null && onRemove && (
              <button type="button" role="menuitem" className="cs-menu-item cs-menu-item--danger" onClick={onRemove}>
                <TrashIcon />
                <span>Remove schedule</span>
              </button>
            )}
          </div>
        </motion.div>

        <motion.div
          ref={customRef}
          className="cs-pop-view"
          inert={view !== "custom"}
          initial={false}
          animate={slide(view === "custom", 12)}
        >
          <ScheduleCalendar
            active={view === "custom"}
            value={value}
            now={now}
            reduced={reduced}
            confirm={mode === "reschedule" ? "Save" : "Done"}
            onBack={showPicks}
            onConfirm={onPick}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
