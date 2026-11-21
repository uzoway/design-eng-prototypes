/*
 * Pure text helpers for quote-reply: how a message splits into selectable
 * units, how a range of units becomes a quote, and how a quote reads.
 * No DOM here, so it's unit-tested (selection.test.ts).
 */

export type Message = {
  id: string;
  from: "me" | "ada";
  text: string;
  time: string;
  quote?: Quote;
};

export type Quote = {
  messageId: string;
  /** Char offset in message.text. */
  start: number;
  /** Char offset, exclusive. */
  end: number;
  /** The snippet as it was when sent (kept if the original is edited). */
  text: string;
  /** start > 0 || end < text.length */
  partial: boolean;
};

/**
 * A selectable piece of a message. A word and the punctuation that trails it
 * are separate units, so a drag that stops on "Friday" leaves the comma out,
 * and one that passes over the comma takes it.
 */
export type Unit = {
  start: number;
  end: number;
  kind: "word" | "punct";
};

/** Keep the rendered text and the units in step: a space or newline between units. */
export type Piece =
  | { kind: "unit"; index: number; text: string }
  | { kind: "gap"; text: string };

const TRAILING = /[.,!?;:…)\]}"'”’»]+$/u;

export function tokenize(text: string): Unit[] {
  const units: Unit[] = [];
  const runs = /\S+/gu;
  let match: RegExpExecArray | null;

  while ((match = runs.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    const tail = match[0].match(TRAILING);

    // A run that's all punctuation ("…", "?!") is one word-like unit.
    if (tail && tail[0].length < match[0].length) {
      const split = end - tail[0].length;
      units.push({ start, end: split, kind: "word" });
      units.push({ start: split, end, kind: "punct" });
    } else {
      units.push({ start, end, kind: "word" });
    }
  }

  return units;
}

export function pieces(text: string, units: Unit[]): Piece[] {
  const list: Piece[] = [];
  let cursor = 0;

  units.forEach(function piece(unit, index) {
    if (unit.start > cursor) {
      list.push({ kind: "gap", text: text.slice(cursor, unit.start) });
    }
    list.push({ kind: "unit", index, text: text.slice(unit.start, unit.end) });
    cursor = unit.end;
  });

  if (cursor < text.length) {
    list.push({ kind: "gap", text: text.slice(cursor) });
  }

  return list;
}

/** The word a punctuation unit belongs to, for taps that land on a comma. */
export function wordOf(units: Unit[], index: number) {
  let i = index;

  while (i > 0 && units[i].kind === "punct" && units[i - 1].end === units[i].start) {
    i -= 1;
  }

  return i;
}

/** A range of units, in either order, as a quote of the message. */
export function quoteOf(message: Message, units: Unit[], a: number, b: number): Quote {
  const first = units[Math.min(a, b)];
  const last = units[Math.max(a, b)];
  const start = first.start;
  const end = last.end;

  return {
    messageId: message.id,
    start,
    end,
    text: message.text.slice(start, end),
    partial: start > 0 || end < message.text.length,
  };
}

/** The whole message as a quote: today's Reply. */
export function wholeQuote(message: Message): Quote {
  return {
    messageId: message.id,
    start: 0,
    end: message.text.length,
    text: message.text,
    partial: false,
  };
}

/** "…can Tobi crash at yours on Friday…": an ellipsis at whichever end was cut. */
export function snippet(quote: Quote, fullLength: number) {
  const before = quote.start > 0 ? "…" : "";
  const after = quote.end < fullLength ? "…" : "";

  return { before, text: quote.text, after };
}

export function snippetText(quote: Quote, fullLength: number) {
  const { before, text, after } = snippet(quote, fullLength);

  return `${before}${text}${after}`;
}

/** Whether a sent quote still matches its original, or the fallback flash is needed. */
export function stillMatches(quote: Quote, original: Message | undefined) {
  return Boolean(
    original && original.text.slice(quote.start, quote.end) === quote.text,
  );
}

/** Next or previous word unit from `index`, for the keyboard caret. */
export function stepWord(units: Unit[], index: number, direction: 1 | -1) {
  let i = index + direction;

  while (i >= 0 && i < units.length && units[i].kind !== "word") {
    i += direction;
  }

  return i < 0 || i >= units.length ? index : i;
}
