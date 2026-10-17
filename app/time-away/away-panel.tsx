"use client";

import { motion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { plural, rangeSummary, reasonFor, SUGGESTIONS } from "./calendar";
import { InfoIcon, SmileyIcon, XIcon } from "./octicons";

export type PanelState = {
  mode: "create" | "edit";
  start: number;
  end: number;
  rangeId?: string;
  initialText: string;
  /** Where the panel sits, and the point it grows from (the selection's centre). */
  position: { left: number; top: number; width: number; originX: number };
  /** Said when part of the range already has commits, which stay green. */
  note: string | null;
  /** Typing straight away suits a keyboard; on touch it would cover the suggestions. */
  focusInput: boolean;
};

export const MAX_REASON_LENGTH = 80;

const EASE_OUT: [number, number, number, number] = [0.33, 1, 0.68, 1];

const ARROW_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * "Mark as away": an anchored panel in the family of GitHub's "Edit status"
 * dialog. One field, the same pill suggestions, a character count, and
 * Primer's compact overlay footer.
 */
export function AwayPanel({
  state,
  reducedMotion,
  onCancel,
  onSubmit,
  onRemove,
}: {
  state: PanelState;
  reducedMotion: boolean;
  onCancel: () => void;
  onSubmit: (text: string) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(state.initialText);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const titleId = useId();
  const summaryId = useId();
  const inputId = useId();
  const captionId = useId();

  const trimmed = text.trim();
  const reason = reasonFor(text);
  const checked = trimmed ? SUGGESTIONS.findIndex((item) => item.label === reason.label) : -1;
  const tabStop = checked === -1 ? 0 : checked;
  const editing = state.mode === "edit";
  const remaining = MAX_REASON_LENGTH - text.length;

  useEffect(() => {
    if (state.focusInput) inputRef.current?.focus();
    else panelRef.current?.focus();
    // Focus once, when the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The suggestions are one radio group: Tab lands on it once, arrows choose. */
  const onChipKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = SUGGESTIONS.length;
    let next: number | null = null;

    if (event.key in ARROW_STEP) next = (index + ARROW_STEP[event.key] + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;

    if (next === null) return;

    event.preventDefault();
    setText(SUGGESTIONS[next].label);
    chipRefs.current[next]?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();

      return;
    }

    if (event.key !== "Tab") return;

    // Keep focus inside while the panel is open.
    const focusable = [
      ...panelRef.current!.querySelectorAll<HTMLElement>("button, input"),
    ].filter((element) => element.tabIndex >= 0);
    const first = focusable[0];
    const last = focusable.at(-1)!;

    if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // The whole field is a click target, like a native input.
  const onFieldPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("input, button")) return;

    event.preventDefault();
    inputRef.current?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(text);
  };

  const { left, top, width, originX } = state.position;

  return (
    <motion.div
      ref={panelRef}
      className="ta-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={summaryId}
      tabIndex={-1}
      style={{ left, top, width, transformOrigin: `${originX}px 0px` }}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.98, transition: { duration: 0.12, ease: [0.32, 0, 0.67, 0] } }
      }
      transition={{ duration: 0.2, ease: EASE_OUT }}
      onKeyDown={onKeyDown}
    >
      <form onSubmit={submit}>
        <div className="ta-overlay-header">
          <div className="ta-overlay-heading">
            <h2 id={titleId} className="ta-overlay-title">
              {editing ? "Edit time away" : "Mark as away"}
            </h2>
            <p id={summaryId} className="ta-overlay-summary">
              {rangeSummary(state.start, state.end)}
            </p>
          </div>
          <button type="button" className="ta-icon-button" aria-label="Close" onClick={onCancel}>
            <XIcon />
          </button>
        </div>

        <div className="ta-overlay-body">
          <label className="ta-field-label" htmlFor={inputId}>
            What were you up to?
          </label>
          <div className="ta-input" onPointerDown={onFieldPointerDown}>
            <span className="ta-input-visual" aria-hidden="true">
              {trimmed ? reason.emoji : <SmileyIcon />}
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={text}
              maxLength={MAX_REASON_LENGTH}
              placeholder="Pick one below or write your own"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              aria-describedby={captionId}
              onChange={(event) => setText(event.target.value)}
            />
            {text ? (
              <button
                type="button"
                className="ta-icon-button ta-input-clear"
                aria-label="Clear"
                onClick={() => {
                  setText("");
                  inputRef.current?.focus();
                }}
              >
                <XIcon />
              </button>
            ) : null}
          </div>
          <p id={captionId} className="ta-caption">
            {plural(remaining, "character")} remaining
          </p>

          <div className="ta-chips" role="radiogroup" aria-label="Suggestions">
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={suggestion.label}
                ref={(element) => {
                  chipRefs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={index === checked}
                tabIndex={index === tabStop ? 0 : -1}
                className="ta-chip"
                onClick={() => setText(suggestion.label)}
                onKeyDown={(event) => onChipKeyDown(event, index)}
              >
                <span className="ta-chip-emoji" aria-hidden="true">
                  {suggestion.emoji}
                </span>
                {suggestion.label}
              </button>
            ))}
          </div>

          {state.note ? (
            <p className="ta-note">
              <InfoIcon />
              {state.note}
            </p>
          ) : null}
        </div>

        <div className="ta-overlay-footer">
          {editing ? (
            <button type="button" className="ta-btn ta-btn-danger" onClick={onRemove}>
              Remove
            </button>
          ) : null}
          <span className="ta-spacer" />
          <button type="button" className="ta-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="ta-btn ta-btn-primary">
            {editing ? "Save" : "Mark as away"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
