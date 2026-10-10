import { Check, CircleCheck, CircleX, FlaskConical, LoaderCircle, Play, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import styles from "../plurise.module.css";
import { TEST_CASES, tally, type TestResult } from "../lib/evaluator";
import { TEST_COMMAND } from "../lib/scenario";
import type { ClearedReason, TestStatus } from "../lib/session-state";
import { Kbd } from "./marks";
import { QUICK } from "./motion";

const CLEARED_COPY: Record<Exclude<ClearedReason, null>, string> = {
  edit: "The working file changed, so the last results were cleared.",
  apply: "The patch entered the working file, so the last results were cleared.",
  "edit-during-run": "The file changed during the run, so its results were discarded.",
};

export function TestRunner({
  status,
  results,
  runCount,
  cleared,
  shortcut,
  reducedMotion,
  onRun,
}: {
  status: TestStatus;
  results: TestResult[];
  runCount: number;
  cleared: ClearedReason;
  shortcut: string;
  reducedMotion: boolean;
  onRun: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const running = status === "running";

  // The first failure is the finding. Bring it into view once results land.
  useEffect(() => {
    if (status !== "complete") {
      return;
    }

    const failure = bodyRef.current?.querySelector<HTMLElement>('[data-state="fail"]');

    if (failure && bodyRef.current) {
      const body = bodyRef.current;
      const bottom = failure.offsetTop + failure.offsetHeight + 12;

      if (bottom > body.scrollTop + body.clientHeight) {
        body.scrollTo({ top: bottom - body.clientHeight, behavior: reducedMotion ? "auto" : "smooth" });
      }
    }
  }, [status, results, reducedMotion]);
  const { passed, total } = tally(results);
  const failed = total - passed;

  return (
    <section className={styles.runner} aria-labelledby="runner-title" aria-busy={running}>
      <div className={styles.runnerHead}>
        <h2 id="runner-title" className={styles.runnerTitle}>
          <FlaskConical aria-hidden="true" />
          Test runner
          <span
            className={styles.simulatedBadge}
            title="Deterministic checks against the working file. No code is executed."
          >
            Simulated
          </span>
        </h2>

        {status === "complete" ? (
          <p className={styles.runnerTally}>
            <span className={styles.tallyPass}>
              <Check aria-hidden="true" />
              {passed} passed
            </span>
            {failed > 0 ? (
              <span className={styles.tallyFail}>
                <X aria-hidden="true" />
                {failed} failed
              </span>
            ) : null}
          </p>
        ) : null}

        <button
          type="button"
          className={styles.runButton}
          onClick={onRun}
          disabled={running}
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {running ? (
            <LoaderCircle className={styles.spin} aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {/* The visible label changes; the accessible name stays "Run tests". */}
          <span aria-hidden="true">{running ? "Running…" : runCount > 0 ? "Run again" : "Run tests"}</span>
          <span className={styles.srOnly}>Run tests</span>
          <Kbd>{shortcut}</Kbd>
        </button>
      </div>

      <div ref={bodyRef} className={styles.runnerBody}>
        {status === "idle" ? (
          <div className={styles.runnerEmpty}>
            <p className={styles.runnerEmptyTitle}>{cleared ? "Results cleared" : "Suite ready"}</p>
            <p>{cleared ? CLEARED_COPY[cleared] : "Run 6 checks against the working file."}</p>
          </div>
        ) : (
          <>
            <p className={styles.command}>
              <span aria-hidden="true">$</span> {TEST_COMMAND}
              <span className={styles.commandMeta}>
                {running ? "running" : `run ${runCount} · ${passed}/${total} passed`}
              </span>
            </p>
            <ol className={styles.testList}>
              {TEST_CASES.map((test, index) => {
                const result = results.find((item) => item.id === test.id);

                return (
                  <li
                    key={test.id}
                    className={styles.testRow}
                    data-state={result ? (result.passed ? "pass" : "fail") : "pending"}
                  >
                    <div className={styles.testLine}>
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={result ? String(result.passed) : "pending"}
                          className={styles.testIcon}
                          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ ...QUICK, delay: reducedMotion ? 0 : index * 0.035 }}
                        >
                          {!result ? (
                            <LoaderCircle className={styles.spin} aria-hidden="true" />
                          ) : result.passed ? (
                            <CircleCheck aria-hidden="true" />
                          ) : (
                            <CircleX aria-hidden="true" />
                          )}
                        </motion.span>
                      </AnimatePresence>
                      <span className={styles.srOnly}>
                        {!result ? "Pending: " : result.passed ? "Passed: " : "Failed: "}
                      </span>
                      <span className={styles.testLabel}>{test.label}</span>
                      {result ? (
                        <span className={styles.testDuration}>{result.durationMs} ms</span>
                      ) : null}
                    </div>
                    {result?.detail ? (
                      <motion.p
                        className={styles.testDetail}
                        initial={reducedMotion ? false : { opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...QUICK, delay: reducedMotion ? 0 : 0.2 }}
                      >
                        {result.detail}
                      </motion.p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
