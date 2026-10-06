"use client";

import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import type {
  AnimationPlaybackControls,
  PanInfo,
  Transition,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent,
  ReactNode,
} from "react";
import {
  BookmarkIcon,
  ChevronDownIcon,
  CreateIcon,
  DevicesIcon,
  HeartIcon,
  HomeIcon,
  LibraryIcon,
  MoonIcon,
  MoreIcon,
  NextIcon,
  PauseGlyph,
  PlayGlyph,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  SearchIcon,
  ShareIcon,
  ShuffleIcon,
  SkipIcon,
} from "./icons";

type StreamId = "music" | "podcast";

type Stream = {
  id: StreamId;
  kind: string;
  title: string;
  creator: string;
  src: string;
  artwork: string;
  /** Mini-player and dock surface. */
  tint: string;
  /** Now Playing backdrop. */
  stage: string;
  fallbackDuration: number;
};

const STREAMS: Record<StreamId, Stream> = {
  music: {
    id: "music",
    kind: "Music",
    title: "Sirens",
    creator: "Ludwig Göransson",
    src: "/spotify/sirens.mp3",
    artwork: "/spotify/odyssey-sirens.jpg",
    tint: "#294861",
    stage: "#2e5875",
    fallbackDuration: 219,
  },
  podcast: {
    id: "podcast",
    kind: "Podcast",
    title: "The unfinished album",
    creator: "Second Listen",
    src: "/spotify/second-listen.mp3",
    artwork: "/spotify/second-listen.jpg",
    tint: "#7d331b",
    stage: "#93391b",
    fallbackDuration: 122,
  },
};

const STREAM_IDS = ["music", "podcast"] as const;

type Filter = "all" | "music" | "podcasts";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "podcasts", label: "Podcasts" },
];

type ItemId = "liked" | "odyssey" | "second-listen" | "episodes";

/** Places on Home you can start a stream from. Each one is a stream's context. */
type LibraryItem = {
  id: ItemId;
  stream: StreamId;
  filter: Exclude<Filter, "all">;
  title: string;
  subtitle: string;
  art: string | "liked" | "episodes";
  contextLabel: string;
  contextName: string;
};

const LIBRARY: LibraryItem[] = [
  {
    id: "liked",
    stream: "music",
    filter: "music",
    title: "Liked Songs",
    subtitle: "Playlist · 312 songs",
    art: "liked",
    contextLabel: "Playing from playlist",
    contextName: "Liked Songs",
  },
  {
    id: "odyssey",
    stream: "music",
    filter: "music",
    title: "The Odyssey",
    subtitle: "Album · Ludwig Göransson",
    art: "/spotify/odyssey-sirens.jpg",
    contextLabel: "Playing from album",
    contextName: "The Odyssey (Original Motion Picture Soundtrack)",
  },
  {
    id: "second-listen",
    stream: "podcast",
    filter: "podcasts",
    title: "Second Listen",
    subtitle: "Podcast · Maya & Theo",
    art: "/spotify/second-listen.jpg",
    contextLabel: "Playing from podcast",
    contextName: "Second Listen",
  },
  {
    id: "episodes",
    stream: "podcast",
    filter: "podcasts",
    title: "Your Episodes",
    subtitle: "Saved episodes",
    art: "episodes",
    contextLabel: "Playing from your library",
    contextName: "Your Episodes",
  },
];

const LIBRARY_BY_ID = Object.fromEntries(
  LIBRARY.map(function index(item) {
    return [item.id, item];
  }),
) as Record<ItemId, LibraryItem>;

const GREEN = "#1ed760";

// One curve for everything that travels. Fast out of the gate, long soft
// landing: the iOS sheet curve.
const EASE = [0.32, 0.72, 0, 1] as const;
const MOVE = { duration: 0.42, ease: EASE };
const FLIGHT = { duration: 0.5, ease: EASE };
const SHEET_OPEN = { duration: 0.44, ease: EASE };
const SHEET_CLOSE = { duration: 0.32, ease: EASE };

// Mini-player shuffle, modelled on pulling a card from the back of a deck:
// it lifts fully clear of the front card (decelerating into the apex), swaps
// layers only once nothing overlaps, then drops into place and lands softly.
// Rest at the apex on both sides means velocity never jumps, so it never snaps.
type Bezier = [number, number, number, number];

const SHUFFLE_LIFT = 70;
const SHUFFLE_APEX = 0.46;
const SHUFFLE_DURATION = 0.62;
const RISE: Bezier = [0.25, 0.8, 0.4, 1];
const FALL: Bezier = [0.55, 0, 0.2, 1];

const SHUFFLE_TRANSITION: Transition = {
  y: {
    duration: SHUFFLE_DURATION,
    times: [0, SHUFFLE_APEX, 1],
    ease: [RISE, FALL],
  },
  scale: {
    duration: SHUFFLE_DURATION,
    times: [0, SHUFFLE_APEX, 1],
    ease: [RISE, FALL],
  },
};

const PODCAST_SPEEDS = [1, 1.2, 1.5, 2, 0.8] as const;

const FADE_OUT_MS = 160;
const FADE_IN_MS = 320;
const PEEK = 10;

const MARQUEE_GAP = 40;
const MARQUEE_SPEED = 30;
const MARQUEE_HOLD = 2.2;

type RepeatMode = "off" | "all" | "one";

type AudioGraph = {
  context: AudioContext;
  gains: Record<StreamId, GainNode>;
};

/** An artwork travelling from the dock into the Now Playing hero slot. */
type Flight = {
  key: number;
  id: StreamId;
  left: number;
  top: number;
  size: number;
  dx: number;
  dy: number;
  scale: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function spokenTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;

  if (minutes === 0) {
    return `${remainder} seconds`;
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"} ${remainder} seconds`;
}

function otherStream(id: StreamId): StreamId {
  return id === "music" ? "podcast" : "music";
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  const transition = { duration: 0.14, ease: EASE };

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-tsm-pp>
      <motion.g
        initial={false}
        animate={{ opacity: playing ? 0 : 1, scale: playing ? 0.86 : 1 }}
        transition={transition}
        style={{ transformOrigin: "16px 16px", transformBox: "view-box" }}
      >
        <path
          d="M11.25 8.5c0-.9.98-1.46 1.76-1l11.08 6.5a2.32 2.32 0 010 4L13.01 24.5c-.78.46-1.76-.1-1.76-1V8.5z"
          fill="currentColor"
        />
      </motion.g>
      <motion.g
        initial={false}
        animate={{ opacity: playing ? 1 : 0, scale: playing ? 1 : 0.86 }}
        transition={transition}
        style={{ transformOrigin: "16px 16px", transformBox: "view-box" }}
      >
        <rect
          x="10.25"
          y="8"
          width="4.75"
          height="16"
          rx="1.35"
          fill="currentColor"
        />
        <rect
          x="17"
          y="8"
          width="4.75"
          height="16"
          rx="1.35"
          fill="currentColor"
        />
      </motion.g>
    </svg>
  );
}

function SavedIcon({ saved }: { saved: boolean }) {
  const transition = { duration: 0.16, ease: EASE };

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-tsm-save-icon>
      <motion.circle
        cx="16"
        cy="16"
        r="12.5"
        initial={false}
        animate={{
          fill: saved ? GREEN : "rgba(255,255,255,0)",
          stroke: saved ? GREEN : "rgba(255,255,255,0.72)",
        }}
        transition={transition}
        strokeWidth="1.8"
      />
      <motion.g
        initial={false}
        animate={{ opacity: saved ? 0 : 1, scale: saved ? 0.86 : 1 }}
        transition={transition}
        style={{ transformOrigin: "16px 16px", transformBox: "view-box" }}
      >
        <path
          d="M16 10.6v10.8M10.6 16h10.8"
          stroke="rgba(255,255,255,0.86)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </motion.g>
      <motion.g
        initial={false}
        animate={{ opacity: saved ? 1 : 0, scale: saved ? 1 : 0.86 }}
        transition={transition}
        style={{ transformOrigin: "16px 16px", transformBox: "view-box" }}
      >
        <path
          d="M10.7 16.2l3.5 3.4 7.2-7.7"
          stroke="#000"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  );
}

/** Two glyphs sharing one slot; the slot keeps its place while its meaning changes. */
function GlyphSwap({
  showFirst,
  first,
  second,
}: {
  showFirst: boolean;
  first: ReactNode;
  second: ReactNode;
}) {
  const transition = { duration: 0.2, ease: EASE, delay: 0.08 };

  return (
    <span data-tsm-glyph-swap aria-hidden="true">
      <motion.span
        data-tsm-glyph
        initial={false}
        animate={{ opacity: showFirst ? 1 : 0, scale: showFirst ? 1 : 0.8 }}
        transition={transition}
      >
        {first}
      </motion.span>
      <motion.span
        data-tsm-glyph
        initial={false}
        animate={{ opacity: showFirst ? 0 : 1, scale: showFirst ? 0.8 : 1 }}
        transition={transition}
      >
        {second}
      </motion.span>
    </span>
  );
}

/** Spotify scrolls titles that don't fit. Holds first so the start is readable. */
function MarqueeText({ text }: { text: string }) {
  const frameRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(
    function measure() {
      const frame = frameRef.current;
      const copy = copyRef.current;

      if (frame === null || copy === null) {
        return;
      }

      const frameElement: HTMLSpanElement = frame;
      const copyElement: HTMLSpanElement = copy;

      function update() {
        const overflow = copyElement.offsetWidth - frameElement.clientWidth;

        setDistance(overflow > 1 ? copyElement.offsetWidth + MARQUEE_GAP : 0);
      }

      update();

      const observer = new ResizeObserver(update);

      observer.observe(frameElement);

      return function cleanup() {
        observer.disconnect();
      };
    },
    [text],
  );

  useEffect(
    function runMarquee() {
      const track = trackRef.current;

      if (
        track === null ||
        distance === 0 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const total = distance / MARQUEE_SPEED + MARQUEE_HOLD;
      const animation = track.animate(
        [
          { transform: "translateX(0)", offset: 0 },
          { transform: "translateX(0)", offset: MARQUEE_HOLD / total },
          { transform: `translateX(${-distance}px)`, offset: 1 },
        ],
        { duration: total * 1000, iterations: Infinity },
      );

      return function cleanup() {
        animation.cancel();
      };
    },
    [distance],
  );

  return (
    <span
      ref={frameRef}
      data-tsm-marquee
      data-overflowing={distance > 0 ? "true" : "false"}
    >
      <span ref={trackRef} data-tsm-marquee-track>
        <span ref={copyRef}>{text}</span>
        {distance > 0 && <span aria-hidden="true">{text}</span>}
      </span>
    </span>
  );
}

function ItemArt({
  item,
  slot,
}: {
  item: LibraryItem;
  slot: "tile" | "shelf";
}) {
  const attribute =
    slot === "tile"
      ? { "data-tsm-tile-art": "" }
      : { "data-tsm-shelf-art": "" };

  if (item.art === "liked") {
    return (
      <span {...attribute} data-kind="liked" aria-hidden="true">
        <HeartIcon />
      </span>
    );
  }

  if (item.art === "episodes") {
    return (
      <span {...attribute} data-kind="episodes" aria-hidden="true">
        <BookmarkIcon />
      </span>
    );
  }

  return <img {...attribute} src={item.art} alt="" draggable={false} />;
}

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span
      data-tsm-eq
      data-playing={playing ? "true" : "false"}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
    </span>
  );
}

export function TwoStreamsPhone() {
  const reducedMotion = Boolean(useReducedMotion());
  // Drag gestures are touch-only. A mouse click that wobbles a few pixels
  // would otherwise nudge the sheet or dock and snap it back: a visible shake.
  const sheetDrag = useDragControls();
  const dockDrag = useDragControls();

  const audioRefs = useRef<Record<StreamId, HTMLAudioElement | null>>({
    music: null,
    podcast: null,
  });
  const graphRef = useRef<AudioGraph | null>(null);
  const pauseTimersRef = useRef<
    Record<StreamId, ReturnType<typeof setTimeout> | null>
  >({ music: null, podcast: null });

  const sheetRef = useRef<HTMLElement>(null);
  const artFrameRef = useRef<HTMLDivElement>(null);
  const dockArtRef = useRef<HTMLImageElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const trackRectRef = useRef<DOMRect | null>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  const activeIdRef = useRef<StreamId>("music");
  const durationsRef = useRef<Record<StreamId, number>>({
    music: STREAMS.music.fallbackDuration,
    podcast: STREAMS.podcast.fallbackDuration,
  });
  const scrubbingRef = useRef(false);
  const suppressPauseStateRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const glidingRef = useRef(false);
  const glideRef = useRef<AnimationPlaybackControls | null>(null);
  const inputModeRef = useRef<"pointer" | "keyboard">("pointer");
  const draggedDockRef = useRef(false);
  const lastAriaSecondRef = useRef(-1);
  const flightKeyRef = useRef(0);

  const [activeId, setActiveId] = useState<StreamId>("music");
  const [held, setHeld] = useState(false);
  const [heldAt, setHeldAt] = useState<Record<StreamId, number>>({
    music: 0,
    podcast: 0,
  });
  const [durations, setDurations] = useState<Record<StreamId, number>>({
    music: STREAMS.music.fallbackDuration,
    podcast: STREAMS.podcast.fallbackDuration,
  });
  const [playing, setPlaying] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [sources, setSources] = useState<Record<StreamId, ItemId>>({
    music: "odyssey",
    podcast: "second-listen",
  });
  const [flight, setFlight] = useState<Flight | null>(null);
  const [shuffling, setShuffling] = useState(false);
  // Which card paints on top. Motion jumps zIndex straight to its final value,
  // so the layer swap is timed by hand to the apex of the shuffle, when the
  // rising card has fully cleared the one in front.
  const [frontLayer, setFrontLayer] = useState<StreamId>("music");
  const layerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [peekHover, setPeekHover] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [trackKeyboardFocus, setTrackKeyboardFocus] = useState(false);
  const [saved, setSaved] = useState<Record<StreamId, boolean>>({
    music: true,
    podcast: false,
  });
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [speedIndex, setSpeedIndex] = useState(0);
  const [sleepTimer, setSleepTimer] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const heldId = otherStream(activeId);
  const active = STREAMS[activeId];
  const heldStream = STREAMS[heldId];
  const isMusic = activeId === "music";
  const speed = PODCAST_SPEEDS[speedIndex];

  function exists(id: StreamId) {
    return id === activeId || (held && id === heldId);
  }

  // Playback time lives in motion values and is written straight to the DOM,
  // so nothing re-renders while audio plays and in-flight motion is never
  // re-measured mid-swap.
  const time = useMotionValue(0);
  const progress = useMotionValue(0);
  const hoverRatio = useMotionValue(0);

  const currentText = useTransform(time, function toCurrent(value) {
    return formatTime(value);
  });
  const remainingText = useTransform(time, function toRemaining(value) {
    const duration = durationsRef.current[activeIdRef.current];

    return `-${formatTime(Math.max(0, duration - value))}`;
  });
  const hoverText = useTransform(hoverRatio, function toHoverTime(value) {
    return formatTime(value * durationsRef.current[activeIdRef.current]);
  });
  const hoverLeft = useTransform(hoverRatio, function toHoverLeft(value) {
    return `${clamp(value, 0.08, 0.92) * 100}%`;
  });
  const playedWidth = useTransform(progress, function toWidth(value) {
    return `${value * 100}%`;
  });

  useMotionValueEvent(time, "change", function syncSliderValue(value) {
    const second = Math.round(value);
    const track = trackRef.current;

    if (track === null || second === lastAriaSecondRef.current) {
      return;
    }

    lastAriaSecondRef.current = second;
    track.setAttribute("aria-valuenow", String(second));
    track.setAttribute(
      "aria-valuetext",
      `${formatTime(value)} of ${formatTime(
        durationsRef.current[activeIdRef.current],
      )}`,
    );
  });

  function audioFor(id: StreamId) {
    return audioRefs.current[id];
  }

  /* Audio engine -------------------------------------------------------- */

  /**
   * Each stream runs through its own GainNode, so crossfades are scheduled on
   * the audio clock: sample-accurate, immune to main-thread throttling, and
   * working on iOS where media.volume is read-only. Created inside a gesture.
   */
  function ensureAudioGraph() {
    const existing = graphRef.current;

    if (existing !== null) {
      if (existing.context.state === "suspended") {
        void existing.context.resume();
      }

      return existing;
    }

    const music = audioFor("music");
    const podcast = audioFor("podcast");
    const Context =
      typeof window === "undefined"
        ? undefined
        : (window.AudioContext ??
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext);

    if (!Context || music === null || podcast === null) {
      return null;
    }

    try {
      const context = new Context();

      function route(media: HTMLAudioElement) {
        const gain = context.createGain();

        context
          .createMediaElementSource(media)
          .connect(gain)
          .connect(context.destination);

        return gain;
      }

      graphRef.current = {
        context,
        gains: { music: route(music), podcast: route(podcast) },
      };
    } catch {
      return null;
    }

    return graphRef.current;
  }

  function setGain(id: StreamId, target: number, durationMs: number) {
    const graph = graphRef.current;

    if (graph === null) {
      const audio = audioFor(id);

      if (audio) {
        audio.volume = target;
      }

      return;
    }

    const param = graph.gains[id].gain;
    const now = graph.context.currentTime;

    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);

    if (durationMs <= 0) {
      param.setValueAtTime(target, now);
      return;
    }

    param.setTargetAtTime(target, now, durationMs / 1000 / 4);
  }

  function cancelPendingPause(id: StreamId) {
    const timer = pauseTimersRef.current[id];

    if (timer !== null) {
      clearTimeout(timer);
      pauseTimersRef.current[id] = null;
    }
  }

  /** Short fade, real pause, and a checkpoint at the last second actually heard. */
  function fadeOutAndPause(id: StreamId) {
    const audio = audioFor(id);

    if (!audio || audio.paused) {
      return;
    }

    const media: HTMLAudioElement = audio;
    const fadeMs = reducedMotion ? 0 : FADE_OUT_MS;
    const lastHeard = media.currentTime + (fadeMs / 1000) * media.playbackRate;

    function pauseQuietly() {
      pauseTimersRef.current[id] = null;
      media.pause();

      if (media.currentTime > lastHeard) {
        media.currentTime = lastHeard;
      }

      setGain(id, 1, 0);

      if (activeIdRef.current !== id) {
        const stoppedAt = media.currentTime;

        setHeldAt(function checkpoint(current) {
          return { ...current, [id]: stoppedAt };
        });
      }
    }

    cancelPendingPause(id);
    setGain(id, 0, fadeMs);

    if (fadeMs > 0) {
      pauseTimersRef.current[id] = setTimeout(pauseQuietly, fadeMs + 30);
    } else {
      pauseQuietly();
    }
  }

  function playWithFadeIn(id: StreamId) {
    const audio = audioFor(id);

    if (!audio) {
      return;
    }

    // Coming back mid-fade-out: keep playing and fade back up.
    cancelPendingPause(id);

    if (audio.paused) {
      setGain(id, reducedMotion ? 1 : 0, 0);
    }

    void audio
      .play()
      .then(function fadeIn() {
        setGain(id, 1, reducedMotion ? 0 : FADE_IN_MS);
      })
      .catch(function handlePlayError() {
        setGain(id, 1, 0);

        if (activeIdRef.current === id) {
          setPlaying(false);
        }
      });
  }

  function showTime(seconds: number, id: StreamId = activeIdRef.current) {
    const duration = durationsRef.current[id];
    const next = clamp(seconds, 0, duration);

    time.set(next);
    progress.set(duration > 0 ? next / duration : 0);
  }

  function glideTo(seconds: number, id: StreamId) {
    const duration = durationsRef.current[id];
    const next = clamp(seconds, 0, duration);
    const ratio = duration > 0 ? next / duration : 0;

    glideRef.current?.stop();
    time.set(next);

    if (reducedMotion) {
      glidingRef.current = false;
      progress.set(ratio);
      return;
    }

    glidingRef.current = true;

    const controls = animate(progress, ratio, MOVE);

    glideRef.current = controls;

    void controls.then(function settleGlide() {
      if (glideRef.current === controls) {
        glidingRef.current = false;
        glideRef.current = null;
      }
    });
  }

  function commitActive(id: StreamId) {
    activeIdRef.current = id;
    lastAriaSecondRef.current = -1;
    setActiveId(id);
  }

  function runStackShuffle() {
    setShuffling(true);
  }

  function moveToFrontLayer(id: StreamId, delayMs: number) {
    if (layerTimerRef.current !== null) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }

    if (delayMs <= 0) {
      setFrontLayer(id);
      return;
    }

    layerTimerRef.current = setTimeout(function swapLayers() {
      layerTimerRef.current = null;
      setFrontLayer(id);
    }, delayMs);
  }

  /** Measure the dock artwork's trip into the hero slot, before state changes. */
  function planFlight(to: StreamId): Flight | null {
    const sheet = sheetRef.current;
    const frame = artFrameRef.current;
    const dockArt = dockArtRef.current;

    if (!sheetOpen || reducedMotion || !sheet || !frame || !dockArt) {
      return null;
    }

    const sheetRect = sheet.getBoundingClientRect();
    const target = frame.getBoundingClientRect();
    const source = dockArt.getBoundingClientRect();

    if (target.width === 0) {
      return null;
    }

    flightKeyRef.current += 1;

    return {
      key: flightKeyRef.current,
      id: to,
      left: target.left - sheetRect.left,
      top: target.top - sheetRect.top,
      size: target.width,
      dx: source.left - target.left,
      dy: source.top - target.top,
      scale: source.width / target.width,
    };
  }

  /* Stream actions ------------------------------------------------------ */

  /** Start a different kind of content. The current stream is held, not lost. */
  function startStream(to: StreamId) {
    const from = activeIdRef.current;
    const incoming = audioFor(to);
    const outgoing = audioFor(from);

    if (to === from || incoming === null || scrubbingRef.current) {
      return;
    }

    ensureAudioGraph();

    const fromTime = outgoing?.currentTime ?? 0;

    setHeldAt(function hold(current) {
      return { ...current, [from]: fromTime };
    });
    setHeld(true);
    commitActive(to);
    moveToFrontLayer(to, 0);
    setPlaying(true);

    fadeOutAndPause(from);

    incoming.currentTime = 0;
    glideTo(0, to);
    playWithFadeIn(to);

    setAnnouncement(
      `Playing ${STREAMS[to].title}. ${STREAMS[from].title} held at ${spokenTime(
        fromTime,
      )}.`,
    );
  }

  function swapStreams() {
    const from = activeIdRef.current;
    const to = otherStream(from);
    const outgoing = audioFor(from);
    const incoming = audioFor(to);

    if (
      !held ||
      outgoing === null ||
      incoming === null ||
      scrubbingRef.current
    ) {
      return;
    }

    ensureAudioGraph();

    const plannedFlight = planFlight(to);
    const fromTime = outgoing.currentTime;
    const finished =
      outgoing.ended || fromTime >= durationsRef.current[from] - 0.25;
    const resumeAt = incoming.currentTime;

    setHeldAt(function hold(current) {
      return { ...current, [from]: fromTime };
    });
    setFlight(plannedFlight);
    runStackShuffle();
    moveToFrontLayer(
      to,
      reducedMotion ? 0 : SHUFFLE_DURATION * SHUFFLE_APEX * 1000,
    );
    commitActive(to);
    setPlaying(true);

    // A finished stream has nothing left to come back to.
    if (finished) {
      setHeld(false);
      outgoing.currentTime = 0;
    }

    fadeOutAndPause(from);
    glideTo(resumeAt, to);
    playWithFadeIn(to);

    setAnnouncement(
      finished
        ? `Playing ${STREAMS[to].title} from ${spokenTime(resumeAt)}.`
        : `Playing ${STREAMS[to].title} from ${spokenTime(resumeAt)}. ${
            STREAMS[from].title
          } held at ${spokenTime(fromTime)}.`,
    );
  }

  /** Every play affordance in the app routes through here. */
  function playContent(id: StreamId) {
    if (id === activeIdRef.current) {
      const audio = audioFor(id);

      if (audio?.paused) {
        void togglePlayback();
      } else {
        setSheetOpen(true);
      }

      return;
    }

    if (held) {
      swapStreams();
      return;
    }

    startStream(id);
  }

  function playItem(item: LibraryItem) {
    setSources(function point(current) {
      return { ...current, [item.stream]: item.id };
    });
    playContent(item.stream);
  }

  function clearHeld() {
    const id = otherStream(activeIdRef.current);
    const audio = audioFor(id);

    if (!held) {
      return;
    }

    cancelPendingPause(id);

    if (audio !== null) {
      audio.pause();
      audio.currentTime = 0;
    }

    setGain(id, 1, 0);
    setHeld(false);
    setHeldAt(function clear(current) {
      return { ...current, [id]: 0 };
    });
    setAnnouncement(`${STREAMS[id].title} cleared.`);
  }

  function resetPrototype() {
    STREAM_IDS.forEach(function resetStream(id) {
      const audio = audioFor(id);

      cancelPendingPause(id);

      if (audio !== null) {
        audio.pause();
        audio.currentTime = 0;
      }

      setGain(id, 1, 0);
    });

    setHeld(false);
    setHeldAt({ music: 0, podcast: 0 });
    setFlight(null);
    setSheetOpen(false);
    setSpeedIndex(0);
    setSleepTimer(false);
    commitActive("music");
    moveToFrontLayer("music", 0);
    setPlaying(false);
    glideTo(0, "music");
    setAnnouncement("Prototype reset.");
  }

  async function togglePlayback() {
    const id = activeIdRef.current;
    const current = audioFor(id);

    if (current === null || audioError) {
      return;
    }

    const audio: HTMLAudioElement = current;

    ensureAudioGraph();
    cancelPendingPause(id);
    setGain(id, 1, 0);

    if (audio.currentTime >= durationsRef.current[id] - 0.1) {
      audio.currentTime = 0;
      showTime(0);
    }

    if (audio.paused) {
      await audio.play().catch(function handlePlayError() {
        setPlaying(false);
      });

      return;
    }

    audio.pause();
  }

  /* Effects ------------------------------------------------------------- */

  useEffect(
    function settleStackShuffle() {
      if (!shuffling) {
        return;
      }

      const timer = setTimeout(
        function done() {
          setShuffling(false);
        },
        SHUFFLE_DURATION * 1000 + 60,
      );

      return function cleanup() {
        clearTimeout(timer);
      };
    },
    [shuffling],
  );

  useEffect(function clearLayerTimer() {
    return function cleanup() {
      if (layerTimerRef.current !== null) {
        clearTimeout(layerTimerRef.current);
      }
    };
  }, []);

  useEffect(function trackInputMode() {
    function handlePointerDown() {
      inputModeRef.current = "pointer";
      setTrackKeyboardFocus(false);
    }

    function handleWindowKeyDown(event: globalThis.KeyboardEvent) {
      if (
        event.key === "Tab" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        inputModeRef.current = "keyboard";
      }
    }

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleWindowKeyDown, true);

    return function cleanup() {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleWindowKeyDown, true);
    };
  }, []);

  useEffect(
    function bindAudio() {
      const cleanups: Array<() => void> = [];
      const pauseTimers = pauseTimersRef.current;
      const graph = graphRef;

      STREAM_IDS.forEach(function bind(id) {
        const current = audioRefs.current[id];

        if (current === null) {
          return;
        }

        const audio: HTMLAudioElement = current;

        function metadata() {
          const duration =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : STREAMS[id].fallbackDuration;

          durationsRef.current[id] = duration;
          setDurations(function update(currentDurations) {
            return { ...currentDurations, [id]: duration };
          });

          if (id === activeIdRef.current && !glidingRef.current) {
            const next = clamp(audio.currentTime, 0, duration);

            time.set(next);
            progress.set(next / duration);
          }
        }

        function handlePlay() {
          if (id === activeIdRef.current) {
            setPlaying(true);
          }
        }

        function handlePause() {
          if (id !== activeIdRef.current) {
            return;
          }

          if (suppressPauseStateRef.current) {
            suppressPauseStateRef.current = false;
            return;
          }

          if (scrubbingRef.current) {
            return;
          }

          setPlaying(false);
        }

        function handleEnded() {
          if (id !== activeIdRef.current) {
            return;
          }

          setPlaying(false);
          time.set(durationsRef.current[id]);
          progress.set(1);
        }

        function handleError() {
          setAudioError(true);

          if (id === activeIdRef.current) {
            setPlaying(false);
          }
        }

        audio.addEventListener("loadedmetadata", metadata);
        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        if (audio.readyState >= 1) {
          metadata();
        }

        cleanups.push(function unbind() {
          audio.removeEventListener("loadedmetadata", metadata);
          audio.removeEventListener("play", handlePlay);
          audio.removeEventListener("pause", handlePause);
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("error", handleError);
        });
      });

      return function cleanup() {
        cleanups.forEach(function run(unbind) {
          unbind();
        });

        STREAM_IDS.forEach(function clearPause(id) {
          const timer = pauseTimers[id];

          if (timer !== null) {
            clearTimeout(timer);
          }
        });

        void graph.current?.context.close().catch(function ignoreClose() {});
        graph.current = null;
      };
    },
    [progress, time],
  );

  useEffect(
    function playbackClock() {
      if (!playing) {
        return;
      }

      let frame = 0;

      function loop() {
        const id = activeIdRef.current;
        const audio = audioRefs.current[id];

        if (audio && !scrubbingRef.current) {
          const duration = durationsRef.current[id];
          const next = clamp(audio.currentTime, 0, duration);

          time.set(next);

          if (!glidingRef.current) {
            progress.set(duration > 0 ? next / duration : 0);
          }
        }

        frame = requestAnimationFrame(loop);
      }

      frame = requestAnimationFrame(loop);

      return function cleanup() {
        cancelAnimationFrame(frame);
      };
    },
    [playing, progress, time],
  );

  useEffect(
    function syncRepeatMode() {
      const audio = audioRefs.current.music;

      if (audio) {
        audio.loop = repeatMode !== "off";
      }
    },
    [repeatMode],
  );

  useEffect(
    function syncSpeed() {
      const audio = audioRefs.current.podcast;

      if (audio) {
        audio.playbackRate = speed;
      }
    },
    [speed],
  );

  // Only the audible stream owns the system media controls.
  useEffect(
    function syncMediaSessionMetadata() {
      if (
        typeof navigator === "undefined" ||
        !("mediaSession" in navigator) ||
        typeof MediaMetadata === "undefined"
      ) {
        return;
      }

      const stream = STREAMS[activeId];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: stream.title,
        artist: stream.creator,
        album: LIBRARY_BY_ID[sources[activeId]].contextName,
        artwork: [
          { src: stream.artwork, sizes: "640x640", type: "image/jpeg" },
        ],
      });
    },
    [activeId, sources],
  );

  useEffect(
    function syncMediaSessionState() {
      if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
        return;
      }

      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    },
    [playing],
  );

  useEffect(function bindMediaSessionActions() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const session = navigator.mediaSession;

    function play() {
      void audioRefs.current[activeIdRef.current]
        ?.play()
        .catch(function noop() {});
    }

    function pause() {
      audioRefs.current[activeIdRef.current]?.pause();
    }

    try {
      session.setActionHandler("play", play);
      session.setActionHandler("pause", pause);
    } catch {}

    return function cleanup() {
      try {
        session.setActionHandler("play", null);
        session.setActionHandler("pause", null);
      } catch {}
    };
  }, []);

  // Space plays/pauses, Escape closes Now Playing: handy when recording.
  const shortcutsRef = useRef({ toggle: togglePlayback, close: () => {} });

  useEffect(function refreshShortcuts() {
    shortcutsRef.current = {
      toggle: togglePlayback,
      close: function close() {
        setSheetOpen(false);
      },
    };
  });

  useEffect(function bindShortcuts() {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const interactive =
        target?.closest("button, [role='slider'], a, input, textarea") !== null;

      if (event.key === "Escape") {
        shortcutsRef.current.close();
        return;
      }

      if (event.key === " " && !interactive && !event.repeat) {
        event.preventDefault();
        void shortcutsRef.current.toggle();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /* Scrubber ------------------------------------------------------------ */

  function seekTo(seconds: number) {
    const audio = audioFor(activeIdRef.current);
    const next = clamp(seconds, 0, durationsRef.current[activeIdRef.current]);

    glideRef.current?.stop();
    glidingRef.current = false;
    showTime(next);

    if (audio !== null) {
      audio.currentTime = next;
    }
  }

  function seekFromPointer(clientX: number) {
    const rect = trackRectRef.current;

    if (!rect) {
      return;
    }

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

    showTime(ratio * durationsRef.current[activeIdRef.current]);
  }

  function handleTrackPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const track = trackRef.current;
    const current = audioFor(activeIdRef.current);

    if (track === null || current === null) {
      return;
    }

    const audio: HTMLAudioElement = current;

    event.stopPropagation();
    inputModeRef.current = "pointer";
    setTrackKeyboardFocus(false);

    glideRef.current?.stop();
    glidingRef.current = false;

    trackRectRef.current = track.getBoundingClientRect();
    wasPlayingRef.current = !audio.paused;
    scrubbingRef.current = true;
    setScrubbing(true);

    if (wasPlayingRef.current) {
      suppressPauseStateRef.current = true;
      audio.pause();
    }

    seekFromPointer(event.clientX);

    try {
      track.setPointerCapture(event.pointerId);
    } catch {}
  }

  function updateHover(clientX: number) {
    const rect =
      trackRectRef.current ?? trackRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    hoverRatio.set(clamp((clientX - rect.left) / rect.width, 0, 1));
  }

  function handleTrackPointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    trackRectRef.current =
      trackRef.current?.getBoundingClientRect() ?? trackRectRef.current;

    updateHover(event.clientX);
    setHovering(true);
  }

  function handleTrackPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") {
      updateHover(event.clientX);
    }

    if (scrubbingRef.current) {
      seekFromPointer(event.clientX);
    }
  }

  function endScrub(event: PointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) {
      return;
    }

    const audio = audioFor(activeIdRef.current);

    scrubbingRef.current = false;
    setScrubbing(false);

    if (audio !== null) {
      audio.currentTime = time.get();

      if (wasPlayingRef.current) {
        void audio.play().catch(function handleResumeError() {
          setPlaying(false);
        });
      }
    }

    try {
      if (trackRef.current?.hasPointerCapture(event.pointerId)) {
        trackRef.current.releasePointerCapture(event.pointerId);
      }
    } catch {}
  }

  function handleTrackKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    inputModeRef.current = "keyboard";
    setTrackKeyboardFocus(true);

    const now = time.get();
    let next: number | null = null;

    if (event.key === "ArrowRight") {
      next = now + (event.shiftKey ? 1 : 5);
    } else if (event.key === "ArrowLeft") {
      next = now - (event.shiftKey ? 1 : 5);
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = durationsRef.current[activeIdRef.current];
    }

    if (next === null) {
      return;
    }

    event.preventDefault();
    seekTo(next);
  }

  function skipToEnd() {
    const audio = audioFor("music");
    const end = durationsRef.current.music;

    if (audio) {
      audio.pause();
      audio.currentTime = end;
    }

    setPlaying(false);
    showTime(end);
  }

  function cycleRepeat() {
    setRepeatMode(function next(current) {
      if (current === "off") {
        return "all";
      }

      if (current === "all") {
        return "one";
      }

      return "off";
    });
  }

  /* Dock + sheet gestures ----------------------------------------------- */

  function handleDockClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (draggedDockRef.current) {
      event.preventDefault();
      draggedDockRef.current = false;
      return;
    }

    swapStreams();
  }

  function handleDockDragEnd(
    _event: globalThis.MouseEvent | TouchEvent | globalThis.PointerEvent,
    info: PanInfo,
  ) {
    if (info.offset.y > 28 || info.velocity.y > 420) {
      clearHeld();
      playButtonRef.current?.focus({ preventScroll: true });
    }

    setTimeout(function releaseDrag() {
      draggedDockRef.current = false;
    }, 0);
  }

  function handleDockKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      clearHeld();
      playButtonRef.current?.focus({ preventScroll: true });
    }
  }

  function startSheetDrag(event: PointerEvent<HTMLElement>) {
    if (
      event.pointerType === "mouse" ||
      (event.target as HTMLElement).closest("button")
    ) {
      return;
    }

    sheetDrag.start(event);
  }

  function handleSheetDragEnd(
    _event: globalThis.MouseEvent | TouchEvent | globalThis.PointerEvent,
    info: PanInfo,
  ) {
    if (info.offset.y > 140 || info.velocity.y > 650) {
      setSheetOpen(false);
    }
  }

  /* Derived view state -------------------------------------------------- */

  const activeDuration = durations[activeId];
  const heldTime = heldAt[heldId];
  const heldRatio = clamp(heldTime / Math.max(durations[heldId], 1), 0, 1);
  const flightActive = flight !== null && flight.id === activeId;

  const textEnter = {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: EASE, delay: 0.14 },
  };
  const textExit = {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1, ease: EASE },
  };

  const podcastExists = exists("podcast");
  const podcastActive = activeId === "podcast";
  const podcastHeld = held && heldId === "podcast";
  const podcastLeft = Math.max(0, durations.podcast - heldAt.podcast);

  const visibleLibrary = LIBRARY.filter(function matchesFilter(item) {
    return filter === "all" || item.filter === filter;
  });
  const activeSource = LIBRARY_BY_ID[sources[activeId]];

  /** Only the place a stream was started from lights up, as in Spotify. */
  function itemState(item: LibraryItem) {
    if (sources[item.stream] !== item.id) {
      return "idle";
    }

    if (item.stream === activeId) {
      return "active";
    }

    return held && item.stream === heldId ? "held" : "idle";
  }

  function itemLabel(item: LibraryItem, state: string) {
    if (state === "held") {
      return `Resume ${item.title} from ${formatTime(heldAt[item.stream])}`;
    }

    if (state === "active" && playing) {
      return `Open Now Playing: ${item.title}`;
    }

    return `Play ${item.title}`;
  }

  function miniTarget(role: "front" | "back") {
    const backY = peekHover ? -PEEK - 6 : -PEEK;

    // Opacity is pinned in every target: Motion returns any value missing
    // from a target to its `initial`, which for these cards is the entry fade.
    if (shuffling) {
      return role === "front"
        ? {
            y: [null, -SHUFFLE_LIFT, 0],
            scale: [null, 1, 1],
            opacity: 1,
          }
        : {
            y: [null, 3, backY],
            scale: [null, 0.97, 0.94],
            opacity: 1,
          };
    }

    return role === "front"
      ? { y: 0, scale: 1, opacity: 1 }
      : { y: backY, scale: 0.94, opacity: 1 };
  }

  const miniTransition: Transition = shuffling ? SHUFFLE_TRANSITION : MOVE;

  const control = held ? `${heldStream.kind} on hold` : `${active.kind} only`;

  return (
    <MotionConfig reducedMotion="user">
      <div data-tsm-stage>
        <div data-tsm-device>
          <div data-tsm-screen>
            <audio
              ref={function bindMusic(element) {
                audioRefs.current.music = element;
              }}
              src={STREAMS.music.src}
              preload="auto"
            />
            <audio
              ref={function bindPodcast(element) {
                audioRefs.current.podcast = element;
              }}
              src={STREAMS.podcast.src}
              preload="auto"
            />

            <p className="sr-only" role="status" aria-live="polite">
              {announcement}
            </p>

            {/* Home ------------------------------------------------------ */}

            <div data-tsm-home inert={sheetOpen}>
              <div data-tsm-home-scroll>
                <div data-tsm-home-top>
                  <span data-tsm-avatar aria-hidden="true">
                    U
                  </span>
                  <div data-tsm-chips role="group" aria-label="Filter Home">
                    {FILTERS.map(function renderChip(option) {
                      return (
                        <button
                          key={option.id}
                          type="button"
                          data-tsm-chip
                          data-tsm-press="soft"
                          aria-pressed={filter === option.id}
                          onClick={function selectFilter() {
                            setFilter(function toggle(current) {
                              return current === option.id &&
                                option.id !== "all"
                                ? "all"
                                : option.id;
                            });
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={filter}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.26, ease: EASE },
                    }}
                    exit={{
                      opacity: 0,
                      transition: { duration: 0.1, ease: EASE },
                    }}
                  >
                    <div data-tsm-recents>
                      {visibleLibrary.map(function renderTile(item) {
                        const state = itemState(item);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-tsm-tile
                            data-tsm-press="soft"
                            data-state={state}
                            aria-label={itemLabel(item, state)}
                            onClick={function handleTile() {
                              playItem(item);
                            }}
                          >
                            <ItemArt item={item} slot="tile" />
                            <span data-tsm-tile-title>{item.title}</span>
                            <span data-tsm-tile-status aria-hidden="true">
                              {state === "active" && playing && (
                                <Equalizer playing />
                              )}
                              {state === "held" && (
                                <span data-tsm-held-mark>
                                  <i />
                                  <i />
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {filter !== "music" && (
                      <section
                        data-tsm-section
                        aria-labelledby="tsm-new-episode"
                      >
                        <h2 id="tsm-new-episode" data-tsm-section-title>
                          New episode
                        </h2>

                        <article data-tsm-episode>
                          <button
                            type="button"
                            data-tsm-episode-open
                            aria-label="Play The unfinished album, Second Listen episode 41"
                            onClick={function openEpisode() {
                              playItem(LIBRARY_BY_ID["second-listen"]);
                            }}
                          >
                            <span data-tsm-episode-head>
                              <img
                                src={STREAMS.podcast.artwork}
                                alt=""
                                draggable={false}
                                data-tsm-episode-art
                              />
                              <span data-tsm-episode-titles>
                                <span data-tsm-episode-title>
                                  The unfinished album
                                </span>
                                <span data-tsm-episode-show>
                                  Second Listen · Ep. 41
                                </span>
                              </span>
                            </span>

                            <span data-tsm-episode-desc>
                              What gets lost when you switch from music to a
                              podcast isn&apos;t the music. It&apos;s the place
                              you were in.
                            </span>
                          </button>

                          <div data-tsm-episode-foot>
                            <span data-tsm-episode-meta>
                              {podcastActive ? (
                                <>
                                  {playing && <Equalizer playing />}
                                  <span data-tsm-episode-live>
                                    {playing ? "Playing" : "Paused"}
                                  </span>
                                </>
                              ) : podcastHeld ? (
                                <>
                                  <span
                                    data-tsm-episode-progress
                                    aria-hidden="true"
                                  >
                                    <i
                                      style={{
                                        width: `${
                                          (heldAt.podcast /
                                            Math.max(durations.podcast, 1)) *
                                          100
                                        }%`,
                                      }}
                                    />
                                  </span>
                                  {podcastLeft >= 60
                                    ? `${Math.ceil(podcastLeft / 60)} min left`
                                    : `${Math.ceil(podcastLeft)} sec left`}
                                </>
                              ) : (
                                "Today · 2 min"
                              )}
                            </span>

                            <button
                              type="button"
                              data-tsm-episode-save
                              data-tsm-press
                              data-tsm-hover="circle"
                              aria-pressed={saved.podcast}
                              aria-label={
                                saved.podcast
                                  ? "Remove from Your Episodes"
                                  : "Save to Your Episodes"
                              }
                              onClick={function toggleEpisodeSaved() {
                                setSaved(function toggle(current) {
                                  return {
                                    ...current,
                                    podcast: !current.podcast,
                                  };
                                });
                              }}
                            >
                              <SavedIcon saved={saved.podcast} />
                            </button>

                            <button
                              type="button"
                              data-tsm-episode-play
                              data-tsm-press
                              aria-label={
                                podcastActive && playing
                                  ? "Pause The unfinished album"
                                  : podcastHeld
                                    ? `Resume The unfinished album from ${formatTime(
                                        heldAt.podcast,
                                      )}`
                                    : "Play The unfinished album"
                              }
                              onClick={function handleEpisodePlay() {
                                if (podcastActive) {
                                  void togglePlayback();
                                } else {
                                  playItem(LIBRARY_BY_ID["second-listen"]);
                                }
                              }}
                            >
                              <PlayPauseIcon
                                playing={podcastActive && playing}
                              />
                            </button>
                          </div>
                        </article>
                      </section>
                    )}

                    <section data-tsm-section aria-labelledby="tsm-jump-back">
                      <h2 id="tsm-jump-back" data-tsm-section-title>
                        Jump back in
                      </h2>

                      <div data-tsm-shelf>
                        {visibleLibrary
                          .filter(function onShelf(item) {
                            return item.id !== "episodes";
                          })
                          .map(function renderShelfCard(item) {
                            const state = itemState(item);
                            const live = state === "active" && playing;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                data-tsm-shelf-card
                                data-tsm-press="soft"
                                data-state={state}
                                aria-label={itemLabel(item, state)}
                                onClick={function handleShelfCard() {
                                  playItem(item);
                                }}
                              >
                                <span data-tsm-shelf-art-wrap>
                                  <ItemArt item={item} slot="shelf" />
                                  <span
                                    data-tsm-shelf-play
                                    data-visible={live ? "true" : "false"}
                                    aria-hidden="true"
                                  >
                                    {live ? <PauseGlyph /> : <PlayGlyph />}
                                  </span>
                                </span>
                                <span data-tsm-shelf-title>{item.title}</span>
                                <span data-tsm-shelf-sub>{item.subtitle}</span>
                              </button>
                            );
                          })}
                      </div>
                    </section>
                  </motion.div>
                </AnimatePresence>
              </div>

              <nav data-tsm-tabbar aria-hidden="true">
                <span data-current="true">
                  <HomeIcon />
                  Home
                </span>
                <span>
                  <SearchIcon />
                  Search
                </span>
                <span>
                  <LibraryIcon />
                  Your Library
                </span>
                <span>
                  <CreateIcon />
                  Create
                </span>
              </nav>

              {/* Mini-player stack. The held stream tucks behind the audible
                  one: the peek says "something's there", and the thumbnail
                  inside the front card is the handle that brings it forward. */}
              <div data-tsm-mini-stack>
                <AnimatePresence initial={false}>
                  {STREAM_IDS.filter(exists).map(function renderMini(id) {
                    const stream = STREAMS[id];
                    const role = id === activeId ? "front" : "back";
                    const other = STREAMS[otherStream(id)];

                    return (
                      <motion.div
                        key={id}
                        data-tsm-mini
                        data-role={role}
                        inert={role === "back"}
                        style={{
                          transformOrigin: "50% 0%",
                          zIndex: id === frontLayer ? 2 : 1,
                        }}
                        initial={{ y: 14, opacity: 0, scale: 0.98 }}
                        animate={miniTarget(role)}
                        exit={{
                          opacity: 0,
                          scale: 0.92,
                          transition: { duration: 0.2, ease: EASE },
                        }}
                        transition={miniTransition}
                      >
                        <motion.span
                          data-tsm-mini-surface
                          aria-hidden="true"
                          initial={false}
                          animate={{ backgroundColor: stream.tint }}
                        />

                        <button
                          type="button"
                          data-tsm-mini-open
                          aria-label={`Open Now Playing: ${stream.title}`}
                          onClick={function openSheet() {
                            setSheetOpen(true);
                          }}
                        >
                          <img
                            src={stream.artwork}
                            alt=""
                            draggable={false}
                            data-tsm-mini-art
                          />
                          <span data-tsm-mini-copy>
                            <span data-tsm-mini-title>{stream.title}</span>
                            <span data-tsm-mini-sub>{stream.creator}</span>
                          </span>
                        </button>

                        {held && role === "front" ? (
                          <button
                            type="button"
                            data-tsm-mini-handle
                            data-tsm-press
                            aria-label={`Switch to ${other.title}, held at ${formatTime(
                              heldTime,
                            )}`}
                            onClick={swapStreams}
                            onPointerEnter={function liftHeld(event) {
                              if (event.pointerType !== "touch") {
                                setPeekHover(true);
                              }
                            }}
                            onPointerLeave={function dropHeld() {
                              setPeekHover(false);
                            }}
                            onFocus={function liftHeld() {
                              setPeekHover(true);
                            }}
                            onBlur={function dropHeld() {
                              setPeekHover(false);
                            }}
                          >
                            <span data-tsm-mini-handle-stack aria-hidden="true">
                              <img
                                src={other.artwork}
                                alt=""
                                draggable={false}
                              />
                            </span>
                          </button>
                        ) : (
                          <span data-tsm-mini-devices aria-hidden="true">
                            <DevicesIcon />
                          </span>
                        )}

                        <button
                          type="button"
                          data-tsm-mini-play
                          data-tsm-press
                          data-tsm-hover="circle"
                          aria-label={playing ? "Pause" : "Play"}
                          onClick={function handleMiniPlay() {
                            void togglePlayback();
                          }}
                        >
                          <PlayPauseIcon
                            playing={role === "front" && playing}
                          />
                        </button>

                        <span data-tsm-mini-line aria-hidden="true">
                          <motion.span
                            data-tsm-mini-line-fill
                            style={{
                              width:
                                role === "front"
                                  ? playedWidth
                                  : `${heldRatio * 100}%`,
                            }}
                          />
                        </span>

                        <motion.span
                          data-tsm-mini-dim
                          aria-hidden="true"
                          initial={false}
                          animate={{ opacity: role === "back" ? 0.22 : 0 }}
                          transition={{ duration: 0.36, ease: EASE }}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Now Playing ----------------------------------------------- */}

            <AnimatePresence>
              {sheetOpen && (
                <motion.section
                  ref={sheetRef}
                  key="sheet"
                  data-tsm-sheet
                  aria-label="Now playing"
                  initial={{ y: "100%" }}
                  animate={{ y: 0, transition: SHEET_OPEN }}
                  exit={{ y: "100%", transition: SHEET_CLOSE }}
                  drag="y"
                  dragControls={sheetDrag}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.9 }}
                  onDragEnd={handleSheetDragEnd}
                >
                  <div data-tsm-np-backdrop aria-hidden="true">
                    {STREAM_IDS.map(function renderStage(id) {
                      return (
                        <motion.span
                          key={id}
                          data-tsm-np-stage
                          initial={false}
                          animate={{ opacity: id === activeId ? 1 : 0 }}
                          transition={{ duration: 0.5, ease: EASE }}
                          style={{ backgroundColor: STREAMS[id].stage }}
                        />
                      );
                    })}
                    <span data-tsm-np-shade />
                  </div>

                  <div data-tsm-np>
                    <header data-tsm-np-header onPointerDown={startSheetDrag}>
                      <button
                        type="button"
                        data-tsm-icon-button
                        data-tsm-press
                        aria-label="Close Now Playing"
                        onClick={function closeSheet() {
                          setSheetOpen(false);
                        }}
                      >
                        <ChevronDownIcon />
                      </button>

                      <div data-tsm-np-context>
                        <AnimatePresence initial={false} mode="popLayout">
                          <motion.div
                            key={activeSource.id}
                            data-tsm-np-context-text
                            initial={{ opacity: 0, y: 6 }}
                            animate={textEnter}
                            exit={textExit}
                          >
                            <span data-tsm-np-context-label>
                              {activeSource.contextLabel}
                            </span>
                            <span data-tsm-np-context-name>
                              {activeSource.contextName}
                            </span>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <span
                        data-tsm-icon-button
                        data-static="true"
                        aria-hidden="true"
                      >
                        <MoreIcon />
                      </span>
                    </header>

                    <div data-tsm-art-slot onPointerDown={startSheetDrag}>
                      <div ref={artFrameRef} data-tsm-art-frame>
                        <AnimatePresence initial={false}>
                          <motion.img
                            key={activeId}
                            src={active.artwork}
                            alt=""
                            draggable={false}
                            data-tsm-art
                            style={{
                              visibility: flightActive ? "hidden" : "visible",
                            }}
                            initial={
                              flightActive ? false : { opacity: 0, scale: 0.96 }
                            }
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{
                              opacity: 0,
                              scale: 0.92,
                              transition: { duration: 0.24, ease: EASE },
                            }}
                            transition={MOVE}
                          />
                        </AnimatePresence>
                      </div>
                    </div>

                    <div data-tsm-np-meta>
                      <div data-tsm-np-copy>
                        <AnimatePresence initial={false} mode="popLayout">
                          <motion.div
                            key={activeId}
                            data-tsm-np-copy-text
                            initial={{ opacity: 0, y: 6 }}
                            animate={textEnter}
                            exit={textExit}
                          >
                            <span data-tsm-np-title>
                              <MarqueeText text={active.title} />
                            </span>
                            <span data-tsm-np-creator>{active.creator}</span>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <button
                        type="button"
                        data-tsm-np-save
                        data-tsm-press
                        data-tsm-hover="circle"
                        aria-pressed={saved[activeId]}
                        aria-label={
                          saved[activeId]
                            ? isMusic
                              ? "Remove from Liked Songs"
                              : "Remove from Your Episodes"
                            : isMusic
                              ? "Add to Liked Songs"
                              : "Save to Your Episodes"
                        }
                        onClick={function toggleSaved() {
                          setSaved(function toggle(current) {
                            return {
                              ...current,
                              [activeId]: !current[activeId],
                            };
                          });
                        }}
                      >
                        <SavedIcon saved={saved[activeId]} />
                      </button>
                    </div>

                    <div data-tsm-scrub>
                      <div
                        ref={trackRef}
                        data-tsm-track
                        data-keyboard-focus={
                          trackKeyboardFocus ? "true" : "false"
                        }
                        data-scrubbing={scrubbing ? "true" : "false"}
                        role="slider"
                        tabIndex={0}
                        aria-label={`Playback position, ${active.title}`}
                        aria-valuemin={0}
                        aria-valuemax={Math.round(activeDuration)}
                        aria-valuenow={0}
                        onPointerDown={handleTrackPointerDown}
                        onPointerMove={handleTrackPointerMove}
                        onPointerUp={endScrub}
                        onPointerCancel={endScrub}
                        onPointerEnter={handleTrackPointerEnter}
                        onPointerLeave={function handleTrackPointerLeave() {
                          setHovering(false);
                        }}
                        onFocus={function handleTrackFocus() {
                          setTrackKeyboardFocus(
                            inputModeRef.current === "keyboard",
                          );
                        }}
                        onBlur={function handleTrackBlur() {
                          setTrackKeyboardFocus(false);
                        }}
                        onKeyDown={handleTrackKeyDown}
                      >
                        <AnimatePresence>
                          {hovering && !scrubbing && (
                            <motion.span
                              data-tsm-hover-time
                              style={{ left: hoverLeft, x: "-50%" }}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 2 }}
                              transition={{ duration: 0.12, ease: EASE }}
                              aria-hidden="true"
                            >
                              {hoverText}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        <span data-tsm-track-base aria-hidden="true" />
                        <motion.span
                          data-tsm-track-played
                          style={{ width: playedWidth }}
                          aria-hidden="true"
                        />
                        <motion.span
                          data-tsm-knob
                          style={{ left: playedWidth }}
                          aria-hidden="true"
                        />
                      </div>

                      <div data-tsm-times aria-hidden="true">
                        <motion.span>{currentText}</motion.span>
                        <motion.span>{remainingText}</motion.span>
                      </div>
                    </div>

                    <div data-tsm-transport>
                      <button
                        type="button"
                        data-tsm-tp
                        data-tsm-press
                        data-tsm-hover="circle"
                        data-active={
                          (isMusic ? shuffle : speed !== 1) ? "true" : "false"
                        }
                        aria-label={
                          isMusic ? "Shuffle" : `Playback speed ${speed}×`
                        }
                        aria-pressed={isMusic ? shuffle : undefined}
                        onClick={function handleFirstSlot() {
                          if (isMusic) {
                            setShuffle(function flip(current) {
                              return !current;
                            });
                            return;
                          }

                          setSpeedIndex(function next(current) {
                            return (current + 1) % PODCAST_SPEEDS.length;
                          });
                        }}
                      >
                        <GlyphSwap
                          showFirst={isMusic}
                          first={<ShuffleIcon />}
                          second={<span data-tsm-speed>{speed}×</span>}
                        />
                        <span
                          data-tsm-tp-dot
                          data-visible={isMusic && shuffle ? "true" : "false"}
                          aria-hidden="true"
                        />
                      </button>

                      <button
                        type="button"
                        data-tsm-tp
                        data-tsm-press
                        data-tsm-hover="circle"
                        data-strong="true"
                        aria-label={isMusic ? "Previous" : "Back 15 seconds"}
                        onClick={function handlePrevious() {
                          seekTo(isMusic ? 0 : time.get() - 15);
                        }}
                      >
                        <GlyphSwap
                          showFirst={isMusic}
                          first={<PrevIcon />}
                          second={<SkipIcon direction="back" />}
                        />
                      </button>

                      <button
                        ref={playButtonRef}
                        type="button"
                        data-tsm-play
                        aria-label={playing ? "Pause" : "Play"}
                        onClick={function handlePlay() {
                          void togglePlayback();
                        }}
                      >
                        <span data-tsm-play-disc>
                          <PlayPauseIcon playing={playing} />
                        </span>
                      </button>

                      <button
                        type="button"
                        data-tsm-tp
                        data-tsm-press
                        data-tsm-hover="circle"
                        data-strong="true"
                        aria-label={isMusic ? "Next" : "Forward 15 seconds"}
                        onClick={function handleNext() {
                          if (isMusic) {
                            skipToEnd();
                          } else {
                            seekTo(time.get() + 15);
                          }
                        }}
                      >
                        <GlyphSwap
                          showFirst={isMusic}
                          first={<NextIcon />}
                          second={<SkipIcon direction="forward" />}
                        />
                      </button>

                      <button
                        type="button"
                        data-tsm-tp
                        data-tsm-press
                        data-tsm-hover="circle"
                        data-active={
                          (isMusic ? repeatMode !== "off" : sleepTimer)
                            ? "true"
                            : "false"
                        }
                        aria-label={
                          isMusic
                            ? repeatMode === "one"
                              ? "Repeat one"
                              : repeatMode === "all"
                                ? "Repeat"
                                : "Enable repeat"
                            : "Sleep timer"
                        }
                        aria-pressed={
                          isMusic ? repeatMode !== "off" : sleepTimer
                        }
                        onClick={function handleLastSlot() {
                          if (isMusic) {
                            cycleRepeat();
                          } else {
                            setSleepTimer(function flip(current) {
                              return !current;
                            });
                          }
                        }}
                      >
                        <GlyphSwap
                          showFirst={isMusic}
                          first={
                            <span data-tsm-repeat>
                              <RepeatIcon />
                              <span
                                data-tsm-repeat-one
                                data-visible={
                                  repeatMode === "one" ? "true" : "false"
                                }
                              >
                                1
                              </span>
                            </span>
                          }
                          second={<MoonIcon />}
                        />
                        <span
                          data-tsm-tp-dot
                          data-visible={
                            (isMusic ? repeatMode !== "off" : sleepTimer)
                              ? "true"
                              : "false"
                          }
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    <div data-tsm-np-utility aria-hidden="true">
                      <span>
                        <DevicesIcon />
                      </span>
                      <span data-tsm-np-utility-end>
                        <ShareIcon />
                        <QueueIcon />
                      </span>
                    </div>

                    {/* The held stream, docked where the mini-player lives
                        everywhere else in the app. */}
                    <div data-tsm-dock-slot>
                      <AnimatePresence initial={false}>
                        {held && (
                          <motion.div
                            key="dock"
                            data-tsm-dock-wrap
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 14 }}
                            transition={MOVE}
                          >
                            <motion.button
                              type="button"
                              data-tsm-dock
                              data-tsm-press="soft"
                              aria-label={`Resume ${heldStream.title} from ${formatTime(
                                heldTime,
                              )}. ${active.title} will be held.`}
                              aria-describedby="tsm-dock-hint"
                              aria-keyshortcuts="Delete"
                              onClick={handleDockClick}
                              onKeyDown={handleDockKeyDown}
                              onPointerDown={function startDockDrag(event) {
                                if (event.pointerType !== "mouse") {
                                  dockDrag.start(event);
                                }
                              }}
                              drag="y"
                              dragControls={dockDrag}
                              dragListener={false}
                              dragConstraints={{ top: 0, bottom: 0 }}
                              dragElastic={{ top: 0.04, bottom: 0.5 }}
                              dragSnapToOrigin
                              onDragStart={function markDragged() {
                                draggedDockRef.current = true;
                              }}
                              onDragEnd={handleDockDragEnd}
                            >
                              <motion.span
                                data-tsm-dock-surface
                                aria-hidden="true"
                                initial={false}
                                animate={{ backgroundColor: heldStream.tint }}
                                transition={{ duration: 0.45, ease: EASE }}
                              />

                              <span data-tsm-dock-art-slot>
                                <AnimatePresence initial={false}>
                                  <motion.img
                                    ref={dockArtRef}
                                    key={heldId}
                                    src={heldStream.artwork}
                                    alt=""
                                    draggable={false}
                                    data-tsm-dock-art
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{
                                      opacity: 1,
                                      scale: 1,
                                      transition: {
                                        duration: 0.3,
                                        ease: EASE,
                                        delay: 0.18,
                                      },
                                    }}
                                    exit={{
                                      opacity: 0,
                                      transition: { duration: 0 },
                                    }}
                                  />
                                </AnimatePresence>
                              </span>

                              <span data-tsm-dock-copy>
                                <AnimatePresence
                                  initial={false}
                                  mode="popLayout"
                                >
                                  <motion.span
                                    key={heldId}
                                    data-tsm-dock-text
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                      transition: {
                                        duration: 0.26,
                                        ease: EASE,
                                        delay: 0.2,
                                      },
                                    }}
                                    exit={textExit}
                                  >
                                    <span data-tsm-dock-title>
                                      {heldStream.title}
                                    </span>
                                    <span data-tsm-dock-sub>
                                      <span
                                        data-tsm-held-mark
                                        aria-hidden="true"
                                      >
                                        <i />
                                        <i />
                                      </span>
                                      {formatTime(heldTime)}
                                      <span data-tsm-dot aria-hidden="true">
                                        ·
                                      </span>
                                      {heldStream.creator}
                                    </span>
                                  </motion.span>
                                </AnimatePresence>
                              </span>

                              <span data-tsm-dock-resume aria-hidden="true">
                                <PlayGlyph />
                              </span>

                              <span data-tsm-dock-line aria-hidden="true">
                                <motion.span
                                  data-tsm-dock-line-fill
                                  initial={false}
                                  animate={{ width: `${heldRatio * 100}%` }}
                                  transition={MOVE}
                                />
                              </span>
                            </motion.button>

                            <span id="tsm-dock-hint" className="sr-only">
                              Swipe down or press Delete to clear.
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {flight !== null && (
                    <motion.img
                      key={flight.key}
                      src={STREAMS[flight.id].artwork}
                      alt=""
                      draggable={false}
                      aria-hidden="true"
                      data-tsm-ghost
                      style={{
                        left: flight.left,
                        top: flight.top,
                        width: flight.size,
                        height: flight.size,
                        transformOrigin: "0 0",
                      }}
                      initial={{
                        x: flight.dx,
                        y: flight.dy,
                        scale: flight.scale,
                        borderRadius: 4 / flight.scale,
                      }}
                      animate={{ x: 0, y: 0, scale: 1, borderRadius: 8 }}
                      transition={FLIGHT}
                      onAnimationComplete={function land() {
                        setFlight(function clearFlight(current) {
                          return current?.key === flight.key ? null : current;
                        });
                      }}
                    />
                  )}

                  {audioError && (
                    <p data-tsm-error role="status">
                      Audio could not load. Check /public/spotify/.
                    </p>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div data-tsm-proto aria-label="Prototype controls" role="group">
          <span data-tsm-proto-state>
            {podcastExists || held
              ? control
              : "Tap the new episode to start a podcast"}
          </span>
          <button
            type="button"
            data-tsm-proto-reset
            data-tsm-press
            onClick={resetPrototype}
          >
            Reset
          </button>
        </div>
      </div>

      <style>{STYLES}</style>
    </MotionConfig>
  );
}

const STYLES = `
  [data-tsm-stage] {
    --tsm-top: 14px;
    --tsm-bottom: 22px;
    --tsm-text: #fff;
    --tsm-subdued: #b3b3b3;
    --tsm-ease: cubic-bezier(0.32, 0.72, 0, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }

  [data-tsm-device] {
    position: relative;
    width: 390px;
    height: clamp(640px, calc(100svh - 112px), 800px);
    border-radius: 16px;
    background: #121212;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.55),
      0 0 0 1px rgba(255, 255, 255, 0.06) inset,
      0 40px 80px -32px rgba(0, 0, 0, 0.55),
      0 16px 32px -20px rgba(0, 0, 0, 0.38);
  }

  [data-tsm-screen] {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    color: var(--tsm-text);
    background: #121212;
    isolation: isolate;
    user-select: none;
    -webkit-user-select: none;
  }

  :where([data-tsm-screen]) button {
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

  [data-tsm-screen] button:focus-visible,
  [data-tsm-track][data-keyboard-focus="true"] {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  [data-tsm-screen] img {
    display: block;
    object-fit: cover;
  }

  /* Home ------------------------------------------------------------------- */

  [data-tsm-home] {
    position: absolute;
    inset: 0;
  }

  [data-tsm-home-scroll] {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: calc(var(--tsm-top) + 8px) 16px calc(var(--tsm-bottom) + 160px);
    scrollbar-width: none;
    background: linear-gradient(180deg, #1d2a33 0%, #121212 240px);
  }

  [data-tsm-home-scroll]::-webkit-scrollbar {
    display: none;
  }

  [data-tsm-home-top] {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
  }

  [data-tsm-avatar] {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 50%;
    color: #000;
    background: #f59ab9;
    font-size: 14px;
    font-weight: 700;
  }

  [data-tsm-chips] {
    display: flex;
    gap: 8px;
  }

  [data-tsm-chip] {
    height: 32px;
    display: inline-flex;
    align-items: center;
    padding: 0 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    font-size: 13px;
    font-weight: 500;
  }

  [data-tsm-chip][aria-pressed="true"] {
    color: #000;
    background: ${GREEN};
    font-weight: 600;
  }

  [data-tsm-recents] {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 14px;
  }

  [data-tsm-tile] {
    position: relative;
    height: 56px;
    min-width: 0;
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 10px;
    padding-right: 10px;
    overflow: hidden;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.09);
    text-align: left;
  }

  [data-tsm-tile-art] {
    width: 56px;
    height: 56px;
  }

  span[data-tsm-tile-art],
  [data-tsm-shelf-art] {
    display: grid;
    place-items: center;
  }

  [data-tsm-tile-art] svg {
    width: 22px;
    height: 22px;
  }

  [data-kind="liked"] {
    color: #fff;
    background: linear-gradient(135deg, #450af5 0%, #8e8ee5 62%, #c4efd9 100%);
  }

  [data-kind="episodes"] {
    color: ${GREEN};
    background: #056952;
  }

  [data-tsm-tile-title] {
    display: -webkit-box;
    overflow: hidden;
    font-size: 12.5px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.005em;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    transition: color 200ms var(--tsm-ease);
  }

  [data-tsm-tile][data-state="active"] [data-tsm-tile-title] {
    color: ${GREEN};
  }

  [data-tsm-tile-status] {
    display: grid;
    place-items: center;
    min-width: 12px;
  }

  [data-tsm-eq] {
    width: 12px;
    height: 12px;
    display: inline-flex;
    align-items: flex-end;
    justify-content: space-between;
    flex: 0 0 auto;
  }

  [data-tsm-eq] i {
    width: 2.5px;
    height: 100%;
    border-radius: 1px;
    background: ${GREEN};
    transform-origin: bottom;
    transform: scaleY(0.4);
    animation: tsm-eq 900ms ease-in-out infinite;
    animation-play-state: paused;
  }

  [data-tsm-eq] i:nth-child(2) { animation-delay: -300ms; }
  [data-tsm-eq] i:nth-child(3) { animation-delay: -600ms; }

  [data-tsm-eq][data-playing="true"] i {
    animation-play-state: running;
  }

  @keyframes tsm-eq {
    0%, 100% { transform: scaleY(0.35); }
    50% { transform: scaleY(1); }
  }

  [data-tsm-held-mark] {
    width: 7px;
    height: 8px;
    flex: 0 0 auto;
    display: inline-flex;
    justify-content: space-between;
  }

  [data-tsm-held-mark] i {
    width: 2.25px;
    height: 100%;
    border-radius: 0.6px;
    background: currentColor;
  }

  [data-tsm-tile-status] [data-tsm-held-mark] {
    color: var(--tsm-subdued);
  }

  [data-tsm-section] {
    margin-top: 26px;
  }

  [data-tsm-section-title] {
    margin: 0 0 12px;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: -0.022em;
  }

  [data-tsm-episode] {
    position: relative;
    padding: 0 12px 10px;
    border-radius: 8px;
    background: #1f1f1f;
    transition: background-color 180ms ease;
  }

  [data-tsm-episode-open] {
    display: block;
    width: calc(100% + 24px);
    margin: 0 -12px !important;
    padding: 12px 12px 0 !important;
    border-radius: 8px 8px 0 0;
    text-align: left;
  }

  [data-tsm-episode-head] {
    display: grid;
    grid-template-columns: 60px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
  }

  [data-tsm-episode-art] {
    width: 60px;
    height: 60px;
    border-radius: 6px;
  }

  [data-tsm-episode-titles] {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  [data-tsm-episode-title] {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  [data-tsm-episode-show] {
    color: var(--tsm-subdued);
    font-size: 13px;
  }

  [data-tsm-episode-desc] {
    display: -webkit-box;
    margin: 10px 0 0;
    overflow: hidden;
    color: var(--tsm-subdued);
    font-size: 13px;
    line-height: 1.4;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  [data-tsm-episode-foot] {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
  }

  [data-tsm-episode-meta] {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--tsm-subdued);
    font-size: 12px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  [data-tsm-episode-live] {
    color: ${GREEN};
    font-weight: 600;
  }

  [data-tsm-episode-progress] {
    position: relative;
    width: 36px;
    height: 3px;
    overflow: hidden;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.24);
  }

  [data-tsm-episode-progress] i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: #fff;
    transition: width 420ms var(--tsm-ease);
  }

  [data-tsm-episode-save] {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  [data-tsm-episode-save] [data-tsm-save-icon] {
    width: 24px;
    height: 24px;
  }

  [data-tsm-episode-play] {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #000;
    background: #fff;
  }

  [data-tsm-episode-play] [data-tsm-pp] {
    width: 22px;
    height: 22px;
  }

  [data-tsm-shelf] {
    display: flex;
    gap: 14px;
    margin-right: -16px;
    padding-right: 16px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  [data-tsm-shelf-card] {
    width: 142px;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
  }

  [data-tsm-shelf-art-wrap] {
    position: relative;
    width: 142px;
    height: 142px;
    margin-bottom: 6px;
  }

  [data-tsm-shelf-art] {
    width: 142px;
    height: 142px;
    border-radius: 4px;
    box-shadow: 0 8px 22px -12px rgba(0, 0, 0, 0.6);
  }

  [data-tsm-shelf-art] svg {
    width: 52px;
    height: 52px;
  }

  /* Spotify's own affordance: a green play button rises in on hover, and
     stays visible on whatever is currently playing. */
  [data-tsm-shelf-play] {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #000;
    background: ${GREEN};
    box-shadow: 0 8px 16px -6px rgba(0, 0, 0, 0.5);
    opacity: 0;
    transform: translateY(6px);
    transition:
      opacity 200ms var(--tsm-ease),
      transform 260ms var(--tsm-ease);
  }

  [data-tsm-shelf-play][data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
  }

  [data-tsm-shelf-play] svg {
    width: 20px;
    height: 20px;
  }

  [data-tsm-shelf-title] {
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 200ms var(--tsm-ease);
  }

  [data-tsm-shelf-card][data-state="active"] [data-tsm-shelf-title] {
    color: ${GREEN};
  }

  [data-tsm-shelf-sub] {
    overflow: hidden;
    color: var(--tsm-subdued);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  [data-tsm-tabbar] {
    position: absolute;
    z-index: 4;
    left: 0;
    right: 0;
    bottom: 0;
    height: calc(var(--tsm-bottom) + 54px);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 22px 12px var(--tsm-bottom);
    background: linear-gradient(
      to bottom,
      rgba(18, 18, 18, 0) 0%,
      rgba(18, 18, 18, 0.88) 34%,
      #121212 62%
    );
    pointer-events: none;
  }

  [data-tsm-tabbar] span {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    color: var(--tsm-subdued);
    font-size: 10px;
    font-weight: 500;
  }

  [data-tsm-tabbar] span[data-current="true"] {
    color: #fff;
  }

  [data-tsm-tabbar] svg {
    width: 24px;
    height: 24px;
  }

  /* Mini-player stack ------------------------------------------------------ */

  [data-tsm-mini-stack] {
    position: absolute;
    z-index: 5;
    left: 8px;
    right: 8px;
    bottom: calc(var(--tsm-bottom) + 50px);
    height: 56px;
  }

  [data-tsm-mini] {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 44px 48px;
    align-items: center;
    border-radius: 8px;
  }

  [data-tsm-mini][data-role="back"] {
    pointer-events: none;
  }

  [data-tsm-mini-surface],
  [data-tsm-mini-dim] {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
  }

  [data-tsm-mini-surface] {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      0 6px 18px -8px rgba(0, 0, 0, 0.6);
  }

  [data-tsm-mini-surface]::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(255, 255, 255, 0);
    transition: background-color 160ms var(--tsm-ease);
  }

  [data-tsm-mini-dim] {
    z-index: 3;
    background: #000;
  }

  [data-tsm-mini-open] {
    position: relative;
    z-index: 1;
    height: 56px;
    min-width: 0;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr);
    align-items: center;
    column-gap: 10px;
    padding-left: 8px;
    border-radius: 8px 0 0 8px;
    text-align: left;
  }

  [data-tsm-mini-art] {
    width: 40px;
    height: 40px;
    border-radius: 4px;
  }

  [data-tsm-mini-copy],
  [data-tsm-dock-text] {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  [data-tsm-mini-title],
  [data-tsm-dock-title] {
    overflow: hidden;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.2;
    letter-spacing: -0.005em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  [data-tsm-mini-sub],
  [data-tsm-dock-sub] {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.72);
    font-size: 12px;
    font-weight: 450;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  [data-tsm-mini-devices] {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, 0.82);
  }

  /* The handle: the held stream's artwork, sitting where Connect usually
     is. A 44px target, where the 10px peek behind could never be. */
  [data-tsm-mini-handle] {
    position: relative;
    z-index: 2;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 8px;
  }

  [data-tsm-mini-handle-stack] {
    position: relative;
    width: 26px;
    height: 26px;
  }

  [data-tsm-mini-handle-stack]::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.28);
    transform: translate(3px, -3px) scale(0.92);
    transition: transform 260ms var(--tsm-ease), background-color 200ms ease;
  }

  [data-tsm-mini-handle-stack] img {
    position: relative;
    width: 26px;
    height: 26px;
    border-radius: 4px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.22),
      0 2px 6px rgba(0, 0, 0, 0.35);
    transition: box-shadow 200ms ease;
  }

  [data-tsm-mini-devices] svg {
    width: 18px;
    height: 18px;
  }

  [data-tsm-mini-play] {
    position: relative;
    z-index: 2;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  [data-tsm-mini-play] [data-tsm-pp] {
    width: 26px;
    height: 26px;
  }

  [data-tsm-mini-line],
  [data-tsm-dock-line] {
    position: absolute;
    z-index: 2;
    left: 8px;
    right: 8px;
    bottom: 0;
    height: 2px;
    overflow: hidden;
    border-radius: 1px;
    background: rgba(255, 255, 255, 0.22);
    pointer-events: none;
  }

  [data-tsm-mini-line-fill],
  [data-tsm-dock-line-fill] {
    position: absolute;
    inset: 0 auto 0 0;
    display: block;
    background: #fff;
  }

  /* Now Playing ------------------------------------------------------------ */

  [data-tsm-sheet] {
    position: absolute;
    z-index: 20;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    background: #121212;
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.4);
  }

  [data-tsm-np-backdrop],
  [data-tsm-np-stage],
  [data-tsm-np-shade] {
    position: absolute;
    inset: 0;
  }

  [data-tsm-np-shade] {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.04) 0%,
      rgba(0, 0, 0, 0.24) 46%,
      rgba(0, 0, 0, 0.62) 100%
    );
  }

  [data-tsm-np] {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: var(--tsm-top) 24px var(--tsm-bottom);
  }

  [data-tsm-np-header] {
    height: 48px;
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) 40px;
    align-items: center;
    gap: 8px;
    margin: 4px -8px 0;
    touch-action: none;
  }

  [data-tsm-icon-button] {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    transition: background-color 160ms var(--tsm-ease);
  }

  [data-tsm-icon-button] svg {
    width: 24px;
    height: 24px;
  }

  [data-tsm-np-context] {
    position: relative;
    min-width: 0;
    text-align: center;
  }

  [data-tsm-np-context-text] {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  [data-tsm-np-context-label] {
    color: rgba(255, 255, 255, 0.72);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  [data-tsm-np-context-name] {
    overflow: hidden;
    font-size: 13px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  [data-tsm-art-slot] {
    flex: 1 1 0;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 22px 0 26px;
    container-type: size;
    touch-action: none;
  }

  [data-tsm-art-frame] {
    position: relative;
    width: min(100cqw, 100cqh);
    aspect-ratio: 1;
  }

  [data-tsm-art],
  [data-tsm-ghost] {
    border-radius: 8px;
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.18),
      0 22px 50px -18px rgba(0, 0, 0, 0.62);
  }

  [data-tsm-art] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  [data-tsm-ghost] {
    position: absolute;
    z-index: 30;
    pointer-events: none;
    will-change: transform;
  }

  [data-tsm-np-meta] {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 40px;
    align-items: center;
    gap: 12px;
  }

  [data-tsm-np-copy] {
    position: relative;
    min-width: 0;
    min-height: 50px;
    display: flex;
    align-items: center;
  }

  [data-tsm-np-copy-text] {
    min-width: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  [data-tsm-np-title] {
    display: block;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.024em;
    white-space: nowrap;
  }

  [data-tsm-np-creator] {
    overflow: hidden;
    color: rgba(255, 255, 255, 0.72);
    font-size: 15.5px;
    font-weight: 450;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  [data-tsm-marquee] {
    position: relative;
    display: block;
    overflow: hidden;
    white-space: nowrap;
  }

  [data-tsm-marquee][data-overflowing="true"] {
    margin-left: -10px;
    padding-left: 10px;
    -webkit-mask-image: linear-gradient(to right, transparent 0, #000 10px, #000 calc(100% - 18px), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, #000 10px, #000 calc(100% - 18px), transparent 100%);
  }

  [data-tsm-marquee-track] {
    display: inline-flex;
    gap: ${MARQUEE_GAP}px;
    will-change: transform;
  }

  [data-tsm-np-save] {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  [data-tsm-save-icon] {
    width: 28px;
    height: 28px;
    overflow: visible;
  }

  [data-tsm-scrub] {
    flex: 0 0 auto;
    margin-top: 14px;
  }

  [data-tsm-track] {
    position: relative;
    height: 24px;
    display: flex;
    align-items: center;
    cursor: pointer;
    touch-action: none;
    outline: none;
    border-radius: 4px;
  }

  [data-tsm-track-base],
  [data-tsm-track-played] {
    position: absolute;
    left: 0;
    top: 50%;
    height: 4px;
    border-radius: 999px;
    pointer-events: none;
    transform: translateY(-50%);
  }

  [data-tsm-track-base] {
    right: 0;
    background: rgba(255, 255, 255, 0.3);
  }

  [data-tsm-track-played] {
    background: #fff;
    transition: background-color 160ms var(--tsm-ease);
  }

  [data-tsm-knob] {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.36);
    pointer-events: none;
  }

  [data-tsm-track][data-scrubbing="true"] [data-tsm-knob] {
    scale: 1.25;
  }

  [data-tsm-hover-time] {
    position: absolute;
    z-index: 4;
    bottom: calc(50% + 12px);
    padding: 4px 7px;
    border-radius: 6px;
    color: #fff;
    background: rgba(0, 0, 0, 0.88);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
  }

  [data-tsm-times] {
    display: flex;
    justify-content: space-between;
    margin-top: 2px;
    color: rgba(255, 255, 255, 0.66);
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  [data-tsm-transport] {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 44px 48px 72px 48px 44px;
    align-items: center;
    justify-content: space-between;
    margin-top: 6px;
  }

  [data-tsm-tp] {
    position: relative;
    width: 100%;
    height: 48px;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, 0.78);
  }

  [data-tsm-tp][data-strong="true"] {
    color: #fff;
  }

  [data-tsm-tp][data-active="true"] {
    color: ${GREEN};
  }

  [data-tsm-glyph-swap] {
    position: relative;
    width: 32px;
    height: 32px;
    display: block;
  }

  [data-tsm-glyph] {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }

  [data-tsm-glyph] svg {
    width: 22px;
    height: 22px;
    overflow: visible;
  }

  [data-tsm-tp][data-strong="true"] [data-tsm-glyph] svg {
    width: 30px;
    height: 30px;
  }

  [data-tsm-speed] {
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  [data-tsm-tp-dot] {
    position: absolute;
    bottom: 3px;
    left: 50%;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${GREEN};
    opacity: 0;
    transform: translateX(-50%) scale(0.6);
    transition: opacity 140ms ease, transform 180ms var(--tsm-ease);
  }

  [data-tsm-tp-dot][data-visible="true"] {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }

  [data-tsm-repeat] {
    position: relative;
    display: grid;
    place-items: center;
  }

  [data-tsm-repeat-one] {
    position: absolute;
    font-size: 7px;
    font-weight: 800;
    opacity: 0;
    transition: opacity 140ms ease;
  }

  [data-tsm-repeat-one][data-visible="true"] {
    opacity: 1;
  }

  [data-tsm-play] {
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  [data-tsm-play-disc] {
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #000;
    background: #fff;
  }

  [data-tsm-play-disc] [data-tsm-pp] {
    width: 30px;
    height: 30px;
  }

  [data-tsm-np-utility] {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    margin-top: 8px;
    color: rgba(255, 255, 255, 0.78);
  }

  [data-tsm-np-utility] svg {
    width: 18px;
    height: 18px;
  }

  [data-tsm-np-utility-end] {
    display: flex;
    gap: 24px;
  }

  [data-tsm-dock-slot] {
    position: relative;
    flex: 0 0 auto;
    height: 56px;
    margin: 14px -12px 6px;
  }

  [data-tsm-dock-wrap] {
    position: absolute;
    inset: 0;
  }

  [data-tsm-dock] {
    position: relative;
    width: 100%;
    height: 56px;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) 40px;
    align-items: center;
    column-gap: 10px;
    padding: 0 6px 0 8px;
    border-radius: 8px;
    text-align: left;
    touch-action: none;
  }

  [data-tsm-dock-surface] {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 8px 22px -12px rgba(0, 0, 0, 0.65);
    pointer-events: none;
  }

  [data-tsm-dock-surface]::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(255, 255, 255, 0);
    transition: background-color 160ms var(--tsm-ease);
  }

  [data-tsm-dock-art-slot] {
    position: relative;
    width: 40px;
    height: 40px;
  }

  [data-tsm-dock-art] {
    position: absolute;
    inset: 0;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  [data-tsm-dock-copy] {
    position: relative;
    min-width: 0;
    height: 34px;
  }

  [data-tsm-dock-text] {
    position: absolute;
    inset: 0;
    justify-content: center;
  }

  [data-tsm-dot] {
    opacity: 0.7;
  }

  [data-tsm-dock-resume] {
    position: relative;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
  }

  [data-tsm-dock-resume] svg {
    width: 22px;
    height: 22px;
  }

  [data-tsm-error] {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 60px;
    margin: 0;
    color: #bbb;
    font-size: 11px;
    text-align: center;
  }

  /* Prototype affordance, outside the device ------------------------------- */

  [data-tsm-proto] {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 36px;
    padding: 4px 4px 4px 14px;
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.42);
    box-shadow: 0 1px 1px rgba(255, 255, 255, 0.5) inset;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  [data-tsm-proto-state] {
    color: #6f6f6a;
    font-size: 12px;
    font-weight: 520;
  }

  [data-tsm-proto-reset] {
    height: 28px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    color: #242424;
    background: rgba(0, 0, 0, 0.065);
    font: inherit;
    font-size: 12px;
    font-weight: 620;
    cursor: pointer;
  }

  [data-tsm-proto-reset]:focus-visible {
    outline: 2px solid #191919;
    outline-offset: 2px;
  }

  /* Press + hover ----------------------------------------------------------
     One system for every control. Press is a small, quick settle (fast in,
     softer out). Hover never scales: it changes colour or reveals a quiet
     surface, so nothing grows under the cursor and then lurches on click. */

  [data-tsm-press] {
    scale: 1;
    transition:
      scale 240ms var(--tsm-ease),
      background-color 160ms ease,
      color 160ms ease,
      box-shadow 200ms ease;
    will-change: scale;
    backface-visibility: hidden;
  }

  [data-tsm-press]:active {
    scale: 0.94;
    transition-duration: 90ms;
  }

  [data-tsm-press="soft"]:active {
    scale: 0.98;
  }

  [data-tsm-hover="circle"] {
    position: relative;
    isolation: isolate;
  }

  [data-tsm-hover="circle"]::before {
    content: "";
    position: absolute;
    z-index: -1;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0);
    transform: translate(-50%, -50%);
    transition: background-color 160ms ease;
  }

  [data-tsm-play-disc] {
    transition: scale 240ms var(--tsm-ease);
    will-change: scale;
    backface-visibility: hidden;
  }

  [data-tsm-play]:active [data-tsm-play-disc] {
    scale: 0.95;
    transition-duration: 90ms;
  }

  [data-tsm-mini-open]::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(0, 0, 0, 0);
    transition: background-color 120ms ease;
  }

  [data-tsm-mini-open]:active::after {
    background: rgba(0, 0, 0, 0.12);
  }

  [data-tsm-knob] {
    transition: scale 200ms var(--tsm-ease);
  }

  [data-tsm-chip],
  [data-tsm-tile] {
    transition:
      scale 240ms var(--tsm-ease),
      background-color 160ms ease;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-tsm-chip][aria-pressed="false"]:hover,
    [data-tsm-tile]:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    [data-tsm-chip][aria-pressed="true"]:hover {
      background: #3be477;
    }

    [data-tsm-hover="circle"]:hover::before {
      background: rgba(255, 255, 255, 0.09);
    }

    [data-tsm-tp]:not([data-active="true"]):hover {
      color: #fff;
    }

    [data-tsm-tp][data-active="true"]:hover {
      color: #3be477;
    }

    [data-tsm-icon-button][data-tsm-press]:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    [data-tsm-play]:hover [data-tsm-play-disc] {
      scale: 1.03;
    }

    [data-tsm-play]:hover:active [data-tsm-play-disc] {
      scale: 0.95;
    }

    [data-tsm-episode-play]:hover {
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.14);
    }

    [data-tsm-episode]:has([data-tsm-episode-open]:hover) {
      background: #262626;
    }

    [data-tsm-shelf-card]:hover [data-tsm-shelf-play] {
      opacity: 1;
      transform: translateY(0);
    }

    [data-tsm-shelf-card]:hover [data-tsm-shelf-title] {
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    [data-tsm-mini]:has([data-tsm-mini-open]:hover) [data-tsm-mini-surface]::after,
    [data-tsm-dock]:hover [data-tsm-dock-surface]::after {
      background: rgba(255, 255, 255, 0.06);
    }

    [data-tsm-mini-handle]:hover [data-tsm-mini-handle-stack]::before {
      background: rgba(255, 255, 255, 0.4);
      transform: translate(4px, -4px) scale(0.92);
    }

    [data-tsm-mini-handle]:hover [data-tsm-mini-handle-stack] img {
      box-shadow:
        0 0 0 1.5px rgba(255, 255, 255, 0.75),
        0 2px 6px rgba(0, 0, 0, 0.35);
    }

    [data-tsm-track]:hover [data-tsm-track-played] {
      background: ${GREEN};
    }

    [data-tsm-track]:hover [data-tsm-knob] {
      scale: 1.15;
    }

    [data-tsm-proto-reset]:hover {
      background: rgba(0, 0, 0, 0.11);
    }
  }

  /* On a real phone the prototype is the whole screen ---------------------- */

  @media (max-width: 520px) {
    [data-tsm-stage] {
      --tsm-top: max(env(safe-area-inset-top), 14px);
      --tsm-bottom: max(env(safe-area-inset-bottom), 10px);
      gap: 0;
    }

    [data-tsm-device] {
      width: 100vw;
      height: 100dvh;
      border-radius: 0;
      box-shadow: none;
    }

    [data-tsm-proto] {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-tsm-screen] *,
    [data-tsm-proto] * {
      transition-duration: 0.01ms !important;
    }

    [data-tsm-eq] i {
      animation: none;
    }
  }
`;
