"use client";

import { cancelFrame, frame } from "motion/react";
import type { MotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import {
  CAP,
  CARD,
  CX,
  CY,
  DIAL_SCALE,
  GIANT_SCALE,
  HALF,
  HOUR_TO,
  HOURS,
  MINUTE_TO,
  NUM_PX,
  SECOND_TO,
  SPRING_DAMPING,
  SPRING_STIFFNESS,
  TICK_IN_HOUR,
  TICK_OUT,
  TRACK_DIAL,
  TRACK_GIANT,
  WEIGHT_DIAL,
  WEIGHT_GIANT,
  springProgress,
} from "./face";
import type { NumeralValues } from "./face";

/* Inspect mode -----------------------------------------------------------
   Draws the measured rules the clock is built on, live, on top of it:
   the edge every numeral is pinned to, each numeral's ink box, the ring
   the dial sits on, how far the ticks reach (they push the numerals in),
   the hand angles and the card's scale. A bar under the device holds the
   toggle, slow motion and a plot of the one spring that drives it all. */

const ACCENT = "#ff5a2c";
const LABEL_FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace';
const LABEL_PX = 10.5;
const LABEL_H = 17;
const LABEL_PAD = 5.5;

type InkMetric = { w: number; h: number; dx: number; dy: number };

/** Ink box of each numeral at the giant and dial weights, in 288px units. */
function measureInk() {
  const context = document.createElement("canvas").getContext("2d");
  const metrics = new Map<number, [InkMetric, InkMetric]>();

  if (!context) {
    return metrics;
  }

  const ctx: CanvasRenderingContext2D = context;
  const cap = CAP * NUM_PX;

  function measure(text: string, weight: number, track: number): InkMetric {
    // Canvas resolves the system font by system-ui, not -apple-system.
    ctx.font = `${weight} ${NUM_PX}px system-ui, -apple-system, sans-serif`;

    const first = ctx.measureText(text[0]);
    let left = -first.actualBoundingBoxLeft;
    let right = first.actualBoundingBoxRight;
    let advance = first.width;
    let ascent = first.actualBoundingBoxAscent;
    let descent = first.actualBoundingBoxDescent;

    if (text.length > 1) {
      const rest = ctx.measureText(text.slice(1));
      const x0 = first.width + track;

      left = Math.min(left, x0 - rest.actualBoundingBoxLeft);
      right = x0 + rest.actualBoundingBoxRight;
      advance = x0 + rest.width;
      ascent = Math.max(ascent, rest.actualBoundingBoxAscent);
      descent = Math.max(descent, rest.actualBoundingBoxDescent);
    }

    return {
      w: right - left,
      h: ascent + descent,
      dx: (left + right) / 2 - advance / 2,
      dy: cap / 2 - (ascent - descent) / 2,
    };
  }

  HOURS.forEach(function measureHour(hour) {
    const text = String(hour);

    metrics.set(hour, [
      measure(text, WEIGHT_GIANT, text.length > 1 ? TRACK_GIANT : 0),
      measure(text, WEIGHT_DIAL, text.length > 1 ? TRACK_DIAL : 0),
    ]);
  });

  return metrics;
}

/** Labels shrink a little on small screens; lines stay at 1px. */
function labelScale(fitScale: number) {
  return Math.min(1, 0.6 + fitScale * 0.5);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

type Align = "left" | "right" | "center";

/** A small accent pill, kept at a constant on-screen size. */
function placeLabel(
  group: SVGGElement | null,
  text: string,
  x: number,
  y: number,
  unit: number,
  align: Align = "left",
  opacity = 1,
) {
  if (!group) {
    return;
  }

  const label = group.querySelector("text");
  const pill = group.querySelector("rect");

  if (!label || !pill) {
    return;
  }

  if (label.textContent !== text) {
    label.textContent = text;
  }

  const width = label.getComputedTextLength() + LABEL_PAD * 2;
  const shift = align === "left" ? 0 : align === "right" ? -width : -width / 2;

  pill.setAttribute("width", String(width));
  label.setAttribute("x", String(LABEL_PAD));
  group.setAttribute(
    "transform",
    `translate(${x} ${y}) scale(${unit}) translate(${shift} ${-LABEL_H / 2})`,
  );
  group.style.opacity = String(opacity);
}

function Label({
  refCallback,
}: {
  refCallback: (node: SVGGElement | null) => void;
}) {
  return (
    <g ref={refCallback} data-hv-inspect-label>
      <rect height={LABEL_H} rx={LABEL_H / 2} fill={ACCENT} />
      <text
        y={LABEL_H / 2}
        dominantBaseline="central"
        fill="#fff"
        fontSize={LABEL_PX}
      >
        {" "}
      </text>
    </g>
  );
}

/* On the face ------------------------------------------------------------- */

type FaceSources = {
  numerals: NumeralValues[];
  cardScale: MotionValue<number>;
  tickGrow: MotionValue<number>;
  majorExtent: MotionValue<number>;
  ticksOpacity: MotionValue<number>;
  hourAngle: MotionValue<number>;
  minuteAngle: MotionValue<number>;
  secondAngle: MotionValue<number>;
  fitScale: number;
};

export function InspectFace(props: FaceSources) {
  const sourcesRef = useRef(props);
  const edgeRef = useRef<SVGRectElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const reachRef = useRef<SVGRectElement>(null);
  const boxRefs = useRef<(SVGRectElement | null)[]>([]);
  const anchorRefs = useRef<(SVGCircleElement | null)[]>([]);
  const labelRefs = useRef<Record<string, SVGGElement | null>>({});

  useEffect(function keepSources() {
    sourcesRef.current = props;
  });

  useEffect(function drawEveryFrame() {
    const ink = measureInk();

    function draw() {
      const s = sourcesRef.current;
      const unit = 1 / (s.fitScale * s.cardScale.get());
      const lu = unit * labelScale(s.fitScale);
      const dash = `${4 * unit} ${3 * unit}`;
      const labels = labelRefs.current;

      // The pinned edge: numerals' outer edges and the ticks' outer ends.
      const edge = edgeRef.current;

      if (edge) {
        edge.setAttribute("stroke-width", String(unit));
        edge.setAttribute("stroke-dasharray", dash);
      }

      placeLabel(
        labels.edge,
        `pinned edge ${TICK_OUT.toFixed(0)}`,
        TICK_OUT,
        TICK_OUT + 12 * lu,
        lu,
        "right",
      );

      // Numeral ink boxes, each with a dot on its outer edge.
      HOURS.forEach(function drawBox(hour, i) {
        const values = s.numerals[i];
        const box = boxRefs.current[i];
        const anchor = anchorRefs.current[i];
        const metric = ink.get(hour);

        if (!box || !anchor || !metric) {
          return;
        }

        const scale = Math.max(0, values.scale.get());
        const t = clamp01(
          (values.weight.get() - WEIGHT_GIANT) / (WEIGHT_DIAL - WEIGHT_GIANT),
        );
        const w = lerp(metric[0].w, metric[1].w, t) * scale;
        const h = lerp(metric[0].h, metric[1].h, t) * scale;
        const cx = values.x.get() + lerp(metric[0].dx, metric[1].dx, t) * scale;
        const cy = values.y.get() + lerp(metric[0].dy, metric[1].dy, t) * scale;
        const opacity = values.opacity.get();
        const r = Math.hypot(cx, cy) || 1;
        const ux = cx / r;
        const uy = cy / r;
        const reach = Math.min(
          Math.abs(ux) > 1e-6 ? w / 2 / Math.abs(ux) : Infinity,
          Math.abs(uy) > 1e-6 ? h / 2 / Math.abs(uy) : Infinity,
        );

        box.setAttribute("x", String(cx - w / 2));
        box.setAttribute("y", String(cy - h / 2));
        box.setAttribute("width", String(w));
        box.setAttribute("height", String(h));
        box.setAttribute("stroke-width", String(unit));
        box.style.opacity = String(opacity * 0.9);
        anchor.setAttribute("cx", String(cx + ux * reach));
        anchor.setAttribute("cy", String(cy + uy * reach));
        anchor.setAttribute("r", String(2.75 * unit));
        anchor.setAttribute("stroke-width", String(unit));
        anchor.style.opacity = String(opacity);

        if (hour === 12) {
          placeLabel(
            labels.numeral,
            `×${(scale / DIAL_SCALE).toFixed(2)} · wght ${values.weight.get().toFixed(0)}`,
            cx + w / 2 + 6 * lu,
            cy - h / 2 + 2 * lu,
            lu,
            "left",
            opacity,
          );
        }
      });

      // The ring the dial sits on, from the 3's centre; it fades in as the
      // giant numerals come down to dial size.
      const three = s.numerals[HOURS.indexOf(3)];
      const threeMetric = ink.get(3);
      const ring = ringRef.current;

      if (ring && threeMetric) {
        const scale = three.scale.get();
        const radius = Math.abs(three.x.get() + threeMetric[1].dx * scale);
        const dialness = clamp01(
          1 - ((scale - DIAL_SCALE) / (GIANT_SCALE - DIAL_SCALE)) * 2,
        );
        const visible = dialness * three.opacity.get();

        ring.setAttribute("r", String(radius));
        ring.setAttribute("stroke-width", String(unit));
        ring.setAttribute("stroke-dasharray", dash);
        ring.style.opacity = String(visible);
        placeLabel(
          labels.ring,
          `ring r ${radius.toFixed(0)}`,
          radius * Math.SQRT1_2 + 6 * lu,
          radius * Math.SQRT1_2 + 6 * lu,
          lu,
          "left",
          visible,
        );
      }

      // How far the ticks reach in: they grow on the spring that pushes the
      // numerals, so this square leads the numerals' boxes inward.
      const reachRect = reachRef.current;

      if (reachRect) {
        const grow = s.tickGrow.get();
        const half =
          TICK_OUT - (TICK_OUT - TICK_IN_HOUR) * grow * s.majorExtent.get();
        const visible = s.ticksOpacity.get() * clamp01(grow * 8);

        reachRect.setAttribute("x", String(-half));
        reachRect.setAttribute("y", String(-half));
        reachRect.setAttribute("width", String(half * 2));
        reachRect.setAttribute("height", String(half * 2));
        reachRect.setAttribute("stroke-width", String(unit));
        reachRect.setAttribute("stroke-dasharray", dash);
        reachRect.style.opacity = String(visible);
        placeLabel(
          labels.reach,
          `ticks reach ${half.toFixed(0)}`,
          -half,
          half + 12 * lu,
          lu,
          "left",
          visible,
        );
      }

      // Hand angles, measured clockwise from 12.
      const hands: [string, MotionValue<number>, number][] = [
        ["hour", s.hourAngle, HOUR_TO],
        ["minute", s.minuteAngle, MINUTE_TO],
        ["second", s.secondAngle, SECOND_TO],
      ];

      hands.forEach(function labelHand([name, angle, length]) {
        const degrees = ((angle.get() % 360) + 360) % 360;
        const theta = (degrees * Math.PI) / 180;
        const r = length + 16 * lu;
        const x = Math.sin(theta) * r;
        const y = -Math.cos(theta) * r;

        placeLabel(
          labels[name],
          `${name[0]} ${degrees.toFixed(1)}°`,
          x,
          y,
          lu,
          x < -2 ? "right" : x > 2 ? "left" : "center",
        );
      });
    }

    // Drawn in Motion's render step, after this frame's values update, so
    // the overlay never trails the numerals by a frame.
    frame.render(draw, true);

    return function cleanup() {
      cancelFrame(draw);
    };
  }, []);

  function keepLabel(name: string) {
    return function keep(node: SVGGElement | null) {
      labelRefs.current[name] = node;
    };
  }

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
      <circle ref={ringRef} cx={0} cy={0} r={0} fill="none" stroke={ACCENT} />
      <rect ref={reachRef} fill="none" stroke={ACCENT} />

      {HOURS.map(function renderBox(hour, i) {
        return (
          <g key={hour}>
            <rect
              ref={function keepBox(node) {
                boxRefs.current[i] = node;
              }}
              fill="none"
              stroke={ACCENT}
            />
            <circle
              ref={function keepAnchor(node) {
                anchorRefs.current[i] = node;
              }}
              fill={ACCENT}
              stroke="#fff"
            />
          </g>
        );
      })}

      {["edge", "ring", "reach", "numeral", "hour", "minute", "second"].map(
        function renderLabel(name) {
          return <Label key={name} refCallback={keepLabel(name)} />;
        },
      )}
    </svg>
  );
}

/* On the screen: the card's scale ----------------------------------------- */

export function InspectCardScale({
  cardScale,
  fitScale,
}: {
  cardScale: MotionValue<number>;
  fitScale: number;
}) {
  const groupRef = useRef<SVGGElement>(null);
  const fitRef = useRef(fitScale);

  useEffect(function keepFit() {
    fitRef.current = fitScale;
  });

  useEffect(
    function drawEveryFrame() {
      function draw() {
        const scale = cardScale.get();
        const lu = labelScale(fitRef.current) / fitRef.current;

        placeLabel(
          groupRef.current,
          `card ${CARD} × ${scale.toFixed(3)}`,
          CX - HALF * scale,
          CY - HALF * scale - 22 * lu,
          lu,
        );
      }

      frame.render(draw, true);

      return function cleanup() {
        cancelFrame(draw);
      };
    },
    [cardScale],
  );

  return (
    <svg data-hv-inspect-screen aria-hidden="true">
      <Label
        refCallback={function keep(node) {
          groupRef.current = node;
        }}
      />
    </svg>
  );
}

/* The bar under the device -------------------------------------------------- */

export type TransitionMark = { at: number; slow: number };

const PLOT_W = 132;
const PLOT_H = 34;
const PLOT_T = 0.8; // seconds shown

const SPRING_PATH = Array.from({ length: 49 }, function plotPoint(_, i) {
  const t = (i / 48) * PLOT_T;
  const x = (t / PLOT_T) * PLOT_W;
  const y = PLOT_H - springProgress(t) * (PLOT_H - 4) - 2;

  return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(" ");

const SPEEDS = [
  { value: 1, label: "1×" },
  { value: 0.5, label: "½×" },
  { value: 0.25, label: "¼×" },
];

type BarProps = {
  inspect: boolean;
  onToggle: () => void;
  speed: number;
  onSpeed: (speed: number) => void;
  markRef: RefObject<TransitionMark>;
};

export function InspectBar({
  inspect,
  onToggle,
  speed,
  onSpeed,
  markRef,
}: BarProps) {
  const dotRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(
    function followSpring() {
      if (!inspect) {
        return;
      }

      let request = 0;

      function draw() {
        const mark = markRef.current;
        const t = Math.max(0, (performance.now() - mark.at) / 1000 / mark.slow);
        const shown = Math.min(t, PLOT_T);
        const p = springProgress(shown);
        const x = (shown / PLOT_T) * PLOT_W;
        const y = PLOT_H - p * (PLOT_H - 4) - 2;

        dotRef.current?.setAttribute("cx", x.toFixed(1));
        dotRef.current?.setAttribute("cy", y.toFixed(1));
        trailRef.current?.setAttribute(
          "stroke-dasharray",
          `${(x * 1.6).toFixed(1)} 999`,
        );

        if (readoutRef.current) {
          readoutRef.current.textContent = Number.isFinite(t)
            ? `t ${Math.min(t, 9.99).toFixed(2)}s · ${(springProgress(t) * 100).toFixed(0)}%`
            : "t —";
        }

        request = requestAnimationFrame(draw);
      }

      request = requestAnimationFrame(draw);

      return function cleanup() {
        cancelAnimationFrame(request);
      };
    },
    [inspect, markRef],
  );

  return (
    <div data-hv-bar data-inspect={inspect ? "on" : "off"}>
      <button
        type="button"
        data-hv-inspect-toggle
        aria-pressed={inspect}
        onClick={onToggle}
      >
        <span data-hv-switch aria-hidden="true" />
        Inspect
        <kbd>I</kbd>
      </button>

      {inspect && (
        <>
          <div data-hv-speed role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map(function renderSpeed(option) {
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={speed === option.value}
                  onClick={function chooseSpeed() {
                    onSpeed(option.value);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div data-hv-spring>
            <svg
              width={PLOT_W}
              height={PLOT_H}
              viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
              aria-hidden="true"
            >
              <path
                d={SPRING_PATH}
                fill="none"
                stroke="rgba(0,0,0,0.18)"
                strokeWidth="1.5"
              />
              <path
                ref={trailRef}
                d={SPRING_PATH}
                fill="none"
                stroke={ACCENT}
                strokeWidth="1.5"
              />
              <circle
                ref={dotRef}
                r="3.5"
                fill={ACCENT}
                stroke="#fff"
                strokeWidth="1.5"
              />
            </svg>
            <span data-hv-spring-text>
              <span>
                <strong>One spring</strong> SwiftUI .smooth
              </span>
              <span>
                k {SPRING_STIFFNESS.toFixed(0)} · c {SPRING_DAMPING.toFixed(1)}{" "}
                · ζ 1.0
              </span>
              <span ref={readoutRef} data-hv-spring-live>
                t —
              </span>
            </span>
          </div>
        </>
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

  [data-hv-inspect-screen] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  [data-hv-inspect-label] text {
    font-family: ${LABEL_FONT};
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  [data-hv-bar] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 44px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
    font-size: 13px;
    color: #1d1d1f;
  }

  [data-hv-bar] button {
    margin: 0;
    border: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  [data-hv-bar] button:focus-visible {
    outline: 2px solid ${ACCENT};
    outline-offset: 2px;
  }

  [data-hv-inspect-toggle] {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    height: 36px;
    padding: 0 12px 0 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.55);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.06);
    font-weight: 600;
    transition: background-color 160ms ease, scale 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-hv-inspect-toggle] kbd {
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 5px;
    background: rgba(0, 0, 0, 0.06);
    font-family: ${LABEL_FONT};
    font-size: 11px;
    line-height: 18px;
    text-align: center;
    color: rgba(0, 0, 0, 0.5);
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

  [data-hv-speed] {
    display: inline-flex;
    height: 36px;
    padding: 3px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.06);
  }

  [data-hv-speed] button {
    min-width: 40px;
    padding: 0 10px;
    border-radius: 999px;
    background: transparent;
    font-family: ${LABEL_FONT};
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
    transition: background-color 160ms ease, color 160ms ease;
  }

  [data-hv-speed] button[aria-checked="true"] {
    background: #fff;
    color: #1d1d1f;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }

  [data-hv-spring] {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 14px 0 10px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.55);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
  }

  [data-hv-spring] svg {
    display: block;
    overflow: visible;
  }

  [data-hv-spring-text] {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: ${LABEL_FONT};
    font-size: 11px;
    line-height: 1.25;
    color: rgba(0, 0, 0, 0.6);
    white-space: nowrap;
  }

  [data-hv-spring-text] strong {
    margin-right: 4px;
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-weight: 600;
    color: #1d1d1f;
  }

  [data-hv-spring-live] {
    color: ${ACCENT};
    font-variant-numeric: tabular-nums;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-hv-inspect-toggle]:hover {
      background: rgba(255, 255, 255, 0.8);
    }
  }

  [data-hv-inspect-toggle]:active {
    scale: 0.96;
  }

  @media (max-width: 640px) {
    [data-hv-spring] {
      display: none;
    }
  }
`;
