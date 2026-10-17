"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  addRange,
  awayDaysIn,
  buildGrid,
  dayText,
  levelOf,
  localToday,
  MONTHS,
  newId,
  parts,
  plural,
  rangeSummary,
  reasonFor,
  removeRange,
  shortDate,
  contributionsOn,
  type AwayRange,
  type View,
} from "./calendar";
import { AwayPanel, type PanelState } from "./away-panel";
import { CheckIcon, RepoIcon, TriangleDownIcon } from "./octicons";
import "./time-away.css";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
const LEVEL_NAMES = [
  "No contributions.",
  "Low contributions.",
  "Medium-low contributions.",
  "Medium-high contributions.",
  "High contributions.",
];

/** Long-press before a touch drag selects instead of scrolling the graph. */
const LONG_PRESS_MS = 320;
const TOUCH_SLOP = 8;

/** Dragging this close to the edge of a scrolling graph scrolls it. */
const AUTO_SCROLL_EDGE = 32;

const PANEL_WIDTH = 352;

/*
 * Grid geometry, as on github.com. The table gets explicit column widths:
 * left to the browser, Safari squeezes 10px days down to 7px to fit.
 */
const DAY_SIZE = 10;
const DAY_GAP = 3;
const LABEL_WIDTH = 28;

/** Overlay easing from Primer. */
const EASE_OUT: [number, number, number, number] = [0.33, 1, 0.68, 1];

/* "Today" comes from the visitor's clock, so the graph renders on the client. */
let cachedToday: number | null = null;

function getToday() {
  cachedToday ??= localToday();

  return cachedToday;
}

const subscribeToNothing = () => () => {};

export function TimeAway() {
  const today = useSyncExternalStore(subscribeToNothing, getToday, () => null);

  if (today === null) return <div className="ta-root ta-loading" aria-busy="true" />;

  return <Profile today={today} />;
}

/* ------------------------------------------------------------------------ */

type Selection = { anchor: number; focus: number };

type DialogState = PanelState;

type Tip = { day: number; mode: "day" | "range" };

/** Per-day animation delays for the wave that fills or clears a range. */
type Wave = Map<number, number>;

type Settings = { private: boolean; overview: boolean; away: boolean };

type Drag = {
  pointerId: number;
  /** Last pointer position, for auto-scroll while the pointer rests at an edge. */
  x: number;
  y: number;
  anchor: number;
  focus: number;
  startDay: number;
  moved: boolean;
  extend: boolean;
};

type Press = { pointerId: number; day: number; x: number; y: number; timer: number };

function ordered(selection: Selection): [number, number] {
  return selection.anchor <= selection.focus
    ? [selection.anchor, selection.focus]
    : [selection.focus, selection.anchor];
}

function Profile({ today }: { today: number }) {
  const reducedMotion = useReducedMotion() ?? false;

  const [view, setView] = useState<View>("last");
  const [ranges, setRanges] = useState<AwayRange[]>([]);
  const [settings, setSettings] = useState<Settings>({ private: true, overview: true, away: true });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cursor, setCursor] = useState(today);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [enter, setEnter] = useState<Wave | null>(null);
  const [leave, setLeave] = useState<Wave | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const pressRef = useRef<Press | null>(null);
  const lastInputRef = useRef<"pointer" | "touch" | "keyboard">("pointer");
  const waveTimerRef = useRef(0);
  const autoScrollRef = useRef(0);
  const announceTimerRef = useRef(0);

  const headingId = useId();
  const legendId = useId();

  /* ---------------------------------------------------------------------- */
  /* Data for the period on screen                                          */
  /* ---------------------------------------------------------------------- */

  const grid = useMemo(() => buildGrid(view, today), [view, today]);

  const counts = useMemo(() => {
    const map = new Map<number, number>();

    for (let day = grid.first; day <= grid.last; day += 1) {
      const contribution = contributionsOn(day, today);

      map.set(day, settings.private ? contribution.total : contribution.public);
    }

    return map;
  }, [grid, today, settings.private]);

  const max = useMemo(() => Math.max(0, ...counts.values()), [counts]);
  const total = useMemo(() => [...counts.values()].reduce((sum, n) => sum + n, 0), [counts]);

  const shownRanges = useMemo(() => (settings.away ? ranges : []), [ranges, settings.away]);

  const awayByDay = useMemo(() => {
    const map = new Map<number, AwayRange>();

    for (const range of shownRanges) {
      for (let day = Math.max(range.start, grid.first); day <= Math.min(range.end, grid.last); day += 1) {
        map.set(day, range);
      }
    }

    return map;
  }, [shownRanges, grid]);

  const awayDays = awayDaysIn(shownRanges, grid.first, grid.last);
  const selected = selection ? ordered(selection) : null;
  const safeCursor = Math.min(Math.max(cursor, grid.first), grid.last);

  /* ---------------------------------------------------------------------- */
  /* Small helpers                                                          */
  /* ---------------------------------------------------------------------- */

  const cellFor = useCallback(
    (day: number) => tableRef.current?.querySelector<HTMLElement>(`td[data-day="${day}"]`) ?? null,
    [],
  );

  const focusDay = useCallback(
    (day: number) => cellFor(day)?.focus({ preventScroll: false }),
    [cellFor],
  );

  const announce = useCallback((message: string, delay = 0) => {
    window.clearTimeout(announceTimerRef.current);
    announceTimerRef.current = window.setTimeout(() => setAnnouncement(message), delay);
  }, []);

  const tooltipText = (current: Tip) => {
    if (current.mode === "range" && selected) return rangeSummary(selected[0], selected[1]);

    const away = awayByDay.get(current.day);
    const text = dayText(counts.get(current.day) ?? 0, current.day, away);

    return away && (counts.get(current.day) ?? 0) === 0 ? `${away.emoji} ${text}` : text;
  };

  /** Where the dialog sits: under the graph, centred on the selected weeks. */
  const dialogPosition = useCallback(
    (start: number, end: number) => {
      const root = rootRef.current!.getBoundingClientRect();
      const table = tableRef.current!.getBoundingClientRect();
      const first = cellFor(Math.max(start, grid.first))?.getBoundingClientRect();
      const last = cellFor(Math.min(end, grid.last))?.getBoundingClientRect();
      // Stay within the graph's column so the year list is never covered.
      const column = boxRef.current!.getBoundingClientRect();
      const minLeft = column.left - root.left;
      const maxRight = column.right - root.left;
      const width = Math.min(PANEL_WIDTH, column.width);
      const centre = first && last ? (first.left + last.right) / 2 - root.left : minLeft + column.width / 2;
      const left = Math.min(Math.max(centre - width / 2, minLeft), maxRight - width);
      const originX = Math.min(Math.max(centre - left, 24), width - 24);

      return { left, top: table.bottom - root.top + 8, width, originX };
    },
    [cellFor, grid.first, grid.last],
  );

  /* ---------------------------------------------------------------------- */
  /* Opening and closing the dialog                                         */
  /* ---------------------------------------------------------------------- */

  const contributionNote = (start: number, end: number) => {
    const busy: number[] = [];

    for (let day = Math.max(start, grid.first); day <= Math.min(end, grid.last); day += 1) {
      if ((counts.get(day) ?? 0) > 0) busy.push(day);
    }

    if (busy.length === 0) return null;

    if (busy.length === end - start + 1) {
      return busy.length === 1
        ? "This day has contributions, so it stays green."
        : "Every day here has contributions, so they all stay green.";
    }

    if (busy.length === 1) {
      return `${shortDate(busy[0])} has ${plural(counts.get(busy[0]) ?? 0, "contribution")}, so it stays green.`;
    }

    return `${busy.length} of these days have contributions, so they stay green.`;
  };

  const openCreate = (start: number, end: number) => {
    setSelection({ anchor: start, focus: end });
    setTip(null);
    setDialog({
      mode: "create",
      start,
      end,
      initialText: "",
      position: dialogPosition(start, end),
      note: contributionNote(start, end),
      focusInput: lastInputRef.current !== "touch",
    });
  };

  const openEdit = (range: AwayRange) => {
    setSelection({ anchor: range.start, focus: range.end });
    setTip(null);
    setDialog({
      mode: "edit",
      start: range.start,
      end: range.end,
      rangeId: range.id,
      initialText: range.label === "Away" ? "" : range.label,
      position: dialogPosition(range.start, range.end),
      note: contributionNote(range.start, range.end),
      focusInput: lastInputRef.current !== "touch",
    });
  };

  const closeDialog = (restoreFocus: boolean) => {
    setDialog(null);
    setSelection(null);

    if (restoreFocus) focusDay(safeCursor);
  };

  const startWave = (wave: Wave, onDone?: () => void) => {
    const longest = Math.max(0, ...wave.values());

    window.clearTimeout(waveTimerRef.current);
    waveTimerRef.current = window.setTimeout(() => {
      onDone?.();
      setEnter(null);
      setLeave(null);
    }, longest + (reducedMotion ? 160 : 320));
  };

  const markAway = (text: string) => {
    if (!dialog) return;

    const { start, end } = dialog;
    const reason = reasonFor(text);
    const base = dialog.rangeId ? removeRange(ranges, dialog.rangeId) : ranges;
    const days = end - start + 1;
    const step = reducedMotion ? 0 : Math.min(16, 360 / days);
    const wave: Wave = new Map();

    for (let day = Math.max(start, grid.first); day <= Math.min(end, grid.last); day += 1) {
      if ((counts.get(day) ?? 0) === 0 && !awayByDay.has(day)) {
        wave.set(day, Math.round((day - start) * step));
      }
    }

    setRanges(addRange(base, { ...reason, id: newId(), start, end }));
    setLeave(null);
    setEnter(wave);
    startWave(wave);
    setCursor(Math.min(Math.max(end, grid.first), grid.last));
    setDialog(null);
    setSelection(null);
    focusDay(Math.min(Math.max(end, grid.first), grid.last));
    announce(
      `${dialog.mode === "edit" ? "Updated" : "Marked"} ${plural(days, "day")} as away: ${reason.label}.`,
    );
  };

  const removeAway = (range: AwayRange, restoreFocus = true) => {
    const step = reducedMotion ? 0 : Math.min(14, 260 / (range.end - range.start + 1));
    const wave: Wave = new Map();

    for (let day = Math.max(range.start, grid.first); day <= Math.min(range.end, grid.last); day += 1) {
      if ((counts.get(day) ?? 0) === 0) wave.set(day, Math.round((range.end - day) * step));
    }

    setEnter(null);
    setLeave(wave);
    startWave(wave, () => setRanges((current) => removeRange(current, range.id)));
    setDialog(null);
    setSelection(null);

    if (restoreFocus) focusDay(safeCursor);

    announce(`Removed time away: ${range.label}.`);
  };

  /* ---------------------------------------------------------------------- */
  /* Pointer: drag across days to select a range                            */
  /* ---------------------------------------------------------------------- */

  const dayFrom = (target: EventTarget | null) => {
    const cell = (target as Element | null)?.closest?.<HTMLElement>("td[data-day]");

    return cell ? Number(cell.dataset.day) : null;
  };

  const beginDrag = (pointerId: number, day: number, extend: boolean, x: number, y: number) => {
    const anchor = extend ? (selection?.anchor ?? safeCursor) : day;

    dragRef.current = { pointerId, x, y, anchor, focus: day, startDay: day, moved: false, extend };
    setDialog(null);
    setSelection({ anchor, focus: day });
    setDragging(true);
    setHot(null);
    setCursor(day);
    setTip({ day, mode: "range" });
    focusDay(day);
  };

  /**
   * The day under the pointer, with the pointer pinned inside the days: past
   * the last week you get the last week, over the weekday labels the first.
   */
  const dayNear = (x: number, y: number) => {
    const scroller = scrollerRef.current?.getBoundingClientRect();
    const body = tableRef.current?.tBodies[0]?.getBoundingClientRect();

    if (!scroller || !body) return null;

    const left = Math.max(scroller.left, body.left + 31) + 2;
    const right = Math.min(scroller.right, body.right) - 2;
    const px = Math.min(Math.max(x, left), right);
    const py = Math.min(Math.max(y, body.top + 2), body.bottom - 2);

    return dayFrom(document.elementFromPoint(px, py));
  };

  const trackDrag = (x: number, y: number) => {
    const drag = dragRef.current;

    if (!drag) return;

    drag.x = x;
    drag.y = y;

    const day = dayNear(x, y);

    // Between days (the 3px gaps) there's no cell, so keep the last one.
    if (day === null || day === drag.focus) return;

    drag.focus = day;
    drag.moved = true;
    setSelection({ anchor: drag.anchor, focus: day });
    setCursor(day);
    setTip({ day, mode: "range" });
  };

  // On narrow screens the graph scrolls; holding the pointer near an edge
  // keeps scrolling it so a range can run past what's visible.
  const autoScroll = () => {
    autoScrollRef.current = 0;

    const drag = dragRef.current;
    const scroller = scrollerRef.current;

    if (!drag || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;

    const rect = scroller.getBoundingClientRect();
    const over =
      drag.x < rect.left + AUTO_SCROLL_EDGE
        ? drag.x - (rect.left + AUTO_SCROLL_EDGE)
        : drag.x > rect.right - AUTO_SCROLL_EDGE
          ? drag.x - (rect.right - AUTO_SCROLL_EDGE)
          : 0;
    const before = scroller.scrollLeft;

    scroller.scrollLeft += Math.max(-14, Math.min(14, over / 2));

    if (scroller.scrollLeft === before) return;

    trackDrag(drag.x, drag.y);
    autoScrollRef.current = requestAnimationFrame(autoScroll);
  };

  const cancelDrag = () => {
    const drag = dragRef.current;

    if (!drag) return;

    if (tableRef.current?.hasPointerCapture?.(drag.pointerId)) {
      tableRef.current.releasePointerCapture(drag.pointerId);
    }

    cancelAnimationFrame(autoScrollRef.current);
    autoScrollRef.current = 0;
    dragRef.current = null;
    setDragging(false);
    setSelection(null);
    setTip(null);
  };

  const finishDrag = (drag: Drag) => {
    const [start, end] = ordered(drag);
    const existing = awayByDay.get(start);

    if (!drag.moved && !drag.extend && existing) {
      openEdit(existing);
    } else {
      openCreate(start, end);
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLTableElement>) => {
    if (!settings.away || event.button !== 0) return;

    const day = dayFrom(event.target);

    if (day === null) return;

    lastInputRef.current = event.pointerType === "touch" ? "touch" : "pointer";

    if (event.pointerType === "touch") {
      // A quick swipe scrolls the graph; a long press starts selecting.
      const press: Press = {
        pointerId: event.pointerId,
        day,
        x: event.clientX,
        y: event.clientY,
        timer: window.setTimeout(() => {
          pressRef.current = null;
          tableRef.current?.setPointerCapture?.(press.pointerId);
          navigator.vibrate?.(8);
          beginDrag(press.pointerId, day, false, press.x, press.y);
        }, LONG_PRESS_MS),
      };

      pressRef.current = press;

      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    beginDrag(event.pointerId, day, event.shiftKey, event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLTableElement>) => {
    const press = pressRef.current;

    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > TOUCH_SLOP) {
      window.clearTimeout(press.timer);
      pressRef.current = null;
    }

    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    trackDrag(event.clientX, event.clientY);

    if (!autoScrollRef.current) autoScrollRef.current = requestAnimationFrame(autoScroll);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLTableElement>) => {
    const press = pressRef.current;

    if (press && press.pointerId === event.pointerId) {
      // A tap: select that one day.
      window.clearTimeout(press.timer);
      pressRef.current = null;
      setCursor(press.day);
      finishDrag({
        pointerId: press.pointerId,
        x: press.x,
        y: press.y,
        anchor: press.day,
        focus: press.day,
        startDay: press.day,
        moved: false,
        extend: false,
      });

      return;
    }

    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    cancelAnimationFrame(autoScrollRef.current);
    autoScrollRef.current = 0;
    dragRef.current = null;
    setDragging(false);
    finishDrag(drag);
  };

  const onPointerCancel = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);

    pressRef.current = null;
    cancelDrag();
  };

  // While a touch drag is selecting, stop the page and the graph scrolling.
  useEffect(() => {
    const table = tableRef.current;

    if (!table) return;

    const stopScroll = (event: TouchEvent) => {
      if (dragRef.current) event.preventDefault();
    };

    table.addEventListener("touchmove", stopScroll, { passive: false });

    return () => table.removeEventListener("touchmove", stopScroll);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Keyboard: a grid with one tab stop, like the real graph                */
  /* ---------------------------------------------------------------------- */

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTableElement>) => {
    if (dayFrom(event.target) === null) return;

    // Escape mid-drag lets go without selecting anything.
    if (event.key === "Escape" && dragRef.current) {
      event.preventDefault();
      cancelDrag();
      announce("Selection cancelled.");

      return;
    }

    if (dragRef.current) return;

    lastInputRef.current = "keyboard";

    const { weekday } = parts(safeCursor);
    const firstInRow = grid.first + ((weekday - parts(grid.first).weekday + 7) % 7);
    const lastInRow = grid.last - ((parts(grid.last).weekday - weekday + 7) % 7);
    const toEdge = event.ctrlKey || event.metaKey;
    let next: number | null = null;

    switch (event.key) {
      case "ArrowLeft":
        next = safeCursor - 7;
        break;
      case "ArrowRight":
        next = safeCursor + 7;
        break;
      case "ArrowUp":
        next = weekday > 0 ? safeCursor - 1 : safeCursor;
        break;
      case "ArrowDown":
        next = weekday < 6 ? safeCursor + 1 : safeCursor;
        break;
      case "Home":
        next = toEdge ? grid.first : firstInRow;
        break;
      case "End":
        next = toEdge ? grid.last : lastInRow;
        break;
      case "PageUp":
        next = Math.max(safeCursor - 28, firstInRow);
        break;
      case "PageDown":
        next = Math.min(safeCursor + 28, lastInRow);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();

        if (!settings.away) return;

        const existing = awayByDay.get(safeCursor);

        if (selected) openCreate(selected[0], selected[1]);
        else if (existing) openEdit(existing);
        else openCreate(safeCursor, safeCursor);

        return;
      }
      case "Escape":
        if (selection) {
          event.preventDefault();
          setSelection(null);
          setTip({ day: safeCursor, mode: "day" });
          announce("Selection cleared.");
        }

        return;
      case "Delete":
      case "Backspace": {
        const existing = awayByDay.get(safeCursor);

        if (existing && settings.away) {
          event.preventDefault();
          removeAway(existing);
        }

        return;
      }
      default:
        return;
    }

    event.preventDefault();

    if (next < grid.first || next > grid.last) return;

    if (event.shiftKey && settings.away) {
      const anchor = selection?.anchor ?? safeCursor;
      const [start, end] = anchor <= next ? [anchor, next] : [next, anchor];

      setSelection({ anchor, focus: next });
      setTip({ day: next, mode: "range" });
      announce(
        `${plural(end - start + 1, "day")} selected, ${shortDate(start)} to ${shortDate(end)}. Press Enter to mark them as away.`,
        350,
      );
    } else {
      if (selection) setSelection(null);
      setTip({ day: next, mode: "day" });
    }

    setCursor(next);
    setHot(awayByDay.get(next)?.id ?? null);
    focusDay(next);
  };

  /* ---------------------------------------------------------------------- */
  /* Tooltip                                                                */
  /* ---------------------------------------------------------------------- */

  const onPointerOver = (event: ReactPointerEvent<HTMLTableElement>) => {
    if (dragRef.current || dialog || event.pointerType === "touch") return;

    const day = dayFrom(event.target);

    setTip(day === null ? null : { day, mode: "day" });
    setHot(day === null ? null : (awayByDay.get(day)?.id ?? null));
  };

  const onPointerLeave = () => {
    if (dragRef.current) return;

    setTip(null);
    setHot(null);
  };

  const onFocus = (event: React.FocusEvent<HTMLTableElement>) => {
    const day = dayFrom(event.target);

    if (day === null || dragRef.current || dialog) return;
    if (!(event.target as HTMLElement).matches(":focus-visible")) return;

    setCursor(day);
    setTip({ day, mode: selection ? "range" : "day" });
    setHot(awayByDay.get(day)?.id ?? null);
  };

  const onBlur = (event: React.FocusEvent<HTMLTableElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;

    setTip(null);
    setHot(null);
  };

  const tipText = tip && !dialog ? tooltipText(tip) : null;

  // Place the tooltip 4px above its day, kept inside the viewport.
  useLayoutEffect(() => {
    const el = tipRef.current;

    if (!el || !tip || !tipText) return;

    const cell = cellFor(tip.day)?.getBoundingClientRect();

    if (!cell) return;

    const width = el.offsetWidth;
    const left = Math.min(
      Math.max(cell.left + cell.width / 2 - width / 2, 8),
      window.innerWidth - width - 8,
    );

    el.style.left = `${left}px`;
    el.style.top = `${cell.top - el.offsetHeight - 4}px`;
  }, [tip, tipText, cellFor]);

  // A fixed tooltip would drift on scroll, so scrolling hides it.
  useEffect(() => {
    if (!tip) return;

    const hide = () => {
      if (!dragRef.current) setTip(null);
    };
    const scroller = scrollerRef.current;

    window.addEventListener("scroll", hide, { passive: true });
    scroller?.addEventListener("scroll", hide, { passive: true });

    return () => {
      window.removeEventListener("scroll", hide);
      scroller?.removeEventListener("scroll", hide);
    };
  }, [tip]);

  /* ---------------------------------------------------------------------- */
  /* Dialog: follow resizes, close on outside press                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!dialog) return;

    const reposition = () =>
      setDialog((current) =>
        current ? { ...current, position: dialogPosition(current.start, current.end) } : current,
      );

    const onOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const overlay = rootRef.current?.querySelector(".ta-overlay");

      if (overlay?.contains(target) || tableRef.current?.contains(target)) return;

      setDialog(null);
      setSelection(null);
    };

    window.addEventListener("resize", reposition);
    document.addEventListener("pointerdown", onOutside);

    return () => {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [dialog, dialogPosition]);

  // Narrow screens scroll the graph; start at the most recent weeks.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;

    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, [view]);

  useEffect(
    () => () => {
      window.clearTimeout(waveTimerRef.current);
      window.clearTimeout(announceTimerRef.current);
      if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  const changeView = (next: View) => {
    setView(next);
    setSelection(null);
    setDialog(null);
    setTip(null);

    const nextGrid = buildGrid(next, today);

    setCursor(nextGrid.last);
  };

  const period = view === "last" ? "in the last year" : `in ${view}`;
  const selectedYear = view === "last" ? parts(today).year : view;
  const showAway = settings.away && awayDays > 0;

  return (
    <div ref={rootRef} className="ta-root" data-dragging={dragging ? "" : undefined}>
      <div className="ta-layout">
        <div className="ta-main">
          <div className="ta-head">
            <h2 id={headingId} className="ta-heading">
              {total.toLocaleString("en-US")} {total === 1 ? "contribution" : "contributions"}
              {showAway ? (
                <motion.span
                  key="away"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {" "}
                  and {plural(awayDays, "day")} away
                </motion.span>
              ) : null}{" "}
              {period}
            </h2>

            <SettingsMenu settings={settings} onChange={setSettings} />
          </div>

          <div ref={boxRef} className="ta-box">
            <div className="ta-graph">
              <div ref={scrollerRef} className="ta-scroller">
                <table
                  ref={tableRef}
                  className="ta-grid"
                  style={{
                    width: DAY_GAP * (grid.weeks.length + 2) + LABEL_WIDTH + DAY_SIZE * grid.weeks.length,
                  }}
                  role="grid"
                  aria-readonly="true"
                  aria-multiselectable={settings.away ? "true" : undefined}
                  aria-labelledby={headingId}
                  aria-describedby={settings.away ? `${legendId}-help` : undefined}
                  data-selecting={selected ? "" : undefined}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  onPointerOver={onPointerOver}
                  onPointerLeave={onPointerLeave}
                  onKeyDown={onKeyDown}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onContextMenu={(event) => dragRef.current && event.preventDefault()}
                  // The grid moves focus itself. Without this, Safari's mouse
                  // event after a tap pulls focus back out of the panel.
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <caption className="sr-only">Contribution Graph</caption>
                  <colgroup>
                    <col style={{ width: LABEL_WIDTH }} />
                    {grid.weeks.map((_, column) => (
                      <col key={column} style={{ width: DAY_SIZE }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="ta-months">
                      <td className="ta-corner">
                        <span className="sr-only">Day of Week</span>
                      </td>
                      {grid.months.map((month, index) => (
                        <td key={`${month.short}-${index}`} className="ta-label" colSpan={month.span}>
                          <span className="sr-only">{month.name}</span>
                          <span aria-hidden="true" className="ta-month">
                            {month.short}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKDAYS.map((weekdayName, weekday) => (
                      <tr key={weekdayName} className="ta-row">
                        <td className="ta-label">
                          <span className="sr-only">{weekdayName}</span>
                          <span
                            aria-hidden="true"
                            className="ta-weekday"
                            data-hidden={weekday % 2 === 0 ? "" : undefined}
                          >
                            {weekdayName.slice(0, 3)}
                          </span>
                        </td>
                        {grid.weeks.map((week, column) => {
                          const day = week[weekday];

                          if (day === null) return <td key={column} className="ta-pad" />;

                          const count = counts.get(day) ?? 0;
                          const away = awayByDay.get(day);
                          const level = levelOf(count, max);
                          const isSelected = !!selected && day >= selected[0] && day <= selected[1];
                          const shaded = !!away && count === 0;

                          return (
                            <Day
                              key={column}
                              day={day}
                              level={level}
                              label={dayText(count, day, away)}
                              describedBy={
                                shaded ? `${legendId}-away` : `${legendId}-${level}`
                              }
                              selected={isSelected}
                              away={shaded}
                              enterDelay={enter?.get(day)}
                              leaveDelay={leave?.get(day)}
                              tabbable={day === safeCursor}
                              hot={!!away && away.id === hot}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ta-footer">
                <a
                  className="ta-link"
                  href="https://docs.github.com/articles/why-are-my-contributions-not-showing-up-on-my-profile"
                >
                  Learn how we count contributions
                </a>

                <div className="ta-legend">
                  <span className="ta-legend-text">Less</span>
                  {LEVEL_NAMES.map((name, level) => (
                    <span key={level} className="ta-legend-day" data-level={level}>
                      <span className="sr-only" id={`${legendId}-${level}`}>
                        {name}
                      </span>
                    </span>
                  ))}
                  <span className="ta-legend-text">More</span>

                  <AnimatePresence initial={false}>
                    {showAway ? (
                      <motion.span
                        key="away"
                        className="ta-legend-away"
                        initial={reducedMotion ? { opacity: 0 } : { width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={reducedMotion ? { opacity: 0 } : { width: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: EASE_OUT }}
                      >
                        <span className="ta-legend-away-inner">
                          <span className="ta-legend-day" data-level={0} data-away="" />
                          <span className="ta-legend-text">Away</span>
                        </span>
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                  <span className="sr-only" id={`${legendId}-away`}>
                    Marked as away.
                  </span>
                  <span className="sr-only" id={`${legendId}-help`}>
                    Drag across days, or hold Shift and use the arrow keys, then press Enter to mark
                    them as away.
                  </span>
                </div>
              </div>
            </div>

            {/* The page is centred, so animating the height lets it re-centre smoothly. */}
            <AnimatePresence initial={false}>
              {settings.overview ? (
                <motion.div
                  key="overview"
                  className="ta-overview-clip"
                  initial={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                >
                  <ActivityOverview grid={grid} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <nav className="ta-years" aria-label="Contribution years">
          <ul>
            {YEARS.map((year) => (
              <li key={year}>
                <button
                  type="button"
                  className="ta-year"
                  aria-current={year === selectedYear ? "true" : undefined}
                  onClick={() => changeView(year === parts(today).year ? "last" : year)}
                >
                  {year}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <AnimatePresence>
        {dialog ? (
          <AwayPanel
            key={`${dialog.mode}-${dialog.start}-${dialog.end}`}
            state={dialog}
            reducedMotion={reducedMotion}
            onCancel={() => closeDialog(true)}
            onSubmit={markAway}
            onRemove={() => {
              const range = ranges.find((item) => item.id === dialog.rangeId);

              if (range) removeAway(range);
            }}
          />
        ) : null}
      </AnimatePresence>

      <div
        ref={tipRef}
        className="ta-tooltip"
        role="tooltip"
        aria-hidden="true"
        data-shown={tipText ? "" : undefined}
      >
        {tipText}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* One day                                                                  */
/* ------------------------------------------------------------------------ */

type DayProps = {
  day: number;
  level: number;
  label: string;
  describedBy: string;
  selected: boolean;
  away: boolean;
  enterDelay: number | undefined;
  leaveDelay: number | undefined;
  tabbable: boolean;
  /** Part of the away range under the pointer or focus. */
  hot: boolean;
};

const Day = memo(function Day({
  day,
  level,
  label,
  describedBy,
  selected,
  away,
  enterDelay,
  leaveDelay,
  tabbable,
  hot,
}: DayProps) {
  const delay = enterDelay ?? leaveDelay;

  return (
    <td
      role="gridcell"
      className="ta-day"
      data-day={day}
      data-level={level}
      data-away={away ? "" : undefined}
      data-hot={hot ? "" : undefined}
      data-enter={enterDelay !== undefined ? "" : undefined}
      data-leave={leaveDelay !== undefined ? "" : undefined}
      style={delay !== undefined ? ({ "--delay": `${delay}ms` } as CSSProperties) : undefined}
      tabIndex={tabbable ? 0 : -1}
      aria-selected={selected}
      aria-label={label}
      aria-describedby={describedBy}
    />
  );
});

/* ------------------------------------------------------------------------ */
/* Contribution settings                                                    */
/* ------------------------------------------------------------------------ */

const SETTING_ITEMS: { key: keyof Settings; label: string; description: string }[] = [
  {
    key: "private",
    label: "Private contributions",
    description: "Turning off private contributions will show only public activity on your profile.",
  },
  {
    key: "overview",
    label: "Activity overview",
    description: "Turning off the activity overview will hide the section on your profile.",
  },
  {
    key: "away",
    label: "Time away",
    description: "Turning off time away will hide the days you marked as away.",
  },
];

function SettingsMenu({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (next: Settings) => void;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="ta-settings">
        Contribution settings
        <TriangleDownIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="ta-menu" align="start" sideOffset={4} collisionPadding={8}>
        {SETTING_ITEMS.map((item) => (
          <DropdownMenu.CheckboxItem
            key={item.key}
            className="ta-menu-item"
            checked={settings[item.key]}
            onCheckedChange={(checked) => onChange({ ...settings, [item.key]: checked })}
          >
            <span className="ta-menu-check" aria-hidden="true">
              <DropdownMenu.ItemIndicator>
                <CheckIcon />
              </DropdownMenu.ItemIndicator>
            </span>
            <span>
              <span className="ta-menu-label">{item.label}</span>
              <span className="ta-menu-description">{item.description}</span>
            </span>
          </DropdownMenu.CheckboxItem>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

/* ------------------------------------------------------------------------ */
/* Activity overview                                                        */
/* ------------------------------------------------------------------------ */

function describePeriod(first: number, last: number) {
  const format = (day: number) => {
    const { year, month, date } = parts(day);

    return `${MONTHS[month]} ${date}, ${year}`;
  };

  return `${format(first)} to ${format(last)}`;
}

function ActivityOverview({ grid }: { grid: { first: number; last: number } }) {
  const titleId = useId();

  return (
    <div className="ta-overview">
      <div className="ta-overview-text">
        <h3 className="ta-overview-title">Activity overview</h3>
        <p className="ta-overview-repos">
          <RepoIcon />
          <span>
            Contributed to{" "}
            <a href="https://github.com/uzoway/phase-site">uzoway/phase-site</a>,{" "}
            <a href="https://github.com/uzoway/design-eng-prototypes">uzoway/design-eng-prototypes</a>
            , <a href="https://github.com/uzoway/mff-assets">uzoway/mff-assets</a> and 2 other
            repositories
          </span>
        </p>
      </div>

      <div className="ta-overview-chart">
        <svg width="281" height="229" role="img" aria-labelledby={titleId} className="ta-radar">
          <title id={titleId}>
            {`A graph representing uzoway's contributions from ${describePeriod(grid.first, grid.last)}. The contributions are 100% commits, 0% issues, 0% pull requests, 0% code review.`}
          </title>
          <g transform="translate(-21.1875, -47.7421875)">
            <path
              className="ta-radar-blob"
              strokeLinejoin="round"
              strokeWidth="7"
              d="M169.5,169.5 L169.5,169.5 L169.5,169.5 L87.2421875,169.5 z"
            />
            <line className="ta-radar-axis" strokeWidth="2" strokeLinecap="round" x1="83.2421875" y1="169.5" x2="255.7578125" y2="169.5" />
            <line className="ta-radar-axis" strokeWidth="2" strokeLinecap="round" x1="169.5" y1="83.2421875" x2="169.5" y2="255.7578125" />
            <ellipse className="ta-radar-point" rx="3" ry="3" strokeWidth="2" cx="85.2421875" cy="169.5" />
            <text textAnchor="middle" className="ta-radar-label" x="169.5" y="73.2421875">
              Code review
            </text>
            <text textAnchor="start" className="ta-radar-label" x="265.7578125" y="173">
              Issues
            </text>
            <text textAnchor="middle" className="ta-radar-label" x="169.5" y="273.7578125">
              Pull requests
            </text>
            <text textAnchor="end" className="ta-radar-label" x="62.109375" y="168.5">
              100%
            </text>
            <text textAnchor="end" className="ta-radar-label" x="71.2421875" y="182.5">
              Commits
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
