"use client";

import {
  animate,
  motion,
  motionValue,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import type {
  AnimationPlaybackControls,
  MotionValue,
  Transition,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent } from "react";

/* Geometry ---------------------------------------------------------------
   Everything is laid out on a fixed 880 × 815 design screen and scaled to
   fit, so every position below is in design pixels. Proportions come from
   the launch footage (briefs/apple-homeview-clock.md). */

const W = 880;
const H = 815;
const BEZEL = 14;
const TOTAL_W = W + BEZEL * 2;
const TOTAL_H = H + BEZEL * 2;

const CARD = 510;
const HALF = CARD / 2;
const CARD_RADIUS = 104;
const CARD_Y = 398;
const HOME_X = Math.round(W * 0.44);
const EDIT_X = W / 2;

const NUM_EM = 232; // numerals render this large and scale down (stays crisp)
const DIAL_EM = 72;
const BOLD_EM = 80;

const THUMB = 78;
const THUMB_PITCH = 96;
const PICKER_X = Math.round(W * 0.885);
const PICKER_H = CARD;

const CARD_BLUE = "#6C9FDB";
const SYSTEM_BLUE = "#0A84FF";
const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", "Helvetica Neue", Inter, system-ui, sans-serif';

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

type Pose = {
  x: number;
  y: number;
  scale: number;
  scaleX: number;
  weight: number;
  visible: boolean;
};

/** A point on the card's squircle (superellipse) edge, `inset` from it. */
function edgePoint(hour: number, inset: number, n = 4) {
  const a = HALF - inset;
  const theta = (hour / 12) * Math.PI * 2;
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const r = a / Math.pow(Math.abs(s) ** n + Math.abs(c) ** n, 1 / n);

  // Rounded so server and client render identical geometry (hydration).
  return { x: Math.round(r * s * 100) / 100, y: Math.round(-r * c * 100) / 100 };
}

// Measured from frame 76, normalised to the card and corrected for the
// camera's tilt. 12 sits left of centre and 3 rides high: they interlock.
const GIANT_POSE: Record<number, { x: number; y: number }> = {
  12: { x: -34, y: -124 },
  9: { x: -124, y: 4 },
  3: { x: 136, y: -34 },
  6: { x: 46, y: 104 },
};

// Numerals ride a rounder path than the card edge (n ≈ 3, not 4.2):
// Apple tucks 10 and 2 in rather than pushing them into the corners.
function dialPose(hour: number): Pose {
  const p = edgePoint(hour, 78, 3);

  return {
    x: p.x,
    y: p.y,
    scale: DIAL_EM / NUM_EM,
    scaleX: 1,
    weight: 530,
    visible: true,
  };
}

function boldPose(hour: number): Pose {
  const p = edgePoint(hour, 98, 3);

  return {
    x: p.x,
    y: p.y,
    scale: BOLD_EM / NUM_EM,
    scaleX: 1,
    weight: 620,
    visible: true,
  };
}

/** Where each numeral sits, and whether it shows, in each clock style. */
function poseFor(style: StyleId, hour: number): Pose {
  const major = MAJOR.has(hour);

  if (style === "giant") {
    if (!major) {
      return { ...dialPose(hour), visible: false };
    }

    return {
      ...GIANT_POSE[hour],
      scale: 1,
      scaleX: 0.92,
      weight: 300,
      visible: true,
    };
  }

  if (style === "dial") {
    return dialPose(hour);
  }

  if (style === "numeralsTicks") {
    return major ? boldPose(hour) : { ...dialPose(hour), visible: false };
  }

  return major
    ? { ...boldPose(hour), visible: false }
    : { ...dialPose(hour), visible: false };
}

const CORNER_DATE = { x: -52, y: 208 };

function topDateY(style: StyleId) {
  return style === "dial" ? -(HALF - 78) + 52 : -(HALF - 98) + 52;
}

function hasTicks(style: StyleId) {
  return style === "numeralsTicks" || style === "ticks";
}

function pickerOffset(style: StyleId) {
  const index = PICKER_ORDER.indexOf(style);

  return PICKER_H / 2 - (index * THUMB_PITCH + THUMB / 2);
}

/* Timing ----------------------------------------------------------------- */

// The house spring, fitted frame by frame to the footage (T2, motion from
// frame ~90.5): critically damped, ω = 24 rad/s. Apple vs this spring:
// 60/59% at 83ms, 76/77% at 117ms, 86/87% at 150ms, 93/93% at 183ms.
// Settles by ~300ms with no overshoot. Every travelling element uses it.
const SPRING_STIFFNESS = 576;
const SPRING_DAMPING = 48;

const EASE_OUT: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.42, 0, 0.58, 1];

type DebugConfig = { slow: number; timeOffsetMs: number };

function readDebugConfig(): DebugConfig {
  if (typeof window === "undefined") {
    return { slow: 1, timeOffsetMs: 0 };
  }

  const params = new URLSearchParams(window.location.search);
  const slow = Math.max(1, Number(params.get("slow")) || 1);
  let timeOffsetMs = 0;
  const time = params.get("time");

  if (time) {
    const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
    const target = new Date();

    target.setHours(h, m, s, 0);
    timeOffsetMs = target.getTime() - Date.now();
  }

  return { slow, timeOffsetMs };
}

/* Clock face pieces --------------------------------------------------------- */

const TICKS = Array.from({ length: 60 }, function makeTick(_, i) {
  const hourTick = i % 5 === 0;
  const theta = (i / 60) * Math.PI * 2;
  const outer = edgePoint(i / 5, 18, 4.2);
  const length = hourTick ? 30 : 13;
  const ux = Math.sin(theta);
  const uy = -Math.cos(theta);

  return {
    x1: outer.x,
    y1: outer.y,
    x2: Math.round((outer.x - ux * length) * 100) / 100,
    y2: Math.round((outer.y - uy * length) * 100) / 100,
    width: hourTick ? 5 : 2.2,
  };
});

function TickRing({ color }: { color: string }) {
  return (
    <svg
      viewBox={`${-HALF} ${-HALF} ${CARD} ${CARD}`}
      width={CARD}
      height={CARD}
      aria-hidden="true"
      data-hv-ticks
    >
      {TICKS.map(function renderTick(tick, i) {
        return (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={color}
            strokeWidth={tick.width}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** A static miniature of a style, for the picker. White line art on black. */
function ThumbFace({ style }: { style: StyleId }) {
  const scale = (THUMB * 0.92) / CARD;

  return (
    <span data-hv-thumb-face aria-hidden="true">
      <span
        data-hv-thumb-canvas
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {hasTicks(style) && <TickRing color="#fff" />}
        {HOURS.map(function renderThumbNumeral(hour) {
          const pose = poseFor(style, hour);

          if (!pose.visible) {
            return null;
          }

          return (
            <span
              key={hour}
              data-hv-numeral
              style={{
                transform: `translate(${pose.x}px, ${pose.y}px) scale(${pose.scale * pose.scaleX}, ${pose.scale})`,
                fontWeight: style === "giant" ? 300 : pose.weight,
                color: "#fff",
              }}
            >
              {hour}
            </span>
          );
        })}
      </span>
    </span>
  );
}

type NumeralValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  scaleX: MotionValue<number>;
  weight: MotionValue<number>;
  opacity: MotionValue<number>;
};

function createNumeralValues(style: StyleId): NumeralValues[] {
  return HOURS.map(function create(hour) {
    const pose = poseFor(style, hour);

    return {
      x: motionValue(pose.x),
      y: motionValue(pose.y),
      scale: motionValue(pose.scale),
      scaleX: motionValue(pose.scaleX),
      weight: motionValue(pose.weight),
      opacity: motionValue(pose.visible ? 1 : 0),
    };
  });
}

function formatDate(date: Date) {
  const day = date
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();

  return `${day} ${date.getDate()}`;
}

/* Component ---------------------------------------------------------------- */

export function HomeviewClock() {
  const reducedMotion = Boolean(useReducedMotion());

  const debugRef = useRef<DebugConfig>({ slow: 1, timeOffsetMs: 0 });
  const controlsRef = useRef<Set<AnimationPlaybackControls>>(new Set());
  const styleRef = useRef<StyleId>("giant");
  const styleBeforeEditRef = useRef<StyleId>("giant");
  const modeRef = useRef<"home" | "edit">("home");
  const wheelLockRef = useRef(0);
  const wheelAccumRef = useRef(0);
  const dragRef = useRef<{ startY: number; startOffset: number; id: number } | null>(
    null,
  );
  const fitRef = useRef<HTMLDivElement>(null);

  const [style, setStyle] = useState<StyleId>("giant");
  const [mode, setMode] = useState<"home" | "edit">("home");
  const [dateLabel, setDateLabel] = useState("TUE 13");
  const [fitScale, setFitScale] = useState(1);
  const [announcement, setAnnouncement] = useState("");

  const [numerals] = useState(function initNumerals() {
    return createNumeralValues("giant");
  });

  // Hands
  const hourAngle = useMotionValue(0);
  const minuteAngle = useMotionValue(0);
  const secondAngle = useMotionValue(0);

  // Card and face
  const cardX = useMotionValue(0);
  const ticksOpacity = useMotionValue(0);
  const cornerDateOpacity = useMotionValue(1);
  const topDateOpacity = useMotionValue(0);
  const topDateYValue = useMotionValue(topDateY("dial"));

  // Home chrome
  const widgetsX = useMotionValue(0);
  const widgetsOpacity = useMotionValue(1);
  const labelOpacity = useMotionValue(1);
  const pillOpacity = useMotionValue(1);
  const pillScale = useMotionValue(1);
  const plusOpacity = useMotionValue(1);

  // Edit chrome
  const outlineOpacity = useMotionValue(0);
  const outlineScale = useMotionValue(1.03);
  const tabsOpacity = useMotionValue(0);
  const tabsY = useMotionValue(-6);
  const pickerOpacity = useMotionValue(0);
  const pickerX = useMotionValue(10);
  const pickerY = useMotionValue(pickerOffset("giant"));
  const controlsOpacity = useMotionValue(0);
  const controlsScale = useMotionValue(0.9);

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

  function tween(
    duration: number,
    delay = 0,
    ease: [number, number, number, number] = EASE_OUT,
  ): Transition {
    const slow = debugRef.current.slow;

    if (reducedMotion) {
      return { duration: Math.min(duration, 0.15), delay: 0, ease };
    }

    return { duration: duration * slow, delay: delay * slow, ease };
  }

  function run(value: MotionValue<number>, to: number, transition: Transition) {
    const controls = animate(value, to, transition);
    const registry = controlsRef.current;

    registry.add(controls);
    void controls.then(function release() {
      registry.delete(controls);
    });

    return controls;
  }

  /* Style changes ------------------------------------------------------------
     Numerals shared by both styles travel on the house spring (position,
     scale and weight together). New ones fade in where they belong; leaving
     ones fade out where they stand, shrinking slightly. */

  function changeStyle(to: StyleId) {
    const from = styleRef.current;

    if (to === from) {
      run(pickerY, pickerOffset(to), spring());
      return;
    }

    styleRef.current = to;
    setStyle(to);
    setAnnouncement(`${STYLE_LABEL[to]} style`);

    HOURS.forEach(function moveNumeral(hour, i) {
      const values = numerals[i];
      const fromPose = poseFor(from, hour);
      const toPose = poseFor(to, hour);
      const showing = values.opacity.get() > 0.02;

      if (toPose.visible) {
        if (fromPose.visible || showing) {
          run(values.x, toPose.x, spring());
          run(values.y, toPose.y, spring());
          run(values.scale, toPose.scale, spring());
          run(values.scaleX, toPose.scaleX, spring());
          run(values.weight, toPose.weight, spring());
          run(values.opacity, 1, tween(0.12));
          return;
        }

        values.x.set(toPose.x);
        values.y.set(toPose.y);
        values.scaleX.set(toPose.scaleX);
        values.weight.set(toPose.weight);
        values.scale.set(toPose.scale * 0.92);
        run(values.scale, toPose.scale, tween(0.2, 0.04));
        run(values.opacity, 1, tween(0.2, 0.04));
        return;
      }

      if (!showing && !fromPose.visible) {
        return;
      }

      const toTicksOnly = to === "ticks";
      const duration = toTicksOnly ? 0.23 : 0.18;
      const shrink = toTicksOnly ? 0.85 : 0.92;
      const baseScale = fromPose.visible ? fromPose.scale : values.scale.get();

      run(values.opacity, 0, tween(duration));
      run(values.scale, baseScale * shrink, tween(duration));
    });

    if (hasTicks(to) !== hasTicks(from)) {
      run(
        ticksOpacity,
        hasTicks(to) ? 1 : 0,
        hasTicks(to) ? tween(0.21, 0.06) : tween(0.18),
      );
    }

    // The date moves house between the giant style and the rest.
    if (to === "giant") {
      run(topDateOpacity, 0, tween(0.2));
      run(cornerDateOpacity, 1, tween(0.22, 0.08));
    } else if (from === "giant") {
      run(cornerDateOpacity, 0, tween(0.2));
      topDateYValue.set(topDateY(to));
      run(topDateOpacity, 1, tween(0.2, 0.06));
    } else {
      run(topDateYValue, topDateY(to), spring());
    }

    run(pickerY, pickerOffset(to), spring());
  }

  /* Customize mode --------------------------------------------------------
     Leaving comes before arriving: home chrome clears in 150ms, the card
     glides to centre on the house spring, then the edit layer lands. */

  function enterEdit() {
    if (modeRef.current === "edit") {
      return;
    }

    modeRef.current = "edit";
    styleBeforeEditRef.current = styleRef.current;
    setMode("edit");
    setAnnouncement("Customizing clock. Choose a style.");

    // Footage (frames 57–70): home chrome gone by +6 frames, card recentres,
    // then the edit layer lands almost as a cut at about +10 frames.
    const clear = tween(0.18, 0, EASE_IN_OUT);

    run(widgetsX, 52, clear);
    run(widgetsOpacity, 0, clear);
    run(labelOpacity, 0, clear);
    run(pillOpacity, 0, clear);
    run(pillScale, 0.96, clear);
    run(plusOpacity, 0, clear);

    run(cardX, EDIT_X - HOME_X, spring(0.06));

    const land = tween(0.1, 0.26);

    outlineScale.set(1.03);
    run(outlineScale, 1, land);
    run(outlineOpacity, 1, land);
    tabsY.set(-6);
    run(tabsY, 0, land);
    run(tabsOpacity, 1, land);
    pickerX.set(10);
    run(pickerX, 0, land);
    run(pickerOpacity, 1, land);
    controlsScale.set(0.9);
    run(controlsScale, 1, land);
    run(controlsOpacity, 1, land);
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

    const clear = tween(0.12, 0, EASE_IN_OUT);

    run(outlineOpacity, 0, clear);
    run(tabsOpacity, 0, clear);
    run(pickerOpacity, 0, clear);
    run(pickerX, 10, clear);
    run(controlsOpacity, 0, clear);
    run(controlsScale, 0.9, clear);

    run(cardX, 0, spring(0.06));

    const land = tween(0.2, 0.2);

    run(widgetsX, 0, land);
    run(widgetsOpacity, 1, land);
    run(labelOpacity, 1, land);
    run(pillOpacity, 1, land);
    run(pillScale, 1, land);
    run(plusOpacity, 1, land);
  }

  function stepStyle(direction: 1 | -1) {
    const index = PICKER_ORDER.indexOf(styleRef.current);
    const next = Math.min(
      PICKER_ORDER.length - 1,
      Math.max(0, index + direction),
    );

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
    wheelLockRef.current = now + 240;
  }

  function handlePickerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || modeRef.current !== "edit") {
      return;
    }

    dragRef.current = {
      startY: event.clientY,
      startOffset: pickerY.get(),
      id: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePickerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) {
      return;
    }

    pickerY.set(drag.startOffset + (event.clientY - drag.startY) / fitScale);
  }

  function handlePickerPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.id !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    const moved = Math.abs(pickerY.get() - drag.startOffset);
    const index = Math.round(
      (PICKER_H / 2 - THUMB / 2 - pickerY.get()) / THUMB_PITCH,
    );
    const clamped = Math.min(PICKER_ORDER.length - 1, Math.max(0, index));

    if (moved < 6) {
      return;
    }

    changeStyle(PICKER_ORDER[clamped]);
  }

  /* Effects ---------------------------------------------------------------- */

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
      };
    }
  }, []);

  useEffect(
    function runHands() {
      let frame = 0;

      function tick() {
        const now = new Date(Date.now() + debugRef.current.timeOffsetMs);
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

  // The fit box is sized in CSS (so the first paint is already right, with
  // no page overflow on phones); the device scales to whatever width it got.
  useEffect(function fitToBox() {
    const box = fitRef.current;

    if (box === null) {
      return;
    }

    const element: HTMLDivElement = box;

    function measure() {
      setFitScale(element.clientWidth / TOTAL_W);
    }

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return function cleanup() {
      observer.disconnect();
    };
  }, []);

  const shortcutsRef = useRef({ step: stepStyle, exit: exitEdit });

  useEffect(function refreshShortcuts() {
    shortcutsRef.current = { step: stepStyle, exit: exitEdit };
  });

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
      } else if (
        event.key === "Enter" &&
        !(event.target instanceof HTMLButtonElement)
      ) {
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
      <div
        data-hv-device
        style={{
          width: TOTAL_W,
          height: TOTAL_H,
          transform: `scale(${fitScale})`,
        }}
      >
        <div data-hv-screen data-mode={mode}>
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>

          {/* Home chrome --------------------------------------------------- */}

          <motion.span
            data-hv-label
            aria-hidden={editing}
            style={{ opacity: labelOpacity, left: HOME_X }}
          >
            ANALOG
          </motion.span>

          <motion.div
            data-hv-widgets
            aria-hidden="true"
            style={{ x: widgetsX, opacity: widgetsOpacity }}
          >
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

          {/* The clock card ------------------------------------------------- */}

          <motion.div
            data-hv-card-anchor
            style={{ x: cardX, left: HOME_X, top: CARD_Y }}
          >
            <motion.div
              data-hv-outline
              aria-hidden="true"
              style={{ opacity: outlineOpacity, scale: outlineScale }}
            />

            <div data-hv-card role="img" aria-label={`Analog clock, ${STYLE_LABEL[style]} style`}>
              <div data-hv-face>
                <motion.div data-hv-ticks-layer style={{ opacity: ticksOpacity }}>
                  <TickRing color="#111" />
                </motion.div>

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
                        scaleX: values.scaleX,
                        opacity: values.opacity,
                        fontWeight: values.weight,
                      }}
                    >
                      {hour}
                    </motion.span>
                  );
                })}

                <motion.span
                  data-hv-date
                  style={{
                    x: CORNER_DATE.x,
                    y: CORNER_DATE.y,
                    opacity: cornerDateOpacity,
                  }}
                >
                  {dateLabel}
                </motion.span>

                <motion.span
                  data-hv-date
                  style={{ x: 0, y: topDateYValue, opacity: topDateOpacity }}
                >
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

            <motion.button
              type="button"
              data-hv-glass
              data-hv-customize
              tabIndex={editing ? -1 : 0}
              aria-hidden={editing}
              style={{ opacity: pillOpacity, scale: pillScale }}
              onClick={enterEdit}
            >
              Customize
            </motion.button>
          </motion.div>

          <motion.button
            type="button"
            data-hv-glass
            data-hv-round
            data-hv-plus
            tabIndex={editing ? -1 : 0}
            aria-hidden={editing}
            aria-label="Add widget"
            style={{ opacity: plusOpacity }}
          >
            <PlusIcon />
          </motion.button>

          {/* Edit chrome --------------------------------------------------- */}

          <motion.div
            data-hv-tabs
            role="tablist"
            aria-hidden={!editing}
            style={{ opacity: tabsOpacity, y: tabsY }}
          >
            <button type="button" role="tab" aria-selected="true" tabIndex={editing ? 0 : -1}>
              STYLE
            </button>
            <button type="button" role="tab" aria-selected="false" aria-disabled="true" tabIndex={-1}>
              COLOR
            </button>
            <button type="button" role="tab" aria-selected="false" aria-disabled="true" tabIndex={-1}>
              FONT
            </button>
          </motion.div>

          <motion.div
            data-hv-picker
            role="radiogroup"
            aria-label="Clock style"
            aria-hidden={!editing}
            style={{ opacity: pickerOpacity, x: pickerX }}
            onWheel={handleWheel}
            onPointerDown={handlePickerPointerDown}
            onPointerMove={handlePickerPointerMove}
            onPointerUp={handlePickerPointerUp}
            onPointerCancel={handlePickerPointerUp}
          >
            <motion.div data-hv-picker-list style={{ y: pickerY }}>
              {PICKER_ORDER.map(function renderThumb(id) {
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
                    data-selected={selected ? "true" : "false"}
                    onClick={function selectStyle() {
                      changeStyle(id);
                    }}
                  >
                    <ThumbFace style={id} />
                  </button>
                );
              })}
            </motion.div>
            <span data-hv-picker-ring aria-hidden="true" />
          </motion.div>

          <motion.button
            type="button"
            data-hv-glass
            data-hv-round
            data-hv-cancel
            aria-label="Cancel"
            aria-hidden={!editing}
            tabIndex={editing ? 0 : -1}
            style={{ opacity: controlsOpacity, scale: controlsScale }}
            onClick={function cancel() {
              exitEdit(false);
            }}
          >
            <CloseIcon />
          </motion.button>

          <motion.button
            type="button"
            data-hv-round
            data-hv-done
            aria-label="Done"
            aria-hidden={!editing}
            tabIndex={editing ? 0 : -1}
            style={{ opacity: controlsOpacity, scale: controlsScale }}
            onClick={function done() {
              exitEdit(true);
            }}
          >
            <CheckIcon />
          </motion.button>
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
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 12.5l4.2 4.2 8.8-9.4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M3 17h18M12 4v5M9.5 6.5L12 4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* Styles -------------------------------------------------------------------- */

const STYLES = `
  [data-hv-fit] {
    position: relative;
    width: min(${TOTAL_W}px, calc(100vw - 32px), calc((100svh - 48px) * ${(TOTAL_W / TOTAL_H).toFixed(4)}));
    aspect-ratio: ${TOTAL_W} / ${TOTAL_H};
  }

  [data-hv-device] {
    position: absolute;
    left: 0;
    top: 0;
    padding: ${BEZEL}px;
    border-radius: ${62 + BEZEL}px;
    transform-origin: 0 0;
    background:
      linear-gradient(160deg, #e9e8e4 0%, #c9c8c3 38%, #b9b8b3 62%, #d8d7d2 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      inset 0 -1px 0 rgba(0, 0, 0, 0.12),
      0 2px 4px rgba(0, 0, 0, 0.12),
      0 40px 80px -36px rgba(0, 0, 0, 0.55);
  }

  [data-hv-screen] {
    position: relative;
    width: ${W}px;
    height: ${H}px;
    overflow: hidden;
    border-radius: 62px;
    background: #000;
    color: #fff;
    font-family: ${FONT};
    isolation: isolate;
    user-select: none;
    -webkit-user-select: none;
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
    top: ${CARD_Y - HALF - 46}px;
    translate: -50% 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.86);
  }

  [data-hv-widgets] {
    position: absolute;
    top: ${CARD_Y - HALF}px;
    left: ${HOME_X + HALF + 26}px;
    width: ${W - (HOME_X + HALF + 26) - 34}px;
    height: ${CARD}px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 22px 20px;
    border-radius: 44px;
    background: linear-gradient(180deg, #2f6268 0%, #2a5459 100%);
    font-size: 20px;
    font-weight: 600;
  }

  [data-hv-widget-top] {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  [data-hv-widget-top] strong {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  [data-hv-widget-top] span,
  [data-hv-widget-bottom] {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.92);
  }

  [data-hv-widgets] svg {
    width: 20px;
    height: 20px;
  }

  /* Card */

  [data-hv-card-anchor] {
    position: absolute;
    width: 0;
    height: 0;
  }

  [data-hv-card] {
    position: absolute;
    left: ${-HALF}px;
    top: ${-HALF}px;
    width: ${CARD}px;
    height: ${CARD}px;
    overflow: hidden;
    border-radius: ${CARD_RADIUS}px;
    background: linear-gradient(180deg, #74a6e0 0%, ${CARD_BLUE} 60%, #6799d4 100%);
  }

  [data-hv-outline] {
    position: absolute;
    left: ${-HALF - 10}px;
    top: ${-HALF - 10}px;
    width: ${CARD + 20}px;
    height: ${CARD + 20}px;
    border: 3.5px solid #fff;
    border-radius: ${CARD_RADIUS + 10}px;
    pointer-events: none;
  }

  [data-hv-face] {
    position: absolute;
    left: ${HALF}px;
    top: ${HALF}px;
    width: 0;
    height: 0;
  }

  [data-hv-ticks-layer] {
    position: absolute;
    left: ${-HALF}px;
    top: ${-HALF}px;
  }

  [data-hv-ticks-layer] svg {
    display: block;
  }

  [data-hv-numeral] {
    position: absolute;
    left: 0;
    top: 0;
    translate: -50% -50%;
    font-size: ${NUM_EM}px;
    line-height: 1;
    letter-spacing: -0.04em;
    font-variant-numeric: proportional-nums;
    color: #0c0c0c;
    white-space: nowrap;
    transform-origin: 50% 50%;
  }

  [data-hv-date] {
    position: absolute;
    left: 0;
    top: 0;
    translate: -50% -50%;
    font-size: 21px;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: #0c0c0c;
    white-space: nowrap;
  }

  /* Hands: drawn pointing to 12 from the pivot, then rotated. */

  [data-hv-hands] {
    position: absolute;
    left: 0;
    top: 0;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.22));
  }

  [data-hv-hand] {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }

  [data-hv-hand] i {
    position: absolute;
    display: block;
    border-radius: 999px;
    background: #f6f3ec;
    box-shadow: 0 0 0 0.75px rgba(0, 0, 0, 0.28);
  }

  [data-hv-hand]::before {
    content: "";
    position: absolute;
    left: -2px;
    top: -26px;
    width: 4px;
    height: 26px;
    border-radius: 2px;
    background: #f6f3ec;
  }

  [data-hv-hand="hour"] i {
    left: -7px;
    top: -128px;
    width: 14px;
    height: 104px;
  }

  [data-hv-hand="minute"] i {
    left: -6px;
    top: -190px;
    width: 12px;
    height: 166px;
  }

  [data-hv-hand="second"]::before {
    left: -1px;
    top: -214px;
    width: 2px;
    height: 248px;
    border-radius: 2px;
    background: #fff;
  }

  [data-hv-pivot] {
    position: absolute;
    left: -7px;
    top: -7px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: inset 0 0 0 4px #fff, 0 0 0 1px rgba(0, 0, 0, 0.08);
  }

  [data-hv-pivot]::after {
    content: "";
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    background: #1c1c1c;
  }

  /* Glass controls */

  [data-hv-glass] {
    background: rgba(255, 255, 255, 0.16);
    box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.35), 0 8px 24px -10px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    transition: background-color 160ms ease, scale 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-hv-customize] {
    position: absolute;
    left: 0;
    top: ${HALF - 22}px;
    translate: -50% 0;
    height: 56px;
    padding: 0 30px;
    border-radius: 999px;
    font-size: 19px;
    font-weight: 600;
    white-space: nowrap;
  }

  [data-hv-round] {
    position: absolute;
    width: 76px;
    height: 76px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  [data-hv-round] svg {
    width: 30px;
    height: 30px;
  }

  [data-hv-plus],
  [data-hv-done] {
    left: ${PICKER_X - 38}px;
    top: ${H - 116}px;
  }

  [data-hv-cancel] {
    left: ${EDIT_X - HALF - 38 + 30}px;
    top: ${H - 116}px;
  }

  [data-hv-done] {
    background: ${SYSTEM_BLUE};
    box-shadow: 0 10px 24px -10px rgba(10, 132, 255, 0.7);
    transition: background-color 160ms ease, scale 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Tabs */

  [data-hv-tabs] {
    position: absolute;
    top: 38px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 34px;
  }

  [data-hv-tabs] button {
    height: 36px;
    padding: 0 6px;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.34);
  }

  [data-hv-tabs] button[aria-selected="true"] {
    color: #fff;
  }

  [data-hv-tabs] button[aria-disabled="true"] {
    cursor: default;
  }

  /* Picker */

  [data-hv-picker] {
    position: absolute;
    left: ${PICKER_X - THUMB / 2 - 14}px;
    top: ${CARD_Y - PICKER_H / 2}px;
    width: ${THUMB + 28}px;
    height: ${PICKER_H}px;
    overflow: hidden;
    touch-action: none;
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
    mask-image: linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
  }

  [data-hv-picker-list] {
    position: absolute;
    left: 14px;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: ${THUMB_PITCH - THUMB}px;
  }

  [data-hv-thumb] {
    position: relative;
    width: ${THUMB}px;
    height: ${THUMB}px;
    border-radius: 22px;
    opacity: 0.62;
    transition: opacity 200ms ease, scale 200ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-hv-thumb][data-selected="true"] {
    opacity: 1;
  }

  [data-hv-picker-ring] {
    position: absolute;
    left: 6px;
    top: ${PICKER_H / 2 - THUMB / 2 - 8}px;
    width: ${THUMB + 16}px;
    height: ${THUMB + 16}px;
    border: 3px solid #fff;
    border-radius: 26px;
    pointer-events: none;
  }

  [data-hv-thumb-face] {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
  }

  [data-hv-thumb-canvas] {
    position: absolute;
    left: 50%;
    top: 50%;
    width: ${CARD}px;
    height: ${CARD}px;
    transform-origin: 50% 50%;
  }

  [data-hv-thumb-canvas] [data-hv-ticks] {
    position: absolute;
    left: 0;
    top: 0;
  }

  [data-hv-thumb-canvas] [data-hv-numeral] {
    left: ${HALF}px;
    top: ${HALF}px;
  }

  /* States */

  [data-hv-screen][data-mode="home"] [data-hv-tabs],
  [data-hv-screen][data-mode="home"] [data-hv-picker],
  [data-hv-screen][data-mode="home"] [data-hv-cancel],
  [data-hv-screen][data-mode="home"] [data-hv-done],
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
      background: rgba(255, 255, 255, 0.24);
    }

    [data-hv-done]:hover {
      background: #2b95ff;
    }

    [data-hv-thumb][data-selected="false"]:hover {
      opacity: 0.9;
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
