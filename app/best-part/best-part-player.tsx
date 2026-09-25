"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent } from "react";

const AUDIO_SRC = "/spotify/sirens.mp3";
const CANVAS_SRC = "/spotify/sirens-canvas.mp4";
const ARTWORK_SRC = "/spotify/odyssey-sirens.jpg";

const DURATION = 159;
const INITIAL_TIME = 41;
const BEST_PART_START = 96;
const BEST_PART_END = 110;
const GREEN = "#1ed760";

const EASE_OUT = [0.22, 0.72, 0, 1] as const;
const ICON_FROM = { opacity: 0, scale: 0.25, filter: "blur(4px)" };
const ICON_TO = { opacity: 1, scale: 1, filter: "blur(0px)" };

// Spotify Encore icon paths (16×16), used for the side transport controls.
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

function iconTransition(reducedMotion: boolean) {
  return reducedMotion
    ? { duration: 0.12, ease: "linear" as const }
    : { type: "spring" as const, duration: 0.3, bounce: 0 };
}

function PlayPauseIcon({
  playing,
  reducedMotion,
}: {
  playing: boolean;
  reducedMotion: boolean;
}) {
  const hidden = reducedMotion ? { opacity: 0 } : ICON_FROM;

  return (
    <span data-bp-icon-stack aria-hidden="true">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.svg
          key={playing ? "pause" : "play"}
          viewBox="0 0 32 32"
          focusable="false"
          initial={hidden}
          animate={ICON_TO}
          exit={hidden}
          transition={iconTransition(reducedMotion)}
        >
          {playing ? (
            <>
              <rect x="9.5" y="8" width="4.75" height="16" rx="2.1" />
              <rect x="17.75" y="8" width="4.75" height="16" rx="2.1" />
            </>
          ) : (
            <path d="M11.7 8.35c0-1.12 1.23-1.8 2.18-1.2l12.02 7.65a1.42 1.42 0 010 2.4l-12.02 7.65c-.95.6-2.18-.08-2.18-1.2V8.35z" />
          )}
        </motion.svg>
      </AnimatePresence>
    </span>
  );
}

function SavedIcon({
  saved,
  reducedMotion,
}: {
  saved: boolean;
  reducedMotion: boolean;
}) {
  const hidden = reducedMotion ? { opacity: 0 } : ICON_FROM;

  return (
    <span data-bp-saved-icon aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <motion.circle
          cx="16"
          cy="16"
          r="13.5"
          initial={false}
          animate={{
            fill: saved ? GREEN : "rgba(255,255,255,0)",
            stroke: saved ? GREEN : "#b3b3b3",
          }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
          strokeWidth="1.7"
        />
      </svg>

      <AnimatePresence initial={false} mode="popLayout">
        <motion.svg
          key={saved ? "saved" : "add"}
          viewBox="0 0 32 32"
          focusable="false"
          initial={hidden}
          animate={ICON_TO}
          exit={hidden}
          transition={iconTransition(reducedMotion)}
        >
          {saved ? (
            <path
              d="M10.4 16.4l3.75 3.75 7.65-8.3"
              fill="none"
              stroke="#000"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M16 10.25v11.5M10.25 16h11.5"
              fill="none"
              stroke="#b3b3b3"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
          )}
        </motion.svg>
      </AnimatePresence>
    </span>
  );
}

export function BestPartPlayer() {
  const reducedMotion = Boolean(useReducedMotion());
  const titleId = useId();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const trackRectRef = useRef<DOMRect | null>(null);
  const scrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const jumpingRef = useRef(false);
  const timeRef = useRef(INITIAL_TIME);
  const volumeFrameRef = useRef<number | null>(null);
  const jumpAnimationRef = useRef<{ stop: () => void } | null>(null);
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
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [hovering, setHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(INITIAL_TIME);
  const [audioError, setAudioError] = useState(false);
  const [canvasAvailable, setCanvasAvailable] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  const progress = useMotionValue(INITIAL_TIME / DURATION);
  const hoverRatio = useMotionValue(INITIAL_TIME / DURATION);
  const hoverLeft = useTransform(hoverRatio, (value) => {
    return `${clamp(value, 0.07, 0.93) * 100}%`;
  });
  const knobLeft = useTransform(progress, (value) => `${value * 100}%`);

  const safeDuration = Math.max(duration, 1);
  const bestPartLeft = `${(BEST_PART_START / safeDuration) * 100}%`;
  const bestPartWidth = `${
    ((BEST_PART_END - BEST_PART_START) / safeDuration) * 100
  }%`;
  const remaining = Math.max(0, duration - currentTime);
  const insideBestPart =
    currentTime >= BEST_PART_START && currentTime <= BEST_PART_END;
  const bestPartEmphasized =
    bestPartActive || jumping || bestPartArrival || insideBestPart;

  const updateVisualTime = useCallback(
    function updateVisualTime(seconds: number, forceText = false) {
      const next = clamp(seconds, 0, duration);

      timeRef.current = next;
      progress.set(next / Math.max(duration, 1));

      const now = performance.now();

      if (forceText || now - lastTextUpdateRef.current >= 70) {
        lastTextUpdateRef.current = now;
        setCurrentTime(next);
      }
    },
    [duration, progress],
  );

  const rampVolume = useCallback(function rampVolume(
    target: number,
    durationMs: number,
  ) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const media = audio;

    if (volumeFrameRef.current !== null) {
      cancelAnimationFrame(volumeFrameRef.current);
    }

    const startVolume = media.volume;
    const start = performance.now();

    function frame(now: number) {
      const ratio = clamp((now - start) / durationMs, 0, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);

      media.volume = startVolume + (target - startVolume) * eased;

      if (ratio < 1) {
        volumeFrameRef.current = requestAnimationFrame(frame);
      } else {
        media.volume = target;
        volumeFrameRef.current = null;
      }
    }

    volumeFrameRef.current = requestAnimationFrame(frame);
  }, []);

  const cancelBestPartJump = useCallback(
    function cancelBestPartJump(syncToAudio = true) {
      const hadActiveJump =
        jumpingRef.current ||
        jumpAnimationRef.current !== null ||
        jumpTimerRef.current !== null;

      if (!hadActiveJump) {
        return;
      }

      jumpAnimationRef.current?.stop();
      jumpAnimationRef.current = null;

      if (jumpTimerRef.current !== null) {
        clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = null;
      }

      jumpingRef.current = false;
      setJumping(false);

      const audio = audioRef.current;

      if (syncToAudio && audio) {
        updateVisualTime(audio.currentTime, true);
      }

      rampVolume(1, 100);
    },
    [rampVolume, updateVisualTime],
  );

  useEffect(
    function initialiseAudio() {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      const media = audio;

      function handleMetadata() {
        const nextDuration =
          Number.isFinite(media.duration) && media.duration > 0
            ? media.duration
            : DURATION;
        const nextTime = Math.min(INITIAL_TIME, nextDuration);

        setDuration(nextDuration);
        media.currentTime = nextTime;
        timeRef.current = nextTime;
        progress.set(nextTime / nextDuration);
        setCurrentTime(nextTime);
        setAudioError(false);
      }

      function handlePlay() {
        setPlaying(true);
        void videoRef.current?.play().catch(function ignoreVideoError() {});
      }

      function handlePause() {
        setPlaying(false);
        videoRef.current?.pause();
      }

      function handleEnded() {
        setPlaying(false);
        const endTime = Number.isFinite(media.duration)
          ? media.duration
          : DURATION;
        timeRef.current = endTime;
        progress.set(1);
        setCurrentTime(endTime);
      }

      function handleError() {
        setAudioError(true);
        setPlaying(false);
        setStatusMessage(
          "Audio unavailable. Add the local Sirens audio file to play this prototype.",
        );
      }

      media.addEventListener("loadedmetadata", handleMetadata);
      media.addEventListener("play", handlePlay);
      media.addEventListener("pause", handlePause);
      media.addEventListener("ended", handleEnded);
      media.addEventListener("error", handleError);

      return function cleanup() {
        media.removeEventListener("loadedmetadata", handleMetadata);
        media.removeEventListener("play", handlePlay);
        media.removeEventListener("pause", handlePause);
        media.removeEventListener("ended", handleEnded);
        media.removeEventListener("error", handleError);
      };
    },
    [progress],
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

  useEffect(function cleanupMotion() {
    return function cleanup() {
      jumpAnimationRef.current?.stop();

      if (volumeFrameRef.current !== null) {
        cancelAnimationFrame(volumeFrameRef.current);
      }

      if (jumpTimerRef.current !== null) {
        clearTimeout(jumpTimerRef.current);
      }

      if (arrivalTimerRef.current !== null) {
        clearTimeout(arrivalTimerRef.current);
      }
    };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;

    if (!audio || audioError) {
      return;
    }

    cancelBestPartJump();

    if (audio.currentTime >= duration - 0.1) {
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

  function beginScrub(event: PointerEvent<HTMLInputElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const audio = audioRef.current;

    if (!audio || audioError) {
      return;
    }

    cancelBestPartJump();
    wasPlayingRef.current = !audio.paused;
    scrubbingRef.current = true;
    setScrubbing(true);
    audio.pause();
  }

  function changePlaybackPosition(event: ChangeEvent<HTMLInputElement>) {
    const next = Number(event.currentTarget.value);

    updateVisualTime(next, true);

    if (!scrubbingRef.current && audioRef.current) {
      audioRef.current.currentTime = next;
    }
  }

  function endScrub() {
    if (!scrubbingRef.current) {
      return;
    }

    const audio = audioRef.current;

    scrubbingRef.current = false;
    setScrubbing(false);

    if (!audio) {
      return;
    }

    audio.currentTime = timeRef.current;

    if (wasPlayingRef.current) {
      void audio.play().catch(function ignorePlayError() {});
    }
  }

  function updateHover(clientX: number) {
    const rect =
      trackRectRef.current ?? trackRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const now = performance.now();

    hoverRatio.set(ratio);

    if (now - lastHoverUpdateRef.current >= 50) {
      lastHoverUpdateRef.current = now;
      setHoverTime(ratio * duration);
    }
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
  }

  function restart() {
    cancelBestPartJump(false);
    updateVisualTime(0, true);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }

  function skipToEnd() {
    cancelBestPartJump(false);
    updateVisualTime(duration, true);

    if (audioRef.current) {
      audioRef.current.currentTime = duration;
    }
  }

  function cycleRepeat() {
    setRepeatMode((current) => {
      if (current === "off") {
        return "all";
      }

      if (current === "all") {
        return "one";
      }

      return "off";
    });
  }

  function markBestPartArrival() {
    setBestPartArrival(true);
    setStatusMessage(`Playing Best part at ${formatTime(BEST_PART_START)}.`);

    if (arrivalTimerRef.current !== null) {
      clearTimeout(arrivalTimerRef.current);
    }

    arrivalTimerRef.current = setTimeout(function settleArrival() {
      setBestPartArrival(false);
      arrivalTimerRef.current = null;
    }, 420);
  }

  async function skipToBestPart() {
    const audio = audioRef.current;

    if (!audio || audioError) {
      return;
    }

    cancelBestPartJump();
    setStatusMessage("");
    setBestPartArrival(false);

    if (reducedMotion) {
      audio.currentTime = BEST_PART_START;
      updateVisualTime(BEST_PART_START, true);
      await audio.play().catch(function ignorePlayError() {});
      markBestPartArrival();
      return;
    }

    jumpingRef.current = true;
    setJumping(true);
    rampVolume(0.08, 100);

    const target = BEST_PART_START / safeDuration;
    const controls = animate(progress, target, {
      duration: 0.4,
      ease: EASE_OUT,
      onUpdate(value) {
        const next = value * duration;
        const now = performance.now();

        timeRef.current = next;

        if (now - lastTextUpdateRef.current >= 40) {
          lastTextUpdateRef.current = now;
          setCurrentTime(next);
        }
      },
      onComplete() {
        jumpAnimationRef.current = null;
        jumpingRef.current = false;
        setJumping(false);
        updateVisualTime(audio.currentTime, true);
        markBestPartArrival();
      },
    });

    jumpAnimationRef.current = controls;
    jumpTimerRef.current = setTimeout(function commitBestPartSeek() {
      jumpTimerRef.current = null;
      audio.currentTime = BEST_PART_START;
      audio.volume = 0.08;

      void audio
        .play()
        .then(function restoreAudio() {
          rampVolume(1, 210);
        })
        .catch(function ignorePlayError() {});
    }, 130);
  }

  const repeatLabel =
    repeatMode === "off"
      ? "Enable repeat"
      : repeatMode === "all"
        ? "Enable repeat one"
        : "Disable repeat";

  return (
    <section
      data-bp-player
      data-playing={playing ? "true" : "false"}
      data-scrubbing={scrubbing ? "true" : "false"}
      aria-labelledby={titleId}
    >
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="metadata"
        loop={repeatMode !== "off"}
      />

      <span className="sr-only" role="status" aria-atomic="true">
        {statusMessage}
      </span>

      <div data-bp-media>
        <img
          src={ARTWORK_SRC}
          alt=""
          draggable={false}
          decoding="async"
          data-bp-media-fallback
        />

        {canvasAvailable && !reducedMotion && (
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
          <img
            src={ARTWORK_SRC}
            alt=""
            draggable={false}
            decoding="async"
            data-bp-thumbnail
          />

          <div data-bp-meta-copy>
            <h2 id={titleId} data-bp-title>
              Sirens
            </h2>
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
              setSaved((current) => !current);
            }}
          >
            <SavedIcon saved={saved} reducedMotion={reducedMotion} />
          </button>
        </div>

        <div data-bp-scrub-region>
          <div
            ref={trackRef}
            data-bp-track
            onPointerEnter={handleTrackPointerEnter}
            onPointerMove={handleTrackPointerMove}
            onPointerLeave={function hideHoverTime() {
              setHovering(false);
            }}
          >
            <AnimatePresence initial={false}>
              {hovering && !scrubbing && (
                <motion.span
                  data-bp-hover-time
                  style={{ left: hoverLeft, x: "-50%" }}
                  initial={
                    reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  transition={{
                    duration: reducedMotion ? 0.1 : 0.14,
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
              style={{ scaleX: progress }}
              aria-hidden="true"
            />

            <motion.span
              data-bp-best-range
              data-active={bestPartEmphasized ? "true" : "false"}
              style={{ left: bestPartLeft, width: bestPartWidth }}
              animate={{
                scaleY: bestPartActive || jumping || bestPartArrival ? 1.35 : 1,
                opacity: bestPartEmphasized ? 1 : 0.68,
              }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: "spring", duration: 0.3, bounce: 0 }
              }
              aria-hidden="true"
            />

            <motion.span
              data-bp-knob
              style={{ left: knobLeft }}
              animate={{ scale: scrubbing && !reducedMotion ? 1.16 : 1 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: "spring", duration: 0.3, bounce: 0 }
              }
              aria-hidden="true"
            />

            <input
              type="range"
              min={0}
              max={Math.max(0, Math.round(duration))}
              step={1}
              value={clamp(Math.round(currentTime), 0, Math.round(duration))}
              data-bp-range
              aria-label="Playback position"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
              disabled={audioError}
              onChange={changePlaybackPosition}
              onPointerDown={beginScrub}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
              onLostPointerCapture={endScrub}
              onBlur={endScrub}
            />
          </div>

          <div data-bp-times>
            <span>{formatTime(currentTime)}</span>

            <button
              type="button"
              data-bp-best-action
              aria-label={`Play Best part at ${formatTime(BEST_PART_START)}`}
              aria-busy={jumping}
              disabled={audioError}
              onClick={skipToBestPart}
              onPointerEnter={function activateBestPart(event) {
                if (event.pointerType !== "touch") {
                  setBestPartActive(true);
                }
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
            >
              <motion.span
                data-bp-best-indicator
                animate={{
                  scale: bestPartArrival && !reducedMotion ? 1.25 : 1,
                }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                aria-hidden="true"
              />
              <span>Best part</span>
              <span data-bp-best-time>· {formatTime(BEST_PART_START)}</span>
            </button>

            <span>-{formatTime(remaining)}</span>
          </div>
        </div>

        <div data-bp-transport role="group" aria-label="Playback controls">
          <button
            type="button"
            data-bp-tp
            data-active={shuffle ? "true" : "false"}
            aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
            aria-pressed={shuffle}
            onClick={function toggleShuffle() {
              setShuffle((current) => !current);
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
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
            aria-label="Restart track"
            disabled={audioError}
            onClick={restart}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d={PREV_PATH} fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            data-bp-play
            onClick={togglePlayback}
            aria-label={playing ? "Pause" : "Play"}
            disabled={audioError}
          >
            <PlayPauseIcon playing={playing} reducedMotion={reducedMotion} />
          </button>

          <button
            type="button"
            data-bp-tp
            data-strong="true"
            aria-label="Skip to end"
            disabled={audioError}
            onClick={skipToEnd}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d={NEXT_PATH} fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            data-bp-tp
            data-active={repeatMode !== "off" ? "true" : "false"}
            aria-label={repeatLabel}
            aria-pressed={repeatMode !== "off"}
            onClick={cycleRepeat}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d={REPEAT_PATH} fill="currentColor" />
              {repeatMode === "one" && (
                <text
                  x="8"
                  y="9.6"
                  textAnchor="middle"
                  fontSize="6.2"
                  fontWeight="700"
                  fill="currentColor"
                >
                  1
                </text>
              )}
            </svg>
            <span
              data-bp-tp-dot
              data-visible={repeatMode !== "off" ? "true" : "false"}
              aria-hidden="true"
            />
          </button>
        </div>

        {audioError && (
          <p data-bp-media-error>
            Add <code>/public/spotify/sirens.mp3</code> to enable audio.
          </p>
        )}
      </div>

      <style>{`
        [data-bp-player] {
          position: relative;
          width: min(392px, calc(100vw - 32px));
          overflow: hidden;
          border-radius: 28px;
          color: #fff;
          background: #0f0f0f;
          box-shadow:
            0 0 0 1px rgb(255 255 255 / 0.08),
            0 2px 4px rgb(0 0 0 / 0.16),
            0 36px 80px -44px rgb(0 0 0 / 0.68);
          isolation: isolate;
        }

        [data-bp-player] button,
        [data-bp-range] {
          -webkit-tap-highlight-color: transparent;
        }

        [data-bp-player] button {
          font: inherit;
        }

        [data-bp-media] {
          position: relative;
          height: clamp(340px, 55svh, 430px);
          overflow: hidden;
          background: #182933;
          user-select: none;
          -webkit-user-select: none;
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
          background: linear-gradient(
            to bottom,
            rgb(0 0 0 / 0.02) 52%,
            rgb(0 0 0 / 0.14) 72%,
            rgb(15 15 15 / 0.92) 100%
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
          grid-template-columns: 52px minmax(0, 1fr) 44px;
          align-items: center;
          gap: 12px;
        }

        [data-bp-thumbnail] {
          width: 52px;
          height: 52px;
          display: block;
          border-radius: 6px;
          object-fit: cover;
          outline: 1px solid oklch(1 0 0 / 0.1);
          outline-offset: -1px;
          box-shadow: 0 3px 10px rgb(0 0 0 / 0.28);
        }

        [data-bp-meta-copy] {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        [data-bp-title] {
          margin: 0;
          overflow: hidden;
          color: #fff;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.027em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        [data-bp-artist] {
          overflow: hidden;
          color: #b3b3b3;
          font-size: 14px;
          font-weight: 430;
          line-height: 1.3;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        [data-bp-save],
        [data-bp-tp],
        [data-bp-play] {
          display: grid;
          place-items: center;
          margin: 0;
          padding: 0;
          border: 0;
          cursor: pointer;
          touch-action: manipulation;
          transition-property: color, background-color, scale, opacity;
          transition-duration: 120ms;
          transition-timing-function: ease-out;
          user-select: none;
          -webkit-user-select: none;
        }

        [data-bp-save] {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: #b3b3b3;
          background: transparent;
        }

        [data-bp-saved-icon] {
          position: relative;
          width: 28px;
          height: 28px;
          display: block;
        }

        [data-bp-saved-icon] > svg,
        [data-bp-icon-stack] > svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
        }

        [data-bp-scrub-region] {
          margin-top: 23px;
        }

        [data-bp-track] {
          position: relative;
          height: 36px;
          display: flex;
          align-items: center;
          border-radius: 6px;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }

        [data-bp-track-base],
        [data-bp-track-played],
        [data-bp-best-range] {
          position: absolute;
          inset-inline: 0;
          height: 4px;
          border-radius: 999px;
          pointer-events: none;
          transform-origin: left center;
        }

        [data-bp-track-base] {
          background: rgb(255 255 255 / 0.29);
        }

        [data-bp-track-played] {
          z-index: 2;
          background: #fff;
          will-change: transform;
        }

        [data-bp-best-range] {
          z-index: 3;
          inset-inline: auto;
          background: ${GREEN};
          transform-origin: center;
        }

        [data-bp-knob] {
          position: absolute;
          z-index: 4;
          top: 50%;
          width: 13px;
          height: 13px;
          margin-top: -6.5px;
          margin-left: -6.5px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgb(0 0 0 / 0.42);
          pointer-events: none;
        }

        [data-bp-range] {
          position: absolute;
          z-index: 5;
          inset: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          opacity: 0;
          cursor: pointer;
          touch-action: none;
        }

        [data-bp-track]:focus-within {
          outline: 2px solid rgb(255 255 255 / 0.95);
          outline-offset: 2px;
        }

        [data-bp-hover-time] {
          position: absolute;
          z-index: 6;
          bottom: calc(50% + 13px);
          padding: 5px 8px;
          border-radius: 8px;
          color: #fff;
          background: #000;
          box-shadow: 0 6px 16px -6px rgb(0 0 0 / 0.7);
          font-size: 11px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          white-space: nowrap;
          pointer-events: none;
        }

        [data-bp-times] {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          margin-top: 0;
          color: #b3b3b3;
          font-size: 12px;
          font-weight: 510;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        [data-bp-times] > span:last-child {
          text-align: end;
        }

        [data-bp-best-action] {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin: -8px 0;
          padding-inline: 8px;
          border: 0;
          border-radius: 8px;
          color: #d2d2d2;
          background: transparent;
          font: inherit;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          touch-action: manipulation;
          transition-property: color, background-color;
          transition-duration: 120ms;
          transition-timing-function: ease-out;
          -webkit-tap-highlight-color: transparent;
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

        [data-bp-transport] {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 15px;
          padding-inline: 2px;
        }

        [data-bp-tp] {
          position: relative;
          width: 44px;
          height: 44px;
          background: transparent;
          color: #b3b3b3;
        }

        [data-bp-tp] svg {
          width: 18px;
          height: 18px;
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

        [data-bp-tp-dot] {
          position: absolute;
          bottom: 5px;
          left: 50%;
          width: 4px;
          height: 4px;
          translate: -50% 0;
          scale: 0.25;
          opacity: 0;
          border-radius: 50%;
          background: ${GREEN};
          pointer-events: none;
          transition-property: scale, opacity;
          transition-duration: 150ms;
          transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
        }

        [data-bp-tp-dot][data-visible="true"] {
          scale: 1;
          opacity: 1;
        }

        [data-bp-play] {
          width: 66px;
          height: 66px;
          border-radius: 50%;
          color: #000;
          background: #fff;
          box-shadow: 0 6px 16px -9px rgb(0 0 0 / 0.62);
        }

        [data-bp-icon-stack] {
          position: relative;
          width: 31px;
          height: 31px;
          display: block;
        }

        [data-bp-icon-stack] svg {
          fill: currentColor;
        }

        [data-bp-save]:active,
        [data-bp-tp]:active,
        [data-bp-play]:active {
          scale: 0.96;
        }

        [data-bp-player] button:disabled,
        [data-bp-range]:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        [data-bp-player] button:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 2px;
        }

        [data-bp-media-error] {
          margin: 13px 0 0;
          color: #b3b3b3;
          font-size: 12px;
          line-height: 1.45;
          text-align: center;
          text-wrap: pretty;
        }

        [data-bp-media-error] code {
          color: #fff;
          font-family: var(--font-geist-mono), ui-monospace, monospace;
        }

        @media (hover: hover) and (pointer: fine) {
          [data-bp-best-action]:hover:not(:disabled) {
            color: #fff;
            background: rgb(255 255 255 / 0.055);
          }

          [data-bp-save]:hover:not(:disabled),
          [data-bp-tp]:hover:not([data-active="true"]):not(:disabled) {
            color: #fff;
          }

          [data-bp-play]:hover:not(:disabled) {
            scale: 1.025;
          }

          [data-bp-play]:hover:not(:disabled):active {
            scale: 0.96;
          }
        }

        @media (max-width: 32.5rem) {
          [data-bp-player] {
            border-radius: 22px;
          }

          [data-bp-body] {
            padding-inline: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-bp-save],
          [data-bp-tp],
          [data-bp-play],
          [data-bp-tp-dot] {
            transition-duration: 0.01ms;
          }
        }

        @media (prefers-contrast: more) {
          [data-bp-player] {
            box-shadow: 0 0 0 2px #fff;
          }

          [data-bp-track-base] {
            background: rgb(255 255 255 / 0.55);
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

          [data-bp-play] {
            border: 1px solid ButtonText;
          }

          [data-bp-player] button:focus-visible,
          [data-bp-track]:focus-within {
            outline-color: Highlight;
          }
        }
      `}</style>
    </section>
  );
}
