import { ChevronDown, FlaskConical, FolderOpen } from "lucide-react";
import styles from "../plurise.module.css";
import type { FileId } from "../lib/scenario";

export function TsIcon() {
  return (
    <span className={styles.tsIcon} aria-hidden="true">
      TS
    </span>
  );
}

export function FileGlyph({ file }: { file: FileId }) {
  return file === "retry.ts" ? (
    <TsIcon />
  ) : (
    <FlaskConical className={styles.testFileIcon} aria-hidden="true" />
  );
}

const FILES: FileId[] = ["retry.ts", "retry.test.ts"];

export function FileExplorer({
  activeFile,
  modified,
  onOpen,
}: {
  activeFile: FileId;
  modified: boolean;
  onOpen: (file: FileId) => void;
}) {
  return (
    <nav className={styles.explorer} aria-label="Project files">
      <div className={styles.explorerHead}>
        <span>Explorer</span>
        <span className={styles.explorerCount} aria-label="2 files">
          2
        </span>
      </div>

      <div className={styles.tree}>
        <div className={styles.treeFolder} data-depth="0">
          <ChevronDown aria-hidden="true" />
          <FolderOpen aria-hidden="true" />
          async-client
        </div>
        <div className={styles.treeFolder} data-depth="1">
          <ChevronDown aria-hidden="true" />
          <FolderOpen aria-hidden="true" />
          src
        </div>
        <ul className={styles.treeFiles}>
          {FILES.map((file) => {
            const isModified = file === "retry.ts" && modified;

            return (
              <li key={file}>
                <button
                  type="button"
                  className={styles.treeFile}
                  aria-current={file === activeFile ? "true" : undefined}
                  onClick={() => onOpen(file)}
                >
                  <FileGlyph file={file} />
                  <span className={styles.treeFileName}>{file}</span>
                  {isModified ? (
                    <span className={styles.gitBadge} title="Modified">
                      <span aria-hidden="true">M</span>
                      <span className={styles.srOnly}>, modified</span>
                    </span>
                  ) : file === "retry.test.ts" ? (
                    <span className={styles.srOnly}>, read-only</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.explorerFoot}>
        <span>
          <span className={styles.tsDot} aria-hidden="true" />
          TypeScript
        </span>
        <span>Local sandbox</span>
      </div>
    </nav>
  );
}
