"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  BatteryIcon,
  CellularIcon,
  DeleteKeyIcon,
  DictationIcon,
  EmojiKeyIcon,
  GlobeIcon,
  ShiftIcon,
  WifiIcon,
} from "./icons";

/*
 * Device mode only (?device): the iPhone's own status bar, home indicator and
 * light keyboard, so a recording in Chromium looks like the phone's screen.
 * On a real phone the system draws all of this. Copied from app/quote-reply
 * (its keyboard was measured from a 3× screenshot: 42pt keys on a 54pt row
 * pitch, 6pt gaps, 3pt side margins, a 45pt predictive bar), with neutral
 * predictive words and no third-party buttons.
 */

export const KEYBOARD_HEIGHT = 336;

export type KeyboardApi = {
  /** Show a key's pressed state (and a letter's preview) for one keystroke. */
  flash: (key: string) => void;
};

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const SUGGESTIONS = ["I", "The", "I’m"];
const PREVIEW_MS = 100;

export function StatusBar({ light }: { light: boolean }) {
  return (
    <div data-pn-status data-light={light || undefined} aria-hidden="true">
      {/* Each ear is centred on its side of the Dynamic Island (126pt wide). */}
      <span data-pn-clock style={{ left: "calc((50% - 63px) / 2 - 67px)" }}>
        9:41
      </span>
      <span data-pn-glyphs style={{ left: "calc(100% - (50% - 63px) / 2 - 35.5px)" }}>
        <CellularIcon />
        <WifiIcon />
        <BatteryIcon />
      </span>
    </div>
  );
}

export function HomeIndicator() {
  return <span data-pn-home aria-hidden="true" />;
}

function keyName(key: string) {
  if (key === " ") return "space";
  if (key === "Backspace") return "delete";
  if (key === "Enter") return "return";
  if (key === "Shift") return "shift";

  return key.length === 1 ? key.toLowerCase() : "";
}

/** iOS's key preview: a wide rounded top that narrows into the key below. */
function balloon(width: number, left: number, right: number) {
  const height = 100;
  const r = 9;
  const neckLeft = left;
  const neckRight = width - right;

  return [
    `M ${r} 0`,
    `H ${width - r}`,
    `Q ${width} 0 ${width} ${r}`,
    `V 44`,
    `C ${width} 53 ${neckRight} 55 ${neckRight} 64`,
    `V ${height - 5}`,
    `Q ${neckRight} ${height} ${neckRight - 5} ${height}`,
    `H ${neckLeft + 5}`,
    `Q ${neckLeft} ${height} ${neckLeft} ${height - 5}`,
    `V 64`,
    `C ${neckLeft} 55 0 53 0 44`,
    `V ${r}`,
    `Q 0 0 ${r} 0`,
    "Z",
  ].join(" ");
}

export function IosKeyboard({
  shift,
  apiRef,
  onType,
}: {
  shift: boolean;
  apiRef: RefObject<KeyboardApi | null>;
  /** A finger tap on a key: a character, "Backspace", "Enter" or "Shift". */
  onType: (key: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const timers = useRef(new Map<string, number>());
  const fingerKey = useRef<string | null>(null);

  function keyElement(name: string) {
    return rootRef.current?.querySelector<HTMLElement>(`[data-pn-key="${CSS.escape(name)}"]`);
  }

  function showPreview(name: string, element: HTMLElement) {
    const preview = previewRef.current;
    const root = rootRef.current;

    if (!preview || !root || name.length !== 1 || !/[a-z]/.test(name)) return;

    const box = element.getBoundingClientRect();
    const board = root.getBoundingClientRect();
    const scale = board.width / root.offsetWidth || 1;
    const left = (box.left - board.left) / scale;
    const top = (box.top - board.top) / scale;
    const width = box.width / scale;
    // The balloon grows 12pt each side, less at the board's edges.
    const marginLeft = Math.min(12, Math.max(0, left - 1));
    const marginRight = Math.min(12, Math.max(0, root.offsetWidth - (left + width) - 1));

    preview.style.setProperty("--left", `${left - marginLeft}px`);
    preview.style.setProperty("--top", `${top - 58}px`);
    preview.style.setProperty("--width", `${width + marginLeft + marginRight}px`);
    preview.querySelector("path")?.setAttribute("d", balloon(width + marginLeft + marginRight, marginLeft, marginRight));

    const letter = preview.querySelector<HTMLElement>("[data-pn-preview-label]");

    if (letter) {
      letter.textContent = shift ? name.toUpperCase() : name;
      letter.style.setProperty("--shift", `${(marginLeft - marginRight) / 2}px`);
    }

    preview.dataset.on = "";
  }

  function press(name: string, ms: number | null) {
    const element = keyElement(name);

    if (!element) return;

    window.clearTimeout(timers.current.get(name));
    element.dataset.active = "";
    showPreview(name, element);

    if (ms === null) return;

    timers.current.set(
      name,
      window.setTimeout(function releaseFlash() {
        delete element.dataset.active;
        if (previewRef.current && fingerKey.current === null) delete previewRef.current.dataset.on;
      }, ms),
    );
  }

  function release(name: string) {
    const element = keyElement(name);

    if (element) delete element.dataset.active;
    if (previewRef.current) delete previewRef.current.dataset.on;
  }

  useEffect(
    function expose() {
      const timerMap = timers.current;

      apiRef.current = {
        flash(key: string) {
          const name = keyName(key);

          if (name) press(name, PREVIEW_MS);
        },
      };

      return function hide() {
        apiRef.current = null;
        // Also runs when shift changes, so a key still flashing is released, not left up with its balloon.
        timerMap.forEach(function releaseKey(id, name) {
          window.clearTimeout(id);
          if (fingerKey.current !== name) release(name);
        });
        timerMap.clear();
      };
    },
    // `press` reads `shift` for the preview's letter, so it's refreshed with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiRef, shift],
  );

  function handleKeyDown(event: ReactPointerEvent<HTMLElement>) {
    // Keep focus (and the caret) in the note.
    event.preventDefault();

    const name = event.currentTarget.dataset.pnKey ?? "";

    fingerKey.current = name;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    press(name, null);
  }

  function handleKeyUp(event: ReactPointerEvent<HTMLElement>) {
    const name = event.currentTarget.dataset.pnKey ?? "";

    if (fingerKey.current !== name) return;

    fingerKey.current = null;
    release(name);

    if (name === "space") onType(" ");
    else if (name === "delete") onType("Backspace");
    else if (name === "return") onType("Enter");
    else if (name === "shift") onType("Shift");
    else if (name.length === 1) onType(shift ? name.toUpperCase() : name);
  }

  function handleKeyCancel(event: ReactPointerEvent<HTMLElement>) {
    fingerKey.current = null;
    release(event.currentTarget.dataset.pnKey ?? "");
  }

  const keyHandlers = {
    onPointerDown: handleKeyDown,
    onPointerUp: handleKeyUp,
    onPointerCancel: handleKeyCancel,
  };

  function letter(character: string) {
    return (
      <span key={character} data-pn-key={character} data-kind="letter" {...keyHandlers}>
        {shift ? character.toUpperCase() : character}
      </span>
    );
  }

  return (
    <div ref={rootRef} data-pn-keyboard aria-hidden="true">
      <div data-pn-predictive>
        {SUGGESTIONS.map(function suggestion(word) {
          return <span key={word}>{word}</span>;
        })}
      </div>

      <div data-pn-keys-row data-row="1">
        {ROWS[0].split("").map(letter)}
      </div>
      <div data-pn-keys-row data-row="2">
        {ROWS[1].split("").map(letter)}
      </div>
      <div data-pn-keys-row data-row="3">
        <span data-pn-key="shift" data-kind="function" data-on={shift ? "" : undefined} {...keyHandlers}>
          <ShiftIcon on={shift} />
        </span>
        <span data-pn-letters>{ROWS[2].split("").map(letter)}</span>
        <span data-pn-key="delete" data-kind="function" {...keyHandlers}>
          <DeleteKeyIcon />
        </span>
      </div>
      <div data-pn-keys-row data-row="4">
        <span data-pn-key="123" data-kind="function" data-label>
          123
        </span>
        <span data-pn-key="emoji" data-kind="function">
          <EmojiKeyIcon />
        </span>
        <span data-pn-key="space" data-kind="space" data-label {...keyHandlers}>
          space
        </span>
        <span data-pn-key="return" data-kind="function" data-label {...keyHandlers}>
          return
        </span>
      </div>
      <div data-pn-keys-extra>
        <GlobeIcon />
        <DictationIcon />
      </div>

      <div ref={previewRef} data-pn-preview>
        <svg data-pn-preview-shape>
          <path />
        </svg>
        <span data-pn-preview-label />
      </div>
    </div>
  );
}
