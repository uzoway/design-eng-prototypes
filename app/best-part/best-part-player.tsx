"use client";

import {
  animate,
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

const BEST_PART_START = 96;
const BEST_PART_END = 110;

const GREEN = "#1ed760";

const EASE_OUT = [0.22, 0.72, 0, 1] as const;

const PLAY_LINES = [
  {
    x1: 10,
    y1: 7,
    x2: 10,
    y2: 25,
    opacity: 1,
  },
  {
    x1: 10,
    y1: 7,
    x2: 23,
    y2: 16,
    opacity: 1,
  },
  {
    x1: 23,
    y1: 16,
    x2: 10,
    y2: 25,
    opacity: 1,
  },
];

const PAUSE_LINES = [
  {
    x1: 11,
    y1: 8,
    x2: 11,
    y2: 24,
    opacity: 1,
  },
  {
    x1: 21,
    y1: 8,
    x2: 21,
    y2: 24,
    opacity: 1,
  },
  {
    x1: 16,
    y1: 16,
    x2: 16,
    y2: 16,
    opacity: 0,
  },
];

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
  const lines = playing ? PAUSE_LINES : PLAY_LINES;

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-play-icon>
      {lines.map(function renderLine(line, index) {
        return (
          <motion.line
            key={index}
            initial={false}
            animate={line}
            transition={
              reducedMotion
                ? {
                    duration: 0,
                  }
                : {
                    type: "spring",
                    duration: 0.34,
                    bounce: 0,
                  }
            }
            stroke="currentColor"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

function SavedIcon({ saved }: { saved: boolean }) {
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
          duration: 0.18,
        }}
        strokeWidth="1.8"
      />

      <motion.path
        initial={false}
        animate={{
          opacity: saved ? 1 : 0,
          pathLength: saved ? 1 : 0,
        }}
        transition={{
          duration: 0.24,
          ease: EASE_OUT,
        }}
        d="M10.3 16.1 14.2 20 22 11.6"
        stroke="#000"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <motion.g
        initial={false}
        animate={{
          opacity: saved ? 0 : 1,
        }}
      >
        <path
          d="M16 10v12M10 16h12"
          stroke="#b3b3b3"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </motion.g>
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

  const volumeFrameRef = useRef<number | null>(null);

  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arrivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastTextUpdateRef = useRef(0);

  const [currentTime, setCurrentTime] = useState(INITIAL_TIME);

  const [duration, setDuration] = useState(DURATION);

  const [playing, setPlaying] = useState(false);

  const [scrubbing, setScrubbing] = useState(false);

  const [jumping, setJumping] = useState(false);

  const [bestPartActive, setBestPartActive] = useState(false);

  const [bestPartArrival, setBestPartArrival] = useState(false);

  const [saved, setSaved] = useState(true);

  const [audioError, setAudioError] = useState(false);

  const [canvasAvailable, setCanvasAvailable] = useState(true);

  const progress = useMotionValue(INITIAL_TIME / DURATION);

  const playedWidth = useTransform(progress, function transformProgress(value) {
    return `${value * 100}%`;
  });

  const knobLeft = useTransform(progress, function transformProgress(value) {
    return `${value * 100}%`;
  });

  const bestPartLeft = `${(BEST_PART_START / duration) * 100}%`;

  const bestPartWidth = `${
    ((BEST_PART_END - BEST_PART_START) / duration) * 100
  }%`;

  const remaining = Math.max(0, duration - currentTime);

  const insideBestPart =
    currentTime >= BEST_PART_START && currentTime <= BEST_PART_END;

  function updateVisualTime(seconds: number, forceText = false) {
    const next = clamp(seconds, 0, duration);

    timeRef.current = next;

    progress.set(next / duration);

    const now = performance.now();

    if (forceText || now - lastTextUpdateRef.current >= 70) {
      lastTextUpdateRef.current = now;

      setCurrentTime(next);
    }
  }

  const rampVolume = useCallback(function rampVolume(
    target: number,
    durationMs: number,
  ) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (volumeFrameRef.current) {
      cancelAnimationFrame(volumeFrameRef.current);
    }

    const startVolume = audio.volume;

    const start = performance.now();

    function frame(now: number) {
      const ratio = clamp((now - start) / durationMs, 0, 1);

      const eased = 1 - Math.pow(1 - ratio, 3);

      audio.volume = startVolume + (target - startVolume) * eased;

      if (ratio < 1) {
        volumeFrameRef.current = requestAnimationFrame(frame);
      }
    }

    volumeFrameRef.current = requestAnimationFrame(frame);
  }, []);

  useEffect(
    function initialiseAudio() {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      function metadata() {
        const nextDuration = Number.isFinite(audio.duration)
          ? audio.duration
          : DURATION;

        setDuration(nextDuration);

        audio.currentTime = Math.min(INITIAL_TIME, nextDuration);

        updateVisualTime(audio.currentTime, true);

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

      function handleEnded() {
        setPlaying(false);

        updateVisualTime(duration, true);
      }

      function handleError() {
        setAudioError(true);

        setPlaying(false);
      }

      audio.addEventListener("loadedmetadata", metadata);

      audio.addEventListener("play", handlePlay);

      audio.addEventListener("pause", handlePause);

      audio.addEventListener("ended", handleEnded);

      audio.addEventListener("error", handleError);

      return function cleanup() {
        audio.removeEventListener("loadedmetadata", metadata);

        audio.removeEventListener("play", handlePlay);

        audio.removeEventListener("pause", handlePause);

        audio.removeEventListener("ended", handleEnded);

        audio.removeEventListener("error", handleError);
      };
    },
    [duration],
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
    [playing, duration],
  );

  useEffect(function cleanupTimers() {
    return function cleanup() {
      if (volumeFrameRef.current) {
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

  function seekFromPointer(clientX: number) {
    const rect = trackRectRef.current;

    if (!rect) {
      return;
    }

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

    updateVisualTime(ratio * duration, true);
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

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
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
    let next: number | null = null;

    if (event.key === "ArrowRight") {
      next = timeRef.current + (event.shiftKey ? 1 : 5);
    } else if (event.key === "ArrowLeft") {
      next = timeRef.current - (event.shiftKey ? 1 : 5);
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = duration;
    }

    if (next === null) {
      return;
    }

    event.preventDefault();

    const value = clamp(next, 0, duration);

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

    const target = BEST_PART_START / duration;

    if (reducedMotion) {
      audio.currentTime = BEST_PART_START;

      updateVisualTime(BEST_PART_START, true);

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
        const next = value * duration;

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
      audio.currentTime = BEST_PART_START;

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

          <motion.button
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
            whileTap={
              reducedMotion
                ? undefined
                : {
                    scale: 0.88,
                  }
            }
          >
            <SavedIcon saved={saved} />
          </motion.button>
        </div>

        <div data-bp-scrub-region>
          <div
            ref={trackRef}
            data-bp-track
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
            onKeyDown={handleKeyDown}
          >
            <span data-bp-track-base aria-hidden="true" />

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
                scaleY: bestPartActive || jumping || bestPartArrival ? 1.45 : 1,
                opacity:
                  bestPartActive || jumping || bestPartArrival || insideBestPart
                    ? 1
                    : 0.68,
              }}
              transition={
                reducedMotion
                  ? {
                      duration: 0,
                    }
                  : {
                      type: "spring",
                      duration: 0.32,
                      bounce: 0,
                    }
              }
              aria-hidden="true"
            />

            <motion.span
              data-bp-track-played
              style={{
                width: playedWidth,
              }}
              aria-hidden="true"
            />

            <motion.span
              data-bp-knob
              style={{
                left: knobLeft,
              }}
              animate={{
                scale: scrubbing && !reducedMotion ? 1.2 : 1,
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
                  scale: bestPartArrival && !reducedMotion ? [1, 1.55, 1] : 1,
                }}
                transition={{
                  duration: 0.38,
                  ease: EASE_OUT,
                }}
                aria-hidden="true"
              />

              <span>Best part</span>

              <span data-bp-best-time>· {formatTime(BEST_PART_START)}</span>
            </button>

            <span>-{formatTime(remaining)}</span>
          </div>
        </div>

        <div data-bp-transport>
          <motion.button
            type="button"
            data-bp-play
            onClick={togglePlayback}
            aria-label={playing ? "Pause" : "Play"}
            whileTap={
              reducedMotion
                ? undefined
                : {
                    scale: 0.94,
                  }
            }
          >
            <PlayPauseIcon playing={playing} reducedMotion={reducedMotion} />
          </motion.button>
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
          border-radius: 28px;
          color: #fff;
          background: #0f0f0f;
          box-shadow:
            0 2px 4px
              rgba(
                0,
                0,
                0,
                0.16
              ),
            0 36px 80px -44px
              rgba(
                0,
                0,
                0,
                0.68
              );
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
          object-position:
            center 24%;
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
              rgba(
                  0,
                  0,
                  0,
                  0.02
                )
                52%,
              rgba(
                  0,
                  0,
                  0,
                  0.14
                )
                72%,
              rgba(
                  15,
                  15,
                  15,
                  0.92
                )
                100%
            );
        }

        [data-bp-body] {
          position: relative;
          z-index: 4;
          margin-top: -46px;
          padding:
            0 19px 19px;
        }

        [data-bp-meta] {
          min-width: 0;
          display: grid;
          grid-template-columns:
            52px
            minmax(
              0,
              1fr
            )
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
              rgba(
                0,
                0,
                0,
                0.28
              );
        }

        [data-bp-meta-copy] {
          min-width: 0;
          display: flex;
          flex-direction:
            column;
          gap: 2px;
        }

        [data-bp-title] {
          overflow: hidden;
          color: #fff;
          font-size: 22px;
          font-weight: 710;
          line-height: 1.15;
          letter-spacing:
            -0.027em;
          text-overflow:
            ellipsis;
          white-space: nowrap;
        }

        [data-bp-artist] {
          overflow: hidden;
          color: #b3b3b3;
          font-size: 14.5px;
          font-weight: 430;
          line-height: 1.3;
          text-overflow:
            ellipsis;
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
          background:
            transparent;
          cursor: pointer;
          touch-action:
            manipulation;
          -webkit-tap-highlight-color:
            transparent;
        }

        [data-bp-save] svg {
          width: 28px;
          height: 28px;
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
          -webkit-tap-highlight-color:
            transparent;
        }

        [data-bp-track-base],
        [data-bp-track-played],
        [data-bp-best-range] {
          position: absolute;
          left: 0;
          height: 4px;
          border-radius: 999px;
          pointer-events: none;
          transform-origin:
            center;
        }

        [data-bp-track-base] {
          right: 0;
          background:
            rgba(
              255,
              255,
              255,
              0.29
            );
        }

        [data-bp-best-range] {
          z-index: 2;
          background:
            ${GREEN};
        }

        [data-bp-track-played] {
          z-index: 3;
          background: #fff;
          will-change: width;
        }

        [data-bp-knob] {
          position: absolute;
          z-index: 4;
          top: 50%;
          width: 13px;
          height: 13px;
          margin-top:
            -6.5px;
          margin-left:
            -6.5px;
          border-radius: 50%;
          background: #fff;
          box-shadow:
            0 1px 3px
              rgba(
                0,
                0,
                0,
                0.42
              );
          pointer-events: none;
          will-change:
            left,
            transform;
        }

        [data-bp-track]:focus-visible {
          outline:
            2px solid
            rgba(
              255,
              255,
              255,
              0.95
            );
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
          font-variant-numeric:
            tabular-nums;
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
          margin:
            -6px 0;
          padding:
            0 7px;
          border: 0;
          border-radius: 7px;
          color: #d2d2d2;
          background:
            transparent;
          font-size: 10.5px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          touch-action:
            manipulation;
          transition:
            color 150ms ease,
            background-color
              150ms ease;
        }

        [data-bp-best-indicator] {
          width: 5px;
          height: 5px;
          flex: 0 0 auto;
          border-radius: 50%;
          background:
            ${GREEN};
          transform-origin:
            center;
        }

        [data-bp-best-time] {
          color: #929292;
          font-weight: 510;
        }

        [data-bp-best-action]:hover {
          color: #fff;
          background:
            rgba(
              255,
              255,
              255,
              0.055
            );
        }

        [data-bp-best-action]:focus-visible,
        [data-bp-save]:focus-visible,
        [data-bp-play]:focus-visible {
          outline:
            2px solid
            #fff;
          outline-offset: 2px;
        }

        [data-bp-transport] {
          display: flex;
          justify-content: center;
          margin-top: 17px;
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
          touch-action:
            manipulation;
          box-shadow:
            0 6px 16px -9px
              rgba(
                0,
                0,
                0,
                0.62
              );
          -webkit-tap-highlight-color:
            transparent;
        }

        [data-play-icon] {
          width: 31px;
          height: 31px;
          overflow: visible;
        }

        [data-bp-media-error] {
          margin:
            13px 0 0;
          color: #b3b3b3;
          font-size: 9.5px;
          line-height: 1.5;
          text-align: center;
        }

        [data-bp-media-error]
          code {
          color: #fff;
          font-family:
            var(
              --font-geist-mono
            );
        }

        @media (
          max-width: 520px
        ) {
          [data-bp-player] {
            border-radius: 22px;
          }

          [data-bp-media] {
            height: 410px;
          }

          [data-bp-body] {
            padding-inline: 16px;
          }
        }

        @media (
          hover: hover
        ) and (
          pointer: fine
        ) {
          [data-bp-play]:hover {
            transform:
              scale(1.025);
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          [data-bp-best-action] {
            transition:
              color 150ms ease,
              background-color
                150ms ease;
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
