import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Copy,
  Download,
  Info,
  RotateCcw,
} from "lucide-react";
import { motion } from "motion/react";
import type { RefObject } from "react";
import styles from "../plurise.module.css";
import {
  ANSWER_LABELS,
  deriveMetrics,
  formatClock,
  formatDuration,
  verificationSequence,
  type TraceEvent,
} from "../lib/instrumentation";
import { CONDITIONS, type Condition } from "../lib/scenario";
import { Brand } from "./marks";
import { SPRING } from "./motion";

const COVERAGE = [
  "Condition assignment and patch state",
  "Diff views, editor changes, and navigation",
  "Test timing, frequency, and outcome",
  "Comprehension and confidence response",
];

const yesNo = (value: boolean) => (value ? "Yes" : "No");

export function SessionSummary({
  headingRef,
  condition,
  events,
  editorInputEvents,
  exportError,
  reducedMotion,
  onWorkspace,
  onExport,
  onCopy,
  onRestart,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  condition: Condition;
  events: TraceEvent[];
  editorInputEvents: number;
  exportError: boolean;
  reducedMotion: boolean;
  onWorkspace: () => void;
  onExport: () => void;
  onCopy: () => void;
  onRestart: () => void;
}) {
  const meta = CONDITIONS[condition];
  const metrics = deriveMetrics(condition, events);
  const steps = verificationSequence(events);
  const diffBeforeTest = metrics.diffViewedBeforeFirstTest ?? metrics.timeToFirstDiffMs !== null;

  const cards = [
    {
      label: "Application control",
      value: meta.actorLabel,
      support:
        metrics.patchActor === null
          ? `Condition ${meta.letter} · patch never applied`
          : `Condition ${meta.letter}`,
    },
    {
      label: "Time to first test",
      value: formatDuration(metrics.timeToFirstTestMs),
      support: `${metrics.runCount} test ${metrics.runCount === 1 ? "run" : "runs"}`,
    },
    {
      label: "Diff before first test",
      value: diffBeforeTest ? "Viewed" : "Not viewed",
      support: `${editorInputEvents} editor input ${editorInputEvents === 1 ? "event" : "events"}`,
    },
    {
      label: "Final test outcome",
      value:
        metrics.finalPassedTests === null
          ? "Not run"
          : `${metrics.finalPassedTests}/${metrics.finalTotalTests} passed`,
      support: metrics.confidence === null ? "No confidence rating" : `Confidence ${metrics.confidence} / 5`,
      tone:
        metrics.finalPassedTests === null
          ? undefined
          : metrics.finalPassedTests === metrics.finalTotalTests
            ? "pass"
            : "fail",
    },
  ];

  const measures: [string, string][] = [
    ["Time to first diff view", formatDuration(metrics.timeToFirstDiffMs)],
    [
      "Diff viewed before application",
      condition === "agent-applied"
        ? "Not applicable, applied at start"
        : metrics.diffViewedBeforeApplication === null
          ? "Patch not applied"
          : yesNo(metrics.diffViewedBeforeApplication),
    ],
    ["Manual editing", yesNo(metrics.manualEditOccurred)],
    ["Time to first manual edit", formatDuration(metrics.timeToFirstEditMs)],
    ["Test runs", String(metrics.runCount)],
    ["Events captured", String(metrics.eventCount)],
  ];

  const correct = metrics.comprehensionCorrect;
  const enter = (step: number) =>
    reducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { ...SPRING, delay: step * 0.05 },
        };

  return (
    <div className={styles.summaryStage}>
      <div className={styles.summaryTop}>
        <Brand />
        <div className={styles.summaryActions}>
          <button type="button" className={styles.secondaryButton} onClick={onWorkspace}>
            <ArrowLeft aria-hidden="true" />
            Workspace
          </button>
          <button type="button" className={styles.primaryButton} onClick={onExport}>
            <Download aria-hidden="true" />
            Export JSON
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onRestart}>
            <RotateCcw aria-hidden="true" />
            Restart
          </button>
        </div>
      </div>

      {exportError ? (
        <div className={styles.exportError} role="alert">
          <CircleAlert aria-hidden="true" />
          <p>The download could not start in this browser. The trace is still here.</p>
          <button type="button" className={styles.secondaryButton} onClick={onCopy}>
            <Copy aria-hidden="true" />
            Copy JSON
          </button>
        </div>
      ) : null}

      <div className={styles.summaryIntro}>
        <p className={styles.eyebrow}>
          {meta.name} · Condition {meta.letter}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className={styles.summaryTitle}>
          Session summary
        </h1>
        <p className={styles.summaryLead}>
          A local behavioural trace for the {meta.name.toLowerCase()} demonstration.
        </p>
      </div>

      <p className={styles.caveat}>
        <Info aria-hidden="true" />
        <span>
          <strong>Demo data only.</strong> This trace demonstrates the proposed instrument. It is
          not participant data and should not be interpreted as study evidence.
        </span>
      </p>

      <ul className={styles.metrics}>
        {cards.map((card, index) => (
          <motion.li key={card.label} className={styles.metric} {...enter(index)}>
            <span className={styles.metricLabel}>{card.label}</span>
            <span className={styles.metricValue} data-tone={card.tone}>
              {card.value}
            </span>
            <span className={styles.metricSupport}>{card.support}</span>
          </motion.li>
        ))}
      </ul>

      <div className={styles.summaryGrid}>
        <section className={styles.summarySection} aria-labelledby="timeline-title">
          <h2 id="timeline-title" className={styles.sectionTitle}>
            Interaction timeline
            <span className={styles.sectionCount}>{events.length} events</span>
          </h2>
          <ol className={styles.timeline}>
            {events.map((event) => (
              <li key={event.sequence} className={styles.timelineItem} data-actor={event.actor}>
                <span className={styles.timelineTime}>{formatClock(event.elapsedMs)}</span>
                <span className={styles.timelineDot} aria-hidden="true" />
                <span className={styles.timelineText}>
                  <span className={styles.timelineLabel}>{event.label}</span>
                  <span className={styles.timelineType}>
                    {event.type}
                    {event.actor ? ` · ${event.actor}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className={styles.summarySide}>
          <section
            className={styles.summarySection}
            data-result={correct === null ? undefined : correct ? "pass" : "fail"}
            aria-labelledby="check-result-title"
          >
            <h2 id="check-result-title" className={styles.sectionTitle}>
              Manipulation check
            </h2>
            {correct === null ? (
              <p className={styles.sectionText}>Not answered.</p>
            ) : (
              <div className={styles.checkResult}>
                {correct ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                <div>
                  <p className={styles.checkResultTitle}>
                    {correct ? "Condition understood" : "Condition not understood"}
                  </p>
                  <p className={styles.sectionText}>
                    {correct
                      ? "Response was consistent with the condition."
                      : "Response was not consistent with the condition."}
                  </p>
                  {metrics.comprehensionAnswer ? (
                    <p className={styles.checkQuote}>“{ANSWER_LABELS[metrics.comprehensionAnswer]}”</p>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <section className={styles.summarySection} aria-labelledby="sequence-title">
            <h2 id="sequence-title" className={styles.sectionTitle}>
              Verification sequence
            </h2>
            {steps.length === 0 ? (
              <p className={styles.sectionText}>No verification steps recorded.</p>
            ) : (
              <ol className={styles.sequence}>
                {steps.map((step, index) => (
                  <li key={index} className={styles.sequenceStep}>
                    {index > 0 ? <ArrowRight className={styles.sequenceArrow} aria-hidden="true" /> : null}
                    <span className={styles.sequenceChip} data-key={step.key}>
                      {step.label}
                      {step.count > 1 ? <span className={styles.sequenceCount}>×{step.count}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={styles.summarySection} aria-labelledby="measures-title">
            <h2 id="measures-title" className={styles.sectionTitle}>
              Derived measures
            </h2>
            <dl className={styles.measures}>
              {measures.map(([term, value]) => (
                <div key={term} className={styles.measureRow}>
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.summarySection} aria-labelledby="coverage-title">
            <h2 id="coverage-title" className={styles.sectionTitle}>
              Instrumentation coverage
            </h2>
            <ul className={styles.coverage}>
              {COVERAGE.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
