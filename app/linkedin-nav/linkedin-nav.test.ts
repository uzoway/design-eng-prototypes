import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCount, INITIAL, navReducer, tabName, type NavState } from "./state.ts";

describe("formatCount", () => {
  it("shows nothing for zero", () => {
    assert.equal(formatCount(0), "");
    assert.equal(formatCount(-3), "");
  });

  it("shows one and two digits as they are", () => {
    assert.equal(formatCount(1), "1");
    assert.equal(formatCount(9), "9");
    assert.equal(formatCount(10), "10");
    assert.equal(formatCount(99), "99");
  });

  it("caps at 99+", () => {
    assert.equal(formatCount(100), "99+");
    assert.equal(formatCount(4000), "99+");
  });
});

describe("tabName", () => {
  it("includes the count the way LinkedIn does", () => {
    assert.equal(tabName("home", 1), "Home, 1 new notification");
    assert.equal(tabName("messaging", 0), "Messaging, 0 new notifications");
    assert.equal(tabName("notifications", 2), "Notifications, 2 new notifications");
    assert.equal(tabName("network", 0), "My Network, 0 new notifications");
  });
});

describe("navReducer", () => {
  it("starts on Home with only the Home dot", () => {
    assert.equal(INITIAL.selected, "home");
    assert.deepEqual(INITIAL.counts, { home: 1, network: 0, jobs: 0, messaging: 0, notifications: 0 });
  });

  it("counts simulated notifications and messages", () => {
    let state = INITIAL;

    for (let i = 0; i < 10; i++) state = navReducer(state, { type: "simulate", event: "notification" });
    state = navReducer(state, { type: "simulate", event: "message" });

    assert.equal(state.counts.notifications, 10);
    assert.equal(state.counts.messaging, 1);
  });

  it("keeps Home's badge a dot however many posts arrive", () => {
    let state: NavState = { ...INITIAL, selected: "jobs" };

    state = navReducer(state, { type: "simulate", event: "post" });
    state = navReducer(state, { type: "simulate", event: "post" });

    assert.equal(state.counts.home, 1);
    // The dot can't change, so each post still pulses it.
    assert.equal(state.pulses.home, 2);
  });

  it("doesn't badge the tab you're already on", () => {
    const state = navReducer(INITIAL, { type: "simulate", event: "post" });

    assert.equal(state, INITIAL);
  });

  it("keeps the badge when selecting, and clears only that tab's", () => {
    let state = navReducer(INITIAL, { type: "simulate", event: "notification" });

    state = navReducer(state, { type: "select", tab: "notifications" });
    assert.equal(state.selected, "notifications");
    assert.equal(state.counts.notifications, 1, "the badge clears once the selection lands, not before");

    state = navReducer(state, { type: "clear", tab: "notifications" });
    assert.equal(state.counts.notifications, 0);
    assert.equal(state.counts.home, 1, "Home's dot is untouched");
  });

  it("returns the same state when nothing changes", () => {
    assert.equal(navReducer(INITIAL, { type: "select", tab: "home" }), INITIAL);
    assert.equal(navReducer(INITIAL, { type: "clear", tab: "jobs" }), INITIAL);
  });
});
