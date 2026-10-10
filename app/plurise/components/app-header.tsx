import { Check, RotateCcw, ShieldCheck } from "lucide-react";
import styles from "../plurise.module.css";
import { CONDITIONS, type Condition } from "../lib/scenario";
import { Brand } from "./marks";

const ORDER: Condition[] = ["human-gated", "agent-applied"];

export function AppHeader({
  condition,
  onSwitch,
  onReset,
  onFinish,
}: {
  condition: Condition;
  onSwitch: (condition: Condition) => void;
  onReset: () => void;
  onFinish: () => void;
}) {
  return (
    <>
      <header className={styles.appHeader}>
        <div className={styles.headerLead}>
          <Brand />
          <span className={styles.headerDivider} aria-hidden="true" />
          <span className={styles.headerStudy}>Retry control study</span>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.segmented} role="group" aria-label="Condition">
            {ORDER.map((option) => {
              const active = option === condition;

              return (
                <button
                  key={option}
                  type="button"
                  className={styles.segment}
                  aria-pressed={active}
                  // Pressing the active condition does nothing; Reset restarts it.
                  onClick={() => !active && onSwitch(option)}
                >
                  <span className={styles.segmentCheck} aria-hidden="true">
                    {active ? <Check /> : null}
                  </span>
                  {CONDITIONS[option].shortName}
                </button>
              );
            })}
          </div>

          <button type="button" className={styles.ghostButton} onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            <span className={styles.resetLabel}>Reset</span>
            <span className={styles.srOnly}> session</span>
          </button>

          <button type="button" className={styles.finishButton} onClick={onFinish}>
            Finish session
          </button>
        </div>
      </header>

      <p className={styles.noticeBar}>
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>Researcher demo</strong> — actions are instrumented locally; no participant
          data are collected or transmitted.
        </span>
      </p>
    </>
  );
}
