import { memo } from "react";
import styles from "../plurise.module.css";
import type { DiffRow } from "../lib/diff";
import { highlight } from "../lib/highlight";

const SIGN = { add: "+", remove: "−", context: " " } as const;
const SR_PREFIX = { add: "Added: ", remove: "Removed: ", context: "" } as const;

export const DiffPreview = memo(function DiffPreview({
  id,
  file,
  rows,
  additions,
  deletions,
}: {
  id: string;
  file: string;
  rows: DiffRow[];
  additions: number;
  deletions: number;
}) {
  return (
    <div className={styles.diff} id={id}>
      <div className={styles.diffHead}>
        <span className={styles.diffFile}>{file}</span>
        <span className={styles.diffStats}>
          <span className={styles.diffAdd}>+{additions}</span>
          <span className={styles.diffDel}>−{deletions}</span>
        </span>
      </div>
      <div
        className={styles.diffScroller}
        tabIndex={0}
        role="region"
        aria-label={`Diff of ${file}: ${additions} lines added, ${deletions} removed`}
      >
        <div className={styles.diffRows}>
          {rows.map((row, index) => {
            if (row.kind === "hunk") {
              return (
                <div key={index} className={styles.diffHunk}>
                  {row.text}
                </div>
              );
            }

            const tokens = highlight(row.text)[0];

            return (
              <div key={index} className={styles.diffRow} data-kind={row.kind}>
                <span className={styles.diffNum} aria-hidden="true">
                  {row.oldLine ?? ""}
                </span>
                <span className={styles.diffNum} aria-hidden="true">
                  {row.newLine ?? ""}
                </span>
                <span className={styles.diffSign} aria-hidden="true">
                  {SIGN[row.kind]}
                </span>
                <code className={styles.diffCode}>
                  <span className={styles.srOnly}>{SR_PREFIX[row.kind]}</span>
                  {tokens.map((token, tokenIndex) => (
                    <span key={tokenIndex} className={styles[`tok_${token.kind}`]}>
                      {token.text}
                    </span>
                  ))}
                </code>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
