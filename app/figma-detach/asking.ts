/*
 * When to ask why. The detach itself always happens; these rules only decide
 * whether the popover follows it.
 */

import { REASONS, THIS_WEEK, type Component } from "./data.ts";
import { type Detached } from "./scene.ts";

export type AskState = {
  /** Components already asked about this session. */
  asked: ReadonlySet<string>;
  /** "Don't ask today" holds until this time (ms), or null. */
  quietUntil: number | null;
};

export type Decision =
  /** Show the popover for these detached layers. */
  | { kind: "ask"; items: Detached[] }
  /** Asked before this session: a toast offers to tell them anyway. */
  | { kind: "nudge"; items: Detached[] }
  /** Local components only, or "Don't ask today". */
  | { kind: "silent" };

export function fromLibrary(component: Component) {
  return component.library !== "local";
}

export function decide(items: Detached[], state: AskState, now: number): Decision {
  const library = items.filter((item) => fromLibrary(item.component));

  if (library.length === 0) return { kind: "silent" };
  if (state.quietUntil !== null && now < state.quietUntil) return { kind: "silent" };

  const fresh = library.filter((item) => !state.asked.has(item.component.id));

  if (fresh.length === 0) return { kind: "nudge", items: library };

  return { kind: "ask", items: fresh };
}

/** Midnight at the end of the visitor's day. */
export function endOfDay(now: number) {
  const date = new Date(now);

  date.setHours(24, 0, 0, 0);

  return date.getTime();
}

/** "4 others detached Button this week. Most said: Missing a variant." */
export function socialLine(items: Detached[]) {
  const ids = new Set(items.map((item) => item.component.id));

  if (ids.size !== 1) return null;

  const [item] = items;
  const week = THIS_WEEK[item.component.id];
  const name = item.component.name;

  if (!week) return null;
  if (week.others === 0) return `You're the first to detach ${name} this week.`;

  const who = week.others === 1 ? "1 other" : `${week.others} others`;
  const top = REASONS.find((reason) => reason.id === week.top);

  return top ? `${who} detached ${name} this week. Most said: ${top.label}.` : `${who} detached ${name} this week.`;
}

/** Trims a note and keeps it inside the limit, counting characters as people see them. */
export function cleanNote(text: string, limit: number) {
  const graphemes = splitGraphemes(text.trim());

  return graphemes.slice(0, limit).join("");
}

/** Caps a note while it's typed, without trimming what's there. */
export function capNote(text: string, limit: number) {
  const graphemes = splitGraphemes(text);

  return graphemes.length > limit ? graphemes.slice(0, limit).join("") : text;
}

/** "Navigation /…ted / Small": keeps both ends, which carry the meaning. */
export function truncateMiddle(text: string, max: number) {
  const graphemes = splitGraphemes(text);

  if (graphemes.length <= max) return text;

  const head = Math.ceil((max - 1) / 2);
  const tail = max - 1 - head;

  return `${graphemes.slice(0, head).join("").trimEnd()}…${graphemes.slice(-tail).join("").trimStart()}`;
}

export function noteLength(text: string) {
  return splitGraphemes(text).length;
}

function splitGraphemes(text: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

    return [...segmenter.segment(text)].map((part) => part.segment);
  }

  return [...text];
}
