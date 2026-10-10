import { evaluate, tally, type TestResult } from "./evaluator.ts";
import type {
  Actor,
  Answer,
  Clock,
  TraceDetail,
  TraceEvent,
  TraceEventType,
} from "./instrumentation.ts";
import { isCorrectAnswer } from "./instrumentation.ts";
import {
  CONDITIONS,
  FILE_PATHS,
  INITIAL_CODE,
  PATCH_ID,
  patchForCondition,
  type Condition,
  type FileId,
} from "./scenario.ts";

export type Stage = "intro" | "workspace" | "comprehension" | "summary";
export type PatchState = "ready" | "applied" | "dismissed";
export type TestStatus = "idle" | "running" | "complete";
export type PanelTab = "assistant" | "events";

// Why the runner went back to idle, so it can say so instead of going blank.
export type ClearedReason = "edit" | "apply" | "edit-during-run" | null;

export type SessionState = {
  stage: Stage;
  sessionId: string;
  condition: Condition;
  startedAt: string;
  clockOrigin: number;
  patchState: PatchState;
  // Elapsed ms when the patch last entered the file. Keys the editor highlight.
  patchAppliedAt: number | null;
  activeFile: FileId;
  implementationCode: string;
  panelTab: PanelTab;
  diffOpen: boolean;
  testStatus: TestStatus;
  testResults: TestResult[];
  testSnapshot: string | null;
  cleared: ClearedReason;
  runCount: number;
  editorInputEvents: number;
  uncommittedInputs: number;
  comprehensionAnswer: Answer | null;
  confidence: number | null;
  events: TraceEvent[];
};

type Timed = { at: Clock };

export type SessionAction =
  | ({ type: "START_SESSION"; condition: Condition; sessionId: string } & Timed)
  | ({ type: "OPEN_FILE"; file: FileId } & Timed)
  | ({ type: "TOGGLE_DIFF" } & Timed)
  | ({ type: "APPLY_PATCH" } & Timed)
  | ({ type: "DISMISS_PATCH" } & Timed)
  | ({ type: "EDIT_CODE"; code: string } & Timed)
  | ({ type: "COMMIT_EDITS" } & Timed)
  | ({ type: "START_TEST_RUN" } & Timed)
  | ({ type: "COMPLETE_TEST_RUN"; sessionId: string; run: number } & Timed)
  | ({ type: "SET_PANEL_TAB"; tab: PanelTab } & Timed)
  | ({ type: "OPEN_COMPREHENSION" } & Timed)
  | ({ type: "SUBMIT_COMPREHENSION"; answer: Answer; confidence: number } & Timed)
  | { type: "RETURN_TO_WORKSPACE" }
  | ({ type: "EXPORT_TRACE" } & Timed);

// The same actions before the clock is attached. Distributes over the union so
// each action keeps its own fields.
export type Untimed<A> = A extends { at: unknown } ? Omit<A, "at"> : A;

export const IMPLEMENTATION_PATH = FILE_PATHS["retry.ts"];

export function createIntroState(): SessionState {
  return {
    stage: "intro",
    sessionId: "",
    condition: "human-gated",
    startedAt: "",
    clockOrigin: 0,
    patchState: "ready",
    patchAppliedAt: null,
    activeFile: "retry.ts",
    implementationCode: INITIAL_CODE,
    panelTab: "assistant",
    diffOpen: false,
    testStatus: "idle",
    testResults: [],
    testSnapshot: null,
    cleared: null,
    runCount: 0,
    editorInputEvents: 0,
    uncommittedInputs: 0,
    comprehensionAnswer: null,
    confidence: null,
    events: [],
  };
}

function record(
  state: SessionState,
  at: Clock,
  type: TraceEventType,
  label: string,
  extra: { actor?: Actor; file?: string; detail?: TraceDetail } = {},
): SessionState {
  const previous = state.events.at(-1);
  const elapsed = Math.round((at.now - state.clockOrigin) * 10) / 10;
  const event: TraceEvent = {
    sequence: state.events.length + 1,
    type,
    label,
    // Clamp so the trace stays monotonic even if two actions share a frame.
    elapsedMs: Math.max(previous?.elapsedMs ?? 0, elapsed),
    timestamp: at.iso,
    ...extra,
  };

  return { ...state, events: [...state.events, event] };
}

function flushEdits(state: SessionState, at: Clock) {
  if (state.uncommittedInputs === 0) {
    return state;
  }

  const inputs = state.uncommittedInputs;

  return record(
    { ...state, uncommittedInputs: 0 },
    at,
    "code_edit_committed",
    `Editing paused · ${inputs} ${inputs === 1 ? "input" : "inputs"}`,
    { actor: "developer", file: IMPLEMENTATION_PATH, detail: { inputEvents: inputs } },
  );
}

// Results only describe the file they ran against. Any change to the file
// sends the runner back to idle and says why.
function invalidateResults(state: SessionState, reason: Exclude<ClearedReason, null>) {
  if (state.testStatus !== "complete") {
    return state;
  }

  return { ...state, testStatus: "idle" as const, testResults: [], cleared: reason };
}

export function startSession(condition: Condition, sessionId: string, at: Clock): SessionState {
  const meta = CONDITIONS[condition];
  let state: SessionState = {
    ...createIntroState(),
    stage: "workspace",
    sessionId,
    condition,
    startedAt: at.iso,
    clockOrigin: at.now,
  };

  state = record(state, at, "session_started", "Researcher demo started", {
    actor: "system",
    detail: { condition },
  });
  state = record(state, at, "condition_assigned", `${meta.name} condition loaded`, {
    actor: "system",
    detail: { condition, patchActor: meta.patchActor },
  });

  if (condition === "agent-applied") {
    // The manipulation: the patch is in the working file before the agent's
    // message exists, and nothing the developer does can stop it.
    state = record(
      {
        ...state,
        implementationCode: patchForCondition(condition),
        patchState: "applied",
        patchAppliedAt: 0,
      },
      at,
      "patch_applied",
      "Agent applied the AI patch",
      { actor: "agent", file: IMPLEMENTATION_PATH, detail: { patchId: PATCH_ID } },
    );
  }

  return state;
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "START_SESSION":
      return startSession(action.condition, action.sessionId, action.at);

    case "OPEN_FILE": {
      if (action.file === state.activeFile) {
        return state;
      }

      return record(
        { ...state, activeFile: action.file },
        action.at,
        "file_opened",
        `Opened ${FILE_PATHS[action.file]}`,
        { actor: "developer", file: FILE_PATHS[action.file] },
      );
    }

    case "TOGGLE_DIFF": {
      const diffOpen = !state.diffOpen;

      return record(
        { ...state, diffOpen },
        action.at,
        diffOpen ? "diff_viewed" : "diff_closed",
        diffOpen ? "AI patch diff viewed" : "AI patch diff closed",
        { actor: "developer", detail: { patchState: state.patchState } },
      );
    }

    case "APPLY_PATCH": {
      // Only the developer can apply, and only where the gate exists.
      if (state.condition !== "human-gated" || state.patchState === "applied") {
        return state;
      }

      const replacedEdits = state.implementationCode !== INITIAL_CODE;
      let next = flushEdits(state, action.at);

      next = invalidateResults(
        {
          ...next,
          implementationCode: patchForCondition(state.condition),
          patchState: "applied",
          patchAppliedAt: Math.max(0, action.at.now - state.clockOrigin),
          activeFile: "retry.ts",
        },
        "apply",
      );

      return record(next, action.at, "patch_applied", "Developer applied the AI patch", {
        actor: "developer",
        file: IMPLEMENTATION_PATH,
        detail: {
          patchId: PATCH_ID,
          afterDismissal: state.patchState === "dismissed",
          replacedManualEdits: replacedEdits,
        },
      });
    }

    case "DISMISS_PATCH": {
      if (state.condition !== "human-gated" || state.patchState !== "ready") {
        return state;
      }

      return record(
        { ...state, patchState: "dismissed" },
        action.at,
        "patch_dismissed",
        "Developer dismissed the AI patch",
        { actor: "developer", detail: { patchId: PATCH_ID } },
      );
    }

    case "EDIT_CODE": {
      if (action.code === state.implementationCode) {
        return state;
      }

      const isFirst = state.editorInputEvents === 0;
      let next: SessionState = {
        ...state,
        implementationCode: action.code,
        editorInputEvents: state.editorInputEvents + 1,
        uncommittedInputs: state.uncommittedInputs + 1,
      };

      next = invalidateResults(next, "edit");

      if (isFirst) {
        next = record(next, action.at, "code_edit_started", "Developer edited the working file", {
          actor: "developer",
          file: IMPLEMENTATION_PATH,
          detail: { patchState: state.patchState },
        });
      }

      return next;
    }

    case "COMMIT_EDITS":
      return flushEdits(state, action.at);

    case "START_TEST_RUN": {
      if (state.testStatus === "running") {
        return state;
      }

      const run = state.runCount + 1;

      return record(
        {
          ...flushEdits(state, action.at),
          testStatus: "running",
          testResults: [],
          testSnapshot: state.implementationCode,
          cleared: null,
          runCount: run,
        },
        action.at,
        "tests_run",
        "Test suite started",
        { actor: "developer", file: FILE_PATHS["retry.test.ts"], detail: { run } },
      );
    }

    case "COMPLETE_TEST_RUN": {
      // A run that belongs to an earlier session or run is dropped.
      if (
        action.sessionId !== state.sessionId ||
        action.run !== state.runCount ||
        state.testStatus !== "running" ||
        state.testSnapshot === null
      ) {
        return state;
      }

      const results = evaluate(state.testSnapshot);
      const { passed, total } = tally(results);
      const stale = state.implementationCode !== state.testSnapshot;
      const next: SessionState = stale
        ? { ...state, testStatus: "idle", testResults: [], cleared: "edit-during-run" }
        : { ...state, testStatus: "complete", testResults: results };

      return record(
        { ...next, testSnapshot: null },
        action.at,
        passed === total ? "tests_passed" : "tests_failed",
        passed === total ? "All tests passed" : `${passed} of ${total} tests passed`,
        { actor: "system", detail: { run: action.run, passed, total, stale } },
      );
    }

    case "SET_PANEL_TAB": {
      if (action.tab === state.panelTab) {
        return state;
      }

      const next = { ...state, panelTab: action.tab };

      return action.tab === "events"
        ? record(next, action.at, "instrumentation_viewed", "Events tab opened", { actor: "developer" })
        : next;
    }

    case "OPEN_COMPREHENSION":
      return record(
        { ...flushEdits(state, action.at), stage: "comprehension" },
        action.at,
        "comprehension_opened",
        "Comprehension check opened",
        { actor: "system" },
      );

    case "SUBMIT_COMPREHENSION": {
      const correct = isCorrectAnswer(state.condition, action.answer);

      return record(
        {
          ...state,
          stage: "summary",
          comprehensionAnswer: action.answer,
          confidence: action.confidence,
        },
        action.at,
        "comprehension_submitted",
        "Comprehension check submitted",
        {
          actor: "developer",
          detail: { answer: action.answer, correct, confidence: action.confidence },
        },
      );
    }

    case "RETURN_TO_WORKSPACE":
      return { ...state, stage: "workspace" };

    case "EXPORT_TRACE":
      return record(state, action.at, "trace_exported", "Trace exported as JSON", {
        actor: "developer",
        detail: { format: "json" },
      });
  }
}
