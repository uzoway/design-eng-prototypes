"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 360;

const WIFI_SCALE = 0.8125;
const WIFI_TRANSLATE_X = 66.496;
const WIFI_TRANSLATE_Y = 34.44;

const WIFI_STROKE_WIDTH = 9.05 * WIFI_SCALE;
const CELLULAR_STROKE_WIDTH = 11;
const BATTERY_STROKE_WIDTH = 8.5;

const MORPH_DURATION = 0.98;

const CONNECTIVITY_CENTER = {
  x: 319.43,
  y: 230.715,
};

const STATES = [
  {
    id: "wifi",
    label: "Wi-Fi",
  },
  {
    id: "cellular",
    label: "Cellular",
  },
  {
    id: "weak",
    label: "Weak",
  },
  {
    id: "no-internet",
    label: "No Internet",
  },
  {
    id: "offline",
    label: "Offline",
  },
];

const CELLULAR_DOTS = [
  {
    x: 291.08,
    y: 227.37,
  },
  {
    x: 309.79,
    y: 234.05,
  },
  {
    x: 329.07,
    y: 234.09,
  },
  {
    x: 347.78,
    y: 227.35,
  },
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function interpolate(from, to, amount) {
  return from + (to - from) * amount;
}

function createCubicBezier(x1, y1, x2, y2) {
  function sampleCurveX(t) {
    const inverse = 1 - t;

    return (
      3 * inverse * inverse * t * x1 + 3 * inverse * t * t * x2 + t * t * t
    );
  }

  function sampleCurveY(t) {
    const inverse = 1 - t;

    return (
      3 * inverse * inverse * t * y1 + 3 * inverse * t * t * y2 + t * t * t
    );
  }

  function sampleDerivativeX(t) {
    return (
      3 * (1 - t) * (1 - t) * x1 +
      6 * (1 - t) * t * (x2 - x1) +
      3 * t * t * (1 - x2)
    );
  }

  return function cubicBezier(progress) {
    const target = clamp(progress);

    if (target === 0 || target === 1) {
      return target;
    }

    let t = target;

    for (let index = 0; index < 6; index += 1) {
      const x = sampleCurveX(t) - target;

      const derivative = sampleDerivativeX(t);

      if (Math.abs(derivative) < 0.000001) {
        break;
      }

      t -= x / derivative;
      t = clamp(t);
    }

    return sampleCurveY(t);
  };
}

const easeMorph = createCubicBezier(0.22, 0.72, 0, 1);

function segmentProgress(progress, start, end) {
  return clamp((progress - start) / (end - start));
}

function polarPoint(cx, cy, radius, angle) {
  const radians = (angle * Math.PI) / 180;

  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  };
}

function createArcPath(cx, cy, radius, startAngle, sweepAngle) {
  if (radius <= 0.02 || Math.abs(sweepAngle) <= 0.02) {
    return [
      `M ${cx.toFixed(3)} ${cy.toFixed(3)}`,
      `L ${cx.toFixed(3)} ${cy.toFixed(3)}`,
    ].join(" ");
  }

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

function createFilledCirclePath(cx, cy, radius) {
  const kappa = 0.5522847498;

  const handle = radius * kappa;

  return [
    `M ${cx.toFixed(3)} ${(cy - radius).toFixed(3)}`,

    `C ${(cx + handle).toFixed(3)} ${(cy - radius).toFixed(3)}`,

    `${(cx + radius).toFixed(3)} ${(cy - handle).toFixed(3)}`,

    `${(cx + radius).toFixed(3)} ${cy.toFixed(3)}`,

    `C ${(cx + radius).toFixed(3)} ${(cy + handle).toFixed(3)}`,

    `${(cx + handle).toFixed(3)} ${(cy + radius).toFixed(3)}`,

    `${cx.toFixed(3)} ${(cy + radius).toFixed(3)}`,

    `C ${(cx - handle).toFixed(3)} ${(cy + radius).toFixed(3)}`,

    `${(cx - radius).toFixed(3)} ${(cy + handle).toFixed(3)}`,

    `${(cx - radius).toFixed(3)} ${cy.toFixed(3)}`,

    `C ${(cx - radius).toFixed(3)} ${(cy - handle).toFixed(3)}`,

    `${(cx - handle).toFixed(3)} ${(cy - radius).toFixed(3)}`,

    `${cx.toFixed(3)} ${(cy - radius).toFixed(3)}`,

    "Z",
  ].join(" ");
}

function cubicPoint(from, control1, control2, to, progress) {
  const inverse = 1 - progress;

  const inverse2 = inverse * inverse;

  const inverse3 = inverse2 * inverse;

  const progress2 = progress * progress;

  const progress3 = progress2 * progress;

  return {
    x:
      inverse3 * from.x +
      3 * inverse2 * progress * control1.x +
      3 * inverse * progress2 * control2.x +
      progress3 * to.x,

    y:
      inverse3 * from.y +
      3 * inverse2 * progress * control1.y +
      3 * inverse * progress2 * control2.y +
      progress3 * to.y,
  };
}

function transformWifiPoint(x, y) {
  return {
    x: x * WIFI_SCALE + WIFI_TRANSLATE_X,

    y: y * WIFI_SCALE + WIFI_TRANSLATE_Y,
  };
}

function interpolatePoint(from, to, progress) {
  return {
    x: interpolate(from.x, to.x, progress),

    y: interpolate(from.y, to.y, progress),
  };
}

function createCircleTargetPoints(cx, cy, radius) {
  const kappa = 0.5522847498;

  return [
    {
      x: cx,
      y: cy - radius,
    },

    {
      x: cx - kappa * radius,
      y: cy - radius,
    },

    {
      x: cx - radius,
      y: cy - kappa * radius,
    },

    {
      x: cx - radius,
      y: cy,
    },

    {
      x: cx - radius,
      y: cy + kappa * radius,
    },

    {
      x: cx - kappa * radius,
      y: cy + radius,
    },

    {
      x: cx,
      y: cy + radius,
    },

    {
      x: cx,
      y: cy + radius,
    },

    {
      x: cx + kappa * radius,
      y: cy + radius,
    },

    {
      x: cx + radius,
      y: cy + kappa * radius,
    },

    {
      x: cx + radius,
      y: cy,
    },

    {
      x: cx + radius,
      y: cy,
    },

    {
      x: cx + radius,
      y: cy - kappa * radius,
    },

    {
      x: cx + kappa * radius,
      y: cy - radius,
    },

    {
      x: cx,
      y: cy - radius,
    },

    {
      x: cx,
      y: cy - radius,
    },

    {
      x: cx,
      y: cy - radius,
    },

    {
      x: cx,
      y: cy - radius,
    },
  ];
}

function interpolatePathPoints(fromPoints, toPoints, progress) {
  return fromPoints.map(function interpolatePathPoint(point, index) {
    return interpolatePoint(point, toPoints[index], progress);
  });
}

function createClosedPath(points) {
  return [
    `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`,

    `C ${points[1].x.toFixed(3)} ${points[1].y.toFixed(3)}`,

    `${points[2].x.toFixed(3)} ${points[2].y.toFixed(3)}`,

    `${points[3].x.toFixed(3)} ${points[3].y.toFixed(3)}`,

    `C ${points[4].x.toFixed(3)} ${points[4].y.toFixed(3)}`,

    `${points[5].x.toFixed(3)} ${points[5].y.toFixed(3)}`,

    `${points[6].x.toFixed(3)} ${points[6].y.toFixed(3)}`,

    `L ${points[7].x.toFixed(3)} ${points[7].y.toFixed(3)}`,

    `C ${points[8].x.toFixed(3)} ${points[8].y.toFixed(3)}`,

    `${points[9].x.toFixed(3)} ${points[9].y.toFixed(3)}`,

    `${points[10].x.toFixed(3)} ${points[10].y.toFixed(3)}`,

    `L ${points[11].x.toFixed(3)} ${points[11].y.toFixed(3)}`,

    `C ${points[12].x.toFixed(3)} ${points[12].y.toFixed(3)}`,

    `${points[13].x.toFixed(3)} ${points[13].y.toFixed(3)}`,

    `${points[14].x.toFixed(3)} ${points[14].y.toFixed(3)}`,

    `C ${points[15].x.toFixed(3)} ${points[15].y.toFixed(3)}`,

    `${points[16].x.toFixed(3)} ${points[16].y.toFixed(3)}`,

    `${points[17].x.toFixed(3)} ${points[17].y.toFixed(3)}`,

    "Z",
  ].join(" ");
}

const WIFI_CENTER = transformWifiPoint(311.5, 201.9);

const WIFI_OUTER_RADIUS = 40.93 * WIFI_SCALE;

const WIFI_MIDDLE_RADIUS = 24.32 * WIFI_SCALE;

const WIFI_SEED = transformWifiPoint(311.5, 197);

const WIFI_TERMINAL_CENTER = transformWifiPoint(311.5, 196.25);

const NO_INTERNET_STEM_CENTER = {
  x: WIFI_CENTER.x,
  y: 193.3,
};

const NO_INTERNET_STEM_RADIUS = 2.35;

const NO_INTERNET_STEM_SCALE_Y = 2;

const NO_INTERNET_DOT = {
  x: WIFI_CENTER.x,
  y: 202.25,
  r: 2.45,
};

const TERMINAL_SOURCE_POINTS = [
  [311.5, 190],

  [307.1, 190],
  [303, 192.25],
  [303, 195.15],

  [303, 196.85],
  [303.9, 198.05],
  [305.3, 199.35],

  [309.45, 203.05],

  [310.75, 204.2],
  [312.4, 204.2],
  [313.7, 203.05],

  [318.55, 198.55],

  [319.8, 197.4],
  [320.5, 196.1],
  [320.5, 194.8],

  [320.5, 192.15],
  [316.35, 190],
  [311.5, 190],
].map(function transformTerminalPoint(point) {
  return transformWifiPoint(point[0], point[1]);
});

const TERMINAL_CELLULAR_POINTS = createCircleTargetPoints(
  CELLULAR_DOTS[2].x,
  CELLULAR_DOTS[2].y,
  5.5,
);

const TERMINAL_OFFLINE_POINTS = createCircleTargetPoints(
  CONNECTIVITY_CENTER.x,
  CONNECTIVITY_CENTER.y,
  0.01,
);

const TERMINAL_NO_INTERNET_POINTS = createCircleTargetPoints(
  NO_INTERNET_STEM_CENTER.x,
  NO_INTERNET_STEM_CENTER.y,
  NO_INTERNET_STEM_RADIUS,
);

function createTerminalPath(progress) {
  return createClosedPath(
    interpolatePathPoints(
      TERMINAL_SOURCE_POINTS,
      TERMINAL_CELLULAR_POINTS,
      progress,
    ),
  );
}

function BatteryArc() {
  return (
    <path
      data-status="battery"
      d={createArcPath(319.56, 179.12, 54.65, -210.47, 242.47)}
      stroke="currentColor"
      strokeWidth={BATTERY_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

function MorphableConnectivity() {
  return (
    <g data-connectivity="morph">
      <path
        data-morph="outer"
        d={createArcPath(
          WIFI_CENTER.x,
          WIFI_CENTER.y,
          WIFI_OUTER_RADIUS,
          -132.07,
          84.87,
        )}
        stroke="currentColor"
        strokeWidth={WIFI_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <path
        data-morph="middle"
        d={createArcPath(
          WIFI_CENTER.x,
          WIFI_CENTER.y,
          WIFI_MIDDLE_RADIUS,
          -130.48,
          81.48,
        )}
        stroke="currentColor"
        strokeWidth={WIFI_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <path
        data-morph="terminal"
        d={createTerminalPath(0)}
        fill="currentColor"
      />

      <circle
        data-morph="seed"
        cx={WIFI_SEED.x}
        cy={WIFI_SEED.y}
        r="0"
        fill="currentColor"
      />
    </g>
  );
}

function setNumberAttribute(element, attribute, value) {
  element.setAttribute(attribute, value.toFixed(3));
}

function setTerminalScale(terminal, center, scaleY) {
  if (Math.abs(scaleY - 1) < 0.001) {
    terminal.removeAttribute("transform");

    return;
  }

  terminal.setAttribute(
    "transform",
    [
      `translate(${center.x.toFixed(3)} ${center.y.toFixed(3)})`,
      `scale(1 ${scaleY.toFixed(4)})`,
      `translate(${(-center.x).toFixed(3)} ${(-center.y).toFixed(3)})`,
    ].join(" "),
  );
}

function resetTerminalScale(terminal) {
  terminal.removeAttribute("transform");
}

function getMorphElements(svg) {
  const outer = svg.querySelector('[data-morph="outer"]');

  const middle = svg.querySelector('[data-morph="middle"]');

  const terminal = svg.querySelector('[data-morph="terminal"]');

  const seed = svg.querySelector('[data-morph="seed"]');

  if (!outer || !middle || !terminal || !seed) {
    return null;
  }

  return {
    outer,
    middle,
    terminal,
    seed,
  };
}

function renderWifiToCellular(elements, progress) {
  const { outer, middle, terminal, seed } = elements;

  resetTerminalScale(terminal);

  const outerProgress = segmentProgress(progress, 0, 0.88);

  const middleProgress = segmentProgress(progress, 0.04, 0.91);

  const terminalProgress = segmentProgress(progress, 0.09, 0.96);

  const seedProgress = segmentProgress(progress, 0.15, 1);

  const outerCenter = cubicPoint(
    WIFI_CENTER,
    {
      x: 317,
      y: 209,
    },
    {
      x: 301,
      y: 223,
    },
    CELLULAR_DOTS[0],
    outerProgress,
  );

  outer.setAttribute(
    "d",
    createArcPath(
      outerCenter.x,
      outerCenter.y,
      interpolate(WIFI_OUTER_RADIUS, 0.01, outerProgress),
      -132.07,
      interpolate(84.87, 0, outerProgress),
    ),
  );

  setNumberAttribute(
    outer,
    "stroke-width",
    interpolate(WIFI_STROKE_WIDTH, CELLULAR_STROKE_WIDTH, outerProgress),
  );

  outer.setAttribute("opacity", "1");

  const middleCenter = cubicPoint(
    WIFI_CENTER,
    {
      x: 319,
      y: 211,
    },
    {
      x: 313,
      y: 227,
    },
    CELLULAR_DOTS[1],
    middleProgress,
  );

  middle.setAttribute(
    "d",
    createArcPath(
      middleCenter.x,
      middleCenter.y,
      interpolate(WIFI_MIDDLE_RADIUS, 0.01, middleProgress),
      -130.48,
      interpolate(81.48, 0, middleProgress),
    ),
  );

  setNumberAttribute(
    middle,
    "stroke-width",
    interpolate(WIFI_STROKE_WIDTH, CELLULAR_STROKE_WIDTH, middleProgress),
  );

  middle.setAttribute("opacity", "1");

  terminal.setAttribute("d", createTerminalPath(terminalProgress));

  terminal.setAttribute("opacity", "1");

  const seedPosition = cubicPoint(
    WIFI_SEED,
    {
      x: 329,
      y: 199,
    },
    {
      x: 344,
      y: 216,
    },
    CELLULAR_DOTS[3],
    seedProgress,
  );

  setNumberAttribute(seed, "cx", seedPosition.x);

  setNumberAttribute(seed, "cy", seedPosition.y);

  setNumberAttribute(seed, "r", interpolate(0, 5.5, seedProgress));

  seed.setAttribute("opacity", "1");
}

function renderCellularToWeak(elements, progress) {
  const { outer, middle, terminal, seed } = elements;

  resetTerminalScale(terminal);

  outer.setAttribute(
    "d",
    createArcPath(CELLULAR_DOTS[0].x, CELLULAR_DOTS[0].y, 0.01, 0, 0),
  );

  setNumberAttribute(outer, "stroke-width", CELLULAR_STROKE_WIDTH);

  outer.setAttribute("opacity", "1");

  middle.setAttribute(
    "d",
    createArcPath(CELLULAR_DOTS[1].x, CELLULAR_DOTS[1].y, 0.01, 0, 0),
  );

  setNumberAttribute(middle, "stroke-width", CELLULAR_STROKE_WIDTH);

  middle.setAttribute("opacity", "1");

  terminal.setAttribute(
    "d",
    createFilledCirclePath(CELLULAR_DOTS[2].x, CELLULAR_DOTS[2].y, 5.5),
  );

  terminal.setAttribute("opacity", interpolate(1, 0.14, progress).toFixed(3));

  setNumberAttribute(seed, "cx", CELLULAR_DOTS[3].x);

  setNumberAttribute(seed, "cy", CELLULAR_DOTS[3].y);

  setNumberAttribute(seed, "r", 5.5);

  seed.setAttribute("opacity", interpolate(1, 0.14, progress).toFixed(3));
}

function renderDotsToOffline(
  elements,
  progress,
  terminalStartOpacity,
  seedStartOpacity,
) {
  const { outer, middle, terminal, seed } = elements;

  resetTerminalScale(terminal);

  const outerConverge = segmentProgress(progress, 0, 0.62);

  const middleConverge = segmentProgress(progress, 0.05, 0.6);

  const terminalConverge = segmentProgress(progress, 0.08, 0.62);

  const seedConverge = segmentProgress(progress, 0, 0.64);

  const ringOpen = segmentProgress(progress, 0.46, 1);

  const collapseOthers = segmentProgress(progress, 0.35, 0.86);

  const outerCenter = cubicPoint(
    CELLULAR_DOTS[0],
    {
      x: 297,
      y: 231,
    },
    {
      x: 310,
      y: 234,
    },
    CONNECTIVITY_CENTER,
    outerConverge,
  );

  outer.setAttribute(
    "d",
    createArcPath(
      outerCenter.x,
      outerCenter.y,
      interpolate(0.01, 7, ringOpen),
      -90,
      interpolate(0, 359.5, ringOpen),
    ),
  );

  setNumberAttribute(
    outer,
    "stroke-width",
    interpolate(CELLULAR_STROKE_WIDTH, 3.5, ringOpen),
  );

  outer.setAttribute("opacity", interpolate(1, 0.38, ringOpen).toFixed(3));

  const middleCenter = cubicPoint(
    CELLULAR_DOTS[1],
    {
      x: 313,
      y: 235,
    },
    {
      x: 317,
      y: 233,
    },
    CONNECTIVITY_CENTER,
    middleConverge,
  );

  middle.setAttribute(
    "d",
    createArcPath(middleCenter.x, middleCenter.y, 0.01, 0, 0),
  );

  setNumberAttribute(
    middle,
    "stroke-width",
    interpolate(CELLULAR_STROKE_WIDTH, 0.01, collapseOthers),
  );

  middle.setAttribute("opacity", "1");

  const terminalCenter = cubicPoint(
    CELLULAR_DOTS[2],
    {
      x: 326,
      y: 235,
    },
    {
      x: 322,
      y: 233,
    },
    CONNECTIVITY_CENTER,
    terminalConverge,
  );

  terminal.setAttribute(
    "d",
    createFilledCirclePath(
      terminalCenter.x,
      terminalCenter.y,
      interpolate(5.5, 0.01, collapseOthers),
    ),
  );

  terminal.setAttribute(
    "opacity",
    interpolate(terminalStartOpacity, 0, collapseOthers).toFixed(3),
  );

  const seedPosition = cubicPoint(
    CELLULAR_DOTS[3],
    {
      x: 340,
      y: 231,
    },
    {
      x: 328,
      y: 234,
    },
    CONNECTIVITY_CENTER,
    seedConverge,
  );

  setNumberAttribute(seed, "cx", seedPosition.x);

  setNumberAttribute(seed, "cy", seedPosition.y);

  setNumberAttribute(seed, "r", interpolate(5.5, 0.01, collapseOthers));

  seed.setAttribute(
    "opacity",
    interpolate(seedStartOpacity, 0, collapseOthers).toFixed(3),
  );
}

function renderWeakToOffline(elements, progress) {
  renderDotsToOffline(elements, progress, 0.14, 0.14);
}

function renderCellularToOffline(elements, progress) {
  renderDotsToOffline(elements, progress, 1, 1);
}

function renderWifiToWeak(elements, progress) {
  renderWifiToCellular(elements, progress);

  const signalFade = segmentProgress(progress, 0.38, 1);

  elements.terminal.setAttribute(
    "opacity",
    interpolate(1, 0.14, signalFade).toFixed(3),
  );

  elements.seed.setAttribute(
    "opacity",
    interpolate(1, 0.14, signalFade).toFixed(3),
  );
}

function renderWifiToOffline(elements, progress) {
  const { outer, middle, terminal, seed } = elements;

  resetTerminalScale(terminal);

  const outerProgress = segmentProgress(progress, 0, 1);

  const middleProgress = segmentProgress(progress, 0.04, 0.83);

  const terminalProgress = segmentProgress(progress, 0.08, 0.8);

  const seedProgress = segmentProgress(progress, 0.14, 0.78);

  const outerCenter = cubicPoint(
    WIFI_CENTER,
    {
      x: 319.2,
      y: 207,
    },
    {
      x: 319.35,
      y: 222,
    },
    CONNECTIVITY_CENTER,
    outerProgress,
  );

  outer.setAttribute(
    "d",
    createArcPath(
      outerCenter.x,
      outerCenter.y,
      interpolate(WIFI_OUTER_RADIUS, 7, outerProgress),
      interpolate(-132.07, -90, outerProgress),
      interpolate(84.87, 359.5, outerProgress),
    ),
  );

  setNumberAttribute(
    outer,
    "stroke-width",
    interpolate(WIFI_STROKE_WIDTH, 3.5, outerProgress),
  );

  outer.setAttribute("opacity", interpolate(1, 0.38, outerProgress).toFixed(3));

  const middleCenter = cubicPoint(
    WIFI_CENTER,
    {
      x: 319.4,
      y: 210,
    },
    {
      x: 319.4,
      y: 222,
    },
    CONNECTIVITY_CENTER,
    middleProgress,
  );

  middle.setAttribute(
    "d",
    createArcPath(
      middleCenter.x,
      middleCenter.y,
      interpolate(WIFI_MIDDLE_RADIUS, 0.01, middleProgress),
      -130.48,
      interpolate(81.48, 0, middleProgress),
    ),
  );

  setNumberAttribute(
    middle,
    "stroke-width",
    interpolate(WIFI_STROKE_WIDTH, 0.01, middleProgress),
  );

  middle.setAttribute("opacity", "1");

  terminal.setAttribute(
    "d",
    createClosedPath(
      interpolatePathPoints(
        TERMINAL_SOURCE_POINTS,
        TERMINAL_OFFLINE_POINTS,
        terminalProgress,
      ),
    ),
  );

  terminal.setAttribute(
    "opacity",
    interpolate(1, 0, terminalProgress).toFixed(3),
  );

  const seedPosition = cubicPoint(
    WIFI_SEED,
    {
      x: 316,
      y: 207,
    },
    {
      x: 319,
      y: 222,
    },
    CONNECTIVITY_CENTER,
    seedProgress,
  );

  setNumberAttribute(seed, "cx", seedPosition.x);

  setNumberAttribute(seed, "cy", seedPosition.y);

  setNumberAttribute(seed, "r", interpolate(0, 0.01, seedProgress));

  seed.setAttribute("opacity", interpolate(1, 0, seedProgress).toFixed(3));
}

function renderWifiToNoInternet(elements, progress) {
  const { terminal, seed } = elements;

  renderWifiToCellular(elements, 0);

  const terminalProgress = segmentProgress(progress, 0, 0.84);

  const seedProgress = segmentProgress(progress, 0.14, 1);

  terminal.setAttribute(
    "d",
    createClosedPath(
      interpolatePathPoints(
        TERMINAL_SOURCE_POINTS,
        TERMINAL_NO_INTERNET_POINTS,
        terminalProgress,
      ),
    ),
  );

  terminal.setAttribute("opacity", "1");

  const terminalCenter = interpolatePoint(
    WIFI_TERMINAL_CENTER,
    NO_INTERNET_STEM_CENTER,
    terminalProgress,
  );

  setTerminalScale(
    terminal,
    terminalCenter,
    interpolate(1, NO_INTERNET_STEM_SCALE_Y, terminalProgress),
  );

  const seedPosition = cubicPoint(
    WIFI_SEED,
    {
      x: WIFI_SEED.x,
      y: 196.5,
    },
    {
      x: NO_INTERNET_DOT.x,
      y: 200.2,
    },
    NO_INTERNET_DOT,
    seedProgress,
  );

  setNumberAttribute(seed, "cx", seedPosition.x);

  setNumberAttribute(seed, "cy", seedPosition.y);

  setNumberAttribute(
    seed,
    "r",
    interpolate(0, NO_INTERNET_DOT.r, seedProgress),
  );

  seed.setAttribute("opacity", "1");
}

function renderDotsToNoInternet(elements, progress, startOpacity) {
  const { terminal, seed } = elements;

  renderWifiToCellular(elements, 1 - progress);

  const terminalProgress = segmentProgress(progress, 0.04, 0.92);

  const seedProgress = segmentProgress(progress, 0.02, 0.94);

  const visibilityProgress = segmentProgress(progress, 0, 0.72);

  terminal.setAttribute(
    "d",
    createClosedPath(
      interpolatePathPoints(
        TERMINAL_CELLULAR_POINTS,
        TERMINAL_NO_INTERNET_POINTS,
        terminalProgress,
      ),
    ),
  );

  const terminalCenter = interpolatePoint(
    CELLULAR_DOTS[2],
    NO_INTERNET_STEM_CENTER,
    terminalProgress,
  );

  setTerminalScale(
    terminal,
    terminalCenter,
    interpolate(1, NO_INTERNET_STEM_SCALE_Y, terminalProgress),
  );

  terminal.setAttribute(
    "opacity",
    interpolate(startOpacity, 1, visibilityProgress).toFixed(3),
  );

  const seedPosition = cubicPoint(
    CELLULAR_DOTS[3],
    {
      x: 342,
      y: 219,
    },
    {
      x: 327,
      y: 206,
    },
    NO_INTERNET_DOT,
    seedProgress,
  );

  setNumberAttribute(seed, "cx", seedPosition.x);

  setNumberAttribute(seed, "cy", seedPosition.y);

  setNumberAttribute(
    seed,
    "r",
    interpolate(5.5, NO_INTERNET_DOT.r, seedProgress),
  );

  seed.setAttribute(
    "opacity",
    interpolate(startOpacity, 1, visibilityProgress).toFixed(3),
  );
}

function renderCellularToNoInternet(elements, progress) {
  renderDotsToNoInternet(elements, progress, 1);
}

function renderWeakToNoInternet(elements, progress) {
  renderDotsToNoInternet(elements, progress, 0.14);
}

function renderOfflineToNoInternet(elements, progress) {
  const { terminal, seed } = elements;

  renderWifiToOffline(elements, 1 - progress);

  const terminalProgress = segmentProgress(progress, 0.08, 0.88);

  const seedProgress = segmentProgress(progress, 0.16, 0.94);

  const visibilityProgress = segmentProgress(progress, 0.08, 0.7);

  terminal.setAttribute(
    "d",
    createClosedPath(
      interpolatePathPoints(
        TERMINAL_OFFLINE_POINTS,
        TERMINAL_NO_INTERNET_POINTS,
        terminalProgress,
      ),
    ),
  );

  const terminalCenter = interpolatePoint(
    CONNECTIVITY_CENTER,
    NO_INTERNET_STEM_CENTER,
    terminalProgress,
  );

  setTerminalScale(
    terminal,
    terminalCenter,
    interpolate(1, NO_INTERNET_STEM_SCALE_Y, terminalProgress),
  );

  terminal.setAttribute(
    "opacity",
    interpolate(0, 1, visibilityProgress).toFixed(3),
  );

  const seedPosition = cubicPoint(
    CONNECTIVITY_CENTER,
    {
      x: 320,
      y: 220,
    },
    {
      x: 319.7,
      y: 208,
    },
    NO_INTERNET_DOT,
    seedProgress,
  );

  setNumberAttribute(seed, "cx", seedPosition.x);

  setNumberAttribute(seed, "cy", seedPosition.y);

  setNumberAttribute(
    seed,
    "r",
    interpolate(0.01, NO_INTERNET_DOT.r, seedProgress),
  );

  seed.setAttribute(
    "opacity",
    interpolate(0, 1, visibilityProgress).toFixed(3),
  );
}

function renderTransition(svg, fromState, toState, progress) {
  const elements = getMorphElements(svg);

  if (!elements) {
    return;
  }

  const t = clamp(progress);

  if (fromState === "wifi" && toState === "cellular") {
    renderWifiToCellular(elements, t);

    return;
  }

  if (fromState === "cellular" && toState === "wifi") {
    renderWifiToCellular(elements, 1 - t);

    return;
  }

  if (fromState === "cellular" && toState === "weak") {
    renderCellularToWeak(elements, t);

    return;
  }

  if (fromState === "weak" && toState === "cellular") {
    renderCellularToWeak(elements, 1 - t);

    return;
  }

  if (fromState === "weak" && toState === "offline") {
    renderWeakToOffline(elements, t);

    return;
  }

  if (fromState === "offline" && toState === "weak") {
    renderWeakToOffline(elements, 1 - t);

    return;
  }

  if (fromState === "wifi" && toState === "weak") {
    renderWifiToWeak(elements, t);

    return;
  }

  if (fromState === "weak" && toState === "wifi") {
    renderWifiToWeak(elements, 1 - t);

    return;
  }

  if (fromState === "cellular" && toState === "offline") {
    renderCellularToOffline(elements, t);

    return;
  }

  if (fromState === "offline" && toState === "cellular") {
    renderCellularToOffline(elements, 1 - t);

    return;
  }

  if (fromState === "wifi" && toState === "offline") {
    renderWifiToOffline(elements, t);

    return;
  }

  if (fromState === "offline" && toState === "wifi") {
    renderWifiToOffline(elements, 1 - t);

    return;
  }

  if (fromState === "wifi" && toState === "no-internet") {
    renderWifiToNoInternet(elements, t);

    return;
  }

  if (fromState === "no-internet" && toState === "wifi") {
    renderWifiToNoInternet(elements, 1 - t);

    return;
  }

  if (fromState === "cellular" && toState === "no-internet") {
    renderCellularToNoInternet(elements, t);

    return;
  }

  if (fromState === "no-internet" && toState === "cellular") {
    renderCellularToNoInternet(elements, 1 - t);

    return;
  }

  if (fromState === "weak" && toState === "no-internet") {
    renderWeakToNoInternet(elements, t);

    return;
  }

  if (fromState === "no-internet" && toState === "weak") {
    renderWeakToNoInternet(elements, 1 - t);

    return;
  }

  if (fromState === "offline" && toState === "no-internet") {
    renderOfflineToNoInternet(elements, t);

    return;
  }

  if (fromState === "no-internet" && toState === "offline") {
    renderOfflineToNoInternet(elements, 1 - t);
  }
}

function renderCanonicalState(svg, state) {
  const elements = getMorphElements(svg);

  if (!elements) {
    return;
  }

  if (state === "wifi") {
    renderWifiToCellular(elements, 0);

    return;
  }

  if (state === "cellular") {
    renderWifiToCellular(elements, 1);

    return;
  }

  if (state === "weak") {
    renderCellularToWeak(elements, 1);

    return;
  }

  if (state === "no-internet") {
    renderWifiToNoInternet(elements, 1);

    return;
  }

  renderWeakToOffline(elements, 1);
}

function StatusIcon({ state, svgRef }) {
  const ariaLabel =
    state === "no-internet"
      ? "Wi-Fi connected, no internet"
      : `${state} connection status`;

  return (
    <svg
      ref={svgRef}
      data-status="icon"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      fill="none"
      role="img"
      aria-label={ariaLabel}
    >
      <BatteryArc />

      <MorphableConnectivity />
    </svg>
  );
}

function SegmentedControl({ value, onChange }) {
  const activeIndex = STATES.findIndex(function findState(state) {
    return state.id === value;
  });

  return (
    <div
      data-control="segments"
      role="radiogroup"
      aria-label="Connection state"
      style={{
        "--active-index": activeIndex,
      }}
    >
      <span data-control="indicator" aria-hidden="true" />

      {STATES.map(function renderState(state) {
        const active = state.id === value;

        return (
          <button
            key={state.id}
            data-control="segment"
            data-active={active ? "true" : "false"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={function selectState() {
              onChange(state.id);
            }}
          >
            {state.label}
          </button>
        );
      })}
    </div>
  );
}

export default function UnifiedConnectionPrototype() {
  const reducedMotion = useReducedMotion();

  const svgRef = useRef(null);

  const animationFrameRef = useRef(null);

  const currentStateRef = useRef("wifi");

  const activeTransitionRef = useRef(null);

  const [state, setState] = useState("wifi");

  const cancelMorph = useCallback(function cancelMorph() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);

      animationFrameRef.current = null;
    }
  }, []);

  const renderPairProgress = useCallback(function renderPairProgress(
    fromState,
    toState,
    progress,
  ) {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    renderTransition(svg, fromState, toState, progress);
  }, []);

  const animatePair = useCallback(
    function animatePair(
      fromState,
      toState,
      startProgress = 0,
      targetProgress = 1,
    ) {
      cancelMorph();

      const distance = Math.abs(targetProgress - startProgress);

      if (reducedMotion || distance === 0) {
        renderPairProgress(fromState, toState, targetProgress);

        currentStateRef.current = targetProgress === 1 ? toState : fromState;

        activeTransitionRef.current = null;

        return;
      }

      const duration = MORPH_DURATION * distance * 1000;

      let startTime = null;

      activeTransitionRef.current = {
        fromState,
        toState,
        progress: startProgress,
        targetProgress,
      };

      function tick(now) {
        if (startTime === null) {
          startTime = now;
        }

        const elapsed = now - startTime;

        const rawProgress = clamp(elapsed / duration);

        const easedProgress = easeMorph(rawProgress);

        const pairProgress = interpolate(
          startProgress,
          targetProgress,
          easedProgress,
        );

        const active = activeTransitionRef.current;

        if (active) {
          active.progress = pairProgress;
        }

        renderPairProgress(fromState, toState, pairProgress);

        if (rawProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);

          return;
        }

        animationFrameRef.current = null;

        renderPairProgress(fromState, toState, targetProgress);

        currentStateRef.current = targetProgress === 1 ? toState : fromState;

        activeTransitionRef.current = null;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [cancelMorph, reducedMotion, renderPairProgress],
  );

  function selectState(nextState) {
    const active = activeTransitionRef.current;

    if (active) {
      if (nextState === active.fromState) {
        setState(nextState);

        animatePair(active.fromState, active.toState, active.progress, 0);

        return;
      }

      if (nextState === active.toState) {
        setState(nextState);

        animatePair(active.fromState, active.toState, active.progress, 1);

        return;
      }

      return;
    }

    const fromState = currentStateRef.current;

    if (nextState === fromState) {
      return;
    }

    setState(nextState);

    animatePair(fromState, nextState, 0, 1);
  }

  useEffect(
    function initialiseMorph() {
      const svg = svgRef.current;

      if (svg) {
        renderCanonicalState(svg, currentStateRef.current);
      }

      return function cleanupMorph() {
        cancelMorph();
      };
    },
    [cancelMorph],
  );

  return (
    <main data-prototype="page">
      <section data-prototype="stage" aria-label="Unified connection prototype">
        <div data-status="stage">
          <StatusIcon state={state} svgRef={svgRef} />
        </div>

        <SegmentedControl value={state} onChange={selectState} />
      </section>

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

        [data-prototype="page"] {
          min-height: 100svh;
          padding: 24px;
          overflow: hidden;
          color: #000;
          background: #e1e1e1;
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Text",
            "Helvetica Neue",
            sans-serif;
          -webkit-font-smoothing:
            antialiased;
          -moz-osx-font-smoothing:
            grayscale;
        }

        [data-prototype="stage"] {
          position: relative;
          width: 100%;
          min-height:
            calc(
              100svh - 48px
            );
        }

        [data-status="stage"] {
          position: absolute;
          top: 50%;
          left: 50%;
          inline-size:
            min(
              86vw,
              860px
            );
          aspect-ratio:
            16 / 9;
          color: inherit;
          transform:
            translate(
              -50%,
              -50%
            );
        }

        [data-status="icon"] {
          display: block;
          width: 100%;
          height: auto;
          overflow: visible;
        }

        [data-control="segments"] {
          --segment-width:
            76px;

          position: absolute;
          bottom:
            clamp(
              12px,
              3.5vh,
              32px
            );
          left: 50%;
          display: grid;
          grid-template-columns:
            repeat(
              5,
              var(
                --segment-width
              )
            );
          align-items: center;
          padding: 3px;
          border:
            1px solid
            rgba(
              0,
              0,
              0,
              0.045
            );
          border-radius: 12px;
          background:
            rgba(
              248,
              248,
              248,
              0.56
            );
          box-shadow:
            inset
              0 1px 0
              rgba(
                255,
                255,
                255,
                0.7
              ),
            0 1px 2px
              rgba(
                0,
                0,
                0,
                0.018
              ),
            0 6px 20px
              rgba(
                0,
                0,
                0,
                0.035
              );
          backdrop-filter:
            blur(20px)
            saturate(1.2);
          -webkit-backdrop-filter:
            blur(20px)
            saturate(1.2);
          transform:
            translateX(-50%);
          isolation: isolate;
          user-select: none;
          -webkit-user-select:
            none;
        }

        [data-control="indicator"] {
          position: absolute;
          z-index: -1;
          top: 3px;
          bottom: 3px;
          left: 3px;
          width:
            var(
              --segment-width
            );
          border-radius: 9px;
          background:
            rgba(
              255,
              255,
              255,
              0.86
            );
          box-shadow:
            0 0 0 0.5px
              rgba(
                0,
                0,
                0,
                0.055
              ),
            0 1px 2px
              rgba(
                0,
                0,
                0,
                0.045
              ),
            0 3px 8px
              rgba(
                0,
                0,
                0,
                0.025
              );
          transform:
            translateX(
              calc(
                var(
                    --active-index
                  ) *
                  var(
                    --segment-width
                  )
              )
            );
          transition:
            transform
              520ms
              cubic-bezier(
                0.22,
                0.72,
                0,
                1
              );
        }

        [data-control="segment"] {
          position: relative;
          z-index: 1;
          height: 30px;
          margin: 0;
          padding: 0 6px;
          border: 0;
          border-radius: 9px;
          color:
            rgba(
              0,
              0,
              0,
              0.3
            );
          background: transparent;
          font-size: 10.5px;
          font-weight: 560;
          line-height: 1;
          letter-spacing:
            -0.01em;
          cursor: pointer;
          touch-action:
            manipulation;
          -webkit-tap-highlight-color:
            transparent;
          transition:
            color
              180ms
              ease,
            transform
              220ms
              cubic-bezier(
                0.22,
                0.72,
                0,
                1
              );
        }

        [data-control="segment"][data-active="true"] {
          color:
            rgba(
              0,
              0,
              0,
              0.78
            );
        }

        [data-control="segment"]:active {
          transform:
            scale(0.96);
        }

        [data-control="segment"]:focus-visible {
          outline:
            2px solid
            rgba(
              0,
              0,
              0,
              0.75
            );
          outline-offset: 2px;
        }

        @media (
          hover: hover
        ) {
          [data-control="segment"]:not(
              [data-active="true"]
            ):hover {
            color:
              rgba(
                0,
                0,
                0,
                0.55
              );
          }
        }

        @media (
          max-width: 520px
        ) {
          [data-status="stage"] {
            inline-size:
              min(
                96vw,
                560px
              );
          }

          [data-control="segments"] {
            --segment-width:
              min(
                18vw,
                70px
              );

            bottom: 10px;
          }

          [data-control="segment"] {
            height: 29px;
            padding: 0 4px;
            font-size: 9.5px;
          }
        }

        @media (
          max-height: 620px
        ) and (
          min-width: 521px
        ) {
          [data-status="stage"] {
            inline-size:
              min(
                74vw,
                700px
              );
          }

          [data-control="segments"] {
            bottom: 8px;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          [data-control="indicator"],
          [data-control="segment"] {
            transition: none;
          }
        }

        @media (
          forced-colors:
            active
        ) {
          [data-prototype="page"] {
            color:
              CanvasText;
            background:
              Canvas;
          }

          [data-control="segments"] {
            border:
              1px solid
              ButtonText;
          }

          [data-control="indicator"] {
            border:
              1px solid
              ButtonText;
          }
        }
      `}</style>
    </main>
  );
}
