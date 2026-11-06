"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { capNote, cleanNote, noteLength, shortSubjectOf, socialLine } from "./asking";
import { LIBRARY, LIBRARY_TEAM, NOTE_LIMIT, REASONS, type ReasonId } from "./data";
import { MoreIcon } from "./icons";
import { detachList, detachSubject, type Detached } from "./scene";

export type Ask = { recordId: number; items: Detached[]; shown: boolean };

type Box = { left: number; top: number; width: number; height: number };

const WIDTH = 280;
const GAP = 12;
const EDGE = 8;
/** Tall enough for the note and the explanation, so the popover never grows off screen. */
const TALLEST = 360;
/** The toolbar and the toast live below this line. */
const FLOOR = 84;
/** The size pill under a selection. */
const PILL = 28;

const EASE: [number, number, number, number] = [0.2, 0, 0, 1];
const NOTE_SPRING = { type: "spring" as const, stiffness: 157.91, damping: 25.13 };

/** The subject can carry 24 characters before the title wraps. */
const SUBJECT_MAX = 24;
const COUNT_FROM = 20;

/**
 * Beside the layer, top-right of its bounds. Near the edges it flips left,
 * then below or above; near the bottom it grows upward from the layer's
 * bottom edge. The side is chosen from TALLEST so it doesn't jump while the
 * note opens; the measured height then keeps it inside the canvas, even if
 * that means covering part of a tall selection.
 */
function place(anchor: Box, canvas: { width: number; height: number }, height: number) {
  const placement = side(anchor, canvas);
  const style = placement.style;
  const room = canvas.height - EDGE - height;

  if ("bottom" in style) style.bottom = Math.max(EDGE, Math.min(style.bottom, room));
  else style.top = Math.max(EDGE, Math.min(style.top, room));

  return placement;
}

function side(
  anchor: Box,
  canvas: { width: number; height: number },
): { style: { left: number; top: number } | { left: number; bottom: number }; origin: string } {
  const right = anchor.left + anchor.width + GAP;
  const left = anchor.left - GAP - WIDTH;
  const floor = canvas.height - FLOOR;

  if (right + WIDTH <= canvas.width - EDGE || left >= EDGE) {
    const side = right + WIDTH <= canvas.width - EDGE ? "right" : "left";
    const x = side === "right" ? right : left;
    const originX = side === "right" ? "0%" : "100%";

    if (anchor.top + TALLEST <= floor) {
      return { style: { left: x, top: Math.max(EDGE, anchor.top) }, origin: `${originX} 0%` };
    }

    const bottom = Math.min(anchor.top + anchor.height, floor);

    return { style: { left: x, bottom: canvas.height - Math.max(bottom, EDGE + 160) }, origin: `${originX} 100%` };
  }

  // No room beside it: below the size pill if that fits, otherwise above the layer.
  const x = Math.min(Math.max(anchor.left + anchor.width - WIDTH, EDGE), canvas.width - WIDTH - EDGE);
  const originX = `${anchor.left + anchor.width / 2 - x}px`;
  const below = anchor.top + anchor.height + PILL;

  if (below + TALLEST <= floor) return { style: { left: x, top: below }, origin: `${originX} 0%` };

  return {
    style: { left: x, bottom: canvas.height - Math.max(anchor.top - GAP, EDGE + 160) },
    origin: `${originX} 100%`,
  };
}

type DetachPopoverProps = {
  ask: Ask | null;
  anchor: Box | null;
  bounds: { width: number; height: number } | null;
  reducedMotion: boolean;
  onSend: (reason: ReasonId, note: string) => void;
  onSkip: () => void;
  onDontAskToday: () => void;
};

export function DetachPopover({ ask, anchor, bounds, reducedMotion, onSend, onSkip, onDontAskToday }: DetachPopoverProps) {
  const [height, setHeight] = useState(0);
  const visible = ask && anchor && bounds;
  const placement = visible ? place(anchor, bounds, height) : null;

  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    // offsetHeight ignores the entrance scale, so this is the settled height.
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight));

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && placement && (
        <motion.div
          key="popover"
          ref={measure}
          className="fd-popover-position"
          data-canvas-ui
          style={{ ...placement.style, transformOrigin: placement.origin }}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px) scale(0.98)" }}
          animate={
            reducedMotion
              ? { opacity: 1, transition: { duration: 0.12, ease: EASE } }
              : { opacity: 1, transform: "translateY(0px) scale(1)", transition: { duration: 0.16, ease: EASE } }
          }
          exit={
            reducedMotion
              ? { opacity: 0, transition: { duration: 0.12, ease: EASE } }
              : { opacity: 0, transform: "translateY(0px) scale(0.98)", transition: { duration: 0.12, ease: EASE } }
          }
        >
          {/* Keyed by the detach: a second detach swaps the content without replaying the entrance. */}
          <PopoverBody
            key={ask.recordId}
            items={ask.items}
            reducedMotion={reducedMotion}
            onSend={onSend}
            onSkip={onSkip}
            onDontAskToday={onDontAskToday}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------------ */

type PopoverBodyProps = Omit<DetachPopoverProps, "ask" | "anchor" | "bounds"> & { items: Detached[] };

function PopoverBody({ items, reducedMotion, onSend, onSkip, onDontAskToday }: PopoverBodyProps) {
  const [reason, setReason] = useState<ReasonId | null>(null);
  const [focused, setFocused] = useState(0);
  const [note, setNote] = useState("");
  const [why, setWhy] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const noteRef = useRef<HTMLInputElement>(null);
  /* A number key or a click goes on to the note; arrows stay in the list. */
  const toNoteRef = useRef(false);
  const leavingRef = useRef(false);

  const titleId = useId();
  const subtitleId = useId();
  const socialId = useId();
  const whyId = useId();
  const countId = useId();

  const subject = detachSubject(items);
  const shortSubject = shortSubjectOf(items, SUBJECT_MAX);
  const names = detachList(items);
  const social = socialLine(items);
  const remaining = NOTE_LIMIT - noteLength(note);
  const exploring = reason === "exploring";

  // Focus lands on the first reason, whether the detach came from the menu or ⌥⌘B.
  useEffect(() => {
    chipRefs.current[0]?.focus({ preventScroll: true });
  }, []);

  function pick(index: number, toNote = false) {
    setReason(REASONS[index].id);
    setFocused(index);
    toNoteRef.current = toNote && REASONS[index].id !== "exploring";

    if (toNoteRef.current && noteRef.current) noteRef.current.focus({ preventScroll: true });
    else chipRefs.current[index]?.focus();
  }

  // The note mounts after the first pick, so focus follows once it exists.
  useEffect(() => {
    if (!toNoteRef.current) return;

    noteRef.current?.focus({ preventScroll: true });
    toNoteRef.current = false;
  }, [reason]);

  function send() {
    if (!reason) return;

    onSend(reason, exploring ? "" : cleanNote(note, NOTE_LIMIT));
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    // The overflow menu handles its own keys, Escape included.
    if (overflowOpen) return;

    const inNote = (event.target as HTMLElement).tagName === "INPUT";

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onSkip();
      return;
    }

    if (inNote) {
      // Enter or ⌘Enter sends from the note.
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        send();
      }
      return;
    }

    // 1–5 pick a reason straight away.
    const digit = Number(event.key);

    if (!event.metaKey && !event.ctrlKey && !event.altKey && digit >= 1 && digit <= REASONS.length) {
      event.preventDefault();
      pick(digit - 1, true);
    }
  }

  function onChipKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const count = REASONS.length;
    let next: number | null = null;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = (index + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      case " ":
        event.preventDefault();
        pick(index);
        return;
      case "Enter":
        event.preventDefault();
        // The first Enter picks the reason under focus; with one picked, Enter sends.
        if (reason) send();
        else pick(index);
        return;
      default:
        return;
    }

    event.preventDefault();
    pick(next);
  }

  const tabStop = reason ? REASONS.findIndex((entry) => entry.id === reason) : focused;

  return (
    <div
      className="fd-popover"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={[subtitleId, names.length > 0 ? `${subtitleId}-names` : "", social ? socialId : ""]
        .filter(Boolean)
        .join(" ")}
      onKeyDown={onKeyDown}
    >
      <div className="fd-popover-head">
        <h2 className="fd-popover-title" id={titleId}>
          <span aria-hidden={shortSubject !== subject ? "true" : undefined}>You detached {shortSubject}</span>
          {shortSubject !== subject && (
            <>
              <span className="fd-sr-only">You detached {subject}</span>
              <span className="fd-popover-tip" aria-hidden="true">
                {subject}
              </span>
            </>
          )}
        </h2>

        <DropdownMenu.Root modal={false} onOpenChange={setOverflowOpen}>
          <DropdownMenu.Trigger className="fd-icon-button fd-popover-more" aria-label="More options">
            <MoreIcon />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="fd-menu fd-menu-small"
              align="end"
              sideOffset={4}
              collisionPadding={8}
              onCloseAutoFocus={(event) => {
                // Don't ask today closes the popover; focus is placed by the editor instead.
                if (leavingRef.current) event.preventDefault();
              }}
            >
              <DropdownMenu.Item
                className="fd-menu-item"
                onSelect={() => {
                  leavingRef.current = true;
                  onDontAskToday();
                }}
              >
                <span className="fd-menu-label">Don’t ask today</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item className="fd-menu-item" onSelect={() => setWhy((current) => !current)}>
                <span className="fd-menu-label">{why ? "Hide why you’re seeing this" : "Why am I seeing this?"}</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <p className="fd-popover-sub" id={subtitleId}>
        Tell the {LIBRARY_TEAM} team what was missing?
      </p>

      {names.length > 0 && (
        <p className="fd-popover-names" id={`${subtitleId}-names`}>
          {names.join(", ")}
        </p>
      )}

      {why && (
        <p className="fd-popover-why" id={whyId}>
          {LIBRARY} asks when one of its components is detached, so its team can see what’s missing. They see your
          reason, your note and this file. The detach never waits for an answer.
        </p>
      )}

      <div className="fd-chips" role="radiogroup" aria-label="Reason">
        {REASONS.map((entry, index) => {
          const checked = reason === entry.id;

          return (
            <button
              key={entry.id}
              ref={(element) => {
                chipRefs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-keyshortcuts={String(index + 1)}
              tabIndex={index === tabStop ? 0 : -1}
              className="fd-chip"
              onClick={(event) => pick(index, event.detail > 0)}
              onFocus={() => setFocused(index)}
              onKeyDown={(event) => onChipKeyDown(event, index)}
            >
              <span className="fd-chip-label">{entry.label}</span>
              <span className="fd-chip-key" aria-hidden="true">
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {reason && !exploring && (
          <motion.div
            key="note"
            className="fd-note-wrap"
            initial={reducedMotion ? { height: "auto", opacity: 0 } : { height: 0 }}
            animate={
              reducedMotion
                ? { height: "auto", opacity: 1, transition: { duration: 0.12, ease: EASE } }
                : { height: "auto", transition: NOTE_SPRING }
            }
            exit={
              reducedMotion
                ? { opacity: 0, transition: { duration: 0.12 } }
                : { height: 0, transition: { duration: 0.12, ease: EASE } }
            }
          >
            <motion.div
              className="fd-note"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.12, delay: reducedMotion ? 0 : 0.05, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
            >
              <label className="fd-sr-only" htmlFor={`${countId}-input`}>
                What did you need? (optional)
              </label>
              <input
                ref={noteRef}
                id={`${countId}-input`}
                className="fd-note-input"
                type="text"
                dir="auto"
                autoComplete="off"
                spellCheck
                placeholder="What did you need? (optional)"
                value={note}
                aria-describedby={remaining <= COUNT_FROM ? countId : undefined}
                onChange={(event) => setNote(capNote(event.target.value, NOTE_LIMIT))}
              />
              {remaining <= COUNT_FROM && (
                <span className="fd-note-count" id={countId} data-empty={remaining === 0 ? "" : undefined}>
                  <span aria-hidden="true">{remaining}</span>
                  <span className="fd-sr-only">{remaining} characters left</span>
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {social && (
        <p className="fd-popover-social" id={socialId}>
          {social}
        </p>
      )}

      <div className="fd-popover-foot">
        <button type="button" className="fd-text-button" onClick={onSkip}>
          Skip
        </button>
        <button
          type="button"
          className="fd-send"
          aria-disabled={reason ? undefined : "true"}
          onClick={send}
        >
          {exploring ? "Done" : "Send"}
        </button>
      </div>
    </div>
  );
}
