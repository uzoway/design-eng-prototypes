import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changedWords,
  counterAnnouncement,
  isEditable,
  makeInvites,
  NOTE,
  saveBlock,
  sentLabel,
  SUBJECT_ID,
  windowLine,
} from "./data.ts";

const NOW = 1_800_000_000_000;
const MIN = 60_000;

function slices(text: string, spans: { start: number; end: number }[]) {
  return spans.map((span) => text.slice(span.start, span.end));
}

describe("changedWords", () => {
  it("finds the one fixed word", () => {
    const fixed = NOTE.replace("desgin", "design");

    assert.deepEqual(slices(fixed, changedWords(NOTE, fixed)), ["design"]);
  });

  it("finds a fixed word and an added one, nothing else", () => {
    const fixed = NOTE.replace("our desgin", "our weekly design");

    assert.deepEqual(slices(fixed, changedWords(NOTE, fixed)), ["weekly", "design"]);
  });

  it("ignores whitespace-only changes", () => {
    assert.deepEqual(changedWords("a b  c", "a  b c"), []);
  });

  it("treats a word with new punctuation as changed", () => {
    assert.deepEqual(slices("Hi Maya,", changedWords("Hi Maya", "Hi Maya,")), ["Maya,"]);
  });
});

describe("saveBlock", () => {
  it("blocks unchanged, whitespace-only, empty and over-limit drafts", () => {
    assert.equal(saveBlock(NOTE, NOTE, 300), "unchanged");
    assert.equal(saveBlock(NOTE, `${NOTE}  `, 300), "unchanged");
    assert.equal(saveBlock(NOTE, "   ", 300), "empty");
    assert.equal(saveBlock(NOTE, "x".repeat(301), 300), "over");
  });

  it("allows a real change at exactly the limit", () => {
    assert.equal(saveBlock(NOTE, "y".repeat(300), 300), null);
  });

  it("the default note is over the free limit", () => {
    assert.equal(NOTE.length, 272);
    assert.equal(saveBlock(NOTE, NOTE.replace("desgin", "design"), 200), "over");
  });
});

describe("the edit window", () => {
  it("is open for the subject and closed for older notes", () => {
    const invites = makeInvites(NOW);
    const editable = invites.filter((invite) => isEditable(invite, NOW)).map((invite) => invite.id);

    assert.deepEqual(editable, [SUBJECT_ID]);
  });

  it("closes 20 seconds after load with ?expire", () => {
    const subject = makeInvites(NOW, { expire: true })[0];

    assert.equal(isEditable(subject, NOW + 19_000), true);
    assert.equal(isEditable(subject, NOW + 20_000), false);
  });

  it("says how long is left", () => {
    const subject = makeInvites(NOW)[0];

    assert.equal(windowLine(subject, NOW), "You can edit this for 56 more minutes. Maya will see it as edited.");
    assert.equal(windowLine(subject, NOW + 55 * MIN + 30_000), "You can edit this for 1 more minute. Maya will see it as edited.");
  });
});

describe("sentLabel", () => {
  it("reads like LinkedIn's", () => {
    assert.equal(sentLabel(NOW - 4 * MIN, NOW), "Sent 4 minutes ago");
    assert.equal(sentLabel(NOW - 61 * MIN, NOW), "Sent 1 hour ago");
    assert.equal(sentLabel(NOW - 27 * 60 * MIN, NOW), "Sent yesterday");
    assert.equal(sentLabel(NOW - 53 * 60 * MIN, NOW), "Sent 2 days ago");
  });
});

describe("counterAnnouncement", () => {
  it("speaks only at 20 left, at the limit and over it", () => {
    assert.equal(counterAnnouncement(279, 300), "");
    assert.equal(counterAnnouncement(280, 300), "20 characters left");
    assert.equal(counterAnnouncement(281, 300), "");
    assert.equal(counterAnnouncement(300, 300), "300 of 300 characters");
    assert.equal(counterAnnouncement(301, 300), "Over the character limit");
  });
});
