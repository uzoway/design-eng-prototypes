"use client";

import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  motionValue,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";
import type { AnimationPlaybackControls, MotionValue } from "motion/react";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from "react";
import {
  AskIcon,
  CameraIcon,
  CloseCircleIcon,
  CopyIcon,
  ForwardIcon,
  MicIcon,
  MoreIcon,
  PhoneIcon,
  PlusIcon,
  ReadTicks,
  ReplyIcon,
  SendIcon,
  SentTick,
  StickerIcon,
  TrashIcon,
  VideoIcon,
} from "./icons";
import {
  HomeIndicator,
  IosKeyboard,
  KEYBOARD_HEIGHT,
  StatusBar,
} from "./keyboard";
import type { KeyboardApi } from "./keyboard";
import {
  pieces,
  quoteOf,
  snippet,
  snippetText,
  stepWord,
  stillMatches,
  tokenize,
  wholeQuote,
  wordOf,
} from "./selection";
import type { Message, Quote, Unit } from "./selection";
import { STYLES } from "./styles";

/* Content (all from the brief) -------------------------------------------- */

type ChatMessage = Message & {
  /** Mine only: 0 sent, 1 delivered, 2 read. */
  ticks?: 0 | 1 | 2;
  edited?: boolean;
};

const ADA_TEXT =
  "Okay so for Saturday. Are you still bringing the speaker? Also what time are we leaving, 2 or 3? Dami said traffic gets mad after 3. And can Tobi crash at yours on Friday, or should I find him somewhere else? Let me know tonight so I can tell him 🙏";

/** For ?edited: Ada changes her message after it's been quoted, so the fallback flash shows. */
const ADA_EDITED = ADA_TEXT.replace("can Tobi crash", "can Tobi stay");

const INITIAL: ChatMessage[] = [
  {
    id: "m1",
    from: "me",
    text: "are we still on for saturday?",
    time: "10:32",
    ticks: 2,
  },
  { id: "m2", from: "ada", text: "yesss 🎉", time: "10:41" },
  { id: "m3", from: "ada", text: ADA_TEXT, time: "10:41" },
];

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "👏"];

/* Motion -------------------------------------------------------------------- */

// One curve for everything that travels: fast out of the gate, long soft landing.
const EASE = [0.32, 0.72, 0, 1] as const;
// iOS's keyboard curve.
const KEYBOARD_EASE = [0.38, 0.7, 0.125, 1] as const;
const LIFT = { duration: 0.34, ease: EASE };
const FADE = { duration: 0.15, ease: EASE };
const POP = { duration: 0.28, ease: EASE };

const LINE = 19;
const MAX_LINES = 48;
const PANEL = 52;
const LONG_PRESS_TOUCH = 400;
const LONG_PRESS_MOUSE = 450;
const SLOP = 8;
const SWIPE_TRIGGER = 56;
const MENU_HEIGHT = 41.33 * 6 + 7;
const REACTIONS_HEIGHT = 56;
const ABOVE_GAP = 12.6;
const BELOW_GAP = 13.4;
/** A bubble's padding above and below its words (6 + 7). */
const LIFT_PAD = 13;
const PILL_GAP = 12.4;
const PILL_HEIGHT = 36;

const EMOJI = /\p{Extended_Pictographic}/u;

/* Geometry ------------------------------------------------------------------ */

/** A unit's box inside its text element, in unscaled CSS px. */
type Box = { left: number; right: number; line: number };

type Geometry = {
  boxes: Box[][];
  lines: number;
  width: number;
  byLine: number[][];
};

type Band = { line: number; left: number; right: number };

type Range = [number, number];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function measure(text: HTMLElement): Geometry {
  const rect = text.getBoundingClientRect();
  const scale = rect.width / text.offsetWidth || 1;
  const spans = text.querySelectorAll<HTMLElement>("[data-u]");
  const boxes: Box[][] = [];
  const byLine: number[][] = [];
  let lines = 1;

  spans.forEach(function box(span) {
    const index = Number(span.dataset.u);
    const list = Array.from(span.getClientRects()).map(function toBox(r) {
      const middle = ((r.top + r.bottom) / 2 - rect.top) / scale;
      const line = Math.max(0, Math.floor(middle / LINE));

      return {
        left: (r.left - rect.left) / scale,
        right: (r.right - rect.left) / scale,
        line,
      };
    });

    boxes[index] = list;
    list.forEach(function file(b) {
      (byLine[b.line] ??= []).push(index);
      lines = Math.max(lines, b.line + 1);
    });
  });

  return { boxes, lines, width: text.offsetWidth, byLine };
}

/** The unit under a point (text coords), snapping to the nearest on its line. */
function hit(geo: Geometry, x: number, y: number) {
  const line = clamp(Math.floor(y / LINE), 0, geo.lines - 1);
  const candidates = geo.byLine[line] ?? [];
  let best = candidates[0] ?? 0;
  let distance = Infinity;

  candidates.forEach(function nearest(index) {
    geo.boxes[index]
      .filter((b) => b.line === line)
      .forEach(function measureBox(b) {
        const d = x < b.left ? b.left - x : x > b.right ? x - b.right : 0;

        if (d < distance) {
          distance = d;
          best = index;
        }
      });
  });

  return best;
}

/**
 * iOS draws a selection a line at a time: the first line runs from the start
 * to the column's edge, middle lines fill the column, the last ends at the
 * last word.
 */
function bandsOf(geo: Geometry, range: Range): Band[] {
  const first = geo.boxes[range[0]]?.[0];
  const lastList = geo.boxes[range[1]];
  const last = lastList?.[lastList.length - 1];

  if (!first || !last) return [];
  if (first.line === last.line) {
    return [{ line: first.line, left: first.left, right: last.right }];
  }

  const list: Band[] = [
    { line: first.line, left: first.left, right: geo.width },
  ];
  for (let line = first.line + 1; line < last.line; line += 1) {
    list.push({ line, left: 0, right: geo.width });
  }
  list.push({ line: last.line, left: 0, right: last.right });

  return list;
}

/** The units a quote covers, for the jump highlight. */
function rangeOfQuote(units: Unit[], quote: Quote): Range | null {
  const first = units.findIndex((u) => u.start >= quote.start);
  let last = -1;

  units.forEach(function within(u, i) {
    if (u.end <= quote.end) last = i;
  });

  return first === -1 || last < first ? null : [first, last];
}

function ordered(a: number, b: number): Range {
  return a <= b ? [a, b] : [b, a];
}

/* Device mode (?device) is set on <html> by page.tsx before first paint. ---- */

function subscribe() {
  return function unsubscribe() {};
}

function useHtmlFlag(name: string) {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.hasAttribute(name),
    () => false,
  );
}

/* Small pieces ---------------------------------------------------------------- */

function Tail() {
  return (
    <svg data-qr-tail viewBox="0 0 12 17" aria-hidden="true">
      <path d="M6 0v9.6c0 3.4-1.8 6-5.2 7-.5.15-.4.4.1.4H12V0z" />
    </svg>
  );
}

function Surface({ tail }: { tail: boolean }) {
  return (
    <span data-qr-surface aria-hidden="true">
      {tail && <Tail />}
    </span>
  );
}

/** WhatsApp's default avatar for a contact without a photo. */
function DefaultAvatar() {
  return (
    <span data-qr-avatar aria-hidden="true">
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="15.2" r="6.9" fill="currentColor" />
        <path
          d="M6.6 34.4c1.9-6.9 7.1-10.6 13.4-10.6s11.5 3.7 13.4 10.6A19.9 19.9 0 0120 40a19.9 19.9 0 01-13.4-5.6z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

function HeaderBack() {
  return (
    <svg viewBox="0 0 12 20" fill="none" aria-hidden="true">
      <path
        d="M10.2 1.6L2 10l8.2 8.4"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Ticks({ state }: { state: 0 | 1 | 2 }) {
  return (
    <span
      data-qr-ticks
      data-state={state === 2 ? "read" : state === 1 ? "delivered" : "sent"}
      aria-label={state === 2 ? "Read" : state === 1 ? "Delivered" : "Sent"}
      role="img"
    >
      <motion.span
        initial={false}
        animate={{ opacity: state === 0 ? 1 : 0 }}
        transition={FADE}
      >
        <SentTick />
      </motion.span>
      <motion.span
        initial={false}
        animate={{ opacity: state === 0 ? 0 : 1 }}
        transition={FADE}
      >
        <ReadTicks />
      </motion.span>
    </span>
  );
}

/** The message text as units, so words can be measured and selected. */
function Words({ text, units }: { text: string; units: Unit[] }) {
  return pieces(text, units).map(function piece(p, i) {
    if (p.kind === "gap") return <Fragment key={`g${i}`}>{p.text}</Fragment>;

    return (
      <span
        key={`u${p.index}`}
        data-u={p.index}
        data-qr-emoji={EMOJI.test(p.text) ? "" : undefined}
      >
        {p.text}
      </span>
    );
  });
}

type BandLayer = { x: MotionValue<number>; w: MotionValue<number>; o: MotionValue<number> };

function makeLayers(): BandLayer[] {
  return Array.from({ length: MAX_LINES }, function layer() {
    return { x: motionValue(0), w: motionValue(0), o: motionValue(0) };
  });
}

/* The chat ------------------------------------------------------------------ */

type Lift = {
  id: string;
  side: "in" | "out";
  left: number;
  top: number;
  width: number;
  target: number;
  menuTop: number;
  reactionsTop: number;
  /**
   * Max height of the lifted words when the message is taller than the room
   * between the reactions and the menu. They scroll inside the bubble then.
   */
  clip: number | null;
  /** Opened from the keyboard: the word caret shows. */
  keyboard: boolean;
  phase: "open" | "closing";
};

type Gesture =
  | {
      kind: "press";
      id: string;
      pointerId: number;
      x0: number;
      y0: number;
      element: HTMLElement;
      timer: number;
    }
  | {
      kind: "swipe";
      id: string;
      pointerId: number;
      x0: number;
      element: HTMLElement;
      dx: number;
    }
  | {
      kind: "held";
      pointerId: number;
      x0: number;
      y0: number;
      /** Where the text sat when the press began, so the finger keeps driving it. */
      originX: number;
      originY: number;
      scale: number;
      anchor: number | null;
      moved: boolean;
    }
  | {
      kind: "text";
      pointerId: number;
      x0: number;
      y0: number;
      anchor: number;
      moved: boolean;
    }
  | {
      kind: "handle";
      pointerId: number;
      fixed: number;
      offsetX: number;
      offsetY: number;
    }
  | { kind: "dismiss"; pointerId: number; x0: number; y0: number };

type Ghost = {
  lines: { text: string; left: number; top: number }[];
  x: number;
  y: number;
};

type Pill = { center: number; top: number; below: boolean };

export function QuoteReplyChat() {
  const device = useHtmlFlag("data-qr-device-mode");
  const edits = useHtmlFlag("data-qr-edited");
  const [run, setRun] = useState(0);

  return (
    <MotionConfig reducedMotion="user">
      <div data-qr-stage>
        <div data-qr-device>
          <Chat key={run} device={device} edits={edits} />
        </div>
        <p data-qr-note>
          <span>A concept by Uzo Okafor. Not affiliated with WhatsApp.</span>
          <button
            type="button"
            data-qr-reset
            onClick={function reset() {
              setRun((n) => n + 1);
            }}
          >
            Reset
          </button>
        </p>
      </div>
      <style>{STYLES}</style>
    </MotionConfig>
  );
}

function Chat({ device, edits }: { device: boolean; edits: boolean }) {
  const reduced = useReducedMotion() ?? false;

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL);
  const [lift, setLift] = useState<Lift | null>(null);
  const [selection, setSelection] = useState<Range | null>(null);
  const [dragging, setDragging] = useState(false);
  const [menuGone, setMenuGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [caret, setCaret] = useState(0);
  const [pill, setPill] = useState<Pill | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [draft, setDraft] = useState("");
  const [manualShift, setManualShift] = useState<boolean | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [arriving, setArriving] = useState<string | null>(null);
  const [jump, setJump] = useState<{ id: string; bands: Band[]; n: number } | null>(null);
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);

  const screenRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const liftedTextRef = useRef<HTMLParagraphElement>(null);
  const liftScrollRef = useRef<HTMLDivElement>(null);
  const focusAfterClose = useRef<string | null>(null);
  const liftedRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const panelTextRef = useRef<HTMLSpanElement>(null);
  const keyboardApi = useRef<KeyboardApi | null>(null);
  const bubbles = useRef(new Map<string, HTMLDivElement>());
  const texts = useRef(new Map<string, HTMLParagraphElement>());
  const gesture = useRef<Gesture | null>(null);
  const geo = useRef<Geometry | null>(null);
  const range = useRef<Range | null>(null);
  const liftRef = useRef<Lift | null>(null);
  const stuck = useRef(true);
  const insetRef = useRef(0);
  const sent = useRef(0);
  const timers = useRef<number[]>([]);
  const settling = useRef<AnimationPlaybackControls | null>(null);
  const panelDelay = useRef(0);
  const messagesRef = useRef(messages);
  const quoteRef = useRef(quote);

  useLayoutEffect(function mirror() {
    messagesRef.current = messages;
    quoteRef.current = quote;
    liftRef.current = lift;
  });

  // Motion values: the lifted bubble, the composer and the keyboard.
  const liftY = useMotionValue(0);
  const backdrop = useMotionValue(0);
  const tintOpacity = useMotionValue(1);
  const panel = useMotionValue(0);
  const panelText = useMotionValue(1);
  const keys = useMotionValue(0);
  const barY = useMotionValue(0);
  const startX = useMotionValue(0);
  const startY = useMotionValue(0);
  const endX = useMotionValue(0);
  const endY = useMotionValue(0);
  const handles = useMotionValue(0);
  const panelOpacity = useOpacityFromPanel(panel);
  const keyboardY = useKeyboardY(keys);
  const [layers] = useState(makeLayers);

  const unitsById = useMemo(
    function tokenizeAll() {
      return new Map(messages.map((m) => [m.id, tokenize(m.text)]));
    },
    [messages],
  );

  const bottomInset = device ? 34 : 0;

  /* Composer + keyboard inset: the chat stays anchored to the bar ---------- */

  function syncInset() {
    const scroller = scrollRef.current;
    const spacer = spacerRef.current;

    if (!scroller || !spacer) return;

    const lifted = Math.max(0, keys.get() - bottomInset);
    const next = panel.get() + lifted;
    const delta = next - insetRef.current;

    barY.set(-lifted);
    if (delta === 0) return;

    const wasStuck = stuck.current;
    insetRef.current = next;
    spacer.style.height = `calc(var(--qr-bottom) + 52px + ${next}px)`;
    scroller.scrollTop = wasStuck
      ? scroller.scrollHeight
      : scroller.scrollTop + delta;
  }

  useMotionValueEvent(panel, "change", syncInset);
  useMotionValueEvent(keys, "change", syncInset);

  useEffect(function trackBottom() {
    const scroller = scrollRef.current;

    if (!scroller) return;

    function check() {
      if (!scroller) return;
      stuck.current =
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop < 2;
    }

    scroller.scrollTop = scroller.scrollHeight;
    check();
    scroller.addEventListener("scroll", check, { passive: true });

    return function stop() {
      scroller.removeEventListener("scroll", check);
    };
  }, []);

  // The panel opens when a quote arrives and closes when it goes.
  const hasQuote = quote !== null;
  useEffect(
    function openPanel() {
      const delay = panelDelay.current;
      panelDelay.current = 0;
      const controls = animate(panel, hasQuote ? PANEL : 0, {
        duration: reduced ? 0 : 0.26,
        ease: EASE,
        delay,
      });

      return function stop() {
        controls.stop();
      };
    },
    [hasQuote, panel, reduced],
  );

  useEffect(
    function slideKeyboard() {
      if (!device) return;
      const controls = animate(keys, keyboard ? KEYBOARD_HEIGHT : 0, {
        duration: reduced ? 0 : 0.35,
        ease: KEYBOARD_EASE,
      });

      return function stop() {
        controls.stop();
      };
    },
    [device, keyboard, keys, reduced],
  );

  useEffect(function clearTimers() {
    const list = timers.current;

    return function clear() {
      list.forEach((id) => window.clearTimeout(id));
      settling.current?.stop();
    };
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  /* Selection drawing (motion values, no React render per move) ----------- */

  function drawSelection(next: Range | null, instant = false) {
    const g = geo.current;
    const previous = range.current;
    range.current = next;

    const bands = g && next ? bandsOf(g, next) : [];
    const lines = new Set(bands.map((b) => b.line));
    const glide = instant || reduced ? { duration: 0 } : { duration: 0.09, ease: EASE };
    const fade = instant || reduced ? { duration: 0 } : { duration: 0.06, ease: EASE };

    layers.forEach(function update(layer, line) {
      const band = bands.find((b) => b.line === line);

      if (!band) {
        if (layer.o.get() > 0) animate(layer.o, 0, fade);
        return;
      }

      if (!lines.has(line) || layer.o.get() === 0 || !previous) {
        layer.x.set(band.left);
        layer.w.set(band.right - band.left);
        animate(layer.o, 1, fade);
      } else {
        animate(layer.x, band.left, glide);
        animate(layer.w, band.right - band.left, glide);
        if (layer.o.get() < 1) animate(layer.o, 1, fade);
      }
    });

    if (!g || !next || bands.length === 0) {
      animate(handles, 0, fade);
      return;
    }

    const first = bands[0];
    const last = bands[bands.length - 1];
    const firstShow = handles.get() === 0 || !previous;

    if (firstShow) {
      startX.set(first.left);
      startY.set(first.line * LINE);
      endX.set(last.right);
      endY.set(last.line * LINE);
    } else {
      animate(startX, first.left, glide);
      animate(startY, first.line * LINE, glide);
      animate(endX, last.right, glide);
      animate(endY, last.line * LINE, glide);
    }
    animate(handles, 1, fade);
  }

  function describeRange(id: string, r: Range | null) {
    const message = messagesRef.current.find((m) => m.id === id);
    const units = unitsById.get(id);

    if (!message || !units || !r) return "";
    return quoteOf(message, units, r[0], r[1]).text;
  }

  /** Scroll a clipped lifted message so a word's line is in view. */
  function revealUnit(index: number) {
    const scroller = liftScrollRef.current;
    const line = geo.current?.boxes[index]?.[0]?.line;

    if (!scroller || line === undefined) return;
    if (scroller.scrollHeight <= scroller.clientHeight + 1) return;
    const top = 6 + line * LINE;
    const bottom = top + LINE;

    if (top < scroller.scrollTop + 6) scroller.scrollTop = top - 6;
    else if (bottom > scroller.scrollTop + scroller.clientHeight - 7) {
      scroller.scrollTop = bottom - scroller.clientHeight + 7;
    }
  }

  function handleLiftScroll() {
    // The pill follows the selection as the words scroll, like iOS.
    if (range.current && !gesture.current && pill) placePill(range.current);
  }

  function placePill(r: Range | null) {
    const g = geo.current;
    const text = liftedTextRef.current;
    const screen = screenRef.current;
    const l = liftRef.current;

    if (!g || !r || !text || !screen || !l) {
      setPill(null);
      return;
    }

    const bands = bandsOf(g, r);
    const screenBox = screen.getBoundingClientRect();
    const textBox = text.getBoundingClientRect();
    // Measured against where the bubble lands, not where it is mid-lift.
    const lag = l.target - liftY.get();
    const left = Math.min(...bands.map((b) => b.left));
    const right = Math.max(...bands.map((b) => b.right));
    let top = textBox.top - screenBox.top + lag + bands[0].line * LINE;
    let bottom =
      textBox.top - screenBox.top + lag + (bands[bands.length - 1].line + 1) * LINE;
    const scroller = l.clip !== null ? liftScrollRef.current : null;

    if (scroller) {
      // Scrolled out of view: point at the edge of what's showing.
      const box = scroller.getBoundingClientRect();
      const visibleTop = box.top - screenBox.top + lag;
      const visibleBottom = box.bottom - screenBox.top + lag;
      top = clamp(top, visibleTop, visibleBottom);
      bottom = clamp(bottom, visibleTop, visibleBottom);
    }
    const center = textBox.left - screenBox.left + (left + right) / 2;
    const safeTop = (device ? 59 : 8) + 4;
    const above = top - PILL_GAP - PILL_HEIGHT;

    setPill(
      above >= safeTop
        ? { center, top: above, below: false }
        : { center, top: bottom + PILL_GAP + 14, below: true },
    );
  }

  /* Opening and closing the lifted view ------------------------------------ */

  function openLift(id: string, keyboardOpened: boolean) {
    const bubble = bubbles.current.get(id);
    const screen = screenRef.current;
    const message = messagesRef.current.find((m) => m.id === id);

    if (!bubble || !screen || !message) return;

    settling.current?.stop();
    const screenBox = screen.getBoundingClientRect();
    const box = bubble.getBoundingClientRect();
    const scale = screenBox.width / screen.offsetWidth || 1;
    // Exact layout size: offsetWidth rounds, and a copy a fraction narrower
    // can wrap a word onto an extra line.
    const style = getComputedStyle(bubble);
    const width = parseFloat(style.width) || bubble.offsetWidth;
    const height = parseFloat(style.height) || bubble.offsetHeight;
    // The press scales the bubble from its centre; measure the resting box.
    const left = ((box.left + box.right) / 2 - screenBox.left) / scale - width / 2;
    const top = ((box.top + box.bottom) / 2 - screenBox.top) / scale - height / 2;
    const screenHeight = screen.offsetHeight;
    const minTop = (device ? 59 : 8) + 4;
    const maxBottom = screenHeight - (device ? 34 : 8) - 4;
    const highest = minTop + REACTIONS_HEIGHT + ABOVE_GAP;
    const room = maxBottom - MENU_HEIGHT - BELOW_GAP - highest;
    // Too tall for the room: the words scroll inside the bubble, so the
    // reactions and the menu stay on screen and nothing overlaps.
    const textElement = texts.current.get(id);
    const textHeight = textElement
      ? parseFloat(getComputedStyle(textElement).height) || textElement.offsetHeight
      : height;
    const chrome = height - textHeight;
    const clip = height > room ? Math.max(LINE * 3, room - chrome) : null;
    const shown = clip === null ? height : chrome + clip;
    const target = clip === null ? clamp(top, highest, highest + room - height) : highest;
    const menuTop = Math.min(target + shown + BELOW_GAP, maxBottom - MENU_HEIGHT);

    liftY.set(top);
    backdrop.set(0);
    tintOpacity.set(1);
    handles.set(0);
    layers.forEach((layer) => layer.o.set(0));
    range.current = null;
    geo.current = null;

    const next: Lift = {
      id,
      side: message.from === "me" ? "out" : "in",
      left,
      top,
      width,
      target,
      menuTop,
      reactionsTop: target - ABOVE_GAP - REACTIONS_HEIGHT,
      clip,
      keyboard: keyboardOpened,
      phase: "open",
    };

    liftRef.current = next;
    setLift(next);
    setSelection(null);
    setDragging(false);
    setMenuGone(false);
    setLeaving(false);
    setPill(null);
    setCaret(0);
    setAnnouncement("");

    animate(liftY, target, reduced ? { duration: 0 } : LIFT);
    animate(backdrop, 1, reduced ? { duration: 0 } : { duration: 0.3, ease: EASE });
  }

  /** Measure the lifted words once they're on screen (and again once fonts load). */
  useLayoutEffect(
    function measureLifted() {
      if (!lift) return;
      const text = liftedTextRef.current;

      if (!text) return;
      geo.current = measure(text);
      text.focus({ preventScroll: true });

      let alive = true;
      document.fonts?.ready.then(function remeasure() {
        if (alive && liftedTextRef.current) {
          geo.current = measure(liftedTextRef.current);
          if (range.current) drawSelection(range.current, true);
        }
      });

      return function stop() {
        alive = false;
      };
    },
    // Only when a new message lifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lift?.id],
  );

  /** The live resting top of a bubble, as the chat moves under it. */
  function restingTop(id: string) {
    const bubble = bubbles.current.get(id);
    const screen = screenRef.current;

    if (!bubble || !screen) return liftY.get();
    const screenBox = screen.getBoundingClientRect();
    const box = bubble.getBoundingClientRect();
    const scale = screenBox.width / screen.offsetWidth || 1;

    return (
      ((box.top + box.bottom) / 2 - screenBox.top) / scale - bubble.offsetHeight / 2
    );
  }

  /**
   * The lifted bubble settles back into the chat while the blur lifts.
   * `shift` is how far a reply panel that's about to open will push the chat
   * up. The bubble heads for where it will end up, not where it is now, so it
   * never dips past its spot and climbs back.
   */
  function settle(delay: number, then: () => void, shift = 0) {
    const l = liftRef.current;

    if (!l) return;

    const from = liftY.get();
    const fromBackdrop = backdrop.get();
    const start = restingTop(l.id);
    // A clipped message opens back to full height as it lands.
    const scroller = l.clip !== null ? liftScrollRef.current : null;
    const fromClip = scroller?.clientHeight ?? 0;
    // The words' own height; a handle hanging below the last line doesn't count.
    const fullClip = (scroller?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
    const fromScroll = scroller?.scrollTop ?? 0;

    if (reduced) {
      then();
      return;
    }

    settling.current?.stop();
    settling.current = animate(0, 1, {
      duration: 0.38,
      ease: EASE,
      delay,
      onUpdate(p) {
        const live = restingTop(l.id);
        const pending = clamp(shift - (start - live), 0, shift);
        liftY.set(lerp(from, live - pending, p));
        backdrop.set(lerp(fromBackdrop, 0, p));
        if (scroller) {
          scroller.style.maxHeight = `${lerp(fromClip, fullClip, p)}px`;
          scroller.scrollTop = lerp(fromScroll, 0, p);
        }
      },
      onComplete: then,
    });
  }

  function finishLift(returnFocus: boolean) {
    const l = liftRef.current;

    liftRef.current = null;
    range.current = null;
    setLift(null);
    setSelection(null);
    setPill(null);
    setGhost(null);
    setLeaving(false);
    setMenuGone(false);

    // The bubble is still hidden under the lifted copy until React renders,
    // and a hidden element can't take focus, so this waits for that render.
    if (returnFocus && l) focusAfterClose.current = l.id;
  }

  useEffect(
    function returnFocus() {
      const id = focusAfterClose.current;

      if (lift || !id) return;
      focusAfterClose.current = null;
      bubbles.current.get(id)?.focus({ preventScroll: true });
    },
    [lift],
  );

  function closeLift(returnFocus = false, shift = 0) {
    const l = liftRef.current;

    if (!l || l.phase === "closing") return;
    const closing = { ...l, phase: "closing" as const };
    liftRef.current = closing;
    setLift(closing);
    setLeaving(true);
    animate(tintOpacity, 0, reduced ? { duration: 0 } : FADE);
    settle(
      0,
      function done() {
        finishLift(returnFocus);
      },
      shift,
    );
  }

  /* Reply ------------------------------------------------------------------- */

  function focusComposer() {
    inputRef.current?.focus({ preventScroll: true });
    if (device) setKeyboard(true);
  }

  function replyWhole() {
    const l = liftRef.current;
    const message = messagesRef.current.find((m) => m.id === l?.id);

    if (!l || !message) return;
    panelDelay.current = reduced ? 0 : 0.08;
    setQuote(wholeQuote(message));
    panelText.set(1);
    closeLift(false, PANEL - panel.get());
    later(focusComposer, reduced ? 0 : 470);
  }

  function replyWithSelection() {
    const l = liftRef.current;
    const r = range.current;
    const g = geo.current;
    const message = messagesRef.current.find((m) => m.id === l?.id);
    const units = l ? unitsById.get(l.id) : undefined;
    const text = liftedTextRef.current;
    const screen = screenRef.current;

    if (!l || !r || !g || !message || !units || !text || !screen) return;

    const next = quoteOf(message, units, r[0], r[1]);

    if (!next.partial || reduced) {
      // The whole message, or no motion: an ordinary reply.
      panelDelay.current = 0;
      setQuote(next);
      if (reduced) {
        panelText.set(0);
        animate(panelText, 1, { duration: 0.12 });
        finishLift(false);
        focusComposer();
      } else {
        panelText.set(1);
        closeLift(false, PANEL - panel.get());
        later(focusComposer, 470);
      }
      return;
    }

    // 1. The pill fades; the tint stays a beat, then goes with the handles.
    const screenBox = screen.getBoundingClientRect();
    const textBox = text.getBoundingClientRect();
    const scale = screenBox.width / screen.offsetWidth || 1;
    const originX = (textBox.left - screenBox.left) / scale;
    const originY = (textBox.top - screenBox.top) / scale;
    const bands = bandsOf(g, r);
    const firstLine = bands[0].line;
    const firstLeft = bands[0].left;
    const lines = bands.map(function lineText(band) {
      const inLine = (g.byLine[band.line] ?? []).filter(
        (i) => i >= r[0] && i <= r[1],
      );
      const a = units[inLine[0]];
      const b = units[inLine[inLine.length - 1]];

      return {
        text: a && b ? message.text.slice(a.start, b.end) : "",
        left: (band.line === firstLine ? band.left : 0) - firstLeft,
        top: (band.line - firstLine) * LINE,
      };
    });

    const closing = { ...l, phase: "closing" as const };
    liftRef.current = closing;
    setLift(closing);
    setLeaving(true);
    setPill(null);
    setGhost({
      lines,
      x: originX + firstLeft,
      y: originY + firstLine * LINE,
    });

    animate(tintOpacity, 0, { duration: 0.18, ease: EASE, delay: 0.12 });

    // 3. The quote opens under it over the same window and takes over at the end.
    panelDelay.current = 0.2;
    panelText.set(0);
    setQuote(next);

    // 2. The lifted bubble settles back and the blur lifts as the words fly.
    settle(
      0.08,
      function landed() {
        finishLift(false);
        focusComposer();
      },
      PANEL - panel.get(),
    );
  }

  // The ghost's flight is driven per frame toward the live quote position.
  useLayoutEffect(
    function fly() {
      const element = ghostRef.current;
      const screen = screenRef.current;

      if (!ghost || !element || !screen) return;

      const startColor = [11, 11, 11];
      const endColor = [102, 112, 117];
      const fromX = ghost.x;
      const fromY = ghost.y;
      const size = 12 / 14;
      const extra = Array.from(element.querySelectorAll<HTMLElement>("span")).slice(1);

      element.style.transform = `translate(${fromX}px, ${fromY}px)`;

      const controls = animate(0, 1, {
        duration: 0.38,
        delay: 0.08,
        ease: EASE,
        onUpdate(p) {
          const target = panelTextRef.current;
          const screenBox = screen.getBoundingClientRect();
          const scale = screenBox.width / screen.offsetWidth || 1;
          let toX = fromX;
          let toY = fromY;

          if (target) {
            const box = target.getBoundingClientRect();
            toX = (box.left - screenBox.left) / scale;
            // Centre the scaled 19px line on the quote's 16px line.
            toY = (box.top - screenBox.top) / scale - (LINE * size - 16) / 2;
          }

          const x = lerp(fromX, toX, p);
          const y = lerp(fromY, toY, p);
          const s = lerp(1, size, p);
          const color = startColor.map((c, i) => Math.round(lerp(c, endColor[i], p)));

          element.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
          element.style.color = `rgb(${color.join(",")})`;
          // The last 80ms of 380 crossfade into the real quote.
          const fade = clamp((p - 0.79) / 0.21, 0, 1);
          element.style.opacity = String(1 - fade);
          panelText.set(fade);
          extra.forEach(function fadeExtra(span) {
            span.style.opacity = String(1 - clamp((p - 0.45) / 0.4, 0, 1));
          });
        },
        onComplete() {
          panelText.set(1);
        },
      });

      return function stop() {
        controls.stop();
      };
    },
    [ghost, panelText],
  );

  /* Copy and the decorative actions ---------------------------------------- */

  function copySelection() {
    const l = liftRef.current;
    const r = range.current;
    const text = l ? describeRange(l.id, r) : "";

    if (text) navigator.clipboard?.writeText(text).catch(() => {});
    closeLift(true);
  }

  function copyWhole() {
    const l = liftRef.current;
    const message = messagesRef.current.find((m) => m.id === l?.id);

    if (message) navigator.clipboard?.writeText(message.text).catch(() => {});
    closeLift(true);
  }

  function dismissPill() {
    // Look Up and Share… press, then the pill closes. The selection stays.
    setPill(null);
  }

  /* Pointer: press, long-press, swipe -------------------------------------- */

  function handleBubblePointerDown(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (liftRef.current || gesture.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-qr-quote]")) return;

    const element = event.currentTarget;
    const message = messagesRef.current.find((m) => m.id === id);

    if (!message || message.from !== "ada" || arriving === id) return;

    element.dataset.pressed = "";
    const pointerId = event.pointerId;
    const x0 = event.clientX;
    const y0 = event.clientY;
    const timer = window.setTimeout(
      function longPress() {
        const g = gesture.current;

        if (g?.kind !== "press" || g.pointerId !== pointerId) return;
        delete element.dataset.pressed;

        const text = texts.current.get(id);
        const box = text?.getBoundingClientRect();
        const scale = text && box ? box.width / text.offsetWidth || 1 : 1;
        gesture.current = {
          kind: "held",
          pointerId,
          x0,
          y0,
          originX: box?.left ?? 0,
          originY: box?.top ?? 0,
          scale,
          anchor: null,
          moved: false,
        };
        openLift(id, false);
      },
      event.pointerType === "mouse" ? LONG_PRESS_MOUSE : LONG_PRESS_TOUCH,
    );

    gesture.current = { kind: "press", id, pointerId, x0, y0, element, timer };
  }

  function handleBubbleContextMenu(event: ReactMouseEvent<HTMLDivElement>, id: string) {
    event.preventDefault();
    const message = messagesRef.current.find((m) => m.id === id);

    if (liftRef.current || !message || message.from !== "ada") return;
    if (event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "touch") {
      return;
    }
    const g = gesture.current;

    if (g?.kind === "press") {
      window.clearTimeout(g.timer);
      delete g.element.dataset.pressed;
      gesture.current = null;
    }
    if (g?.kind === "held") return;
    openLift(id, false);
  }

  function handleBubbleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>, id: string) {
    const opens =
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ContextMenu" ||
      (event.key === "F10" && event.shiftKey);

    if (!opens) return;
    event.preventDefault();
    openLift(id, true);
  }

  /** Text coords of a pointer over the lifted words. */
  function liftedPoint(clientX: number, clientY: number) {
    const text = liftedTextRef.current;

    if (!text) return { x: 0, y: 0 };
    const box = text.getBoundingClientRect();
    const scale = box.width / text.offsetWidth || 1;

    return { x: (clientX - box.left) / scale, y: (clientY - box.top) / scale };
  }

  function startSelecting() {
    setMenuGone(true);
    setDragging(true);
    setPill(null);
  }

  function commitSelection(next: Range | null) {
    const l = liftRef.current;

    setDragging(false);
    setSelection(next);
    if (next) setCaret(next[1]);
    placePill(next);
    setAnnouncement(l && next ? `Selected: ${describeRange(l.id, next)}` : "");
  }

  function handleOverlayPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const l = liftRef.current;

    if (!l || l.phase !== "open" || gesture.current) return;
    const target = event.target as HTMLElement;
    const handle = target.closest<HTMLElement>("[data-qr-handle]");

    if (handle && range.current) {
      event.preventDefault();
      const end = handle.dataset.end === "start" ? "start" : "end";
      const point = liftedPoint(event.clientX, event.clientY);
      const caretX = end === "start" ? startX.get() : endX.get();
      const caretY = (end === "start" ? startY.get() : endY.get()) + LINE / 2;

      gesture.current = {
        kind: "handle",
        pointerId: event.pointerId,
        fixed: end === "start" ? range.current[1] : range.current[0],
        offsetX: caretX - point.x,
        offsetY: caretY - point.y,
      };
      setDragging(true);
      setPill(null);
      return;
    }

    if (target.closest("button")) return;

    if (target.closest("[data-qr-lifted] [data-qr-text]") && geo.current) {
      event.preventDefault();
      liftedTextRef.current?.focus({ preventScroll: true });
      const point = liftedPoint(event.clientX, event.clientY);

      gesture.current = {
        kind: "text",
        pointerId: event.pointerId,
        x0: event.clientX,
        y0: event.clientY,
        anchor: hit(geo.current, point.x, point.y),
        moved: false,
      };
      return;
    }

    if (target.closest("[data-qr-lifted]")) return;

    gesture.current = {
      kind: "dismiss",
      pointerId: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
    };
  }

  useEffect(
    function trackPointer() {
      function swallowNextClick() {
        function swallow(event: MouseEvent) {
          event.preventDefault();
          event.stopPropagation();
          stop();
        }
        function stop() {
          window.clearTimeout(timer);
          window.removeEventListener("click", swallow, true);
        }
        const timer = window.setTimeout(stop, 350);
        window.addEventListener("click", swallow, true);
      }

      // A drag held near the top or bottom of a clipped message scrolls it,
      // faster the further past the edge, and keeps selecting as it goes.
      let lastPoint: { clientX: number; clientY: number } | null = null;
      let frame = 0;

      function edgeSpeed(clientY: number) {
        const scroller = liftScrollRef.current;

        if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 1) return 0;
        const box = scroller.getBoundingClientRect();
        const zone = 28;

        if (clientY < box.top + zone) return -9 * clamp((box.top + zone - clientY) / zone, 0, 1.5);
        if (clientY > box.bottom - zone) {
          return 9 * clamp((clientY - (box.bottom - zone)) / zone, 0, 1.5);
        }
        return 0;
      }

      function autoScroll() {
        frame = 0;
        const g = gesture.current;
        const scroller = liftScrollRef.current;

        if (!g || !lastPoint || !scroller || (g.kind !== "text" && g.kind !== "handle")) return;
        const speed = edgeSpeed(lastPoint.clientY);

        if (!speed) return;
        const before = scroller.scrollTop;
        scroller.scrollTop += speed;
        if (scroller.scrollTop === before) return;
        extend(g, lastPoint);
        frame = window.requestAnimationFrame(autoScroll);
      }

      function stopAutoScroll() {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        lastPoint = null;
      }

      /** Text and handle drags: move the selection's free end to the pointer. */
      function extend(
        g: Extract<Gesture, { kind: "text" } | { kind: "handle" }>,
        point: { clientX: number; clientY: number },
      ) {
        const g2 = geo.current;

        if (!g2) return;
        const at = liftedPoint(point.clientX, point.clientY);
        const next =
          g.kind === "text"
            ? ordered(g.anchor, hit(g2, at.x, at.y))
            : ordered(g.fixed, hit(g2, at.x + g.offsetX, at.y + g.offsetY));
        if (!sameRange(next, range.current)) drawSelection(next);
      }

      function move(event: PointerEvent) {
        const g = gesture.current;

        if (!g || event.pointerId !== g.pointerId) return;

        if (g.kind === "press") {
          const dx = event.clientX - g.x0;
          const dy = event.clientY - g.y0;

          if (Math.hypot(dx, dy) < SLOP) return;
          window.clearTimeout(g.timer);
          delete g.element.dataset.pressed;

          if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            gesture.current = {
              kind: "swipe",
              id: g.id,
              pointerId: g.pointerId,
              x0: g.x0,
              element: g.element,
              dx: 0,
            };
          } else {
            gesture.current = null;
          }
          return;
        }

        if (g.kind === "swipe") {
          const raw = Math.max(0, event.clientX - g.x0);
          // Follows the finger, then resists past the trigger.
          const dx = raw < 70 ? raw : 70 + (raw - 70) * 0.25;
          g.dx = dx;
          g.element.style.translate = `${dx}px 0`;
          const icon = g.element.parentElement?.querySelector<HTMLElement>(
            "[data-qr-swipe-icon]",
          );
          if (icon) {
            const p = clamp(dx / SWIPE_TRIGGER, 0, 1);
            icon.style.opacity = String(p);
            icon.style.scale = String(0.6 + 0.4 * p);
          }
          return;
        }

        const g2 = geo.current;
        if (!g2) return;

        if (g.kind === "held") {
          if (!g.moved && Math.hypot(event.clientX - g.x0, event.clientY - g.y0) < SLOP) {
            return;
          }
          // The finger keeps driving the words it pressed, wherever they lifted to.
          const x = (event.clientX - g.originX) / g.scale;
          const y = (event.clientY - g.originY) / g.scale;
          const x0 = (g.x0 - g.originX) / g.scale;
          const y0 = (g.y0 - g.originY) / g.scale;

          if (!g.moved) {
            g.moved = true;
            g.anchor = hit(g2, x0, y0);
            startSelecting();
          }
          const focus = hit(g2, x, y);
          const next = ordered(g.anchor ?? focus, focus);
          if (!sameRange(next, range.current)) {
            drawSelection(next);
            revealUnit(focus);
          }
          return;
        }

        if (g.kind === "text") {
          if (!g.moved && Math.hypot(event.clientX - g.x0, event.clientY - g.y0) < 4) {
            return;
          }
          if (!g.moved) {
            g.moved = true;
            startSelecting();
          }
        }

        if (g.kind === "text" || g.kind === "handle") {
          lastPoint = { clientX: event.clientX, clientY: event.clientY };
          extend(g, lastPoint);
          if (!frame && edgeSpeed(event.clientY)) {
            frame = window.requestAnimationFrame(autoScroll);
          }
        }
      }

      function up(event: PointerEvent) {
        const g = gesture.current;

        if (!g || event.pointerId !== g.pointerId) return;
        gesture.current = null;
        stopAutoScroll();

        if (g.kind === "press") {
          window.clearTimeout(g.timer);
          delete g.element.dataset.pressed;
          return;
        }

        if (g.kind === "swipe") {
          const element = g.element;
          const icon = element.parentElement?.querySelector<HTMLElement>(
            "[data-qr-swipe-icon]",
          );
          const from = g.dx;

          animate(from, 0, {
            duration: reduced ? 0 : 0.3,
            ease: EASE,
            onUpdate(v) {
              element.style.translate = `${v}px 0`;
              if (icon) icon.style.opacity = String(clamp(v / SWIPE_TRIGGER, 0, 1));
            },
          });
          if (from >= SWIPE_TRIGGER) {
            const message = messagesRef.current.find((m) => m.id === g.id);
            if (message) {
              panelText.set(1);
              setQuote(wholeQuote(message));
              focusComposer();
            }
          }
          return;
        }

        if (g.kind === "held") {
          // Chrome follows a long-press release with a click, which would land
          // on whatever lifted under the finger (the menu). iOS sends none.
          swallowNextClick();
          if (g.moved) commitSelection(range.current);
          return;
        }

        if (g.kind === "text") {
          if (!g.moved) {
            const units = liftRef.current ? unitsById.get(liftRef.current.id) : undefined;
            const word = units ? wordOf(units, g.anchor) : g.anchor;
            const next: Range = [word, word];

            if (!menuGone) setMenuGone(true);
            drawSelection(next, range.current === null);
            commitSelection(next);
            return;
          }
          commitSelection(range.current);
          return;
        }

        if (g.kind === "handle") {
          commitSelection(range.current);
          return;
        }

        if (g.kind === "dismiss") {
          if (Math.hypot(event.clientX - g.x0, event.clientY - g.y0) < SLOP) {
            closeLift();
          }
        }
      }

      function cancel(event: PointerEvent) {
        const g = gesture.current;

        if (!g || event.pointerId !== g.pointerId) return;
        stopAutoScroll();
        if (g.kind === "press") {
          window.clearTimeout(g.timer);
          delete g.element.dataset.pressed;
        }
        if (g.kind === "swipe") g.element.style.translate = "";
        gesture.current = null;
        if (g.kind === "held" || g.kind === "text" || g.kind === "handle") {
          commitSelection(range.current);
        }
      }

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);

      return function stop() {
        stopAutoScroll();
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
      };
    },
    // Handlers read refs; they're rebound when what they close over changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitsById, menuGone, reduced, device],
  );

  // Touch: once a long-press has lifted the message, the held finger selects
  // instead of scrolling, and no browser callout or menu appears.
  useEffect(function blockTouchDefaults() {
    const screen = screenRef.current;

    if (!screen) return;

    function touchMove(event: TouchEvent) {
      const g = gesture.current;

      if (liftRef.current || g?.kind === "swipe" || g?.kind === "held") {
        if (event.cancelable) event.preventDefault();
      }
    }

    function contextMenu(event: Event) {
      event.preventDefault();
    }

    screen.addEventListener("touchmove", touchMove, { passive: false });
    screen.addEventListener("contextmenu", contextMenu);

    return function stop() {
      screen.removeEventListener("touchmove", touchMove);
      screen.removeEventListener("contextmenu", contextMenu);
    };
  }, []);

  // Focus rings that a tap would also trigger (the text field) only show for keyboard users.
  useEffect(function trackModality() {
    const screen = screenRef.current;

    if (!screen) return;
    const target = screen;

    function keyboardUsed(event: KeyboardEvent) {
      if (event.key === "Tab" || event.key.startsWith("Arrow")) {
        target.dataset.modality = "keyboard";
      }
    }

    function pointerUsed() {
      delete target.dataset.modality;
    }

    window.addEventListener("keydown", keyboardUsed, true);
    window.addEventListener("pointerdown", pointerUsed, true);

    return function stop() {
      window.removeEventListener("keydown", keyboardUsed, true);
      window.removeEventListener("pointerdown", pointerUsed, true);
    };
  }, []);

  // A resize or rotation while lifted would leave the measurements stale.
  useEffect(
    function closeOnResize() {
      if (!lift) return;
      const screen = screenRef.current;

      if (!screen) return;
      let first = true;
      const observer = new ResizeObserver(function resized() {
        if (first) {
          first = false;
          return;
        }
        closeLift();
      });
      observer.observe(screen);

      return function stop() {
        observer.disconnect();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lift?.id],
  );

  // Centre the pill on the selection, inside the screen.
  useLayoutEffect(
    function positionPill() {
      const element = pillRef.current;
      const screen = screenRef.current;

      if (!pill || !element || !screen) return;
      const width = element.offsetWidth;
      const max = screen.offsetWidth - 8 - width;
      const left = clamp(pill.center - width / 2, 8, Math.max(8, max));
      const arrow = clamp(pill.center - left, 14, width - 14);

      element.style.left = `${left}px`;
      element.style.top = `${pill.top}px`;
      element.style.setProperty("--arrow", `${arrow}px`);
    },
    [pill],
  );

  /* Keyboard inside the lifted view ----------------------------------------- */

  function handleLiftedTextKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    const l = liftRef.current;
    const units = l ? unitsById.get(l.id) : undefined;

    if (!l || !units || l.phase !== "open") return;

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      setMenuGone(true);

      if (event.shiftKey) {
        const current = range.current;
        let next: Range;

        if (!current) {
          next = [caret, caret];
        } else {
          // Extend from the end the caret is on.
          const focusEnd = caret === current[0] && current[0] !== current[1] ? 0 : 1;
          const fixed = focusEnd === 0 ? current[1] : current[0];
          const moving = stepWord(units, current[focusEnd], direction);
          next = ordered(fixed, moving);
          setCaret(moving);
          revealUnit(moving);
        }
        drawSelection(next, !current);
        commitSelection(next);
        return;
      }

      const next = stepWord(units, caret, direction);
      setCaret(next);
      revealUnit(next);
      drawSelection(null);
      setSelection(null);
      setPill(null);
      setAnnouncement(units[next] ? l && messageWord(l.id, next) : "");
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (range.current) replyWithSelection();
      else replyWhole();
    }
  }

  function messageWord(id: string, index: number) {
    const message = messagesRef.current.find((m) => m.id === id);
    const unit = unitsById.get(id)?.[index];

    return message && unit ? message.text.slice(unit.start, unit.end) : "";
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLift(true);
      return;
    }

    if (event.key === "Tab") {
      // Keep focus inside the dialog.
      const root = event.currentTarget;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          "[data-qr-lifted] [data-qr-text], button:not([disabled])",
        ),
      ).filter((el) => el.offsetParent !== null && el.getAttribute("tabindex") !== "-1");

      if (focusables.length === 0) return;
      const index = focusables.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? index <= 0
          ? focusables.length - 1
          : index - 1
        : index === focusables.length - 1
          ? 0
          : index + 1;

      event.preventDefault();
      focusables[next].focus();
    }
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const vertical = event.currentTarget.getAttribute("aria-orientation") !== "horizontal";
    const forward = vertical ? "ArrowDown" : "ArrowRight";
    const back = vertical ? "ArrowUp" : "ArrowLeft";

    if (event.key !== forward && event.key !== back && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]"),
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = index;

    if (event.key === forward) next = (index + 1) % items.length;
    if (event.key === back) next = (index - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    items[next]?.focus();
  }

  /* Composer ------------------------------------------------------------------ */

  const autoShift = draft === "" || /[.!?]\s+$/.test(draft);
  const shift = manualShift ?? autoShift;

  function setDraftText(next: string) {
    setDraft(next);
    setManualShift(null);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    setDraftText(event.target.value);
  }

  function nextTime() {
    sent.current += 1;
    const minutes = 41 + sent.current;

    return `10:${String(minutes).padStart(2, "0")}`;
  }

  function send() {
    const text = draft.trim();

    if (!text) return;
    const id = `r${sent.current + 1}`;
    const current = quoteRef.current;
    const message: ChatMessage = {
      id,
      from: "me",
      text,
      time: nextTime(),
      quote: current ?? undefined,
      ticks: 0,
    };

    stuck.current = true;
    setMessages((list) => [...list, message]);
    setDraft("");
    setManualShift(null);
    setQuote(null);
    setArriving(id);
    later(() => setArriving((a) => (a === id ? null : a)), 360);
    later(() => setTicks(id, 1), 600);
    later(() => setTicks(id, 2), 1200);

    if (edits && current && current.messageId === "m3") {
      later(function editOriginal() {
        setMessages((list) =>
          list.map((m) =>
            m.id === "m3" && !m.edited ? { ...m, text: ADA_EDITED, edited: true } : m,
          ),
        );
      }, 1500);
    }
  }

  function setTicks(id: string, ticks: 0 | 1 | 2) {
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ticks } : m)));
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    keyboardApi.current?.flash(event.key);

    if (event.key === "Enter") {
      event.preventDefault();
      send();
    }
  }

  function typeFromKeyboard(key: string) {
    const input = inputRef.current;

    if (!input) return;
    if (key === "Enter") {
      send();
      return;
    }
    if (key === "Shift") {
      setManualShift(!shift);
      return;
    }

    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    let next = draft;
    let caretAt = start;

    if (key === "Backspace") {
      if (start === end && start > 0) {
        next = draft.slice(0, start - 1) + draft.slice(end);
        caretAt = start - 1;
      } else {
        next = draft.slice(0, start) + draft.slice(end);
      }
    } else {
      next = draft.slice(0, start) + key + draft.slice(end);
      caretAt = start + key.length;
    }

    setDraftText(next);
    requestAnimationFrame(function placeCaret() {
      input.setSelectionRange(caretAt, caretAt);
    });
  }

  function removeQuote() {
    setQuote(null);
    inputRef.current?.focus({ preventScroll: true });
  }

  function handleChatPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    if (!keyboard || target.closest("button, [data-qr-quote]")) return;
    const x0 = event.clientX;
    const y0 = event.clientY;
    const pointerId = event.pointerId;

    function release(up: PointerEvent) {
      window.removeEventListener("pointerup", release);
      if (up.pointerId !== pointerId) return;
      if (liftRef.current) return;
      if (Math.hypot(up.clientX - x0, up.clientY - y0) < SLOP) {
        inputRef.current?.blur();
        setKeyboard(false);
      }
    }

    window.addEventListener("pointerup", release);
  }

  /* Jump to a quoted message ----------------------------------------------- */

  function jumpTo(source: Quote) {
    const scroller = scrollRef.current;
    const bubble = bubbles.current.get(source.messageId);
    const bar = barRef.current;
    const original = messagesRef.current.find((m) => m.id === source.messageId);

    // Deleted for everyone: WhatsApp (iOS 25.12.73+) removes the quote. Not in the demo.
    if (!scroller || !bubble || !bar || !original) return;

    const scrollBox = scroller.getBoundingClientRect();
    const box = bubble.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    const visibleTop = scrollBox.top + (device ? 59 : 8) + 44;
    const visibleBottom = barBox.top;
    const height = box.height;
    const middle = (visibleTop + visibleBottom) / 2;
    const desired =
      height > visibleBottom - visibleTop - 24
        ? box.top - (visibleTop + 12)
        : box.top + height / 2 - middle;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const from = scroller.scrollTop;
    const to = clamp(from + desired, 0, max);
    const distance = Math.abs(to - from);

    function highlight() {
      if (!stillMatches(source, original)) {
        setFlash((f) => ({ id: source.messageId, n: (f?.n ?? 0) + 1 }));
        return;
      }
      const text = texts.current.get(source.messageId);
      const units = unitsById.get(source.messageId);
      const r = units ? rangeOfQuote(units, source) : null;

      if (!text || !r) return;
      const bands = bandsOf(measure(text), r);
      setJump((j) => ({ id: source.messageId, bands, n: (j?.n ?? 0) + 1 }));
    }

    if (distance < 2 || reduced) {
      if (distance >= 2) scroller.scrollTop = to;
      highlight();
      return;
    }

    animate(from, to, {
      duration: clamp(0.33 + distance / 2400, 0.33, 0.7),
      ease: EASE,
      onUpdate(v) {
        scroller.scrollTop = v;
      },
      onComplete: highlight,
    });
  }

  /* Render ------------------------------------------------------------------ */

  const liftedMessage = lift ? messages.find((m) => m.id === lift.id) : undefined;
  const showPill = Boolean(lift && selection && pill && !dragging && !leaving);
  const pillQuote =
    lift && liftedMessage && selection
      ? quoteOf(liftedMessage, unitsById.get(lift.id) ?? [], selection[0], selection[1])
      : null;

  function renderBubble(
    message: ChatMessage,
    options: {
      tail: boolean;
      lifted?: boolean;
      textRef?: RefObject<HTMLParagraphElement | null>;
      layers?: ReactNode;
      /** Lifted and too tall: the words and time scroll inside the bubble. */
      clip?: number | null;
    },
  ) {
    const units = unitsById.get(message.id) ?? [];
    const quoted = message.quote;
    const original = quoted
      ? messages.find((m) => m.id === quoted.messageId)
      : undefined;
    const quoteSnippet = quoted
      ? snippetText(quoted, original?.text.length ?? quoted.end + (quoted.partial ? 1 : 0))
      : "";
    const isAda = message.from === "ada";
    const lifted = options.lifted ?? false;
    const label = `${isAda ? "Ada" : "You"}, ${message.time}${message.edited ? ", edited" : ""}: ${message.text}`;

    return (
      <div
        data-qr-bubble
        data-quoted={quoted ? "" : undefined}
        data-hidden={!lifted && lift?.id === message.id ? "" : undefined}
        ref={
          lifted
            ? undefined
            : function register(element) {
                if (element) bubbles.current.set(message.id, element);
                else bubbles.current.delete(message.id);
              }
        }
        tabIndex={!lifted && isAda ? 0 : undefined}
        role={!lifted && isAda ? "button" : undefined}
        aria-haspopup={!lifted && isAda ? "dialog" : undefined}
        aria-label={!lifted && isAda ? label : undefined}
        aria-describedby={!lifted && isAda ? "qr-bubble-help" : undefined}
        onPointerDown={
          !lifted && isAda
            ? (event) => handleBubblePointerDown(event, message.id)
            : undefined
        }
        onContextMenu={
          !lifted && isAda
            ? (event) => handleBubbleContextMenu(event, message.id)
            : undefined
        }
        onKeyDown={
          !lifted && isAda ? (event) => handleBubbleKeyDown(event, message.id) : undefined
        }
      >
        {quoted && (
          <button
            type="button"
            data-qr-quote
            aria-label={`Go to Ada's message: ${quoted.text}`}
            onClick={() => jumpTo(quoted)}
            tabIndex={lifted ? -1 : undefined}
          >
            <span data-qr-quote-name>Ada</span>
            <span data-qr-quote-text>{quoteSnippet}</span>
          </button>
        )}
        {options.clip != null ? (
          <div
            data-qr-lift-scroll
            ref={liftScrollRef}
            style={{ maxHeight: options.clip + LIFT_PAD }}
            onScroll={handleLiftScroll}
          >
            <div data-qr-lift-scroll-inner>
            <p
              data-qr-text
              ref={
                options.textRef ??
                function register(element) {
                  if (element) texts.current.set(message.id, element);
                  else texts.current.delete(message.id);
                }
              }
              {...(lifted
                ? {
                    tabIndex: 0,
                    role: "textbox",
                    "aria-readonly": true,
                    "aria-multiline": true,
                    "aria-label": "Message text",
                    "aria-describedby": "qr-text-help",
                    onKeyDown: handleLiftedTextKeyDown,
                  }
                : { "aria-hidden": isAda ? true : undefined })}
            >
              {options.layers}
              <Words text={message.text} units={units} />
              <span data-qr-meta-space aria-hidden="true" />
            </p>
            <span data-qr-meta aria-hidden={isAda ? true : undefined}>
              {message.edited ? "Edited " : ""}
              {message.time}
              {message.ticks !== undefined && <Ticks state={message.ticks} />}
            </span>
            </div>
          </div>
        ) : (
          <>
          <p
            data-qr-text
            ref={
              options.textRef ??
              function register(element) {
                if (element) texts.current.set(message.id, element);
                else texts.current.delete(message.id);
              }
            }
            {...(lifted
              ? {
                  tabIndex: 0,
                  role: "textbox",
                  "aria-readonly": true,
                  "aria-multiline": true,
                  "aria-label": "Message text",
                  "aria-describedby": "qr-text-help",
                  onKeyDown: handleLiftedTextKeyDown,
                }
              : { "aria-hidden": isAda ? true : undefined })}
          >
            {options.layers}
            <Words text={message.text} units={units} />
            <span data-qr-meta-space aria-hidden="true" />
          </p>
          <span data-qr-meta aria-hidden={isAda ? true : undefined}>
            {message.edited ? "Edited " : ""}
            {message.time}
            {message.ticks !== undefined && <Ticks state={message.ticks} />}
          </span>
          </>
        )}
        {!lifted && flash?.id === message.id && (
          <motion.span
            key={`flash-${flash.n}`}
            data-qr-flash
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.69, times: [0, 0.25, 0.78, 1], ease: "easeOut" }}
          />
        )}
        <Surface tail={options.tail && !lifted} />
      </div>
    );
  }

  const rows = messages.map(function row(message, index) {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const groupStart = !previous || previous.from !== message.from;
    const tail = !next || next.from !== message.from;
    const side = message.from === "me" ? "out" : "in";
    const isNew = message.id.startsWith("r");
    const jumpBands = jump?.id === message.id ? jump.bands : null;

    const content = (
      <div data-qr-row data-side={side} data-group-start={groupStart ? "" : undefined}>
        {message.from === "ada" && (
          <span data-qr-swipe-icon aria-hidden="true" style={{ opacity: 0 }}>
            <ReplyIcon />
          </span>
        )}
        {renderBubble(message, {
          tail,
          layers: jumpBands ? (
            <motion.span
              key={`jump-${jump?.n}`}
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, zIndex: -1 }}
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: reduced ? [1, 1, 0] : [0, 1, 1, 0] }}
              transition={
                reduced
                  ? { duration: 1.8, times: [0, 0.33, 1], ease: "linear" }
                  : { duration: 1.95, times: [0, 0.077, 0.385, 1], ease: "easeOut" }
              }
            >
              {jumpBands.map(function band(b) {
                return (
                  <span
                    key={b.line}
                    data-qr-band
                    data-kind="jump"
                    style={{ transform: `translate(${b.left}px, ${b.line * LINE}px)`, width: b.right - b.left }}
                  />
                );
              })}
            </motion.span>
          ) : undefined,
        })}
      </div>
    );

    if (!isNew) return <Fragment key={message.id}>{content}</Fragment>;

    return (
      <motion.div
        key={message.id}
        initial={reduced ? false : { height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        transition={{ height: { duration: 0.3, ease: EASE }, opacity: { duration: 0.2, ease: EASE } }}
        style={{ overflow: "visible" }}
        onUpdate={function pin() {
          const scroller = scrollRef.current;
          if (scroller && stuck.current) scroller.scrollTop = scroller.scrollHeight;
        }}
      >
        {content}
      </motion.div>
    );
  });

  const hasText = draft.trim().length > 0;
  const panelQuoteSnippet = quote
    ? snippet(quote, messages.find((m) => m.id === quote.messageId)?.text.length ?? quote.text.length)
    : null;

  return (
    <div
      ref={screenRef}
      data-qr-screen
      data-device={device ? "" : undefined}
    >
      <div
        data-qr-scroll
        ref={scrollRef}
        onPointerDown={handleChatPointerDown}
      >
        <div data-qr-thread>
          <p data-qr-date>Today</p>
          {rows}
          <div
            ref={spacerRef}
            aria-hidden="true"
            style={{ height: "calc(var(--qr-bottom) + 52px)", flex: "0 0 auto" }}
          />
        </div>
      </div>

      <header data-qr-header>
        <button type="button" data-qr-back aria-label="Back to chats">
          <HeaderBack />
        </button>
        <DefaultAvatar />
        <div data-qr-who>
          <strong>Ada</strong>
          <span>online</span>
        </div>
        <span data-qr-calls aria-hidden="true">
          <VideoIcon />
          <PhoneIcon />
        </span>
      </header>

      <motion.div data-qr-bar ref={barRef} style={{ y: barY }}>
        <motion.div data-qr-panel-clip style={{ height: panel }}>
          <motion.div data-qr-panel style={{ opacity: panelOpacity }}>
            <AnimatePresence initial={false}>
              {quote && panelQuoteSnippet && (
                <motion.div
                  key={`${quote.messageId}:${quote.start}:${quote.end}`}
                  data-qr-panel-quote
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <span data-qr-panel-name>Ada</span>
                  <motion.span data-qr-panel-text style={{ opacity: panelText }}>
                    {panelQuoteSnippet.before}
                    <span ref={panelTextRef}>{panelQuoteSnippet.text}</span>
                    {panelQuoteSnippet.after}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              data-qr-panel-close
              data-qr-press
              aria-label="Remove the quote"
              tabIndex={quote ? 0 : -1}
              onPointerDown={(event) => event.preventDefault()}
              onClick={removeQuote}
            >
              <CloseCircleIcon />
            </button>
          </motion.div>
        </motion.div>

        <div data-qr-row-bar>
          <span data-qr-round aria-hidden="true">
            <PlusIcon />
          </span>
          <label data-qr-field>
            <span className="sr-only">
              {quote ? `Message, replying to Ada: ${quote.text}` : "Message"}
            </span>
            <input
              ref={inputRef}
              data-qr-input
              type="text"
              value={draft}
              inputMode={device ? "none" : undefined}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              onChange={handleInput}
              onKeyDown={handleInputKeyDown}
              onFocus={() => device && setKeyboard(true)}
            />
            <span data-qr-sticker aria-hidden="true">
              <StickerIcon />
            </span>
          </label>
          <motion.span
            data-qr-camera
            aria-hidden="true"
            initial={false}
            animate={{ width: hasText ? 8 : 47, opacity: hasText ? 0 : 1 }}
            transition={{ duration: 0.22, ease: EASE }}
            style={{ height: 44 }}
          >
            <CameraIcon />
          </motion.span>
          <span data-qr-send-slot>
            <AnimatePresence initial={false}>
              {hasText ? (
                <motion.button
                  key="send"
                  type="button"
                  data-qr-send
                  aria-label="Send"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={POP}
                  whileTap={{ scale: 0.94 }}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={send}
                >
                  <SendIcon />
                </motion.button>
              ) : (
                <motion.span
                  key="mic"
                  data-qr-mic
                  aria-hidden="true"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={POP}
                >
                  <MicIcon />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </div>
        <div data-qr-inset />
      </motion.div>

      {device && (
        <motion.div data-qr-keyboard-layer style={{ y: keyboardY }}>
          <IosKeyboard shift={shift} apiRef={keyboardApi} onType={typeFromKeyboard} />
        </motion.div>
      )}

      {lift && liftedMessage && (
        <div
          data-qr-overlay
          role="dialog"
          aria-modal="true"
          aria-label="Message actions"
          onPointerDown={handleOverlayPointerDown}
          onKeyDown={handleDialogKeyDown}
        >
          <motion.div data-qr-backdrop style={{ opacity: backdrop }} />

          <AnimatePresence>
            {!menuGone && !leaving && (
              <motion.div
                key="reactions"
                data-qr-reactions
                role="toolbar"
                aria-label="React"
                style={{
                  left: lift.side === "in" ? 16 : undefined,
                  right: lift.side === "out" ? 16 : undefined,
                  top: lift.reactionsTop,
                }}
                initial={{ opacity: 0, scale: 0.86, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: FADE }}
                transition={{ ...POP, delay: 0.06 }}
              >
                {REACTIONS.map(function reaction(emoji, i) {
                  return (
                    <motion.button
                      key={emoji}
                      type="button"
                      data-qr-emoji-button
                      aria-label={`React with ${emoji}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...POP, delay: 0.08 + i * 0.018 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => closeLift(true)}
                    >
                      {emoji}
                    </motion.button>
                  );
                })}
                <button
                  type="button"
                  data-qr-react-more
                  data-qr-press
                  aria-label="More reactions"
                  onClick={() => closeLift(true)}
                >
                  <PlusIcon />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            ref={liftedRef}
            data-qr-lifted
            data-side={lift.side}
            style={{ x: lift.left, y: liftY, width: lift.width }}
          >
            {renderBubble(liftedMessage, {
              tail: false,
              lifted: true,
              textRef: liftedTextRef,
              clip: lift.clip,
              layers: (
                <motion.span
                  aria-hidden="true"
                  style={{ position: "absolute", inset: 0, opacity: tintOpacity }}
                >
                  {layers.map(function band(layer, line) {
                    return (
                      <motion.span
                        key={line}
                        data-qr-band
                        style={{ x: layer.x, y: line * LINE, width: layer.w, opacity: layer.o }}
                      />
                    );
                  })}
                  {lift.keyboard && !selection && (
                    <Caret geo={geo} caret={caret} />
                  )}
                  <motion.span
                    data-qr-handle
                    data-end="start"
                    style={{ x: startX, y: startY, opacity: handles, display: selection || dragging ? undefined : "none" }}
                  >
                    <i />
                    <b />
                  </motion.span>
                  <motion.span
                    data-qr-handle
                    data-end="end"
                    style={{ x: endX, y: endY, opacity: handles, display: selection || dragging ? undefined : "none" }}
                  >
                    <i />
                    <b />
                  </motion.span>
                </motion.span>
              ),
            })}
          </motion.div>

          <AnimatePresence>
            {!menuGone && !leaving && (
              <motion.div
                key="menu"
                data-qr-menu
                role="menu"
                aria-label="Message"
                aria-orientation="vertical"
                style={{
                  left: lift.side === "in" ? 16 : undefined,
                  right: lift.side === "out" ? 16 : undefined,
                  top: lift.menuTop,
                }}
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: FADE }}
                transition={{ ...POP, delay: 0.06 }}
                onKeyDown={handleMenuKeyDown}
              >
                <MenuItem label="Reply" icon={<ReplyIcon />} onSelect={replyWhole} />
                <MenuItem label="Forward" icon={<ForwardIcon />} onSelect={() => closeLift(true)} />
                <MenuItem label="Copy" icon={<CopyIcon />} onSelect={copyWhole} />
                <MenuItem label="Ask Meta AI" icon={<AskIcon />} onSelect={() => closeLift(true)} />
                <MenuItem label="Delete" danger icon={<TrashIcon />} onSelect={() => closeLift(true)} />
                <div data-qr-menu-gap role="separator" />
                <MenuItem label="More…" icon={<MoreIcon />} onSelect={() => closeLift(true)} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showPill && pill && (
              <motion.div
                key="pill"
                ref={pillRef}
                data-qr-pill
                role="menu"
                aria-label="Selection"
                aria-orientation="horizontal"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE } }}
                transition={{ duration: 0.16, ease: EASE }}
                style={{ transformOrigin: `var(--arrow) ${pill.below ? "0%" : "100%"}` }}
                onKeyDown={handleMenuKeyDown}
              >
                <div data-qr-pill-body>
                  <PillItem label="Copy" onSelect={copySelection} />
                  <PillItem
                    label="Reply"
                    ariaLabel={pillQuote ? `Reply, quoting: ${pillQuote.text}` : "Reply"}
                    onSelect={replyWithSelection}
                  />
                  <PillItem label="Look Up" onSelect={dismissPill} />
                  <PillItem label="Share…" onSelect={dismissPill} />
                </div>
                <svg
                  data-qr-pill-arrow
                  data-below={pill.below ? "" : undefined}
                  viewBox="0 0 14 6"
                  aria-hidden="true"
                  style={{ left: "var(--arrow)", [pill.below ? "top" : "bottom"]: -5.5 }}
                >
                  <path d="M0 0h14L8.1 5.4a1.6 1.6 0 01-2.2 0z" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {ghost && (
        <div ref={ghostRef} data-qr-ghost aria-hidden="true">
          {ghost.lines.map(function line(l, i) {
            return (
              <span key={i} style={{ transform: `translate(${l.left}px, ${l.top}px)` }}>
                {l.text}
              </span>
            );
          })}
        </div>
      )}

      {device && <StatusBar />}
      {device && <HomeIndicator />}

      <p id="qr-bubble-help" className="sr-only">
        Press Enter for message actions.
      </p>
      <p id="qr-text-help" className="sr-only">
        Left and right arrows move by word. Shift with an arrow selects. Enter
        replies, quoting the selection. Escape closes.
      </p>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function sameRange(a: Range | null, b: Range | null) {
  return a !== null && b !== null && a[0] === b[0] && a[1] === b[1];
}

function useOpacityFromPanel(panel: MotionValue<number>) {
  const opacity = useMotionValue(0);

  useMotionValueEvent(panel, "change", function follow(height) {
    opacity.set(clamp(height / PANEL, 0, 1));
  });

  return opacity;
}

function useKeyboardY(keys: MotionValue<number>) {
  const y = useMotionValue(KEYBOARD_HEIGHT);

  useMotionValueEvent(keys, "change", function follow(height) {
    y.set(KEYBOARD_HEIGHT - height);
  });

  return y;
}

function Caret({ geo, caret }: { geo: RefObject<Geometry | null>; caret: number }) {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(
    function place() {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBox(geo.current?.boxes[caret]?.[0] ?? null);
    },
    [geo, caret],
  );

  if (!box) return null;

  return (
    <span
      data-qr-caret
      style={{ transform: `translate(${box.left - 1}px, ${box.line * LINE}px)` }}
    />
  );
}

function MenuItem({
  label,
  icon,
  danger,
  onSelect,
}: {
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-qr-menu-item
      data-danger={danger ? "" : undefined}
      onClick={onSelect}
    >
      <span>{label}</span>
      {icon}
    </button>
  );
}

function PillItem({
  label,
  ariaLabel,
  onSelect,
}: {
  label: string;
  ariaLabel?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-qr-pill-item
      aria-label={ariaLabel}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
