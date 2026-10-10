"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import styles from "./plurise.module.css";
import { AppHeader } from "./components/app-header";
import { AssistantPanel } from "./components/assistant-panel";
import { CodeEditor } from "./components/code-editor";
import { ComprehensionCheck } from "./components/comprehension-check";
import { FileExplorer } from "./components/file-explorer";
import { Intro } from "./components/intro";
import { QUICK } from "./components/motion";
import { SessionSummary } from "./components/session-summary";
import { TaskBar } from "./components/task-bar";
import { TestRunner } from "./components/test-runner";
import { buildTrace, downloadTrace } from "./lib/export-trace";
import { readClock, type Answer } from "./lib/instrumentation";
import { INITIAL_CODE, type Condition } from "./lib/scenario";
import {
  createIntroState,
  sessionReducer,
  type SessionAction,
  type SessionState,
  type Untimed,
} from "./lib/session-state";

type Draft = { answer: Answer | null; confidence: number | null };

const EMPTY_DRAFT: Draft = { answer: null, confidence: null };
const RUN_MS = 700;
const RUN_MS_REDUCED = 120;
const EDIT_COMMIT_MS = 900;

function newSessionId() {
  try {
    return crypto.randomUUID();
  } catch {
    // randomUUID needs a secure context; plain-HTTP LAN previews fall back.
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// The platform never changes mid-session; this only keeps hydration honest.
const subscribeToNothing = () => () => {};
const readShortcut = () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘↵" : "Ctrl ↵");

// Announcements for the stable polite live region. Keyed off the trace, so
// whatever the trace records, a screen reader hears.
function announcementFor(state: SessionState) {
  const event = state.events.at(-1);

  switch (event?.type) {
    case "patch_applied":
      return event.actor === "agent"
        ? "The agent applied the patch to src/retry.ts."
        : "Patch applied to src/retry.ts.";
    case "patch_dismissed":
      return "Patch dismissed. The working file is unchanged.";
    case "tests_run":
      return "Running 6 tests.";
    case "tests_passed":
      return "Test run complete. All 6 tests passed.";
    case "tests_failed":
      return event.detail?.stale
        ? "Test run finished, but the file changed during the run. Results discarded."
        : `Test run complete. ${event.detail?.passed} of ${event.detail?.total} tests passed.`;
    default:
      return null;
  }
}

// Mounted inside each stage, after its content, so the stage's heading ref is
// attached by the time this runs. AnimatePresence "wait" mounts the new stage
// only after the old one leaves, which is exactly when focus should move.
function FocusOnMount({ target }: { target: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    target.current?.focus();
  }, [target]);

  return null;
}

export default function PluriseLab() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createIntroState);
  const reducedMotion = Boolean(useReducedMotion());
  const [announcement, setAnnouncement] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [exportError, setExportError] = useState(false);
  const shortcut = useSyncExternalStore(subscribeToNothing, readShortcut, () => "⌘↵");
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Focus moves on stage changes the person caused, never on first load.
  const [hasStarted, setHasStarted] = useState(false);
  const runTimer = useRef<number | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  const act = useCallback((action: Untimed<SessionAction>) => {
    dispatch({ ...action, at: readClock() } as SessionAction);
  }, []);

  const announce = useCallback((message: string) => {
    // Clear first so the same sentence twice is still read twice.
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 60);
  }, []);

  const lastEventSequence = state.events.at(-1)?.sequence;

  useEffect(() => {
    const message = announcementFor(stateRef.current);

    if (message && stateRef.current.stage === "workspace") {
      announce(message);
    }
  }, [lastEventSequence, state.sessionId, announce]);

  const clearRunTimer = () => {
    if (runTimer.current !== null) {
      window.clearTimeout(runTimer.current);
      runTimer.current = null;
    }
  };

  const startSession = useCallback(
    (condition: Condition) => {
      clearRunTimer();
      setHasStarted(true);
      setDraft(EMPTY_DRAFT);
      setExportError(false);
      act({ type: "START_SESSION", condition, sessionId: newSessionId() });
    },
    [act],
  );

  const runTests = useCallback(() => {
    const current = stateRef.current;

    if (current.stage !== "workspace" || current.testStatus === "running") {
      return;
    }

    act({ type: "START_TEST_RUN" });

    const run = current.runCount + 1;
    const sessionId = current.sessionId;

    clearRunTimer();
    runTimer.current = window.setTimeout(
      () => act({ type: "COMPLETE_TEST_RUN", sessionId, run }),
      reducedMotion ? RUN_MS_REDUCED : RUN_MS,
    );
  }, [act, reducedMotion]);

  // ⌘↵ / Ctrl+↵ runs the suite from anywhere in the workspace, editor included.
  useEffect(() => {
    if (state.stage !== "workspace") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        runTests();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.stage, runTests]);

  // Edits are logged as bursts: one event after typing settles, never per key.
  useEffect(() => {
    if (state.uncommittedInputs === 0) {
      return;
    }

    const timer = window.setTimeout(() => act({ type: "COMMIT_EDITS" }), EDIT_COMMIT_MS);
    return () => window.clearTimeout(timer);
  }, [state.uncommittedInputs, act]);

  useEffect(() => () => clearRunTimer(), []);

  const exportTrace = () => {
    const at = readClock();
    const action = { type: "EXPORT_TRACE", at } as const;
    // The exported file should include its own trace_exported event, so the
    // next state is computed here and handed to both the download and React.
    const next = sessionReducer(stateRef.current, action);

    dispatch(action);

    try {
      downloadTrace(buildTrace(next), at.iso);
      setExportError(false);
    } catch {
      setExportError(true);
    }
  };

  const copyTrace = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildTrace(stateRef.current), null, 2));
      announce("Trace JSON copied to the clipboard.");
    } catch {
      announce("Copy failed. Your browser blocked clipboard access.");
    }
  };

  const { stage } = state;

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage}
            className={styles.stage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={QUICK}
          >
            {stage === "intro" ? (
              <Intro headingRef={headingRef} reducedMotion={reducedMotion} onStart={startSession} />
            ) : null}

            {stage === "workspace" ? (
              <div className={styles.app}>
                <AppHeader
                  condition={state.condition}
                  onSwitch={startSession}
                  onReset={() => startSession(state.condition)}
                  onFinish={() => act({ type: "OPEN_COMPREHENSION" })}
                />

                <div className={styles.workspace}>
                  <FileExplorer
                    activeFile={state.activeFile}
                    modified={state.implementationCode !== INITIAL_CODE}
                    onOpen={(file) => act({ type: "OPEN_FILE", file })}
                  />

                  <div className={styles.workbench}>
                    <TaskBar headingRef={headingRef} changed={state.implementationCode !== INITIAL_CODE} />
                    <CodeEditor
                      key={state.sessionId}
                      activeFile={state.activeFile}
                      code={state.implementationCode}
                      patchAppliedAt={state.patchAppliedAt}
                      reducedMotion={reducedMotion}
                      onOpen={(file) => act({ type: "OPEN_FILE", file })}
                      onChange={(code) => act({ type: "EDIT_CODE", code })}
                    />
                    <TestRunner
                      status={state.testStatus}
                      results={state.testResults}
                      runCount={state.runCount}
                      cleared={state.cleared}
                      shortcut={shortcut}
                      reducedMotion={reducedMotion}
                      onRun={runTests}
                    />
                  </div>

                  <AssistantPanel
                    sessionId={state.sessionId}
                    condition={state.condition}
                    patchState={state.patchState}
                    diffOpen={state.diffOpen}
                    hasManualEdits={
                      state.patchState !== "applied" && state.implementationCode !== INITIAL_CODE
                    }
                    tab={state.panelTab}
                    events={state.events}
                    reducedMotion={reducedMotion}
                    onTab={(tab) => act({ type: "SET_PANEL_TAB", tab })}
                    onToggleDiff={() => act({ type: "TOGGLE_DIFF" })}
                    onApply={() => act({ type: "APPLY_PATCH" })}
                    onDismiss={() => act({ type: "DISMISS_PATCH" })}
                  />
                </div>
              </div>
            ) : null}

            {stage === "comprehension" ? (
              <ComprehensionCheck
                headingRef={headingRef}
                condition={state.condition}
                answer={draft.answer}
                confidence={draft.confidence}
                reducedMotion={reducedMotion}
                onAnswer={(answer) => setDraft((current) => ({ ...current, answer }))}
                onConfidence={(confidence) => setDraft((current) => ({ ...current, confidence }))}
                onBack={() => act({ type: "RETURN_TO_WORKSPACE" })}
                onSubmit={(answer, confidence) =>
                  act({ type: "SUBMIT_COMPREHENSION", answer, confidence })
                }
              />
            ) : null}

            {stage === "summary" ? (
              <SessionSummary
                headingRef={headingRef}
                condition={state.condition}
                events={state.events}
                editorInputEvents={state.editorInputEvents}
                exportError={exportError}
                reducedMotion={reducedMotion}
                onWorkspace={() => act({ type: "RETURN_TO_WORKSPACE" })}
                onExport={exportTrace}
                onCopy={copyTrace}
                onRestart={() => startSession(state.condition)}
              />
            ) : null}

            {hasStarted ? <FocusOnMount target={headingRef} /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
