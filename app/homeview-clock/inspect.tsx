"use client";

import { cancelFrame, frame } from "motion/react";
import type { MotionValue } from "motion/react";
import { useEffect, useRef } from "react";

import { CARD, HALF, HOURS, INK_DX, TICK_OUT } from "./face";
import type { NumeralValues } from "./face";

/* Inspect mode -----------------------------------------------------------
   One idea, shown simply. The clock slows to ¼ speed, a dashed line marks
   the edge the big numbers are pinned to, a dot marks each one's outer
   edge, and one sentence says what just happened. */

const ACCENT = "#ff5a2c";

// The four big numbers, each with the direction of its outer edge and the
// distance to it from the ink centre (288px font units, SF Pro).
const PINNED: {
  hour: (typeof HOURS)[number];
  out: [number, number];
  reach: number;
}[] = [
  { hour: 12, out: [0, -1], reach: 103 },
  { hour: 3, out: [1, 0], reach: 73 },
  { hour: 6, out: [0, 1], reach: 103 },
  { hour: 9, out: [-1, 0], reach: 75 },
];

type FaceProps = {
  numerals: NumeralValues[];
  cardScale: MotionValue<number>;
  fitScale: number;
};

export function InspectFace({ numerals, cardScale, fitScale }: FaceProps) {
  const edgeRef = useRef<SVGRectElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const fitRef = useRef(fitScale);

  useEffect(function keepFit() {
    fitRef.current = fitScale;
  });

  useEffect(
    function drawEveryFrame() {
      function draw() {
        // One screen pixel, whatever the device and card are scaled to.
        const unit = 1 / (fitRef.current * cardScale.get());
        const edge = edgeRef.current;

        if (edge) {
          edge.setAttribute("stroke-width", String(1.5 * unit));
          edge.setAttribute("stroke-dasharray", `${5 * unit} ${4 * unit}`);
        }

        PINNED.forEach(function placeDot({ hour, out, reach }, i) {
          const values = numerals[HOURS.indexOf(hour)];
          const dot = dotRefs.current[i];

          if (!dot) {
            return;
          }

          const scale = Math.max(0, values.scale.get());
          const x = values.x.get() + (INK_DX[hour] + out[0] * reach) * scale;
          const y = values.y.get() + out[1] * reach * scale;

          dot.setAttribute("cx", String(x));
          dot.setAttribute("cy", String(y));
          dot.setAttribute("r", String(5 * unit));
          dot.setAttribute("stroke-width", String(2 * unit));
          dot.style.opacity = String(values.opacity.get());
        });
      }

      // Drawn in Motion's render step, after this frame's values update.
      frame.render(draw, true);

      return function cleanup() {
        cancelFrame(draw);
      };
    },
    [numerals, cardScale],
  );

  return (
    <svg
      data-hv-inspect-face
      viewBox={`${-HALF} ${-HALF} ${CARD} ${CARD}`}
      width={CARD}
      height={CARD}
      aria-hidden="true"
    >
      <rect
        ref={edgeRef}
        x={-TICK_OUT}
        y={-TICK_OUT}
        width={TICK_OUT * 2}
        height={TICK_OUT * 2}
        fill="none"
        stroke={ACCENT}
      />
      {PINNED.map(function renderDot({ hour }, i) {
        return (
          <circle
            key={hour}
            ref={function keepDot(node) {
              dotRefs.current[i] = node;
            }}
            fill={ACCENT}
            stroke="#fff"
          />
        );
      })}
    </svg>
  );
}

/* What just happened, in one sentence ------------------------------------ */

export type Change = { key: string; id: number };

const CAPTIONS: Record<string, string> = {
  enter:
    "The card doesn’t slide over. It shrinks in place, then the controls appear.",
  exit: "Same spring, played backwards.",
  "giant>dial":
    "Each big number is pinned by its outer edge (the dot), so it shrinks into the edge instead of flying to the middle.",
  "dial>giant": "Each big number grows back out from its pinned edge.",
  "dial>numeralsTicks":
    "The ticks grow in from the edge and push the numbers in.",
  "numeralsTicks>dial": "The ticks pull back out, and the numbers follow them.",
  "numeralsTicks>ticks":
    "The ticks reach the numbers first. Then the numbers shrink and fade.",
  "ticks>numeralsTicks":
    "The numbers come back, and the ticks make room for them.",
};

function captionFor(change: Change | null, editing: boolean) {
  if (change && CAPTIONS[change.key]) {
    return CAPTIONS[change.key];
  }

  if (change) {
    return "One spring moves everything, so it all arrives together.";
  }

  return editing
    ? "Slowed to ¼ speed. Pick a style and watch the dots."
    : "Slowed to ¼ speed. Tap Customize, then pick a style.";
}

type BarProps = {
  inspect: boolean;
  onToggle: () => void;
  change: Change | null;
  editing: boolean;
};

export function InspectBar({ inspect, onToggle, change, editing }: BarProps) {
  const caption = captionFor(change, editing);

  return (
    <div data-hv-bar>
      <button
        type="button"
        data-hv-inspect-toggle
        aria-pressed={inspect}
        onClick={onToggle}
      >
        <span data-hv-switch aria-hidden="true" />
        Inspect
      </button>

      {inspect && (
        <p key={change?.id ?? caption} data-hv-caption aria-live="polite">
          {caption}
        </p>
      )}
    </div>
  );
}

export const INSPECT_STYLES = `
  [data-hv-inspect-face] {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    pointer-events: none;
  }

  [data-hv-bar] {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    height: 88px; /* fixed, so a two-line caption never moves the device */
    max-width: min(560px, calc(100vw - 32px));
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
    color: #1d1d1f;
  }

  [data-hv-inspect-toggle] {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    height: 34px;
    margin: 0;
    padding: 0 14px 0 10px;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.06);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 160ms ease, scale 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-hv-inspect-toggle]:focus-visible {
    outline: 2px solid ${ACCENT};
    outline-offset: 2px;
  }

  [data-hv-inspect-toggle]:active {
    scale: 0.96;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-hv-inspect-toggle]:hover {
      background: rgba(255, 255, 255, 0.85);
    }
  }

  [data-hv-switch] {
    position: relative;
    width: 26px;
    height: 16px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.16);
    transition: background-color 200ms ease;
  }

  [data-hv-switch]::after {
    content: "";
    position: absolute;
    left: 2px;
    top: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    transition: translate 260ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-hv-inspect-toggle][aria-pressed="true"] [data-hv-switch] {
    background: ${ACCENT};
  }

  [data-hv-inspect-toggle][aria-pressed="true"] [data-hv-switch]::after {
    translate: 10px 0;
  }

  [data-hv-caption] {
    min-height: 2.8em;
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
    text-align: center;
    text-wrap: balance;
    color: rgba(0, 0, 0, 0.72);
    animation: hv-caption-in 320ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }

  @keyframes hv-caption-in {
    from {
      opacity: 0;
      translate: 0 4px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-hv-caption] {
      animation: none;
    }
  }
`;
