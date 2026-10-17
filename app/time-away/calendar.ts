/*
 * Date maths, sample data and time-away ranges for the contribution graph.
 *
 * Days are whole numbers (days since 1970-01-01, UTC), so ranges are integer
 * intervals and the grid can be built without time-zone surprises. "Today" is
 * read from the local clock once and converted to the same scale.
 */

export const MS_PER_DAY = 86_400_000;

export const MONTHS = [
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

export function dayOf(year: number, month: number, date: number) {
  return Math.floor(Date.UTC(year, month, date) / MS_PER_DAY);
}

export function parts(day: number) {
  const d = new Date(day * MS_PER_DAY);

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date: d.getUTCDate(),
    weekday: d.getUTCDay(),
  };
}

export function localToday(now = new Date()) {
  return dayOf(now.getFullYear(), now.getMonth(), now.getDate());
}

export function ordinal(n: number) {
  const rem100 = n % 100;

  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;

  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** "October 12th", as GitHub writes it in the day tooltips. */
export function longDate(day: number) {
  const { month, date } = parts(day);

  return `${MONTHS[month]} ${ordinal(date)}`;
}

/** "Aug 3", or "Dec 28, 2025" when the year needs saying. */
export function shortDate(day: number, withYear = false) {
  const { year, month, date } = parts(day);
  const label = `${MONTHS[month].slice(0, 3)} ${date}`;

  return withYear ? `${label}, ${year}` : label;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Aug 3 – Aug 24 · 22 days" */
export function rangeSummary(start: number, end: number) {
  const days = end - start + 1;

  if (days === 1) return `${shortDate(start)} · 1 day`;

  const crossesYear = parts(start).year !== parts(end).year;

  return `${shortDate(start, crossesYear)} – ${shortDate(end, crossesYear)} · ${plural(days, "day")}`;
}

/* ------------------------------------------------------------------------ */
/* Grid                                                                     */
/* ------------------------------------------------------------------------ */

export type View = "last" | number;

export type MonthLabel = { name: string; short: string; span: number };

export type Grid = {
  /** First and last day the graph covers (inclusive). */
  first: number;
  last: number;
  /** weeks[column][weekday]: a day, or null for padding before or after. */
  weeks: (number | null)[][];
  months: MonthLabel[];
};

/**
 * "last" covers the 53 weeks ending today, starting on a Sunday, the way the
 * profile page does. A year covers Jan 1 – Dec 31, with days after today left
 * out.
 */
export function buildGrid(view: View, today: number): Grid {
  let first: number;
  let last: number;

  if (view === "last") {
    const yearAgo = today - 364;

    first = yearAgo - parts(yearAgo).weekday;
    last = today;
  } else {
    first = dayOf(view, 0, 1);
    last = Math.min(dayOf(view, 11, 31), today);
  }

  const lastOfPeriod = view === "last" ? last : dayOf(view, 11, 31);
  const gridStart = first - parts(first).weekday;
  const gridEnd = lastOfPeriod + (6 - parts(lastOfPeriod).weekday);
  const weeks: (number | null)[][] = [];

  for (let sunday = gridStart; sunday <= gridEnd; sunday += 7) {
    const week: (number | null)[] = [];

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = sunday + weekday;

      week.push(day >= first && day <= last ? day : null);
    }

    weeks.push(week);
  }

  // A month label sits over the weeks whose Sunday falls in that month. The
  // first column is labelled by its first real day, and a lone first column
  // stays blank so its label can't collide with the next one.
  const months: MonthLabel[] = [];

  weeks.forEach((_, column) => {
    const { month } = parts(Math.max(gridStart + column * 7, first));
    const previous = months.at(-1);

    if (previous?.name === MONTHS[month]) {
      previous.span += 1;
    } else {
      months.push({ name: MONTHS[month], short: MONTHS[month].slice(0, 3), span: 1 });
    }
  });

  if (months.length > 1 && months[0].span === 1) {
    months[0] = { ...months[0], name: "", short: "" };
  }

  return { first, last, weeks, months };
}

/* ------------------------------------------------------------------------ */
/* Sample contributions                                                     */
/* ------------------------------------------------------------------------ */

/** Small deterministic hash so the same day always gets the same count. */
function noise(day: number, salt: number) {
  let h = (day * 374761393 + salt * 668265263) | 0;

  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

/** How busy a stretch of time was: the chance of committing on a weekday. */
function busyness(day: number, today: number) {
  const { year, month, date } = parts(day);
  const fromToday = today - day;

  // The demo gap: three quiet weeks in the most recent August, broken only by
  // one "quick fix" on the 12th.
  if (month === 7 && date >= 2 && date <= 22 && fromToday < 365) return date === 12 ? 1 : 0;

  // Quiet most of the year, busy for the last few months.
  if (fromToday <= 140) return 0.5;
  if (fromToday < 365) return 0.025;

  const byYear: Record<number, number> = {
    2020: 0.12,
    2021: 0.28,
    2022: 0.34,
    2023: 0.22,
    2024: 0.16,
    2025: 0.05,
  };

  return byYear[year] ?? 0;
}

export type Contribution = { total: number; public: number };

export function contributionsOn(day: number, today: number): Contribution {
  if (day > today) return { total: 0, public: 0 };

  const weekend = parts(day).weekday % 6 === 0;
  const chance = busyness(day, today) * (weekend ? 0.35 : 1);

  if (noise(day, 1) >= chance) return { total: 0, public: 0 };

  const total = 1 + Math.floor(noise(day, 2) ** 2.4 * 11);
  const publicShare = noise(day, 3) < 0.3 ? Math.floor(total / 2) : total;

  return { total, public: publicShare };
}

/** GitHub's four colour levels, split into quarters of the busiest day. */
export function levelOf(count: number, max: number) {
  if (count <= 0 || max <= 0) return 0;

  const ratio = count / max;

  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;

  return 4;
}

/* ------------------------------------------------------------------------ */
/* Time away                                                                */
/* ------------------------------------------------------------------------ */

export type Reason = {
  emoji: string;
  label: string;
  /** How the reason reads after "while", e.g. "3 contributions …, while on vacation." */
  during: string;
};

export const SUGGESTIONS: Reason[] = [
  { emoji: "🌴", label: "On vacation", during: "on vacation" },
  { emoji: "🍼", label: "Parental leave", during: "on parental leave" },
  { emoji: "🔒", label: "Private repo, trust me", during: "in a private repo" },
  { emoji: "🌱", label: "Touching grass", during: "touching grass" },
  { emoji: "📅", label: "Stuck in meetings", during: "stuck in meetings" },
  { emoji: "🐛", label: "Fixing one bug", during: "fixing one bug" },
  { emoji: "🤒", label: "Out sick", during: "out sick" },
  { emoji: "💼", label: "Job hunting", during: "job hunting" },
];

export const CUSTOM_EMOJI = "💭";

export function reasonFor(text: string): Reason {
  const label = text.trim();
  const match = SUGGESTIONS.find(
    (reason) => reason.label.toLowerCase() === label.toLowerCase(),
  );

  if (match) return match;
  if (!label) return { emoji: CUSTOM_EMOJI, label: "Away", during: "away" };

  return { emoji: CUSTOM_EMOJI, label, during: `away (${label})` };
}

export type AwayRange = Reason & {
  id: string;
  start: number;
  end: number;
};

let nextId = 0;

export function newId() {
  nextId += 1;

  return `away-${nextId}`;
}

/**
 * Adds a range on top of the existing ones. Whatever it overlaps is cut away
 * (an old range can split in two), and it joins neighbours with the same
 * reason so one trip stays one range.
 */
export function addRange(ranges: AwayRange[], added: AwayRange): AwayRange[] {
  const kept: AwayRange[] = [];

  for (const range of ranges) {
    if (range.end < added.start || range.start > added.end) {
      kept.push(range);

      continue;
    }

    if (range.start < added.start) {
      kept.push({ ...range, end: added.start - 1 });
    }

    if (range.end > added.end) {
      kept.push({
        ...range,
        id: range.start < added.start ? newId() : range.id,
        start: added.end + 1,
      });
    }
  }

  let merged = { ...added };
  const result: AwayRange[] = [];

  for (const range of kept) {
    const touches = range.end + 1 === merged.start || merged.end + 1 === range.start;

    if (touches && range.label === merged.label) {
      merged = {
        ...merged,
        start: Math.min(range.start, merged.start),
        end: Math.max(range.end, merged.end),
      };
    } else {
      result.push(range);
    }
  }

  return [...result, merged].sort((a, b) => a.start - b.start);
}

export function removeRange(ranges: AwayRange[], id: string) {
  return ranges.filter((range) => range.id !== id);
}

export function rangeAt(ranges: AwayRange[], day: number) {
  return ranges.find((range) => day >= range.start && day <= range.end);
}

/** Days marked away inside [first, last]. */
export function awayDaysIn(ranges: AwayRange[], first: number, last: number) {
  return ranges.reduce((sum, range) => {
    const start = Math.max(range.start, first);
    const end = Math.min(range.end, last);

    return end >= start ? sum + end - start + 1 : sum;
  }, 0);
}

/* ------------------------------------------------------------------------ */
/* Words                                                                    */
/* ------------------------------------------------------------------------ */

export function contributionText(count: number, day: number) {
  if (count === 0) return `No contributions on ${longDate(day)}.`;

  return `${plural(count, "contribution")} on ${longDate(day)}.`;
}

/** The tooltip and accessible name for one day. */
export function dayText(count: number, day: number, away: AwayRange | undefined) {
  if (!away) return contributionText(count, day);

  if (count > 0) {
    return `${plural(count, "contribution")} on ${longDate(day)}, while ${away.during}.`;
  }

  if (away.start === away.end) return `${away.label} on ${longDate(day)}.`;

  return `${away.label} from ${longDate(away.start)} to ${longDate(away.end)}.`;
}
