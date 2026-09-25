"use client";

import {
  animate,
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

type MorphLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity?: number;
};

type RepeatMode = "off" | "all" | "one";

const COLLAPSED_LINE: MorphLine = {
  x1: 16,
  y1: 16,
  x2: 16,
  y2: 16,
  opacity: 0,
};

const PLAY_LINES: MorphLine[] = [
  {
    x1: 10.4,
    y1: 7.6,
    x2: 10.4,
    y2: 24.4,
  },
  {
    x1: 10.4,
    y1: 7.6,
    x2: 23.1,
    y2: 16,
  },
  {
    x1: 23.1,
    y1: 16,
    x2: 10.4,
    y2: 24.4,
  },
  {
    x1: 11.4,
    y1: 16,
    x2: 19.2,
    y2: 16,
  },
];

const PAUSE_LINES: MorphLine[] = [
  {
    x1: 11.1,
    y1: 8,
    x2: 11.1,
    y2: 24,
  },
  {
    x1: 20.9,
    y1: 8,
    x2: 20.9,
    y2: 24,
  },
  COLLAPSED_LINE,
  COLLAPSED_LINE,
];

const ADD_LINES: MorphLine[] = [
  {
    x1: 10.2,
    y1: 16,
    x2: 21.8,
    y2: 16,
  },
  {
    x1: 16,
    y1: 10.2,
    x2: 16,
    y2: 21.8,
  },
];

const SAVED_LINES: MorphLine[] = [
  {
    x1: 10.2,
    y1: 16.3,
    x2: 14.3,
    y2: 20.3,
  },
  {
    x1: 14.3,
    y1: 20.3,
    x2: 22,
    y2: 11.9,
  },
];

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

function morphTransition(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      duration: 0,
    };
  }

  return {
    type: "spring" as const,
    duration: 0.38,
    bounce: 0,
  };
}

function PlayPauseIcon({
  playing,
  reducedMotion,
}: {
  playing: boolean;
  reducedMotion: boolean;
}) {
  const lines = playing ? PAUSE_LINES : PLAY_LINES;

  const transition = morphTransition(reducedMotion);

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-play-icon>
      <motion.g
        initial={false}
        animate={{
          x: playing ? 0 : 0.75,
        }}
        transition={transition}
      >
        {lines.map(function renderLine(line, index) {
          return (
            <motion.line
              key={index}
              initial={false}
              animate={{
                x1: line.x1,
                y1: line.y1,
                x2: line.x2,
                y2: line.y2,
                opacity: line.opacity ?? 1,
              }}
              transition={transition}
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
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
  const lines = saved ? SAVED_LINES : ADD_LINES;

  const transition = morphTransition(reducedMotion);

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <motion.circle
        cx="16"
        cy="16"
        r="13.5"
        initial={false}
        animate={{
          fill: saved ? GREEN : "rgba(255,255,255,0)",
          stroke: saved ? GREEN : "#b3b3b3",
        }}
        transition={{
          duration: reducedMotion ? 0 : 0.18,
          ease: EASE_OUT,
        }}
        strokeWidth="1.7"
      />

      {lines.map(function renderLine(line, index) {
        return (
          <motion.line
            key={index}
            initial={false}
            animate={{
              x1: line.x1,
              y1: line.y1,
              x2: line.x2,
              y2: line.y2,
              opacity: line.opacity ?? 1,
              stroke: saved ? "#000" : "#b3b3b3",
            }}
            transition={{
              ...transition,
              stroke: {
                duration: reducedMotion ? 0 : 0.15,
              },
            }}
            strokeWidth="2.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

export function BestPartPlayer() {
  const reducedMotion = Boolean(useReducedMotion());

  const audioRef = useRef<HTMLAudioElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const trackRef = useRef<HTMLDivElement>(null);

  const trackRectRef = useRef<DOMRect | null>(null);

  const scrubbingRef = useRef(false);

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

  const bestPartLeft = `${(BEST_PART.start / duration) * 100}%`;

  const bestPartWidth = `${
    ((BEST_PART.end - BEST_PART.start) / duration) * 100
  }%`;

  const remaining = Math.max(0, duration - currentTime);

  const insideBestPart =
    currentTime >= BEST_PART.start && currentTime <= BEST_PART.end;

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
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

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

  async function togglePlayback() {
    const audio = audioRef.current;

    if (!audio || audioError) {
      return;
    }

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

    const audio = audioRef.current;

    if (!track || !audio) {
      return;
    }

    inputModeRef.current = "pointer";

    setTrackKeyboardFocus(false);

    trackRectRef.current = track.getBoundingClientRect();

    wasPlayingRef.current = !audio.paused;

    scrubbingRef.current = true;

    setScrubbing(true);

    audio.pause();

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

  function endScrub(event: PointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) {
      return;
    }

    const audio = audioRef.current;

    scrubbingRef.current = false;

    setScrubbing(false);

    if (audio) {
      audio.currentTime = timeRef.current;

      if (wasPlayingRef.current) {
        void audio.play().catch(function ignorePlay() {});
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

    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  }

  async function skipToBestPart() {
    const audio = audioRef.current;

    if (!audio || audioError || jumpingRef.current) {
      return;
    }

    jumpingRef.current = true;

    setJumping(true);

    setBestPartArrival(false);

    const activeDuration = durationRef.current;

    const destination = clamp(BEST_PART.start, 0, activeDuration);

    const target = destination / activeDuration;

    if (reducedMotion) {
      audio.currentTime = destination;

      updateVisualTime(destination, true);

      await audio.play().catch(function ignorePlay() {});

      jumpingRef.current = false;

      setJumping(false);

      return;
    }

    rampVolume(0.08, 100);

    const controls = animate(progress, target, {
      duration: 0.42,
      ease: EASE_OUT,

      onUpdate(value) {
        const next = value * activeDuration;

        timeRef.current = next;

        const now = performance.now();

        if (now - lastTextUpdateRef.current > 32) {
          lastTextUpdateRef.current = now;

          setCurrentTime(next);
        }
      },

      onComplete() {
        jumpingRef.current = false;

        setJumping(false);

        setBestPartArrival(true);

        updateVisualTime(audio.currentTime, true);

        arrivalTimerRef.current = setTimeout(function settle() {
          setBestPartArrival(false);
        }, 520);
      },
    });

    jumpTimerRef.current = setTimeout(function commitSeek() {
      audio.currentTime = destination;

      audio.volume = 0.08;

      void audio
        .play()
        .then(function restoreAudio() {
          rampVolume(1, 210);
        })
        .catch(function ignorePlay() {});
    }, 145);

    void controls;
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
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(
              duration,
            )}`}
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
                    reducedMotion
                      ? {
                          opacity: 0,
                        }
                      : {
                          opacity: 0,
                          y: 5,
                          scale: 0.94,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={
                    reducedMotion
                      ? {
                          opacity: 0,
                        }
                      : {
                          opacity: 0,
                          y: 3,
                          scale: 0.96,
                        }
                  }
                  transition={{
                    duration: reducedMotion ? 0.08 : 0.15,
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
              style={{
                width: playedWidth,
              }}
              aria-hidden="true"
            />

            <motion.span
              data-bp-best-range
              data-active={
                bestPartActive || jumping || bestPartArrival || insideBestPart
                  ? "true"
                  : "false"
              }
              style={{
                left: bestPartLeft,
                width: bestPartWidth,
              }}
              animate={{
                scaleY: bestPartActive || jumping || bestPartArrival ? 1.4 : 1,
                opacity:
                  bestPartActive || jumping || bestPartArrival || insideBestPart
                    ? 1
                    : 0.72,
              }}
              transition={
                reducedMotion
                  ? {
                      duration: 0,
                    }
                  : {
                      type: "spring",
                      duration: 0.3,
                      bounce: 0,
                    }
              }
              aria-hidden="true"
            />

            <motion.span
              data-bp-knob
              style={{
                left: knobLeft,
              }}
              animate={{
                scale: scrubbing && !reducedMotion ? 1.28 : 1,
              }}
              transition={
                reducedMotion
                  ? {
                      duration: 0,
                    }
                  : {
                      type: "spring",
                      duration: 0.28,
                      bounce: 0.08,
                    }
              }
              aria-hidden="true"
            />
          </div>

          <div data-bp-times>
            <span>{formatTime(currentTime)}</span>

            <button
              type="button"
              data-bp-best-action
              onClick={skipToBestPart}
              onPointerEnter={function activate() {
                setBestPartActive(true);
              }}
              onPointerLeave={function deactivate() {
                setBestPartActive(false);
              }}
              onFocus={function activate() {
                setBestPartActive(true);
              }}
              onBlur={function deactivate() {
                setBestPartActive(false);
              }}
            >
              <motion.span
                data-bp-best-indicator
                animate={{
                  scale: bestPartArrival && !reducedMotion ? [1, 1.5, 1] : 1,
                }}
                transition={{
                  duration: 0.36,
                  ease: EASE_OUT,
                }}
                aria-hidden="true"
              />

              <span>Best part</span>

              <span data-bp-best-time>· {formatTime(BEST_PART.start)}</span>
            </button>

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

          <motion.button
            type="button"
            data-bp-play
            onClick={togglePlayback}
            aria-label={playing ? "Pause" : "Play"}
            whileTap={
              reducedMotion
                ? undefined
                : {
                    scale: 0.97,
                  }
            }
          >
            <PlayPauseIcon playing={playing} reducedMotion={reducedMotion} />
          </motion.button>

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
            onClick={cycleRepeat}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d={REPEAT_PATH} fill="currentColor" />

              <text
                x="8"
                y="9.6"
                textAnchor="middle"
                fontSize="6.2"
                fontWeight="700"
                fill="currentColor"
                opacity={repeatMode === "one" ? 1 : 0}
              >
                1
              </text>
            </svg>

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
          width: min(
            392px,
            calc(100vw - 32px)
          );
          overflow: hidden;
          border-radius: 20px;
          color: #fff;
          background: #0f0f0f;
          box-shadow:
            0 2px 4px
              rgba(0, 0, 0, 0.16),
            0 36px 80px -44px
              rgba(0, 0, 0, 0.68);
          isolation: isolate;
          user-select: none;
          -webkit-user-select: none;
        }

        [data-bp-media] {
          position: relative;
          height: 430px;
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
              rgba(0, 0, 0, 0.02) 52%,
              rgba(0, 0, 0, 0.14) 72%,
              rgba(15, 15, 15, 0.92) 100%
            );
        }

        [data-bp-body] {
          position: relative;
          z-index: 4;
          margin-top: -46px;
          padding: 0 19px 19px;
        }

        [data-bp-meta] {
          min-width: 0;
          display: grid;
          grid-template-columns:
            52px
            minmax(0, 1fr)
            44px;
          align-items: center;
          gap: 12px;
        }

        [data-bp-thumbnail] {
          width: 52px;
          height: 52px;
          display: block;
          border-radius: 6px;
          object-fit: cover;
          box-shadow:
            0 3px 10px
              rgba(0, 0, 0, 0.28);
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
          font-size: 22px;
          font-weight: 710;
          line-height: 1.15;
          letter-spacing: -0.027em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        [data-bp-artist] {
          overflow: hidden;
          color: #b3b3b3;
          font-size: 14.5px;
          font-weight: 430;
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

        [data-bp-save] svg {
          display: block;
          width: 28px;
          height: 28px;
          overflow: visible;
        }

        [data-bp-scrub-region] {
          margin-top: 25px;
        }

        [data-bp-track] {
          position: relative;
          height: 28px;
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
          height: 4px;
          border-radius: 999px;
          pointer-events: none;
          transform-origin: center;
        }

        [data-bp-track-base] {
          right: 0;
          z-index: 1;
          background:
            rgba(255, 255, 255, 0.29);
        }

        [data-bp-track-played] {
          z-index: 2;
          background: #fff;
          will-change: width;
        }

        [data-bp-best-range] {
          z-index: 3;
          background: ${GREEN};
          will-change: transform, opacity;
        }

        [data-bp-knob] {
          position: absolute;
          z-index: 4;
          top: 50%;
          width: 11px;
          height: 11px;
          margin-top: -5.5px;
          margin-left: -5.5px;
          border-radius: 50%;
          background: #fff;
          box-shadow:
            0 1px 3px
              rgba(0, 0, 0, 0.42);
          pointer-events: none;
          will-change: left, transform;
        }

        [data-bp-hover-time] {
          position: absolute;
          z-index: 6;
          bottom: calc(50% + 12px);
          padding: 4px 8px;
          border-radius: 7px;
          background: #000;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          white-space: nowrap;
          pointer-events: none;
          box-shadow:
            0 6px 16px -6px
              rgba(0, 0, 0, 0.7);
        }

        [data-bp-track][data-keyboard-focus="true"] {
          outline:
            2px solid
            rgba(255, 255, 255, 0.95);
          outline-offset: 4px;
          border-radius: 5px;
        }

        [data-bp-times] {
          display: grid;
          grid-template-columns:
            1fr
            auto
            1fr;
          align-items: center;
          margin-top: 2px;
          color: #b3b3b3;
          font-size: 10.5px;
          font-weight: 510;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        [data-bp-times]
          > span:last-child {
          text-align: right;
        }

        [data-bp-best-action] {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin: -6px 0;
          padding: 0 7px;
          border: 0;
          border-radius: 7px;
          color: #d2d2d2;
          background: transparent;
          font-size: 10.5px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition:
            color 150ms ease,
            background-color 150ms ease;
        }

        [data-bp-best-indicator] {
          width: 5px;
          height: 5px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: ${GREEN};
          transform-origin: center;
        }

        [data-bp-best-time] {
          color: #929292;
          font-weight: 510;
        }

        [data-bp-best-action]:hover {
          color: #fff;
          background:
            rgba(255, 255, 255, 0.055);
        }

        [data-bp-best-action]:focus-visible,
        [data-bp-save]:focus-visible,
        [data-bp-play]:focus-visible,
        [data-bp-tp]:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 2px;
        }

        [data-bp-transport] {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 15px;
          padding: 0 2px;
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
          background: transparent;
          color: #b3b3b3;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition:
            color 160ms ease,
            opacity 120ms ease;
        }

        [data-bp-tp] svg {
          display: block;
          width: 18px;
          height: 18px;
          overflow: visible;
        }

        [data-bp-tp][data-strong="true"] {
          color: #fff;
        }

        [data-bp-tp][data-strong="true"] svg {
          width: 26px;
          height: 26px;
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
          transform:
            translateX(-50%)
            scale(0.5);
          transition:
            opacity 150ms ease,
            transform 220ms
              cubic-bezier(
                0.22,
                0.72,
                0,
                1
              );
          pointer-events: none;
        }

        [data-bp-tp-dot][data-visible="true"] {
          opacity: 1;
          transform:
            translateX(-50%)
            scale(1);
        }

        [data-bp-play] {
          width: 66px;
          height: 66px;
          display: grid;
          place-items: center;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 50%;
          color: #000;
          background: #fff;
          cursor: pointer;
          touch-action: manipulation;
          box-shadow:
            0 6px 16px -9px
              rgba(0, 0, 0, 0.62);
          -webkit-tap-highlight-color: transparent;
          transform-origin: center;
        }

        [data-play-icon] {
          display: block;
          width: 32px;
          height: 32px;
          overflow: visible;
        }

        [data-bp-media-error] {
          margin: 13px 0 0;
          color: #b3b3b3;
          font-size: 9.5px;
          line-height: 1.5;
          text-align: center;
        }

        [data-bp-media-error]
          code {
          color: #fff;
          font-family:
            var(--font-geist-mono);
        }

        @media (
          hover: hover
        ) and (
          pointer: fine
        ) {
          [data-bp-tp]:hover:not(
            [data-active="true"]
          ) {
            color: #fff;
          }

          [data-bp-play]:hover {
            transform: scale(1.02);
          }
        }

        @media (
          max-width: 520px
        ) {
          [data-bp-player] {
            border-radius: 16px;
          }

          [data-bp-media] {
            height: 410px;
          }

          [data-bp-body] {
            padding-inline: 16px;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          [data-bp-best-action],
          [data-bp-tp] {
            transition:
              color 150ms ease,
              opacity 120ms ease,
              background-color 150ms ease;
          }

          [data-bp-tp-dot] {
            transition: opacity 120ms ease;
          }
        }

        @media (
          forced-colors:
            active
        ) {
          [data-bp-player] {
            border:
              1px solid
              ButtonText;
          }

          [data-bp-track-base] {
            background:
              GrayText;
          }

          [data-bp-track-played],
          [data-bp-knob],
          [data-bp-best-range] {
            background:
              Highlight;
          }

          [data-bp-play] {
            border:
              1px solid
              ButtonText;
          }
        }
      `}</style>
    </section>
  );
}
