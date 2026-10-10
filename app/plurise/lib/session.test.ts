import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { unifiedDiff } from "./diff.ts";
import { buildTrace, traceFilename } from "./export-trace.ts";
import { deriveMetrics, type Clock } from "./instrumentation.ts";
import {
  CANONICAL_AI_PATCH,
  INITIAL_CODE,
  PATCH_ID,
  REFERENCE_CORRECTION,
  patchForCondition,
} from "./scenario.ts";
import {
  sessionReducer,
  startSession,
  type SessionAction,
  type SessionState,
  type Untimed,
} from "./session-state.ts";

let tick = 0;
const at = (now = (tick += 100)): Clock => ({ now, iso: new Date(1_800_000_000_000 + now).toISOString() });

function run(state: SessionState, ...actions: Untimed<SessionAction>[]) {
  return actions.reduce(
    (current, action) => sessionReducer(current, { ...action, at: at() } as SessionAction),
    state,
  );
}

const types = (state: SessionState) => state.events.map((event) => event.type);

function runTests(state: SessionState) {
  const started = run(state, { type: "START_TEST_RUN" });

  return run(started, { type: "COMPLETE_TEST_RUN", sessionId: started.sessionId, run: started.runCount });
}

describe("condition parity", () => {
  it("both conditions reference the one canonical patch", () => {
    assert.equal(patchForCondition("human-gated"), CANONICAL_AI_PATCH);
    assert.equal(patchForCondition("agent-applied"), CANONICAL_AI_PATCH);
  });

  it("the working file is byte-identical once the patch has entered it", () => {
    const human = run(startSession("human-gated", "a", at(0)), { type: "APPLY_PATCH" });
    const agent = startSession("agent-applied", "b", at(0));

    assert.equal(human.implementationCode, agent.implementationCode);
    assert.equal(human.implementationCode, CANONICAL_AI_PATCH);
  });

  it("both conditions review the same diff", () => {
    const human = unifiedDiff(INITIAL_CODE, patchForCondition("human-gated"));
    const agent = unifiedDiff(INITIAL_CODE, patchForCondition("agent-applied"));

    assert.deepEqual(human, agent);
  });
});

describe("human-gated", () => {
  it("starts clean with the patch waiting", () => {
    const state = startSession("human-gated", "s", at(0));

    assert.equal(state.implementationCode, INITIAL_CODE);
    assert.equal(state.patchState, "ready");
    assert.deepEqual(types(state), ["session_started", "condition_assigned"]);
  });

  it("dismiss leaves the file alone and the patch can still be applied", () => {
    const dismissed = run(startSession("human-gated", "s", at(0)), { type: "DISMISS_PATCH" });

    assert.equal(dismissed.implementationCode, INITIAL_CODE);
    assert.equal(dismissed.patchState, "dismissed");

    const applied = run(dismissed, { type: "APPLY_PATCH" });
    const event = applied.events.at(-1);

    assert.equal(applied.implementationCode, CANONICAL_AI_PATCH);
    assert.equal(event?.actor, "developer");
    assert.equal(event?.detail?.afterDismissal, true);
    assert.equal(event?.detail?.patchId, PATCH_ID);
  });
});

describe("agent-applied", () => {
  it("starts with the patch already applied by the agent", () => {
    const state = startSession("agent-applied", "s", at(0));
    const applied = state.events.find((event) => event.type === "patch_applied");

    assert.equal(state.implementationCode, CANONICAL_AI_PATCH);
    assert.equal(state.patchState, "applied");
    assert.equal(applied?.actor, "agent");
    assert.equal(applied?.elapsedMs, 0);
  });

  it("has no gate: apply and dismiss do nothing", () => {
    const state = startSession("agent-applied", "s", at(0));

    assert.equal(run(state, { type: "APPLY_PATCH" }, { type: "DISMISS_PATCH" }), state);
  });
});

describe("test runs", () => {
  it("reports 2/6, 5/6 and 6/6 for initial, patched and corrected code", () => {
    const human = startSession("human-gated", "s", at(0));
    const initial = runTests(human);
    const patched = runTests(run(initial, { type: "APPLY_PATCH" }));
    const corrected = runTests(run(patched, { type: "EDIT_CODE", code: REFERENCE_CORRECTION }));

    const outcomes = corrected.events
      .filter((event) => event.type === "tests_passed" || event.type === "tests_failed")
      .map((event) => event.detail?.passed);

    assert.deepEqual(outcomes, [2, 5, 6]);
    assert.equal(corrected.runCount, 3);
  });

  it("editing clears stale results but keeps the run count", () => {
    const tested = runTests(startSession("agent-applied", "s", at(0)));
    const edited = run(tested, { type: "EDIT_CODE", code: CANONICAL_AI_PATCH + "\n" });

    assert.equal(edited.testStatus, "idle");
    assert.deepEqual(edited.testResults, []);
    assert.equal(edited.cleared, "edit");
    assert.equal(edited.runCount, 1);
  });

  it("results from a run the file changed under are discarded", () => {
    const started = run(startSession("agent-applied", "s", at(0)), { type: "START_TEST_RUN" });
    const edited = run(started, { type: "EDIT_CODE", code: REFERENCE_CORRECTION });
    const done = run(edited, { type: "COMPLETE_TEST_RUN", sessionId: "s", run: 1 });

    assert.equal(done.testStatus, "idle");
    assert.equal(done.cleared, "edit-during-run");
    assert.equal(done.events.at(-1)?.detail?.stale, true);
  });

  it("a run that finishes after a reset is ignored", () => {
    const fresh = startSession("agent-applied", "new", at(0));

    assert.equal(run(fresh, { type: "COMPLETE_TEST_RUN", sessionId: "old", run: 1 }), fresh);
  });
});

describe("trace", () => {
  it("is ordered and monotonic even when the clock steps backwards", () => {
    const start = startSession("human-gated", "s", at(1_000));
    const state = [900, 1_200, 1_100].reduce(
      (current, now) => sessionReducer(current, { type: "TOGGLE_DIFF", at: at(now) }),
      start,
    );

    state.events.forEach((event, index) => {
      assert.equal(event.sequence, index + 1);
      assert.ok(index === 0 || event.elapsedMs >= state.events[index - 1].elapsedMs);
    });
  });

  it("logs the first edit once, not every keystroke", () => {
    const state = run(
      startSession("agent-applied", "s", at(0)),
      { type: "EDIT_CODE", code: "a" },
      { type: "EDIT_CODE", code: "ab" },
      { type: "EDIT_CODE", code: "abc" },
      { type: "COMMIT_EDITS" },
    );

    assert.equal(types(state).filter((type) => type === "code_edit_started").length, 1);
    assert.equal(state.events.at(-1)?.detail?.inputEvents, 3);
    assert.equal(state.editorInputEvents, 3);
  });

  it("switching condition starts a clean trace", () => {
    const busy = run(startSession("human-gated", "a", at(0)), { type: "TOGGLE_DIFF" }, { type: "APPLY_PATCH" });
    const switched = sessionReducer(busy, {
      type: "START_SESSION",
      condition: "agent-applied",
      sessionId: "b",
      at: at(),
    });

    assert.deepEqual(types(switched), ["session_started", "condition_assigned", "patch_applied"]);
    assert.equal(switched.events[0].elapsedMs, 0);
    assert.equal(switched.runCount, 0);
  });

  it("derives metrics from the events", () => {
    let state = startSession("human-gated", "s", at(0));

    state = run(state, { type: "TOGGLE_DIFF" }, { type: "APPLY_PATCH" });
    state = runTests(state);
    state = run(
      state,
      { type: "EDIT_CODE", code: REFERENCE_CORRECTION },
      { type: "OPEN_COMPREHENSION" },
      { type: "SUBMIT_COMPREHENSION", answer: "developer", confidence: 4 },
    );

    const metrics = deriveMetrics(state.condition, state.events);

    assert.equal(metrics.patchActor, "developer");
    assert.equal(metrics.diffViewedBeforeApplication, true);
    assert.equal(metrics.diffViewedBeforeFirstTest, true);
    assert.equal(metrics.runCount, 1);
    assert.equal(metrics.finalPassedTests, 5);
    assert.equal(metrics.manualEditOccurred, true);
    assert.equal(metrics.comprehensionCorrect, true);
    assert.equal(metrics.confidence, 4);
    assert.deepEqual(metrics.verificationSequence, ["Diff", "Applied", "Tests 5/6", "Edit"]);
  });

  it("the manipulation check is condition-dependent", () => {
    const answer = (condition: "human-gated" | "agent-applied") =>
      run(startSession(condition, "s", at(0)), {
        type: "SUBMIT_COMPREHENSION",
        answer: "developer",
        confidence: 3,
      }).events.at(-1)?.detail?.correct;

    assert.equal(answer("human-gated"), true);
    assert.equal(answer("agent-applied"), false);
  });

  it("export carries no source code and matches the session", () => {
    const state = runTests(
      run(startSession("agent-applied", "s", at(0)), { type: "EDIT_CODE", code: REFERENCE_CORRECTION }),
    );
    const trace = buildTrace(state);
    const json = JSON.stringify(trace);

    assert.equal(trace.localOnly, true);
    assert.equal(trace.events.length, state.events.length);
    assert.equal(trace.summary.finalPassedTests, 6);
    assert.ok(!json.includes("setTimeout"));
    assert.ok(!json.includes("fetchJson"));
    assert.equal(
      traceFilename("human-gated", "2026-10-10T20:00:00.000Z"),
      "plurise-human-gated-trace-2026-10-10T20-00-00.000Z.json",
    );
  });
});
