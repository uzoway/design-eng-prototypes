/*
 * The date logic behind scheduling: quick picks, the calendar grid, time
 * slots and every label. All of it takes `now` as an argument and works in
 * the visitor's local time, so it can be tested without a clock.
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** A post can't be scheduled sooner than this from now. */
export const LEAD = 5 * MINUTE;
/** Time slots are a quarter of an hour apart. */
export const SLOT_MINUTES = 15;
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Midnight at the start of the given day. */
export function startOfDay(date: Date | number): Date {
  const day = new Date(date);

  day.setHours(0, 0, 0, 0);

  return day;
}

/** The given day at a time of day. Built from parts, so a DST change can't shift it. */
export function atTime(day: Date | number, hours: number, minutes = 0): Date {
  const date = new Date(day);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

export function addDays(day: Date | number, count: number): Date {
  const date = new Date(day);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + count,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function addMonths(month: Date | number, count: number): Date {
  const date = new Date(month);

  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function sameDay(a: Date | number, b: Date | number): boolean {
  const first = new Date(a);
  const second = new Date(b);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

/**
 * How many calendar days `date` is after `now`: 0 today, 1 tomorrow, -1
 * yesterday. 11:59 PM to 12:01 AM is one day, though two minutes apart.
 */
export function dayDiff(date: Date | number, now: Date | number): number {
  const a = new Date(date);
  const b = new Date(now);

  // Compared as UTC dates, so a 23- or 25-hour day still counts as one.
  return Math.round(
    (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / DAY,
  );
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/** "9:00 AM". Written by hand: Intl puts a narrow no-break space before AM in some browsers. */
export function formatTime(date: Date | number): string {
  const value = new Date(date);
  const hours = value.getHours();
  const minutes = value.getMinutes();

  return `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

/** "Nov 12", with the year once it's a different one. */
export function formatDate(date: Date | number, now: Date | number): string {
  const value = new Date(date);
  const label = `${MONTHS[value.getMonth()]} ${value.getDate()}`;

  return value.getFullYear() === new Date(now).getFullYear() ? label : `${label}, ${value.getFullYear()}`;
}

/** The day part of a schedule label: "Today", "Tomorrow", "Thu" within a week, then "Nov 24". */
function formatDay(date: Date | number, now: Date | number): string {
  const days = dayDiff(date, now);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 7) return WEEKDAYS[new Date(date).getDay()];

  return formatDate(date, now);
}

/** "Tomorrow at 9:00 AM": the chip, the summary and the queue all use this. */
export function formatWhen(date: Date | number, now: Date | number): string {
  return `${formatDay(date, now)} at ${formatTime(date)}`;
}

/** The same label mid-sentence: "Scheduled for tomorrow at 9:00 AM". Weekdays and months keep their capital. */
export function formatWhenInline(date: Date | number, now: Date | number): string {
  const label = formatWhen(date, now);

  return /^(Today|Tomorrow|Yesterday)/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
}

/** A longer label for screen readers: "Tuesday, November 17 at 9:00 AM". */
export function formatWhenLong(date: Date | number): string {
  const value = new Date(date);

  return `${WEEKDAYS_LONG[value.getDay()]}, ${MONTHS_LONG[value.getMonth()]} ${value.getDate()} at ${formatTime(value)}`;
}

/** "Tuesday, November 17, 2026", the name of a calendar day. */
export function formatDayLong(date: Date | number): string {
  const value = new Date(date);

  return `${WEEKDAYS_LONG[value.getDay()]}, ${MONTHS_LONG[value.getMonth()]} ${value.getDate()}, ${value.getFullYear()}`;
}

/** "November 2026" */
export function formatMonth(month: Date | number): string {
  const value = new Date(month);

  return `${MONTHS_LONG[value.getMonth()]} ${value.getFullYear()}`;
}

/** A post's age in the feed: "now", "12m", "3h", then "Nov 12". */
export function formatFeedDate(postedAt: Date | number, now: Date | number): string {
  const elapsed = new Date(now).getTime() - new Date(postedAt).getTime();

  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;

  return formatDate(postedAt, now);
}

/** "Lagos (GMT+1)", from the browser's own time zone. */
export function zoneLabel(date: Date | number = Date.now()): string {
  let city = "Local time";
  let offset = "";

  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (zone) city = zone.split("/").pop()!.replace(/_/g, " ");

    offset =
      new Intl.DateTimeFormat("en-US", { timeZoneName: "shortOffset" })
        .formatToParts(new Date(date))
        .find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    // Older engines without shortOffset fall through to the computed offset.
  }

  if (!offset) {
    const minutes = -new Date(date).getTimezoneOffset();
    const sign = minutes < 0 ? "-" : "+";
    const hours = Math.floor(Math.abs(minutes) / 60);
    const rest = Math.abs(minutes) % 60;

    offset = `GMT${minutes === 0 ? "" : `${sign}${hours}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`}`;
  }

  return `${city} (${offset})`;
}

/* -------------------------------------------------------------------------- */
/* Quick picks                                                                */
/* -------------------------------------------------------------------------- */

export type QuickPick = {
  id: "evening" | "tomorrow" | "monday";
  label: string;
  at: Date;
  /** The time, shown muted on the right: "6:00 PM", "Tue 9:00 AM". */
  hint: string;
};

export function quickPicks(now: Date | number): QuickPick[] {
  const today = new Date(now);
  const picks: QuickPick[] = [];

  // Not just after midnight, when "this evening" would mean last night's to most people.
  const evening = atTime(today, 18);

  if (evening.getTime() - today.getTime() >= 30 * MINUTE && today.getHours() >= 5) {
    picks.push({ id: "evening", label: "This evening", at: evening, hint: formatTime(evening) });
  }

  const tomorrow = atTime(addDays(today, 1), 9);

  picks.push({
    id: "tomorrow",
    label: "Tomorrow morning",
    at: tomorrow,
    hint: `${WEEKDAYS[tomorrow.getDay()]} ${formatTime(tomorrow)}`,
  });

  // Next Monday. On a Sunday that's tomorrow, which is already offered, so it's the Monday after.
  let ahead = (8 - today.getDay()) % 7 || 7;

  if (ahead === 1) ahead = 8;

  const monday = atTime(addDays(today, ahead), 9);

  picks.push({ id: "monday", label: "Monday morning", at: monday, hint: `Mon ${formatTime(monday)}` });

  return picks;
}

/* -------------------------------------------------------------------------- */
/* Calendar and time slots                                                    */
/* -------------------------------------------------------------------------- */

/** The earliest time a post can still be scheduled for. */
export function earliest(now: Date | number): number {
  return new Date(now).getTime() + LEAD;
}

/** The six weeks, Sunday first, that cover a month: 42 days at midnight. */
export function monthGrid(month: Date | number): Date[] {
  const value = new Date(month);
  const first = new Date(value.getFullYear(), value.getMonth(), 1);

  return Array.from(
    { length: 42 },
    (_, index) => new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + index),
  );
}

/** A day is past once even its last slot, 11:45 PM, is too soon. */
export function isDayPast(day: Date | number, now: Date | number): boolean {
  return atTime(day, 23, 60 - SLOT_MINUTES).getTime() < earliest(now);
}

/** A month can be shown if it isn't wholly in the past. */
export function isMonthPast(month: Date | number, now: Date | number): boolean {
  return isDayPast(addDays(addMonths(month, 1), -1), now);
}

export type Slot = { at: Date; label: string; disabled: boolean };

/** Every quarter hour of a day, with the ones that are too soon disabled. */
export function timeSlots(day: Date | number, now: Date | number): Slot[] {
  const limit = earliest(now);

  return Array.from({ length: SLOTS_PER_DAY }, (_, index) => {
    const at = atTime(day, Math.floor((index * SLOT_MINUTES) / 60), (index * SLOT_MINUTES) % 60);

    return { at, label: formatTime(at), disabled: at.getTime() < limit };
  });
}

/**
 * The time a day starts with when you pick it: the hour you'd already chosen
 * if it's still open, otherwise 9:00 AM, otherwise the first slot left today.
 * Null when the day has no slot left.
 */
export function defaultTime(day: Date | number, now: Date | number, keep?: Date | number): Date | null {
  const limit = earliest(now);

  if (keep !== undefined) {
    const kept = new Date(keep);
    const same = atTime(day, kept.getHours(), kept.getMinutes());

    if (same.getTime() >= limit) return same;
  }

  const nine = atTime(day, 9);

  if (nine.getTime() >= limit) return nine;

  return timeSlots(day, now).find((slot) => !slot.disabled)?.at ?? null;
}

/** Whether a picked time can still be used. */
export function isSchedulable(at: Date | number, now: Date | number): boolean {
  return new Date(at).getTime() >= earliest(now);
}

/** "99+" keeps the tab's count from growing past two digits. */
export function formatCount(count: number): string {
  if (count <= 0) return "";

  return count > 99 ? "99+" : String(count);
}
