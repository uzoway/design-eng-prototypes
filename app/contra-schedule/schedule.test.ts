import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  atTime,
  dayDiff,
  defaultTime,
  formatCount,
  formatFeedDate,
  formatTime,
  formatWhen,
  formatWhenInline,
  isDayPast,
  isMonthPast,
  isSchedulable,
  monthGrid,
  quickPicks,
  timeSlots,
} from "./schedule.ts";
import { compose, feedPosts, queuedPosts, reducer, seed } from "./state.ts";

/** Local time, months from 1. Nov 16, 2026 is a Monday. */
const at = (month: number, day: number, hours = 0, minutes = 0, year = 2026) =>
  new Date(year, month - 1, day, hours, minutes);

describe("quickPicks", () => {
  it("offers this evening, tomorrow morning and next Monday on a weekday afternoon", () => {
    const picks = quickPicks(at(11, 16, 12, 24));

    assert.deepEqual(
      picks.map((pick) => [pick.id, pick.at.getTime(), pick.hint]),
      [
        ["evening", at(11, 16, 18).getTime(), "6:00 PM"],
        ["tomorrow", at(11, 17, 9).getTime(), "Tue 9:00 AM"],
        ["monday", at(11, 23, 9).getTime(), "Mon 9:00 AM"],
      ],
    );
  });

  it("keeps this evening until half an hour before six", () => {
    assert.equal(quickPicks(at(11, 16, 17, 30))[0].id, "evening");
    assert.equal(quickPicks(at(11, 16, 17, 31))[0].id, "tomorrow");
    assert.equal(quickPicks(at(11, 16, 19, 0))[0].id, "tomorrow");
  });

  it("drops this evening before 5 AM, when it would read as last night", () => {
    assert.equal(quickPicks(at(11, 16, 0, 20))[0].id, "tomorrow");
    assert.equal(quickPicks(at(11, 16, 4, 59))[0].id, "tomorrow");
    assert.equal(quickPicks(at(11, 16, 5, 0))[0].id, "evening");
  });

  it("finds the next Monday from every day of the week", () => {
    // Mon 16 → Mon 23, Tue 17 … Sat 21 → Mon 23, Sun 22 → Mon 30.
    const monday = (day: number) => quickPicks(at(11, day, 10)).find((pick) => pick.id === "monday")!.at;

    for (const day of [16, 17, 18, 19, 20, 21]) {
      assert.equal(monday(day).getTime(), at(11, 23, 9).getTime(), `from Nov ${day}`);
    }
  });

  it("never repeats tomorrow morning: on a Sunday, Monday morning is the Monday after", () => {
    const picks = quickPicks(at(11, 22, 10));
    const tomorrow = picks.find((pick) => pick.id === "tomorrow")!;
    const monday = picks.find((pick) => pick.id === "monday")!;

    assert.equal(tomorrow.at.getTime(), at(11, 23, 9).getTime());
    assert.equal(tomorrow.hint, "Mon 9:00 AM");
    assert.equal(monday.at.getTime(), at(11, 30, 9).getTime());
  });

  it("crosses into the next year at 11:45 PM on Dec 31", () => {
    const picks = quickPicks(at(12, 31, 23, 45));

    assert.deepEqual(
      picks.map((pick) => pick.id),
      ["tomorrow", "monday"],
    );
    assert.equal(picks[0].at.getTime(), at(1, 1, 9, 0, 2027).getTime());
    assert.equal(picks[0].hint, "Fri 9:00 AM");
    assert.equal(picks[1].at.getTime(), at(1, 4, 9, 0, 2027).getTime());
  });
});

describe("monthGrid", () => {
  it("is always six weeks, Sunday first", () => {
    for (const month of [at(11, 1), at(2, 1), at(8, 1), at(2, 1, 0, 0, 2015)]) {
      const grid = monthGrid(month);

      assert.equal(grid.length, 42);
      assert.equal(grid[0].getDay(), 0);
      assert.ok(grid.some((day) => day.getMonth() === month.getMonth() && day.getDate() === 1));
    }
  });

  it("starts November 2026 on the 1st and runs into December", () => {
    const grid = monthGrid(at(11, 16));

    assert.equal(grid[0].getTime(), at(11, 1).getTime());
    assert.equal(grid[41].getTime(), at(12, 12).getTime());
  });

  it("pads a month that starts midweek with the month before", () => {
    // December 2026 starts on a Tuesday.
    const grid = monthGrid(at(12, 1));

    assert.equal(grid[0].getTime(), at(11, 29).getTime());
    assert.equal(grid[2].getTime(), at(12, 1).getTime());
  });

  it("has every day exactly once, a day apart", () => {
    const grid = monthGrid(at(3, 1));

    for (let index = 1; index < grid.length; index += 1) {
      assert.equal(dayDiff(grid[index], grid[index - 1]), 1);
    }
  });
});

describe("past days and slots", () => {
  const now = at(11, 16, 12, 24);

  it("disables days before today, but not today", () => {
    assert.equal(isDayPast(at(11, 15), now), true);
    assert.equal(isDayPast(at(11, 16), now), false);
    assert.equal(isDayPast(at(11, 17), now), false);
  });

  it("disables today once its last slot is under five minutes away", () => {
    assert.equal(isDayPast(at(12, 31), at(12, 31, 23, 40)), false);
    assert.equal(isDayPast(at(12, 31), at(12, 31, 23, 41)), true);
    assert.equal(isDayPast(at(12, 31), at(12, 31, 23, 45)), true);
  });

  it("only shows months that still have a day left", () => {
    assert.equal(isMonthPast(at(10, 1), now), true);
    assert.equal(isMonthPast(at(11, 1), now), false);
    assert.equal(isMonthPast(at(12, 1), at(12, 31, 23, 45)), true);
  });

  it("has 96 quarter-hour slots, with the ones before now + 5 minutes disabled", () => {
    const slots = timeSlots(at(11, 16), now);

    assert.equal(slots.length, 96);
    assert.equal(slots[0].label, "12:00 AM");
    assert.equal(slots[95].label, "11:45 PM");

    const first = slots.find((slot) => !slot.disabled)!;

    // 12:24 + 5 minutes is 12:29, so 12:30 PM is the first slot left.
    assert.equal(first.label, "12:30 PM");
    assert.equal(slots.filter((slot) => slot.disabled).length, 50);
  });

  it("keeps a slot that is exactly five minutes away, and drops one a minute closer", () => {
    assert.equal(timeSlots(at(11, 16), at(11, 16, 12, 25)).find((slot) => !slot.disabled)!.label, "12:30 PM");
    assert.equal(timeSlots(at(11, 16), at(11, 16, 12, 26)).find((slot) => !slot.disabled)!.label, "12:45 PM");
  });

  it("leaves every slot open on a later day", () => {
    assert.equal(
      timeSlots(at(11, 17), now).some((slot) => slot.disabled),
      false,
    );
  });

  it("knows whether a picked time can still be used", () => {
    assert.equal(isSchedulable(at(11, 16, 12, 29), now), true);
    assert.equal(isSchedulable(at(11, 16, 12, 28), now), false);
  });
});

describe("defaultTime", () => {
  const now = at(11, 16, 12, 24);

  it("starts a later day at 9:00 AM", () => {
    assert.equal(defaultTime(at(11, 18), now)!.getTime(), at(11, 18, 9).getTime());
  });

  it("starts today at the first slot left, once 9:00 AM has gone", () => {
    assert.equal(defaultTime(at(11, 16), now)!.getTime(), at(11, 16, 12, 30).getTime());
  });

  it("keeps the time you'd picked when you change the day", () => {
    assert.equal(defaultTime(at(11, 20), now, at(11, 18, 14, 45))!.getTime(), at(11, 20, 14, 45).getTime());
  });

  it("falls back when the kept time has passed on the new day", () => {
    assert.equal(defaultTime(at(11, 16), now, at(11, 18, 8, 0))!.getTime(), at(11, 16, 12, 30).getTime());
  });

  it("has nothing for a day with no slot left", () => {
    assert.equal(defaultTime(at(12, 31), at(12, 31, 23, 45)), null);
  });
});

describe("dayDiff", () => {
  it("counts calendar days, not 24-hour spans", () => {
    assert.equal(dayDiff(at(11, 17, 0, 1), at(11, 16, 23, 59)), 1);
    assert.equal(dayDiff(at(11, 16, 23, 59), at(11, 16, 0, 1)), 0);
    assert.equal(dayDiff(at(11, 15, 23, 59), at(11, 16, 0, 1)), -1);
  });

  it("crosses months and years", () => {
    assert.equal(dayDiff(at(12, 1), at(11, 30)), 1);
    assert.equal(dayDiff(at(1, 1, 9, 0, 2027), at(12, 31, 23, 45)), 1);
  });
});

describe("labels", () => {
  const now = at(11, 16, 12, 24);

  it("writes times the way Contra does", () => {
    assert.equal(formatTime(at(11, 16, 0, 0)), "12:00 AM");
    assert.equal(formatTime(at(11, 16, 9, 0)), "9:00 AM");
    assert.equal(formatTime(at(11, 16, 12, 30)), "12:30 PM");
    assert.equal(formatTime(at(11, 16, 23, 45)), "11:45 PM");
  });

  it("names the day by how far off it is", () => {
    assert.equal(formatWhen(at(11, 16, 18), now), "Today at 6:00 PM");
    assert.equal(formatWhen(at(11, 17, 9), now), "Tomorrow at 9:00 AM");
    assert.equal(formatWhen(at(11, 19, 12, 30), now), "Thu at 12:30 PM");
    assert.equal(formatWhen(at(11, 22, 9), now), "Sun at 9:00 AM");
    assert.equal(formatWhen(at(11, 23, 9), now), "Nov 23 at 9:00 AM");
    assert.equal(formatWhen(at(1, 4, 9, 0, 2027), now), "Jan 4, 2027 at 9:00 AM");
  });

  it("calls a time just past midnight tomorrow, even two minutes away", () => {
    assert.equal(formatWhen(at(11, 17, 0, 15), at(11, 16, 23, 58)), "Tomorrow at 12:15 AM");
  });

  it("lowercases only the relative days mid-sentence", () => {
    assert.equal(formatWhenInline(at(11, 17, 9), now), "tomorrow at 9:00 AM");
    assert.equal(formatWhenInline(at(11, 16, 18), now), "today at 6:00 PM");
    assert.equal(formatWhenInline(at(11, 19, 12, 30), now), "Thu at 12:30 PM");
    assert.equal(formatWhenInline(at(11, 23, 9), now), "Nov 23 at 9:00 AM");
  });

  it("ages a feed post from now to minutes, hours, then a date", () => {
    assert.equal(formatFeedDate(new Date(2026, 10, 16, 12, 23, 30), now), "now");
    assert.equal(formatFeedDate(at(11, 16, 12, 23), now), "1m");
    assert.equal(formatFeedDate(at(11, 16, 12, 12), now), "12m");
    assert.equal(formatFeedDate(at(11, 16, 11, 25), now), "59m");
    assert.equal(formatFeedDate(at(11, 16, 9, 24), now), "3h");
    assert.equal(formatFeedDate(at(11, 15, 12, 25), now), "23h");
    assert.equal(formatFeedDate(at(11, 15, 12, 24), now), "Nov 15");
    assert.equal(formatFeedDate(at(11, 12, 10), now), "Nov 12");
    assert.equal(formatFeedDate(at(11, 12, 10, 0, 2025), now), "Nov 12, 2025");
  });

  it("caps the tab count at 99+ and shows nothing for zero", () => {
    assert.equal(formatCount(0), "");
    assert.equal(formatCount(2), "2");
    assert.equal(formatCount(99), "99");
    assert.equal(formatCount(100), "99+");
  });
});

describe("the feed and the queue", () => {
  const now = at(11, 16, 12, 24).getTime();

  it("seeds one post out and two waiting, the bell first", () => {
    const { posts } = seed(now);

    assert.deepEqual(
      feedPosts(posts, now).map((post) => post.id),
      ["seed-time-away"],
    );
    assert.deepEqual(
      queuedPosts(posts, now).map((post) => post.id),
      ["seed-bell", "seed-batch"],
    );
    assert.equal(posts[1].at, at(11, 17, 9).getTime());
    assert.equal(posts[2].at, at(11, 19, 12, 30).getTime());
    assert.equal(formatFeedDate(posts[0].at, now), "Nov 12");
  });

  it("moves a post from the queue to the top of the feed when its time passes, with nothing moving it", () => {
    const { posts } = seed(now);
    const later = at(11, 17, 9).getTime();

    assert.deepEqual(
      feedPosts(posts, later).map((post) => post.id),
      ["seed-bell", "seed-time-away"],
    );
    assert.deepEqual(
      queuedPosts(posts, later).map((post) => post.id),
      ["seed-batch"],
    );
  });

  it("sorts the queue soonest first after a reschedule", () => {
    const state = reducer(seed(now), { type: "reschedule", id: "seed-bell", at: at(11, 25, 9).getTime() });

    assert.deepEqual(
      queuedPosts(state.posts, now).map((post) => post.id),
      ["seed-batch", "seed-bell"],
    );
  });

  it("posts now, deletes, and puts a deleted post back where it was", () => {
    let state = seed(now);
    const bell = state.posts.find((post) => post.id === "seed-bell")!;

    state = reducer(state, { type: "delete", id: "seed-bell" });
    assert.equal(queuedPosts(state.posts, now).length, 1);

    state = reducer(state, { type: "add", post: bell });
    state = reducer(state, { type: "add", post: bell });
    assert.deepEqual(
      queuedPosts(state.posts, now).map((post) => post.id),
      ["seed-bell", "seed-batch"],
    );

    state = reducer(state, { type: "post-now", id: "seed-batch", now });
    assert.deepEqual(
      feedPosts(state.posts, now).map((post) => post.id),
      ["seed-batch", "seed-time-away"],
    );
  });

  it("toggles a like and its count", () => {
    let state = seed(now);

    state = reducer(state, { type: "like", id: "seed-time-away" });
    assert.deepEqual([state.posts[0].liked, state.posts[0].likes], [false, 1]);

    state = reducer(state, { type: "like", id: "seed-time-away" });
    assert.deepEqual([state.posts[0].liked, state.posts[0].likes], [true, 2]);
  });

  it("puts a newly scheduled post in the queue by its time", () => {
    const post = compose("  Batching next week's posts tonight.  ", atTime(now, 18).getTime(), "scheduled");
    const state = reducer(seed(now), { type: "add", post });

    assert.equal(post.text, "Batching next week's posts tonight.");
    assert.deepEqual(
      queuedPosts(state.posts, now).map((entry) => entry.id),
      [post.id, "seed-bell", "seed-batch"],
    );
  });
});
