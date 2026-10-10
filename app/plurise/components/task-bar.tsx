import { CircleDashed, CircleDot } from "lucide-react";
import type { RefObject } from "react";
import styles from "../plurise.module.css";
import { TASK_ID, TASK_PROMPT, TASK_TITLE } from "../lib/scenario";

export function TaskBar({
  headingRef,
  changed,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  changed: boolean;
}) {
  return (
    <div className={styles.taskBar}>
      <div className={styles.taskCopy}>
        <p className={styles.taskId}>Task · {TASK_ID}</p>
        <h1 ref={headingRef} tabIndex={-1} className={styles.taskTitle}>
          {TASK_TITLE}
        </h1>
        <p className={styles.taskPrompt}>{TASK_PROMPT}</p>
      </div>

      <p className={styles.fileState} data-changed={changed || undefined} aria-live="off">
        {changed ? <CircleDot aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}
        {changed ? "Working file changed" : "Working file clean"}
      </p>
    </div>
  );
}
