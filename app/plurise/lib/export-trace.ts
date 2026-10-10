import { deriveMetrics, type Answer, type TraceEvent } from "./instrumentation.ts";
import {
  PATCH_ID,
  PROTOTYPE_NAME,
  SCHEMA_VERSION,
  TASK_ID,
  type Condition,
} from "./scenario.ts";
import type { SessionState } from "./session-state.ts";

export type SessionTrace = {
  schemaVersion: typeof SCHEMA_VERSION;
  prototype: typeof PROTOTYPE_NAME;
  sessionId: string;
  condition: Condition;
  taskId: typeof TASK_ID;
  patchId: typeof PATCH_ID;
  localOnly: true;
  startedAt: string;
  instrument: {
    clock: "performance.now() relative to session start";
    confidenceScale: "1 (not confident) to 5 (very confident)";
    confidenceDefault: null;
    sourceCodeIncluded: false;
  };
  summary: {
    runCount: number;
    editorInputEvents: number;
    finalPassedTests: number | null;
    finalTotalTests: number | null;
    comprehensionAnswer: Answer | null;
    comprehensionCorrect: boolean | null;
    confidence: number | null;
    patchActor: "developer" | "agent" | null;
    timeToFirstDiffMs: number | null;
    timeToFirstTestMs: number | null;
    timeToFirstEditMs: number | null;
    diffViewedBeforeFirstTest: boolean | null;
    diffViewedBeforeApplication: boolean | null;
    manualEditOccurred: boolean;
    eventCount: number;
    verificationSequence: string[];
  };
  events: TraceEvent[];
};

// Built only from the event log and two counters. Editor contents never enter
// the trace, so they can never leave the tab.
export function buildTrace(session: SessionState): SessionTrace {
  const metrics = deriveMetrics(session.condition, session.events);

  return {
    schemaVersion: SCHEMA_VERSION,
    prototype: PROTOTYPE_NAME,
    sessionId: session.sessionId,
    condition: session.condition,
    taskId: TASK_ID,
    patchId: PATCH_ID,
    localOnly: true,
    startedAt: session.startedAt,
    instrument: {
      clock: "performance.now() relative to session start",
      confidenceScale: "1 (not confident) to 5 (very confident)",
      confidenceDefault: null,
      sourceCodeIncluded: false,
    },
    summary: {
      runCount: metrics.runCount,
      editorInputEvents: session.editorInputEvents,
      finalPassedTests: metrics.finalPassedTests,
      finalTotalTests: metrics.finalTotalTests,
      comprehensionAnswer: metrics.comprehensionAnswer,
      comprehensionCorrect: metrics.comprehensionCorrect,
      confidence: metrics.confidence,
      patchActor: metrics.patchActor,
      timeToFirstDiffMs: metrics.timeToFirstDiffMs,
      timeToFirstTestMs: metrics.timeToFirstTestMs,
      timeToFirstEditMs: metrics.timeToFirstEditMs,
      diffViewedBeforeFirstTest: metrics.diffViewedBeforeFirstTest,
      diffViewedBeforeApplication: metrics.diffViewedBeforeApplication,
      manualEditOccurred: metrics.manualEditOccurred,
      eventCount: metrics.eventCount,
      verificationSequence: metrics.verificationSequence,
    },
    events: session.events,
  };
}

// Colons are not allowed in filenames on macOS Finder or Windows, so the
// timestamp uses hyphens in the time part.
export function traceFilename(condition: Condition, iso: string) {
  return `plurise-${condition}-trace-${iso.replace(/:/g, "-")}.json`;
}

export function downloadTrace(trace: SessionTrace, iso: string) {
  const blob = new Blob([JSON.stringify(trace, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = traceFilename(trace.condition, iso);
  document.body.append(link);
  link.click();
  link.remove();
  // Give Safari a beat to start the download before the URL goes away.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
