import { ArrowRight, FileCode, GitCompare, ListChecks, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import type { RefObject } from "react";
import styles from "../plurise.module.css";
import { CONDITIONS, type Condition } from "../lib/scenario";
import { Brand } from "./marks";
import { SPRING } from "./motion";

const ORDER: Condition[] = ["human-gated", "agent-applied"];

// The whole manipulation in three nodes: who stands between the patch and
// the file. Condition A puts the developer in the path; B puts them after it.
function BoundaryFlow({ condition }: { condition: Condition }) {
  const developer = (
    <span className={styles.flowNode} data-role="developer" data-gate={condition === "human-gated" || undefined}>
      You
    </span>
  );
  const file = (
    <span className={styles.flowNode} data-role="file">
      retry.ts
    </span>
  );

  return (
    <span className={styles.flow} aria-hidden="true">
      <span className={styles.flowNode} data-role="agent">
        Agent
      </span>
      <span className={styles.flowEdge} />
      {condition === "human-gated" ? developer : file}
      <span className={styles.flowEdge} />
      {condition === "human-gated" ? file : developer}
    </span>
  );
}

export function Intro({
  headingRef,
  reducedMotion,
  onStart,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  reducedMotion: boolean;
  onStart: (condition: Condition) => void;
}) {
  return (
    <div className={styles.introStage}>
      <motion.section
        className={styles.introCard}
        aria-labelledby="intro-title"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <div className={styles.introTop}>
          <Brand />
          <span className={styles.badge}>Researcher demo · V1</span>
        </div>

        <div className={styles.introBody}>
          <p className={styles.eyebrow}>Control transfer in AI-assisted programming</p>
          <h1 id="intro-title" ref={headingRef} tabIndex={-1} className={styles.introTitle}>
            <span>Same task. Same patch.</span> <span>One changed boundary.</span>
          </h1>
          <p className={styles.introLead}>
            Explore how verification behaviour may change when control over code application
            moves from the developer to an AI coding agent.
          </p>

          <ul className={styles.invariants} aria-label="Held constant across conditions">
            <li>
              <FileCode aria-hidden="true" />
              One retry task
            </li>
            <li>
              <GitCompare aria-hidden="true" />
              One fixed patch
            </li>
            <li>
              <ListChecks aria-hidden="true" />
              Local trace
            </li>
          </ul>

          <h2 className={styles.conditionPrompt}>Choose a condition to demonstrate</h2>
          <div className={styles.conditionGrid}>
            {ORDER.map((condition) => {
              const meta = CONDITIONS[condition];

              return (
                <button
                  key={condition}
                  type="button"
                  className={styles.conditionCard}
                  onClick={() => onStart(condition)}
                >
                  <span className={styles.conditionHead}>
                    <span className={styles.conditionLetter}>Condition {meta.letter}</span>
                    <ArrowRight className={styles.conditionArrow} aria-hidden="true" />
                  </span>
                  <span className={styles.conditionName}>{meta.name}</span>
                  <span className={styles.conditionText}>{meta.description}</span>
                  <BoundaryFlow condition={condition} />
                </button>
              );
            })}
          </div>
        </div>

        <p className={styles.introFoot}>
          <ShieldCheck aria-hidden="true" />
          Concept research prototype. No participant data are collected or transmitted.
        </p>
      </motion.section>
    </div>
  );
}
