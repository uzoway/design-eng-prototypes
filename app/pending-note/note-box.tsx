"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useIsPresent,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  counterAnnouncement,
  isEditable,
  saveBlock,
  WINDOW_CLOSED,
  windowLine,
  type Invite,
  type Span,
} from "./data";
import { ErrorIcon } from "./icons";

/** Strong ease-out: quick to react, soft to land. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const HEIGHT = { duration: 0.2, ease: EASE_OUT };
/** Footers come in once the box has started to move, never before it. */
const FOOT_IN = { duration: 0.18, delay: 0.07, ease: EASE_OUT };
const FOOT_OUT = { duration: 0.09, ease: "easeOut" } as const;
const FADE = { duration: 0.15, ease: "easeOut" } as const;
/** Lines shown before "show more". */
const CLAMP_LINES = 2;

export type Flash = { serial: number; spans: Span[]; delay: number };

export type NoteBoxProps = {
  variant: "desktop" | "phone";
  invite: Invite & { note: string };
  now: number;
  limit: number;
  reduced: boolean;
  /** Inline editing (desktop only). */
  editing?: boolean;
  draft?: string;
  closedError?: boolean;
  flash?: Flash | null;
  /** Start open (the phone's Pending sheet shows the whole note). */
  defaultExpanded?: boolean;
  /** Goes up to ask the box to open (the phone does this as its editor rises). */
  expandSerial?: number;
  /** Goes up to put focus back on Edit after a save or cancel. */
  focusSerial?: number;
  onEdit: (button: HTMLButtonElement) => void;
  onDraft?: (text: string) => void;
  onCancel?: () => void;
  onSave?: () => void;
  onCopy?: () => void;
  copied?: boolean;
};

/**
 * The note under a Sent row, or in the profile's Pending dialog: LinkedIn's
 * box, two lines and "…show more", plus Edit while the window is open. On the
 * desktop, Edit turns the same box into the editor in place: a textarea laid
 * exactly over the text, so the words don't move.
 */
export function NoteBox(props: NoteBoxProps) {
  const { variant, invite, now, limit, reduced, editing = false, draft = "", closedError = false } = props;
  const note = invite.note;
  const editable = isEditable(invite, now);
  const phone = variant === "phone";

  const [expanded, setExpanded] = useState(props.defaultExpanded ?? false);
  const [collapsing, setCollapsing] = useState(false);
  /** How much of the note fits in two lines with "…show more"; null when it all fits. */
  const [cut, setCut] = useState<number | null>(null);
  const [measured, setMeasured] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const lineHeight = useRef(15);

  const open = expanded || editing || collapsing;
  const truncated = !open && cut !== null;
  const ellipsisGap = phone ? "" : " ";

  /* ---------------------------------------------------------------------- */
  /* Truncation: the most whole words that fit in two lines with the link.  */
  /* ---------------------------------------------------------------------- */

  const measure = useCallback(() => {
    const probe = measureRef.current;

    if (!probe) return;

    probe.textContent = "x";
    const line = probe.getBoundingClientRect().height || 15;

    lineHeight.current = line;

    const max = line * CLAMP_LINES + 1;

    probe.textContent = note;

    if (probe.getBoundingClientRect().height <= max) {
      probe.textContent = "";
      setCut(null);
      setMeasured(true);

      return;
    }

    const boundaries = Array.from(note.matchAll(/\s+/g), (match) => match.index);
    let low = 0;
    let high = boundaries.length - 1;
    let best = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const end = boundaries[mid];

      probe.textContent = `${note.slice(0, end)}…${ellipsisGap}show more`;

      if (probe.getBoundingClientRect().height <= max) {
        best = end;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    probe.textContent = "";
    setCut(best);
    setMeasured(true);
  }, [note, ellipsisGap]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  /* ---------------------------------------------------------------------- */
  /* Heights: the text and the footer each tween their own height, so the   */
  /* footer rides the text's edge and nothing ever overlaps.                */
  /* ---------------------------------------------------------------------- */

  const textHeight = useMotionValue(-1);
  const footHeight = useMotionValue(-1);
  const textStyle = useTransform(textHeight, (h) => (h < 0 ? "auto" : h));
  const footStyle = useTransform(footHeight, (h) => (h < 0 ? "auto" : h));
  const armedUntil = useRef(0);
  const textTween = useRef<{ stop: () => void } | null>(null);

  /** The next size change within a moment is the result of a click, so it moves; anything else (typing, resizing) jumps. */
  const arm = useCallback(() => {
    armedUntil.current = performance.now() + 120;
  }, []);

  const settle = useCallback(
    (value: MotionValue<number>, target: number, tween: RefObject<{ stop: () => void } | null> | null) => {
      const armed = performance.now() < armedUntil.current;

      if (!armed || reduced || value.get() < 0) {
        tween?.current?.stop();
        value.jump(target);

        return;
      }

      const controls = animate(value, target, HEIGHT);

      if (tween) tween.current = controls;
    },
    [reduced],
  );

  const collapsingRef = useRef(false);

  useEffect(() => {
    collapsingRef.current = collapsing;
  }, [collapsing]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const foot = footRef.current;

    if (!body || !foot) return;

    let lastWidth = body.offsetWidth;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;

        if (target === body) {
          // A new width re-wraps the note, so the cut moves too.
          if (body.offsetWidth !== lastWidth) {
            lastWidth = body.offsetWidth;
            measure();
          }

          if (!collapsingRef.current) settle(textHeight, body.offsetHeight, textTween);
        } else {
          settle(footHeight, target.offsetHeight, null);
        }
      }
    });

    observer.observe(body);
    observer.observe(foot);

    return () => observer.disconnect();
  }, [measure, settle, textHeight, footHeight]);

  /* ---------------------------------------------------------------------- */
  /* Expand, collapse                                                       */
  /* ---------------------------------------------------------------------- */

  const expand = useCallback(() => {
    arm();
    setCollapsing(false);
    setExpanded(true);
  }, [arm]);

  const collapse = () => {
    if (reduced) {
      arm();
      setExpanded(false);

      return;
    }

    // The full text stays while the box closes over it; it's cut back to two lines once it's there.
    arm();
    setCollapsing(true);
    collapsingRef.current = true;
    textTween.current?.stop();
    textTween.current = animate(textHeight, lineHeight.current * CLAMP_LINES, {
      ...HEIGHT,
      onComplete: () => {
        collapsingRef.current = false;
        setCollapsing(false);
        setExpanded(false);
      },
    });
  };

  // The editor always shows the whole note, and it stays open afterwards.
  const [wasEditing, setWasEditing] = useState(editing);

  if (editing !== wasEditing) {
    setWasEditing(editing);
    if (editing) {
      setCollapsing(false);
      setExpanded(true);
    }
  }

  // The phone opens the note under its editor, so it's already open when the editor goes.
  const { expandSerial = 0 } = props;
  const [seenExpand, setSeenExpand] = useState(expandSerial);

  if (expandSerial !== seenExpand) {
    setSeenExpand(expandSerial);
    setCollapsing(false);
    setExpanded(true);
  }

  // Entering or leaving the editor, saving, or the window closing: the size change that follows moves.
  const editKey = `${editing}:${closedError}:${editable}:${note}`;
  const lastEditKey = useRef(editKey);

  useLayoutEffect(() => {
    if (lastEditKey.current === editKey) return;

    lastEditKey.current = editKey;
    if (editing) {
      textTween.current?.stop();
      collapsingRef.current = false;
    }
    arm();
  }, [editKey, editing, arm]);

  const lastExpandSerial = useRef(expandSerial);

  useLayoutEffect(() => {
    if (expandSerial === lastExpandSerial.current) return;

    lastExpandSerial.current = expandSerial;
    textTween.current?.stop();
    collapsingRef.current = false;
    armedUntil.current = 0;
  }, [expandSerial]);

  /* ---------------------------------------------------------------------- */
  /* Focus                                                                  */
  /* ---------------------------------------------------------------------- */

  useLayoutEffect(() => {
    if (!editing) return;

    const input = inputRef.current;

    if (!input || document.activeElement === input) return;

    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }, [editing]);

  const { focusSerial = 0 } = props;
  const lastFocusSerial = useRef(focusSerial);

  useEffect(() => {
    if (focusSerial === lastFocusSerial.current) return;

    lastFocusSerial.current = focusSerial;
    editRef.current?.focus({ preventScroll: true });
  }, [focusSerial]);

  /* ---------------------------------------------------------------------- */
  /* The changed-word highlight                                             */
  /* ---------------------------------------------------------------------- */

  const { flash = null } = props;
  const [rects, setRects] = useState<{ serial: number; boxes: DOMRect[] } | null>(null);
  const flashOpacity = useMotionValue(0);

  useLayoutEffect(() => {
    if (!flash || editing) return;

    const text = textRef.current;
    const body = bodyRef.current;
    const node = text?.firstChild;

    if (!text || !body || !node || node.nodeType !== Node.TEXT_NODE) return;

    const origin = body.getBoundingClientRect();
    const boxes: DOMRect[] = [];

    for (const span of flash.spans) {
      const range = document.createRange();

      range.setStart(node, Math.min(span.start, node.textContent?.length ?? 0));
      range.setEnd(node, Math.min(span.end, node.textContent?.length ?? 0));

      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width < 1) continue;

        boxes.push(new DOMRect(rect.left - origin.left, rect.top - origin.top, rect.width, rect.height));
      }
    }

    setRects({ serial: flash.serial, boxes });
    // Only a new save draws a new highlight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash?.serial, editing]);

  useEffect(() => {
    if (!rects) return;

    flashOpacity.jump(0);

    if (reduced) {
      const show = window.setTimeout(() => flashOpacity.jump(1), (flash?.delay ?? 0) * 1000);
      const hide = window.setTimeout(() => flashOpacity.jump(0), ((flash?.delay ?? 0) + 1.6) * 1000);

      return () => {
        window.clearTimeout(show);
        window.clearTimeout(hide);
      };
    }

    // In over 150ms, hold for 0.6s, then fade over a second.
    const controls = animate(flashOpacity, [0, 1, 1, 0], {
      duration: 1.75,
      times: [0, 0.15 / 1.75, 0.75 / 1.75, 1],
      ease: ["easeOut", "linear", "easeInOut"],
      delay: flash?.delay ?? 0,
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rects?.serial]);

  /* ---------------------------------------------------------------------- */
  /* Editing                                                                */
  /* ---------------------------------------------------------------------- */

  const block = saveBlock(note, draft, limit);
  const canSave = editing && !closedError && block === null;
  const over = draft.length > limit;
  const lineId = useId();
  // Quiet except at 20 left, at the limit and over it.
  const spoken = editing ? counterAnnouncement(draft.length, limit) : "";

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onCancel?.();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (canSave) props.onSave?.();
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  const edited = Boolean(invite.editedAt);
  const showLess = !editing && (expanded || collapsing) && cut !== null && !collapsing;
  const hasReadFoot = !editing && (editable || edited || showLess);
  const foot: "read" | "edit" | null = editing ? "edit" : hasReadFoot ? "read" : null;
  const name = invite.name;

  let body: ReactNode;

  if (editing) {
    body = (
      <>
        {/* The mirror sizes the box; the textarea sits exactly on top of it. */}
        <p data-pn-note-text data-pn-note-mirror aria-hidden="true">
          {`${draft}​`}
        </p>
        <textarea
          ref={inputRef}
          data-pn-note-input
          value={draft}
          aria-label={`Note to ${name}`}
          aria-describedby={lineId}
          aria-invalid={over || undefined}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => props.onDraft?.(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </>
    );
  } else if (truncated) {
    body = (
      <p data-pn-note-text>
        <span aria-hidden="true">{`${note.slice(0, cut ?? note.length)}…${ellipsisGap}`}</span>
        <span className="pn-sr-only">{note}</span>
        <button
          type="button"
          data-pn-more
          aria-expanded="false"
          aria-label={`Show all of your note to ${name}`}
          onClick={expand}
        >
          show more
        </button>
      </p>
    );
  } else {
    body = (
      <>
        <p ref={textRef} data-pn-note-text>
          {note}
        </p>
        {rects && rects.boxes.length > 0 && (
          <motion.span data-pn-flash-layer aria-hidden="true" style={{ opacity: flashOpacity }}>
            {rects.boxes.map((box, index) => (
              <span
                key={index}
                data-pn-flash
                style={{ left: box.x - 2, top: box.y - 1, width: box.width + 4, height: box.height + 2 }}
              />
            ))}
          </motion.span>
        )}
      </>
    );
  }

  return (
    <div
      data-pn-note
      data-variant={variant}
      data-editing={editing || undefined}
      data-measured={measured || undefined}
    >
      <motion.div data-pn-note-clip style={{ height: textStyle }}>
        <div ref={bodyRef} data-pn-note-body>
          {body}
          <p ref={measureRef} data-pn-note-text data-pn-note-probe aria-hidden="true" />
        </div>
      </motion.div>

      <motion.div data-pn-foot-clip style={{ height: footStyle }}>
        <div ref={footRef}>
          <AnimatePresence initial={false}>
            {foot === "read" && (
              <Foot key="read" kind="read" reduced={reduced}>
                <AnimatePresence initial={false}>
                  {showLess && (
                    <motion.span
                      key="less"
                      data-pn-foot-group
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={reduced ? { duration: 0 } : FADE}
                    >
                      <button
                        type="button"
                        data-pn-text-button
                        aria-expanded="true"
                        aria-label={`Show less of your note to ${name}`}
                        onClick={collapse}
                      >
                        show less
                      </button>
                      {(edited || editable) && <Sep />}
                    </motion.span>
                  )}
                </AnimatePresence>
                {edited && (
                  <span data-pn-foot-group>
                    <span data-pn-edited>Edited</span>
                    {editable && <Sep />}
                  </span>
                )}
                <AnimatePresence initial={false}>
                  {editable && (
                    <motion.span
                      key="edit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={reduced ? { duration: 0 } : FADE}
                    >
                      <button
                        ref={editRef}
                        type="button"
                        data-pn-text-button
                        data-strong
                        aria-label={`Edit note to ${name}`}
                        onClick={(event) => props.onEdit(event.currentTarget)}
                      >
                        Edit
                      </button>
                    </motion.span>
                  )}
                </AnimatePresence>
              </Foot>
            )}

            {foot === "edit" && (
              <Foot key="edit" kind="edit" reduced={reduced}>
                {closedError ? (
                  <p data-pn-window data-error id={lineId} role="alert">
                    <ErrorIcon />
                    <span>{WINDOW_CLOSED}</span>
                  </p>
                ) : (
                  <p data-pn-window id={lineId}>
                    {windowLine(invite, now)}
                  </p>
                )}
                <div data-pn-actions>
                  <span data-pn-counter data-over={over || undefined} aria-hidden="true">
                    {draft.length}/{limit}
                  </span>
                  {closedError && (
                    <button type="button" data-pn-button="secondary" onClick={props.onCopy}>
                      {props.copied ? "Copied" : "Copy text"}
                    </button>
                  )}
                  <button type="button" data-pn-button="secondary" onClick={props.onCancel}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    data-pn-button="primary"
                    disabled={!canSave}
                    onClick={() => {
                      if (canSave) props.onSave?.();
                    }}
                  >
                    Save
                  </button>
                </div>
                <span className="pn-sr-only" role="status" aria-live="polite">
                  {spoken}
                </span>
              </Foot>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function Sep() {
  return (
    <span data-pn-foot-sep aria-hidden="true">
      {" · "}
    </span>
  );
}

function Foot({ kind, reduced, children }: { kind: "read" | "edit"; reduced: boolean; children: ReactNode }) {
  const present = useIsPresent();

  return (
    <motion.div
      data-pn-foot={kind}
      data-leaving={present ? undefined : ""}
      initial={{ opacity: 0, y: kind === "edit" ? 4 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: reduced ? { duration: 0 } : FOOT_OUT }}
      transition={reduced ? { duration: 0 } : FOOT_IN}
    >
      {children}
    </motion.div>
  );
}
