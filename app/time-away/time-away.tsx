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
  type FormEvent,
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
  SUGGESTIONS,
  contributionsOn,
  type AwayRange,
  type View,
} from "./calendar";
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

type DialogState = {
  mode: "create" | "edit";
  start: number;
  end: number;
  rangeId?: string;
  initialText: string;
  position: { left: number; top: number; width: number };
  /** Typing straight away suits a keyboard; on touch it would cover the suggestions. */
  focusInput: boolean;
};

type Tip = { day: number; mode: "day" | "range" };

/** Per-day animation delays for the wave that fills or clears a range. */
type Wave = Map<number, number>;

type Settings = { private: boolean; overview: boolean; away: boolean };

type Drag = {
  pointerId: number;
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
  const [announcement, setAnnouncement] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const pressRef = useRef<Press | null>(null);
  const lastInputRef = useRef<"pointer" | "touch" | "keyboard">("pointer");
  const waveTimerRef = useRef(0);
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
      const width = Math.min(320, root.width - 16);
      const centre = first && last ? (first.left + last.right) / 2 - root.left : root.width / 2;
      const left = Math.min(Math.max(centre - width / 2, 8), root.width - width - 8);

      return { left, top: table.bottom - root.top + 8, width };
    },
    [cellFor, grid.first, grid.last],
  );

  /* ---------------------------------------------------------------------- */
  /* Opening and closing the dialog                                         */
  /* ---------------------------------------------------------------------- */

  const openCreate = (start: number, end: number) => {
    setSelection({ anchor: start, focus: end });
    setTip(null);
    setDialog({
      mode: "create",
      start,
      end,
      initialText: "",
      position: dialogPosition(start, end),
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

  const beginDrag = (pointerId: number, day: number, extend: boolean) => {
    const anchor = extend ? (selection?.anchor ?? safeCursor) : day;

    dragRef.current = { pointerId, anchor, focus: day, startDay: day, moved: false, extend };
    setDialog(null);
    setSelection({ anchor, focus: day });
    setDragging(true);
    setCursor(day);
    setTip({ day, mode: "range" });
    focusDay(day);
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
          beginDrag(press.pointerId, day, false);
        }, LONG_PRESS_MS),
      };

      pressRef.current = press;

      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    beginDrag(event.pointerId, day, event.shiftKey);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLTableElement>) => {
    const press = pressRef.current;

    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > TOUCH_SLOP) {
      window.clearTimeout(press.timer);
      pressRef.current = null;
    }

    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const day = dayFrom(document.elementFromPoint(event.clientX, event.clientY));

    if (day === null || day === drag.focus) return;

    drag.focus = day;
    drag.moved = true;
    setSelection({ anchor: drag.anchor, focus: day });
    setCursor(day);
    setTip({ day, mode: "range" });
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

    dragRef.current = null;
    setDragging(false);
    finishDrag(drag);
  };

  const onPointerCancel = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);

    pressRef.current = null;

    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      setSelection(null);
      setTip(null);
    }
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
    focusDay(next);
  };

  /* ---------------------------------------------------------------------- */
  /* Tooltip                                                                */
  /* ---------------------------------------------------------------------- */

  const onPointerOver = (event: ReactPointerEvent<HTMLTableElement>) => {
    if (dragRef.current || dialog || event.pointerType === "touch") return;

    const day = dayFrom(event.target);

    setTip(day === null ? null : { day, mode: "day" });
  };

  const onFocus = (event: React.FocusEvent<HTMLTableElement>) => {
    const day = dayFrom(event.target);

    if (day === null || dragRef.current || dialog) return;
    if (!(event.target as HTMLElement).matches(":focus-visible")) return;

    setCursor(day);
    setTip({ day, mode: selection ? "range" : "day" });
  };

  const onBlur = (event: React.FocusEvent<HTMLTableElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTip(null);
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

          <div className="ta-box" data-overview={settings.overview ? "" : undefined}>
            <div className="ta-graph">
              <div ref={scrollerRef} className="ta-scroller">
                <table
                  ref={tableRef}
                  className="ta-grid"
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
                  onPointerLeave={() => !dragRef.current && setTip(null)}
                  onKeyDown={onKeyDown}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onContextMenu={(event) => dragRef.current && event.preventDefault()}
                >
                  <caption className="sr-only">Contribution Graph</caption>
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

            {settings.overview ? <ActivityOverview grid={grid} /> : null}
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
          <AwayDialog
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
}: DayProps) {
  const delay = enterDelay ?? leaveDelay;

  return (
    <td
      role="gridcell"
      className="ta-day"
      data-day={day}
      data-level={level}
      data-away={away ? "" : undefined}
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
/* Mark time away                                                           */
/* ------------------------------------------------------------------------ */

function AwayDialog({
  state,
  reducedMotion,
  onCancel,
  onSubmit,
  onRemove,
}: {
  state: DialogState;
  reducedMotion: boolean;
  onCancel: () => void;
  onSubmit: (text: string) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(state.initialText);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const summaryId = useId();
  const inputId = useId();
  const suggestionsId = useId();

  const reason = reasonFor(text);
  const editing = state.mode === "edit";

  useEffect(() => {
    if (state.focusInput) inputRef.current?.focus();
    else dialogRef.current?.focus();
    // Focus once, when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();

      return;
    }

    if (event.key !== "Tab") return;

    // Keep focus inside while the dialog is open.
    const focusable = [
      ...dialogRef.current!.querySelectorAll<HTMLElement>("button:not([disabled]), input"),
    ];
    const first = focusable[0];
    const last = focusable.at(-1)!;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(text);
  };

  return (
    <motion.div
      ref={dialogRef}
      className="ta-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={summaryId}
      tabIndex={-1}
      style={state.position}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      onKeyDown={onKeyDown}
    >
      <form onSubmit={submit}>
        <div className="ta-overlay-header">
          <div>
            <h2 id={titleId} className="ta-overlay-title">
              {editing ? "Edit time away" : "Mark time away"}
            </h2>
            <p id={summaryId} className="ta-overlay-summary">
              {rangeSummary(state.start, state.end)}
            </p>
          </div>
          <button type="button" className="ta-icon-button" aria-label="Close" onClick={onCancel}>
            <XIcon />
          </button>
        </div>

        <div className="ta-overlay-body">
          <label className="sr-only" htmlFor={inputId}>
            What were you up to?
          </label>
          <div className="ta-input">
            <span className="ta-input-visual" aria-hidden="true">
              {text.trim() ? reason.emoji : <SmileyIcon />}
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={text}
              maxLength={80}
              placeholder="What were you up to?"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setText(event.target.value)}
            />
            {text ? (
              <button
                type="button"
                className="ta-icon-button ta-input-clear"
                aria-label="Clear"
                onClick={() => {
                  setText("");
                  inputRef.current?.focus();
                }}
              >
                <XIcon />
              </button>
            ) : null}
          </div>

          <h3 id={suggestionsId} className="ta-suggestions-title">
            Suggestions
          </h3>
          <ul className="ta-suggestions" aria-labelledby={suggestionsId}>
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion.label}>
                <button
                  type="button"
                  className="ta-suggestion"
                  aria-pressed={reason.label === suggestion.label}
                  onClick={() => setText(suggestion.label)}
                >
                  <span className="ta-suggestion-emoji" aria-hidden="true">
                    {suggestion.emoji}
                  </span>
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="ta-overlay-footer">
          {editing ? (
            <button type="button" className="ta-btn ta-btn-danger" onClick={onRemove}>
              Remove
            </button>
          ) : null}
          <span className="ta-spacer" />
          <button type="button" className="ta-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="ta-btn ta-btn-primary">
            {editing ? "Save" : "Mark as away"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

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

/* ------------------------------------------------------------------------ */
/* Octicons                                                                 */
/* ------------------------------------------------------------------------ */

function TriangleDownIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="ta-octicon">
      <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="ta-octicon">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="ta-octicon">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

function SmileyIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="ta-octicon">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.82 1.636a.75.75 0 0 1 1.038.175l.007.009c.103.118.22.222.35.31.264.178.683.37 1.285.37.602 0 1.02-.192 1.285-.371.13-.088.247-.192.35-.31l.007-.008a.75.75 0 0 1 1.222.87l-.022-.015c.02.013.021.015.021.015v.001l-.001.002-.002.003-.005.007-.014.019a2.066 2.066 0 0 1-.184.213c-.16.166-.338.316-.53.445-.63.418-1.37.638-2.127.629-.946 0-1.652-.308-2.126-.63a3.331 3.331 0 0 1-.715-.657l-.014-.02-.005-.006-.002-.003v-.002h-.001l.613-.432-.614.43a.75.75 0 0 1 .183-1.044ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="ta-octicon ta-repo-icon">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}
