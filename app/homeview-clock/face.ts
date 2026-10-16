/* The measured model of the Homeview clock face: layout, poses, ticks and
   timing, all taken from the un-skewed launch footage. */

import type { MotionValue } from "motion/react";

/* Geometry ---------------------------------------------------------------
   Every value here was measured from the launch footage after un-skewing
   each frame (the clock card is a square, so its four edges give the
   camera's perspective). The glass is a square 880px design screen.
   Face measurements were taken on the 457px edit-mode card; `k()` converts
   them to the 496px card this file draws. */

export const S = 880;
export const BEZEL = 30;
export const GLASS_RADIUS = 158;
export const DISPLAY_INSET = 53; // the panel under the glass: widgets clip here
export const DISPLAY_RADIUS = 105;

export const CX = 440;
export const CY = 442;
export const CARD = 496;
export const HALF = CARD / 2;
export const CARD_RADIUS = 68;
export const EDIT_SCALE = 0.9213; // the card shrinks in place; it never slides

export const K = CARD / 457;

export function k(value: number) {
  return Math.round(value * K * 100) / 100;
}

export const NUM_PX = 288; // numerals render at the giant size and scale down
export const CAP = 0.7045; // SF Pro cap height / em
export const GIANT_SCALE = k(182.5) / (NUM_PX * CAP);
export const DIAL_SCALE = k(49.8) / (NUM_PX * CAP);

export const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", "Helvetica Neue", Inter, system-ui, sans-serif';

export const CARD_BLUE = "#6FA1D8";
export const INK = "#101114";
export const SYSTEM_BLUE = "#0A84FF";

// Picker (screen coordinates)
export const RING_X = 749.5;
export const RING_SIZE = 97;
export const TILE = 83;
export const PITCH = 108.5;
export const THUMB_FACE_SCALE = 0.158;

// Edit chrome
export const CONTROL = 93;
export const CONTROL_Y = 745.5;

export const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
export const MAJOR = new Set([12, 3, 6, 9]);

export type StyleId = "giant" | "dial" | "numeralsTicks" | "ticks";

/** Top to bottom, as in the picker. The footage walks it bottom → top. */
export const PICKER_ORDER: StyleId[] = [
  "ticks",
  "numeralsTicks",
  "dial",
  "giant",
];

export const STYLE_LABEL: Record<StyleId, string> = {
  giant: "Giant numerals",
  dial: "Numerals",
  numeralsTicks: "Numerals and ticks",
  ticks: "Ticks",
};

/* Numeral layouts (ink centres, footage card units) -------------------- */

// Dial: twelve numerals on a near-circle, r ≈ 183 (0.40 of the card).
export const DIAL: Record<number, [number, number]> = {
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
export const GIANT: Record<number, [number, number]> = {
  12: [-14.5, -110.5],
  3: [143, 4],
  6: [-3.5, 111.5],
  9: [-141.5, 3.5],
};

// Numerals and ticks: the same numerals pushed 60 in by the ticks.
export const PUSH = 60;

// Ink-centre offsets from the text box centre, in 288px font units (SF Pro).
export const INK_DX: Record<number, number> = {
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

export const WEIGHT_GIANT = 270;
export const WEIGHT_DIAL = 570;
export const TRACK_GIANT = -0.115 * NUM_PX;
export const TRACK_DIAL = -0.05 * NUM_PX;

export type Pose = {
  x: number;
  y: number;
  scale: number;
  weight: number;
  track: number;
  visible: boolean;
};

export function pose(
  hour: number,
  cx: number,
  cy: number,
  scale: number,
  weight: number,
  visible = true,
): Pose {
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

export function dialPose(
  hour: number,
  shrink = 1,
  inset = 0,
  visible = true,
  glyph = shrink,
) {
  const [x, y] = DIAL[hour];
  const r = Math.hypot(x, y);
  const f = ((r - inset) / r) * shrink;

  return pose(hour, x * f, y * f, DIAL_SCALE * glyph, WEIGHT_DIAL, visible);
}

/** Where each numeral sits in each style, including where hidden ones wait. */
export function poseFor(style: StyleId, hour: number): Pose {
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
    return major
      ? dialPose(hour, 1, PUSH)
      : dialPose(hour, 1, PUSH, false, 0.5);
  }

  // Ticks only: majors pull in toward the centre (0.69) while their
  // glyphs shrink faster (0.5), as in the footage.
  return major
    ? dialPose(hour, 0.69, PUSH, false, 0.5)
    : dialPose(hour, 1, PUSH, false, 0.5);
}

/* Ticks: rays between two concentric squares ----------------------------
   Outer ends sit on a square 204 out (the numerals' edge line). Hour ticks
   run in to 140, minute ticks to 182.8, so corner ticks are longer. With
   numerals showing, the 12/3/6/9 ticks stop at 161. */

export const TICK_OUT = k(204);
export const TICK_IN_HOUR = k(140);
export const TICK_IN_MINUTE = k(182.8);
export const MAJOR_EXTENT_WITH_NUMERALS = (204 - 161) / (204 - 140);

export const TICKS = Array.from({ length: 60 }, function makeTick(_, i) {
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

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function tickPoints(
  tick: (typeof TICKS)[number],
  grow: number,
  majorExtent: number,
) {
  const reach =
    tick.outer - tick.length * grow * (tick.major ? majorExtent : 1);

  return {
    x1: round2(tick.ux * tick.outer),
    y1: round2(tick.uy * tick.outer),
    x2: round2(tick.ux * reach),
    y2: round2(tick.uy * reach),
  };
}

export function hasTicks(style: StyleId) {
  return style === "numeralsTicks" || style === "ticks";
}

/* Hands, in card units from the pivot ---------------------------------- */

export const HOUR_FROM = k(29);
export const HOUR_TO = k(120.5);
export const MINUTE_FROM = k(30);
export const MINUTE_TO = k(202.5);
export const HAND_WIDTH = k(17);
export const STEM_WIDTH = k(3.8);
export const SECOND_TAIL = k(32);
export const SECOND_TO = k(207);

/* Date ------------------------------------------------------------------- */

export const CORNER_DATE_LEFT = k(-197);
export const CORNER_DATE_Y = k(189);
export const TOP_DATE_Y: Record<StyleId, number> = {
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

export const SPRING_STIFFNESS = 157.91;
export const SPRING_DAMPING = 25.13;

export type Bezier = [number, number, number, number];

export const EASE_OUT: Bezier = [0.22, 0.61, 0.36, 1];
export const EASE_IN: Bezier = [0.4, 0, 1, 1];
export const EASE_IN_OUT: Bezier = [0.4, 0, 0.6, 1];
export const EASE_SINE: Bezier = [0.37, 0, 0.63, 1];
export const LINEAR: Bezier = [0, 0, 1, 1];

/* Live values ------------------------------------------------------------ */

export type NumeralValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  weight: MotionValue<number>;
  wght: MotionValue<string>;
  track: MotionValue<string>;
  opacity: MotionValue<number>;
};

export function wghtAxis(weight: number) {
  return `"wght" ${Math.round(weight * 10) / 10}`;
}
