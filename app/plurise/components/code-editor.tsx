import { Lock } from "lucide-react";
import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import styles from "../plurise.module.css";
import { changedLines } from "../lib/diff";
import { highlight, type Token } from "../lib/highlight";
import {
  CANONICAL_AI_PATCH,
  FILE_PATHS,
  INITIAL_CODE,
  TEST_CODE,
  type FileId,
} from "../lib/scenario";
import { FileGlyph } from "./file-explorer";

const LINE_HEIGHT = 20;
const PAD_Y = 12;
const INDENT = "  ";
const PATCH_LINES = [...changedLines(INITIAL_CODE, CANONICAL_AI_PATCH)];

export const Highlighted = memo(function Highlighted({ lines }: { lines: Token[][] }) {
  return lines.map((tokens, index) => (
    <span key={index} className={styles.codeLine}>
      {tokens.map((token, tokenIndex) => (
        <span key={tokenIndex} className={styles[`tok_${token.kind}`]}>
          {token.text}
        </span>
      ))}
    </span>
  ));
});

function Gutter({
  count,
  activeLine,
  changed,
}: {
  count: number;
  activeLine: number | null;
  changed?: Set<number>;
}) {
  return (
    <div className={styles.gutter} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const line = index + 1;

        return (
          <span
            key={line}
            className={styles.gutterLine}
            data-active={line === activeLine || undefined}
            data-changed={changed?.has(line) || undefined}
          >
            {line}
          </span>
        );
      })}
    </div>
  );
}

// Inserts through the browser's editing pipeline so native undo keeps working.
function insert(textarea: HTMLTextAreaElement, text: string, start: number, end: number) {
  textarea.setSelectionRange(start, end);

  if (!document.execCommand?.("insertText", false, text)) {
    textarea.setRangeText(text, start, end, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function caretPosition(value: string, offset: number) {
  const before = value.slice(0, offset);
  const line = before.split("\n").length;
  const column = offset - before.lastIndexOf("\n");

  return { line, column };
}

type FileTab = { file: FileId; modified: boolean };

function EditorTabs({
  tabs,
  activeFile,
  onOpen,
}: {
  tabs: FileTab[];
  activeFile: FileId;
  onOpen: (file: FileId) => void;
}) {
  return (
    <div className={styles.editorTabs} role="tablist" aria-label="Open files">
      {tabs.map(({ file, modified }) => {
        const active = file === activeFile;

        return (
          <button
            key={file}
            type="button"
            role="tab"
            id={`tab-${file}`}
            aria-selected={active}
            aria-controls={`pane-${file}`}
            tabIndex={active ? 0 : -1}
            className={styles.editorTab}
            onClick={() => onOpen(file)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                const step = event.key === "ArrowRight" ? 1 : -1;
                const index = tabs.findIndex((tab) => tab.file === file);
                const next = tabs[(index + step + tabs.length) % tabs.length];

                onOpen(next.file);
                document.getElementById(`tab-${next.file}`)?.focus();
              }
            }}
          >
            <FileGlyph file={file} />
            {file}
            {file === "retry.test.ts" ? (
              <>
                <Lock className={styles.tabLock} aria-hidden="true" />
                <span className={styles.srOnly}>, read-only</span>
              </>
            ) : modified ? (
              <span className={styles.tabModified}>
                <span aria-hidden="true">M</span>
                <span className={styles.srOnly}>, modified</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function CodeEditor({
  activeFile,
  code,
  patchAppliedAt,
  reducedMotion,
  onOpen,
  onChange,
}: {
  activeFile: FileId;
  code: string;
  patchAppliedAt: number | null;
  reducedMotion: boolean;
  onOpen: (file: FileId) => void;
  onChange: (code: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const charWidthRef = useRef(7.5);
  const measureRef = useRef<HTMLSpanElement>(null);
  const tabEscapes = useRef(false);
  const [caret, setCaret] = useState({ line: 1, column: 1 });
  const [focused, setFocused] = useState(false);
  const [escapeHint, setEscapeHint] = useState(false);

  const lines = useMemo(() => highlight(code), [code]);
  const testLines = useMemo(() => highlight(TEST_CODE), []);
  const changed = useMemo(() => changedLines(INITIAL_CODE, code), [code]);
  const modified = code !== INITIAL_CODE;

  // Lines the patch rewrote flash once when it lands, so the moment the file
  // changes is visible in both conditions. Keyed by when the patch landed.
  const flashLines = patchAppliedAt === null ? [] : PATCH_LINES;

  useLayoutEffect(() => {
    if (measureRef.current) {
      charWidthRef.current = measureRef.current.getBoundingClientRect().width / 10;
    }
  }, []);

  // Keep the caret on screen. The textarea never scrolls itself; the shared
  // scroller does, so line numbers and highlighting stay in lockstep.
  const syncCaret = useCallback(() => {
    const textarea = textareaRef.current;
    const scroller = scrollerRef.current;

    if (!textarea || !scroller) {
      return;
    }

    const position = caretPosition(textarea.value, textarea.selectionEnd);

    setCaret((current) =>
      current.line === position.line && current.column === position.column ? current : position,
    );

    const top = PAD_Y + (position.line - 1) * LINE_HEIGHT;

    if (top < scroller.scrollTop) {
      scroller.scrollTop = top - LINE_HEIGHT;
    } else if (top + LINE_HEIGHT * 2 > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTop = top + LINE_HEIGHT * 2 - scroller.clientHeight;
    }

    const gutter = scroller.querySelector<HTMLElement>("[data-gutter]")?.offsetWidth ?? 48;
    const x = gutter + 16 + (position.column - 1) * charWidthRef.current;

    if (x < scroller.scrollLeft + gutter + 8) {
      scroller.scrollLeft = Math.max(0, x - gutter - 48);
    } else if (x > scroller.scrollLeft + scroller.clientWidth - 24) {
      scroller.scrollLeft = x - scroller.clientWidth + 64;
    }
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = textarea;

    if (event.key === "Escape") {
      tabEscapes.current = true;
      setEscapeHint(true);
      return;
    }

    if (event.key === "Tab" && !event.altKey && !event.metaKey && !event.ctrlKey) {
      // After Escape, Tab leaves the editor like any other field.
      if (tabEscapes.current) {
        tabEscapes.current = false;
        setEscapeHint(false);
        return;
      }

      event.preventDefault();

      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const multiline = value.slice(start, end).includes("\n");

      if (!event.shiftKey && !multiline) {
        insert(textarea, INDENT, start, end);
        return;
      }

      // Indent or outdent every selected line.
      const block = value.slice(lineStart, end);
      const next = event.shiftKey
        ? block.replace(/^ {1,2}/gm, "")
        : block.replace(/^/gm, INDENT);

      insert(textarea, next, lineStart, end);
      textarea.setSelectionRange(
        multiline ? lineStart : Math.max(lineStart, start + (next.length - block.length)),
        lineStart + next.length,
      );
      return;
    }

    tabEscapes.current = false;

    if (escapeHint) {
      setEscapeHint(false);
    }

    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      // Carry indentation over, one step deeper after an opening bracket.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const line = value.slice(lineStart, start);
      const indent = /^\s*/.exec(line)?.[0] ?? "";
      const opens = /[{([]\s*$/.test(line);

      event.preventDefault();
      insert(textarea, "\n" + indent + (opens ? INDENT : ""), start, end);
    }
  };

  const activeLine = focused ? caret.line : null;
  const isTest = activeFile === "retry.test.ts";

  return (
    <div className={styles.editor}>
      <EditorTabs
        tabs={[
          { file: "retry.ts", modified },
          { file: "retry.test.ts", modified: false },
        ]}
        activeFile={activeFile}
        onOpen={onOpen}
      />

      {/* Both panes stay mounted so the editor keeps its undo history. */}
      <div
        id="pane-retry.ts"
        role="tabpanel"
        aria-labelledby="tab-retry.ts"
        className={styles.editorPane}
        hidden={isTest}
      >
        <div ref={scrollerRef} className={styles.editorScroller}>
          <div className={styles.editorCanvas}>
            <div data-gutter="" className={styles.gutterWrap}>
              <Gutter count={lines.length} activeLine={activeLine} changed={changed} />
            </div>
            <div className={styles.codeLayer}>
              {activeLine !== null ? (
                <span
                  className={styles.activeLine}
                  style={{ transform: `translateY(${(activeLine - 1) * LINE_HEIGHT}px)` }}
                  aria-hidden="true"
                />
              ) : null}
              {!reducedMotion && flashLines.length > 0 ? (
                <span key={patchAppliedAt} className={styles.flashLayer} aria-hidden="true">
                  {flashLines.map((line) => (
                    <span
                      key={line}
                      className={styles.flashLine}
                      style={{ top: PAD_Y + (line - 1) * LINE_HEIGHT }}
                    />
                  ))}
                </span>
              ) : null}
              <pre className={styles.codeHighlight} aria-hidden="true">
                <Highlighted lines={lines} />
              </pre>
              <textarea
                ref={textareaRef}
                className={styles.codeInput}
                value={code}
                aria-label={`${FILE_PATHS["retry.ts"]}, editable. Press Escape then Tab to leave the editor.`}
                aria-describedby="editor-status"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                wrap="off"
                data-gramm="false"
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                  onChange(event.target.value);
                  requestAnimationFrame(syncCaret);
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={syncCaret}
                onSelect={syncCaret}
                onClick={syncCaret}
                onFocus={() => {
                  setFocused(true);
                  syncCaret();
                }}
                onBlur={() => {
                  setFocused(false);
                  setEscapeHint(false);
                  tabEscapes.current = false;
                }}
              />
            </div>
          </div>
        </div>
        <span ref={measureRef} className={styles.measure} aria-hidden="true">
          0000000000
        </span>
      </div>

      <div
        id="pane-retry.test.ts"
        role="tabpanel"
        aria-labelledby="tab-retry.test.ts"
        className={styles.editorPane}
        hidden={!isTest}
      >
        <div
          className={styles.editorScroller}
          data-readonly=""
          tabIndex={0}
          role="region"
          aria-label={`${FILE_PATHS["retry.test.ts"]}, read-only`}
        >
          <div className={styles.editorCanvas}>
            <div className={styles.gutterWrap}>
              <Gutter count={testLines.length} activeLine={null} />
            </div>
            <div className={styles.codeLayer}>
              <pre className={styles.codeHighlight}>
                <Highlighted lines={testLines} />
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.statusBar} id="editor-status">
        <span className={styles.statusLead}>
          {isTest ? (
            <span className={styles.readOnlyChip}>
              <Lock aria-hidden="true" />
              Read-only
            </span>
          ) : escapeHint ? (
            <span className={styles.statusHint}>Tab now moves focus out of the editor</span>
          ) : focused ? (
            <span className={styles.statusHint}>Esc then Tab to leave the editor</span>
          ) : null}
        </span>
        <span className={styles.statusMeta}>
          {isTest ? null : (
            <span className={styles.tabular}>
              Ln {caret.line}, Col {caret.column}
            </span>
          )}
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>TypeScript</span>
        </span>
      </div>
    </div>
  );
}
