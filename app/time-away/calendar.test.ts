import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addRange,
  awayDaysIn,
  buildGrid,
  dayOf,
  dayText,
  levelOf,
  longDate,
  newId,
  ordinal,
  parts,
  rangeSummary,
  reasonFor,
  type AwayRange,
} from "./calendar.ts";

const today = dayOf(2026, 9, 17); // Saturday, Oct 17 2026

const away = (start: number, end: number, text = "On vacation"): AwayRange => ({
  ...reasonFor(text),
  id: newId(),
  start,
  end,
});

describe("grid", () => {
  it("covers 53 weeks ending today, starting on a Sunday", () => {
    const grid = buildGrid("last", today);

    assert.equal(grid.weeks.length, 53);
    assert.equal(parts(grid.first).weekday, 0);
    assert.equal(longDate(grid.first), "October 12th");
    assert.equal(grid.weeks.at(-1)![6], today);
    assert.equal(grid.months.reduce((sum, month) => sum + month.span, 0), 53);
    assert.deepEqual(
      grid.months.slice(0, 3).map((month) => [month.short, month.span]),
      [
        ["Oct", 3],
        ["Nov", 5],
        ["Dec", 4],
      ],
    );
  });

  it("shows a past year from Jan 1 to Dec 31 with padding outside it", () => {
    const grid = buildGrid(2025, today);

    assert.equal(grid.first, dayOf(2025, 0, 1));
    assert.equal(grid.last, dayOf(2025, 11, 31));
    assert.equal(grid.weeks[0].indexOf(grid.first), parts(grid.first).weekday);
    assert.equal(grid.weeks[0][0], null);
    assert.equal(grid.months[0].short, "Jan");
    assert.equal(grid.months.length, 12);
  });

  it("leaves future days of the current year empty", () => {
    const grid = buildGrid(2026, today);

    assert.equal(grid.last, today);
    assert.equal(grid.weeks.at(-1)!.every((day) => day === null), true);
    assert.equal(grid.months.at(-1)!.short, "Dec");
  });
});

describe("words", () => {
  it("writes ordinals the way GitHub does", () => {
    assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal), [
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "31st",
    ]);
  });

  it("summarises ranges, naming the year only when it changes", () => {
    assert.equal(rangeSummary(dayOf(2026, 7, 3), dayOf(2026, 7, 24)), "Aug 3 – 24 · 22 days");
    assert.equal(rangeSummary(dayOf(2026, 6, 28), dayOf(2026, 7, 3)), "Jul 28 – Aug 3 · 7 days");
    assert.equal(rangeSummary(dayOf(2026, 7, 3), dayOf(2026, 7, 3)), "Aug 3 · 1 day");
    assert.equal(
      rangeSummary(dayOf(2025, 11, 28), dayOf(2026, 0, 4)),
      "Dec 28, 2025 – Jan 4, 2026 · 8 days",
    );
  });

  it("describes away days, and catches you committing on holiday", () => {
    const trip = away(dayOf(2026, 7, 3), dayOf(2026, 7, 24));

    assert.equal(dayText(0, dayOf(2026, 7, 5), trip), "On vacation from August 3rd to August 24th.");
    assert.equal(
      dayText(4, dayOf(2026, 7, 12), trip),
      "4 contributions on August 12th, while on vacation.",
    );
    assert.equal(dayText(1, dayOf(2026, 8, 1), undefined), "1 contribution on September 1st.");
    assert.equal(dayText(0, dayOf(2026, 8, 1), undefined), "No contributions on September 1st.");
  });

  it("matches suggestions loosely and keeps custom reasons", () => {
    assert.equal(reasonFor("  touching GRASS ").emoji, "🌱");
    assert.equal(reasonFor("Moving house").during, "away (Moving house)");
    assert.equal(reasonFor("").label, "Away");
  });
});

describe("ranges", () => {
  it("cuts an old range in two when a new one lands in the middle", () => {
    const trip = away(10, 30);
    const result = addRange([trip], away(15, 20, "Out sick"));

    assert.deepEqual(
      result.map((range) => [range.start, range.end, range.label]),
      [
        [10, 14, "On vacation"],
        [15, 20, "Out sick"],
        [21, 30, "On vacation"],
      ],
    );
    assert.equal(new Set(result.map((range) => range.id)).size, 3);
  });

  it("joins touching ranges with the same reason", () => {
    const result = addRange([away(10, 14)], away(15, 20));

    assert.deepEqual(
      result.map((range) => [range.start, range.end]),
      [[10, 20]],
    );
  });

  it("replaces a range it fully covers", () => {
    const result = addRange([away(12, 14, "Out sick")], away(10, 20));

    assert.deepEqual(
      result.map((range) => [range.start, range.end, range.label]),
      [[10, 20, "On vacation"]],
    );
  });

  it("counts away days only inside the period shown", () => {
    assert.equal(awayDaysIn([away(5, 14), away(20, 22)], 10, 21), 7);
  });
});

describe("levels", () => {
  it("splits counts into quarters of the busiest day", () => {
    assert.deepEqual([0, 1, 3, 4, 6, 9, 12].map((count) => levelOf(count, 12)), [0, 1, 1, 2, 2, 3, 4]);
  });
});
