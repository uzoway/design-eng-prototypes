"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Prototype } from "../../lab/prototypes";
import { MediaFallback, Metadata } from "./project-meta";

const PLAY_LINES = [
  {
    x1: 6,
    y1: 4,
    x2: 6,
    y2: 16,
  },
  {
    x1: 6,
    y1: 4,
    x2: 15.5,
    y2: 10,
  },
  {
    x1: 15.5,
    y1: 10,
    x2: 6,
    y2: 16,
  },
  {
    x1: 10,
    y1: 10,
    x2: 10,
    y2: 10,
    opacity: 0,
  },
];

const PAUSE_LINES = [
  {
    x1: 7,
    y1: 5,
    x2: 7,
    y2: 15,
  },
  {
    x1: 13,
    y1: 5,
    x2: 13,
    y2: 15,
  },
  {
    x1: 10,
    y1: 10,
    x2: 10,
    y2: 10,
    opacity: 0,
  },
  {
    x1: 10,
    y1: 10,
    x2: 10,
    y2: 10,
    opacity: 0,
  },
];

type MorphPlayPauseProps = {
  playing: boolean;
  reducedMotion: boolean;
};

function MorphPlayPause({ playing, reducedMotion }: MorphPlayPauseProps) {
  const lines = playing ? PAUSE_LINES : PLAY_LINES;

  const transition = reducedMotion
    ? {
        duration: 0,
      }
    : {
        type: "spring" as const,
        duration: 0.34,
        bounce: 0,
      };

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
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
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

type PrototypeVideoProps = {
  slug: string;
  title: string;
};

function PrototypeVideo({ slug, title }: PrototypeVideoProps) {
  const reducedMotion = Boolean(useReducedMotion());

  const containerRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const manualPauseRef = useRef(false);

  const [visible, setVisible] = useState(false);

  const [playing, setPlaying] = useState(false);

  const [failed, setFailed] = useState(false);

  useEffect(function observeVideo() {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      function handleIntersection(entries) {
        const [entry] = entries;

        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.45);
      },
      {
        threshold: [0, 0.45, 0.8],
      },
    );

    observer.observe(container);

    return function cleanup() {
      observer.disconnect();
    };
  }, []);

  useEffect(
    function syncPlayback() {
      const video = videoRef.current;

      if (!video || failed) {
        return;
      }

      if (reducedMotion || !visible || manualPauseRef.current) {
        video.pause();

        return;
      }

      video.play().catch(function handleError() {
        setPlaying(false);
      });
    },
    [failed, reducedMotion, visible],
  );

  function togglePlayback() {
    const video = videoRef.current;

    if (!video || failed) {
      return;
    }

    if (video.paused) {
      manualPauseRef.current = false;

      video.play().catch(function handleError() {
        setPlaying(false);
      });

      return;
    }

    manualPauseRef.current = true;

    video.pause();
  }

  return (
    <div
      ref={containerRef}
      className="group/video relative aspect-video overflow-hidden rounded-[16px] border border-black/[0.045] bg-[#e9e9e6] transition-[box-shadow,border-color] duration-300 hover:border-black/[0.08] hover:shadow-[0_12px_40px_-28px_rgba(0,0,0,.32)]"
    >
      {!failed && (
        <video
          ref={videoRef}
          src={`/portfolio/lab/${slug}/preview.mp4`}
          poster={`/portfolio/lab/${slug}/poster.webp`}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onError={function handleError() {
            setFailed(true);
          }}
          onPlay={function handlePlay() {
            setPlaying(true);
          }}
          onPause={function handlePause() {
            setPlaying(false);
          }}
          className="block h-full w-full object-cover"
        />
      )}

      {failed && <MediaFallback label={`${slug}/preview.mp4`} />}

      {!failed && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={
            playing ? `Pause ${title} preview` : `Play ${title} preview`
          }
          className="absolute bottom-3 right-3 grid size-11 cursor-pointer place-items-center rounded-full border border-black/[0.07] bg-white/82 text-black/65 shadow-[0_2px_5px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.08)] backdrop-blur-xl transition-[background-color,box-shadow,transform] duration-200 hover:bg-white hover:shadow-[0_3px_8px_rgba(0,0,0,.08),0_10px_28px_rgba(0,0,0,.1)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#e9e9e6] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <MorphPlayPause playing={playing} reducedMotion={reducedMotion} />
        </button>
      )}
    </div>
  );
}

type LabProjectProps = {
  prototype: Prototype;
  // The prototype's place in the full, newest-first list, so its number is
  // the same wherever the card appears.
  index: number;
};

export function LabProject({ prototype, index }: LabProjectProps) {
  return (
    <article>
      <PrototypeVideo slug={prototype.slug} title={prototype.title} />

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span
              aria-hidden="true"
              className="text-[10px] tabular-nums text-[#747470]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <Link
              href={prototype.href ?? `/${prototype.slug}`}
              className="rounded-sm text-[15px] font-medium tracking-[-0.025em] text-[#111] transition-opacity hover:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-3 focus-visible:ring-offset-[#f4f4f1]"
            >
              {prototype.title}
            </Link>
          </div>

          <Metadata disciplines={prototype.disciplines} />
        </div>

        <p className="ml-[29px] mt-2 max-w-[470px] text-[12.5px] leading-[1.65] text-[#5f5f5b]">
          {prototype.description}
        </p>
      </div>
    </article>
  );
}
