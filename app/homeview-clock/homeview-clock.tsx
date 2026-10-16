"use client";

import { animate, motion, motionValue, useMotionValue, useReducedMotion } from "motion/react";
import type { AnimationPlaybackControls, MotionValue, Transition } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent } from "react";

/* Geometry ---------------------------------------------------------------
   Every value here was measured from the launch footage after un-skewing
   each frame (the clock card is a square, so its four edges give the
   camera's perspective). The glass is a square 880px design screen.
   Face measurements were taken on the 457px edit-mode card; `k()` converts
   them to the 496px card this file draws. */

const S = 880;
const BEZEL = 30;
const GLASS_RADIUS = 158;
const DISPLAY_INSET = 53; // the panel under the glass: widgets clip here
const DISPLAY_RADIUS = 105;

const CX = 440;
const CY = 442;
const CARD = 496;
const HALF = CARD / 2;
const CARD_RADIUS = 68;
const EDIT_SCALE = 0.9213; // the card shrinks in place; it never slides

const K = CARD / 457;

function k(value: number) {
  return Math.round(value * K * 100) / 100;
}

const NUM_PX = 288; // numerals render at the giant size and scale down
const CAP = 0.7045; // SF Pro cap height / em
const GIANT_SCALE = k(182.5) / (NUM_PX * CAP);
const DIAL_SCALE = k(49.8) / (NUM_PX * CAP);

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", "Helvetica Neue", Inter, system-ui, sans-serif';

const CARD_BLUE = "#6FA1D8";
const INK = "#101114";
const SYSTEM_BLUE = "#0A84FF";

// Picker (screen coordinates)
const RING_X = 749.5;
const RING_SIZE = 97;
const TILE = 83;
const PITCH = 108.5;
const THUMB_FACE_SCALE = 0.158;

// Edit chrome
const CONTROL = 93;
const CONTROL_Y = 745.5;

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MAJOR = new Set([12, 3, 6, 9]);

type StyleId = "giant" | "dial" | "numeralsTicks" | "ticks";

/** Top to bottom, as in the picker. The footage walks it bottom → top. */
const PICKER_ORDER: StyleId[] = ["ticks", "numeralsTicks", "dial", "giant"];

const STYLE_LABEL: Record<StyleId, string> = {
  giant: "Giant numerals",
  dial: "Numerals",
  numeralsTicks: "Numerals and ticks",
  ticks: "Ticks",
};

/* Numeral layouts (ink centres, footage card units) -------------------- */

// Dial: twelve numerals on a near-circle, r ≈ 183 (0.40 of the card).
const DIAL: Record<number, [number, number]> = {
  12: [0, -180],
  1: [93.5, -156],
  2: [160, -90],
  3: [186.5, 0],
  4: [159.75, 91.5],
  5: [91.25, 158.5],
  6: [0, 181],
  7: [-91.25, 158.5],
  8: [-159.75, 91.5],
  9: [-186.5, 0],
  10: [-160, -90],
  11: [-93.5, -156],
};

// Giant: 12, 3, 6 and 9 at 3.7× the dial size, each pinned at the same
// outer edge as its dial self (≈ 205 from centre), so shrinking reads as
// the numeral contracting into the edge rather than flying across.
const GIANT: Record<number, [number, number]> = {
  12: [-14.5, -110.5],
  3: [143, 4],
  6: [-3.5, 111.5],
  9: [-141.5, 3.5],
};

// Numerals and ticks: the same numerals pushed 60 in by the ticks.
const PUSH = 60;

// Ink-centre offsets from the text box centre, in 288px font units (SF Pro).
const INK_DX: Record<number, number> = {
  1: -10.4,
  2: 1.5,
  3: -0.9,
  4: 1.2,
  5: 3.3,
  6: -1,
  7: -0.3,
  8: 0,
  9: 1,
  10: 0.4,
  11: -10.4,
  12: 0.5,
};

const WEIGHT_GIANT = 270;
const WEIGHT_DIAL = 570;
const TRACK_GIANT = -0.115 * NUM_PX;
const TRACK_DIAL = -0.05 * NUM_PX;

type Pose = {
  x: number;
  y: number;
  scale: number;
  weight: number;
  track: number;
  visible: boolean;
};

function pose(hour: number, cx: number, cy: number, scale: number, weight: number, visible = true): Pose {
  // Position the text box so the ink centre lands on (cx, cy).
  return {
    x: Math.round((k(cx) - INK_DX[hour] * scale) * 100) / 100,
    y: Math.round(k(cy) * 100) / 100,
    scale: Math.round(scale * 10000) / 10000,
    weight,
    track: weight === WEIGHT_GIANT ? TRACK_GIANT : TRACK_DIAL,
    visible,
  };
}

function dialPose(hour: number, shrink = 1, inset = 0, visible = true, glyph = shrink) {
  const [x, y] = DIAL[hour];
  const r = Math.hypot(x, y);
  const f = ((r - inset) / r) * shrink;

  return pose(hour, x * f, y * f, DIAL_SCALE * glyph, WEIGHT_DIAL, visible);
}

/** Where each numeral sits in each style, including where hidden ones wait. */
function poseFor(style: StyleId, hour: number): Pose {
  const major = MAJOR.has(hour);

  if (style === "giant") {
    if (major) {
      const [x, y] = GIANT[hour];
      return pose(hour, x, y, GIANT_SCALE, WEIGHT_GIANT);
    }
    // Minor numerals wait inside the ring (0.67 of it, at 0.4 size) and
    // grow out to it; in the footage their travel leads their growth.
    return dialPose(hour, 0.67, 0, false, 0.4);
  }

  if (style === "dial") {
    return dialPose(hour);
  }

  // Minor numerals leave with the push, shrinking to half size as they go.
  if (style === "numeralsTicks") {
    return major ? dialPose(hour, 1, PUSH) : dialPose(hour, 1, PUSH, false, 0.5);
  }

  // Ticks only: majors pull in toward the centre (0.69) while their
  // glyphs shrink faster (0.5), as in the footage.
  return major ? dialPose(hour, 0.69, PUSH, false, 0.5) : dialPose(hour, 1, PUSH, false, 0.5);
}

/* Ticks: rays between two concentric squares ----------------------------
   Outer ends sit on a square 204 out (the numerals' edge line). Hour ticks
   run in to 140, minute ticks to 182.8, so corner ticks are longer. With
   numerals showing, the 12/3/6/9 ticks stop at 161. */

const TICK_OUT = k(204);
const TICK_IN_HOUR = k(140);
const TICK_IN_MINUTE = k(182.8);
const MAJOR_EXTENT_WITH_NUMERALS = (204 - 161) / (204 - 140);

const TICKS = Array.from({ length: 60 }, function makeTick(_, i) {
  const theta = (i / 60) * Math.PI * 2;
  const ux = Math.sin(theta);
  const uy = -Math.cos(theta);
  const m = Math.max(Math.abs(ux), Math.abs(uy));
  const hourTick = i % 5 === 0;
  const outer = TICK_OUT / m;
  const inner = (hourTick ? TICK_IN_HOUR : TICK_IN_MINUTE) / m;

  return {
    ux,
    uy,
    outer,
    length: outer - inner,
    major: i % 15 === 0,
    width: hourTick ? k(3.7) : k(1.4),
  };
});

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function tickPoints(tick: (typeof TICKS)[number], grow: number, majorExtent: number) {
  const reach = tick.outer - tick.length * grow * (tick.major ? majorExtent : 1);

  return {
    x1: round2(tick.ux * tick.outer),
    y1: round2(tick.uy * tick.outer),
    x2: round2(tick.ux * reach),
    y2: round2(tick.uy * reach),
  };
}

function hasTicks(style: StyleId) {
  return style === "numeralsTicks" || style === "ticks";
}

/* Date ------------------------------------------------------------------- */

const CORNER_DATE_LEFT = k(-197);
const CORNER_DATE_Y = k(189);
const TOP_DATE_Y: Record<StyleId, number> = {
  giant: k(-86),
  dial: k(-86),
  numeralsTicks: k(-58.5),
  ticks: k(-81.5),
};

/* Timing -----------------------------------------------------------------
   The house spring is SwiftUI's smooth spring: critically damped, 0.5s
   response (ω = 4π). Fitted to the footage it tracks the card's shrink and
   every numeral's travel to within 2% at each frame. The picker scroll is
   a separate ~300ms ease-in-out (its velocity curve is symmetric). */

const SPRING_STIFFNESS = 157.91;
const SPRING_DAMPING = 25.13;

type Bezier = [number, number, number, number];

const EASE_OUT: Bezier = [0.22, 0.61, 0.36, 1];
const EASE_IN: Bezier = [0.4, 0, 1, 1];
const EASE_IN_OUT: Bezier = [0.4, 0, 0.6, 1];
const EASE_SINE: Bezier = [0.37, 0, 0.63, 1];
const LINEAR: Bezier = [0, 0, 1, 1];

type DebugConfig = { slow: number; timeOffsetMs: number; frozenAt: number | null };

function readDebugConfig(): DebugConfig {
  if (typeof window === "undefined") {
    return { slow: 1, timeOffsetMs: 0, frozenAt: null };
  }

  const params = new URLSearchParams(window.location.search);
  const slow = Math.max(1, Number(params.get("slow")) || 1);
  let timeOffsetMs = 0;
  const time = params.get("time");

  const date = params.get("date");

  if (time || date) {
    const [h = 0, m = 0, s = 0] = (time ?? "").split(":").map(Number);
    const target = date ? new Date(`${date}T00:00:00`) : new Date();

    if (time) {
      target.setHours(h, m, s, 0);
    }

    timeOffsetMs = target.getTime() - Date.now();
  }

  // `freeze` holds the hands still, as on Apple's demo units (10:09:30).
  const frozenAt = params.has("freeze") ? Date.now() + timeOffsetMs : null;

  return { slow, timeOffsetMs, frozenAt };
}

/* Clock face pieces --------------------------------------------------------- */

type NumeralValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  weight: MotionValue<number>;
  track: MotionValue<string>;
  opacity: MotionValue<number>;
};

function createNumeralValues(style: StyleId): NumeralValues[] {
  return HOURS.map(function create(hour) {
    const p = poseFor(style, hour);

    return {
      x: motionValue(p.x),
      y: motionValue(p.y),
      scale: motionValue(p.scale),
      weight: motionValue(p.weight),
      track: motionValue(`${p.track}px`),
      opacity: motionValue(p.visible ? 1 : 0),
    };
  });
}

function NumeralText({ hour, track }: { hour: number; track?: MotionValue<string> | string }) {
  const text = String(hour);

  if (text.length === 1) {
    return <>{text}</>;
  }

  // Tracking sits on the first digit only, so no trailing space shifts the ink.
  return (
    <>
      <motion.span style={{ letterSpacing: track }}>{text[0]}</motion.span>
      {text.slice(1)}
    </>
  );
}

/** A static miniature of a style for the picker: white line art on a tile. */
function ThumbFace({ style }: { style: StyleId }) {
  const ticks = hasTicks(style);
  const extent = style === "ticks" ? 1 : MAJOR_EXTENT_WITH_NUMERALS;

  return (
    <span data-hv-thumb-face aria-hidden="true">
      <span data-hv-thumb-canvas style={{ transform: `scale(${THUMB_FACE_SCALE})` }}>
        {ticks && (
          <svg viewBox={`${-HALF} ${-HALF} ${CARD} ${CARD}`} width={CARD} height={CARD} data-hv-ticks>
            {TICKS.map(function renderThumbTick(tick, i) {
              const p = tickPoints(tick, 1, extent);

              return <line key={i} {...p} stroke="#fff" strokeWidth={tick.width * 1.4} />;
            })}
          </svg>
        )}
        {HOURS.map(function renderThumbNumeral(hour) {
          const p = poseFor(style, hour);

          if (!p.visible) {
            return null;
          }

          return (
            <span
              key={hour}
              data-hv-numeral
              style={{
                transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
                fontWeight: p.weight + 60,
                color: "#fff",
              }}
            >
              <NumeralText hour={hour} track={`${p.track}px`} />
            </span>
          );
        })}
      </span>
    </span>
  );
}

function formatDate(date: Date) {
  const day = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

  return `${day} ${date.getDate()}`;
}

/* Component ---------------------------------------------------------------- */

export function HomeviewClock() {
  const reducedMotion = Boolean(useReducedMotion());

  const debugRef = useRef<DebugConfig>({ slow: 1, timeOffsetMs: 0, frozenAt: null });
  const controlsRef = useRef<Set<AnimationPlaybackControls>>(new Set());
  const styleRef = useRef<StyleId>("giant");
  const styleBeforeEditRef = useRef<StyleId>("giant");
  const modeRef = useRef<"home" | "edit">("home");
  const wheelLockRef = useRef(0);
  const wheelAccumRef = useRef(0);
  const dragRef = useRef<{ startY: number; startOffset: number; id: number } | null>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const tickRefs = useRef<(SVGLineElement | null)[]>([]);

  const [style, setStyle] = useState<StyleId>("giant");
  const [mode, setMode] = useState<"home" | "edit">("home");
  const [dateLabel, setDateLabel] = useState("TUE 13");
  const [fitScale, setFitScale] = useState(1);
  const [announcement, setAnnouncement] = useState("");

  const [numerals] = useState(function initNumerals() {
    return createNumeralValues("giant");
  });

  // Hands
  const hourAngle = useMotionValue(304.75);
  const minuteAngle = useMotionValue(57);
  const secondAngle = useMotionValue(180);

  // Card and face
  const cardScale = useMotionValue(1);
  const tickGrow = useMotionValue(0);
  const majorExtent = useMotionValue(MAJOR_EXTENT_WITH_NUMERALS);
  const ticksOpacity = useMotionValue(0);
  const cornerDateOpacity = useMotionValue(1);
  const topDateOpacity = useMotionValue(0);
  const topDateY = useMotionValue(TOP_DATE_Y.dial);

  // Home chrome
  const widgetX = useMotionValue(0);
  const widgetOpacity = useMotionValue(1);
  const homeOpacity = useMotionValue(1);

  // Edit chrome: it lands as one piece, almost a cut, once the card settles.
  const editOpacity = useMotionValue(0);
  const pickerY = useMotionValue(-PICKER_ORDER.indexOf("giant") * PITCH);

  /* Timing helpers. `slow` scales everything consistently for frame
     comparison: durations ×slow, spring stiffness ÷slow², damping ÷slow. */

  function spring(delay = 0): Transition {
    const slow = debugRef.current.slow;

    if (reducedMotion) {
      return { duration: 0.15, delay: 0, ease: EASE_OUT };
    }

    return {
      type: "spring",
      stiffness: SPRING_STIFFNESS / (slow * slow),
      damping: SPRING_DAMPING / slow,
      mass: 1,
      delay: delay * slow,
    };
  }

  function tween(duration: number, delay = 0, ease: Bezier = EASE_OUT): Transition {
    const slow = debugRef.current.slow;

    if (reducedMotion) {
      return { duration: Math.min(duration, 0.15), delay: 0, ease };
    }

    return { duration: duration * slow, delay: delay * slow, ease };
  }

  function run<T extends number | string>(value: MotionValue<T>, to: T, transition: Transition) {
    const controls = animate(value as unknown as MotionValue<number>, to as number, transition);
    const registry = controlsRef.current;

    registry.add(controls);
    void controls.then(function release() {
      registry.delete(controls);
    });

    return controls;
  }

  function setPose(values: NumeralValues, p: Pose) {
    values.x.set(p.x);
    values.y.set(p.y);
    values.scale.set(p.scale);
    values.weight.set(p.weight);
    values.track.set(`${p.track}px`);
  }

  function springPose(values: NumeralValues, p: Pose, delay = 0) {
    run(values.x, p.x, spring(delay));
    run(values.y, p.y, spring(delay));
    run(values.scale, p.scale, spring(delay));
    run(values.weight, p.weight, spring(delay));
    run(values.track, `${p.track}px`, spring(delay));
  }

  /* Style changes ------------------------------------------------------------
     One spring drives the face. Numerals shared by both styles travel;
     appearing ones start from where that style keeps them hidden and fade
     in on the way; leaving ones travel to where the new style hides them
     while fading. Ticks grow inward from their outer square on the same
     spring as the numerals retreat, so they read as pushing them in. */

  function changeStyle(to: StyleId) {
    const from = styleRef.current;

    run(pickerY, -PICKER_ORDER.indexOf(to) * PITCH, tween(0.3, 0, EASE_SINE));

    if (to === from) {
      return;
    }

    styleRef.current = to;
    setStyle(to);
    setAnnouncement(`${STYLE_LABEL[to]} style`);

    HOURS.forEach(function moveNumeral(hour, i) {
      const values = numerals[i];
      const target = poseFor(to, hour);
      const showing = values.opacity.get() > 0.01;

      if (target.visible) {
        if (!showing) {
          setPose(values, poseFor(from, hour));
          run(values.opacity, 1, tween(0.2, 0.08, EASE_OUT));
        } else {
          run(values.opacity, 1, tween(0.12));
        }

        springPose(values, target);
        return;
      }

      if (!showing) {
        setPose(values, target);
        return;
      }

      // Majors leaving for the ticks-only face hold a beat while their ticks
      // reach them, then contract on a 0.4s ease-out as they fade.
      if (MAJOR.has(hour) && to === "ticks") {
        const contract = tween(0.4, 0.025, EASE_OUT);

        run(values.x, target.x, contract);
        run(values.y, target.y, contract);
        run(values.scale, target.scale, contract);
        run(values.opacity, 0, tween(0.3, 0.085, EASE_OUT));
        return;
      }

      springPose(values, target);
      run(values.opacity, 0, tween(0.3, 0, EASE_OUT));
    });

    // Ticks
    if (hasTicks(to)) {
      run(majorExtent, to === "ticks" ? 1 : MAJOR_EXTENT_WITH_NUMERALS, spring());
    }

    if (hasTicks(to) !== hasTicks(from)) {
      run(tickGrow, hasTicks(to) ? 1 : 0, spring());
      run(ticksOpacity, hasTicks(to) ? 1 : 0, hasTicks(to) ? tween(0.2, 0.04) : tween(0.18));
    }

    // The date moves house between the giant face and the rest.
    if (to === "giant") {
      run(topDateOpacity, 0, tween(0.12));
      run(cornerDateOpacity, 1, tween(0.16, 0.1, EASE_IN_OUT));
    } else if (from === "giant") {
      run(cornerDateOpacity, 0, tween(0.15, 0.045, LINEAR));
      topDateY.set(TOP_DATE_Y[to] + 8);
      run(topDateY, TOP_DATE_Y[to], spring());
      run(topDateOpacity, 1, tween(0.08, 0.12, LINEAR));
    } else {
      run(topDateY, TOP_DATE_Y[to], spring());
    }
  }

  /* Customize mode --------------------------------------------------------
     Footage: the card shrinks in place on the house spring while the home
     chrome fades and the widget slides away right; at ~330ms, as the card
     settles, the whole edit layer appears at once. */

  function enterEdit() {
    if (modeRef.current === "edit") {
      return;
    }

    modeRef.current = "edit";
    styleBeforeEditRef.current = styleRef.current;
    setMode("edit");
    setAnnouncement("Customizing clock. Choose a style.");

    run(cardScale, EDIT_SCALE, spring());
    run(homeOpacity, 0, tween(0.2, 0.04, EASE_IN_OUT));
    run(widgetX, 115, spring());
    run(widgetOpacity, 0, tween(0.2, 0.08, EASE_IN));
    run(editOpacity, 1, tween(0.03, 0.315, LINEAR));
  }

  function exitEdit(keep: boolean) {
    if (modeRef.current === "home") {
      return;
    }

    if (!keep && styleRef.current !== styleBeforeEditRef.current) {
      changeStyle(styleBeforeEditRef.current);
    }

    modeRef.current = "home";
    setMode("home");
    setAnnouncement(keep ? "Clock style saved." : "Changes discarded.");

    // The mirror: edit layer out at once, card grows back, home returns.
    run(editOpacity, 0, tween(0.05, 0, LINEAR));
    run(cardScale, 1, spring(0.02));
    run(widgetX, 0, spring(0.02));
    run(widgetOpacity, 1, tween(0.25, 0.06));
    run(homeOpacity, 1, tween(0.22, 0.12, EASE_IN_OUT));
  }

  function stepStyle(direction: 1 | -1) {
    const index = PICKER_ORDER.indexOf(styleRef.current);
    const next = Math.min(PICKER_ORDER.length - 1, Math.max(0, index + direction));

    changeStyle(PICKER_ORDER[next]);
  }

  /* Picker gestures ------------------------------------------------------- */

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (modeRef.current !== "edit") {
      return;
    }

    const now = performance.now();

    wheelAccumRef.current += event.deltaY;

    if (now < wheelLockRef.current || Math.abs(wheelAccumRef.current) < 40) {
      return;
    }

    stepStyle(wheelAccumRef.current > 0 ? 1 : -1);
    wheelAccumRef.current = 0;
    wheelLockRef.current = now + 260;
  }

  function handlePickerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || modeRef.current !== "edit") {
      return;
    }

    dragRef.current = { startY: event.clientY, startOffset: pickerY.get(), id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePickerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) {
      return;
    }

    const min = -(PICKER_ORDER.length - 1) * PITCH;
    const raw = drag.startOffset + (event.clientY - drag.startY) / fitScale;

    pickerY.set(Math.min(PITCH * 0.35, Math.max(min - PITCH * 0.35, raw)));
  }

  function handlePickerPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    if (Math.abs(pickerY.get() - drag.startOffset) < 6) {
      return;
    }

    const index = Math.round(-pickerY.get() / PITCH);

    changeStyle(PICKER_ORDER[Math.min(PICKER_ORDER.length - 1, Math.max(0, index))]);
  }

  /* Effects ---------------------------------------------------------------- */

  const shortcutsRef = useRef({ step: stepStyle, exit: exitEdit, enter: enterEdit, change: changeStyle });

  useEffect(function refreshShortcuts() {
    shortcutsRef.current = { step: stepStyle, exit: exitEdit, enter: enterEdit, change: changeStyle };
  });

  useEffect(function initDebugAndDate() {
    debugRef.current = readDebugConfig();
    setDateLabel(formatDate(new Date(Date.now() + debugRef.current.timeOffsetMs)));

    const registry = controlsRef.current;

    if (new URLSearchParams(window.location.search).has("debug")) {
      // Frame-by-frame verification: pause everything and seek to t seconds.
      (window as typeof window & { __hv?: unknown }).__hv = {
        seek(seconds: number) {
          registry.forEach(function seekControls(controls) {
            controls.pause();
            controls.time = seconds;
          });
        },
        resume() {
          registry.forEach(function resumeControls(controls) {
            controls.play();
          });
        },
        enter() {
          shortcutsRef.current.enter();
        },
        exit(keep: boolean) {
          shortcutsRef.current.exit(keep);
        },
        change(next: StyleId) {
          shortcutsRef.current.change(next);
        },
      };
    }
  }, []);

  useEffect(
    function runHands() {
      let frame = 0;

      function tick() {
        const { frozenAt, timeOffsetMs } = debugRef.current;
        const now = new Date(frozenAt ?? Date.now() + timeOffsetMs);
        const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
        const minutes = now.getMinutes() + seconds / 60;
        const hours = (now.getHours() % 12) + minutes / 60;

        secondAngle.set(seconds * 6);
        minuteAngle.set(minutes * 6);
        hourAngle.set(hours * 30);
        frame = requestAnimationFrame(tick);
      }

      frame = requestAnimationFrame(tick);

      return function cleanup() {
        cancelAnimationFrame(frame);
      };
    },
    [hourAngle, minuteAngle, secondAngle],
  );

  // Ticks are 60 SVG lines whose inner ends follow two motion values.
  useEffect(
    function driveTicks() {
      function update() {
        const grow = tickGrow.get();
        const extent = majorExtent.get();

        TICKS.forEach(function placeTick(tick, i) {
          const line = tickRefs.current[i];

          if (!line) {
            return;
          }

          const p = tickPoints(tick, grow, extent);

          line.setAttribute("x2", String(p.x2));
          line.setAttribute("y2", String(p.y2));
        });
      }

      const stopGrow = tickGrow.on("change", update);
      const stopExtent = majorExtent.on("change", update);

      update();

      return function cleanup() {
        stopGrow();
        stopExtent();
      };
    },
    [tickGrow, majorExtent],
  );

  // The fit box is sized in CSS (so the first paint is already right, with
  // no page overflow on phones); the device scales to whatever width it got.
  useEffect(function fitToBox() {
    const box = fitRef.current;

    if (box === null) {
      return;
    }

    const element: HTMLDivElement = box;

    function measure() {
      setFitScale(element.clientWidth / DEVICE);
    }

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return function cleanup() {
      observer.disconnect();
    };
  }, []);

  useEffect(function bindKeys() {
    function handleKeyDown(event: KeyboardEvent) {
      if (modeRef.current !== "edit") {
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        shortcutsRef.current.step(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        shortcutsRef.current.step(1);
      } else if (event.key === "Escape") {
        shortcutsRef.current.exit(false);
      } else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        shortcutsRef.current.exit(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const editing = mode === "edit";

  return (
    <div ref={fitRef} data-hv-fit>
      <div data-hv-device style={{ transform: `scale(${fitScale})` }}>
        <div data-hv-screen data-mode={mode}>
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>

          <div data-hv-display>
            {/* Home chrome ------------------------------------------------- */}

            <motion.span data-hv-label aria-hidden={editing} style={{ opacity: homeOpacity }}>
              ANALOG
            </motion.span>

            <motion.div data-hv-widget aria-hidden="true" style={{ x: widgetX, opacity: widgetOpacity }}>
              <div data-hv-widget-top>
                <strong>{dateLabel}</strong>
                <span>
                  <SunriseIcon /> 6:52
                </span>
              </div>
              <div data-hv-widget-bottom>
                <SunIcon /> 72°
              </div>
            </motion.div>

            {/* The clock card ---------------------------------------------- */}

            <motion.div data-hv-card style={{ scale: cardScale }}>
              <div data-hv-card-fill role="img" aria-label={`Analog clock, ${STYLE_LABEL[style]} style`}>
                <div data-hv-face>
                  <motion.svg
                    viewBox={`${-HALF} ${-HALF} ${CARD} ${CARD}`}
                    width={CARD}
                    height={CARD}
                    aria-hidden="true"
                    data-hv-ticks
                    style={{ opacity: ticksOpacity }}
                  >
                    {TICKS.map(function renderTick(tick, i) {
                      const p = tickPoints(tick, 0, MAJOR_EXTENT_WITH_NUMERALS);

                      return (
                        <line
                          key={i}
                          ref={function keepTick(node) {
                            tickRefs.current[i] = node;
                          }}
                          {...p}
                          stroke={INK}
                          strokeWidth={tick.width}
                        />
                      );
                    })}
                  </motion.svg>

                  {HOURS.map(function renderNumeral(hour, i) {
                    const values = numerals[i];

                    return (
                      <motion.span
                        key={hour}
                        data-hv-numeral
                        style={{
                          x: values.x,
                          y: values.y,
                          scale: values.scale,
                          opacity: values.opacity,
                          fontWeight: values.weight,
                        }}
                      >
                        <NumeralText hour={hour} track={values.track} />
                      </motion.span>
                    );
                  })}

                  <motion.span
                    data-hv-date
                    data-corner
                    style={{ x: CORNER_DATE_LEFT, y: CORNER_DATE_Y, opacity: cornerDateOpacity }}
                  >
                    {dateLabel}
                  </motion.span>

                  <motion.span data-hv-date style={{ x: 0, y: topDateY, opacity: topDateOpacity }}>
                    {dateLabel}
                  </motion.span>

                  <div data-hv-hands aria-hidden="true">
                    <motion.span data-hv-hand="hour" style={{ rotate: hourAngle }}>
                      <i />
                    </motion.span>
                    <motion.span data-hv-hand="minute" style={{ rotate: minuteAngle }}>
                      <i />
                    </motion.span>
                    <motion.span data-hv-hand="second" style={{ rotate: secondAngle }} />
                    <span data-hv-pivot />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.button
              type="button"
              data-hv-glass
              data-hv-customize
              tabIndex={editing ? -1 : 0}
              aria-hidden={editing}
              style={{ opacity: homeOpacity }}
              onClick={enterEdit}
            >
              Customize
            </motion.button>

            <motion.button
              type="button"
              data-hv-glass
              data-hv-round
              data-hv-plus
              tabIndex={editing ? -1 : 0}
              aria-hidden={editing}
              aria-label="Add widget"
              style={{ opacity: homeOpacity }}
            >
              <PlusIcon />
            </motion.button>

            {/* Edit chrome ------------------------------------------------- */}

            <motion.div data-hv-edit style={{ opacity: editOpacity }}>
              <span data-hv-outline aria-hidden="true" />

              <div data-hv-tabs role="tablist" aria-hidden={!editing}>
                <button type="button" role="tab" aria-selected="true" tabIndex={editing ? 0 : -1} style={{ left: 440.5 }}>
                  STYLE
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected="false"
                  aria-disabled="true"
                  tabIndex={-1}
                  style={{ left: 590.5 }}
                >
                  COLOR
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected="false"
                  aria-disabled="true"
                  tabIndex={-1}
                  style={{ left: 740 }}
                >
                  FONT
                </button>
              </div>

              <div
                data-hv-picker
                role="radiogroup"
                aria-label="Clock style"
                aria-hidden={!editing}
                onWheel={handleWheel}
                onPointerDown={handlePickerPointerDown}
                onPointerMove={handlePickerPointerMove}
                onPointerUp={handlePickerPointerUp}
                onPointerCancel={handlePickerPointerUp}
              >
                <motion.div data-hv-picker-list style={{ y: pickerY }}>
                  {PICKER_ORDER.map(function renderThumb(id, index) {
                    const selected = id === style;

                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={STYLE_LABEL[id]}
                        tabIndex={editing && selected ? 0 : -1}
                        data-hv-thumb
                        style={{ top: index * PITCH }}
                        onClick={function selectStyle() {
                          changeStyle(id);
                        }}
                      >
                        <ThumbFace style={id} />
                      </button>
                    );
                  })}
                </motion.div>
              </div>
              <span data-hv-picker-ring aria-hidden="true" />

              <button
                type="button"
                data-hv-glass
                data-hv-round
                data-hv-cancel
                aria-label="Cancel"
                aria-hidden={!editing}
                tabIndex={editing ? 0 : -1}
                onClick={function cancel() {
                  exitEdit(false);
                }}
              >
                <CloseIcon />
              </button>

              <button
                type="button"
                data-hv-round
                data-hv-done
                aria-label="Done"
                aria-hidden={!editing}
                tabIndex={editing ? 0 : -1}
                onClick={function done() {
                  exitEdit(true);
                }}
              >
                <CheckIcon />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{STYLES}</style>
    </div>
  );
}

/* Icons --------------------------------------------------------------------- */

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5v17M3.5 12h17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 4.5l15 15M19.5 4.5l-15 15" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 12.8l5.2 5.2L20 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <path
        d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SunriseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 17a6 6 0 0112 0" fill="currentColor" />
      <path
        d="M3 17h18M12 4v5M9.5 6.5L12 4l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/* Styles -------------------------------------------------------------------- */

const DEVICE = S + BEZEL * 2;
const OUTLINE_GAP = 3.5;
const OUTLINE_STROKE = 4;
const OUTLINE_SIZE = CARD * EDIT_SCALE + (OUTLINE_GAP + OUTLINE_STROKE) * 2;

// Hands, in card units from the pivot
const HOUR_FROM = k(29);
const HOUR_TO = k(120.5);
const MINUTE_FROM = k(30);
const MINUTE_TO = k(202.5);
const HAND_WIDTH = k(17);
const STEM_WIDTH = k(3.8);
const SECOND_TAIL = k(32);
const SECOND_TO = k(207);

const STYLES = `
  [data-hv-fit] {
    position: relative;
    width: min(${DEVICE}px, calc(100vw - 32px), calc(100svh - 48px));
    aspect-ratio: 1;
  }

  [data-hv-device] {
    position: absolute;
    left: 0;
    top: 0;
    width: ${DEVICE}px;
    height: ${DEVICE}px;
    padding: ${BEZEL}px;
    border-radius: ${GLASS_RADIUS + BEZEL}px;
    transform-origin: 0 0;
    background:
      linear-gradient(155deg, #f1f0ec 0%, #cfcec9 34%, #b7b6b1 58%, #dcdbd6 100%);
    box-shadow:
      inset 0 1.5px 0 rgba(255, 255, 255, 0.85),
      inset 0 -1.5px 0 rgba(0, 0, 0, 0.14),
      0 2px 4px rgba(0, 0, 0, 0.1),
      0 48px 90px -40px rgba(0, 0, 0, 0.55);
  }

  [data-hv-screen] {
    position: relative;
    width: ${S}px;
    height: ${S}px;
    overflow: clip;
    border-radius: ${GLASS_RADIUS}px;
    background: #000;
    color: #fff;
    font-family: ${FONT};
    isolation: isolate;
    user-select: none;
    -webkit-user-select: none;
    box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.55);
  }

  [data-hv-display] {
    position: absolute;
    inset: 0;
    clip-path: inset(${DISPLAY_INSET}px round ${DISPLAY_RADIUS}px);
  }

  :where([data-hv-screen]) button {
    margin: 0;
    padding: 0;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  [data-hv-screen] button:focus-visible {
    outline: 3px solid ${SYSTEM_BLUE};
    outline-offset: 4px;
  }

  /* Home chrome */

  [data-hv-label] {
    position: absolute;
    left: ${CX}px;
    top: 141.5px;
    translate: -50% -50%;
    font-size: 27px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.01em;
    text-box: trim-both cap alphabetic;
    color: #fff;
  }

  [data-hv-widget] {
    position: absolute;
    left: 722px;
    top: ${CY - HALF}px;
    width: 300px;
    height: ${CARD}px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 33px 42px 38px;
    border-radius: 46px;
    background: #2c5a60;
    font-size: 28px;
    font-weight: 600;
    line-height: 1.1;
  }

  [data-hv-widget-top] {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  [data-hv-widget-top] strong {
    font-weight: 700;
    color: #f3cfe0;
  }

  [data-hv-widget-top] span,
  [data-hv-widget-bottom] {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  [data-hv-widget] svg {
    width: 24px;
    height: 24px;
  }

  [data-hv-customize] {
    position: absolute;
    left: ${CX - 130}px;
    top: ${749 - 38.5}px;
    width: 260px;
    height: 77px;
    border-radius: 999px;
    font-size: 26.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  /* Card */

  [data-hv-card] {
    position: absolute;
    left: ${CX - HALF}px;
    top: ${CY - HALF}px;
    width: ${CARD}px;
    height: ${CARD}px;
  }

  [data-hv-card-fill] {
    position: absolute;
    inset: 0;
    overflow: clip;
    border-radius: ${CARD_RADIUS}px;
    background: linear-gradient(180deg, #78a8dd 0%, ${CARD_BLUE} 55%, #6a9cd4 100%);
  }

  [data-hv-face] {
    position: absolute;
    left: ${HALF}px;
    top: ${HALF}px;
    width: 0;
    height: 0;
  }

  [data-hv-ticks] {
    position: absolute;
    left: ${-HALF}px;
    top: ${-HALF}px;
    display: block;
    overflow: visible;
  }

  [data-hv-numeral] {
    position: absolute;
    left: 0;
    top: 0;
    translate: -50% -50%;
    font-size: ${NUM_PX}px;
    line-height: 1;
    text-box: trim-both cap alphabetic;
    color: ${INK};
    white-space: nowrap;
    transform-origin: 50% 50%;
  }

  [data-hv-date] {
    position: absolute;
    left: 0;
    top: 0;
    translate: -50% -50%;
    font-size: ${k(24.8)}px;
    font-weight: 520;
    line-height: 1;
    text-box: trim-both cap alphabetic;
    color: ${INK};
    white-space: nowrap;
  }

  [data-hv-date][data-corner] {
    translate: 0 -50%;
  }

  /* Hands: drawn pointing at 12 from the pivot, then rotated. */

  [data-hv-hands] {
    position: absolute;
    left: 0;
    top: 0;
    filter: drop-shadow(0 1px 1.5px rgba(10, 20, 40, 0.28));
  }

  [data-hv-hand] {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }

  [data-hv-hand]::before {
    content: "";
    position: absolute;
    left: ${-STEM_WIDTH / 2}px;
    width: ${STEM_WIDTH}px;
    border-radius: 2px;
    background: #fbf8f1;
  }

  [data-hv-hand="hour"]::before {
    top: ${-HOUR_FROM - 4}px;
    height: ${HOUR_FROM + 4}px;
  }

  [data-hv-hand="minute"]::before {
    top: ${-MINUTE_FROM - 4}px;
    height: ${MINUTE_FROM + 4}px;
  }

  [data-hv-hand] i {
    position: absolute;
    left: ${-HAND_WIDTH / 2}px;
    width: ${HAND_WIDTH}px;
    border-radius: 999px;
    background: #f2e9d6;
    box-shadow: inset 0 0 0 1.5px #fdfbf6;
  }

  [data-hv-hand="hour"] i {
    top: ${-HOUR_TO}px;
    height: ${HOUR_TO - HOUR_FROM}px;
  }

  [data-hv-hand="minute"] i {
    top: ${-MINUTE_TO}px;
    height: ${MINUTE_TO - MINUTE_FROM}px;
  }

  [data-hv-hand="second"]::before {
    left: ${-k(1.5)}px;
    top: ${-SECOND_TO}px;
    width: ${k(3)}px;
    height: ${SECOND_TO + SECOND_TAIL}px;
    border-radius: 1px;
    background: #f8f6f1;
  }

  [data-hv-pivot] {
    position: absolute;
    left: ${-k(8.5)}px;
    top: ${-k(8.5)}px;
    width: ${k(17)}px;
    height: ${k(17)}px;
    border-radius: 50%;
    background: #fbf8f1;
  }

  [data-hv-pivot]::after {
    content: "";
    position: absolute;
    inset: ${k(6.5)}px;
    border-radius: 50%;
    background: #8c8a86;
  }

  /* Glass controls */

  [data-hv-glass] {
    background: rgba(255, 255, 255, 0.11);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      inset 0 0 0 1px rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    transition: background-color 160ms ease, scale 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-hv-round] {
    position: absolute;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  [data-hv-plus] {
    left: ${747.5 - 36}px;
    top: ${750 - 36}px;
    width: 72px;
    height: 72px;
  }

  [data-hv-plus] svg {
    width: 36px;
    height: 36px;
  }

  [data-hv-cancel],
  [data-hv-done] {
    top: ${CONTROL_Y - CONTROL / 2}px;
    width: ${CONTROL}px;
    height: ${CONTROL}px;
  }

  [data-hv-cancel] {
    left: ${136.5 - CONTROL / 2}px;
  }

  [data-hv-done] {
    left: ${743.5 - CONTROL / 2}px;
    background: ${SYSTEM_BLUE};
    transition: background-color 160ms ease, scale 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-hv-cancel] svg {
    width: 34px;
    height: 34px;
  }

  [data-hv-done] svg {
    width: 40px;
    height: 40px;
  }

  /* Edit chrome */

  [data-hv-edit] {
    position: absolute;
    inset: 0;
  }

  [data-hv-outline] {
    position: absolute;
    left: ${CX - OUTLINE_SIZE / 2}px;
    top: ${CY - OUTLINE_SIZE / 2}px;
    width: ${OUTLINE_SIZE}px;
    height: ${OUTLINE_SIZE}px;
    border: ${OUTLINE_STROKE}px solid #fff;
    border-radius: ${CARD_RADIUS * EDIT_SCALE + OUTLINE_GAP + OUTLINE_STROKE}px;
    pointer-events: none;
  }

  /* Tabs scroll as a strip with the selected one centred; it fades out
     at both ends. */

  [data-hv-tabs] {
    position: absolute;
    left: 0;
    top: 100px;
    width: ${S}px;
    height: 84px;
    -webkit-mask-image: linear-gradient(90deg, transparent 120px, #000 170px, #000 712px, transparent 762px);
    mask-image: linear-gradient(90deg, transparent 120px, #000 170px, #000 712px, transparent 762px);
  }

  [data-hv-tabs] button {
    position: absolute;
    top: 41px;
    translate: -50% -50%;
    padding: 18px 16px;
    font-size: 27px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1;
    color: rgba(255, 255, 255, 0.3);
  }

  [data-hv-tabs] button[aria-selected="true"] {
    color: #fff;
  }

  [data-hv-tabs] button[aria-disabled="true"] {
    cursor: default;
  }

  [data-hv-picker] {
    position: absolute;
    left: ${RING_X - 60}px;
    top: 112px;
    width: 120px;
    height: 680px;
    overflow: clip;
    touch-action: none;
    -webkit-mask-image: linear-gradient(180deg, transparent 80px, #000 230px, #000 450px, transparent 680px);
    mask-image: linear-gradient(180deg, transparent 80px, #000 230px, #000 450px, transparent 680px);
  }

  [data-hv-picker-list] {
    position: absolute;
    left: 0;
    top: ${CY - 112}px;
    width: 120px;
    height: 0;
  }

  [data-hv-thumb] {
    position: absolute;
    left: ${60 - TILE / 2}px;
    margin-top: ${-TILE / 2}px;
    width: ${TILE}px;
    height: ${TILE}px;
    border-radius: 19px;
    background: #262629;
    transition: scale 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-hv-picker-ring] {
    position: absolute;
    left: ${RING_X - RING_SIZE / 2}px;
    top: ${CY - RING_SIZE / 2}px;
    width: ${RING_SIZE}px;
    height: ${RING_SIZE}px;
    border: 4px solid #fff;
    border-radius: 25px;
    pointer-events: none;
  }

  [data-hv-thumb-face] {
    position: absolute;
    inset: 0;
    overflow: clip;
    border-radius: inherit;
  }

  [data-hv-thumb-canvas] {
    position: absolute;
    left: ${TILE / 2}px;
    top: ${TILE / 2}px;
    width: 0;
    height: 0;
    transform-origin: 0 0;
  }

  /* States */

  [data-hv-screen][data-mode="home"] [data-hv-edit],
  [data-hv-screen][data-mode="edit"] [data-hv-customize],
  [data-hv-screen][data-mode="edit"] [data-hv-plus] {
    pointer-events: none;
  }

  [data-hv-glass]:active,
  [data-hv-done]:active,
  [data-hv-thumb]:active {
    scale: 0.96;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-hv-glass]:hover {
      background: rgba(255, 255, 255, 0.17);
    }

    [data-hv-done]:hover {
      background: #2b95ff;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-hv-glass],
    [data-hv-done],
    [data-hv-thumb] {
      transition-duration: 0.01ms;
    }
  }
`;
