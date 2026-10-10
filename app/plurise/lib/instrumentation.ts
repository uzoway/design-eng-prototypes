import type { Condition } from "./scenario.ts";

export type Actor = "developer" | "agent" | "system";

export type TraceEventType =
  | "session_started"
  | "condition_assigned"
  | "patch_applied"
  | "patch_dismissed"
  | "diff_viewed"
  | "diff_closed"
  | "file_opened"
  | "code_edit_started"
  | "code_edit_committed"
  | "tests_run"
  | "tests_passed"
  | "tests_failed"
  | "instrumentation_viewed"
  | "comprehension_opened"
  | "comprehension_submitted"
  | "trace_exported";

export type TraceDetail = Record<string, string | number | boolean | null>;

export type TraceEvent = {
  sequence: number;
  type: TraceEventType;
  label: string;
  // Milliseconds since session start, from performance.now(). Never decreases.
  elapsedMs: number;
  // Wall clock, for export convenience only. Do not derive timing from it.
  timestamp: string;
  actor?: Actor;
  file?: string;
  detail?: TraceDetail;
};

export type Answer = "developer" | "agent" | "unsure";

// A moment on two clocks: monotonic for behaviour, wall for humans.
export type Clock = { now: number; iso: string };

export function readClock(): Clock {
  return { now: performance.now(), iso: new Date().toISOString() };
}

export function isCorrectAnswer(condition: Condition, answer: Answer) {
  return condition === "human-gated" ? answer === "developer" : answer === "agent";
}

export const ANSWER_LABELS: Record<Answer, string> = {
  developer: "I did, by choosing when to apply the patch",
  agent: "The AI agent did, immediately after generating it",
  unsure: "I am not sure",
};

const first = (events: TraceEvent[], type: TraceEventType) =>
  events.find((event) => event.type === type);

const last = (events: TraceEvent[], type: TraceEventType | TraceEventType[]) => {
  const types = Array.isArray(type) ? type : [type];

  return events.findLast((event) => types.includes(event.type));
};

// Compact verification steps in the order they happened. Repeats collapse so
// "Test → Test → Test" reads as one step with a count.
export type SequenceStep = { key: string; label: string; count: number };

function sequenceKey(event: TraceEvent): Omit<SequenceStep, "count"> | null {
  switch (event.type) {
    case "patch_applied":
      return event.actor === "agent"
        ? { key: "applied-agent", label: "Agent applied" }
        : { key: "applied-developer", label: "Applied" };
    case "patch_dismissed":
      return { key: "dismissed", label: "Dismissed" };
    case "diff_viewed":
      return { key: "diff", label: "Diff" };
    case "file_opened":
      return event.file?.endsWith(".test.ts") ? { key: "tests-file", label: "Read tests" } : null;
    // Every edit burst ends in a commit, so the commit stands for the burst.
    case "code_edit_committed":
      return { key: "edit", label: "Edit" };
    case "tests_passed":
    case "tests_failed":
      return {
        key: `run-${event.detail?.passed}`,
        label: `Tests ${event.detail?.passed}/${event.detail?.total}`,
      };
    default:
      return null;
  }
}

export function verificationSequence(events: TraceEvent[]) {
  const steps: SequenceStep[] = [];

  for (const event of events) {
    const step = sequenceKey(event);

    if (!step) {
      continue;
    }

    const previous = steps.at(-1);

    if (previous && previous.key === step.key) {
      // Pauses inside one stretch of editing are not separate steps.
      previous.count += step.key === "edit" ? 0 : 1;
    } else {
      steps.push({ ...step, count: 1 });
    }
  }

  return steps;
}

export type DerivedMetrics = {
  condition: Condition;
  patchActor: "developer" | "agent" | null;
  timeToFirstDiffMs: number | null;
  timeToFirstTestMs: number | null;
  runCount: number;
  diffViewedBeforeFirstTest: boolean | null;
  diffViewedBeforeApplication: boolean | null;
  manualEditOccurred: boolean;
  timeToFirstEditMs: number | null;
  finalPassedTests: number | null;
  finalTotalTests: number | null;
  comprehensionAnswer: Answer | null;
  comprehensionCorrect: boolean | null;
  confidence: number | null;
  eventCount: number;
  verificationSequence: string[];
};

// Everything here is read back from the event sequence, so the summary and the
// export can never disagree with the timeline.
export function deriveMetrics(condition: Condition, events: TraceEvent[]): DerivedMetrics {
  const firstDiff = first(events, "diff_viewed");
  const firstRun = first(events, "tests_run");
  const applied = first(events, "patch_applied");
  const firstEdit = first(events, "code_edit_started");
  const outcome = last(events, ["tests_passed", "tests_failed"]);
  const submitted = last(events, "comprehension_submitted");

  const before = (a: TraceEvent | undefined, b: TraceEvent | undefined) =>
    a !== undefined && (b === undefined || a.sequence < b.sequence);

  return {
    condition,
    patchActor: applied?.actor === "agent" || applied?.actor === "developer" ? applied.actor : null,
    timeToFirstDiffMs: firstDiff?.elapsedMs ?? null,
    timeToFirstTestMs: firstRun?.elapsedMs ?? null,
    runCount: events.filter((event) => event.type === "tests_run").length,
    diffViewedBeforeFirstTest: firstRun ? before(firstDiff, firstRun) : null,
    // Only meaningful when the developer held the gate. In the agent condition
    // the patch is in the file before anything can be viewed.
    diffViewedBeforeApplication:
      condition === "agent-applied" ? null : applied ? before(firstDiff, applied) : null,
    manualEditOccurred: firstEdit !== undefined,
    timeToFirstEditMs: firstEdit?.elapsedMs ?? null,
    finalPassedTests: typeof outcome?.detail?.passed === "number" ? outcome.detail.passed : null,
    finalTotalTests: typeof outcome?.detail?.total === "number" ? outcome.detail.total : null,
    comprehensionAnswer: (submitted?.detail?.answer as Answer | undefined) ?? null,
    comprehensionCorrect:
      typeof submitted?.detail?.correct === "boolean" ? submitted.detail.correct : null,
    confidence: typeof submitted?.detail?.confidence === "number" ? submitted.detail.confidence : null,
    eventCount: events.length,
    verificationSequence: verificationSequence(events).map((step) =>
      step.count > 1 ? `${step.label} ×${step.count}` : step.label,
    ),
  };
}

export function formatClock(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const tenths = Math.floor((ms % 1_000) / 100);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export function formatDuration(ms: number | null) {
  if (ms === null) {
    return "Not observed";
  }

  if (ms < 60_000) {
    return `${(ms / 1_000).toFixed(1)} s`;
  }

  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1_000)} s`;
}
