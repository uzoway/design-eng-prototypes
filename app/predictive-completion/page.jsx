"use client";

import {
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useEffect, useState } from "react";

const COLLAPSED_H = 54;
const EXPANDED_H = 108;

const TRACK_W = 46;
const TRACK_H = 27;
const THUMB = 21;
const THUMB_INSET = 3;
const THUMB_TRAVEL = TRACK_W - THUMB_INSET * 2 - THUMB;

const ACCENT = "#7c6cf0";

const OPEN_SPRING = { type: "spring", stiffness: 400, damping: 40, mass: 0.9 };
const CLOSE_SPRING = { type: "spring", stiffness: 440, damping: 42, mass: 0.8 };

const COLLAPSED_RADIUS = COLLAPSED_H / 2;
const EXPANDED_RADIUS = 22;

const clamp = (v) => Math.max(0, Math.min(1, v));

function Sparkles({ active, reducedMotion }) {
  return (
    <motion.span
      className="pc-spark"
      animate={
        active
          ? {
              color: ACCENT,
              scale: reducedMotion ? 1 : [1, 1.28, 1],
              rotate: reducedMotion ? 0 : [0, 14, 0],
            }
          : { color: "#6b6b74", scale: 1, rotate: 0 }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.5, ease: [0.32, 0.72, 0, 1] }
      }
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 1.5c.28 2.9 1.6 4.22 4.5 4.5-2.9.28-4.22 1.6-4.5 4.5-.28-2.9-1.6-4.22-4.5-4.5C6.4 5.72 7.72 4.4 8 1.5Z"
          fill="currentColor"
        />
        <path
          d="M12.75 9.5c.15 1.35.9 2.1 2.25 2.25-1.35.15-2.1.9-2.25 2.25-.15-1.35-.9-2.1-2.25-2.25 1.35-.15 2.1-.9 2.25-2.25Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    </motion.span>
  );
}

function Toggle({ checked, onChange, reducedMotion }) {
  const x = useSpring(0, { stiffness: 420, damping: 20, mass: 1 });
  const velocity = useVelocity(x);
  const scaleX = useTransform(
    velocity,
    [-1100, -400, 0, 400, 1100],
    [1.42, 1.16, 1, 1.16, 1.42],
  );

  useEffect(() => {
    const dest = checked ? THUMB_TRAVEL : 0;
    if (reducedMotion) x.jump(dest);
    else x.set(dest);
  }, [checked, reducedMotion, x]);

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Predictive completion"
      onClick={onChange}
      className="pc-toggle"
      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 640, damping: 24 }}
      animate={{ backgroundColor: checked ? ACCENT : "rgba(255,255,255,0.14)" }}
    >
      <motion.span
        className="pc-thumb"
        style={{ x, scaleX: reducedMotion ? 1 : scaleX }}
      />
    </motion.button>
  );
}

function Checkbox({ checked, onChange, reducedMotion }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label="Enable inline suggestions"
      onClick={onChange}
      className="pc-checkbox"
      whileTap={reducedMotion ? undefined : { scale: 0.86 }}
      transition={{ type: "spring", stiffness: 620, damping: 30 }}
      animate={{
        backgroundColor: checked ? "#fff" : "rgba(255,255,255,0)",
        borderColor: checked ? "#fff" : "rgba(255,255,255,0.28)",
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="M2.5 6.2 5 8.6 9.5 3.8"
          stroke="#111"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  pathLength: { type: "spring", stiffness: 500, damping: 28 },
                  opacity: { duration: 0.08 },
                }
          }
        />
      </svg>
    </motion.button>
  );
}

function MotionModeTabs({ reduced, onChange }) {
  const options = [
    { id: "motion", label: "Motion" },
    { id: "reduced", label: "Reduced" },
  ];
  const activeIndex = reduced ? 1 : 0;

  return (
    <div className="pc-tabs" role="radiogroup" aria-label="Motion preference">
      <motion.span
        className="pc-tabs-pill"
        aria-hidden="true"
        animate={{ x: activeIndex * 100 + "%" }}
        transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.7 }}
      />
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={activeIndex === i}
          className={`pc-tab ${activeIndex === i ? "active" : ""}`}
          onClick={() => onChange(o.id === "reduced")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PreferenceCard({ reducedMotion }) {
  const [open, setOpen] = useState(false);
  const [inline, setInline] = useState(false);

  const progress = useSpring(0, open ? OPEN_SPRING : CLOSE_SPRING);

  useEffect(() => {
    if (reducedMotion) progress.jump(open ? 1 : 0);
    else progress.set(open ? 1 : 0);
  }, [open, reducedMotion, progress]);

  const height = useTransform(progress, [0, 1], [COLLAPSED_H, EXPANDED_H]);
  const borderRadius = useTransform(
    progress,
    (p) =>
      Math.round(
        (COLLAPSED_RADIUS - clamp(p) * (COLLAPSED_RADIUS - EXPANDED_RADIUS)) *
          100,
      ) / 100,
  );
  const background = useTransform(progress, [0, 1], ["#141417", "#1c1c20"]);
  const borderColor = useTransform(
    progress,
    [0, 1],
    ["rgba(255,255,255,0)", "rgba(255,255,255,0.09)"],
  );
  const shadowOpacity = useTransform(progress, [0, 0.4, 1], [0, 0, 1]);
  const highlightOpacity = useTransform(progress, [0, 1], [0, 1]);

  const contentBlurFilter = useTransform(
    progress,
    (p) => `blur(${(1 - clamp((p - 0.5) / 0.5)) * 8}px)`,
  );
  const contentOpacity = useTransform(progress, [0.5, 0.92], [0, 1]);
  const contentY = useTransform(progress, [0.45, 1], [-6, 0]);

  return (
    <motion.section
      className="pc-card"
      aria-label="Predictive completion settings"
      style={{ height, borderRadius, backgroundColor: background, borderColor }}
    >
      <motion.div
        className="pc-shadow"
        style={{ opacity: shadowOpacity, borderRadius }}
        aria-hidden="true"
      />
      <motion.div
        className="pc-highlight"
        style={{ opacity: highlightOpacity, borderRadius }}
        aria-hidden="true"
      />

      <div className="pc-primary">
        <span className="pc-primary-label">
          <Sparkles active={open} reducedMotion={reducedMotion} />
          Predictive Completion
        </span>
        <Toggle
          checked={open}
          onChange={() => setOpen((v) => !v)}
          reducedMotion={reducedMotion}
        />
      </div>

      <motion.div
        className="pc-secondary"
        style={{
          filter: reducedMotion ? "none" : contentBlurFilter,
          opacity: contentOpacity,
          y: contentY,
          pointerEvents: open ? "auto" : "none",
        }}
        aria-hidden={!open}
      >
        <span className="pc-secondary-label">Enable inline suggestions</span>
        <Checkbox
          checked={inline}
          onChange={() => setInline((v) => !v)}
          reducedMotion={reducedMotion}
        />
      </motion.div>
    </motion.section>
  );
}

export default function PredictiveCompletion() {
  const osReducedMotion = useReducedMotion();
  const [simReduced, setSimReduced] = useState(false);
  const reducedMotion = osReducedMotion || simReduced;

  return (
    <MotionConfig reducedMotion="user">
      <main className="pc-canvas">
        <div className="pc-stage">
          <PreferenceCard reducedMotion={reducedMotion} />
        </div>

        <div className="pc-controls">
          <MotionModeTabs reduced={simReduced} onChange={setSimReduced} />
          <p className="pc-hint">
            {reducedMotion ? "Animations disabled" : "Toggle the switch"}
          </p>
        </div>

        <style jsx global>{`
          .pc-canvas {
            min-height: 100vh;
            background: #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 40px;
            font-family:
              Inter,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
            -webkit-font-smoothing: antialiased;
            padding: 24px;
          }

          .pc-stage {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .pc-card {
            position: relative;
            width: 320px;
            border: 1px solid transparent;
            padding: 0 6px;
            box-sizing: border-box;
            overflow: hidden;
            will-change: height;
          }

          .pc-shadow {
            position: absolute;
            inset: 0;
            box-shadow:
              0 24px 60px rgba(0, 0, 0, 0.5),
              0 4px 12px rgba(0, 0, 0, 0.3);
            pointer-events: none;
          }

          .pc-highlight {
            position: absolute;
            inset: 0;
            pointer-events: none;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }

          .pc-primary {
            position: relative;
            height: ${COLLAPSED_H}px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
          }

          .pc-primary-label {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            font-size: 14px;
            font-weight: 500;
            color: #f4f4f5;
            letter-spacing: -0.01em;
          }

          .pc-spark {
            display: grid;
            place-items: center;
            transform-origin: center;
          }

          .pc-secondary {
            position: relative;
            height: ${COLLAPSED_H}px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px 0 34px;
            will-change: filter, opacity;
          }

          .pc-secondary-label {
            font-size: 13.5px;
            font-weight: 400;
            color: #a1a1aa;
            letter-spacing: -0.005em;
          }

          .pc-toggle {
            position: relative;
            width: ${TRACK_W}px;
            height: ${TRACK_H}px;
            border-radius: 999px;
            border: none;
            padding: 0;
            cursor: pointer;
            flex-shrink: 0;
            -webkit-tap-highlight-color: transparent;
          }
          .pc-toggle:focus-visible {
            outline: 2px solid ${ACCENT};
            outline-offset: 2px;
          }

          .pc-thumb {
            position: absolute;
            top: ${THUMB_INSET}px;
            left: ${THUMB_INSET}px;
            width: ${THUMB}px;
            height: ${THUMB}px;
            border-radius: 999px;
            background: #fff;
            box-shadow:
              0 2px 4px rgba(0, 0, 0, 0.35),
              0 0 1px rgba(0, 0, 0, 0.3);
            transform-origin: center;
          }

          .pc-checkbox {
            position: relative;
            display: grid;
            place-items: center;
            width: 20px;
            height: 20px;
            border-radius: 6px;
            border: 1.5px solid rgba(255, 255, 255, 0.28);
            background: transparent;
            cursor: pointer;
            flex-shrink: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
          }
          .pc-checkbox:focus-visible {
            outline: 2px solid ${ACCENT};
            outline-offset: 2px;
          }

          .pc-controls {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
          }

          .pc-tabs {
            position: relative;
            display: inline-flex;
            padding: 3px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
          }

          .pc-tabs-pill {
            position: absolute;
            top: 3px;
            left: 3px;
            width: calc(50% - 3px);
            height: calc(100% - 6px);
            border-radius: 7px;
            background: rgba(255, 255, 255, 0.1);
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.08),
              0 1px 2px rgba(0, 0, 0, 0.2);
          }

          .pc-tab {
            position: relative;
            z-index: 1;
            width: 76px;
            height: 28px;
            border: none;
            background: transparent;
            color: #6b6b74;
            font-family: inherit;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 7px;
            transition: color 250ms ease;
            -webkit-tap-highlight-color: transparent;
          }
          .pc-tab.active {
            color: #f4f4f5;
          }
          .pc-tab:not(.active):hover {
            color: #a1a1aa;
          }
          .pc-tab:focus-visible {
            outline: 2px solid ${ACCENT};
            outline-offset: 2px;
          }

          .pc-hint {
            font-size: 12px;
            color: #52525b;
            margin: 0;
            font-weight: 450;
            font-variant-numeric: tabular-nums;
          }
        `}</style>
      </main>
    </MotionConfig>
  );
}
