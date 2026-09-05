"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const VIEWBOX = 48;
const CENTER = VIEWBOX / 2;
const COLLAPSE = {
  x1: CENTER,
  y1: CENTER,
  x2: CENTER,
  y2: CENTER,
  opacity: 0,
};
const SPEEDS = [1, 0.75, 0.5];

function morphSpring(speed, reducedMotion) {
  if (reducedMotion) return { duration: 0 };

  return {
    type: "spring",
    stiffness: 410 * speed * speed,
    damping: 38 * speed,
    mass: 0.88,
  };
}

function LineIcon({ lines, tone, speed, reducedMotion, strokeWidth = 2.9 }) {
  const transition = morphSpring(speed, reducedMotion);

  return (
    <svg
      className="glyph"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
      aria-hidden="true"
    >
      {lines.map((line, index) => (
        <motion.line
          key={index}
          initial={false}
          animate={{
            x1: line.x1,
            y1: line.y1,
            x2: line.x2,
            y2: line.y2,
            opacity: line.opacity ?? 1,
            stroke: line.tone ?? tone,
          }}
          transition={transition}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function Study({ index, title, state, nextState, onClick, children }) {
  return (
    <button
      className="study"
      type="button"
      onClick={onClick}
      aria-label={`${title}: ${state}. Show ${nextState}.`}
    >
      <span className="study-heading">
        <span>{title}</span>
        <span className="study-index" aria-hidden="true">
          {String(index).padStart(2, "0")}
        </span>
      </span>

      <span className="icon-stage">{children}</span>

      <span className="study-footer">
        <motion.span
          className="state"
          key={state}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          aria-live="polite"
        >
          {state}
        </motion.span>
        <span className="advance" aria-hidden="true">
          ↗
        </span>
      </span>
    </button>
  );
}

/* 01 — Living numerals ------------------------------------------------ */
const DIGITS = [
  {
    label: "Zero",
    lines: [
      { x1: 19, y1: 13, x2: 29, y2: 13 },
      { x1: 33, y1: 17, x2: 33, y2: 31 },
      { x1: 29, y1: 35, x2: 19, y2: 35 },
      { x1: 15, y1: 31, x2: 15, y2: 17 },
    ],
  },
  {
    label: "One",
    lines: [
      { x1: 19, y1: 18, x2: 24, y2: 13 },
      { x1: 24, y1: 13, x2: 24, y2: 35 },
      { x1: 18, y1: 35, x2: 30, y2: 35 },
      { ...COLLAPSE },
    ],
  },
  {
    label: "Two",
    lines: [
      { x1: 16, y1: 15, x2: 30, y2: 15 },
      { x1: 31, y1: 16, x2: 31, y2: 22 },
      { x1: 31, y1: 22, x2: 16, y2: 34 },
      { x1: 16, y1: 34, x2: 32, y2: 34 },
    ],
  },
  {
    label: "Three",
    lines: [
      { x1: 17, y1: 14, x2: 31, y2: 14 },
      { x1: 31, y1: 14, x2: 24, y2: 24 },
      { x1: 24, y1: 24, x2: 31, y2: 34 },
      { x1: 31, y1: 34, x2: 17, y2: 34 },
    ],
  },
];

function Numerals({ speed, reducedMotion }) {
  const [index, setIndex] = useState(0);
  const current = DIGITS[index];
  const next = DIGITS[(index + 1) % DIGITS.length];

  return (
    <Study
      index={1}
      title="Numerals"
      state={current.label}
      nextState={next.label}
      onClick={() => setIndex((index + 1) % DIGITS.length)}
    >
      <LineIcon
        lines={current.lines}
        tone="#635bff"
        speed={speed}
        reducedMotion={reducedMotion}
      />
    </Study>
  );
}

/* 02 — Cursor presence ------------------------------------------------ */
const CURSOR = [
  {
    label: "Pointer",
    lines: [
      { x1: 17, y1: 13, x2: 17, y2: 34 },
      { x1: 17, y1: 13, x2: 33, y2: 25 },
      { x1: 33, y1: 25, x2: 24, y2: 27 },
      { x1: 24, y1: 27, x2: 17, y2: 34 },
    ],
  },
  {
    label: "Text",
    lines: [
      { x1: 24, y1: 13, x2: 24, y2: 35 },
      { x1: 19, y1: 13, x2: 29, y2: 13 },
      { x1: 19, y1: 35, x2: 29, y2: 35 },
      { ...COLLAPSE },
    ],
  },
  {
    label: "Move",
    lines: [
      { x1: 24, y1: 12, x2: 24, y2: 36 },
      { x1: 12, y1: 24, x2: 36, y2: 24 },
      { x1: 20, y1: 16, x2: 24, y2: 12 },
      { x1: 32, y1: 20, x2: 36, y2: 24 },
    ],
  },
];

function Cursor({ speed, reducedMotion }) {
  const [index, setIndex] = useState(0);
  const current = CURSOR[index];
  const next = CURSOR[(index + 1) % CURSOR.length];

  return (
    <Study
      index={2}
      title="Cursor"
      state={current.label}
      nextState={next.label}
      onClick={() => setIndex((index + 1) % CURSOR.length)}
    >
      <LineIcon
        lines={current.lines}
        tone="#11110f"
        speed={speed}
        reducedMotion={reducedMotion}
      />
    </Study>
  );
}

/* 03 — Connection pulse ---------------------------------------------- */
const SIGNAL = [
  {
    label: "Resting",
    tone: "#77766f",
    lines: [
      { x1: 9, y1: 24, x2: 17, y2: 24 },
      { x1: 17, y1: 24, x2: 24, y2: 24 },
      { x1: 24, y1: 24, x2: 31, y2: 24 },
      { x1: 31, y1: 24, x2: 39, y2: 24 },
    ],
  },
  {
    label: "Live",
    tone: "#14875d",
    lines: [
      { x1: 9, y1: 25, x2: 17, y2: 25 },
      { x1: 17, y1: 25, x2: 22, y2: 15 },
      { x1: 22, y1: 15, x2: 28, y2: 33 },
      { x1: 28, y1: 33, x2: 39, y2: 20 },
    ],
  },
  {
    label: "Interrupted",
    tone: "#d64045",
    lines: [
      { x1: 9, y1: 24, x2: 17, y2: 24 },
      { x1: 20, y1: 19, x2: 28, y2: 29 },
      { x1: 28, y1: 19, x2: 20, y2: 29 },
      { x1: 31, y1: 24, x2: 39, y2: 24 },
    ],
  },
];

function Signal({ speed, reducedMotion }) {
  const [index, setIndex] = useState(0);
  const current = SIGNAL[index];
  const next = SIGNAL[(index + 1) % SIGNAL.length];

  return (
    <Study
      index={3}
      title="Pulse"
      state={current.label}
      nextState={next.label}
      onClick={() => setIndex((index + 1) % SIGNAL.length)}
    >
      <LineIcon
        lines={current.lines}
        tone={current.tone}
        speed={speed}
        reducedMotion={reducedMotion}
      />
    </Study>
  );
}

/* 04 — Trust decision ------------------------------------------------- */
const TRUST = [
  {
    label: "Scanning",
    tone: "#635bff",
    lines: [
      { x1: 13, y1: 19, x2: 13, y2: 13 },
      { x1: 13, y1: 13, x2: 19, y2: 13 },
      { x1: 35, y1: 29, x2: 35, y2: 35 },
      { x1: 35, y1: 35, x2: 29, y2: 35 },
    ],
  },
  {
    label: "Verified",
    tone: "#14875d",
    lines: [
      { x1: 15, y1: 24, x2: 21, y2: 30 },
      { x1: 21, y1: 30, x2: 34, y2: 17 },
      { ...COLLAPSE },
      { ...COLLAPSE },
    ],
  },
  {
    label: "Flagged",
    tone: "#d64045",
    lines: [
      { x1: 16, y1: 16, x2: 32, y2: 32 },
      { x1: 32, y1: 16, x2: 16, y2: 32 },
      { ...COLLAPSE },
      { ...COLLAPSE },
    ],
  },
];

function Trust({ speed, reducedMotion }) {
  const [index, setIndex] = useState(0);
  const current = TRUST[index];
  const next = TRUST[(index + 1) % TRUST.length];

  return (
    <Study
      index={4}
      title="Trust"
      state={current.label}
      nextState={next.label}
      onClick={() => setIndex((index + 1) % TRUST.length)}
    >
      <LineIcon
        lines={current.lines}
        tone={current.tone}
        speed={speed}
        reducedMotion={reducedMotion}
      />
    </Study>
  );
}

/* 05 — Sort order ----------------------------------------------------- */
const SORT = [
  {
    label: "Ascending",
    lines: [
      { x1: 14, y1: 32, x2: 22, y2: 32 },
      { x1: 14, y1: 24, x2: 28, y2: 24 },
      { x1: 14, y1: 16, x2: 34, y2: 16 },
    ],
  },
  {
    label: "Descending",
    lines: [
      { x1: 14, y1: 16, x2: 22, y2: 16 },
      { x1: 14, y1: 24, x2: 28, y2: 24 },
      { x1: 14, y1: 32, x2: 34, y2: 32 },
    ],
  },
  {
    label: "Unsorted",
    lines: [
      { x1: 15, y1: 16, x2: 31, y2: 16 },
      { x1: 15, y1: 24, x2: 31, y2: 24 },
      { x1: 15, y1: 32, x2: 31, y2: 32 },
    ],
  },
];

function Sort({ speed, reducedMotion }) {
  const [index, setIndex] = useState(0);
  const current = SORT[index];
  const next = SORT[(index + 1) % SORT.length];

  return (
    <Study
      index={5}
      title="Sort"
      state={current.label}
      nextState={next.label}
      onClick={() => setIndex((index + 1) % SORT.length)}
    >
      <LineIcon
        lines={current.lines}
        tone="#11110f"
        speed={speed}
        reducedMotion={reducedMotion}
      />
    </Study>
  );
}

/* 06 — Network strength ---------------------------------------------- */
const WIFI = [
  {
    label: "Offline",
    paths: [
      { d: "M 10 20 C 18 13, 30 13, 38 20", opacity: 0.24, tone: "#aaa8a1" },
      { d: "M 15 27 C 20 22, 28 22, 33 27", opacity: 0.24, tone: "#aaa8a1" },
      { d: "M 20.5 33 C 22.5 31, 25.5 31, 27.5 33", opacity: 0.24, tone: "#aaa8a1" },
      { d: "M 12 13 C 20 21, 28 29, 36 37", opacity: 1, tone: "#d64045" },
    ],
  },
  {
    label: "Joining",
    paths: [
      { d: "M 10 20 C 18 13, 30 13, 38 20", opacity: 0.3, tone: "#635bff" },
      { d: "M 15 27 C 20 22, 28 22, 33 27", opacity: 0.55, tone: "#635bff" },
      { d: "M 20.5 33 C 22.5 31, 25.5 31, 27.5 33", opacity: 0.82, tone: "#635bff" },
      { d: "M 24 38 C 24 38, 24.01 38, 24.01 38", opacity: 1, tone: "#635bff" },
    ],
  },
  {
    label: "Weak",
    paths: [
      { d: "M 24 27 C 24 27, 24 27, 24 27", opacity: 0, tone: "#c98116" },
      { d: "M 24 30 C 24 30, 24 30, 24 30", opacity: 0, tone: "#c98116" },
      { d: "M 20.5 33 C 22.5 31, 25.5 31, 27.5 33", opacity: 1, tone: "#c98116" },
      { d: "M 24 38 C 24 38, 24.01 38, 24.01 38", opacity: 1, tone: "#c98116" },
    ],
  },
  {
    label: "Connected",
    paths: [
      { d: "M 10 20 C 18 13, 30 13, 38 20", opacity: 1, tone: "#14875d" },
      { d: "M 15 27 C 20 22, 28 22, 33 27", opacity: 1, tone: "#14875d" },
      { d: "M 20.5 33 C 22.5 31, 25.5 31, 27.5 33", opacity: 1, tone: "#14875d" },
      { d: "M 24 38 C 24 38, 24.01 38, 24.01 38", opacity: 1, tone: "#14875d" },
    ],
  },
];

function WifiIcon({ paths, speed, reducedMotion }) {
  const transition = morphSpring(speed, reducedMotion);

  return (
    <svg
      className="glyph"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
      aria-hidden="true"
    >
      {paths.map((path, index) => (
        <motion.path
          key={index}
          initial={false}
          animate={{ d: path.d, opacity: path.opacity, stroke: path.tone }}
          transition={transition}
          strokeWidth="2.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function Wifi({ speed, reducedMotion }) {
  const [index, setIndex] = useState(0);
  const current = WIFI[index];
  const next = WIFI[(index + 1) % WIFI.length];

  return (
    <Study
      index={6}
      title="Wi-Fi"
      state={current.label}
      nextState={next.label}
      onClick={() => setIndex((index + 1) % WIFI.length)}
    >
      <WifiIcon
        paths={current.paths}
        speed={speed}
        reducedMotion={reducedMotion}
      />
    </Study>
  );
}

/* 07 — Sentiment, directly manipulated ------------------------------- */
function Sentiment() {
  const inputId = useId();
  const [value, setValue] = useState(0.5);
  const curve = (value - 0.5) * 13;
  const tone = value < 0.4 ? "#d64045" : value > 0.6 ? "#14875d" : "#c98116";
  const label = value < 0.4 ? "Unhappy" : value > 0.6 ? "Happy" : "Neutral";

  return (
    <article className="study sentiment">
      <div className="study-heading">
        <label htmlFor={inputId}>Sentiment</label>
        <span className="study-index" aria-hidden="true">
          07
        </span>
      </div>

      <div className="sentiment-body">
        <div className="icon-stage sentiment-icon">
          <svg
            className="glyph"
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            fill="none"
            aria-hidden="true"
          >
            <circle cx="18" cy="20" r="2" fill={tone} />
            <circle cx="30" cy="20" r="2" fill={tone} />
            <path
              d={`M 15 31 Q 24 ${31 - curve} 33 31`}
              stroke={tone}
              strokeWidth="2.9"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="sentiment-control">
          <div className="range-labels" aria-hidden="true">
            <span>Low</span>
            <span>High</span>
          </div>
          <input
            id={inputId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
            className="range"
            aria-label={`Sentiment: ${label}`}
          />
        </div>
      </div>

      <div className="study-footer">
        <span className="state" aria-live="polite">
          {label}
        </span>
        <span className="direct" aria-hidden="true">
          Drag
        </span>
      </div>
    </article>
  );
}

export default function MorphExplorations() {
  const reducedMotion = useReducedMotion();
  const [speed, setSpeed] = useState(1);

  return (
    <main className="page-shell">
      <section className="exploration" aria-labelledby="page-title">
        <header className="page-header">
          <div>
            <p className="eyebrow">Morph / 07</p>
            <h1 id="page-title">Useful states, one continuous form.</h1>
            <p className="lede">
              Seven interface signals built from persistent geometry.
            </p>
          </div>

          <fieldset className="speed-control">
            <legend>Playback speed</legend>
            <div className="speed-options">
              {SPEEDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="speed-option"
                  aria-pressed={speed === option}
                  onClick={() => setSpeed(option)}
                >
                  {option}×
                </button>
              ))}
            </div>
          </fieldset>
        </header>

        <div className="board">
          <Numerals speed={speed} reducedMotion={reducedMotion} />
          <Cursor speed={speed} reducedMotion={reducedMotion} />
          <Signal speed={speed} reducedMotion={reducedMotion} />
          <Trust speed={speed} reducedMotion={reducedMotion} />
          <Sort speed={speed} reducedMotion={reducedMotion} />
          <Wifi speed={speed} reducedMotion={reducedMotion} />
          <Sentiment />
        </div>

        <p className="instruction">
          Select a study to advance its state. Drag the sentiment scale.
        </p>
      </section>

      <style jsx global>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-width: 320px;
          background: #f2f1ee;
        }

        button,
        input {
          font: inherit;
        }

        .glyph {
          width: 48px;
          height: 48px;
          overflow: visible;
        }
      `}</style>

      <style jsx global>{`
        .page-shell {
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: clamp(28px, 5vw, 72px) 20px;
          color: #11110f;
          background:
            radial-gradient(circle at 50% 5%, rgba(255, 255, 255, 0.86), transparent 42%),
            #f2f1ee;
          font-family: "GT Standard L", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .exploration {
          width: min(100%, 880px);
        }

        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 32px;
          margin-bottom: 22px;
        }

        .eyebrow {
          margin: 0 0 11px;
          color: #6e6d67;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1;
          text-transform: uppercase;
        }

        h1 {
          max-width: 590px;
          margin: 0;
          font-size: clamp(26px, 4vw, 42px);
          font-weight: 540;
          letter-spacing: -0.045em;
          line-height: 0.98;
          text-wrap: balance;
        }

        .lede {
          margin: 13px 0 0;
          color: #77766f;
          font-size: 14px;
          letter-spacing: -0.012em;
          line-height: 1.45;
        }

        .speed-control {
          flex: 0 0 auto;
          margin: 0;
          padding: 0;
          border: 0;
        }

        .speed-control legend {
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

        .speed-options {
          display: flex;
          gap: 2px;
          padding: 3px;
          border: 1px solid #dddbd5;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.58);
        }

        .speed-option {
          min-width: 44px;
          min-height: 32px;
          padding: 0 9px;
          border: 0;
          border-radius: 5px;
          color: #77766f;
          background: transparent;
          font-size: 11px;
          font-variant-numeric: tabular-nums;
          font-weight: 650;
          cursor: pointer;
          transition:
            color 140ms ease,
            background-color 140ms ease,
            transform 120ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .speed-option:hover {
          color: #11110f;
        }

        .speed-option[aria-pressed="true"] {
          color: #fff;
          background: #191917;
          box-shadow: 0 1px 2px rgba(17, 17, 15, 0.18);
        }

        .speed-option:active {
          transform: scale(0.96);
        }

        .speed-option:focus-visible {
          outline: 2px solid #635bff;
          outline-offset: 2px;
        }

        .board {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          padding: 1px;
          overflow: hidden;
          border-radius: 10px;
          background: #deddd8;
          box-shadow:
            0 0 0 1px rgba(17, 17, 15, 0.03),
            0 18px 44px rgba(32, 31, 27, 0.06);
        }

        .study {
          position: relative;
          min-width: 0;
          min-height: 184px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          margin: 0;
          padding: 16px;
          border: 0;
          border-radius: 0;
          color: inherit;
          background: #fff;
          text-align: start;
        }

        button.study {
          cursor: pointer;
          transition: background-color 160ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        button.study:hover {
          background: #fbfbf9;
        }

        button.study:focus-visible {
          z-index: 2;
          outline: 2px solid #635bff;
          outline-offset: -3px;
        }

        .study-heading,
        .study-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .study-heading {
          color: #44433f;
          font-size: 11px;
          font-weight: 650;
          letter-spacing: -0.005em;
          line-height: 1;
        }

        .study-index {
          color: #aaa8a1;
          font-size: 10px;
          font-variant-numeric: tabular-nums;
          font-weight: 560;
          letter-spacing: 0.05em;
        }

        .icon-stage {
          display: grid;
          place-items: center;
          align-self: center;
          width: 64px;
          height: 64px;
        }

        .study-footer {
          min-height: 16px;
        }

        .state {
          color: #77766f;
          font-size: 11px;
          font-weight: 520;
          letter-spacing: -0.006em;
          line-height: 1;
        }

        .advance,
        .direct {
          color: #aaa8a1;
          font-size: 11px;
          line-height: 1;
          transition:
            color 160ms ease,
            transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .advance {
          font-size: 13px;
        }

        button.study:hover .advance {
          color: #11110f;
          transform: translate(1px, -1px);
        }

        .direct {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .sentiment {
          grid-column: span 2;
        }

        .sentiment-body {
          display: grid;
          grid-template-columns: 64px minmax(120px, 1fr);
          align-items: center;
          gap: 28px;
          padding: 0 10px 0 2px;
        }

        .sentiment-icon {
          align-self: auto;
        }

        .sentiment-control {
          min-width: 0;
        }

        .range-labels {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: #aaa8a1;
          font-size: 9px;
          font-weight: 650;
          letter-spacing: 0.06em;
          line-height: 1;
          text-transform: uppercase;
        }

        .range {
          width: 100%;
          height: 20px;
          margin: 0;
          padding: 0;
          appearance: none;
          background: transparent;
          cursor: ew-resize;
        }

        .range::-webkit-slider-runnable-track {
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, #d64045 0%, #c98116 50%, #14875d 100%);
        }

        .range::-webkit-slider-thumb {
          width: 14px;
          height: 14px;
          margin-top: -6px;
          appearance: none;
          border: 4px solid #fff;
          border-radius: 50%;
          background: #191917;
          box-shadow:
            0 0 0 1px rgba(17, 17, 15, 0.16),
            0 2px 5px rgba(17, 17, 15, 0.16);
        }

        .range::-moz-range-track {
          height: 2px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #d64045 0%, #c98116 50%, #14875d 100%);
        }

        .range::-moz-range-thumb {
          width: 7px;
          height: 7px;
          border: 4px solid #fff;
          border-radius: 50%;
          background: #191917;
          box-shadow:
            0 0 0 1px rgba(17, 17, 15, 0.16),
            0 2px 5px rgba(17, 17, 15, 0.16);
        }

        .range:focus-visible {
          outline: 2px solid #635bff;
          outline-offset: 4px;
          border-radius: 2px;
        }

        .instruction {
          margin: 13px 2px 0;
          color: #8d8b84;
          font-size: 10px;
          letter-spacing: 0.015em;
          line-height: 1.4;
        }

        @media (max-width: 720px) {
          .page-shell {
            padding: 32px 16px;
          }

          .page-header {
            align-items: flex-start;
            margin-bottom: 18px;
          }

          .board {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .study {
            min-height: 172px;
          }
        }

        @media (max-width: 500px) {
          .page-header {
            flex-direction: column;
            gap: 20px;
          }

          h1 {
            max-width: 330px;
          }

          .board {
            grid-template-columns: minmax(0, 1fr);
          }

          .sentiment {
            grid-column: auto;
          }

          .sentiment-body {
            gap: 20px;
          }
        }

        @media (hover: none) {
          .advance {
            color: #77766f;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .speed-option,
          button.study,
          .advance,
          .direct {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
