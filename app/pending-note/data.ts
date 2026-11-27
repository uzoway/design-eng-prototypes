/*
 * The Sent list, the edit window and the changed-word diff. Kept free of
 * React so the rules can be unit tested. Every person and every note here is
 * fictional; none comes from the reference screenshots.
 */

/** The subject's note, with one typo ("desgin"). Swap it here. */
export const NOTE =
  "Hi Maya, I read your post about how your team reviews payment flows before they ship and it changed how I run our desgin critiques. I'm a design engineer working on checkout at a small startup. Would love to connect and hear how you handle edge cases like partial refunds.";

export const EDIT_WINDOW_MS = 60 * 60 * 1000;
/** Premium; free accounts get 200 (`?free`). */
export const NOTE_LIMIT = 300;
export const FREE_NOTE_LIMIT = 200;
/** `?expire`: the subject's window closes this long after load. */
export const EXPIRE_AFTER_MS = 20 * 1000;

export type Invite = {
  id: string;
  name: string;
  /** "Maya": how the window line and the announcement refer to them. */
  firstName: string;
  headline: string;
  avatar: string;
  /** ms; drives "Sent 4 minutes ago" and the edit window. */
  sentAt: number;
  note?: string;
  editedAt?: number;
  /** When the edit window closes. Normally sentAt + 60 minutes. */
  closesAt: number;
  /** Demo only; the sender never sees this. */
  opened?: boolean;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const SUBJECT_ID = "maya-okonkwo";

type Seed = Omit<Invite, "sentAt" | "closesAt" | "avatar"> & { ago: number };

const SEEDS: Seed[] = [
  {
    id: SUBJECT_ID,
    name: "Maya Okonkwo",
    firstName: "Maya",
    headline: "Design Lead, Payments at Fernway",
    ago: 4 * MINUTE,
    note: NOTE,
  },
  {
    id: "theo-lindqvist",
    name: "Theo Lindqvist",
    firstName: "Theo",
    headline: "Staff Engineer · Platform and developer tools",
    ago: 2 * HOUR,
  },
  {
    id: "priya-raman",
    name: "Priya Raman",
    firstName: "Priya",
    headline: "Product Designer @ Northwind Health",
    ago: 5 * HOUR,
    note: "Hi Priya, we moved the pain question to the end of our intake form after your talk. Fewer people drop off now. I'm on onboarding at a small care app, would be good to connect.",
  },
  {
    id: "jonah-feld",
    name: "Jonah Feld",
    firstName: "Jonah",
    headline: "Founder, Small Batch Studio · Hiring designers",
    ago: 12 * HOUR,
  },
  {
    id: "amara-eze",
    name: "Amara Eze",
    firstName: "Amara",
    headline: "Head of Design · Fintech, ex-agency",
    ago: 1 * DAY + 3 * HOUR,
  },
  {
    id: "lucas-moreau",
    name: "Lucas Moreau",
    firstName: "Lucas",
    headline: "Senior Product Designer, Design Systems at Halcyon",
    ago: 2 * DAY + 5 * HOUR,
    note: "Hi Lucas, we forked your token pipeline from the design systems post. Had to change how it names dark mode tokens but the rest just worked. Thanks for putting it out.",
  },
  {
    id: "sofia-brandt",
    name: "Sofia Brandt",
    firstName: "Sofia",
    headline: "Engineering Manager, Growth",
    ago: 3 * DAY + 2 * HOUR,
  },
];

export function makeInvites(now: number, options: { expire?: boolean } = {}): Invite[] {
  return SEEDS.map(({ ago, ...seed }) => {
    const sentAt = now - ago;
    const closesAt = seed.id === SUBJECT_ID && options.expire ? now + EXPIRE_AFTER_MS : sentAt + EDIT_WINDOW_MS;

    return { ...seed, sentAt, closesAt, avatar: `/pending-note/avatars/${seed.id}.svg` };
  });
}

/** The person the profile page belongs to, beyond what the Sent row shows. */
export const PROFILE = {
  location: "Toronto, Ontario, Canada",
  connections: "500+ connections",
  mutual: { name: "Noor", avatar: "/pending-note/avatars/noor-haddad.svg" },
  company: "Fernway",
  school: "Northbridge School of Design",
  about:
    "I lead design for payments at Fernway, where my team works on checkout, refunds and payouts for small merchants. Before that I spent six years in agencies. I care about the flows nobody screenshots: the failed card, the partial refund, the dispute.",
};

export const ME_AVATAR = "/pending-note/avatars/you.svg";

/* -------------------------------------------------------------------------- */
/* Time                                                                       */
/* -------------------------------------------------------------------------- */

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** LinkedIn's "Sent …" line: "Sent 4 minutes ago", "Sent yesterday", "Sent 2 days ago". */
export function sentLabel(sentAt: number, now: number) {
  const elapsed = Math.max(0, now - sentAt);

  if (elapsed < MINUTE) return "Sent just now";
  if (elapsed < HOUR) return `Sent ${plural(Math.floor(elapsed / MINUTE), "minute")} ago`;
  if (elapsed < DAY) return `Sent ${plural(Math.floor(elapsed / HOUR), "hour")} ago`;
  if (elapsed < 2 * DAY) return "Sent yesterday";

  return `Sent ${plural(Math.floor(elapsed / DAY), "day")} ago`;
}

export function isEditable(invite: Invite, now: number) {
  return Boolean(invite.note) && !invite.opened && now < invite.closesAt;
}

/** Whole minutes left, rounded up so the line never says "0 more minutes" while it's open. */
export function minutesLeft(invite: Invite, now: number) {
  return Math.max(1, Math.ceil((invite.closesAt - now) / MINUTE));
}

export function windowLine(invite: Invite, now: number) {
  return `You can edit this for ${plural(minutesLeft(invite, now), "more minute")}. ${invite.firstName} will see it as edited.`;
}

export const WINDOW_CLOSED = "You can't edit this note anymore. It's been more than 60 minutes.";

/* -------------------------------------------------------------------------- */
/* Saving                                                                     */
/* -------------------------------------------------------------------------- */

/** Whitespace-only edits don't count as changes. */
export function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

export type SaveBlock = "unchanged" | "empty" | "over" | null;

export function saveBlock(original: string, draft: string, limit: number): SaveBlock {
  if (draft.trim().length === 0) return "empty";
  if (draft.length > limit) return "over";
  if (normalize(draft) === normalize(original)) return "unchanged";

  return null;
}

/* -------------------------------------------------------------------------- */
/* The changed-word diff                                                      */
/* -------------------------------------------------------------------------- */

export type Span = { start: number; end: number };

function words(text: string): (Span & { word: string })[] {
  return Array.from(text.matchAll(/\S+/g), (match) => ({
    word: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/**
 * The words in `next` that aren't in `previous`, as character spans of
 * `next`: a longest common subsequence over words, so fixing one word and
 * adding another highlights just those two.
 */
export function changedWords(previous: string, next: string): Span[] {
  const a = words(previous);
  const b = words(next);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i].word === b[j].word ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const changed: Span[] = [];
  let i = 0;
  let j = 0;

  while (j < b.length) {
    if (i < a.length && a[i].word === b[j].word) {
      i++;
      j++;
    } else if (i < a.length && table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      changed.push({ start: b[j].start, end: b[j].end });
      j++;
    }
  }

  return changed;
}

/**
 * What the counter says to a screen reader: only at 20 left, at the limit
 * and once over it, not on every key. Empty means stay quiet.
 */
export function counterAnnouncement(length: number, limit: number) {
  if (length > limit) return "Over the character limit";
  if (length === limit) return `${limit} of ${limit} characters`;
  if (length === limit - 20) return "20 characters left";

  return "";
}
