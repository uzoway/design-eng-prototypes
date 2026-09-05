"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const VIEWBOX = 14;
const CENTER = VIEWBOX / 2;
const STROKE_WIDTH = 1.5;
const COLLAPSED_LINE = {
  x1: CENTER,
  y1: CENTER,
  x2: CENTER,
  y2: CENTER,
  opacity: 0,
};

const CORE_STUDIES = [
  {
    name: "Cursor",
    states: [
      {
        label: "Pointer",
        lines: [
          { x1: 4, y1: 2.3, x2: 4, y2: 11.5 },
          { x1: 4, y1: 2.3, x2: 10.5, y2: 7.9 },
          { x1: 10.5, y1: 7.9, x2: 7.2, y2: 8.7 },
          { x1: 7.2, y1: 8.7, x2: 4, y2: 11.5 },
        ],
      },
      {
        label: "Text",
        lines: [
          { x1: 7, y1: 2.3, x2: 7, y2: 11.7 },
          { x1: 4.7, y1: 2.3, x2: 9.3, y2: 2.3 },
          { x1: 4.7, y1: 11.7, x2: 9.3, y2: 11.7 },
          { ...COLLAPSED_LINE },
        ],
      },
      {
        label: "Crosshair",
        lines: [
          { x1: 7, y1: 1.7, x2: 7, y2: 5.1 },
          { x1: 8.9, y1: 7, x2: 12.3, y2: 7 },
          { x1: 7, y1: 8.9, x2: 7, y2: 12.3 },
          { x1: 5.1, y1: 7, x2: 1.7, y2: 7 },
        ],
      },
    ],
  },
  {
    name: "Share",
    states: [
      {
        label: "Share",
        paths: [
          {
            d: "M 2.2 7.6 L 2.2 9.8 Q 2.2 11.4 3.8 11.4 L 10.2 11.4 Q 11.8 11.4 11.8 9.8 L 11.8 7.6",
          },
        ],
        lines: [
          { x1: 7, y1: 8.2, x2: 7, y2: 1.7 },
          { x1: 4.6, y1: 4.1, x2: 7, y2: 1.7 },
          { x1: 9.4, y1: 4.1, x2: 7, y2: 1.7 },
        ],
      },
      {
        label: "Shared",
        paths: [
          {
            d: "M 2.2 7.6 L 2.2 9.8 Q 2.2 11.4 3.8 11.4 L 10.2 11.4 Q 11.8 11.4 11.8 9.8 L 11.8 7.6",
          },
        ],
        lines: [
          { x1: 3.7, y1: 6.8, x2: 6.1, y2: 9.2 },
          { x1: 6.1, y1: 9.2, x2: 10.5, y2: 4.8 },
          { ...COLLAPSED_LINE },
        ],
      },
    ],
  },
  {
    name: "Pinned summary",
    states: [
      {
        label: "Summary",
        paths: [
          {
            d: "M 2.8 4.5 L 2.81 4.5 M 5 4.5 L 11.2 4.5 M 2.8 9.5 L 2.81 9.5 M 5 9.5 L 9.4 9.5",
          },
        ],
        lines: [{ ...COLLAPSED_LINE }],
      },
      {
        label: "Pinned",
        paths: [
          {
            d: "M 4.4 3.1 L 9.6 3.1 M 5.2 3.1 L 5.2 6.6 M 8.8 3.1 L 8.8 6.6 M 4.4 6.6 L 9.6 6.6",
          },
        ],
        lines: [{ x1: 7, y1: 6.6, x2: 7, y2: 11.3 }],
      },
    ],
  },
  {
    name: "Trust",
    states: [
      {
        label: "Pending",
        lines: [
          { x1: 3.1, y1: 7, x2: 3.11, y2: 7 },
          { x1: 7, y1: 7, x2: 7.01, y2: 7 },
          { x1: 10.9, y1: 7, x2: 10.91, y2: 7 },
        ],
      },
      {
        label: "Verified",
        lines: [
          { x1: 2.5, y1: 7.2, x2: 5.5, y2: 10.2 },
          { x1: 5.5, y1: 10.2, x2: 11.6, y2: 4.1 },
          { ...COLLAPSED_LINE },
        ],
      },
      {
        label: "Flagged",
        lines: [
          { x1: 3.3, y1: 3.3, x2: 10.7, y2: 10.7 },
          { x1: 10.7, y1: 3.3, x2: 3.3, y2: 10.7 },
          { ...COLLAPSED_LINE },
        ],
      },
    ],
  },
  {
    name: "Sort",
    states: [
      {
        label: "Ascending",
        lines: [
          { x1: 3, y1: 10.5, x2: 5.5, y2: 10.5 },
          { x1: 3, y1: 7, x2: 8, y2: 7 },
          { x1: 3, y1: 3.5, x2: 11, y2: 3.5 },
        ],
      },
      {
        label: "Descending",
        lines: [
          { x1: 3, y1: 3.5, x2: 5.5, y2: 3.5 },
          { x1: 3, y1: 7, x2: 8, y2: 7 },
          { x1: 3, y1: 10.5, x2: 11, y2: 10.5 },
        ],
      },
      {
        label: "Unsorted",
        lines: [
          { x1: 3, y1: 3.5, x2: 11, y2: 3.5 },
          { x1: 3, y1: 7, x2: 11, y2: 7 },
          { x1: 3, y1: 10.5, x2: 11, y2: 10.5 },
        ],
      },
    ],
  },
];

const CANDIDATE_STUDIES = [
  {
    name: "Security",
    states: [
      {
        label: "Locked",
        paths: [
          {
            d: "M 4 5.7 L 10 5.7 Q 10.8 5.7 10.8 6.5 L 10.8 10.7 Q 10.8 11.5 10 11.5 L 4 11.5 Q 3.2 11.5 3.2 10.7 L 3.2 6.5 Q 3.2 5.7 4 5.7",
          },
          {
            d: "M 4.8 5.7 L 4.8 4.5 Q 4.8 2.4 7 2.4 Q 9.2 2.4 9.2 4.5 L 9.2 5.7",
          },
        ],
        lines: [{ x1: 7, y1: 8.1, x2: 7, y2: 9.4 }],
      },
      {
        label: "Unlocked",
        paths: [
          {
            d: "M 4 5.7 L 10 5.7 Q 10.8 5.7 10.8 6.5 L 10.8 10.7 Q 10.8 11.5 10 11.5 L 4 11.5 Q 3.2 11.5 3.2 10.7 L 3.2 6.5 Q 3.2 5.7 4 5.7",
          },
          {
            d: "M 4.8 5.7 L 4.8 4.5 Q 4.8 2.4 7 2.4 Q 10.5 2.4 10.5 3.4 L 10.5 3.4",
          },
        ],
        lines: [{ x1: 7, y1: 8.1, x2: 7, y2: 9.4 }],
      },
    ],
  },
  {
    name: "Search",
    states: [
      {
        label: "Search",
        paths: [
          {
            d: "M 6.2 2.4 C 8.4 2.4 10.2 4.2 10.2 6.4 C 10.2 8.6 8.4 10.4 6.2 10.4 C 4 10.4 2.2 8.6 2.2 6.4 C 2.2 4.2 4 2.4 6.2 2.4",
          },
        ],
        lines: [{ x1: 9.2, y1: 9.4, x2: 11.7, y2: 11.8 }],
      },
      {
        label: "Close",
        paths: [
          {
            d: "M 3.2 3.2 C 5.7 5.7 8.2 8.2 10.8 10.8 C 10.8 10.8 10.8 10.8 10.8 10.8 C 10.8 10.8 10.8 10.8 10.8 10.8 C 10.8 10.8 10.8 10.8 10.8 10.8",
          },
        ],
        lines: [{ x1: 10.8, y1: 3.2, x2: 3.2, y2: 10.8 }],
      },
    ],
  },
  {
    name: "Analytics",
    states: [
      {
        label: "Bars",
        lines: [
          { x1: 3, y1: 10.7, x2: 3, y2: 7.8 },
          { x1: 6.2, y1: 10.7, x2: 6.2, y2: 5.4 },
          { x1: 9.4, y1: 10.7, x2: 9.4, y2: 3 },
          { x1: 2.2, y1: 11.3, x2: 11.7, y2: 11.3 },
          { ...COLLAPSED_LINE },
        ],
      },
      {
        label: "Trend",
        lines: [
          { x1: 2.3, y1: 9.8, x2: 5.1, y2: 7 },
          { x1: 5.1, y1: 7, x2: 7.2, y2: 8.8 },
          { x1: 7.2, y1: 8.8, x2: 11.4, y2: 4.4 },
          { x1: 8.8, y1: 4.4, x2: 11.4, y2: 4.4 },
          { x1: 11.4, y1: 4.4, x2: 11.4, y2: 7 },
        ],
      },
    ],
  },
  {
    name: "Schedule",
    states: [
      {
        label: "Calendar",
        paths: [
          {
            d: "M 3.4 2.8 L 10.6 2.8 Q 11.7 2.8 11.7 3.9 L 11.7 10.5 Q 11.7 11.6 10.6 11.6 L 3.4 11.6 Q 2.3 11.6 2.3 10.5 L 2.3 3.9 Q 2.3 2.8 3.4 2.8",
          },
        ],
        lines: [
          { x1: 2.3, y1: 5.3, x2: 11.7, y2: 5.3 },
          { x1: 5, y1: 1.7, x2: 5, y2: 3.9 },
          { x1: 9, y1: 1.7, x2: 9, y2: 3.9 },
        ],
      },
      {
        label: "Clock",
        paths: [
          {
            d: "M 7 1.9 L 7 1.9 Q 12.1 1.9 12.1 7 L 12.1 7 Q 12.1 12.1 7 12.1 L 7 12.1 Q 1.9 12.1 1.9 7 L 1.9 7 Q 1.9 1.9 7 1.9",
          },
        ],
        lines: [
          { x1: 7, y1: 7, x2: 7, y2: 4.2 },
          { x1: 7, y1: 7, x2: 9.5, y2: 8.4 },
          { ...COLLAPSED_LINE },
        ],
      },
    ],
  },
];

function morphTransition(reducedMotion) {
  if (reducedMotion) return { duration: 0 };
  return { type: "spring", duration: 0.38, bounce: 0 };
}

function MorphIcon({ state, reducedMotion }) {
  const transition = morphTransition(reducedMotion);

  return (
    <svg
      className="morph-glyph"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
      aria-hidden="true"
    >
      <g>
        {(state.paths ?? []).map((path, index) => (
          <motion.path
            key={`path-${index}`}
            initial={false}
            animate={{ d: path.d, opacity: path.opacity ?? 1 }}
            transition={transition}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {state.lines.map((line, index) => (
          <motion.line
            key={`line-${index}`}
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
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}

function StateTag({ label, reducedMotion }) {
  const presence = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.1 },
      }
    : {
        initial: { opacity: 0, y: 3, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -3, filter: "blur(4px)" },
        transition: { type: "spring", duration: 0.3, bounce: 0 },
      };

  return (
    <span className="morph-tag" role="status" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span className="morph-tag-text" key={label} {...presence}>
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Study({ name, states, reducedMotion }) {
  const [index, setIndex] = useState(0);
  const current = states[index];
  const next = states[(index + 1) % states.length];

  return (
    <li className="morph-study">
      <button
        className="morph-button"
        type="button"
        onClick={() => setIndex((value) => (value + 1) % states.length)}
        aria-label={`${name}: ${current.label}. Show ${next.label}.`}
      >
        <MorphIcon state={current} reducedMotion={reducedMotion} />
      </button>
      <StateTag label={current.label} reducedMotion={reducedMotion} />
    </li>
  );
}

function Sentiment({ reducedMotion }) {
  const inputId = useId();
  const [value, setValue] = useState(0.5);
  const label = value < 0.36 ? "Unhappy" : value > 0.64 ? "Happy" : "Neutral";
  const tone = value < 0.36 ? "#cf514b" : value > 0.64 ? "#16825b" : "#b47a18";
  const controlY = 9.2 + (value - 0.5) * 7.4;

  return (
    <li className="morph-study morph-study-sentiment">
      <div className="sentiment-surface" style={{ "--sentiment-tone": tone }}>
        <svg
          className="sentiment-glyph"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          fill="none"
          aria-hidden="true"
        >
          <circle cx="4.8" cy="5.6" r="0.82" fill="currentColor" />
          <circle cx="9.2" cy="5.6" r="0.82" fill="currentColor" />
          <path
            d={`M 3.2 9.2 Q 7 ${controlY} 10.8 9.2`}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        </svg>

        <label className="sr-only" htmlFor={inputId}>
          Sentiment from unhappy to happy
        </label>
        <input
          id={inputId}
          className="sentiment-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          aria-valuetext={label}
          onInput={(event) => setValue(Number(event.currentTarget.value))}
        />
      </div>
      <StateTag label={label} reducedMotion={reducedMotion} />
    </li>
  );
}

export default function MorphExplorations() {
  const reducedMotion = useReducedMotion();

  return (
    <main className="morph-page">
      <section aria-labelledby="morph-title">
        <h1 id="morph-title" className="sr-only">
          Morphing icon studies
        </h1>

        <ul className="morph-row">
          {CORE_STUDIES.map((study) => (
            <Study
              key={study.name}
              name={study.name}
              states={study.states}
              reducedMotion={reducedMotion}
            />
          ))}
          <Sentiment reducedMotion={reducedMotion} />
          {CANDIDATE_STUDIES.map((study) => (
            <Study
              key={study.name}
              name={study.name}
              states={study.states}
              reducedMotion={reducedMotion}
            />
          ))}
        </ul>
      </section>

      <style>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          min-height: 100%;
          margin: 0;
          background: #ffffff;
        }

        button,
        input {
          font: inherit;
        }

        .morph-page {
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: clamp(28px, 6vw, 72px) clamp(20px, 5vw, 64px);
          color: #242422;
          background: #ffffff;
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .morph-page > section {
          inline-size: 100%;
        }

        .morph-row {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: center;
          gap: 36px 20px;
          width: min(100%, 804px);
          margin-block: 0;
          margin-inline: auto;
          padding: 0;
          list-style: none;
        }

        .morph-study {
          inline-size: 104px;
          display: flex;
          flex: 0 0 auto;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .morph-study-sentiment {
          inline-size: 184px;
        }

        .morph-button,
        .sentiment-surface {
          block-size: 104px;
          border: 0;
          border-radius: 20px;
          color: #242422;
          background: #f1f1ef;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.78),
            0 0 0 1px rgba(0, 0, 0, 0.025);
        }

        .morph-button {
          inline-size: 104px;
          display: grid;
          place-items: center;
          margin: 0;
          padding: 0;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition-property: transform, background-color, box-shadow;
          transition-duration: 150ms;
          transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
        }

        .morph-glyph,
        .sentiment-glyph {
          display: block;
          inline-size: 48px;
          block-size: 48px;
          overflow: visible;
          pointer-events: none;
        }

        .morph-button:focus-visible,
        .sentiment-range:focus-visible {
          outline: 2px solid #242422;
          outline-offset: 4px;
        }

        .sentiment-surface {
          inline-size: 184px;
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          align-items: center;
          gap: 20px;
          padding-inline: 20px;
          color: var(--sentiment-tone);
        }

        .sentiment-range {
          inline-size: 76px;
          block-size: 32px;
          margin: 0;
          appearance: none;
          background: transparent;
          cursor: ew-resize;
          touch-action: pan-y;
        }

        .sentiment-range::-webkit-slider-runnable-track {
          block-size: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, #cf514b 0%, #b47a18 50%, #16825b 100%);
        }

        .sentiment-range::-moz-range-track {
          block-size: 4px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #cf514b 0%, #b47a18 50%, #16825b 100%);
        }

        .sentiment-range::-webkit-slider-thumb {
          inline-size: 16px;
          block-size: 16px;
          margin-block-start: -6px;
          appearance: none;
          border: 4px solid #f1f1ef;
          border-radius: 50%;
          background: var(--sentiment-tone);
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.16),
            0 2px 5px rgba(0, 0, 0, 0.15);
        }

        .sentiment-range::-moz-range-thumb {
          inline-size: 8px;
          block-size: 8px;
          border: 4px solid #f1f1ef;
          border-radius: 50%;
          background: var(--sentiment-tone);
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.16),
            0 2px 5px rgba(0, 0, 0, 0.15);
        }

        .morph-tag {
          min-block-size: 26px;
          display: grid;
          place-items: center;
          padding: 7px 10px;
          overflow: hidden;
          border-radius: 999px;
          color: #666560;
          background: #f4f4f2;
          font-size: 12px;
          font-weight: 520;
          letter-spacing: 0.01em;
          line-height: 1;
          white-space: nowrap;
        }

        .morph-tag-text {
          grid-area: 1 / 1;
          display: block;
          will-change: opacity, filter, transform;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @media (hover: hover) {
          .morph-button:hover {
            background: #eaeae7;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.86),
              0 8px 24px -16px rgba(0, 0, 0, 0.3),
              0 0 0 1px rgba(0, 0, 0, 0.04);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .morph-button:active {
            transform: scale(0.96);
          }
        }

        @media (max-width: 500px) {
          .morph-row {
            max-width: 260px;
            row-gap: 28px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .morph-button {
            transition-property: background-color, box-shadow;
          }

          .morph-tag-text {
            will-change: opacity;
          }
        }

        @media (forced-colors: active) {
          .morph-button,
          .sentiment-surface,
          .morph-tag {
            border: 1px solid ButtonText;
          }
        }
      `}</style>
    </main>
  );
}
