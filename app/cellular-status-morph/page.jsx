"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const TOTAL_DURATION = 3.2;

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 360;

const CELLULAR_BASELINE = 205;
const DOT_DIAMETER = 11;

const WIFI_PIVOT_X = 311.5;
const WIFI_PIVOT_Y = 180;
const WIFI_STROKE_WIDTH = 9.05;

const BATTERY_SEGMENT_BASE_LENGTH = 37;
const BATTERY_SEGMENT_FINAL_LENGTH = 75.35;

const BATTERY_CURVE_STROKE_START = 8;
const BATTERY_CURVE_STROKE_END = 8.5;
const BATTERY_ARC_STROKE_WIDTH = 8.5;

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

const batteryMotionCache = new WeakMap();

const cellularBars = [
  {
    x: 183,
    width: 11,
    height: 22,
    collapseStart: 1.18,
    collapseEnd: 1.5,
    travel: [
      { t: 1.8, x: 187.79, y: 198.9 },
      { t: 1.9, x: 187.88, y: 198.88 },
      { t: 2, x: 188.5, y: 199 },
      { t: 2.1, x: 190.91, y: 216.17 },
      { t: 2.2, x: 204.66, y: 244.99 },
      { t: 2.3, x: 231.29, y: 260 },
      { t: 2.4, x: 260, y: 258 },
      { t: 2.5, x: 281.31, y: 244.27 },
      { t: 2.6, x: 290.5, y: 228 },
      { t: 2.7, x: 291.88, y: 222.88 },
      { t: 2.8, x: 292.1, y: 221.5 },
      { t: 2.9, x: 291.77, y: 224 },
      { t: 3, x: 291.26, y: 226.05 },
      { t: 3.1, x: 291, y: 227.39 },
      { t: 3.2, x: 291.08, y: 227.37 },
    ],
  },
  {
    x: 202,
    width: 11,
    height: 29,
    collapseStart: 1.04,
    collapseEnd: 1.43,
    travel: [
      { t: 1.8, x: 206.95, y: 198.74 },
      { t: 1.9, x: 207.09, y: 198.83 },
      { t: 2, x: 208.16, y: 209.71 },
      { t: 2.1, x: 217.26, y: 237.95 },
      { t: 2.2, x: 237.63, y: 258.08 },
      { t: 2.3, x: 264.21, y: 264.71 },
      { t: 2.4, x: 288.83, y: 258.09 },
      { t: 2.5, x: 304.5, y: 244 },
      { t: 2.6, x: 309.88, y: 232.12 },
      { t: 2.7, x: 310.9, y: 228.5 },
      { t: 2.8, x: 310.83, y: 228.91 },
      { t: 2.9, x: 310.12, y: 231.55 },
      { t: 3, x: 309.95, y: 233.48 },
      { t: 3.1, x: 309.61, y: 234.18 },
      { t: 3.2, x: 309.79, y: 234.05 },
    ],
  },
  {
    x: 221,
    width: 11,
    height: 37,
    collapseStart: 0.93,
    collapseEnd: 1.37,
    travel: [
      { t: 1.8, x: 226.09, y: 198.83 },
      { t: 1.9, x: 226.12, y: 199.45 },
      { t: 2, x: 231.83, y: 227.65 },
      { t: 2.1, x: 247.88, y: 250.55 },
      { t: 2.2, x: 271.87, y: 263.39 },
      { t: 2.3, x: 297.31, y: 264.37 },
      { t: 2.4, x: 318, y: 254.5 },
      { t: 2.5, x: 327.37, y: 239.08 },
      { t: 2.6, x: 329, y: 230.5 },
      { t: 2.7, x: 329, y: 227.5 },
      { t: 2.8, x: 329, y: 229.4 },
      { t: 2.9, x: 329.03, y: 232.13 },
      { t: 3, x: 329, y: 233.82 },
      { t: 3.1, x: 329, y: 234.29 },
      { t: 3.2, x: 329.07, y: 234.09 },
    ],
  },
  {
    x: 240,
    width: 12,
    height: 46,
    collapseStart: 0.8,
    collapseEnd: 1.27,
    travel: [
      { t: 1.8, x: 245.39, y: 198.87 },
      { t: 1.9, x: 247.37, y: 217.08 },
      { t: 2, x: 258.91, y: 240.83 },
      { t: 2.1, x: 279.58, y: 255.93 },
      { t: 2.2, x: 303.91, y: 259.83 },
      { t: 2.3, x: 325.91, y: 253.83 },
      { t: 2.4, x: 340.65, y: 240.78 },
      { t: 2.5, x: 346.35, y: 228.17 },
      { t: 2.6, x: 347.65, y: 222.78 },
      { t: 2.7, x: 347.5, y: 221 },
      { t: 2.8, x: 347.68, y: 223.68 },
      { t: 2.9, x: 347.55, y: 226.02 },
      { t: 3, x: 347.68, y: 227.32 },
      { t: 3.1, x: 347.72, y: 227.65 },
      { t: 3.2, x: 347.78, y: 227.35 },
    ],
  },
];

const batteryShellFrames = [
  { t: 0, x: 372, width: 89, height: 46 },
  { t: 0.7333, x: 372, width: 89, height: 46 },
  { t: 0.7667, x: 372, width: 88, height: 46 },
  { t: 0.8, x: 372, width: 84.5, height: 46 },
  { t: 0.8333, x: 372, width: 80, height: 46 },
  { t: 0.8667, x: 372, width: 72, height: 46 },
  { t: 0.9, x: 372, width: 64, height: 46 },
  { t: 0.9333, x: 372, width: 54, height: 46 },
  { t: 0.9667, x: 372, width: 45, height: 46 },
  { t: 1, x: 372, width: 37, height: 46 },
  { t: 1.0333, x: 372, width: 30, height: 46 },
  { t: 1.0667, x: 372, width: 23, height: 46 },
  { t: 1.1, x: 371, width: 19, height: 46 },
  { t: 1.1333, x: 371, width: 15, height: 45 },
  { t: 1.1667, x: 371, width: 12, height: 45 },
  { t: 1.2, x: 371, width: 10, height: 45 },
  { t: 1.2333, x: 371, width: 9, height: 45 },
  { t: 1.2667, x: 371, width: 8, height: 45 },
];

const batterySegmentLengthFrames = [
  {
    t: 1.2667,
    length: BATTERY_SEGMENT_BASE_LENGTH,
  },
  {
    t: 1.8,
    length: BATTERY_SEGMENT_BASE_LENGTH,
  },
  {
    t: 1.85,
    length: 37.25,
  },
  {
    t: 1.8833,
    length: 38.5,
  },
  {
    t: 1.9167,
    length: 42.5,
  },
  {
    t: 1.95,
    length: 50,
  },
  {
    t: 1.9667,
    length: 56,
  },
  {
    t: 1.9833,
    length: 65,
  },
  {
    t: 2,
    length: BATTERY_SEGMENT_FINAL_LENGTH,
  },
];

const BATTERY_GUIDE_PATH = `
  M 375 116

  C 375 138
    375 158
    375 179.5

  C 375 193
    375 207
    375 218

  C 375 232
    381 241
    393 241

  C 405 241
    414 220
    407.6 190.97

  C 404.7 178.2
    400.3 170.2
    394.69 165.92

  C 383.7 155.8
    369.4 143.2
    353.49 134.61

  C 346 130.6
    338.2 128
    331.11 126.91

  C 318.9 124.4
    306.4 125
    295.2 130.1

  C 282.7 135.8
    273.3 146.3
    268.47 162.25

  C 264.3 175.8
    264.2 187.2
    268.05 196.62

  C 272.8 208.1
    283.4 218.9
    298.91 225.49

  C 313.6 231.8
    328.2 233.3
    340 228
`;

const BATTERY_MOTION_FRAMES = [
  { t: 1.2667, x: 375, y: 179.27 },
  { t: 1.3, x: 374.51, y: 179.31 },
  { t: 1.3333, x: 374.48, y: 179.44 },
  { t: 1.3667, x: 374.48, y: 179.5 },
  { t: 1.4, x: 374.47, y: 179.56 },

  { t: 1.4333, x: 374.17, y: 183.28 },
  { t: 1.4667, x: 374.5, y: 189.87 },
  { t: 1.5, x: 375.29, y: 205.84 },
  { t: 1.5333, x: 377.82, y: 230.44 },

  { t: 1.5667, x: 392.88, y: 241.38 },
  { t: 1.6, x: 408.83, y: 220.31 },
  { t: 1.6333, x: 407.6, y: 190.97 },

  { t: 1.6667, x: 394.69, y: 165.92 },
  { t: 1.7, x: 375.22, y: 147.59 },
  { t: 1.7333, x: 353.49, y: 134.61 },
  { t: 1.7667, x: 331.11, y: 126.91 },
  { t: 1.8, x: 309.4, y: 126.48 },

  { t: 1.8333, x: 290.4, y: 133.67 },
  { t: 1.8667, x: 276.53, y: 146.47 },
  { t: 1.9, x: 268.47, y: 162.25 },
  { t: 1.9333, x: 265.5, y: 179.04 },
  { t: 1.9667, x: 268.05, y: 196.62 },

  { t: 2, x: 278.03, y: 213.25 },
];

const batteryArcFrames = [
  {
    t: 2,
    start: 73.8,
    span: 77.64,
    cx: 318.12,
    cy: 178.53,
    r: 55.6,
  },
  {
    t: 2.0333,
    start: 25.91,
    span: 115.18,
    cx: 318.65,
    cy: 176.94,
    r: 57.23,
  },
  {
    t: 2.0667,
    start: -19.3,
    span: 146.86,
    cx: 319.02,
    cy: 179.18,
    r: 55.19,
  },
  {
    t: 2.1,
    start: -50.68,
    span: 167.34,
    cx: 319.22,
    cy: 179.25,
    r: 55.03,
  },
  {
    t: 2.1333,
    start: -79.94,
    span: 185.07,
    cx: 319.48,
    cy: 179.29,
    r: 54.83,
  },
  {
    t: 2.1667,
    start: -103.37,
    span: 199.19,
    cx: 319.47,
    cy: 179.27,
    r: 54.83,
  },
  {
    t: 2.2,
    start: -122.76,
    span: 211.33,
    cx: 319.37,
    cy: 179.33,
    r: 54.91,
  },
  {
    t: 2.2333,
    start: -138.44,
    span: 216.52,
    cx: 319.51,
    cy: 179.31,
    r: 54.82,
  },
  {
    t: 2.2667,
    start: -154.62,
    span: 225.14,
    cx: 319.49,
    cy: 179.37,
    r: 54.86,
  },
  {
    t: 2.3,
    start: -165.1,
    span: 227.69,
    cx: 319.52,
    cy: 179.38,
    r: 54.84,
  },
  {
    t: 2.3333,
    start: -172.69,
    span: 230.67,
    cx: 319.56,
    cy: 179.34,
    r: 54.81,
  },
  {
    t: 2.3667,
    start: -183.14,
    span: 235.94,
    cx: 319.6,
    cy: 179.28,
    r: 54.76,
  },
  {
    t: 2.4,
    start: -189.36,
    span: 238.45,
    cx: 319.61,
    cy: 179.23,
    r: 54.72,
  },
  {
    t: 2.4333,
    start: -194.64,
    span: 239.35,
    cx: 319.6,
    cy: 179.2,
    r: 54.71,
  },
  {
    t: 2.4667,
    start: -197.91,
    span: 240.4,
    cx: 319.58,
    cy: 179.16,
    r: 54.68,
  },
  {
    t: 2.5,
    start: -202.54,
    span: 242.08,
    cx: 319.56,
    cy: 179.12,
    r: 54.65,
  },
  {
    t: 2.55,
    start: -205.8,
    span: 242.1,
    cx: 319.56,
    cy: 179.12,
    r: 54.65,
  },
  {
    t: 2.6,
    start: -208.4,
    span: 242.2,
    cx: 319.56,
    cy: 179.12,
    r: 54.65,
  },
  {
    t: 2.65,
    start: -210.1,
    span: 242.35,
    cx: 319.56,
    cy: 179.12,
    r: 54.65,
  },
  {
    t: 2.7,
    start: -210.47,
    span: 242.47,
    cx: 319.56,
    cy: 179.12,
    r: 54.65,
  },
  {
    t: 3.2,
    start: -210.47,
    span: 242.47,
    cx: 319.56,
    cy: 179.12,
    r: 54.65,
  },
];

const wifiFrames = [
  {
    t: 0,
    scale: 1,
    x: 0,
    y: 0,
  },
  {
    t: 1.4,
    scale: 1,
    x: 0,
    y: 0,
  },
  {
    t: 1.5,
    scale: 0.9844,
    x: 1.51,
    y: -0.36,
  },
  {
    t: 1.6,
    scale: 0.9063,
    x: 4.05,
    y: -0.16,
  },
  {
    t: 1.7,
    scale: 0.8594,
    x: 5.57,
    y: 0.77,
  },
  {
    t: 1.8,
    scale: 0.8438,
    x: 7.08,
    y: 0.41,
  },
  {
    t: 1.9,
    scale: 0.8125,
    x: 8.09,
    y: 0.69,
  },
  {
    t: 3.2,
    scale: 0.8125,
    x: 8.09,
    y: 0.69,
  },
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function interpolate(from, to, amount) {
  return from + (to - from) * amount;
}

function progressBetween(time, start, end) {
  return clamp((time - start) / (end - start));
}

function easeInOutCubic(value) {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function findSegment(points, time) {
  if (time <= points[0].t) {
    return {
      current: points[0],
      next: points[0],
      amount: 0,
      index: 0,
    };
  }

  const lastIndex = points.length - 1;

  if (time >= points[lastIndex].t) {
    return {
      current: points[lastIndex],
      next: points[lastIndex],
      amount: 0,
      index: lastIndex,
    };
  }

  let index = 0;

  while (index < lastIndex - 1 && time > points[index + 1].t) {
    index += 1;
  }

  const current = points[index];

  const next = points[index + 1];

  return {
    current,
    next,
    amount: (time - current.t) / (next.t - current.t),
    index,
  };
}

function sampleLinear(points, time, key) {
  const { current, next, amount } = findSegment(points, time);

  if (current === next) {
    return current[key];
  }

  return interpolate(current[key], next[key], amount);
}

function sampleHermite(points, time, key) {
  if (time <= points[0].t) {
    return points[0][key];
  }

  const lastIndex = points.length - 1;

  if (time >= points[lastIndex].t) {
    return points[lastIndex][key];
  }

  let index = 0;

  while (index < lastIndex - 1 && time > points[index + 1].t) {
    index += 1;
  }

  const current = points[index];

  const next = points[index + 1];

  const previous = index > 0 ? points[index - 1] : current;

  const after = index + 2 <= lastIndex ? points[index + 2] : next;

  const duration = next.t - current.t;

  const amount = (time - current.t) / duration;

  const currentTangent =
    index === 0
      ? (next[key] - current[key]) / duration
      : (next[key] - previous[key]) / (next.t - previous.t);

  const nextTangent =
    index + 1 === lastIndex
      ? (next[key] - current[key]) / duration
      : (after[key] - current[key]) / (after.t - current.t);

  const amount2 = amount * amount;

  const amount3 = amount2 * amount;

  const h00 = 2 * amount3 - 3 * amount2 + 1;

  const h10 = amount3 - 2 * amount2 + amount;

  const h01 = -2 * amount3 + 3 * amount2;

  const h11 = amount3 - amount2;

  return (
    h00 * current[key] +
    h10 * duration * currentTangent +
    h01 * next[key] +
    h11 * duration * nextTangent
  );
}

function sampleHermiteBounded(points, time, key) {
  if (time <= points[0].t) {
    return points[0][key];
  }

  const lastIndex = points.length - 1;

  if (time >= points[lastIndex].t) {
    return points[lastIndex][key];
  }

  const { current, next } = findSegment(points, time);

  const value = sampleHermite(points, time, key);

  return clamp(
    value,
    Math.min(current[key], next[key]),
    Math.max(current[key], next[key]),
  );
}

function setNumberAttribute(element, attribute, value) {
  element.setAttribute(attribute, value.toFixed(3));
}

function polarPoint(cx, cy, radius, angle) {
  const radians = (angle * Math.PI) / 180;

  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  };
}

function createArcPath(cx, cy, radius, startAngle, sweepAngle) {
  const start = polarPoint(cx, cy, radius, startAngle);

  const end = polarPoint(cx, cy, radius, startAngle + sweepAngle);

  const largeArcFlag = Math.abs(sweepAngle) > 180 ? 1 : 0;

  const sweepFlag = sweepAngle >= 0 ? 1 : 0;

  return [
    `M ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${radius.toFixed(3)} ${radius.toFixed(3)} 0`,
    `${largeArcFlag} ${sweepFlag}`,
    `${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
  ].join(" ");
}

function findClosestPathDistance(
  path,
  targetX,
  targetY,
  minimumDistance,
  maximumDistance,
) {
  let bestDistance = minimumDistance;

  let bestError = Infinity;

  const coarseStep = 1;

  for (
    let distance = minimumDistance;
    distance <= maximumDistance;
    distance += coarseStep
  ) {
    const point = path.getPointAtLength(distance);

    const deltaX = point.x - targetX;

    const deltaY = point.y - targetY;

    const error = deltaX * deltaX + deltaY * deltaY;

    if (error < bestError) {
      bestError = error;

      bestDistance = distance;
    }
  }

  const refineStart = Math.max(minimumDistance, bestDistance - 2);

  const refineEnd = Math.min(maximumDistance, bestDistance + 2);

  const refineStep = 0.025;

  for (
    let distance = refineStart;
    distance <= refineEnd;
    distance += refineStep
  ) {
    const point = path.getPointAtLength(distance);

    const deltaX = point.x - targetX;

    const deltaY = point.y - targetY;

    const error = deltaX * deltaX + deltaY * deltaY;

    if (error < bestError) {
      bestError = error;

      bestDistance = distance;
    }
  }

  return bestDistance;
}

function setupBatteryMotion(svg) {
  const batteryPath = svg.querySelector("[data-battery-curve]");

  if (!batteryPath) {
    return;
  }

  const totalLength = batteryPath.getTotalLength();

  let previousDistance = 0;

  const frames = BATTERY_MOTION_FRAMES.map(function mapMotionFrame(frame) {
    const distance = findClosestPathDistance(
      batteryPath,
      frame.x,
      frame.y,
      previousDistance,
      totalLength,
    );

    previousDistance = distance;

    return {
      t: frame.t,
      distance,
    };
  });

  batteryMotionCache.set(svg, {
    totalLength,
    frames,
  });
}

function renderCellular(svg, time) {
  const bars = Array.from(svg.querySelectorAll("[data-cellular-bar]"));

  bars.forEach(function renderBar(element, index) {
    const bar = cellularBars[index];

    const collapse = easeInOutCubic(
      progressBetween(time, bar.collapseStart, bar.collapseEnd),
    );

    const width = interpolate(bar.width, DOT_DIAMETER, collapse);

    const height = interpolate(bar.height, DOT_DIAMETER, collapse);

    let x = bar.x + (bar.width - width) / 2;

    let y = CELLULAR_BASELINE - height;

    if (time >= bar.travel[0].t) {
      const centerX = sampleHermite(bar.travel, time, "x");

      const centerY = sampleHermite(bar.travel, time, "y");

      x = centerX - width / 2;

      y = centerY - height / 2;
    }

    const radius = Math.min(width, height) / 2;

    setNumberAttribute(element, "x", x);

    setNumberAttribute(element, "y", y);

    setNumberAttribute(element, "width", width);

    setNumberAttribute(element, "height", height);

    setNumberAttribute(element, "rx", radius);

    setNumberAttribute(element, "ry", radius);
  });
}

function renderWifi(svg, time) {
  const wifi = svg.querySelector("[data-wifi]");

  const scale = sampleHermiteBounded(wifiFrames, time, "scale");

  const translateX = sampleHermiteBounded(wifiFrames, time, "x");

  const translateY = sampleHermiteBounded(wifiFrames, time, "y");

  const matrixX = WIFI_PIVOT_X + translateX - scale * WIFI_PIVOT_X;

  const matrixY = WIFI_PIVOT_Y + translateY - scale * WIFI_PIVOT_Y;

  wifi.setAttribute(
    "transform",
    `matrix(${scale.toFixed(5)} 0 0 ${scale.toFixed(5)} ${matrixX.toFixed(
      3,
    )} ${matrixY.toFixed(3)})`,
  );
}

function renderBattery(svg, time) {
  const shell = svg.querySelector("[data-battery-shell]");

  const nub = svg.querySelector("[data-battery-nub]");

  const curve = svg.querySelector("[data-battery-curve]");

  const arc = svg.querySelector("[data-battery-arc]");

  const shellX = sampleLinear(batteryShellFrames, time, "x");

  const shellWidth = sampleLinear(batteryShellFrames, time, "width");

  const shellHeight = sampleLinear(batteryShellFrames, time, "height");

  const shellRadius = Math.min(16.3, shellWidth / 2, shellHeight / 2);

  setNumberAttribute(shell, "x", shellX);

  setNumberAttribute(shell, "y", 157);

  setNumberAttribute(shell, "width", shellWidth);

  setNumberAttribute(shell, "height", shellHeight);

  setNumberAttribute(shell, "rx", shellRadius);

  setNumberAttribute(shell, "ry", shellRadius);

  let nubTranslateX = 0;

  if (time <= 0.7333) {
    nubTranslateX = 0;
  } else if (time <= 0.7667) {
    nubTranslateX = interpolate(0, -1, progressBetween(time, 0.7333, 0.7667));
  } else if (time <= 0.8) {
    nubTranslateX = interpolate(-1, -9, progressBetween(time, 0.7667, 0.8));
  } else {
    const shellRight = shellX + shellWidth;

    const hiddenNubLeft = shellRight - 6;

    nubTranslateX = hiddenNubLeft - 463;
  }

  nub.setAttribute("transform", `translate(${nubTranslateX.toFixed(3)} 0)`);

  const showShell = time < 1.2667;

  const showCurve = time >= 1.2667 && time < 2;

  const showArc = time >= 2;

  shell.setAttribute("opacity", showShell ? "1" : "0");

  nub.setAttribute("opacity", showShell ? "1" : "0");

  curve.setAttribute("opacity", showCurve ? "1" : "0");

  arc.setAttribute("opacity", showArc ? "1" : "0");

  if (showCurve) {
    const motion = batteryMotionCache.get(svg);

    if (motion) {
      const centerDistance = sampleLinear(motion.frames, time, "distance");

      const segmentLength = sampleHermiteBounded(
        batterySegmentLengthFrames,
        time,
        "length",
      );

      /*
       * Before the growth phase the dash is centred on the
       * measured battery position.
       *
       * As it begins unfolding into the outer arc, we preserve
       * the original trailing half and let the leading edge
       * progressively travel farther along the same curve.
       */
      const trailingDistance = centerDistance - BATTERY_SEGMENT_BASE_LENGTH / 2;

      curve.setAttribute(
        "stroke-dasharray",
        `${segmentLength.toFixed(3)} ${(
          motion.totalLength + BATTERY_SEGMENT_FINAL_LENGTH
        ).toFixed(3)}`,
      );

      curve.setAttribute("stroke-dashoffset", (-trailingDistance).toFixed(3));
    }

    const strokeProgress = easeInOutCubic(progressBetween(time, 1.3, 1.5));

    const strokeWidth = interpolate(
      BATTERY_CURVE_STROKE_START,
      BATTERY_CURVE_STROKE_END,
      strokeProgress,
    );

    setNumberAttribute(curve, "stroke-width", strokeWidth);
  }

  if (showArc) {
    const cx = sampleLinear(batteryArcFrames, time, "cx");

    const cy = sampleLinear(batteryArcFrames, time, "cy");

    const radius = sampleLinear(batteryArcFrames, time, "r");

    const start = sampleLinear(batteryArcFrames, time, "start");

    const span = sampleLinear(batteryArcFrames, time, "span");

    arc.setAttribute("d", createArcPath(cx, cy, radius, start, span));
  }
}

function DirectionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 6.8H12.1C14.15 6.8 15.8 8.45 15.8 10.5C15.8 12.55 14.15 14.2 12.1 14.2H8.3"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M7.1 4.35L4.45 6.8L7.1 9.25"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CellularStatusMorph() {
  const reducedMotion = useReducedMotion();

  const svgRef = useRef(null);

  const animationFrameRef = useRef(null);

  const lastTimestampRef = useRef(null);

  const timeRef = useRef(0);

  const directionRef = useRef(1);

  const speedRef = useRef(1);

  const playingRef = useRef(false);

  const [direction, setDirection] = useState(1);

  const [speed, setSpeed] = useState(1);

  const [isPlaying, setIsPlaying] = useState(false);

  const renderFrame = useCallback(function renderFrame(time) {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    renderCellular(svg, time);

    renderWifi(svg, time);

    renderBattery(svg, time);
  }, []);

  const tick = useCallback(
    function tick(now) {
      animationFrameRef.current = null;

      if (!playingRef.current) {
        return;
      }

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = now;
      }

      const delta = (now - lastTimestampRef.current) / 1000;

      lastTimestampRef.current = now;

      const nextTime = clamp(
        timeRef.current + delta * speedRef.current * directionRef.current,
        0,
        TOTAL_DURATION,
      );

      timeRef.current = nextTime;

      renderFrame(nextTime);

      const finished =
        directionRef.current > 0 ? nextTime >= TOTAL_DURATION : nextTime <= 0;

      if (finished) {
        playingRef.current = false;

        lastTimestampRef.current = null;

        setIsPlaying(false);

        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [renderFrame],
  );

  const startLoop = useCallback(
    function startLoop() {
      if (animationFrameRef.current !== null) {
        return;
      }

      lastTimestampRef.current = null;

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [tick],
  );

  const playDirection = useCallback(
    function playDirection(nextDirection) {
      directionRef.current = nextDirection;

      setDirection(nextDirection);

      if (reducedMotion) {
        const targetTime = nextDirection > 0 ? TOTAL_DURATION : 0;

        timeRef.current = targetTime;

        renderFrame(targetTime);

        return;
      }

      if (nextDirection > 0 && timeRef.current >= TOTAL_DURATION - 0.001) {
        timeRef.current = 0;

        renderFrame(0);
      }

      if (nextDirection < 0 && timeRef.current <= 0.001) {
        timeRef.current = TOTAL_DURATION;

        renderFrame(TOTAL_DURATION);
      }

      lastTimestampRef.current = null;

      playingRef.current = true;

      setIsPlaying(true);

      startLoop();
    },
    [reducedMotion, renderFrame, startLoop],
  );

  function replayAnimation() {
    const startTime = directionRef.current > 0 ? 0 : TOTAL_DURATION;

    timeRef.current = startTime;

    renderFrame(startTime);

    playDirection(directionRef.current);
  }

  function reverseAnimation() {
    playDirection(directionRef.current > 0 ? -1 : 1);
  }

  function changeSpeed(value) {
    speedRef.current = value;

    setSpeed(value);
  }

  useEffect(
    function initialiseAnimation() {
      const svg = svgRef.current;

      if (!svg) {
        return undefined;
      }

      setupBatteryMotion(svg);

      speedRef.current = 1;

      if (reducedMotion) {
        timeRef.current = TOTAL_DURATION;

        directionRef.current = 1;

        renderFrame(TOTAL_DURATION);

        return undefined;
      }

      timeRef.current = 0;

      directionRef.current = 1;

      setDirection(1);

      renderFrame(0);

      playingRef.current = true;

      setIsPlaying(true);

      startLoop();

      return function cleanupAnimation() {
        playingRef.current = false;

        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);

          animationFrameRef.current = null;
        }

        lastTimestampRef.current = null;
      };
    },
    [reducedMotion, renderFrame, startLoop],
  );

  const activeSpeedIndex = SPEEDS.indexOf(speed);

  return (
    <main data-status="page">
      <h1 data-status="sr-only">Cellular status icon morph</h1>

      <button
        data-status="replay"
        type="button"
        onClick={replayAnimation}
        aria-label="Replay cellular status icon morph"
      >
        <svg
          ref={svgRef}
          data-status="glyph"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          fill="none"
          aria-hidden="true"
        >
          <g data-cellular>
            {cellularBars.map(function renderCellularBar(bar, index) {
              return (
                <rect
                  key={index}
                  data-cellular-bar
                  x={bar.x}
                  y={CELLULAR_BASELINE - bar.height}
                  width={bar.width}
                  height={bar.height}
                  rx={bar.width / 2}
                  ry={bar.width / 2}
                  fill="currentColor"
                />
              );
            })}
          </g>

          <g data-wifi>
            <path
              d={createArcPath(311.5, 201.9, 40.93, -132.07, 84.87)}
              stroke="currentColor"
              strokeWidth={WIFI_STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />

            <path
              d={createArcPath(311.5, 201.9, 24.32, -130.48, 81.48)}
              stroke="currentColor"
              strokeWidth={WIFI_STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />

            <path
              d="
                M 311.5 190
                C 307.1 190 303 192.25 303 195.15
                C 303 196.85 303.9 198.05 305.3 199.35
                L 309.45 203.05
                C 310.75 204.2 312.4 204.2 313.7 203.05
                L 318.55 198.55
                C 319.8 197.4 320.5 196.1 320.5 194.8
                C 320.5 192.15 316.35 190 311.5 190
                Z
              "
              fill="currentColor"
            />
          </g>

          <g data-battery>
            <path
              data-battery-nub
              d="
                M 463 174
                C 463 173.45 463.45 173 464 173
                C 466.5 173 468.7 175.7 468.7 179.5
                C 468.7 183.3 466.5 186 464 186
                C 463.45 186 463 185.55 463 185
                Z
              "
              fill="currentColor"
            />

            <rect
              data-battery-shell
              x="372"
              y="157"
              width="89"
              height="46"
              rx="16.3"
              ry="16.3"
              fill="currentColor"
            />

            <path
              data-battery-curve
              d={BATTERY_GUIDE_PATH}
              stroke="currentColor"
              strokeWidth={BATTERY_CURVE_STROKE_START}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0"
            />

            <path
              data-battery-arc
              d={createArcPath(318.12, 178.53, 55.6, 73.8, 77.64)}
              stroke="currentColor"
              strokeWidth={BATTERY_ARC_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0"
            />
          </g>
        </svg>
      </button>

      <div data-controls="wrap">
        <div data-controls="dock" role="group" aria-label="Animation controls">
          <button
            data-control="direction"
            data-direction={direction > 0 ? "forward" : "reverse"}
            type="button"
            onClick={reverseAnimation}
            aria-label={
              direction > 0 ? "Reverse animation" : "Play animation forward"
            }
          >
            <span data-control="direction-icon" aria-hidden="true">
              <DirectionIcon />
            </span>

            <span data-control="direction-text">
              {direction > 0 ? "Reverse" : "Forward"}
            </span>
          </button>

          <span data-controls="divider" aria-hidden="true" />

          <div
            data-control="speed"
            role="group"
            aria-label="Playback speed"
            style={{
              "--speed-index": activeSpeedIndex,
            }}
          >
            <span data-control="speed-indicator" aria-hidden="true" />

            {SPEEDS.map(function renderSpeed(value) {
              const active = value === speed;

              return (
                <button
                  key={value}
                  data-speed={value}
                  data-active={active ? "true" : "false"}
                  type="button"
                  disabled={reducedMotion}
                  aria-pressed={active}
                  aria-label={`Play animation at ${value} times speed`}
                  onClick={function selectSpeed() {
                    changeSpeed(value);
                  }}
                >
                  {value}×
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
          background: #e1e1e1;
        }

        button {
          font: inherit;
        }

        [data-status="page"] {
          min-height: 100svh;
          display: grid;
          place-content: center;
          justify-items: center;
          padding: 24px;
          overflow: hidden;
          color: #000;
          background: #e1e1e1;
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        [data-status="replay"] {
          inline-size: min(72vw, 960px);
          aspect-ratio: 16 / 9;
          display: grid;
          place-items: center;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 28px;
          color: inherit;
          background: transparent;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        [data-status="glyph"] {
          display: block;
          inline-size: 100%;
          block-size: auto;
          overflow: visible;
          pointer-events: none;
        }

        [data-status="replay"]:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 8px;
        }

        [data-status="sr-only"] {
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

        [data-controls="wrap"] {
          position: fixed;
          z-index: 20;
          left: 50%;
          bottom: max(
            24px,
            env(safe-area-inset-bottom)
          );
          transform: translateX(-50%);
        }

        [data-controls="dock"] {
          display: flex;
          align-items: center;
          gap: 7px;
          min-height: 50px;
          padding: 6px;
          border: 1px solid rgba(0, 0, 0, 0.065);
          border-radius: 18px;
          background: rgba(247, 247, 247, 0.78);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.86),
            0 1px 2px rgba(0, 0, 0, 0.025),
            0 8px 24px rgba(0, 0, 0, 0.07),
            0 24px 60px rgba(0, 0, 0, 0.055);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          animation:
            dock-enter
            700ms
            cubic-bezier(0.16, 1, 0.3, 1)
            both;
          transition:
            transform 350ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 350ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-control="direction"] {
          height: 36px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 11px 0 9px;
          border: 0;
          border-radius: 12px;
          color: rgba(0, 0, 0, 0.76);
          background: transparent;
          cursor: pointer;
          white-space: nowrap;
          -webkit-tap-highlight-color: transparent;
          transition:
            color 180ms ease,
            background-color 180ms ease,
            transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-control="direction-icon"] {
          width: 18px;
          height: 18px;
          display: grid;
          place-items: center;
          transition:
            transform 550ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-control="direction-icon"] svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        [data-direction="reverse"]
          [data-control="direction-icon"] {
          transform: rotate(180deg);
        }

        [data-control="direction-text"] {
          font-size: 12px;
          font-weight: 550;
          letter-spacing: -0.01em;
          line-height: 1;
        }

        [data-controls="divider"] {
          width: 1px;
          height: 22px;
          flex: 0 0 auto;
          background: rgba(0, 0, 0, 0.075);
        }

        [data-control="speed"] {
          --speed-width: 44px;

          position: relative;
          display: grid;
          grid-template-columns:
            repeat(5, var(--speed-width));
          padding: 2px;
          isolation: isolate;
        }

        [data-control="speed-indicator"] {
          position: absolute;
          z-index: -1;
          top: 2px;
          bottom: 2px;
          left: 2px;
          width: var(--speed-width);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow:
            0 0 0 0.5px rgba(0, 0, 0, 0.08),
            0 1px 2px rgba(0, 0, 0, 0.065),
            0 4px 9px rgba(0, 0, 0, 0.035);
          transform:
            translateX(
              calc(
                var(--speed-index) *
                var(--speed-width)
              )
            );
          transition:
            transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-speed] {
          position: relative;
          z-index: 1;
          height: 32px;
          padding: 0;
          border: 0;
          border-radius: 10px;
          color: rgba(0, 0, 0, 0.38);
          background: transparent;
          font-size: 11px;
          font-weight: 560;
          line-height: 1;
          letter-spacing: -0.012em;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition:
            color 180ms ease,
            transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-speed][data-active="true"] {
          color: rgba(0, 0, 0, 0.88);
        }

        [data-speed]:disabled {
          opacity: 0.4;
          cursor: default;
        }

        [data-control="direction"]:focus-visible,
        [data-speed]:focus-visible {
          outline: 2px solid rgba(0, 0, 0, 0.85);
          outline-offset: 2px;
        }

        @media (hover: hover) {
          [data-controls="dock"]:hover {
            transform: translateY(-2px);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.9),
              0 2px 4px rgba(0, 0, 0, 0.025),
              0 12px 32px rgba(0, 0, 0, 0.085),
              0 28px 70px rgba(0, 0, 0, 0.06);
          }

          [data-control="direction"]:hover {
            color: rgba(0, 0, 0, 0.94);
            background: rgba(0, 0, 0, 0.045);
          }

          [data-speed]:not(:disabled):hover {
            color: rgba(0, 0, 0, 0.68);
          }
        }

        [data-control="direction"]:active {
          transform: scale(0.96);
        }

        [data-speed]:not(:disabled):active {
          transform: scale(0.9);
        }

        @keyframes dock-enter {
          from {
            opacity: 0;
            filter: blur(7px);
            transform:
              translateY(14px)
              scale(0.97);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform:
              translateY(0)
              scale(1);
          }
        }

        @media (max-width: 520px) {
          [data-status="replay"] {
            inline-size: min(92vw, 480px);
          }

          [data-controls="wrap"] {
            bottom: max(
              16px,
              env(safe-area-inset-bottom)
            );
          }

          [data-control="direction"] {
            width: 38px;
            padding: 0;
            justify-content: center;
          }

          [data-control="direction-text"] {
            position: absolute;
            width: 1px;
            height: 1px;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
          }

          [data-control="speed"] {
            --speed-width: 41px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-controls="dock"] {
            animation: none;
            transition: none;
          }

          [data-control="direction"],
          [data-control="direction-icon"],
          [data-control="speed-indicator"],
          [data-speed] {
            transition: none;
          }
        }

        @media (forced-colors: active) {
          [data-status="page"] {
            color: CanvasText;
            background: Canvas;
          }

          [data-controls="dock"] {
            border: 1px solid ButtonText;
          }

          [data-control="speed-indicator"] {
            border: 1px solid ButtonText;
          }
        }
      `}</style>
    </main>
  );
}
