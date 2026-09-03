"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

const SPEEDS = [1, 0.75, 0.5, 0.25];

const FRAMES = {
  ready: {
    box: { x: 5, y: 9, width: 38, height: 30, rx: 5 },
    lines: [
      { x1: 5, y1: 18, x2: 43, y2: 18, opacity: 1 },
      { x1: 11, y1: 28, x2: 22, y2: 28, opacity: 1 },
      { x1: 26, y1: 28, x2: 31, y2: 28, opacity: 1 },
    ],
    color: "#635bff",
    fill: "#f7f5ff",
    dash: "1 0",
  },
  processing: {
    box: { x: 9, y: 9, width: 30, height: 30, rx: 15 },
    lines: [
      { x1: 24, y1: 24, x2: 24, y2: 24, opacity: 0 },
      { x1: 24, y1: 24, x2: 24, y2: 24, opacity: 0 },
      { x1: 24, y1: 24, x2: 24, y2: 24, opacity: 0 },
    ],
    color: "#635bff",
    fill: "#f7f5ff",
    dash: "0.24 0.76",
  },
  succeeded: {
    box: { x: 9, y: 9, width: 30, height: 30, rx: 15 },
    lines: [
      { x1: 15.5, y1: 24.5, x2: 21.5, y2: 30, opacity: 1 },
      { x1: 21.5, y1: 30, x2: 33, y2: 18, opacity: 1 },
      { x1: 24, y1: 24, x2: 24, y2: 24, opacity: 0 },
    ],
    color: "#0e7c58",
    fill: "#ecf8f3",
    dash: "1 0",
  },
  failed: {
    box: { x: 9, y: 9, width: 30, height: 30, rx: 15 },
    lines: [
      { x1: 24, y1: 16.5, x2: 24, y2: 25.5, opacity: 1 },
      { x1: 24, y1: 31.5, x2: 24.01, y2: 31.5, opacity: 1 },
      { x1: 24, y1: 24, x2: 24, y2: 24, opacity: 0 },
    ],
    color: "#c24156",
    fill: "#fff1f3",
    dash: "1 0",
  },
};

const COPY = {
  ready: {
    eyebrow: "Ready",
    title: "Ready to authorize",
    description: "The payment method is attached and ready for the network.",
  },
  processing: {
    eyebrow: "Processing",
    title: "Contacting the issuing bank",
    description: "Sending an authorization request through the card network.",
  },
  succeeded: {
    eyebrow: "Succeeded",
    title: "Payment complete",
    description: "The authorization was approved and the receipt was sent.",
  },
  failed: {
    eyebrow: "Failed",
    title: "Card was declined",
    description: "No funds were captured. Ask the customer for another card.",
  },
};

const STATUS_TONES = {
  ready: "border-[#dedbff] bg-[#f5f3ff] text-[#514ac7]",
  processing: "border-[#dedbff] bg-[#f5f3ff] text-[#514ac7]",
  succeeded: "border-[#cce9dd] bg-[#edf9f4] text-[#137052]",
  failed: "border-[#f2d4da] bg-[#fff1f3] text-[#ad354c]",
};

function formatSpeed(speed) {
  return `${speed}×`;
}

function SegmentedControl({ label, value, options, onChange, disabled = false }) {
  const id = useId();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span id={id} className="shrink-0 text-[12px] font-medium text-[#697386]">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className="flex min-w-0 rounded-[8px] border border-[#e3e8ee] bg-[#f7f9fc] p-[2px]"
      >
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className="relative isolate min-h-7 min-w-10 rounded-[6px] px-2 text-[11px] font-semibold text-[#697386] outline-none transition-colors hover:text-[#3c4257] focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selected && (
                <motion.span
                  layoutId={`${id}-selection`}
                  className="absolute inset-0 -z-10 rounded-[6px] border border-[#e3e8ee] bg-white shadow-[0_1px_2px_rgba(50,50,93,0.08)]"
                  transition={{ type: "spring", stiffness: 520, damping: 38 }}
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MorphingPaymentIcon({ state, speed, reducedMotion }) {
  const frame = FRAMES[state];
  const morphDuration = reducedMotion ? 0 : 0.5 / speed;
  const transition = {
    duration: morphDuration,
    ease: [0.22, 1, 0.36, 1],
  };
  const spinning = state === "processing" && !reducedMotion;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      className="size-16 overflow-visible"
    >
      <motion.g
        style={{ transformOrigin: "24px 24px" }}
        animate={spinning ? { rotate: [0, 360] } : { rotate: 0 }}
        transition={
          spinning
            ? { duration: 0.9 / speed, ease: "linear", repeat: Infinity }
            : transition
        }
      >
        <motion.rect
          initial={false}
          animate={{
            ...frame.box,
            stroke: frame.color,
            fill: frame.fill,
            strokeDasharray: frame.dash,
          }}
          transition={transition}
          pathLength="1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>

      {frame.lines.map((line, index) => (
        <motion.line
          // The same three strokes persist through every state.
          key={index}
          initial={false}
          animate={{ ...line, stroke: frame.color }}
          transition={{
            ...transition,
            delay: reducedMotion ? 0 : index * (0.018 / speed),
          }}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function StateCopy({ state, speed, reducedMotion }) {
  const copy = COPY[state];
  const duration = reducedMotion ? 0 : 0.24 / speed;

  return (
    <div className="min-w-0">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={state}
          initial={reducedMotion ? false : { opacity: 0, y: 7, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -5, filter: "blur(2px)" }}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8898aa]">
            {copy.eyebrow}
          </p>
          <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-[#30313d]">
            {copy.title}
          </h2>
          <p className="mt-1 max-w-[390px] text-[13px] leading-5 text-[#697386]">
            {copy.description}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CardMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 place-items-center rounded-[7px] border border-[#e3e8ee] bg-white shadow-[0_1px_2px_rgba(50,50,93,0.06)]"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4 text-[#697386]">
        <rect x="3.5" y="6" width="17" height="12" rx="2.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 10h16" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 14.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function PaymentStatus() {
  const reducedMotion = useReducedMotion();
  const [speed, setSpeed] = useState(1);
  const [outcome, setOutcome] = useState("succeeded");
  const [state, setState] = useState("ready");
  const [announcement, setAnnouncement] = useState("Ready to authorize payment");
  const timerRef = useRef(null);
  const processing = state === "processing";

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  function runPayment() {
    window.clearTimeout(timerRef.current);
    setState("processing");
    setAnnouncement("Payment processing");

    timerRef.current = window.setTimeout(() => {
      setState(outcome);
      setAnnouncement(
        outcome === "succeeded"
          ? "Payment succeeded"
          : "Payment failed. Card was declined",
      );
    }, (reducedMotion ? 420 : 1450) / speed);
  }

  function resetPayment() {
    window.clearTimeout(timerRef.current);
    setState("ready");
    setAnnouncement("Payment reset and ready to authorize");
  }

  function selectOutcome(nextOutcome) {
    setOutcome(nextOutcome);
    if (state !== "ready") resetPayment();
  }

  const complete = state === "succeeded" || state === "failed";

  return (
    <main className="min-h-dvh bg-[#f6f8fa] px-4 py-8 text-[#30313d] sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[720px]">
        <header className="mb-6 flex items-end justify-between gap-4 px-0.5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[#697386]">
              <span className="grid size-5 place-items-center rounded-[5px] bg-[#635bff] text-[11px] font-bold text-white shadow-[0_1px_2px_rgba(50,50,93,0.2)]">
                S
              </span>
              Payments workbench
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.035em] text-[#1f2430]">
              Payment lifecycle
            </h1>
          </div>
          <span className="hidden font-mono text-[11px] text-[#8898aa] sm:block">
            pi_3R7mQ2LkdIwHu7ix0A3
          </span>
        </header>

        <section
          aria-label="Prototype controls"
          className="mb-3 flex flex-col justify-between gap-3 rounded-[10px] border border-[#e3e8ee] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(50,50,93,0.04)] sm:flex-row sm:items-center"
        >
          <SegmentedControl
            label="Speed"
            value={speed}
            options={SPEEDS.map((item) => ({ value: item, label: formatSpeed(item) }))}
            onChange={setSpeed}
            disabled={processing}
          />
          <SegmentedControl
            label="Test result"
            value={outcome}
            options={[
              { value: "succeeded", label: "Approve" },
              { value: "failed", label: "Decline" },
            ]}
            onChange={selectOutcome}
            disabled={processing}
          />
        </section>

        <section className="overflow-hidden rounded-[14px] border border-[#dfe3e8] bg-white shadow-[0_12px_30px_rgba(50,50,93,0.07),0_2px_6px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#eef0f3] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[12px] font-medium text-[#697386]">Payment</p>
              <p className="mt-0.5 text-[13px] font-medium text-[#3c4257]">Arc Supply Co.</p>
            </div>
            <motion.span
              layout
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold ${STATUS_TONES[state]}`}
              transition={{ type: "spring", stiffness: 460, damping: 34 }}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${
                  state === "failed" ? "bg-[#c24156]" : state === "succeeded" ? "bg-[#0e7c58]" : "bg-[#635bff]"
                }`}
              />
              {COPY[state].eyebrow}
            </motion.span>
          </div>

          <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#697386]">Amount</p>
                <p className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.045em] text-[#1f2430] [font-variant-numeric:tabular-nums]">
                  $240.00
                  <span className="ml-2 align-middle text-[12px] font-semibold tracking-normal text-[#8898aa]">USD</span>
                </p>
              </div>
              <div className="flex items-center gap-2.5 rounded-[9px] border border-[#e9edf1] bg-[#fafbfc] py-2 pl-2 pr-3">
                <CardMark />
                <div>
                  <p className="text-[12px] font-semibold text-[#3c4257]">Visa •••• 4242</p>
                  <p className="mt-0.5 text-[11px] text-[#8898aa]">Expires 04/30</p>
                </div>
              </div>
            </div>

            <div className="my-6 h-px bg-[#eef0f3]" />

            <div className="grid min-h-[112px] grid-cols-[64px_1fr] items-center gap-4 sm:gap-5">
              <MorphingPaymentIcon state={state} speed={speed} reducedMotion={reducedMotion} />
              <StateCopy state={state} speed={speed} reducedMotion={reducedMotion} />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[#eef0f3] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-4 text-[#8898aa]">
                Test mode · no funds will move
              </p>
              <div className="flex items-center gap-2">
                {complete && (
                  <button
                    type="button"
                    onClick={resetPayment}
                    className="min-h-9 rounded-[7px] px-3 text-[12px] font-semibold text-[#697386] outline-none transition-colors hover:bg-[#f6f8fa] hover:text-[#3c4257] focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-2"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={runPayment}
                  disabled={processing}
                  className="relative min-h-9 min-w-[126px] overflow-hidden rounded-[7px] bg-[#635bff] px-4 text-[12px] font-semibold text-white shadow-[0_1px_2px_rgba(50,50,93,0.25),inset_0_1px_0_rgba(255,255,255,0.18)] outline-none transition-[background-color,transform,box-shadow] hover:bg-[#5851df] active:translate-y-px active:shadow-none focus-visible:ring-2 focus-visible:ring-[#635bff] focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-[#8f89f5]"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={processing ? "processing" : complete ? "again" : "pay"}
                      className="block"
                      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: reducedMotion ? 0 : 0.18 / speed }}
                    >
                      {processing ? "Processing…" : complete ? "Run again" : "Pay $240.00"}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-4 px-1 text-center text-[11px] leading-5 text-[#8898aa]">
          One outline and three strokes persist through every payment state.
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </main>
  );
}
