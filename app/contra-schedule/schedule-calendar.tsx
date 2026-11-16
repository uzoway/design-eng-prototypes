"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import {
  addDays,
  addMonths,
  atTime,
  defaultTime,
  earliest,
  formatDayLong,
  formatMonth,
  formatTime,
  formatWhen,
  isDayPast,
  isMonthPast,
  isSchedulable,
  monthGrid,
  sameDay,
  startOfDay,
  timeSlots,
  zoneLabel,
} from "./schedule";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const WEEKDAYS = [
  ["S", "Sunday"],
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
];

/** The day a calendar opens on: the time already set, or tomorrow at 9:00 AM. */
function initial(value: number | null, now: number): Date {
  if (value !== null && isSchedulable(value, now)) return new Date(value);

  return atTime(addDays(now, 1), 9);
}

/**
 * The second view of the schedule popover: a six-week calendar, a time list
 * and a summary. A custom list rather than a native picker, which wouldn't
 * show up in a recording.
 */
export function ScheduleCalendar({
  active,
  value,
  now,
  reduced,
  confirm,
  onBack,
  onConfirm,
}: {
  /** Whether this view is the one showing. Focus moves into it when it becomes so. */
  active: boolean;
  value: number | null;
  now: number;
  reduced: boolean;
  /** The footer button: "Done" for a new post, "Save" when rescheduling. */
  confirm: string;
  onBack: () => void;
  onConfirm: (at: number) => void;
}) {
  const [picked, setPicked] = useState(() => initial(value, now));
  const [month, setMonth] = useState(() => new Date(picked.getFullYear(), picked.getMonth(), 1));
  const [listOpen, setListOpen] = useState(false);
  /** Whether the last pick was a click. Arrow keys move the fill at once: they repeat too fast for a glide. */
  const [clicked, setClicked] = useState(true);

  const gridRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** Set when a key press moved the selection, so focus follows it once the grid has re-rendered. */
  const refocus = useRef(false);
  const listId = useId();
  const monthId = useId();

  const days = monthGrid(month);
  const usable = isSchedulable(picked, now);
  const pickedIndex = days.findIndex((day) => day.getMonth() === month.getMonth() && sameDay(day, picked));

  /*
   * The selected day's fill is one element that glides between days of the
   * month on show. Where it last was, and whether the month has changed
   * since, are kept in state (the "store the previous value" pattern), so a
   * change of month places it instead of sweeping it across the grid.
   */
  const monthKey = month.getTime();
  const [fill, setFill] = useState({ monthKey, index: Math.max(0, pickedIndex), glide: false });

  if (fill.monthKey !== monthKey || (pickedIndex >= 0 && fill.index !== pickedIndex)) {
    setFill({
      monthKey,
      index: pickedIndex >= 0 ? pickedIndex : fill.index,
      glide: fill.monthKey === monthKey,
    });
  }

  const fillShown = pickedIndex >= 0;
  const fillIndex = fillShown ? pickedIndex : fill.index;
  const glide = fill.glide && fill.monthKey === monthKey && clicked;

  // Coming into view, focus lands on the selected day (or Back, if that day isn't on show).
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current) {
      const day = gridRef.current?.querySelector<HTMLElement>('button[tabindex="0"]');

      (day ?? backRef.current)?.focus({ preventScroll: true });
    }

    if (!active && wasActive.current) setListOpen(false);

    wasActive.current = active;
  }, [active]);

  useLayoutEffect(() => {
    if (!refocus.current) return;

    refocus.current = false;
    gridRef.current?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus({ preventScroll: true });
  });

  /* ------------------------------------------------------------------------ */
  /* Picking a day                                                            */
  /* ------------------------------------------------------------------------ */

  function pickDay(day: Date, by: "click" | "key") {
    // The time you'd chosen carries over; today starts at its first slot still open.
    const next = defaultTime(day, now, picked);

    if (!next) return false;

    setClicked(by === "click");
    setPicked(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));

    return true;
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    const today = startOfDay(picked);
    let target: Date | null = null;

    switch (event.key) {
      case "ArrowLeft":
        target = addDays(today, -1);
        break;
      case "ArrowRight":
        target = addDays(today, 1);
        break;
      case "ArrowUp":
        target = addDays(today, -7);
        break;
      case "ArrowDown":
        target = addDays(today, 7);
        break;
      case "Home":
        target = addDays(today, -today.getDay());
        break;
      case "End":
        target = addDays(today, 6 - today.getDay());
        break;
      case "PageUp":
      case "PageDown": {
        const step = event.key === "PageUp" ? -1 : 1;
        const first = addMonths(today, step);
        const last = addDays(addMonths(first, 1), -1).getDate();

        // The same date next month, or its last day when that month is shorter.
        target = new Date(first.getFullYear(), first.getMonth(), Math.min(today.getDate(), last));
        break;
      }
      default:
        return;
    }

    event.preventDefault();

    // The selection never lands on a past day: it stops at the first one still open.
    if (isDayPast(target, now)) {
      target = startOfDay(earliest(now));

      if (isDayPast(target, now)) target = addDays(target, 1);
    }

    if (pickDay(target, "key")) refocus.current = true;
  }

  /* ------------------------------------------------------------------------ */
  /* Picking a time                                                           */
  /* ------------------------------------------------------------------------ */

  const slots = timeSlots(picked, now);

  function openList() {
    setListOpen(true);
  }

  function closeList(refocusTrigger: boolean) {
    setListOpen(false);

    if (refocusTrigger) triggerRef.current?.focus({ preventScroll: true });
  }

  // Opening the list scrolls the chosen time to its middle and focuses it.
  useLayoutEffect(() => {
    if (!listOpen) return;

    const list = listRef.current;
    const current =
      list?.querySelector<HTMLElement>('[aria-selected="true"]') ??
      list?.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])');

    if (!list || !current) return;

    list.scrollTop = current.offsetTop - (list.clientHeight - current.offsetHeight) / 2;
    current.focus({ preventScroll: true });
  }, [listOpen]);

  useEffect(() => {
    if (!listOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (listRef.current?.contains(target) || triggerRef.current?.contains(target)) return;

      setListOpen(false);
    }

    // Escape closes only the list, wherever focus is. Caught first, so the popover never hears it.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();
      setListOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [listOpen]);

  function onListKeyDown(event: React.KeyboardEvent) {
    const options = [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])') ?? []),
    ];
    const index = options.indexOf(document.activeElement as HTMLElement);
    let next = -1;

    switch (event.key) {
      case "Tab":
        event.preventDefault();
        event.stopPropagation();
        closeList(true);

        return;
      case "ArrowDown":
        next = Math.min(options.length - 1, index + 1);
        break;
      case "ArrowUp":
        next = Math.max(0, index - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = options.length - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();

        return;
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    options[next]?.focus();
  }

  const previousPast = isMonthPast(addMonths(month, -1), now);

  return (
    <div className="cs-cal">
      <div className="cs-cal-head">
        <button ref={backRef} type="button" className="cs-icon-button" aria-label="Back to quick picks" onClick={onBack}>
          <ChevronLeftIcon />
        </button>

        <h2 id={monthId} className="cs-cal-month" aria-live="polite">
          {formatMonth(month)}
        </h2>

        <button
          type="button"
          className="cs-icon-button"
          aria-label="Previous month"
          aria-disabled={previousPast || undefined}
          onClick={() => {
            if (!previousPast) setMonth(addMonths(month, -1));
          }}
        >
          <ChevronLeftIcon />
        </button>
        <button type="button" className="cs-icon-button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRightIcon />
        </button>
      </div>

      <div ref={gridRef} className="cs-cal-grid" role="grid" aria-labelledby={monthId} onKeyDown={onGridKeyDown}>
        <div className="cs-cal-row" role="row">
          {WEEKDAYS.map(([short, long]) => (
            <span key={long} className="cs-cal-weekday" role="columnheader" aria-label={long}>
              {short}
            </span>
          ))}
        </div>

        <div className="cs-cal-days">
          <motion.span
            className="cs-cal-fill"
            aria-hidden="true"
            initial={false}
            animate={{
              opacity: fillShown ? 1 : 0,
              transform: `translate(${(fillIndex % 7) * 100}%, ${Math.floor(fillIndex / 7) * 100}%)`,
            }}
            // It glides within a month. When the month itself changes it's simply there.
            transition={reduced || !glide ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }}
          >
            <span />
          </motion.span>

          {Array.from({ length: 6 }, (_, week) => (
            <div key={week} className="cs-cal-row" role="row">
              {days.slice(week * 7, week * 7 + 7).map((day) => {
                const outside = day.getMonth() !== month.getMonth();
                const past = isDayPast(day, now);
                const selected = !outside && sameDay(day, picked);
                const today = sameDay(day, now);

                // Days of the months either side are shown, as on any wall calendar, but aren't choices.
                if (outside || past) {
                  return (
                    <span key={day.getTime()} className="cs-cal-cell" role="gridcell" aria-disabled="true">
                      <span className="cs-cal-day" data-off="true" data-today={!outside && today}>
                        {day.getDate()}
                      </span>
                    </span>
                  );
                }

                return (
                  <span key={day.getTime()} className="cs-cal-cell" role="gridcell" aria-selected={selected}>
                    <button
                      type="button"
                      className="cs-cal-day"
                      data-selected={selected}
                      data-today={today}
                      tabIndex={selected ? 0 : -1}
                      aria-label={`${formatDayLong(day)}${today ? ", today" : ""}`}
                      onClick={() => pickDay(day, "click")}
                    >
                      {day.getDate()}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="cs-cal-time">
        <div className="cs-cal-time-label">
          <span>Time</span>
          <span className="cs-cal-zone">{zoneLabel(picked)}</span>
        </div>

        <div className="cs-time">
          <button
            ref={triggerRef}
            type="button"
            className="cs-time-trigger"
            aria-haspopup="listbox"
            aria-expanded={listOpen}
            aria-controls={listOpen ? listId : undefined}
            aria-label={`Time, ${formatTime(picked)}`}
            onClick={() => (listOpen ? closeList(false) : openList())}
            onKeyDown={(event) => {
              if (!listOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                event.preventDefault();
                openList();
              }
            }}
          >
            <span>{formatTime(picked)}</span>
            <ChevronDownIcon />
          </button>

          <AnimatePresence>
            {listOpen && (
              <motion.div
                ref={listRef}
                id={listId}
                className="cs-time-list"
                role="listbox"
                aria-label="Time"
                initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(0.96)" }}
                animate={{ opacity: 1, transform: "scale(1)", transition: { duration: 0.15, ease: EASE_OUT } }}
                exit={
                  reduced
                    ? { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } }
                    : { opacity: 0, transform: "scale(0.96)", transition: { duration: 0.1, ease: EASE_OUT } }
                }
                onKeyDown={onListKeyDown}
              >
                {slots.map((slot) => {
                  const selected = slot.at.getTime() === picked.getTime();

                  return (
                    <div
                      key={slot.label}
                      className="cs-time-option"
                      role="option"
                      aria-selected={selected}
                      aria-disabled={slot.disabled || undefined}
                      tabIndex={slot.disabled ? undefined : -1}
                      onClick={() => {
                        if (slot.disabled) return;

                        setPicked(slot.at);
                        closeList(true);
                      }}
                    >
                      {slot.label}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="cs-cal-foot">
        <p className="cs-cal-summary" aria-live="polite">
          {usable ? formatWhen(picked, now) : "That time has passed"}
        </p>
        <button
          type="button"
          className="cs-button"
          aria-disabled={!usable || undefined}
          onClick={() => {
            if (usable) onConfirm(picked.getTime());
          }}
        >
          {confirm}
        </button>
      </div>
    </div>
  );
}
