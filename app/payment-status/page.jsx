"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

const SPEEDS = [1, 0.75, 0.5, 0.25];
const CENTER = 32;

const GLYPHS = {
  idle: {
    color: "#635bff",
    tile: "#f0efff",
    lines: [
      { x1: 23, y1: 18, x2: 41, y2: 18, opacity: 1 },
      { x1: 46, y1: 23, x2: 46, y2: 39, opacity: 1 },
      { x1: 41, y1: 44, x2: 23, y2: 44, opacity: 1 },
      { x1: 18, y1: 39, x2: 18, y2: 23, opacity: 1 },
      { x1: 18, y1: 27, x2: 46, y2: 27, opacity: 1 },
      { x1: 25, y1: 35, x2: 33, y2: 35, opacity: 1 },
    ],
  },
  collapse: {
    color: "#635bff",
    tile: "#f0efff",
    lines: [
      { x1: 32, y1: 27, x2: 32, y2: 27, opacity: 0.42 },
      { x1: 36.3, y1: 29.5, x2: 36.3, y2: 29.5, opacity: 0.52 },
      { x1: 36.3, y1: 34.5, x2: 36.3, y2: 34.5, opacity: 0.64 },
      { x1: 32, y1: 37, x2: 32, y2: 37, opacity: 0.76 },
      { x1: 27.7, y1: 34.5, x2: 27.7, y2: 34.5, opacity: 0.88 },
      { x1: 27.7, y1: 29.5, x2: 27.7, y2: 29.5, opacity: 1 },
    ],
  },
  processing: {
    color: "#635bff",
    tile: "#f0efff",
    lines: [
      { x1: 32, y1: 22, x2: 32, y2: 16, opacity: 0.36 },
      { x1: 40.7, y1: 27, x2: 45.9, y2: 24, opacity: 0.48 },
      { x1: 40.7, y1: 37, x2: 45.9, y2: 40, opacity: 0.6 },
      { x1: 32, y1: 42, x2: 32, y2: 48, opacity: 0.72 },
      { x1: 23.3, y1: 37, x2: 18.1, y2: 40, opacity: 0.86 },
      { x1: 23.3, y1: 27, x2: 18.1, y2: 24, opacity: 1 },
    ],
  },
  succeeded: {
    color: "#0a7a5a",
    tile: "#eaf8f2",
    lines: [
      { x1: 28, y1: 41, x2: 28, y2: 41, opacity: 0 },
      { x1: 28, y1: 41, x2: 46, y2: 21, opacity: 1 },
      { x1: 28, y1: 41, x2: 28, y2: 41, opacity: 0 },
      { x1: 28, y1: 41, x2: 28, y2: 41, opacity: 0 },
      { x1: 19, y1: 32, x2: 28, y2: 41, opacity: 1 },
      { x1: 28, y1: 41, x2: 28, y2: 41, opacity: 0 },
    ],
  },
  failed: {
    color: "#c43d52",
    tile: "#fff0f2",
    lines: [
      { x1: 22, y1: 22, x2: 42, y2: 42, opacity: 1 },
      { x1: 32, y1: 32, x2: 32, y2: 32, opacity: 0 },
      { x1: 32, y1: 32, x2: 32, y2: 32, opacity: 0 },
      { x1: 42, y1: 22, x2: 22, y2: 42, opacity: 1 },
      { x1: 32, y1: 32, x2: 32, y2: 32, opacity: 0 },
      { x1: 32, y1: 32, x2: 32, y2: 32, opacity: 0 },
    ],
  },
};

const STATUS = {
  idle: { label: "Ready to charge", color: "#635bff" },
  processing: { label: "Processing payment", color: "#635bff" },
  succeeded: { label: "Payment succeeded", color: "#0a7a5a" },
  failed: { label: "Payment failed", color: "#c43d52" },
};

const MORPH_DURATION = {
  idle: 0.52,
  collapse: 0.28,
  processing: 0.46,
  succeeded: 0.58,
  failed: 0.52,
};

function SpeedControl({ value, onChange, disabled }) {
  const labelId = useId();

  return (
    <div className="mb-2.5 flex min-h-[42px] items-center justify-between gap-4 rounded-xl border border-[#e3e8ee] bg-white py-[5px] pl-3.5 pr-1.5 shadow-[0_1px_2px_rgba(50,50,93,0.05)]">
      <span id={labelId} className="text-xs font-semibold tracking-[0.01em] text-[#697386]">
        Playback
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex gap-0.5 rounded-lg border border-[#e3e8ee] bg-[#f4f6f8] p-0.5"
      >
        {SPEEDS.map((speed) => {
          const selected = speed === value;

          return (
            <button
              key={speed}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(speed)}
              className="relative isolate min-h-[30px] min-w-[42px] cursor-pointer rounded-md border-0 bg-transparent px-2 text-[11px] font-semibold tabular-nums text-[#697386] outline-none transition-colors duration-150 hover:text-[#3c4257] focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selected && (
                <motion.span
                  layoutId="playback-speed"
                  className="absolute inset-0 -z-10 rounded-md border border-[#e3e8ee] bg-white shadow-[0_1px_2px_rgba(50,50,93,0.1)]"
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                />
              )}
              {speed}×
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusGlyph({ phase, speed, spinTarget, reducedMotion }) {
  const glyph = GLYPHS[phase];
  const duration = reducedMotion ? 0 : MORPH_DURATION[phase] / speed;
  const lineTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring", duration, bounce: 0 };

  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: glyph.tile,
        color: glyph.color,
        scale: phase === "collapse" ? 0.96 : 1,
      }}
      transition={{
        type: "spring",
        duration: reducedMotion ? 0 : 0.42 / speed,
        bounce: 0,
      }}
      className="mb-5 grid size-28 place-items-center rounded-[30px] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),inset_0_0_0_1px_rgba(99,91,255,0.06)]"
    >
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="size-[82px] overflow-visible">
        <motion.g
          initial={false}
          animate={{ rotate: reducedMotion ? 0 : spinTarget }}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          transition={
            phase === "processing" && !reducedMotion
              ? { duration: 1.42 / speed, ease: "linear" }
              : { duration: 0 }
          }
        >
          {glyph.lines.map((line, index) => (
            <motion.line
              key={index}
              initial={false}
              animate={line}
              transition={{
                ...lineTransition,
                delay: reducedMotion ? 0 : index * (0.012 / speed),
              }}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </motion.g>
      </svg>
    </motion.div>
  );
}

function StatusLabel({ status, reducedMotion }) {
  return (
    <div
      className="mb-6 grid min-h-[22px] place-items-center text-[15px] font-semibold leading-[1.45] tracking-[-0.01em]"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status.label}
          className="col-start-1 row-start-1"
          initial={reducedMotion ? false : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{
            duration: reducedMotion ? 0 : 0.18,
            ease: [0.2, 0, 0, 1],
          }}
          style={{ color: status.color }}
        >
          {status.label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function PaymentStatus() {
  const reducedMotion = useReducedMotion();
  const [speed, setSpeed] = useState(1);
  const [state, setState] = useState("idle");
  const [phase, setPhase] = useState("idle");
  const [spinTarget, setSpinTarget] = useState(0);
  const speedRef = useRef(1);
  const timers = useRef([]);

  function clearTimers() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }

  useEffect(() => clearTimers, []);

  function schedule(callback, delay) {
    timers.current.push(window.setTimeout(callback, delay));
  }

  function runCharge(outcome) {
    clearTimers();
    setState("processing");
    const playbackSpeed = speedRef.current;

    if (reducedMotion) {
      setPhase("processing");
    } else {
      setPhase("collapse");
      schedule(() => {
        setPhase("processing");
        setSpinTarget((current) => current + 720);
      }, 180 / playbackSpeed);
    }

    const resultDelay = (reducedMotion ? 420 : 1600) / playbackSpeed;
    const resetDelay = (reducedMotion ? 2800 : 4200) / playbackSpeed;

    schedule(() => {
      setState(outcome);
      setPhase(outcome);
    }, resultDelay);

    schedule(() => {
      setState("idle");
      setPhase(reducedMotion ? "idle" : "collapse");

      if (!reducedMotion) {
        schedule(() => setPhase("idle"), 180 / playbackSpeed);
      }
    }, resetDelay);
  }

  function selectSpeed(nextSpeed) {
    speedRef.current = nextSpeed;
    setSpeed(nextSpeed);
  }

  const status = STATUS[state];
  const busy = state === "processing";

  return (
    <main
      className="grid min-h-dvh place-items-center bg-[#f7f8fa] p-6 text-[#30313d]"
      style={{ fontFamily: '"GT Standard L", Arial, sans-serif' }}
    >
      <h1 className="sr-only">Payment status morph prototype</h1>

      <div className="w-full max-w-[356px]">
        <SpeedControl value={speed} onChange={selectSpeed} disabled={state !== "idle"} />

        <section
          aria-label="Payment status"
          className="flex flex-col items-center rounded-[22px] border border-[rgba(48,49,61,0.07)] bg-white px-8 pb-8 pt-[42px] shadow-[0_18px_40px_rgba(50,50,93,0.08),0_2px_7px_rgba(0,0,0,0.04)]"
        >
          <StatusGlyph
            phase={phase}
            speed={speed}
            spinTarget={spinTarget}
            reducedMotion={reducedMotion}
          />

          <StatusLabel status={status} reducedMotion={reducedMotion} />

          <div className="grid w-full gap-[9px]">
            <motion.button
              type="button"
              disabled={busy}
              onClick={() => runCharge("succeeded")}
              whileTap={reducedMotion ? undefined : { scale: 0.96 }}
              className="min-h-[42px] cursor-pointer rounded-[9px] border border-[#635bff] bg-[#635bff] px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(50,50,93,0.24),inset_0_1px_0_rgba(255,255,255,0.2)] outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-[#5851df] hover:bg-[#5851df] focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Processing…" : "Charge $24.00"}
            </motion.button>
            <motion.button
              type="button"
              disabled={busy}
              onClick={() => runCharge("failed")}
              whileTap={reducedMotion ? undefined : { scale: 0.96 }}
              className="min-h-[42px] cursor-pointer rounded-[9px] border border-[#e3e8ee] bg-white px-4 text-[13px] font-semibold text-[#4f566b] shadow-[0_1px_2px_rgba(50,50,93,0.05)] outline-none transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-[#d8dee5] hover:bg-[#fafbfc] hover:text-[#3c4257] focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              Simulate decline
            </motion.button>
          </div>
        </section>
      </div>
    </main>
  );
}
