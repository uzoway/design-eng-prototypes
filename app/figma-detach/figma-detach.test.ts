import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { breakdown, formatCount, insertSeries, sortRows, topReason, withSession } from "./analytics.ts";
import { capNote, cleanNote, decide, endOfDay, noteLength, shortSubjectOf, socialLine, truncateMiddle } from "./asking.ts";
import { COMPONENTS, STATS } from "./data.ts";
import { absoluteBox, boundsOf, createScene, describe as describeDetach, detach, detachList, detachSubject } from "./scene.ts";

const noOne = { asked: new Set<string>(), quietUntil: null };
const now = new Date(2026, 10, 6, 14, 30).getTime();

describe("scene", () => {
  it("detaches an instance into a frame and leaves the rest alone", () => {
    const scene = createScene();
    const next = detach(scene, ["button", "title"]);

    assert.equal(next.button.type, "frame");
    assert.equal(next.button.componentId, "button");
    assert.equal(next.title.type, "text");
    assert.equal(scene.button.type, "instance", "the old scene is untouched, so undo can restore it");
  });

  it("keeps nested instances as instances when their parent is detached", () => {
    const next = detach(createScene(), ["card-number"]);

    assert.equal(next["card-number"].type, "frame");
    assert.equal(next["card-icon"].type, "instance");
  });

  it("returns the same scene when nothing can be detached", () => {
    const scene = createScene();

    assert.equal(detach(scene, ["title", "checkout"]), scene);
  });

  it("adds up parent offsets for page boxes", () => {
    const scene = createScene();

    assert.deepEqual(absoluteBox(scene, "card-icon"), { x: 38, y: 530, w: 16, h: 16 });
    assert.deepEqual(boundsOf(scene, ["email", "button"]), { x: 24, y: 412, w: 327, h: 352 });
  });
});

describe("naming what was detached", () => {
  const scene = createScene();
  const named = (ids: string[]) => describeDetach(scene, ids);

  it("names one component", () => {
    assert.equal(detachSubject(named(["button"])), "Button");
  });

  it("names a nested instance by where it sits", () => {
    assert.equal(detachSubject(named(["card-icon"])), "Icon in Input");
  });

  it("counts several of the same component", () => {
    assert.equal(detachSubject(named(["email", "card-number", "name-on-card"])), "3 Inputs");
    assert.deepEqual(detachList(named(["email", "card-number", "name-on-card"])), []);
  });

  it("counts different components and lists them", () => {
    const items = named(["button", "card", "badge"]);

    assert.equal(detachSubject(items), "3 components");
    assert.deepEqual(detachList(items), ["Button", "Card", "Badge"]);
  });

  it("doesn't pluralise a component path", () => {
    const tabs = { id: "a", component: { ...COMPONENTS.tabs }, inside: null };

    assert.equal(detachSubject([tabs, { ...tabs, id: "b" }]), "2 × Navigation / Tabs / Segmented / Small");
  });

  it("shortens a long title without mixing two names", () => {
    const icon = { ...COMPONENTS.icon, name: "Icon / Payments / Credit card / 16" };
    const nested = { id: "a", component: icon, inside: "Form field / Text input / With helper text" };

    assert.equal(shortSubjectOf(named(["card-icon"]), 24), "Icon in Input");
    assert.equal(shortSubjectOf([nested], 24), "Icon / Payme…t card / 16");
    assert.equal(shortSubjectOf([nested, { ...nested, id: "b" }], 24), "2 × Icon / Pay…card / 16");
  });

  it("skips layers that aren't instances", () => {
    assert.equal(named(["title", "checkout"]).length, 0);
  });
});

describe("should we ask?", () => {
  const scene = createScene();
  const named = (ids: string[]) => describeDetach(scene, ids);

  it("asks about a library component", () => {
    const decision = decide(named(["button"]), noOne, now);

    assert.equal(decision.kind, "ask");
  });

  it("stays quiet for a local component", () => {
    assert.equal(decide(named(["logo"]), noOne, now).kind, "silent");
  });

  it("asks only about library components when a local one is mixed in", () => {
    const decision = decide(named(["logo", "badge"]), noOne, now);

    assert.equal(decision.kind, "ask");
    assert.deepEqual(decision.kind === "ask" && decision.items.map((item) => item.id), ["badge"]);
  });

  it("asks once per component per session, then nudges", () => {
    const asked = { asked: new Set(["button"]), quietUntil: null };

    assert.equal(decide(named(["button"]), asked, now).kind, "nudge");
  });

  it("asks about the new component when one has been asked before", () => {
    const asked = { asked: new Set(["button"]), quietUntil: null };
    const decision = decide(named(["button", "card"]), asked, now);

    assert.deepEqual(decision.kind === "ask" && decision.items.map((item) => item.id), ["card"]);
  });

  it("stays quiet until the end of the day after Don't ask today", () => {
    const quiet = { asked: new Set<string>(), quietUntil: endOfDay(now) };

    assert.equal(decide(named(["button"]), quiet, now).kind, "silent");
    assert.equal(decide(named(["button"]), quiet, endOfDay(now)).kind, "ask");
    assert.equal(new Date(endOfDay(now)).getDate(), 7);
  });
});

describe("the social line", () => {
  const scene = createScene();
  const named = (ids: string[]) => describeDetach(scene, ids);

  it("says how many others hit the same wall", () => {
    assert.equal(socialLine(named(["button"])), "4 others detached Button this week. Most said: Missing a variant.");
  });

  it("handles one other and nobody", () => {
    assert.equal(socialLine(named(["card"])), "1 other detached Card this week. Most said: Spacing doesn't fit.");
    assert.equal(socialLine(named(["badge"])), "You're the first to detach Badge this week.");
  });

  it("is left out for a mix of components", () => {
    assert.equal(socialLine(named(["button", "card"])), null);
  });
});

describe("notes", () => {
  it("trims and caps at the limit, counting emoji as one character", () => {
    assert.equal(cleanNote("  need a loading state  ", 140), "need a loading state");
    assert.equal(noteLength("👩🏽‍💻 ok"), 4);
    assert.equal(cleanNote("👩🏽‍💻👩🏽‍💻👩🏽‍💻", 2), "👩🏽‍💻👩🏽‍💻");
  });

  it("caps while typing without trimming", () => {
    assert.equal(capNote("ab ", 140), "ab ");
    assert.equal(capNote("abcdef", 4), "abcd");
  });

  it("truncates long names in the middle", () => {
    assert.equal(truncateMiddle("Button", 24), "Button");
    assert.equal(truncateMiddle("Navigation / Tabs / Segmented / Small", 24), "Navigation /…ted / Small");
  });

  it("keeps right-to-left text intact", () => {
    assert.equal(cleanNote(" نحتاج حالة تحميل ", 140), "نحتاج حالة تحميل");
  });
});

describe("analytics", () => {
  const empty = { detaches: [], reasons: [] };

  it("matches the canned Button breakdown", () => {
    const button = withSession(STATS, empty).find((row) => row.id === "button")!;

    assert.deepEqual(
      breakdown(button.reasons).map((reason) => [reason.short, reason.count]),
      [
        ["Missing a variant", 14],
        ["Spacing", 5],
        ["Content", 3],
        ["Broken", 1],
      ],
    );
    assert.equal(button.reasonTotal, 23);
    assert.equal(topReason(button.reasons)?.id, "missing");
  });

  it("adds this session's detach, reason and note", () => {
    const session = {
      detaches: ["button"],
      reasons: [{ componentId: "button", reason: "missing" as const, note: "icon-only, small" }],
    };
    const button = withSession(STATS, session).find((row) => row.id === "button")!;

    assert.equal(button.detaches, 32);
    assert.equal(button.reasons.missing, 15);
    assert.equal(button.notes[0].who, "You");
    assert.ok(button.mine);
  });

  it("handles a component with no detaches and one with no reasons", () => {
    const rows = withSession(STATS, empty);

    assert.equal(rows.find((row) => row.id === "divider")!.detaches, 0);
    assert.equal(rows.find((row) => row.id === "tooltip")!.reasonTotal, 0);
    assert.equal(topReason({}), null);
    assert.ok(breakdown({}).every((reason) => reason.share === 0));
  });

  it("scales inserts and detaches with the range, but not reasons", () => {
    const year = withSession(STATS, empty, "365").find((row) => row.id === "button")!;

    assert.equal(year.detaches, 329);
    assert.equal(year.reasons.missing, 14);
  });

  it("sorts by any column, breaking ties by name", () => {
    const rows = withSession(STATS, empty);

    assert.equal(sortRows(rows, "detaches", "descending")[0].id, "icon");
    assert.equal(sortRows(rows, "detaches", "ascending")[0].id, "divider");
    assert.equal(sortRows(rows, "name", "ascending")[0].id, "avatar");
  });

  it("formats counts the way the table shows them", () => {
    assert.equal(formatCount(0), "0");
    assert.equal(formatCount(9999), "9,999");
    assert.equal(formatCount(12406), "12.4k");
    assert.equal(formatCount(48213), "48.2k");
    assert.equal(formatCount(100_000), "100k");
    assert.equal(formatCount(1_250_000), "1.2M");
  });

  it("never draws more than 30 points on the graph", () => {
    assert.equal(insertSeries("30").length, 30);
    assert.equal(insertSeries("365").length, 30);
  });
});
