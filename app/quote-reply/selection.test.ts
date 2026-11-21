import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pieces,
  quoteOf,
  snippetText,
  stepWord,
  stillMatches,
  tokenize,
  wholeQuote,
  wordOf,
} from "./selection.ts";
import type { Message } from "./selection.ts";

const ada: Message = {
  id: "ada-long",
  from: "ada",
  time: "10:41",
  text: "Okay so for Saturday. Are you still bringing the speaker? Also what time are we leaving, 2 or 3? Dami said traffic gets mad after 3. And can Tobi crash at yours on Friday, or should I find him somewhere else? Let me know tonight so I can tell him 🙏",
};

const units = tokenize(ada.text);
const at = (word: string, nth = 0) =>
  units.findIndex(function match(unit, i) {
    if (ada.text.slice(unit.start, unit.end) !== word) return false;
    return units.slice(0, i).filter((u) => ada.text.slice(u.start, u.end) === word).length === nth;
  });

describe("tokenize", () => {
  it("splits trailing punctuation from its word", () => {
    const friday = at("Friday");
    assert.equal(ada.text.slice(units[friday].start, units[friday].end), "Friday");
    assert.equal(units[friday + 1].kind, "punct");
    assert.equal(ada.text.slice(units[friday + 1].start, units[friday + 1].end), ",");
  });

  it("keeps an emoji as a word", () => {
    const last = units[units.length - 1];
    assert.equal(ada.text.slice(last.start, last.end), "🙏");
    assert.equal(last.kind, "word");
  });

  it("rebuilds the exact text from pieces, so nothing reflows", () => {
    const text = pieces(ada.text, units)
      .map((piece) => piece.text)
      .join("");
    assert.equal(text, ada.text);
  });

  it("keeps a run that's all punctuation whole", () => {
    assert.deepEqual(tokenize("wait …"), [
      { start: 0, end: 4, kind: "word" },
      { start: 5, end: 6, kind: "word" },
    ]);
  });
});

describe("quotes", () => {
  it("quotes a drag from 'can' to 'Friday' without the comma", () => {
    const quote = quoteOf(ada, units, at("can"), at("Friday"));
    assert.equal(quote.text, "can Tobi crash at yours on Friday");
    assert.equal(quote.partial, true);
    assert.equal(snippetText(quote, ada.text.length), "…can Tobi crash at yours on Friday…");
  });

  it("takes the question mark when the drag passes it, in either direction", () => {
    const question = at("3") + 1;
    const quote = quoteOf(ada, units, question, at("2"));
    assert.equal(quote.text, "2 or 3?");
  });

  it("gives an ordinary reply when the selection is the whole message", () => {
    const quote = quoteOf(ada, units, 0, units.length - 1);
    assert.equal(quote.partial, false);
    assert.equal(snippetText(quote, ada.text.length), ada.text);
    assert.deepEqual(quote, wholeQuote(ada));
  });

  it("puts an ellipsis only at the end that was cut", () => {
    const opening = quoteOf(ada, units, 0, at("Saturday"));
    assert.equal(snippetText(opening, ada.text.length), "Okay so for Saturday…");
    const closing = quoteOf(ada, units, at("Let"), units.length - 1);
    assert.equal(snippetText(closing, ada.text.length), "…Let me know tonight so I can tell him 🙏");
  });

  it("quotes one word", () => {
    const quote = quoteOf(ada, units, at("Friday"), at("Friday"));
    assert.equal(snippetText(quote, ada.text.length), "…Friday…");
  });

  it("falls back when the original was edited", () => {
    const quote = quoteOf(ada, units, at("can"), at("Friday"));
    assert.equal(stillMatches(quote, ada), true);
    assert.equal(stillMatches(quote, { ...ada, text: ada.text.replace("Tobi", "Tobe") }), false);
    assert.equal(stillMatches(quote, undefined), false);
  });
});

describe("words", () => {
  it("maps a tap on a comma to its word", () => {
    assert.equal(wordOf(units, at("Friday") + 1), at("Friday"));
  });

  it("steps the keyboard caret over punctuation", () => {
    assert.equal(stepWord(units, at("Friday"), 1), at("or", 1));
    assert.equal(stepWord(units, at("or", 1), -1), at("Friday"));
    assert.equal(stepWord(units, 0, -1), 0);
  });
});
