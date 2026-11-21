"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
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
 * keyboard, so a recording in Chromium looks like the phone's screen. On a
 * real phone the system draws all of this.
 *
 * Keyboard layout from Uzo's 4-composer-reply (divided by 3): 42pt keys on a
 * 54pt row pitch, 6pt gaps, 3pt side margins, a 45pt predictive bar and the
 * globe and dictation row below. Colours are the iOS light keyboard's.
 */

export const KEYBOARD_HEIGHT = 336;

export type KeyboardApi = {
  /** Show a key's pressed state (and a letter's preview) for one keystroke. */
  flash: (key: string) => void;
};

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const SUGGESTIONS = ["I", "The", "I’m"];
const PREVIEW_MS = 100;

export function StatusBar() {
  return (
    <div data-qr-status aria-hidden="true">
      {/* Each ear is centred on its side of the Dynamic Island (126pt wide). */}
      <span data-qr-clock style={{ left: "calc((50% - 63px) / 2 - 67px)" }}>
        9:41
      </span>
      <span
        data-qr-glyphs
        style={{ left: "calc(100% - (50% - 63px) / 2 - 35.5px)" }}
      >
        <CellularIcon />
        <WifiIcon />
        <BatteryIcon />
      </span>
    </div>
  );
}

export function HomeIndicator() {
  return <span data-qr-home aria-hidden="true" />;
}

function keyName(key: string) {
  if (key === " ") return "space";
  if (key === "Backspace") return "delete";
  if (key === "Enter") return "return";
  if (key === "Shift") return "shift";
  return key.length === 1 ? key.toLowerCase() : "";
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
    return rootRef.current?.querySelector<HTMLElement>(
      `[data-qr-key="${CSS.escape(name)}"]`,
    );
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
    const marginRight = Math.min(
      12,
      Math.max(0, root.offsetWidth - (left + width) - 1),
    );

    preview.style.setProperty("--left", `${left - marginLeft}px`);
    preview.style.setProperty("--top", `${top - 58}px`);
    preview.style.setProperty(
      "--width",
      `${width + marginLeft + marginRight}px`,
    );
    const path = preview.querySelector("path");
    path?.setAttribute(
      "d",
      balloon(width + marginLeft + marginRight, marginLeft, marginRight),
    );
    const letter = preview.querySelector("span");
    if (letter) letter.textContent = shift ? name.toUpperCase() : name;
    const text = preview.querySelector<HTMLElement>("[data-qr-preview-label]");
    text?.style.setProperty("--shift", `${(marginLeft - marginRight) / 2}px`);
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
      window.setTimeout(function release() {
        delete element.dataset.active;
        if (previewRef.current && fingerKey.current === null) {
          delete previewRef.current.dataset.on;
        }
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
        timerMap.forEach((id) => window.clearTimeout(id));
      };
    },
    // `press` reads `shift` for the preview's letter, so it's refreshed with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiRef, shift],
  );

  function handleKeyDown(event: ReactPointerEvent<HTMLElement>) {
    // Keep focus (and the caret) in the message field.
    event.preventDefault();
    const name = event.currentTarget.dataset.qrKey ?? "";

    fingerKey.current = name;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    press(name, null);
  }

  function handleKeyUp(event: ReactPointerEvent<HTMLElement>) {
    const name = event.currentTarget.dataset.qrKey ?? "";

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
    const name = event.currentTarget.dataset.qrKey ?? "";

    fingerKey.current = null;
    release(name);
  }

  const keyHandlers = {
    onPointerDown: handleKeyDown,
    onPointerUp: handleKeyUp,
    onPointerCancel: handleKeyCancel,
  };

  function letter(character: string) {
    return (
      <span key={character} data-qr-key={character} data-kind="letter" {...keyHandlers}>
        {shift ? character.toUpperCase() : character}
      </span>
    );
  }

  return (
    <div ref={rootRef} data-qr-keyboard aria-hidden="true">
      <div data-qr-predictive>
        {SUGGESTIONS.map(function suggestion(word) {
          return <span key={word}>{word}</span>;
        })}
      </div>

      <div data-qr-keys-row data-row="1">
        {ROWS[0].split("").map(letter)}
      </div>
      <div data-qr-keys-row data-row="2">
        {ROWS[1].split("").map(letter)}
      </div>
      <div data-qr-keys-row data-row="3">
        <span
          data-qr-key="shift"
          data-kind="function"
          data-on={shift ? "" : undefined}
          {...keyHandlers}
        >
          <ShiftIcon on={shift} />
        </span>
        <span data-qr-letters>{ROWS[2].split("").map(letter)}</span>
        <span data-qr-key="delete" data-kind="function" {...keyHandlers}>
          <DeleteKeyIcon />
        </span>
      </div>
      <div data-qr-keys-row data-row="4">
        <span data-qr-key="123" data-kind="function" data-label>
          123
        </span>
        <span data-qr-key="emoji" data-kind="function">
          <EmojiKeyIcon />
        </span>
        <span data-qr-key="space" data-kind="space" data-label {...keyHandlers}>
          space
        </span>
        <span data-qr-key="return" data-kind="function" data-label {...keyHandlers}>
          return
        </span>
      </div>
      <div data-qr-keys-extra>
        <GlobeIcon />
        <DictationIcon />
      </div>

      <div ref={previewRef} data-qr-preview>
        <svg data-qr-preview-shape>
          <path />
        </svg>
        <span data-qr-preview-label />
      </div>

      <style>{KEYBOARD_STYLES}</style>
    </div>
  );
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

const KEYBOARD_STYLES = `
  [data-qr-keyboard] {
    --qr-key-fn: #abb0ba;
    --k: calc((100cqw - 60px) / 10);
    container-type: inline-size;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 4;
    height: ${KEYBOARD_HEIGHT}px;
    background: #d1d3d9;
    color: #000000;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui,
      sans-serif;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  [data-qr-predictive] {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    height: 45px;
    padding: 4px 6px 0;
    font-size: 16px;
    line-height: 20px;
    text-align: center;
  }

  [data-qr-predictive] span + span {
    box-shadow: -0.5px 0 0 #a9acb2;
  }

  [data-qr-keys-row] {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    gap: 6px;
    height: 42px;
    padding: 0 3px;
  }

  [data-qr-keys-row][data-row="1"] { top: 53px; }
  [data-qr-keys-row][data-row="2"] {
    top: 107px;
    padding: 0 calc(3px + (100cqw - 60px) / 20 + 3px);
  }
  [data-qr-keys-row][data-row="3"] {
    top: 161px;
    justify-content: space-between;
  }
  [data-qr-keys-row][data-row="4"] { top: 215px; }

  [data-qr-letters] {
    display: flex;
    gap: 6px;
  }

  [data-qr-key] {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: var(--k);
    height: 42px;
    border-radius: 5px;
    background: #ffffff;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
    font-size: 22.5px;
    line-height: 1;
    cursor: default;
  }

  [data-qr-key][data-kind="function"] {
    background: var(--qr-key-fn);
  }

  [data-qr-key][data-label] {
    font-size: 16px;
  }

  [data-qr-key="shift"],
  [data-qr-key="delete"] {
    width: calc(var(--k) * 1.32);
  }

  [data-qr-key="shift"][data-on] {
    background: #ffffff;
  }

  [data-qr-key="shift"] svg {
    width: 23px;
    height: 23px;
  }

  [data-qr-key="delete"] svg {
    width: 25px;
    height: 20px;
  }

  [data-qr-key="123"] {
    width: calc(var(--k) * 1.29);
  }

  [data-qr-key="emoji"] {
    width: calc(var(--k) * 1.3);
  }

  [data-qr-key="emoji"] svg {
    width: 25px;
    height: 25px;
    color: #000000;
  }

  [data-qr-key="space"] {
    flex: 1 1 auto;
  }

  [data-qr-key="return"] {
    width: calc(var(--k) * 2.79);
  }

  /* Pressed: letters light up through their preview; space greys; the
     function keys turn white, as iOS does. */
  [data-qr-key][data-kind="space"][data-active] {
    background: var(--qr-key-fn);
  }

  [data-qr-key][data-kind="function"][data-active] {
    background: #ffffff;
  }

  [data-qr-keys-extra] {
    position: absolute;
    left: 0;
    right: 0;
    top: 280px;
    display: flex;
    justify-content: space-between;
    padding: 0 29px 0 28px;
    color: #50555c;
  }

  [data-qr-keys-extra] svg {
    width: 29px;
    height: 29px;
  }

  [data-qr-preview] {
    position: absolute;
    left: var(--left, 0);
    top: var(--top, 0);
    width: var(--width, 50px);
    height: 100px;
    visibility: hidden;
    pointer-events: none;
    filter: drop-shadow(0 0 0.5px rgba(0, 0, 0, 0.4))
      drop-shadow(0 2px 3px rgba(0, 0, 0, 0.12));
  }

  [data-qr-preview][data-on] {
    visibility: visible;
  }

  [data-qr-preview-shape] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    fill: #ffffff;
  }

  [data-qr-preview-label] {
    position: absolute;
    left: 0;
    right: 0;
    top: 6px;
    translate: var(--shift, 0) 0;
    font-size: 33px;
    font-weight: 300;
    line-height: 40px;
    text-align: center;
  }
`;
