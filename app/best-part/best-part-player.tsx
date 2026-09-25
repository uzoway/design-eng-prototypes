"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

const AUDIO_SRC = "/spotify/sirens.mp3";
const CANVAS_SRC = "/spotify/sirens-canvas.mp4";
const ARTWORK_SRC = "/spotify/odyssey-sirens.jpg";

const DURATION = 159;
const INITIAL_TIME = 41;

const BEST_PART = {
  start: 96,
  end: 110,
} as const;

const GREEN = "#1ed760";
const EASE_OUT = [0.22, 0.72, 0, 1] as const;

type RepeatMode = "off" | "all" | "one";

const SHUFFLE_PATH =
  "M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.978 1.167-1.796-2.14A2.25 2.25 0 00.39 3.5z";
const SHUFFLE_PATH_2 =
  "M7.5 10.723l.98-1.167.957 1.14a2.25 2.25 0 001.724.804h1.947l-1.017-1.018a.75.75 0 111.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 11-1.06-1.06L13.109 13H11.16a3.75 3.75 0 01-2.873-1.34l-.787-.938z";
const PREV_PATH =
  "M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 9.149V14.3a.7.7 0 01-.7.7H1.7a.7.7 0 01-.7-.7V1.7a.7.7 0 01.7-.7h1.6z";
const NEXT_PATH =
  "M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107a.7.7 0 00-1.05.606v12.575a.7.7 0 001.05.607L12 9.149V14.3a.7.7 0 00.7.7h1.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-1.6z";
const REPEAT_PATH =
  "M0 4.75A3.75 3.75 0 013.75 1h8.5A3.75 3.75 0 0116 4.75v5a3.75 3.75 0 01-3.75 3.75H9.81l1.018 1.018a.75.75 0 11-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 111.06 1.06L9.811 12h2.439a2.25 2.25 0 002.25-2.25v-5a2.25 2.25 0 00-2.25-2.25h-8.5A2.25 2.25 0 001.5 4.75v5A2.25 2.25 0 003.75 12H5v1.5H3.75A3.75 3.75 0 010 9.75v-5z";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function PlayPauseIcon({
  playing,
  reducedMotion,
}: {
  playing: boolean;
  reducedMotion: boolean;
}) {
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.14, ease: EASE_OUT };

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-bp-play-icon>
      <motion.g
        initial={false}
        animate={{
          opacity: playing ? 0 : 1,
          scale: playing ? 0.92 : 1,
        }}
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
        animate={{
          opacity: playing ? 1 : 0,
          scale: playing ? 1 : 0.92,
        }}
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

function SavedIcon({
  saved,
  reducedMotion,
}: {
  saved: boolean;
  reducedMotion: boolean;
}) {
  const shellTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: EASE_OUT };
  const glyphTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.14, ease: EASE_OUT };

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-bp-save-icon>
      <motion.circle
        cx="16"
        cy="16"
        r="13"
        initial={false}
        animate={{
          fill: saved ? GREEN : "rgba(255,255,255,0)",
          stroke: saved ? GREEN : "#b3b3b3",
        }}
        transition={shellTransition}
        strokeWidth="1.8"
      />

      <motion.g
        initial={false}
        animate={{
          opacity: saved ? 0 : 1,
          scale: saved ? 0.86 : 1,
        }}
        transition={glyphTransition}
        style={{ transformOrigin: "16px 16px", transformBox: "view-box" }}
      >
        <path
          d="M16 10.4v11.2M10.4 16h11.2"
          stroke="#b3b3b3"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </motion.g>

      <motion.g
        initial={false}
        animate={{
          opacity: saved ? 1 : 0,
          scale: saved ? 1 : 0.86,
        }}
        transition={glyphTransition}
        style={{ transformOrigin: "16px 16px", transformBox: "view-box" }}
      >
        <path
          d="M10.55 16.2l3.55 3.45 7.55-8.05"
          stroke="#000"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  );
}

export function BestPartPlayer({
  hasBestPart = true,
}: {
  hasBestPart?: boolean;
}) {
  const reducedMotion = Boolean(useReducedMotion());

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const trackRectRef = useRef<DOMRect | null>(null);

  const scrubbingRef = useRef(false);
  const suppressPauseStateRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const jumpingRef = useRef(false);
  const timeRef = useRef(INITIAL_TIME);
  const durationRef = useRef(DURATION);
  const inputModeRef = useRef<"pointer" | "keyboard">("pointer");

  const volumeFrameRef = useRef<number | null>(null);
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTextUpdateRef = useRef(0);
  const lastHoverUpdateRef = useRef(0);

  const [currentTime, setCurrentTime] = useState(INITIAL_TIME);
  const [duration, setDuration] = useState(DURATION);
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [bestPartActive, setBestPartActive] = useState(false);
  const [bestPartArrival, setBestPartArrival] = useState(false);
  const [saved, setSaved] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [hovering, setHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(INITIAL_TIME);
  const [trackKeyboardFocus, setTrackKeyboardFocus] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [canvasAvailable, setCanvasAvailable] = useState(true);

  const progress = useMotionValue(INITIAL_TIME / DURATION);
  const hoverRatio = useMotionValue(INITIAL_TIME / DURATION);

  const hoverLeft = useTransform(hoverRatio, function transformHover(value) {
    return `${clamp(value, 0.06, 0.94) * 100}%`;
  });

  const playedWidth = useTransform(progress, function transformProgress(value) {
    return `${value * 100}%`;
  });

  const knobLeft = useTransform(progress, function transformProgress(value) {
    return `${value * 100}%`;
  });

  const safeDuration = Math.max(duration, 1);
  const bestPartLeft = `${(BEST_PART.start / safeDuration) * 100}%`;
  const bestPartWidth = `${
    ((BEST_PART.end - BEST_PART.start) / safeDuration) * 100
  }%`;
  const bestPartCenter = `${clamp(
    ((BEST_PART.start + BEST_PART.end) / 2 / safeDuration) * 100,
    18,
    82,
  )}%`;

  const remaining = Math.max(0, duration - currentTime);
  const insideBestPart =
    currentTime >= BEST_PART.start && currentTime <= BEST_PART.end;
  const bestPartEmphasized =
    hasBestPart &&
    (bestPartActive || jumping || bestPartArrival || insideBestPart);

  const updateVisualTime = useCallback(
    function updateVisualTime(seconds: number, forceText = false) {
      const activeDuration = durationRef.current;
      const next = clamp(seconds, 0, activeDuration);

      timeRef.current = next;
      progress.set(activeDuration > 0 ? next / activeDuration : 0);

      const now = performance.now();

      if (forceText || now - lastTextUpdateRef.current >= 70) {
        lastTextUpdateRef.current = now;
        setCurrentTime(next);
      }
    },
    [progress],
  );

  const rampVolume = useCallback(function rampVolume(
    target: number,
    durationMs: number,
  ) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (volumeFrameRef.current !== null) {
      cancelAnimationFrame(volumeFrameRef.current);
    }

    if (durationMs <= 0) {
      audio.volume = target;
      volumeFrameRef.current = null;
      return;
    }

    const startVolume = audio.volume;
    const start = performance.now();

    function frame(now: number) {
      const activeAudio = audioRef.current;

      if (!activeAudio) {
        return;
      }

      const ratio = clamp((now - start) / durationMs, 0, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);

      activeAudio.volume = startVolume + (target - startVolume) * eased;

      if (ratio < 1) {
        volumeFrameRef.current = requestAnimationFrame(frame);
      } else {
        volumeFrameRef.current = null;
      }
    }

    volumeFrameRef.current = requestAnimationFrame(frame);
  }, []);

  const markBestPartArrival = useCallback(function markBestPartArrival() {
    if (arrivalTimerRef.current) {
      clearTimeout(arrivalTimerRef.current);
    }

    setBestPartArrival(true);

    arrivalTimerRef.current = setTimeout(function settleArrival() {
      setBestPartArrival(false);
    }, 520);
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
    function initialiseAudio() {
      const currentAudio = audioRef.current;

      if (currentAudio === null) {
        return;
      }

      const audio: HTMLAudioElement = currentAudio;

      function metadata() {
        const nextDuration =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : DURATION;

        durationRef.current = nextDuration;
        setDuration(nextDuration);

        const startTime = Math.min(INITIAL_TIME, nextDuration);

        audio.currentTime = startTime;
        updateVisualTime(startTime, true);
        setAudioError(false);
      }

      function handlePlay() {
        setPlaying(true);
        void videoRef.current?.play().catch(function ignoreVideo() {});
      }

      function handlePause() {
        if (suppressPauseStateRef.current) {
          suppressPauseStateRef.current = false;
          return;
        }

        if (scrubbingRef.current) {
          return;
        }

        setPlaying(false);
        videoRef.current?.pause();
      }

      function handleTimeUpdate() {
        if (scrubbingRef.current || jumpingRef.current) {
          return;
        }

        updateVisualTime(audio.currentTime);
      }

      function handleEnded() {
        const end =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : durationRef.current;

        setPlaying(false);
        videoRef.current?.pause();
        updateVisualTime(end, true);
      }

      function handleError() {
        setAudioError(true);
        setPlaying(false);
        videoRef.current?.pause();
      }

      audio.addEventListener("loadedmetadata", metadata);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);

      if (audio.readyState >= 1) {
        metadata();
      }

      return function cleanup() {
        audio.removeEventListener("loadedmetadata", metadata);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };
    },
    [updateVisualTime],
  );

  useEffect(
    function syncRepeatMode() {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      audio.loop = repeatMode !== "off";
    },
    [repeatMode],
  );

  useEffect(
    function playbackClock() {
      if (!playing) {
        return;
      }

      let frame = 0;

      function loop() {
        const audio = audioRef.current;

        if (audio && !scrubbingRef.current && !jumpingRef.current) {
          updateVisualTime(audio.currentTime);
        }

        frame = requestAnimationFrame(loop);
      }

      frame = requestAnimationFrame(loop);

      return function cleanup() {
        cancelAnimationFrame(frame);
      };
    },
    [playing, updateVisualTime],
  );

  useEffect(function cleanupTimers() {
    return function cleanup() {
      if (volumeFrameRef.current !== null) {
        cancelAnimationFrame(volumeFrameRef.current);
      }

      if (jumpTimerRef.current) {
        clearTimeout(jumpTimerRef.current);
      }

      if (arrivalTimerRef.current) {
        clearTimeout(arrivalTimerRef.current);
      }
    };
  }, []);

  useEffect(
    function resetBestPartState() {
      if (hasBestPart) {
        return;
      }

      setBestPartActive(false);
      setBestPartArrival(false);
      jumpingRef.current = false;
      setJumping(false);

      if (jumpTimerRef.current) {
        clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = null;
      }

      const audio = audioRef.current;

      if (audio !== null && audio.volume !== 1) {
        audio.volume = 1;
      }
    },
    [hasBestPart],
  );

  async function togglePlayback() {
    const currentAudio = audioRef.current;

    if (currentAudio === null || audioError) {
      return;
    }

    const audio: HTMLAudioElement = currentAudio;

    const activeDuration = durationRef.current;

    if (audio.currentTime >= activeDuration - 0.1) {
      audio.currentTime = 0;
      updateVisualTime(0, true);
    }

    if (audio.paused) {
      await audio.play().catch(function handlePlayError() {
        setPlaying(false);
      });

      return;
    }

    audio.pause();
  }

  function seekFromPointer(clientX: number) {
    const rect = trackRectRef.current;

    if (!rect) {
      return;
    }

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

    updateVisualTime(ratio * durationRef.current, true);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const track = trackRef.current;
    const currentAudio = audioRef.current;

    if (track === null || currentAudio === null) {
      return;
    }

    const audio: HTMLAudioElement = currentAudio;

    inputModeRef.current = "pointer";
    setTrackKeyboardFocus(false);

    trackRectRef.current = track.getBoundingClientRect();
    wasPlayingRef.current = !audio.paused;
    scrubbingRef.current = true;
    setScrubbing(true);

    if (wasPlayingRef.current) {
      suppressPauseStateRef.current = true;
      audio.pause();
      videoRef.current?.pause();
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

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

    hoverRatio.set(ratio);

    const now = performance.now();

    if (now - lastHoverUpdateRef.current < 32) {
      return;
    }

    lastHoverUpdateRef.current = now;
    setHoverTime(ratio * durationRef.current);
  }

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    trackRectRef.current =
      trackRef.current?.getBoundingClientRect() ?? trackRectRef.current;

    updateHover(event.clientX);
    setHovering(true);
  }

  function handlePointerLeave() {
    setHovering(false);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") {
      updateHover(event.clientX);
    }

    if (!scrubbingRef.current) {
      return;
    }

    seekFromPointer(event.clientX);
  }

  function endScrub(event: PointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) {
      return;
    }

    const audio = audioRef.current;

    scrubbingRef.current = false;
    setScrubbing(false);

    if (audio !== null) {
      audio.currentTime = timeRef.current;

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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    inputModeRef.current = "keyboard";
    setTrackKeyboardFocus(true);

    let next: number | null = null;

    if (event.key === "ArrowRight") {
      next = timeRef.current + (event.shiftKey ? 1 : 5);
    } else if (event.key === "ArrowLeft") {
      next = timeRef.current - (event.shiftKey ? 1 : 5);
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = durationRef.current;
    }

    if (next === null) {
      return;
    }

    event.preventDefault();

    const value = clamp(next, 0, durationRef.current);

    updateVisualTime(value, true);

    const audio = audioRef.current;

    if (audio !== null) {
      audio.currentTime = value;
    }
  }

  function restart() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    updateVisualTime(0, true);
  }

  function skipToEnd() {
    const audio = audioRef.current;
    const end =
      audio && Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : durationRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = end;
    }

    videoRef.current?.pause();
    setPlaying(false);
    updateVisualTime(end, true);
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

  async function skipToBestPart() {
    const currentAudio = audioRef.current;

    if (
      !hasBestPart ||
      currentAudio === null ||
      audioError ||
      jumpingRef.current
    ) {
      return;
    }

    const audio: HTMLAudioElement = currentAudio;
    const activeDuration = durationRef.current;
    const destination = clamp(BEST_PART.start, 0, activeDuration);
    const shouldStartPlayback = audio.paused;

    jumpingRef.current = true;
    setJumping(true);
    setBestPartArrival(false);

    if (jumpTimerRef.current) {
      clearTimeout(jumpTimerRef.current);
    }

    if (shouldStartPlayback) {
      audio.currentTime = destination;
      updateVisualTime(destination, true);
      audio.volume = reducedMotion ? 1 : 0.18;

      await audio.play().catch(function handlePlayError() {
        audio.volume = 1;
        jumpingRef.current = false;
        setJumping(false);
      });

      if (!audio.paused) {
        rampVolume(1, reducedMotion ? 0 : 180);
        markBestPartArrival();
      }

      jumpingRef.current = false;
      setJumping(false);
      return;
    }

    if (reducedMotion) {
      audio.currentTime = destination;
      updateVisualTime(destination, true);
      markBestPartArrival();
      jumpingRef.current = false;
      setJumping(false);
      return;
    }

    rampVolume(0.18, 72);

    jumpTimerRef.current = setTimeout(function commitBestPartSeek() {
      audio.currentTime = destination;
      updateVisualTime(destination, true);
      audio.volume = 0.18;
      rampVolume(1, 170);
      markBestPartArrival();

      jumpingRef.current = false;
      setJumping(false);
      jumpTimerRef.current = null;
    }, 82);
  }

  return (
    <section
      data-bp-player
      data-playing={playing ? "true" : "false"}
      data-scrubbing={scrubbing ? "true" : "false"}
    >
      <audio ref={audioRef} src={AUDIO_SRC} preload="auto" />

      <div data-bp-media>
        <img
          src={ARTWORK_SRC}
          alt=""
          draggable={false}
          data-bp-media-fallback
        />

        {canvasAvailable && (
          <video
            ref={videoRef}
            src={CANVAS_SRC}
            poster={ARTWORK_SRC}
            muted
            loop
            playsInline
            preload="metadata"
            tabIndex={-1}
            aria-hidden="true"
            onError={function handleCanvasError() {
              setCanvasAvailable(false);
            }}
            data-bp-canvas
          />
        )}

        <div data-bp-media-scrim aria-hidden="true" />
      </div>

      <div data-bp-body>
        <div data-bp-meta>
          <img src={ARTWORK_SRC} alt="" draggable={false} data-bp-thumbnail />

          <div data-bp-meta-copy>
            <span data-bp-title>Sirens</span>
            <span data-bp-artist>Ludwig Göransson</span>
          </div>

          <button
            type="button"
            data-bp-save
            aria-label={
              saved ? "Remove from Liked Songs" : "Add to Liked Songs"
            }
            aria-pressed={saved}
            onClick={function toggleSaved() {
              setSaved(function toggle(current) {
                return !current;
              });
            }}
          >
            <SavedIcon saved={saved} reducedMotion={reducedMotion} />
          </button>
        </div>

        <div data-bp-scrub-region>
          <motion.div
            data-bp-best-rail
            initial={false}
            animate={{
              height: hasBestPart ? 24 : 0,
              opacity: hasBestPart ? 1 : 0,
            }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    height: { duration: 0.24, ease: EASE_OUT },
                    opacity: { duration: 0.14, ease: EASE_OUT },
                  }
            }
          >
            <AnimatePresence initial={false}>
              {hasBestPart && (
                <motion.button
                  type="button"
                  data-bp-best-action
                  data-active={bestPartEmphasized ? "true" : "false"}
                  data-arrival={bestPartArrival ? "true" : "false"}
                  style={{ left: bestPartCenter, x: "-50%" }}
                  aria-label={`Play best part at ${formatTime(BEST_PART.start)}`}
                  onClick={skipToBestPart}
                  onPointerEnter={function activateBestPart() {
                    setBestPartActive(true);
                  }}
                  onPointerLeave={function deactivateBestPart() {
                    setBestPartActive(false);
                  }}
                  onFocus={function activateBestPart() {
                    setBestPartActive(true);
                  }}
                  onBlur={function deactivateBestPart() {
                    setBestPartActive(false);
                  }}
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 3, scale: 0.97 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 2, scale: 0.98 }
                  }
                  transition={{
                    duration: reducedMotion ? 0 : 0.16,
                    ease: EASE_OUT,
                  }}
                >
                  <span data-bp-best-chip>
                    <span data-bp-best-indicator aria-hidden="true" />
                    <span data-bp-best-label>Best part</span>
                    <span data-bp-best-time>{formatTime(BEST_PART.start)}</span>
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          <div
            ref={trackRef}
            data-bp-track
            data-keyboard-focus={trackKeyboardFocus ? "true" : "false"}
            role="slider"
            tabIndex={0}
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onFocus={function handleTrackFocus() {
              setTrackKeyboardFocus(inputModeRef.current === "keyboard");
            }}
            onBlur={function handleTrackBlur() {
              setTrackKeyboardFocus(false);
            }}
            onKeyDown={handleKeyDown}
          >
            <AnimatePresence>
              {hovering && !scrubbing && (
                <motion.span
                  data-bp-hover-time
                  style={{
                    left: hoverLeft,
                    x: "-50%",
                  }}
                  initial={
                    reducedMotion ? { opacity: 0 } : { opacity: 0, y: 3 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 2 }}
                  transition={{
                    duration: reducedMotion ? 0.06 : 0.12,
                    ease: EASE_OUT,
                  }}
                  aria-hidden="true"
                >
                  {formatTime(hoverTime)}
                </motion.span>
              )}
            </AnimatePresence>

            <span data-bp-track-base aria-hidden="true" />

            <motion.span
              data-bp-track-played
              style={{ width: playedWidth }}
              aria-hidden="true"
            />

            <AnimatePresence initial={false}>
              {hasBestPart && (
                <motion.span
                  data-bp-best-range
                  data-active={bestPartEmphasized ? "true" : "false"}
                  data-arrival={bestPartArrival ? "true" : "false"}
                  style={{
                    left: bestPartLeft,
                    width: bestPartWidth,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: bestPartEmphasized ? 1 : 0.78 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.16,
                    ease: EASE_OUT,
                  }}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>

            <motion.span
              data-bp-knob
              style={{ left: knobLeft }}
              aria-hidden="true"
            />
          </div>

          <div data-bp-times>
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(remaining)}</span>
          </div>
        </div>

        <div data-bp-transport>
          <button
            type="button"
            data-bp-tp
            data-active={shuffle ? "true" : "false"}
            aria-label="Shuffle"
            aria-pressed={shuffle}
            onClick={function toggleShuffle() {
              setShuffle(function flip(current) {
                return !current;
              });
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d={SHUFFLE_PATH} fill="currentColor" />
              <path d={SHUFFLE_PATH_2} fill="currentColor" />
            </svg>
            <span
              data-bp-tp-dot
              data-visible={shuffle ? "true" : "false"}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            data-bp-tp
            data-strong="true"
            aria-label="Previous"
            onClick={restart}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d={PREV_PATH} fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            data-bp-play
            onClick={togglePlayback}
            aria-label={playing ? "Pause" : "Play"}
          >
            <span data-bp-play-disc>
              <PlayPauseIcon playing={playing} reducedMotion={reducedMotion} />
            </span>
          </button>

          <button
            type="button"
            data-bp-tp
            data-strong="true"
            aria-label="Next"
            onClick={skipToEnd}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d={NEXT_PATH} fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            data-bp-tp
            data-active={repeatMode !== "off" ? "true" : "false"}
            aria-label={
              repeatMode === "one"
                ? "Repeat one"
                : repeatMode === "all"
                  ? "Repeat"
                  : "Enable repeat"
            }
            aria-pressed={repeatMode !== "off"}
            onClick={cycleRepeat}
          >
            <span data-bp-repeat-glyph>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d={REPEAT_PATH} fill="currentColor" />
              </svg>
              <span
                data-bp-repeat-one
                data-visible={repeatMode === "one" ? "true" : "false"}
                aria-hidden="true"
              >
                1
              </span>
            </span>
            <span
              data-bp-tp-dot
              data-visible={repeatMode !== "off" ? "true" : "false"}
              aria-hidden="true"
            />
          </button>
        </div>

        {audioError && (
          <p data-bp-media-error role="status">
            Add <code>/public/spotify/sirens.mp3</code> to enable audio.
          </p>
        )}
      </div>

      <style>{`
        [data-bp-player] {
          position: relative;
          width: min(392px, calc(100vw - 32px));
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 20px;
          color: #fff;
          background: #101010;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.18),
            0 26px 64px -36px rgba(0, 0, 0, 0.68);
          isolation: isolate;
          user-select: none;
          -webkit-user-select: none;
        }

        [data-bp-player] button {
          font: inherit;
        }

        [data-bp-media] {
          position: relative;
          height: 428px;
          overflow: hidden;
          background: #182933;
        }

        [data-bp-media-fallback],
        [data-bp-canvas] {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center 24%;
        }

        [data-bp-canvas] {
          z-index: 2;
        }

        [data-bp-media-scrim] {
          position: absolute;
          z-index: 3;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.015) 48%,
              rgba(0, 0, 0, 0.08) 63%,
              rgba(8, 8, 8, 0.54) 82%,
              #101010 100%
            );
        }

        [data-bp-body] {
          position: relative;
          z-index: 4;
          margin-top: -42px;
          padding: 0 19px 18px;
        }

        [data-bp-meta] {
          min-width: 0;
          display: grid;
          grid-template-columns: 50px minmax(0, 1fr) 44px;
          align-items: center;
          gap: 12px;
        }

        [data-bp-thumbnail] {
          width: 50px;
          height: 50px;
          display: block;
          border-radius: 5px;
          object-fit: cover;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.28);
        }

        [data-bp-meta-copy] {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        [data-bp-title] {
          overflow: hidden;
          color: #fff;
          font-size: 21px;
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.026em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        [data-bp-artist] {
          overflow: hidden;
          color: #b3b3b3;
          font-size: 14px;
          font-weight: 450;
          line-height: 1.3;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        [data-bp-save] {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 50%;
          color: #b3b3b3;
          background: transparent;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        [data-bp-save-icon] {
          display: block;
          width: 28px;
          height: 28px;
          overflow: visible;
        }

        [data-bp-scrub-region] {
          margin-top: 19px;
        }

        [data-bp-best-rail] {
          position: relative;
          overflow: hidden;
        }

        [data-bp-best-action] {
          position: absolute;
          top: 0;
          height: 24px;
          display: grid;
          place-items: center;
          margin: 0;
          padding: 0;
          border: 0;
          color: #9f9f9f;
          background: transparent;
          white-space: nowrap;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        [data-bp-best-chip] {
          height: 16px;
          display: inline-flex;
          align-items: center;
          gap: 3.5px;
          padding: 0 5px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.02);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
          transition:
            color 140ms ease,
            border-color 140ms ease,
            background-color 140ms ease,
            box-shadow 180ms ease;
        }

        [data-bp-best-label] {
          font-size: 8.75px;
          font-weight: 620;
          letter-spacing: 0;
          line-height: 1;
        }

        [data-bp-best-action][data-active="true"] [data-bp-best-chip] {
          color: #dedede;
          border-color: rgba(30, 215, 96, 0.16);
          background: rgba(30, 215, 96, 0.05);
        }

        [data-bp-best-action][data-arrival="true"] [data-bp-best-chip] {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.025),
            0 0 0 2px rgba(30, 215, 96, 0.05);
        }

        [data-bp-best-indicator] {
          width: 3px;
          height: 3px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: ${GREEN};
        }

        [data-bp-best-time] {
          color: #707070;
          font-size: 8.25px;
          font-weight: 570;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          transition: color 140ms ease;
        }

        [data-bp-best-action][data-active="true"] [data-bp-best-time] {
          color: #8eaa96;
        }

        [data-bp-track] {
          position: relative;
          height: 22px;
          display: flex;
          align-items: center;
          cursor: pointer;
          touch-action: none;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }

        [data-bp-track-base],
        [data-bp-track-played],
        [data-bp-best-range] {
          position: absolute;
          left: 0;
          top: 50%;
          border-radius: 999px;
          pointer-events: none;
          transform: translateY(-50%);
        }

        [data-bp-track-base] {
          right: 0;
          z-index: 1;
          height: 3px;
          background: rgba(255, 255, 255, 0.26);
        }

        [data-bp-track-played] {
          z-index: 2;
          height: 3px;
          background: #fff;
          will-change: width;
        }

        [data-bp-best-range] {
          z-index: 3;
          height: 5px;
          background: ${GREEN};
          box-shadow: 0 0 0 1px rgba(30, 215, 96, 0.05);
          transition:
            height 160ms cubic-bezier(0.22, 0.72, 0, 1),
            box-shadow 180ms ease;
        }

        [data-bp-best-range][data-active="true"] {
          height: 6px;
          box-shadow: 0 0 12px -3px rgba(30, 215, 96, 0.72);
        }

        [data-bp-best-range][data-arrival="true"] {
          box-shadow: 0 0 14px -2px rgba(30, 215, 96, 0.82);
        }

        [data-bp-knob] {
          position: absolute;
          z-index: 4;
          top: 50%;
          width: 10px;
          height: 10px;
          margin-top: -5px;
          margin-left: -5px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.42);
          pointer-events: none;
          transform: scale(1);
          transition: transform 130ms cubic-bezier(0.22, 0.72, 0, 1);
          will-change: left, transform;
        }

        [data-bp-player][data-scrubbing="true"] [data-bp-knob] {
          transform: scale(1.18);
        }

        [data-bp-hover-time] {
          position: absolute;
          z-index: 6;
          bottom: calc(50% + 11px);
          padding: 4px 7px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.94);
          color: #fff;
          font-size: 10.5px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 6px 16px -7px rgba(0, 0, 0, 0.72);
        }

        [data-bp-track][data-keyboard-focus="true"] {
          outline: 2px solid rgba(255, 255, 255, 0.95);
          outline-offset: 3px;
          border-radius: 4px;
        }

        [data-bp-times] {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1px;
          color: #8f8f8f;
          font-size: 10.5px;
          font-weight: 510;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        [data-bp-transport] {
          display: grid;
          grid-template-columns: 44px 44px 72px 44px 44px;
          align-items: center;
          justify-content: space-between;
          margin-top: 15px;
          padding: 0 1px;
        }

        [data-bp-tp] {
          position: relative;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #a7a7a7;
          cursor: pointer;
          touch-action: manipulation;
          transition:
            color 140ms ease,
            opacity 100ms ease,
            background-color 140ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        [data-bp-tp] svg {
          display: block;
          width: 18px;
          height: 18px;
          overflow: visible;
        }

        [data-bp-tp][data-strong="true"] {
          color: #f3f3f3;
        }

        [data-bp-tp][data-strong="true"] svg {
          width: 25px;
          height: 25px;
        }

        [data-bp-tp][data-active="true"] {
          color: ${GREEN};
        }

        [data-bp-tp]:active {
          opacity: 0.68;
        }

        [data-bp-tp-dot] {
          position: absolute;
          bottom: 5px;
          left: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: ${GREEN};
          opacity: 0;
          transform: translateX(-50%) scale(0.65);
          transition:
            opacity 130ms ease,
            transform 160ms cubic-bezier(0.22, 0.72, 0, 1);
          pointer-events: none;
        }

        [data-bp-tp-dot][data-visible="true"] {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }

        [data-bp-repeat-glyph] {
          position: relative;
          width: 18px;
          height: 18px;
          display: grid;
          place-items: center;
        }

        [data-bp-repeat-glyph] > svg {
          width: 18px;
          height: 18px;
        }

        [data-bp-repeat-one] {
          position: absolute;
          left: 50%;
          top: 50%;
          color: currentColor;
          font-size: 6px;
          font-weight: 800;
          line-height: 1;
          opacity: 0;
          transform: translate(-50%, -48%);
          transition: opacity 120ms ease;
          pointer-events: none;
        }

        [data-bp-repeat-one][data-visible="true"] {
          opacity: 1;
        }

        [data-bp-play] {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        [data-bp-play-disc] {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #000;
          background: #fff;
          box-shadow: 0 5px 14px -8px rgba(0, 0, 0, 0.65);
          transform: translateZ(0) scale(1);
          transition: transform 130ms cubic-bezier(0.22, 0.72, 0, 1);
          will-change: transform;
        }

        [data-bp-play]:active [data-bp-play-disc] {
          transform: translateZ(0) scale(0.965);
        }

        [data-bp-play-icon] {
          display: block;
          width: 31px;
          height: 31px;
          overflow: visible;
        }

        [data-bp-media-error] {
          margin: 12px 0 0;
          color: #9a9a9a;
          font-size: 9.5px;
          line-height: 1.5;
          text-align: center;
        }

        [data-bp-media-error] code {
          color: #fff;
          font-family: var(--font-geist-mono);
        }

        [data-bp-best-action]:focus-visible {
          outline: none;
        }

        [data-bp-best-action]:focus-visible [data-bp-best-chip] {
          outline: 2px solid #fff;
          outline-offset: 2px;
        }

        [data-bp-save]:focus-visible,
        [data-bp-play]:focus-visible,
        [data-bp-tp]:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 2px;
        }

        @media (hover: hover) and (pointer: fine) {
          [data-bp-save]:hover {
            color: #fff;
          }

          [data-bp-tp]:hover:not([data-active="true"]) {
            color: #fff;
            background: rgba(255, 255, 255, 0.045);
          }

          [data-bp-play]:hover [data-bp-play-disc] {
            transform: translateZ(0) scale(1.025);
          }

          [data-bp-play]:hover:active [data-bp-play-disc] {
            transform: translateZ(0) scale(0.975);
          }
        }

        @media (max-width: 520px) {
          [data-bp-player] {
            border-radius: 16px;
          }

          [data-bp-media] {
            height: 410px;
          }

          [data-bp-body] {
            padding-inline: 16px;
          }

          [data-bp-transport] {
            grid-template-columns: 42px 42px 68px 42px 42px;
          }

          [data-bp-play] {
            width: 68px;
            height: 68px;
          }

          [data-bp-play-disc] {
            width: 62px;
            height: 62px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-bp-best-action],
          [data-bp-best-chip],
          [data-bp-best-time],
          [data-bp-best-range],
          [data-bp-knob],
          [data-bp-tp],
          [data-bp-tp-dot],
          [data-bp-repeat-one],
          [data-bp-play-disc] {
            transition-duration: 0.01ms;
          }
        }

        @media (forced-colors: active) {
          [data-bp-player] {
            border: 1px solid ButtonText;
          }

          [data-bp-track-base] {
            background: GrayText;
          }

          [data-bp-track-played],
          [data-bp-knob],
          [data-bp-best-range] {
            background: Highlight;
          }

          [data-bp-best-action],
          [data-bp-play-disc] {
            border: 1px solid ButtonText;
          }
        }
      `}</style>
    </section>
  );
}
