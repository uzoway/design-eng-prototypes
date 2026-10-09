"use client";

import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import type { AnimationPlaybackControls, MotionValue } from "motion/react";
import {
  Fragment,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import note from "./voice-note-words.json";
import {
  BackIcon,
  CameraIcon,
  LockIcon,
  MicBadgeGlyph,
  MicIcon,
  PhoneIcon,
  PlusIcon,
  ReadTicks,
  StickerIcon,
  VideoIcon,
} from "./icons";

type Word = {
  text: string;
  start: number;
  end: number;
  confidence: number;
  /** For a word the model wasn't sure about: its runner-up guess. */
  alternative?: string;
};

/** The check card for a dotted word, placed in transcript coordinates. */
type Check = {
  index: number;
  x: number;
  caret: number;
  top: number;
  below: boolean;
  focus: boolean;
};

type Paragraph = {
  first: number;
  last: number;
  start: number;
};

/** A word's box inside the transcript, and which visual line it sits on. */
type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  line: number;
};

/** fresh: never played. live: playing or paused mid-way. ended: played to the end. */
type Mode = "fresh" | "live" | "ended";

type Move = "glide" | "tap" | "snap";

type AudioGraph = {
  context: AudioContext;
  gain: GainNode;
};

type HighlightLayer = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: MotionValue<number>;
  height: MotionValue<number>;
  opacity: MotionValue<number>;
  scale: MotionValue<number>;
};

type Engine = {
  tick: () => void;
  ended: () => void;
  measure: () => void;
  resync: () => void;
  anchor: () => void;
  yieldToOther: () => void;
};

const SRC = note.src;
const DURATION = note.duration;
const PEAKS = note.peaks;
const SHORT = note.short;

const LOW_CONFIDENCE = 0.6;
const MIN_WORD = 0.05;
const PARAGRAPH_GAP = 1;

// Overlapping or zero-length timestamps would make the highlight stall or
// skip, so every word gets at least 50ms and never starts before the last.
const WORDS: Word[] = note.words.reduce<Word[]>(function clampWord(list, word) {
  const previous = list[list.length - 1];
  const start = previous
    ? Math.max(word.start, previous.start + 0.01)
    : word.start;

  list.push({ ...word, start, end: Math.max(word.end, start + MIN_WORD) });

  return list;
}, []);

const PARAGRAPHS: Paragraph[] = WORDS.reduce<Paragraph[]>(function split(
  list,
  word,
  index,
) {
  const previous = WORDS[index - 1];

  if (!previous || word.start - previous.end > PARAGRAPH_GAP) {
    list.push({ first: index, last: index, start: word.start });
  } else {
    list[list.length - 1].last = index;
  }

  return list;
}, []);

// One curve for everything that travels: fast out of the gate, long soft landing.
const EASE = [0.32, 0.72, 0, 1] as const;
const GLIDE = { duration: 0.11, ease: EASE };
const LINE_FADE = { duration: 0.09, ease: EASE };
const SETTLE = { duration: 0.18, ease: EASE };
const PROGRESS_GLIDE = { duration: 0.24, ease: EASE };
const OPEN = { duration: 0.32, ease: EASE };
const SWAP = { duration: 0.2, ease: EASE };

const SPEEDS = [1, 1.5, 2] as const;

/** Every voice note announces when it starts, so the others can stop. */
const EXCLUSIVE_EVENT = "vn:play";

/** Seek a touch early so the start of the word isn't clipped. */
const PRE_ROLL = 0.08;
/** A low-confidence word plays with a little air either side. */
const STRETCH_BEFORE = 0.12;
const STRETCH_AFTER = 0.05;
/** De-click: dip to silence, move, come back up. */
const SEEK_OUT_MS = 40;
const SEEK_IN_MS = 80;
const PAUSE_FADE_MS = 70;
/**
 * The highlight starts its 110ms glide a little early so it lands as the
 * word is heard, not a beat after.
 */
const LEAD = 0.045;

const PREVIEW_LINES = 3;
const PAD_X = 2;
const PAD_Y = 1;

const INTRO_RECORDING_AT = 700;
const INTRO_ARRIVES_AT = 3400;
const TRANSCRIBING_MS = 900;

const GREEN = "#00a85a";

const HINTS = [
  "Tap any word to play from there",
  "Dotted words are guesses. Tap one to check it",
  "Drag the waveform. The words follow",
  "Hold and drag across words to copy them",
];
const BLUE = "#53bdeb";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));

  return `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, "0")}`;
}

function spokenTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  const secondsText = `${remainder} second${remainder === 1 ? "" : "s"}`;

  return minutes === 0
    ? secondsText
    : `${minutes} minute${minutes === 1 ? "" : "s"} ${secondsText}`;
}

const TOTAL_LABEL = formatTime(Math.round(DURATION));

const CHECK_WIDTH = 256;

function bare(text: string) {
  return text.replace(/[^\w'-]/g, "");
}

/** The last word that has started by `time`, or -1 before the first. */
function wordAt(time: number) {
  let low = 0;
  let high = WORDS.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (WORDS[middle].start <= time) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

// A faint doodle wallpaper, drawn for this prototype.
const DOODLES = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none" stroke="STROKE" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="OPACITY">
  <path d="M38 46c-7-5-11-9-11-13.5a5.5 5.5 0 0 1 11-1.7 5.5 5.5 0 0 1 11 1.7C49 37 45 41 38 46z"/>
  <path d="M118 20l3.2 6.6 7.2 1-5.2 5 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.2-5 7.2-1z"/>
  <path d="M196 24h30a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6h-18l-8 7v-7h-4a6 6 0 0 1-6-6V30a6 6 0 0 1 6-6z"/>
  <path d="M206 37h14"/>
  <path d="M268 84v22a5 5 0 1 1-3-4.6V88l12-3v17a5 5 0 1 1-3-4.6"/>
  <path d="M54 104h22v14a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z"/>
  <path d="M76 109h3a4 4 0 0 1 0 8h-3"/>
  <path d="M60 97c0-3 3-3 3-6M68 97c0-3 3-3 3-6"/>
  <path d="M162 88a14 14 0 1 0 12 22 11 11 0 1 1-12-22z"/>
  <path d="M212 168l40-16-14 38-8-14z"/>
  <path d="M230 176l8-14"/>
  <path d="M26 196a10 10 0 0 1 19-4 8 8 0 0 1 13 8h-32a6 6 0 0 1 0-4z"/>
  <circle cx="128" cy="178" r="15"/>
  <path d="M122 175h.1M134 175h.1M121 184c4 4 10 4 14 0"/>
  <path d="M176 252c0-16 12-26 28-26 0 16-12 26-28 26z"/>
  <path d="M176 252l18-16"/>
  <path d="M56 252h30a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H56a4 4 0 0 1-4-4v-18a4 4 0 0 1 4-4z"/>
  <path d="M64 252l4-6h14l4 6"/>
  <circle cx="71" cy="265" r="6"/>
  <path d="M264 230l-10 18h10l-8 18"/>
  <path d="M96 60v8M92 64h8"/>
  <path d="M182 134v8M178 138h8"/>
  <path d="M22 132v8M18 136h8"/>
  <path d="M278 12v8M274 16h8"/>
  <path d="M120 226a12 12 0 0 1 12 12c0 9-12 16-12 16s-12-7-12-16a12 12 0 0 1 12-12z"/>
  <path d="M120 254v12"/>
  <circle cx="250" cy="134" r="7"/>
  <path d="M250 120v3M250 145v3M236 134h3M261 134h3"/>
</svg>`;

function wallpaper(stroke: string, opacity: number) {
  const svg = DOODLES.trim()
    .replace("STROKE", stroke)
    .replace("OPACITY", String(opacity));

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const WALLPAPER_LIGHT = wallpaper("#b9ab94", 0.42);
const WALLPAPER_DARK = wallpaper("#ffffff", 0.07);

/** iOS bubble tail: the bubble's bottom corner flicks out into a point. */
function Tail() {
  return (
    <svg data-vn-tail viewBox="0 0 12 17" aria-hidden="true">
      <path d="M6 0v9.6c0 3.4-1.8 6-5.2 7-.5.15-.4.4.1.4H12V0z" />
    </svg>
  );
}

/**
 * The bubble's fill, tail and shadow live on their own layer behind the
 * content. The shadow is a filter, and a filter on the bubble itself would
 * re-rasterise the whole message every frame its text animates.
 */
function Surface() {
  return (
    <span data-vn-surface aria-hidden="true">
      <Tail />
    </span>
  );
}

function PlayGlyph({ state }: { state: "play" | "pause" | "loading" }) {
  const transition = { duration: 0.16, ease: EASE };

  return (
    <span data-vn-glyphs aria-hidden="true">
      <motion.svg
        viewBox="0 0 24 24"
        data-vn-glyph
        initial={false}
        animate={{
          opacity: state === "play" ? 1 : 0,
          scale: state === "play" ? 1 : 0.8,
        }}
        transition={transition}
      >
        <path
          d="M7.2 4.9c0-.95 1.03-1.55 1.86-1.08l11.2 6.42c.83.48.83 1.68 0 2.16L9.06 18.83c-.83.47-1.86-.13-1.86-1.08z"
          fill="currentColor"
        />
      </motion.svg>
      <motion.svg
        viewBox="0 0 24 24"
        data-vn-glyph
        initial={false}
        animate={{
          opacity: state === "pause" ? 1 : 0,
          scale: state === "pause" ? 1 : 0.8,
        }}
        transition={transition}
      >
        <rect
          x="6"
          y="4.2"
          width="4.2"
          height="15.6"
          rx="1.3"
          fill="currentColor"
        />
        <rect
          x="13.8"
          y="4.2"
          width="4.2"
          height="15.6"
          rx="1.3"
          fill="currentColor"
        />
      </motion.svg>
      <motion.span
        data-vn-spinner
        initial={false}
        animate={{ opacity: state === "loading" ? 1 : 0 }}
        transition={{
          duration: 0.16,
          ease: EASE,
          delay: state === "loading" ? 0.15 : 0,
        }}
      />
    </span>
  );
}

/** WhatsApp draws the quiet parts of a voice note as dots, not bars. */
function Bars({ peaks, played }: { peaks: number[]; played?: boolean }) {
  return (
    <span
      data-vn-bars
      data-played={played ? "true" : undefined}
      aria-hidden="true"
    >
      {peaks.map(function bar(peak, index) {
        const dot = peak < 0.2;

        return (
          <i
            key={index}
            data-dot={dot ? "true" : undefined}
            style={
              dot ? undefined : { height: `${Math.round(5 + peak * 21)}px` }
            }
          />
        );
      })}
    </span>
  );
}

/** WhatsApp's default avatar for a contact without a photo. */
function DefaultAvatar({ size }: { size: "header" | "note" }) {
  return (
    <span data-vn-avatar data-size={size} aria-hidden="true">
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

/**
 * "Recording audio": a small bubble with a mic. It swings in from its tail
 * corner, and the mic follows it in, pivoting on the same corner.
 */
function RecordingBubble() {
  return (
    <span data-vn-recording aria-hidden="true">
      <Surface />
      <motion.span
        data-vn-recording-mic
        initial={{ rotate: -55, scale: 0.5, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3, delay: 0.1 }}
        style={{ transformOrigin: "0% 100%" }}
      />
    </span>
  );
}

type ShortNote = {
  src: string;
  duration: number;
  peaks: number[];
};

/**
 * Yesterday's voice note, in Pidgin. Transcripts don't cover it, so this is
 * the unavailable state, living in the chat where it would really happen.
 */
function UnsupportedVoiceNote({
  note: short,
  time,
}: {
  note: ShortNote;
  time: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [listened, setListened] = useState(false);
  const progress = useMotionValue(0);
  const label = useMotionValue(formatTime(Math.round(short.duration)));
  const playedClip = useTransform(progress, function toClip(value) {
    return `inset(0 ${(1 - clamp(value, 0, 1)) * 100}% 0 0)`;
  });
  const knobLeft = useTransform(progress, function toLeft(value) {
    return `${clamp(value, 0, 1) * 100}%`;
  });

  useEffect(
    function bindShortAudio() {
      const audio = audioRef.current;

      if (audio === null) {
        return;
      }

      const media: HTMLAudioElement = audio;
      let frame = 0;

      function loop() {
        progress.set(media.currentTime / short.duration);
        label.set(formatTime(media.currentTime));
        frame = requestAnimationFrame(loop);
      }

      function handlePlay() {
        setPlaying(true);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(loop);
        document.dispatchEvent(
          new CustomEvent(EXCLUSIVE_EVENT, { detail: "short" }),
        );
      }

      function handlePause() {
        setPlaying(false);
        cancelAnimationFrame(frame);
      }

      function handleEnded() {
        handlePause();
        setListened(true);
        progress.set(1);
        label.set(formatTime(Math.round(short.duration)));
      }

      function handleOtherPlay(event: Event) {
        const detail = (event as CustomEvent<string>).detail;

        if (detail === "reset") {
          media.pause();
          media.currentTime = 0;
          progress.set(0);
          label.set(formatTime(Math.round(short.duration)));
          setListened(false);
          return;
        }

        if (detail !== "short") {
          media.pause();
        }
      }

      media.addEventListener("play", handlePlay);
      media.addEventListener("pause", handlePause);
      media.addEventListener("ended", handleEnded);
      document.addEventListener(EXCLUSIVE_EVENT, handleOtherPlay);

      return function cleanup() {
        cancelAnimationFrame(frame);
        media.removeEventListener("play", handlePlay);
        media.removeEventListener("pause", handlePause);
        media.removeEventListener("ended", handleEnded);
        document.removeEventListener(EXCLUSIVE_EVENT, handleOtherPlay);
      };
    },
    [label, progress, short.duration],
  );

  function toggle() {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    if (audio.paused) {
      if (audio.ended || audio.currentTime >= short.duration - 0.05) {
        audio.currentTime = 0;
      }

      void audio.play().catch(function ignore() {});
    } else {
      audio.pause();
    }
  }

  return (
    <div data-vn-msg data-side="in">
      <div
        data-vn-bubble
        data-kind="voice"
        role="group"
        aria-label="Voice message from Uzo, 5 seconds"
      >
        <div data-vn-player>
          <button
            type="button"
            data-vn-play
            data-vn-press
            aria-label={playing ? "Pause voice message" : "Play voice message"}
            onClick={toggle}
          >
            <PlayGlyph state={playing ? "pause" : "play"} />
          </button>
          <div data-vn-wave data-static aria-hidden="true">
            <Bars peaks={short.peaks} />
            <motion.span data-vn-played style={{ clipPath: playedClip }}>
              <Bars peaks={short.peaks} played />
            </motion.span>
            <motion.span
              data-vn-knob
              style={{
                left: knobLeft,
                backgroundColor: listened ? BLUE : GREEN,
              }}
            />
          </div>
          <div data-vn-side>
            <span data-vn-sender>
              <DefaultAvatar size="note" />
              <span data-vn-badge style={{ color: listened ? BLUE : GREEN }}>
                <MicBadgeGlyph />
              </span>
            </span>
          </div>
        </div>
        <div data-vn-sub>
          <motion.span data-vn-duration>{label}</motion.span>
          <span data-vn-meta data-inline>
            {time}
          </span>
        </div>
        <p data-vn-unavailable>Transcript unavailable</p>
        <Surface />
        <audio ref={audioRef} src={short.src} preload="auto" />
      </div>
    </div>
  );
}

function SpeakerGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" data-vn-check-glyph>
      <path
        d="M3.5 7.6h2.6l3.6-3.1c.5-.4 1.2 0 1.2.6v9.8c0 .6-.7 1-1.2.6l-3.6-3.1H3.5a1 1 0 01-1-1V8.6a1 1 0 011-1z"
        fill="currentColor"
      />
      <path
        d="M13.6 7.2a4 4 0 010 5.6M15.6 5.2a6.8 6.8 0 010 9.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * What tapping a dotted word opens: the word plays on its own, a ring shows
 * it playing, and the card says what the model's other guess was. Nothing is
 * rewritten; the speaker's audio stays the source of truth.
 */
function CheckCard({
  check,
  progress,
  onReplay,
  onPlayFrom,
  onKeyDown,
}: {
  check: Check;
  progress: MotionValue<number>;
  onReplay: () => void;
  onPlayFrom: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const word = WORDS[check.index];
  const heard = bare(word.text);

  return (
    <div
      data-vn-check-anchor
      style={{
        left: check.x,
        top: check.top,
        transform: check.below ? undefined : "translateY(-100%)",
      }}
    >
      <motion.div
        data-vn-check
        data-below={check.below ? "true" : undefined}
        role="dialog"
        aria-label={`Not sure about “${heard}”`}
        initial={{ opacity: 0, scale: 0.94, y: check.below ? -4 : 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{
          opacity: 0,
          scale: 0.97,
          y: check.below ? -2 : 2,
          transition: { duration: 0.12, ease: EASE },
        }}
        transition={{ duration: 0.2, ease: EASE }}
        style={{
          transformOrigin: `${check.caret}px ${check.below ? "0%" : "100%"}`,
        }}
        onKeyDown={onKeyDown}
      >
        <span
          data-vn-check-caret
          style={{ left: check.caret }}
          aria-hidden="true"
        />
        <div data-vn-check-head>
          <button
            type="button"
            data-vn-check-replay
            aria-label={`Hear “${heard}” again`}
            onClick={onReplay}
          >
            <svg viewBox="0 0 36 36" data-vn-check-ring aria-hidden="true">
              <circle cx="18" cy="18" r="16.75" data-track />
              <motion.circle
                cx="18"
                cy="18"
                r="16.75"
                data-fill
                style={{ pathLength: progress }}
              />
            </svg>
            <SpeakerGlyph />
          </button>
          <div data-vn-check-text>
            <p data-vn-check-word>“{heard}”</p>
            <p data-vn-check-alt>
              {word.alternative ? (
                <>
                  Not sure. Might be <strong>“{word.alternative}”</strong>
                </>
              ) : (
                "Not sure about this word"
              )}
            </p>
          </div>
        </div>
        <button type="button" data-vn-check-action onClick={onPlayFrom}>
          Play from here
        </button>
      </motion.div>
    </div>
  );
}

/**
 * The transcript words. Rendered once and never re-rendered while audio plays:
 * the played / current / upcoming state is written straight to the spans.
 */
const TranscriptText = memo(function TranscriptText({
  expanded,
  fold,
}: {
  expanded: boolean;
  fold: number;
}) {
  return (
    <>
      {PARAGRAPHS.map(function paragraph(item, paragraphIndex) {
        const hidden = paragraphIndex >= fold;
        const words = [];

        for (let index = item.first; index <= item.last; index += 1) {
          const word = WORDS[index];

          words.push(
            <Fragment key={index}>
              <span
                data-vn-word
                data-index={index}
                data-low={word.confidence < LOW_CONFIDENCE ? "true" : undefined}
              >
                {word.text}
              </span>
              {index < item.last ? " " : null}
            </Fragment>,
          );
        }

        return (
          <motion.p
            key={item.first}
            data-vn-para
            initial={false}
            animate={{
              opacity: hidden && !expanded ? 0 : 1,
              y: hidden && !expanded ? 4 : 0,
            }}
            transition={{
              ...OPEN,
              delay:
                hidden && expanded ? 0.06 + (paragraphIndex - fold) * 0.04 : 0,
            }}
          >
            <button
              type="button"
              data-vn-stamp
              data-index={item.first}
              aria-label={`Play from ${spokenTime(item.start)}`}
            >
              {formatTime(item.start)}
            </button>{" "}
            {words}
          </motion.p>
        );
      })}
    </>
  );
});

export function VoiceNoteChat() {
  const reducedMotion = Boolean(useReducedMotion());

  const audioRef = useRef<HTMLAudioElement>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const engineRef = useRef<Engine | null>(null);
  const reducedRef = useRef(reducedMotion);
  const modeRef = useRef<Mode>("fresh");
  const playingRef = useRef(false);
  const expandedRef = useRef(false);
  const transcriptLiveRef = useRef(false);
  const speedRef = useRef<number>(SPEEDS[0]);

  /** Bumped by every seek, pause and play, so a stale timer never acts. */
  const tokenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** While a seek is in flight, the clock shows its target, not the old position. */
  const seekingToRef = useRef<number | null>(null);
  /** After a tap, hold on the tapped word through the pre-roll. */
  const holdRef = useRef<number | null>(null);
  /** A low-confidence word plays only its own stretch, then stops here. */
  const stopAtRef = useRef<number | null>(null);
  /** ...and the highlight stays on that word, even as the next one begins. */
  const stretchIndexRef = useRef<number | null>(null);
  const stretchStartRef = useRef(0);
  /** Once someone collapses the transcript, playback stops reopening it. */
  const userCollapsedRef = useRef(false);
  const anchorModeRef = useRef<"top" | "bottom">("top");
  const collapseGapRef = useRef(0);
  const arrivalRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<Check | null>(null);

  const indexRef = useRef(-1);
  const rectsRef = useRef<Rect[]>([]);
  const spansRef = useRef<HTMLElement[]>([]);
  const focusIndexRef = useRef<number | null>(null);
  const layoutRef = useRef({ collapsed: 0, fold: PARAGRAPHS.length });

  const highlightRef = useRef({
    primary: 0 as 0 | 1,
    index: -1,
    line: -1,
    visible: false,
    runs: [[], []] as [
      AnimationPlaybackControls[],
      AnimationPlaybackControls[],
    ],
  });

  const scrubbingRef = useRef(false);
  const scrubResumeRef = useRef(false);
  const scrubTimeRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);
  const progressGlideRef = useRef<AnimationPlaybackControls | null>(null);
  const scrollGlideRef = useRef<AnimationPlaybackControls | null>(null);
  const userScrolledAtRef = useRef(0);
  const anchorUntilRef = useRef(0);
  const lastAriaSecondRef = useRef(-1);

  const [mode, setModeState] = useState<Mode>("fresh");
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [played, setPlayed] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [measured, setMeasured] = useState(false);
  const [check, setCheckState] = useState<Check | null>(null);
  const [layout, setLayout] = useState({
    collapsed: PREVIEW_LINES * 21,
    fold: PARAGRAPHS.length,
  });
  const [arrived, setArrived] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [hint, setHint] = useState(0);
  const [runId, setRunId] = useState(0);

  const time = useMotionValue(0);
  /** How far through a dotted word's stretch we are: drives the replay ring. */
  const stretchProgress = useMotionValue(0);
  const progress = useMotionValue(0);
  const label = useMotionValue(TOTAL_LABEL);

  const layerA: HighlightLayer = {
    x: useMotionValue(0),
    y: useMotionValue(0),
    width: useMotionValue(0),
    height: useMotionValue(0),
    opacity: useMotionValue(0),
    scale: useMotionValue(1),
  };
  const layerB: HighlightLayer = {
    x: useMotionValue(0),
    y: useMotionValue(0),
    width: useMotionValue(0),
    height: useMotionValue(0),
    opacity: useMotionValue(0),
    scale: useMotionValue(1),
  };

  const playedClip = useTransform(progress, function toClip(value) {
    return `inset(0 ${(1 - clamp(value, 0, 1)) * 100}% 0 0)`;
  });
  const knobLeft = useTransform(progress, function toLeft(value) {
    return `${clamp(value, 0, 1) * 100}%`;
  });

  const speed = SPEEDS[speedIndex];

  useMotionValueEvent(time, "change", function syncSliderValue(value) {
    const second = Math.floor(value);
    const wave = waveRef.current;

    if (wave === null || second === lastAriaSecondRef.current) {
      return;
    }

    lastAriaSecondRef.current = second;
    wave.setAttribute("aria-valuenow", String(second));
    wave.setAttribute(
      "aria-valuetext",
      `${formatTime(value)} of ${TOTAL_LABEL}`,
    );
  });

  function setMode(next: Mode) {
    modeRef.current = next;
    setModeState(next);

    const transcript = transcriptRef.current;

    if (transcript) {
      transcript.dataset.mode = next === "live" ? "live" : "rest";
    }
  }

  function setPlayingState(next: boolean) {
    playingRef.current = next;
    setPlaying(next);
  }

  function announce(message: string) {
    setAnnouncement(message);
  }

  /* Audio --------------------------------------------------------------- */

  /**
   * Audio runs through a GainNode so seeks can dip to silence and come back
   * on the audio clock: no clicks, and it works on iOS where media.volume is
   * read-only. Created inside the first gesture.
   */
  function ensureGraph() {
    const existing = graphRef.current;

    if (existing !== null) {
      if (existing.context.state === "suspended") {
        void existing.context.resume();
      }

      return existing;
    }

    const audio = audioRef.current;
    const Context =
      typeof window === "undefined"
        ? undefined
        : (window.AudioContext ??
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext);

    if (!Context || audio === null) {
      return null;
    }

    try {
      const context = new Context();
      const gain = context.createGain();

      context
        .createMediaElementSource(audio)
        .connect(gain)
        .connect(context.destination);
      graphRef.current = { context, gain };
    } catch {
      return null;
    }

    return graphRef.current;
  }

  function rampGain(target: number, durationMs: number) {
    const graph = graphRef.current;

    if (graph === null) {
      const audio = audioRef.current;

      if (audio) {
        audio.volume = target;
      }

      return;
    }

    const param = graph.gain.gain;
    const now = graph.context.currentTime;

    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);

    if (durationMs <= 0) {
      param.setValueAtTime(target, now);
      return;
    }

    param.linearRampToValueAtTime(target, now + durationMs / 1000);
  }

  /** What the listener is hearing now, allowing for output latency. */
  function heardTime(audio: HTMLAudioElement) {
    const context = graphRef.current?.context;
    const latency = context
      ? clamp(
          (context.outputLatency || 0) + (context.baseLatency || 0),
          0,
          0.25,
        )
      : 0;

    return Math.max(0, audio.currentTime - latency * audio.playbackRate);
  }

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function nextToken() {
    tokenRef.current += 1;
    clearTimer();

    return tokenRef.current;
  }

  function handlePlayError() {
    seekingToRef.current = null;
    setPlayingState(false);
    setBuffering(false);
  }

  /** Move the audio to `seconds` and play, dipping the gain around the jump. */
  function commitSeek(seconds: number, token: number) {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    const media: HTMLAudioElement = audio;

    function settle() {
      media.removeEventListener("seeked", settle);
      media.removeEventListener("playing", settle);

      if (token !== tokenRef.current) {
        return;
      }

      seekingToRef.current = null;
      rampGain(1, reducedRef.current ? 0 : SEEK_IN_MS);
    }

    seekingToRef.current = seconds;
    media.addEventListener("seeked", settle);
    media.addEventListener("playing", settle);
    media.playbackRate = speedRef.current;

    try {
      media.currentTime = seconds;
    } catch {
      // Not seekable yet: it starts from here once it has loaded.
    }

    if (media.paused) {
      if (media.readyState < 3) {
        setBuffering(true);
      }

      void media.play().catch(handlePlayError);
    }

    timerRef.current = setTimeout(settle, 450);
  }

  /** Seek and play. Every word, timestamp and stretch tap routes through here. */
  function seekAndPlay(seconds: number, index: number, stopAt: number | null) {
    const audio = audioRef.current;

    if (audio === null || audioError) {
      return;
    }

    const target = clamp(seconds, 0, DURATION - 0.05);
    const token = nextToken();

    ensureGraph();
    stopAtRef.current = stopAt;
    stretchIndexRef.current = stopAt !== null && index >= 0 ? index : null;
    stretchStartRef.current = target;

    if (stopAt !== null) {
      stretchProgress.set(0);
    }
    holdRef.current = index >= 0 ? index : null;

    if (modeRef.current !== "live") {
      setMode("live");
    }

    // Visuals move now; audio catches up a few milliseconds later.
    showPosition(target);
    glideProgress(target);
    setIndex(index, "tap");
    setPlayingState(true);

    if (!audio.paused && seekingToRef.current === null) {
      seekingToRef.current = target;
      rampGain(0, reducedRef.current ? 0 : SEEK_OUT_MS);
      timerRef.current = setTimeout(
        function seekWhenQuiet() {
          if (token === tokenRef.current) {
            commitSeek(target, token);
          }
        },
        reducedRef.current ? 0 : SEEK_OUT_MS,
      );

      return;
    }

    rampGain(0, 0);
    commitSeek(target, token);
  }

  function fadeAndPause() {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    const media: HTMLAudioElement = audio;
    const token = nextToken();

    stopAtRef.current = null;
    seekingToRef.current = null;
    setPlayingState(false);
    setBuffering(false);
    rampGain(0, reducedRef.current ? 0 : PAUSE_FADE_MS);

    timerRef.current = setTimeout(
      function pauseWhenQuiet() {
        if (token === tokenRef.current) {
          media.pause();
        }
      },
      reducedRef.current ? 0 : PAUSE_FADE_MS + 10,
    );
  }

  function resume() {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    const token = nextToken();

    ensureGraph();
    stopAtRef.current = null;
    audio.playbackRate = speedRef.current;
    setPlayingState(true);

    if (!audio.paused) {
      // Caught mid-fade on the way to a pause: just come back up.
      rampGain(1, SEEK_IN_MS);
      return;
    }

    rampGain(0, 0);
    void audio
      .play()
      .then(function fadeIn() {
        if (token === tokenRef.current) {
          rampGain(1, reducedRef.current ? 0 : SEEK_IN_MS);
        }
      })
      .catch(handlePlayError);
  }

  function togglePlayback() {
    const audio = audioRef.current;

    if (audio === null || audioError) {
      return;
    }

    closeCheck();

    if (playingRef.current) {
      fadeAndPause();
      announce(`Paused at ${spokenTime(audio.currentTime)}.`);
      return;
    }

    userCollapsedRef.current = false;

    if (modeRef.current !== "live" || audio.currentTime >= DURATION - 0.1) {
      seekAndPlay(0, -1, null);
      announce("Playing voice message.");
      return;
    }

    resume();
    announce(`Playing from ${spokenTime(audio.currentTime)}.`);
  }

  /** Just the dotted word, with a little air either side, then stop. */
  function playStretch(index: number) {
    const word = WORDS[index];

    seekAndPlay(word.start - STRETCH_BEFORE, index, word.end + STRETCH_AFTER);
    announce(
      `Playing “${bare(word.text)}”. The transcript isn't sure about this word${
        word.alternative ? `. It might be “${word.alternative}”` : ""
      }.`,
    );
  }

  /* Check card: what tapping a dotted word opens ----------------------- */

  function setCheck(next: Check | null) {
    checkRef.current = next;
    setCheckState(next);
  }

  function openCheck(index: number, focus: boolean) {
    const rect = rectsRef.current[index];
    const transcript = transcriptRef.current;

    if (rect === undefined || transcript === null) {
      return;
    }

    const width = transcript.clientWidth;
    const center = rect.x + rect.width / 2;
    const x = clamp(center - CHECK_WIDTH / 2, -4, width - CHECK_WIDTH + 4);
    // Above the word, unless that would cover the player.
    const below = rect.line < 2;

    setCheck({
      index,
      x,
      caret: clamp(center - x, 18, CHECK_WIDTH - 18),
      top: below ? rect.y + rect.height + 9 : rect.y - 9,
      below,
      focus,
    });
  }

  function closeCheck() {
    if (checkRef.current !== null) {
      setCheck(null);
    }
  }

  function replayCheck() {
    const current = checkRef.current;

    if (current !== null) {
      playStretch(current.index);
    }
  }

  function playFromCheck() {
    const current = checkRef.current;

    if (current === null) {
      return;
    }

    const word = WORDS[current.index];

    closeCheck();
    userCollapsedRef.current = false;
    seekAndPlay(word.start - PRE_ROLL, current.index, null);
    announce(`Playing from ${spokenTime(word.start)}.`);
    transcriptRef.current?.focus({ preventScroll: true });
  }

  function handleCheckKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCheck();
      transcriptRef.current?.focus({ preventScroll: true });
    }
  }

  function playFromWord(index: number, focusCard = false) {
    const word = WORDS[index];

    if (!word) {
      return;
    }

    if (word.confidence < LOW_CONFIDENCE) {
      playStretch(index);
      openCheck(index, focusCard);
      setHint(function advance(current) {
        return Math.max(current, 2);
      });
      return;
    }

    closeCheck();
    userCollapsedRef.current = false;
    seekAndPlay(word.start - PRE_ROLL, index, null);
    announce(`Playing from ${spokenTime(word.start)}.`);
    setHint(function advance(current) {
      return Math.max(current, 1);
    });
  }

  function changeSpeed() {
    closeCheck();

    const next = (speedIndex + 1) % SPEEDS.length;
    const audio = audioRef.current;

    speedRef.current = SPEEDS[next];
    setSpeedIndex(next);

    if (audio) {
      audio.playbackRate = SPEEDS[next];
    }

    announce(`Speed ${SPEEDS[next]} times.`);
  }

  /* Position ------------------------------------------------------------ */

  function showPosition(seconds: number) {
    time.set(seconds);
    label.set(formatTime(seconds));
  }

  function glideProgress(seconds: number) {
    const ratio = clamp(seconds / DURATION, 0, 1);

    progressGlideRef.current?.stop();

    if (reducedRef.current) {
      progressGlideRef.current = null;
      progress.set(ratio);
      return;
    }

    const controls = animate(progress, ratio, PROGRESS_GLIDE);

    progressGlideRef.current = controls;
    void controls.then(function settleGlide() {
      if (progressGlideRef.current === controls) {
        progressGlideRef.current = null;
      }
    });
  }

  /* Highlight ----------------------------------------------------------- */

  function layer(which: 0 | 1) {
    return which === 0 ? layerA : layerB;
  }

  function stopLayer(which: 0 | 1) {
    const runs = highlightRef.current.runs[which];

    runs.forEach(function stop(run) {
      run.stop();
    });
    highlightRef.current.runs[which] = [];
  }

  function runLayer(
    which: 0 | 1,
    value: MotionValue<number>,
    target: number,
    transition: { duration: number; ease: typeof EASE; delay?: number },
  ) {
    highlightRef.current.runs[which].push(animate(value, target, transition));
  }

  function placeLayer(which: 0 | 1, rect: Rect) {
    const values = layer(which);

    values.x.set(rect.x - PAD_X);
    values.y.set(rect.y - PAD_Y);
    values.width.set(rect.width + PAD_X * 2);
    values.height.set(rect.height + PAD_Y * 2);
  }

  /**
   * One highlight, two layers. Along a line it glides; across a line break it
   * fades out where it was and in where it's going, instead of sliding
   * diagonally through the paragraph.
   */
  function moveHighlight(index: number, move: Move) {
    const state = highlightRef.current;
    const rect = rectsRef.current[index];
    const primary = state.primary;
    const other: 0 | 1 = primary === 0 ? 1 : 0;
    const instant = reducedRef.current || move === "snap";

    if (index < 0 || rect === undefined) {
      ([0, 1] as const).forEach(function hide(which) {
        stopLayer(which);

        if (instant) {
          layer(which).opacity.set(0);
        } else {
          runLayer(which, layer(which).opacity, 0, LINE_FADE);
        }
      });

      state.visible = false;
      state.index = -1;
      state.line = -1;
      return;
    }

    if (instant) {
      stopLayer(primary);
      stopLayer(other);
      placeLayer(primary, rect);
      layer(primary).opacity.set(1);
      layer(primary).scale.set(1);
      layer(other).opacity.set(0);
    } else if (!state.visible) {
      stopLayer(primary);
      stopLayer(other);
      runLayer(other, layer(other).opacity, 0, LINE_FADE);
      placeLayer(primary, rect);
      layer(primary).opacity.set(0);
      runLayer(primary, layer(primary).opacity, 1, LINE_FADE);

      if (move === "tap") {
        layer(primary).scale.set(0.96);
        runLayer(primary, layer(primary).scale, 1, SETTLE);
      }
    } else if (move === "tap" && index === state.index) {
      stopLayer(primary);
      runLayer(primary, layer(primary).opacity, 1, LINE_FADE);
      layer(primary).scale.set(0.96);
      runLayer(primary, layer(primary).scale, 1, SETTLE);
    } else if (move === "glide" && rect.line === state.line) {
      const values = layer(primary);

      stopLayer(primary);
      runLayer(primary, values.x, rect.x - PAD_X, GLIDE);
      runLayer(primary, values.width, rect.width + PAD_X * 2, GLIDE);
      runLayer(primary, values.y, rect.y - PAD_Y, GLIDE);
      runLayer(primary, values.height, rect.height + PAD_Y * 2, GLIDE);
      runLayer(primary, values.opacity, 1, LINE_FADE);
      runLayer(primary, values.scale, 1, SETTLE);
    } else {
      stopLayer(primary);
      runLayer(primary, layer(primary).opacity, 0, LINE_FADE);

      stopLayer(other);
      placeLayer(other, rect);
      layer(other).opacity.set(0);
      runLayer(other, layer(other).opacity, 1, LINE_FADE);
      layer(other).scale.set(move === "tap" ? 0.96 : 1);

      if (move === "tap") {
        runLayer(other, layer(other).scale, 1, SETTLE);
      }

      state.primary = other;
    }

    state.visible = true;
    state.index = index;
    state.line = rect.line;
  }

  /** played / current / upcoming, written straight to the spans in the changed range. */
  function paintStates(next: number, previous: number) {
    const spans = spansRef.current;
    const from = Math.max(0, Math.min(next, previous));
    const to = Math.min(spans.length - 1, Math.max(next, previous));

    for (let index = from; index <= to; index += 1) {
      const span = spans[index];

      if (index < next) {
        span.dataset.state = "played";
      } else if (index === next) {
        span.dataset.state = "current";
      } else {
        delete span.dataset.state;
      }
    }
  }

  function clearStates() {
    spansRef.current.forEach(function clear(span) {
      delete span.dataset.state;
    });
    indexRef.current = -1;
  }

  function setIndex(index: number, move: Move) {
    const previous = indexRef.current;

    if (index === previous && move !== "tap") {
      return;
    }

    if (transcriptLiveRef.current) {
      paintStates(index, previous);
      moveHighlight(index, move);
    }

    indexRef.current = index;

    const rect = rectsRef.current[index];

    if (rect === undefined || !transcriptLiveRef.current) {
      return;
    }

    const hidden = !expandedRef.current && rect.line >= PREVIEW_LINES;

    if (hidden && !scrubbingRef.current && !userCollapsedRef.current) {
      expand();
    } else if (move === "glide" && playingRef.current && !hidden) {
      follow(rect);
    }
  }

  /** Keep the word being spoken on screen, unless the reader is scrolling. */
  function follow(rect: Rect, force = false) {
    const scroller = scrollRef.current;
    const transcript = transcriptRef.current;

    if (
      scroller === null ||
      transcript === null ||
      (!force && performance.now() - userScrolledAtRef.current < 2500)
    ) {
      return;
    }

    const view = scroller.getBoundingClientRect();
    const box = transcript.getBoundingClientRect();
    const inset = overlayInsets();
    const top = box.top - view.top + rect.y;
    const bottom = top + rect.height;
    const visible = view.height - inset.top - inset.bottom;
    const margin = 24;
    let delta = 0;

    // The header and chat bar float over the chat, so "on screen" means
    // between them, not just inside the scroller.
    if (bottom > view.height - inset.bottom - margin) {
      delta = bottom - (inset.top + visible * 0.62);
    } else if (top < inset.top + margin) {
      delta = top - (inset.top + visible * 0.3);
    }

    if (delta === 0) {
      return;
    }

    glideScroll(scroller.scrollTop + delta);
  }

  /** How much of the scroller the floating header and chat bar cover. */
  function overlayInsets() {
    const scroller = scrollRef.current;
    const header = headerRef.current;
    const bar = barRef.current;

    if (scroller === null) {
      return { top: 0, bottom: 0 };
    }

    const view = scroller.getBoundingClientRect();

    return {
      top: header
        ? Math.max(0, header.getBoundingClientRect().bottom - view.top)
        : 0,
      bottom: bar
        ? Math.max(0, view.bottom - bar.getBoundingClientRect().top)
        : 0,
    };
  }

  function glideScroll(target: number) {
    const scroller = scrollRef.current;

    if (scroller === null) {
      return;
    }

    const element: HTMLDivElement = scroller;
    const max = element.scrollHeight - element.clientHeight;
    const to = clamp(target, 0, Math.max(0, max));

    scrollGlideRef.current?.stop();

    if (reducedRef.current) {
      element.scrollTop = to;
      return;
    }

    scrollGlideRef.current = animate(element.scrollTop, to, {
      duration: 0.5,
      ease: EASE,
      onUpdate: function scrollTo(value) {
        element.scrollTop = value;
      },
    });
  }

  function expand() {
    if (expandedRef.current) {
      return;
    }

    expandedRef.current = true;
    anchorModeRef.current = "top";
    anchorUntilRef.current = performance.now() + OPEN.duration * 1000 + 160;
    setExpanded(true);
  }

  /**
   * Show less: the bubble shrinks back to its preview while "Read more" lands
   * where "Show less" was, so the control stays under the finger.
   */
  function collapse() {
    const scroller = scrollRef.current;
    const bubble = bubbleRef.current;

    if (!expandedRef.current) {
      return;
    }

    if (scroller && bubble) {
      collapseGapRef.current =
        scroller.getBoundingClientRect().bottom -
        bubble.getBoundingClientRect().bottom;
    }

    closeCheck();
    expandedRef.current = false;
    userCollapsedRef.current = true;
    anchorModeRef.current = "bottom";
    anchorUntilRef.current = performance.now() + OPEN.duration * 1000 + 160;
    setExpanded(false);
    announce("Transcript collapsed.");
  }

  function toggleExpanded() {
    if (expandedRef.current) {
      collapse();
      return;
    }

    userCollapsedRef.current = false;
    expand();
  }

  /* Transcript input ---------------------------------------------------- */

  function nearestWord(clientX: number, clientY: number) {
    const transcript = transcriptRef.current;
    const rects = rectsRef.current;

    if (transcript === null || rects.length === 0) {
      return -1;
    }

    const box = transcript.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    let best = -1;
    let bestScore = Infinity;

    rects.forEach(function score(rect, index) {
      const dy = Math.max(0, rect.y - y, y - (rect.y + rect.height));
      const dx = Math.max(0, rect.x - x, x - (rect.x + rect.width));
      const value = dy * 4 + dx;

      if (value < bestScore) {
        bestScore = value;
        best = index;
      }
    });

    return best;
  }

  function handleTranscriptPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    pointerMovedRef.current = false;
  }

  function handleTranscriptPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const start = pointerStartRef.current;

    if (
      start &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6
    ) {
      pointerMovedRef.current = true;
    }
  }

  function handleTranscriptClick(event: ReactMouseEvent<HTMLDivElement>) {
    const selection = window.getSelection();
    const target = event.target as HTMLElement;

    pointerStartRef.current = null;

    // Selecting text must never seek.
    if (
      (selection !== null && !selection.isCollapsed) ||
      pointerMovedRef.current ||
      event.detail > 1
    ) {
      return;
    }

    const stamp = target.closest<HTMLElement>("[data-vn-stamp]");

    if (stamp) {
      const index = Number(stamp.dataset.index);

      closeCheck();
      userCollapsedRef.current = false;
      seekAndPlay(WORDS[index].start - PRE_ROLL, index, null);
      announce(`Playing from ${spokenTime(WORDS[index].start)}.`);
      setHint(function advance(current) {
        return Math.max(current, 1);
      });
      return;
    }

    const word = target.closest<HTMLElement>("[data-vn-word]");
    const index = word
      ? Number(word.dataset.index)
      : nearestWord(event.clientX, event.clientY);

    if (index >= 0) {
      setFocusIndex(index, false);
      playFromWord(index);
    }
  }

  function setFocusIndex(index: number | null, reveal: boolean) {
    const spans = spansRef.current;
    const previous = focusIndexRef.current;

    if (previous !== null && spans[previous]) {
      delete spans[previous].dataset.kbd;
    }

    focusIndexRef.current = index;

    if (index === null || !spans[index]) {
      return;
    }

    spans[index].dataset.kbd = "true";

    if (reveal) {
      const rect = rectsRef.current[index];

      if (rect) {
        if (!expandedRef.current && rect.line >= PREVIEW_LINES) {
          expand();
        }

        follow(rect, true);
      }

      const word = WORDS[index];

      announce(
        `${word.text}, ${formatTime(word.start)}${
          word.confidence < LOW_CONFIDENCE
            ? ", the transcript isn't sure about this word"
            : ""
        }`,
      );
    }
  }

  function handleTranscriptFocus(event: FocusEvent<HTMLDivElement>) {
    if (
      event.target !== event.currentTarget ||
      focusIndexRef.current !== null
    ) {
      return;
    }

    setFocusIndex(Math.max(0, indexRef.current), false);
  }

  function handleTranscriptKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    const current = focusIndexRef.current ?? Math.max(0, indexRef.current);
    let next: number | null = null;

    switch (event.key) {
      case "ArrowRight":
        next = Math.min(WORDS.length - 1, current + 1);
        break;
      case "ArrowLeft":
        next = Math.max(0, current - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = WORDS.length - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        playFromWord(current, true);
        return;
      case "Escape":
        closeCheck();
        return;
      default:
        return;
    }

    event.preventDefault();
    setFocusIndex(next, true);
  }

  /* Waveform ------------------------------------------------------------ */

  function ratioAt(clientX: number) {
    const wave = waveRef.current;

    if (wave === null) {
      return 0;
    }

    const box = wave.getBoundingClientRect();

    return clamp((clientX - box.left) / box.width, 0, 1);
  }

  function scrubTo(seconds: number, glide: boolean) {
    const target = clamp(seconds, 0, DURATION - 0.05);

    scrubTimeRef.current = target;
    showPosition(target);

    if (glide) {
      glideProgress(target);
    } else {
      progressGlideRef.current?.stop();
      progressGlideRef.current = null;
      progress.set(target / DURATION);
    }

    setIndex(wordAt(target + PRE_ROLL), glide ? "tap" : "snap");
  }

  function handleWavePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const audio = audioRef.current;

    if (event.button !== 0 || audio === null || audioError) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    closeCheck();
    scrubbingRef.current = true;
    scrubResumeRef.current = playingRef.current;

    if (playingRef.current) {
      fadeAndPause();
    }

    if (modeRef.current !== "live") {
      setMode("live");
    }

    scrubTo(ratioAt(event.clientX) * DURATION, true);
  }

  function handleWavePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) {
      return;
    }

    scrubTo(ratioAt(event.clientX) * DURATION, false);
  }

  function finishScrub() {
    const audio = audioRef.current;

    if (!scrubbingRef.current || audio === null) {
      return;
    }

    scrubbingRef.current = false;

    const target = scrubTimeRef.current;
    const index = wordAt(target + PRE_ROLL);

    setHint(function advance(current) {
      return Math.max(current, 3);
    });

    if (scrubResumeRef.current) {
      seekAndPlay(target, index, null);
    } else {
      try {
        audio.currentTime = target;
      } catch {
        // Applied once the audio has loaded.
      }
    }

    // The highlight may have walked past the preview while dragging.
    setIndex(index, "snap");

    const rect = rectsRef.current[index];

    if (rect && !expandedRef.current && rect.line >= PREVIEW_LINES) {
      expand();
    }

    announce(
      `${scrubResumeRef.current ? "Playing from" : "Moved to"} ${spokenTime(target)}.`,
    );
  }

  function handleWaveKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    const now = seekingToRef.current ?? audio.currentTime;
    let target: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        target = now + 5;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        target = now - 5;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = DURATION - 0.5;
        break;
      default:
        return;
    }

    event.preventDefault();
    target = clamp(target, 0, DURATION - 0.5);

    const index = wordAt(target + PRE_ROLL);

    if (playingRef.current) {
      seekAndPlay(target, index, null);
      return;
    }

    if (modeRef.current !== "live") {
      setMode("live");
    }

    try {
      audio.currentTime = target;
    } catch {
      // Applied once the audio has loaded.
    }

    showPosition(target);
    glideProgress(target);
    setIndex(index, "tap");
  }

  /* Prototype controls -------------------------------------------------- */

  /** Back: leave the chat and come straight back in, so the scene replays. */
  function replayChat() {
    const scroller = scrollRef.current;

    if (scroller === null || reducedRef.current) {
      resetPrototype();
      return;
    }

    const element: HTMLDivElement = scroller;

    void animate(element, { opacity: 0 }, { duration: 0.14, ease: EASE }).then(
      function resetWhileHidden() {
        resetPrototype();
        void animate(
          element,
          { opacity: 1 },
          { duration: 0.26, ease: EASE, delay: 0.04 },
        );
      },
    );
  }

  function resetPrototype() {
    const audio = audioRef.current;

    nextToken();
    stopAtRef.current = null;
    seekingToRef.current = null;
    holdRef.current = null;

    if (audio) {
      audio.pause();

      try {
        audio.currentTime = 0;
      } catch {
        // Nothing loaded yet.
      }

      audio.playbackRate = 1;
    }

    rampGain(1, 0);
    speedRef.current = SPEEDS[0];
    expandedRef.current = false;
    userCollapsedRef.current = false;
    transcriptLiveRef.current = false;
    setCheck(null);
    clearStates();
    setFocusIndex(null, false);
    moveHighlight(-1, "snap");
    progressGlideRef.current?.stop();
    progress.set(0);
    time.set(0);
    label.set(TOTAL_LABEL);
    setMode("fresh");
    setPlayingState(false);
    setBuffering(false);
    setPlayed(false);
    setSpeedIndex(0);
    setExpanded(false);
    setArrived(false);
    setRecording(false);
    setTranscribing(true);
    setHint(0);
    setRunId(function next(current) {
      return current + 1;
    });
    scrollRef.current?.scrollTo({ top: 0 });
    document.dispatchEvent(
      new CustomEvent(EXCLUSIVE_EVENT, { detail: "reset" }),
    );
    announce("Chat reopened.");
  }

  /* Engine: per-frame and DOM-measuring work, always reading fresh state ---- */

  useLayoutEffect(function keepEngineCurrent() {
    reducedRef.current = reducedMotion;

    engineRef.current = {
      tick() {
        const audio = audioRef.current;

        // A frame can still fire after a pause or the end; it must not
        // re-paint a word the end has just cleared.
        if (
          audio === null ||
          audio.ended ||
          !playingRef.current ||
          scrubbingRef.current ||
          seekingToRef.current !== null
        ) {
          return;
        }

        const media = audio.currentTime;
        const heard = heardTime(audio);

        if (stopAtRef.current !== null) {
          const span = stopAtRef.current - stretchStartRef.current;

          stretchProgress.set(
            span > 0
              ? clamp((media - stretchStartRef.current) / span, 0, 1)
              : 1,
          );

          if (media >= stopAtRef.current) {
            fadeAndPause();
            return;
          }
        }

        showPosition(heard);

        if (progressGlideRef.current === null) {
          progress.set(clamp(heard / DURATION, 0, 1));
        }

        let index = wordAt(heard + LEAD * audio.playbackRate);
        const hold = holdRef.current;

        if (hold !== null) {
          if (
            heard + LEAD * audio.playbackRate < WORDS[hold].start &&
            index < hold
          ) {
            index = hold;
          } else {
            holdRef.current = null;
          }
        }

        if (stopAtRef.current !== null && stretchIndexRef.current !== null) {
          index = Math.min(index, stretchIndexRef.current);
        }

        setIndex(index, "glide");
      },

      ended() {
        nextToken();
        stopAtRef.current = null;
        holdRef.current = null;
        setPlayingState(false);
        setBuffering(false);
        setMode("ended");
        setPlayed(true);
        clearStates();
        moveHighlight(-1, "glide");
        progressGlideRef.current?.stop();
        progressGlideRef.current = null;
        progress.set(1);
        time.set(DURATION);
        label.set(TOTAL_LABEL);
        announce("Voice message finished.");
      },

      measure() {
        const transcript = transcriptRef.current;

        if (transcript === null) {
          spansRef.current = [];
          rectsRef.current = [];
          return;
        }

        const box = transcript.getBoundingClientRect();
        const spans = Array.from(
          transcript.querySelectorAll<HTMLElement>("[data-vn-word]"),
        );
        let line = -1;
        let lineTop = -Infinity;

        const rects = spans.map(function toRect(span) {
          const rect = span.getBoundingClientRect();
          const top = rect.top - box.top;

          if (Math.abs(top - lineTop) > 4) {
            line += 1;
            lineTop = top;
          }

          return {
            x: rect.left - box.left,
            y: top,
            width: rect.width,
            height: rect.height,
            line,
          };
        });

        spansRef.current = spans;
        rectsRef.current = rects;

        // The preview is exactly three lines, wherever paragraph breaks fall.
        const lineHeight =
          parseFloat(getComputedStyle(transcript).lineHeight) || 21;
        const lastPreview = rects.findLast(function inPreview(rect) {
          return rect.line === PREVIEW_LINES - 1;
        });
        const collapsed = lastPreview
          ? Math.round(
              lastPreview.y -
                (lineHeight - lastPreview.height) / 2 +
                lineHeight,
            )
          : PREVIEW_LINES * lineHeight;
        const fold = PARAGRAPHS.findIndex(function belowFold(paragraph) {
          return (rects[paragraph.first]?.line ?? 0) >= PREVIEW_LINES;
        });
        const next = {
          collapsed,
          fold: fold === -1 ? PARAGRAPHS.length : fold,
        };

        if (
          next.collapsed !== layoutRef.current.collapsed ||
          next.fold !== layoutRef.current.fold
        ) {
          layoutRef.current = next;
          setLayout(next);
        }

        setMeasured(true);

        // The card is placed from the old layout; reopen it on the new one.
        const open = checkRef.current;

        if (open !== null) {
          openCheck(open.index, false);
        }

        // Re-seat the highlight and states on the new layout.
        const index = indexRef.current;

        if (
          transcriptLiveRef.current &&
          index >= 0 &&
          modeRef.current === "live"
        ) {
          paintStates(index, -1);
          moveHighlight(index, "snap");
        }

        if (focusIndexRef.current !== null && spans[focusIndexRef.current]) {
          spans[focusIndexRef.current].dataset.kbd = "true";
        }
      },

      resync() {
        const audio = audioRef.current;

        if (audio === null || !playingRef.current) {
          return;
        }

        const index = wordAt(heardTime(audio) + LEAD * audio.playbackRate);

        if (Math.abs(index - indexRef.current) > 1) {
          setIndex(index, "snap");
        }
      },

      yieldToOther() {
        if (playingRef.current) {
          fadeAndPause();
        }
      },

      // While the transcript opens, it grows up from the composer until the
      // bubble's top reaches the top of the chat, then grows down.
      anchor() {
        const scroller = scrollRef.current;
        const bubble = bubbleRef.current;

        if (scroller === null || performance.now() > anchorUntilRef.current) {
          return;
        }

        const max = scroller.scrollHeight - scroller.clientHeight;

        if (max <= 0) {
          return;
        }

        if (anchorModeRef.current === "bottom" && bubble) {
          const bottom = bubble.getBoundingClientRect().bottom;
          const target =
            scroller.getBoundingClientRect().bottom - collapseGapRef.current;

          scroller.scrollTop = clamp(
            scroller.scrollTop + bottom - target,
            0,
            max,
          );
          return;
        }

        const top =
          (bubble?.getBoundingClientRect().top ?? 0) -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop;

        scroller.scrollTop = bubble
          ? Math.min(max, Math.max(0, top - overlayInsets().top - 8))
          : max;
      },
    };
  });

  /* Effects ------------------------------------------------------------- */

  // The intro: Uzo records, then the voice note lands and transcribes.
  useEffect(
    function playIntro() {
      const timers = [
        setTimeout(function startRecording() {
          setRecording(true);
        }, INTRO_RECORDING_AT),
        setTimeout(function deliver() {
          setRecording(false);
          setArrived(true);
          anchorUntilRef.current = performance.now() + 600;
        }, INTRO_ARRIVES_AT),
        setTimeout(
          function transcribed() {
            setTranscribing(false);
          },
          INTRO_ARRIVES_AT + 260 + TRANSCRIBING_MS,
        ),
      ];

      return function cleanup() {
        timers.forEach(clearTimeout);
      };
    },
    [runId],
  );

  useEffect(function bindAudio() {
    const audio = audioRef.current;
    const graph = graphRef;

    if (audio === null) {
      return;
    }

    const media: HTMLAudioElement = audio;

    function handlePlay() {
      playingRef.current = true;
      setPlaying(true);
      document.dispatchEvent(
        new CustomEvent(EXCLUSIVE_EVENT, { detail: "main" }),
      );
    }

    // Only one voice note plays at a time.
    function handleOtherPlay(event: Event) {
      if ((event as CustomEvent<string>).detail !== "main") {
        engineRef.current?.yieldToOther();
      }
    }

    function handlePause() {
      if (!media.ended && playingRef.current && seekingToRef.current === null) {
        playingRef.current = false;
        setPlaying(false);
      }
    }

    function handleWaiting() {
      setBuffering(true);
    }

    function handleReady() {
      setBuffering(false);
    }

    function handleEnded() {
      engineRef.current?.ended();
    }

    function handleError() {
      setAudioError(true);
      setBuffering(false);
      playingRef.current = false;
      setPlaying(false);
    }

    media.addEventListener("play", handlePlay);
    media.addEventListener("pause", handlePause);
    media.addEventListener("waiting", handleWaiting);
    media.addEventListener("playing", handleReady);
    media.addEventListener("canplay", handleReady);
    media.addEventListener("ended", handleEnded);
    media.addEventListener("error", handleError);
    document.addEventListener(EXCLUSIVE_EVENT, handleOtherPlay);

    return function cleanup() {
      media.removeEventListener("play", handlePlay);
      media.removeEventListener("pause", handlePause);
      media.removeEventListener("waiting", handleWaiting);
      media.removeEventListener("playing", handleReady);
      media.removeEventListener("canplay", handleReady);
      media.removeEventListener("ended", handleEnded);
      media.removeEventListener("error", handleError);
      document.removeEventListener(EXCLUSIVE_EVENT, handleOtherPlay);
      void graph.current?.context.close().catch(function ignoreClose() {});
      graph.current = null;
    };
  }, []);

  // The clock only runs while audio plays. Words and highlight are written
  // straight to the DOM from here; React never re-renders per word.
  useEffect(
    function playbackClock() {
      if (!playing) {
        return;
      }

      let frame = 0;

      function loop() {
        engineRef.current?.tick();
        frame = requestAnimationFrame(loop);
      }

      frame = requestAnimationFrame(loop);

      function handleVisibility() {
        if (document.visibilityState === "visible") {
          engineRef.current?.resync();
        }
      }

      document.addEventListener("visibilitychange", handleVisibility);

      return function cleanup() {
        cancelAnimationFrame(frame);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    },
    [playing],
  );

  // Measure every word once the transcript exists, and again whenever its
  // width or the font changes.
  useLayoutEffect(
    function observeTranscript() {
      const transcript = transcriptRef.current;

      transcriptLiveRef.current = transcript !== null;

      if (transcript === null) {
        engineRef.current?.measure();
        return;
      }

      transcript.dataset.mode = modeRef.current === "live" ? "live" : "rest";

      // Measure before the first paint, so the arrival animates to the real
      // preview height instead of correcting itself by a few pixels at the end.
      engineRef.current?.measure();

      let cancelled = false;
      const observer = new ResizeObserver(function remeasure() {
        engineRef.current?.measure();
      });

      observer.observe(transcript);
      void document.fonts?.ready.then(function afterFonts() {
        if (!cancelled) {
          engineRef.current?.measure();
        }
      });

      return function cleanup() {
        cancelled = true;
        observer.disconnect();
      };
    },
    [arrived],
  );

  // A card opened from the keyboard takes focus; any tap outside it closes it.
  useEffect(
    function manageCheckCard() {
      if (check === null) {
        return;
      }

      if (check.focus) {
        document
          .querySelector<HTMLButtonElement>("[data-vn-check-replay]")
          ?.focus();
      }

      function handlePointerDown(event: PointerEvent) {
        const target = event.target as Element | null;

        if (
          target?.closest("[data-vn-check]") ||
          target?.closest("[data-vn-word]")
        ) {
          return;
        }

        checkRef.current = null;
        setCheckState(null);
      }

      document.addEventListener("pointerdown", handlePointerDown, true);

      return function cleanup() {
        document.removeEventListener("pointerdown", handlePointerDown, true);
      };
    },
    [check],
  );

  // The last hint has nothing to lead on to, so it bows out on its own.
  useEffect(
    function retireLastHint() {
      if (hint !== HINTS.length - 1) {
        return;
      }

      const timer = setTimeout(function retire() {
        setHint(HINTS.length);
      }, 5000);

      return function cleanup() {
        clearTimeout(timer);
      };
    },
    [hint],
  );

  useEffect(function observeThread() {
    const thread = threadRef.current;
    const scroller = scrollRef.current;

    if (thread === null || scroller === null) {
      return;
    }

    const observer = new ResizeObserver(function keepAnchored() {
      engineRef.current?.anchor();
    });

    function markUserScroll() {
      userScrolledAtRef.current = performance.now();
      scrollGlideRef.current?.stop();
    }

    observer.observe(thread);
    scroller.addEventListener("wheel", markUserScroll, { passive: true });
    scroller.addEventListener("touchmove", markUserScroll, { passive: true });

    return function cleanup() {
      observer.disconnect();
      scroller.removeEventListener("wheel", markUserScroll);
      scroller.removeEventListener("touchmove", markUserScroll);
    };
  }, []);

  /* Render -------------------------------------------------------------- */

  const glyph = buffering && playing ? "loading" : playing ? "pause" : "play";
  const showSpeed = mode === "live";
  const transcriptReady = arrived && !transcribing;
  const showHint = transcriptReady && hint < HINTS.length;

  return (
    <MotionConfig reducedMotion="user">
      <div data-vn-stage>
        <div data-vn-device>
          <div data-vn-screen>
            <div data-vn-scroll ref={scrollRef}>
              <div data-vn-thread ref={threadRef}>
                <p data-vn-notice>
                  <LockIcon />
                  Messages and calls are end‑to‑end encrypted. Only people in
                  this chat can read, listen to, or share them.{" "}
                  <strong>Learn more</strong>
                </p>

                <p data-vn-date>Yesterday</p>

                <UnsupportedVoiceNote note={SHORT} time="21:47" />

                <p data-vn-date>Today</p>

                <div data-vn-msg data-side="out">
                  <div data-vn-bubble>
                    <p data-vn-text>
                      still on at yours sunday? what time should i come, and
                      what do i bring
                      <span data-vn-meta-space data-ticks="true" />
                    </p>
                    <span data-vn-meta>
                      10:39
                      <span data-vn-ticks>
                        <ReadTicks />
                      </span>
                    </span>
                    <Surface />
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {recording && (
                    <motion.div
                      key={`recording-${runId}`}
                      data-vn-arrival
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={OPEN}
                    >
                      <motion.div
                        data-vn-msg
                        data-side="in"
                        initial={{ opacity: 0, scale: 0.4, rotate: -14 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.6, rotate: -8 }}
                        transition={{
                          type: "spring",
                          duration: 0.45,
                          bounce: 0.28,
                        }}
                        style={{ transformOrigin: "14px 100%" }}
                      >
                        <RecordingBubble />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {arrived && (
                    <motion.div
                      key={runId}
                      ref={arrivalRef}
                      data-vn-arrival
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      transition={OPEN}
                      onAnimationComplete={function settleArrival() {
                        // Clipping is only for the entrance; after it, the
                        // check card may reach past the bubble's edge.
                        arrivalRef.current?.setAttribute(
                          "data-settled",
                          "true",
                        );
                      }}
                    >
                      <motion.div
                        data-vn-msg
                        data-side="in"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...OPEN, delay: 0.06 }}
                      >
                        <div
                          data-vn-bubble
                          data-kind="voice"
                          ref={bubbleRef}
                          role="group"
                          aria-label={`Voice message from Uzo, ${spokenTime(DURATION)}`}
                        >
                          <div data-vn-player>
                            <button
                              type="button"
                              data-vn-play
                              data-vn-press
                              aria-label={
                                playing
                                  ? "Pause voice message"
                                  : "Play voice message"
                              }
                              onClick={togglePlayback}
                              disabled={audioError}
                            >
                              <PlayGlyph state={glyph} />
                            </button>

                            <div
                              ref={waveRef}
                              data-vn-wave
                              role="slider"
                              tabIndex={0}
                              aria-label="Voice message position"
                              aria-valuemin={0}
                              aria-valuemax={Math.round(DURATION)}
                              aria-valuenow={0}
                              aria-valuetext={`0:00 of ${TOTAL_LABEL}`}
                              onPointerDown={handleWavePointerDown}
                              onPointerMove={handleWavePointerMove}
                              onPointerUp={finishScrub}
                              onPointerCancel={finishScrub}
                              onLostPointerCapture={finishScrub}
                              onKeyDown={handleWaveKeyDown}
                            >
                              <Bars peaks={PEAKS} />
                              <motion.span
                                data-vn-played
                                style={{ clipPath: playedClip }}
                              >
                                <Bars peaks={PEAKS} played />
                              </motion.span>
                              <motion.span
                                data-vn-knob
                                style={{
                                  left: knobLeft,
                                  backgroundColor: played ? BLUE : GREEN,
                                }}
                                aria-hidden="true"
                              />
                            </div>

                            <div data-vn-side>
                              <motion.span
                                data-vn-sender
                                initial={false}
                                animate={{
                                  opacity: showSpeed ? 0 : 1,
                                  scale: showSpeed ? 0.86 : 1,
                                }}
                                transition={SWAP}
                                aria-hidden="true"
                              >
                                <DefaultAvatar size="note" />
                                <span
                                  data-vn-badge
                                  style={{ color: played ? BLUE : GREEN }}
                                >
                                  <MicBadgeGlyph />
                                </span>
                              </motion.span>
                              <motion.button
                                type="button"
                                data-vn-speed
                                data-vn-press
                                initial={false}
                                animate={{
                                  opacity: showSpeed ? 1 : 0,
                                  scale: showSpeed ? 1 : 0.86,
                                }}
                                transition={SWAP}
                                tabIndex={showSpeed ? 0 : -1}
                                aria-hidden={!showSpeed}
                                aria-label={`Playback speed ${speed} times`}
                                style={{
                                  pointerEvents: showSpeed ? "auto" : "none",
                                }}
                                onClick={changeSpeed}
                              >
                                {speed}×
                              </motion.button>
                            </div>
                          </div>

                          <div data-vn-sub>
                            <motion.span data-vn-duration>{label}</motion.span>
                            {audioError ? (
                              <span data-vn-error role="status">
                                Audio couldn&apos;t load
                              </span>
                            ) : (
                              <span data-vn-meta data-inline>
                                10:42
                              </span>
                            )}
                          </div>

                          <div data-vn-transcript-area>
                            <div data-vn-stack>
                              <motion.div
                                data-vn-clip
                                initial={false}
                                animate={{
                                  height: expanded ? "auto" : layout.collapsed,
                                }}
                                // The first measured preview height snaps, so the bubble
                                // never creeps by a few pixels on arrival.
                                transition={measured ? OPEN : { duration: 0 }}
                              >
                                <motion.div
                                  ref={transcriptRef}
                                  data-vn-transcript
                                  data-mode="rest"
                                  role="group"
                                  aria-label="Transcript"
                                  aria-describedby="vn-transcript-help"
                                  tabIndex={transcribing ? -1 : 0}
                                  initial={false}
                                  animate={{ opacity: transcribing ? 0 : 1 }}
                                  transition={SWAP}
                                  onPointerDown={handleTranscriptPointerDown}
                                  onPointerMove={handleTranscriptPointerMove}
                                  onClick={handleTranscriptClick}
                                  onFocus={handleTranscriptFocus}
                                  onKeyDown={handleTranscriptKeyDown}
                                >
                                  <motion.span
                                    data-vn-hl
                                    aria-hidden="true"
                                    style={{
                                      x: layerA.x,
                                      y: layerA.y,
                                      width: layerA.width,
                                      height: layerA.height,
                                      opacity: layerA.opacity,
                                      scale: layerA.scale,
                                    }}
                                  />
                                  <motion.span
                                    data-vn-hl
                                    aria-hidden="true"
                                    style={{
                                      x: layerB.x,
                                      y: layerB.y,
                                      width: layerB.width,
                                      height: layerB.height,
                                      opacity: layerB.opacity,
                                      scale: layerB.scale,
                                    }}
                                  />
                                  <TranscriptText
                                    expanded={expanded}
                                    fold={layout.fold}
                                  />
                                </motion.div>

                                <motion.span
                                  data-vn-fade
                                  aria-hidden="true"
                                  initial={false}
                                  animate={{
                                    opacity: expanded || transcribing ? 0 : 1,
                                  }}
                                  transition={{ duration: 0.2, ease: EASE }}
                                  style={{ top: layout.collapsed - 16 }}
                                />
                              </motion.div>

                              <AnimatePresence>
                                {transcribing && (
                                  <motion.div
                                    data-vn-shimmer
                                    aria-hidden="true"
                                    initial={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={SWAP}
                                  >
                                    <i style={{ width: "100%" }} />
                                    <i style={{ width: "93%" }} />
                                    <i style={{ width: "58%" }} />
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <AnimatePresence>
                                {check !== null && (
                                  <CheckCard
                                    key={check.index}
                                    check={check}
                                    progress={stretchProgress}
                                    onReplay={replayCheck}
                                    onPlayFrom={playFromCheck}
                                    onKeyDown={handleCheckKeyDown}
                                  />
                                )}
                              </AnimatePresence>
                            </div>

                            <div data-vn-footer>
                              <motion.button
                                type="button"
                                data-vn-more
                                initial={false}
                                animate={{ opacity: transcribing ? 0 : 1 }}
                                transition={SWAP}
                                tabIndex={transcribing ? -1 : 0}
                                aria-hidden={transcribing}
                                aria-expanded={expanded}
                                style={{
                                  pointerEvents: transcribing ? "none" : "auto",
                                }}
                                onClick={toggleExpanded}
                              >
                                <span data-vn-more-label>
                                  <motion.span
                                    initial={false}
                                    animate={{ opacity: expanded ? 0 : 1 }}
                                    transition={SWAP}
                                    aria-hidden={expanded}
                                  >
                                    Read more
                                  </motion.span>
                                  <motion.span
                                    initial={false}
                                    animate={{ opacity: expanded ? 1 : 0 }}
                                    transition={SWAP}
                                    aria-hidden={!expanded}
                                  >
                                    Show less
                                  </motion.span>
                                </span>
                              </motion.button>
                            </div>
                          </div>

                          <Surface />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hints live in the conversation, like WhatsApp's own system
                    notices, so they never sit on top of a message. Their slot
                    arrives with the voice note, so the chip fades into place
                    instead of pushing the chat up while the transcript reveals. */}
                <AnimatePresence initial={false}>
                  {arrived && hint < HINTS.length && (
                    <motion.div
                      key={`hint-${runId}`}
                      data-vn-arrival
                      data-vn-hint-slot
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={OPEN}
                    >
                      <div data-vn-hint-box>
                        <AnimatePresence mode="wait" initial={false}>
                          {showHint && (
                            <motion.p
                              key={hint}
                              data-vn-hint
                              aria-hidden="true"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{
                                ...SWAP,
                                delay: hint === 0 ? 0.35 : 0,
                              }}
                            >
                              <span data-vn-hint-dot />
                              {HINTS[hint]}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Liquid Glass: no bar, just floating controls over a soft blur. */}
            <header data-vn-header ref={headerRef}>
              <button
                type="button"
                data-vn-glass
                data-vn-back
                data-vn-press
                aria-label="Back to chats. Reopens this chat from the start"
                onClick={replayChat}
              >
                <BackIcon />
              </button>
              <DefaultAvatar size="header" />
              <div data-vn-who>
                <strong>Uzo</strong>
                <span data-vn-status>
                  <motion.span
                    initial={false}
                    animate={{ opacity: recording ? 0 : 1 }}
                    transition={SWAP}
                  >
                    online
                  </motion.span>
                  <motion.span
                    initial={false}
                    animate={{ opacity: recording ? 1 : 0 }}
                    transition={SWAP}
                    aria-hidden={!recording}
                  >
                    recording audio…
                  </motion.span>
                </span>
              </div>
              <span data-vn-glass data-vn-calls aria-hidden="true">
                <VideoIcon />
                <PhoneIcon />
              </span>
            </header>

            <div data-vn-bar ref={barRef}>
              <div data-vn-bar-row aria-hidden="true">
                <span data-vn-glass data-vn-round>
                  <PlusIcon />
                </span>
                <span data-vn-glass data-vn-field>
                  <StickerIcon />
                </span>
                <span data-vn-glass data-vn-round>
                  <CameraIcon />
                </span>
                <span data-vn-mic>
                  <MicIcon />
                </span>
              </div>
            </div>

            <p id="vn-transcript-help" className="sr-only">
              Tap a word to play from it. With the keyboard, use the left and
              right arrow keys to move between words and Enter to play from one.
            </p>
            <p className="sr-only" aria-live="polite">
              {announcement}
            </p>

            {/* Voice notes are short and local; load eagerly so a first tap
                plays within a frame or two. */}
            <audio ref={audioRef} src={SRC} preload="auto" />
          </div>
        </div>
      </div>

      <style>{STYLES}</style>
    </MotionConfig>
  );
}

const MIC_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="8.4" y="2.6" width="7.2" height="12" rx="3.6"/><path d="M5.2 11a6.8 6.8 0 0013.6 0M12 17.8V21" fill="none" stroke="#000" stroke-width="1.9" stroke-linecap="round"/></svg>',
)}")`;

const STYLES = `
  /* Tokens: WhatsApp follows the phone's appearance, so the prototype does too. */

  [data-vn-stage] {
    --vn-top: 10px;
    --vn-bottom: 12px;
    --vn-ease: cubic-bezier(0.32, 0.72, 0, 1);
    --vn-wallpaper: ${WALLPAPER_LIGHT};
    --vn-wall: #f5f1eb;
    --vn-text: #0b0b0b;
    --vn-dim: rgba(11, 11, 11, 0.42);
    --vn-meta: #8a8f93;
    --vn-meta-out: #6f8a6c;
    --vn-icon: #0b0b0b;
    --vn-in: #ffffff;
    --vn-out: #d9fdd3;
    --vn-bubble-shadow: drop-shadow(0 1px 0.5px rgba(0, 0, 0, 0.1));
    --vn-bar: #c2c7ca;
    --vn-bar-played: #767c80;
    --vn-play: #767779;
    --vn-highlight: rgba(37, 211, 102, 0.24);
    --vn-green: #1daa61;
    --vn-link: #1d8a5c;
    --vn-link-hover: #136b46;
    --vn-focus: #1d8a5c;
    --vn-tint: rgba(0, 0, 0, 0.055);
    --vn-tint-strong: rgba(0, 0, 0, 0.09);
    --vn-ticks: #2b8cf2;
    --vn-glass: rgba(255, 253, 249, 0.66);
    --vn-glass-hover: rgba(255, 253, 249, 0.9);
    --vn-glass-edge: inset 0 1px 0.5px rgba(255, 255, 255, 0.95),
      inset 0 -0.5px 0.5px rgba(255, 255, 255, 0.5),
      0 0 0 0.5px rgba(0, 0, 0, 0.07),
      0 6px 18px -6px rgba(60, 50, 30, 0.16);
    --vn-chip: rgba(255, 255, 255, 0.95);
    --vn-chip-text: #3b3b3b;
    --vn-notice: #fdefd2;
    --vn-notice-text: #3d3a33;
    --vn-avatar: #ced5da;
    --vn-avatar-glyph: #ffffff;
    --vn-speed: #8f9599;
    --vn-speed-hover: #7b8185;
    --vn-shimmer: #eeeeec;
    --vn-shimmer-light: #f8f8f7;
    --vn-low: #8aa596;
    --vn-low-hover: #4f7362;
    --vn-card: #ffffff;
    --vn-card-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.08),
      0 14px 34px -10px rgba(0, 0, 0, 0.28),
      0 3px 8px -4px rgba(0, 0, 0, 0.12);
    --vn-hairline: rgba(0, 0, 0, 0.09);
    --vn-check-tint: rgba(29, 170, 97, 0.12);
    --vn-stage-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12),
      0 40px 80px -32px rgba(0, 0, 0, 0.32),
      0 16px 32px -20px rgba(0, 0, 0, 0.22);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  @media (prefers-color-scheme: dark) {
    [data-vn-stage] {
      --vn-wallpaper: ${WALLPAPER_DARK};
      --vn-wall: #0b0b0b;
      --vn-text: #f2f2f2;
      --vn-dim: rgba(242, 242, 242, 0.4);
      --vn-meta: #9a9c9e;
      --vn-meta-out: #9bb8a8;
      --vn-icon: #f2f2f2;
      --vn-in: #262628;
      --vn-out: #1f4f3a;
      --vn-bubble-shadow: none;
      --vn-bar: #55595c;
      --vn-bar-played: #c9ccce;
      --vn-play: #a9abad;
      --vn-highlight: rgba(37, 211, 102, 0.3);
      --vn-green: #21c063;
      --vn-link: #21c063;
      --vn-link-hover: #4fd889;
      --vn-focus: #21c063;
      --vn-tint: rgba(255, 255, 255, 0.07);
      --vn-tint-strong: rgba(255, 255, 255, 0.12);
      --vn-ticks: #53bdeb;
      --vn-glass: rgba(42, 42, 44, 0.58);
      --vn-glass-hover: rgba(58, 58, 60, 0.75);
      --vn-glass-edge: inset 0 1px 0.5px rgba(255, 255, 255, 0.14),
        inset 0 -0.5px 0.5px rgba(255, 255, 255, 0.05),
        0 0 0 0.5px rgba(255, 255, 255, 0.07),
        0 6px 18px -6px rgba(0, 0, 0, 0.5);
      --vn-chip: #1c1c1c;
      --vn-chip-text: #e6e6e6;
      --vn-notice: #1c1c1c;
      --vn-notice-text: #f5c86a;
      --vn-avatar: #3d4144;
      --vn-avatar-glyph: #7c8286;
      --vn-speed: #55595c;
      --vn-speed-hover: #63686b;
      --vn-shimmer: #333436;
      --vn-shimmer-light: #45474a;
      --vn-low: #6e8a7b;
      --vn-low-hover: #9fc4b0;
      --vn-card: #2c2c2e;
      --vn-card-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.08),
        0 14px 34px -10px rgba(0, 0, 0, 0.7);
      --vn-hairline: rgba(255, 255, 255, 0.1);
      --vn-check-tint: rgba(33, 192, 99, 0.16);
      --vn-stage-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08),
        0 40px 80px -32px rgba(0, 0, 0, 0.8);
    }
  }

  [data-vn-device] {
    position: relative;
    width: 390px;
    height: clamp(640px, calc(100svh - 112px), 800px);
    border-radius: 16px;
    background: var(--vn-wall);
    box-shadow: var(--vn-stage-shadow);
  }

  [data-vn-screen] {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    color: var(--vn-text);
    background: var(--vn-wall);
    isolation: isolate;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "SF Pro Text",
      var(--font-geist-sans),
      "Helvetica Neue",
      sans-serif;
    user-select: none;
    -webkit-user-select: none;
  }

  :where([data-vn-screen]) button {
    margin: 0;
    padding: 0;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  [data-vn-screen] p {
    margin: 0;
  }

  [data-vn-screen] svg {
    display: block;
  }

  [data-vn-screen] button:focus-visible,
  [data-vn-wave]:focus-visible {
    outline: 2px solid var(--vn-focus);
    outline-offset: 2px;
  }

  /* Liquid Glass ----------------------------------------------------------- */

  [data-vn-glass] {
    position: relative;
    display: grid;
    place-items: center;
    color: var(--vn-icon);
    background: var(--vn-glass);
    box-shadow: var(--vn-glass-edge);
    backdrop-filter: blur(10px) saturate(1.7);
    -webkit-backdrop-filter: blur(10px) saturate(1.7);
  }

  /* Header: transparent, floating over a progressive blur ------------------ */

  [data-vn-header] {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(var(--vn-top) + 4px) 12px 10px;
  }

  [data-vn-header]::before,
  [data-vn-bar]::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    z-index: -1;
    pointer-events: none;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  [data-vn-header]::before {
    top: 0;
    bottom: -26px;
    background: linear-gradient(
      color-mix(in srgb, var(--vn-wall) 97%, transparent) 0%,
      color-mix(in srgb, var(--vn-wall) 86%, transparent) 55%,
      transparent 100%
    );
    mask-image: linear-gradient(#000 58%, transparent);
    -webkit-mask-image: linear-gradient(#000 58%, transparent);
  }

  [data-vn-back] {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    border-radius: 50%;
  }

  [data-vn-back] svg {
    width: 22px;
    height: 22px;
    margin-left: -2px;
  }

  [data-vn-avatar] {
    display: grid;
    place-items: end center;
    flex: 0 0 auto;
    overflow: hidden;
    border-radius: 50%;
    color: var(--vn-avatar-glyph);
    background: var(--vn-avatar);
  }

  [data-vn-avatar] svg {
    width: 100%;
    height: 100%;
  }

  [data-vn-avatar][data-size="header"] {
    width: 38px;
    height: 38px;
    margin-left: 2px;
  }

  [data-vn-who] {
    display: grid;
    flex: 1 1 auto;
    min-width: 0;
    padding-left: 2px;
  }

  [data-vn-who] strong {
    font-size: 17px;
    font-weight: 600;
    line-height: 21px;
    letter-spacing: -0.02em;
  }

  [data-vn-status] {
    display: grid;
    color: var(--vn-meta);
    font-size: 12px;
    line-height: 15px;
  }

  [data-vn-status] > span {
    grid-area: 1 / 1;
  }

  [data-vn-calls] {
    display: flex;
    align-items: center;
    gap: 22px;
    height: 44px;
    padding: 0 17px;
    border-radius: 22px;
  }

  [data-vn-calls] svg {
    width: 24px;
    height: 24px;
  }

  /* Chat ------------------------------------------------------------------- */

  [data-vn-scroll] {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: calc(var(--vn-top) + 66px) 0 calc(var(--vn-bottom) + 76px);
    background-color: var(--vn-wall);
    background-image: var(--vn-wallpaper);
    background-size: 300px 300px;
    background-attachment: local;
    scrollbar-width: none;
  }

  [data-vn-scroll]::-webkit-scrollbar {
    display: none;
  }

  [data-vn-thread] {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    padding-bottom: 4px;
  }

  [data-vn-notice] {
    max-width: 340px;
    margin: auto auto 14px !important;
    padding: 7px 12px 8px;
    border-radius: 10px;
    color: var(--vn-notice-text);
    background: var(--vn-notice);
    font-size: 12.5px;
    line-height: 16px;
    text-align: center;
    text-wrap: balance;
  }

  [data-vn-notice] svg {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 4px;
    vertical-align: -0.5px;
  }

  [data-vn-notice] strong {
    font-weight: 600;
  }

  [data-vn-date] {
    align-self: center;
    margin: 4px 0 10px !important;
    padding: 3px 10px;
    border-radius: 999px;
    color: var(--vn-chip-text);
    background: var(--vn-chip);
    box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.06);
    font-size: 12px;
    font-weight: 600;
    line-height: 16px;
  }

  [data-vn-msg] {
    display: flex;
    padding: 0 12px 8px 14px;
  }

  [data-vn-msg][data-side="out"] {
    justify-content: flex-end;
    padding: 0 14px 8px 12px;
  }

  [data-vn-arrival] {
    overflow: hidden;
    flex: 0 0 auto;
  }

  /* Entrances clip; once settled, a card may reach past the bubble. */
  [data-vn-arrival][data-settled] {
    overflow: visible;
  }

  [data-vn-bubble] {
    position: relative;
    isolation: isolate;
    max-width: 80%;
    padding: 6px 9px 7px 11px;
    border-radius: 16px;
  }

  [data-side="in"] [data-vn-bubble] {
    border-bottom-left-radius: 5px;
  }

  [data-side="out"] [data-vn-bubble] {
    border-bottom-right-radius: 5px;
  }

  [data-vn-surface] {
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--vn-in);
    filter: var(--vn-bubble-shadow);
    pointer-events: none;
  }

  [data-side="out"] [data-vn-surface] {
    background: var(--vn-out);
  }

  [data-vn-tail] {
    position: absolute;
    bottom: 0;
    width: 12px;
    height: 17px;
  }

  [data-vn-tail] path {
    fill: var(--vn-in);
  }

  [data-side="in"] [data-vn-tail] {
    left: -6px;
  }

  [data-side="out"] [data-vn-tail] {
    right: -6px;
    transform: scaleX(-1);
  }

  [data-side="out"] [data-vn-tail] path {
    fill: var(--vn-out);
  }

  [data-vn-text] {
    font-size: 17px;
    line-height: 22px;
    letter-spacing: -0.022em;
    overflow-wrap: anywhere;
    user-select: text;
    -webkit-user-select: text;
  }

  [data-vn-meta-space] {
    display: inline-block;
    width: 42px;
    height: 1px;
  }

  [data-vn-meta-space][data-ticks="true"] {
    width: 62px;
  }

  [data-vn-meta] {
    position: absolute;
    right: 10px;
    bottom: 6px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--vn-meta);
    font-size: 12px;
    line-height: 14px;
    font-variant-numeric: tabular-nums;
  }

  [data-side="out"] [data-vn-meta] {
    color: var(--vn-meta-out);
  }

  [data-vn-meta][data-inline] {
    position: static;
  }

  [data-vn-ticks] {
    display: inline-flex;
    color: var(--vn-ticks);
  }

  [data-vn-ticks] svg {
    width: 18px;
    height: 11px;
  }

  /* Recording indicator ---------------------------------------------------- */

  [data-vn-recording] {
    position: relative;
    isolation: isolate;
    display: grid;
    place-items: center;
    width: 46px;
    height: 36px;
    border-radius: 18px 18px 18px 5px;
  }

  [data-vn-recording-mic] {
    display: block;
    width: 20px;
    height: 20px;
    background: linear-gradient(
      100deg,
      var(--vn-play) 0%,
      var(--vn-play) 38%,
      var(--vn-shimmer-light) 50%,
      var(--vn-play) 62%,
      var(--vn-play) 100%
    );
    background-size: 280% 100%;
    mask: ${MIC_MASK} center / contain no-repeat;
    -webkit-mask: ${MIC_MASK} center / contain no-repeat;
    animation: vn-mic 1.4s linear infinite;
  }

  @keyframes vn-mic {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0 0;
    }
  }

  /* Voice note ------------------------------------------------------------- */

  [data-vn-bubble][data-kind="voice"] {
    width: 316px;
    max-width: calc(100% - 46px);
    padding: 9px 10px 7px 6px;
  }

  [data-vn-player] {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) 44px;
    align-items: center;
    gap: 4px;
    height: 50px;
  }

  [data-vn-play] {
    position: relative;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--vn-play);
  }

  [data-vn-play]:disabled {
    cursor: default;
    opacity: 0.5;
  }

  [data-vn-glyphs] {
    position: relative;
    width: 28px;
    height: 28px;
  }

  [data-vn-glyph],
  [data-vn-spinner] {
    position: absolute;
    inset: 0;
    width: 28px;
    height: 28px;
  }

  [data-vn-spinner] {
    inset: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--vn-play) 22%, transparent);
    border-top-color: var(--vn-play);
    animation: vn-spin 0.8s linear infinite;
  }

  @keyframes vn-spin {
    to {
      transform: rotate(360deg);
    }
  }

  [data-vn-wave] {
    position: relative;
    height: 34px;
    margin: 0 18px 0 4px;
    border-radius: 6px;
    cursor: pointer;
    touch-action: none;
  }

  [data-vn-wave][data-static] {
    cursor: default;
  }

  [data-vn-bars] {
    position: absolute;
    inset: 0 0 0 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
  }

  [data-vn-bars] i {
    width: 2.4px;
    border-radius: 2px;
    background: var(--vn-bar);
  }

  [data-vn-bars] i[data-dot] {
    width: 2.8px;
    height: 2.8px;
    border-radius: 50%;
  }

  [data-vn-bars][data-played] i {
    background: var(--vn-bar-played);
  }

  [data-vn-played] {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  [data-vn-knob] {
    position: absolute;
    top: 50%;
    width: 13px;
    height: 13px;
    margin: -6.5px 0 0 -1px;
    border-radius: 50%;
    box-shadow: 0 0 0 0 var(--vn-tint);
    transition:
      background-color 300ms ease,
      box-shadow 160ms ease;
    pointer-events: none;
  }

  [data-vn-side] {
    position: relative;
    width: 44px;
    height: 44px;
  }

  [data-vn-sender] {
    position: absolute;
    inset: 0;
    display: block;
  }

  [data-vn-avatar][data-size="note"] {
    width: 44px;
    height: 44px;
  }

  [data-vn-badge] {
    position: absolute;
    left: -7px;
    bottom: -2px;
    display: grid;
    width: 20px;
    height: 20px;
    transition: color 300ms ease 200ms;
  }

  [data-vn-badge] svg {
    width: 20px;
    height: 20px;
    overflow: visible;
    paint-order: stroke;
    stroke: var(--vn-in);
    stroke-width: 2.6px;
    stroke-linejoin: round;
  }

  [data-vn-badge] svg path:last-child {
    stroke: currentColor;
  }

  [data-vn-speed] {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 42px;
    height: 26px;
    margin: -13px 0 0 -21px;
    border-radius: 13px;
    color: #fff;
    background: var(--vn-speed);
    font-size: 13.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }

  [data-vn-sub] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 16px;
    margin: -2px 66px 0 52px;
  }

  [data-vn-duration] {
    color: var(--vn-meta);
    font-size: 12px;
    line-height: 16px;
    font-variant-numeric: tabular-nums;
  }

  [data-vn-error] {
    color: #e5534b;
    font-size: 12px;
  }

  [data-vn-unavailable] {
    margin: 8px 0 2px 8px !important;
    color: var(--vn-meta);
    font-size: 14px;
    line-height: 18px;
  }

  /* Transcript ------------------------------------------------------------- */

  [data-vn-transcript-area] {
    margin-top: 10px;
    padding: 0 2px 0 7px;
  }

  [data-vn-stack] {
    position: relative;
  }

  [data-vn-clip] {
    position: relative;
    overflow: hidden;
  }

  [data-vn-transcript] {
    position: relative;
    isolation: isolate;
    font-size: 15px;
    line-height: 21px;
    letter-spacing: -0.012em;
    color: var(--vn-text);
    user-select: text;
    -webkit-user-select: text;
    outline: none;
  }

  [data-vn-para] + [data-vn-para] {
    margin-top: 6px;
  }

  [data-vn-hl] {
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    border-radius: 4px;
    background: var(--vn-highlight);
    pointer-events: none;
  }

  [data-vn-word] {
    border-radius: 4px;
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 120ms ease,
      box-shadow 120ms ease;
  }

  [data-vn-transcript][data-mode="live"] [data-vn-word]:not([data-state]) {
    color: var(--vn-dim);
  }

  [data-vn-word][data-low] {
    text-decoration-line: underline;
    text-decoration-style: dotted;
    text-decoration-color: var(--vn-low);
    text-decoration-thickness: 1.5px;
    text-underline-offset: 3px;
  }

  [data-vn-word]:active {
    background-color: var(--vn-tint-strong);
    box-shadow: 0 0 0 2px var(--vn-tint-strong);
  }

  [data-vn-transcript]:focus-visible [data-vn-word][data-kbd] {
    outline: 2px solid var(--vn-focus);
    outline-offset: 1px;
  }

  [data-vn-stamp] {
    display: inline-block;
    margin: 0 3px 0 -3px;
    padding: 0 3px;
    border-radius: 4px;
    color: var(--vn-meta) !important;
    font-size: 11.5px !important;
    line-height: 16px;
    font-variant-numeric: tabular-nums;
    vertical-align: 1px;
    user-select: none;
    -webkit-user-select: none;
    transition:
      scale 240ms var(--vn-ease),
      color 160ms ease,
      background-color 160ms ease;
  }

  [data-vn-stamp]:active {
    scale: 0.94;
    background-color: var(--vn-tint-strong);
    transition-duration: 90ms;
  }

  [data-vn-fade] {
    position: absolute;
    left: 0;
    right: 0;
    height: 16px;
    background: linear-gradient(
      transparent,
      color-mix(in srgb, var(--vn-in) 92%, transparent)
    );
    pointer-events: none;
  }

  [data-vn-shimmer] {
    position: absolute;
    inset: 0 0 auto;
    display: grid;
    gap: 12px;
    padding-top: 6px;
    pointer-events: none;
  }

  [data-vn-shimmer] i {
    display: block;
    height: 9px;
    border-radius: 5px;
    background: linear-gradient(
      90deg,
      var(--vn-shimmer) 0%,
      var(--vn-shimmer) 35%,
      var(--vn-shimmer-light) 50%,
      var(--vn-shimmer) 65%,
      var(--vn-shimmer) 100%
    );
    background-size: 300% 100%;
    animation: vn-shimmer 1.3s linear infinite;
  }

  @keyframes vn-shimmer {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0 0;
    }
  }

  [data-vn-footer] {
    display: flex;
    align-items: flex-end;
    height: 24px;
  }

  [data-vn-more] {
    margin-left: -4px !important;
    padding: 0 4px !important;
    border-radius: 4px;
    color: var(--vn-link) !important;
    font-size: 15px !important;
    font-weight: 500 !important;
    line-height: 21px;
    transition:
      scale 240ms var(--vn-ease),
      color 160ms ease,
      background-color 160ms ease;
  }

  [data-vn-more]:active {
    scale: 0.96;
    transition-duration: 90ms;
  }

  /* Both labels share one slot, sized by the wider one, so nothing shifts. */
  [data-vn-more-label] {
    display: grid;
    justify-items: start;
  }

  [data-vn-more-label] > span {
    grid-area: 1 / 1;
  }

  /* Check card for a dotted word --------------------------------------------- */

  [data-vn-check-anchor] {
    position: absolute;
    z-index: 4;
    width: ${CHECK_WIDTH}px;
  }

  [data-vn-check] {
    position: relative;
    border-radius: 14px;
    color: var(--vn-text);
    background: var(--vn-card);
    box-shadow: var(--vn-card-shadow);
    user-select: none;
    -webkit-user-select: none;
  }

  [data-vn-check-caret] {
    position: absolute;
    bottom: -5px;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    border-radius: 2px;
    background: var(--vn-card);
    transform: rotate(45deg);
  }

  [data-vn-check][data-below] [data-vn-check-caret] {
    top: -5px;
    bottom: auto;
  }

  [data-vn-check-head] {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px 10px 10px;
  }

  [data-vn-check-replay] {
    position: relative;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: var(--vn-green) !important;
    background: var(--vn-check-tint) !important;
    transition:
      scale 240ms var(--vn-ease),
      background-color 160ms ease;
  }

  [data-vn-check-replay]:active {
    scale: 0.94;
    transition-duration: 90ms;
  }

  [data-vn-check-ring] {
    position: absolute;
    inset: 0;
    width: 36px;
    height: 36px;
    transform: rotate(-90deg);
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
  }

  [data-vn-check-ring] [data-track] {
    stroke: transparent;
  }

  [data-vn-check-ring] [data-fill] {
    stroke: var(--vn-green);
  }

  [data-vn-check-glyph] {
    width: 18px;
    height: 18px;
  }

  [data-vn-check-text] {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  [data-vn-check-word] {
    font-size: 15px;
    font-weight: 600;
    line-height: 20px;
    letter-spacing: -0.015em;
  }

  [data-vn-check-alt] {
    color: var(--vn-meta);
    font-size: 13px;
    line-height: 17px;
  }

  [data-vn-check-alt] strong {
    color: var(--vn-text);
    font-weight: 500;
  }

  [data-vn-check-action] {
    position: relative;
    display: block;
    width: 100%;
    height: 40px;
    padding: 0 14px !important;
    border-top: 0.5px solid var(--vn-hairline) !important;
    border-radius: 0 0 14px 14px;
    color: var(--vn-link) !important;
    font-size: 15px !important;
    font-weight: 500 !important;
    text-align: left;
    transition: background-color 160ms ease;
  }

  [data-vn-check-action]:active {
    background: var(--vn-tint-strong) !important;
  }

  /* Hints, as system notices in the conversation ---------------------------- */

  [data-vn-hint] {
    display: flex;
    align-items: center;
    gap: 7px;
    width: fit-content;
    margin: 0 auto !important;
    padding: 5px 11px 5px 9px;
    border-radius: 999px;
    color: var(--vn-chip-text);
    background: var(--vn-chip);
    box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.06);
    font-size: 12.5px;
    font-weight: 500;
    line-height: 16px;
    letter-spacing: -0.005em;
  }

  /* A fixed slot: hints swap inside it without moving the chat. */
  [data-vn-hint-box] {
    height: 36px;
    padding-top: 6px;
  }

  [data-vn-hint-dot] {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--vn-green);
  }

  /* Chat bar: floating glass ----------------------------------------------- */

  [data-vn-bar] {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    display: grid;
    justify-items: center;
    padding: 0 10px var(--vn-bottom);
  }

  [data-vn-bar]::before {
    top: -18px;
    bottom: 0;
    background: linear-gradient(
      transparent 0%,
      color-mix(in srgb, var(--vn-wall) 55%, transparent) 45%,
      color-mix(in srgb, var(--vn-wall) 85%, transparent) 100%
    );
    mask-image: linear-gradient(transparent, #000 45%);
    -webkit-mask-image: linear-gradient(transparent, #000 45%);
  }

  [data-vn-bar-row] {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  [data-vn-round] {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    border-radius: 50%;
  }

  [data-vn-round] svg {
    width: 24px;
    height: 24px;
  }

  [data-vn-field] {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex: 1 1 auto;
    height: 44px;
    padding: 0 12px;
    border-radius: 22px;
  }

  [data-vn-field] svg {
    width: 23px;
    height: 23px;
  }

  [data-vn-mic] {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    border-radius: 50%;
    color: #fff;
    background: var(--vn-green);
    box-shadow:
      inset 0 1px 0.5px rgba(255, 255, 255, 0.35),
      0 6px 16px -6px color-mix(in srgb, var(--vn-green) 55%, transparent);
  }

  [data-vn-mic] svg {
    width: 23px;
    height: 23px;
  }

  /* Press + hover ----------------------------------------------------------
     Press is a small, quick settle. Hover never scales: it changes colour or
     reveals a quiet surface. */

  [data-vn-press] {
    scale: 1;
    transition:
      scale 240ms var(--vn-ease),
      background-color 160ms ease,
      color 160ms ease;
    will-change: scale;
    backface-visibility: hidden;
  }

  [data-vn-press]:active {
    scale: 0.94;
    transition-duration: 90ms;
  }

  [data-vn-play]:active [data-vn-glyphs] {
    scale: 0.94;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-vn-play]:hover {
      color: var(--vn-text);
      background: var(--vn-tint);
    }

    [data-vn-back]:hover {
      background: var(--vn-glass-hover);
    }

    [data-vn-wave]:not([data-static]):hover [data-vn-knob] {
      box-shadow: 0 0 0 4px var(--vn-tint-strong);
    }

    [data-vn-speed]:hover {
      background: var(--vn-speed-hover);
    }

    [data-vn-word]:hover {
      background-color: var(--vn-tint);
      box-shadow: 0 0 0 2px var(--vn-tint);
    }

    [data-vn-word]:hover:active {
      background-color: var(--vn-tint-strong);
      box-shadow: 0 0 0 2px var(--vn-tint-strong);
    }

    [data-vn-word][data-low]:hover {
      text-decoration-color: var(--vn-low-hover);
    }

    [data-vn-stamp]:hover {
      color: var(--vn-text) !important;
      background-color: var(--vn-tint);
    }

    [data-vn-more]:hover {
      color: var(--vn-link-hover) !important;
      background-color: color-mix(in srgb, var(--vn-link) 9%, transparent);
    }

    [data-vn-check-replay]:hover {
      background: color-mix(in srgb, var(--vn-green) 20%, transparent) !important;
    }

    [data-vn-check-action]:hover {
      background: var(--vn-tint) !important;
    }
  }

  [data-vn-wave]:not([data-static]):active [data-vn-knob] {
    box-shadow: 0 0 0 6px var(--vn-tint-strong);
  }

  /* On a real phone the prototype is the whole screen ---------------------- */

  @media (max-width: 520px) {
    [data-vn-stage] {
      --vn-top: max(env(safe-area-inset-top), 8px);
      --vn-bottom: max(env(safe-area-inset-bottom), 12px);
    }

    [data-vn-device] {
      width: 100vw;
      height: 100dvh;
      border-radius: 0;
      box-shadow: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-vn-screen] * {
      transition-duration: 0.01ms !important;
    }

    [data-vn-shimmer] i,
    [data-vn-recording-mic] {
      animation: none;
    }

    [data-vn-spinner] {
      animation-duration: 2.4s;
    }
  }
`;
