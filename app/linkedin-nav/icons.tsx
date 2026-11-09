"use client";

import { animate, cancelFrame, frame, useMotionValue, type MotionValue } from "motion/react";
import {
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { BELL, BRIEFCASE, HOUSE, MESSAGE, MESSAGE_FILL, PEOPLE, PEOPLE_FILL } from "./paths";
import type { Tab } from "./state";

/*
 * Each icon is the shipped LinkedIn path split into parts. Motion values
 * drive the SVG transform attribute of each part's <g> directly, with
 * rotation and scale pivots in icon units (rotate(a 12 2.5)), so WebKit and
 * Chrome agree on every origin. Nothing re-renders while an icon moves.
 *
 * Every icon has the same four moves:
 * - hint: under 300ms, played on hover and focus, never restarted mid-play;
 * - activate: the full animation, ending on the shipped filled icon;
 * - deactivate: settles back to the outline from wherever it is;
 * - alert: a simulated event's motion without selecting (bell, messages).
 * All of them start from the current values, so any can interrupt another.
 */

export type IconHandle = {
  /** direction: +1 if the pointer was travelling right, -1 if left. */
  hint(direction?: number): void;
  activate(onFilled?: () => void): void;
  deactivate(): void;
  alert(): void;
  /** Clicking the tab you're already on. */
  reselect(): void;
  /** Pointer down: the icon presses in, waiting for the click. */
  press(): void;
  /** Pointer up without a click: it springs back. */
  release(): void;
};

type IconProps = {
  selected: boolean;
  handle: Ref<IconHandle>;
};

/** LinkedIn's own "move" curve, shared across the site. */
export const LINKEDIN_EASE = [0.34, 0, 0.21, 1] as const;

/** Back to rest after an interruption: quick, no visible overshoot. */
const SETTLE = { type: "spring", stiffness: 520, damping: 44 } as const;

/** How long an outline takes to come back when its tab is deselected. */
const UNFILL = { duration: 0.18, ease: LINKEDIN_EASE };

const round = (value: number) => Math.round(value * 1e4) / 1e4;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** useId's output, made safe for url(#…) references. */
function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

type Binding = readonly [RefObject<Element | null>, string, () => string];

/**
 * Writes attributes straight from motion values, at most once per frame.
 * The same functions give the first render its values, so server HTML and
 * the first painted frame already match the resting icon.
 */
function useBindings(values: MotionValue<number>[], bindings: Binding[]) {
  const latest = useRef(bindings);

  useLayoutEffect(() => {
    latest.current = bindings;
  });

  useLayoutEffect(() => {
    const apply = () => {
      for (const [ref, attribute, read] of latest.current) ref.current?.setAttribute(attribute, read());
    };
    const schedule = () => frame.render(apply);

    apply();

    const stops = values.map((value) => value.on("change", schedule));

    return () => {
      stops.forEach((stop) => stop());
      cancelFrame(apply);
    };
    // The motion values are created once per icon and never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Tracks whether a hint or full animation is still playing, so a hover
 * never restarts a hint, and calls back once a fill lands unless the icon
 * was deselected first.
 */
function usePlayback() {
  const busyUntil = useRef(0);
  const token = useRef(0);

  return {
    idle: () => performance.now() >= busyUntil.current,
    hold: (seconds: number) => {
      busyUntil.current = Math.max(busyUntil.current, performance.now() + seconds * 1000);
    },
    release: () => {
      busyUntil.current = 0;
    },
    /** Starts a new full animation; older ones lose their callbacks. */
    next: () => ++token.current,
    current: (value: number) => token.current === value,
  };
}

/** Pressed in, from the icon's middle: small enough to read as touch, not a shrink. */
const PRESSED = 0.88;
/** Let go: a quick spring with a little overshoot, so the icon pops back out. */
const POP = { type: "spring", stiffness: 600, damping: 18 } as const;

/**
 * Press feedback shared by every icon. The press group is the outermost
 * part, so it never fights an icon's own motion, and is identity at rest.
 */
function usePress() {
  const scale = useMotionValue(1);
  const node = useRef<SVGGElement | null>(null);
  const setNode = useCallback((element: SVGGElement | null) => {
    node.current = element;
  }, []);
  const transform = () => `translate(12 12) scale(${round(scale.get())}) translate(-12 -12)`;

  useBindings([scale], [[node, "transform", transform]]);

  return {
    setNode,
    scale,
    /** Released into a click: pop back out as the full animation starts. */
    pop: () => animate(scale, 1, POP),
    methods: {
      press() {
        animate(scale, PRESSED, { duration: 0.12, ease: [0.23, 1, 0.32, 1] });
      },
      release() {
        animate(scale, 1, POP);
      },
    },
  };
}

type Svg = {
  children: ReactNode;
  pressRef?: (element: SVGGElement | null) => void;
};

/** Identity at rest; motion writes the attribute from then on, never React. */
const AT_REST = "translate(12 12) scale(1) translate(-12 -12)";

function IconSvg({ children, pressRef }: Svg) {
  return (
    <svg
      className="ln-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      overflow="visible"
      aria-hidden="true"
      focusable="false"
    >
      {pressRef ? (
        <g ref={pressRef} transform={AT_REST}>
          {children}
        </g>
      ) : (
        children
      )}
    </svg>
  );
}

/**
 * Two halves of an icon meet exactly on a whole unit at rest. Once the icon
 * is scaled, rotated or moved a fraction of a pixel, each half antialiases
 * the shared edge and a hairline shows between them. So while the halves
 * are still aligned with each other but the icon isn't at rest, one reaches
 * half a unit over the cut.
 */
const SEAM = 0.5;
const overlap = (aligned: boolean, atRest: boolean) => (aligned && !atRest ? SEAM : 0);

/** A clip region with whole-unit edges: everything above (or below) y. */
function Band({ id, top, bottom }: { id: string; top: number; bottom: number }) {
  return (
    <clipPath id={id}>
      <rect x="-8" y={top} width="40" height={bottom - top} />
    </clipPath>
  );
}

/* -------------------------------------------------------------------------- */
/* Home: the house lights up                                                  */
/* -------------------------------------------------------------------------- */

/** The roof and walls part at y = 11, a whole unit below the eaves. */
const HOUSE_CUT = 11;
/** Flood line: the fill shows below it, the outline above it. */
const HOUSE_DRY = 24;
const HOUSE_LIT = -1;

export function HouseIcon({ selected, handle }: IconProps) {
  const id = useSvgId();
  const lift = useMotionValue(0);
  const squash = useMotionValue(1);
  const hop = useMotionValue(0);
  const water = useMotionValue(selected ? HOUSE_LIT : HOUSE_DRY);
  const playback = usePlayback();
  const press = usePress();
  const hopUntil = useRef(0);

  const houseRef = useRef<SVGGElement>(null);
  const roofRef = useRef<SVGGElement>(null);
  const roofClipRef = useRef<SVGRectElement>(null);
  const wallsRef = useRef<SVGGElement>(null);
  const outlineRef = useRef<SVGRectElement>(null);
  const fillRef = useRef<SVGRectElement>(null);

  // The roof rides on the walls, so a squash lowers it too.
  const roof = () => `translate(0 ${round(lift.get() + (1 - squash.get()) * (21 - HOUSE_CUT))})`;
  const walls = () => `translate(0 21) scale(1 ${round(squash.get())}) translate(0 -21)`;
  const house = () => `translate(0 ${round(hop.get())})`;
  // The roof reaches into the walls whenever the house isn't at rest.
  const roofReach = () =>
    String(
      HOUSE_CUT +
        8 +
        overlap(true, lift.get() === 0 && squash.get() === 1 && hop.get() === 0 && press.scale.get() === 1),
    );
  const outlineHeight = () => String(round(water.get() + 8));
  const fillTop = () => String(round(water.get()));

  useBindings(
    [lift, squash, hop, water, press.scale],
    [
      [houseRef, "transform", house],
      [roofRef, "transform", roof],
      [roofClipRef, "height", roofReach],
      [wallsRef, "transform", walls],
      [outlineRef, "height", outlineHeight],
      [fillRef, "y", fillTop],
    ],
  );

  useImperativeHandle(handle, () => ({
    ...press.methods,
    hint() {
      if (!playback.idle()) return;

      playback.hold(0.26);
      animate(lift, [lift.get(), -1.5, 0, 0], {
        duration: 0.26,
        times: [0, 0.38, 0.7, 1],
        ease: ["easeOut", "easeIn", "linear"],
      });
      animate(squash, [squash.get(), 1, 0.96, 1], {
        duration: 0.26,
        times: [0, 0.7, 0.82, 1],
        ease: ["linear", "easeOut", "easeOut"],
      });
    },
    activate(onFilled) {
      const run = playback.next();

      press.pop();

      playback.hold(0.56);
      // Up, a gravity drop, then the walls take the landing.
      animate(lift, [lift.get(), -2.5, 0, 0], {
        duration: 0.56,
        times: [0, 0.2, 0.46, 1],
        ease: ["easeOut", "easeIn", "linear"],
      });
      animate(squash, [squash.get(), 1, 0.95, 1], {
        duration: 0.56,
        times: [0, 0.46, 0.58, 1],
        ease: ["linear", "easeOut", "easeOut"],
      });
      // The lights come on from the floor.
      animate(water, HOUSE_LIT, {
        delay: 0.1,
        duration: 0.22,
        ease: LINKEDIN_EASE,
      }).then(() => {
        if (playback.current(run)) onFilled?.();
      });
    },
    deactivate() {
      playback.next();
      playback.release();
      animate(water, HOUSE_DRY, UNFILL);
      animate(lift, 0, SETTLE);
      animate(squash, 1, SETTLE);
      animate(hop, 0, SETTLE);
    },
    alert() {
      this.hint();
    },
    reselect() {
      // Back to the top of the feed: the whole house hops up and lands. It
      // cuts in over a hover hint (you usually hover just before you click),
      // but never restarts itself on a double click.
      if (performance.now() < hopUntil.current) return;

      hopUntil.current = performance.now() + 460;
      playback.hold(0.46);
      animate(lift, 0, SETTLE);
      animate(hop, [hop.get(), -3, 0, 0], {
        duration: 0.46,
        times: [0, 0.3, 0.6, 1],
        ease: ["easeOut", "easeIn", "linear"],
      });
      animate(squash, [squash.get(), 1, 0.93, 1], {
        duration: 0.46,
        times: [0, 0.6, 0.72, 1],
        ease: ["linear", "easeOut", "easeOut"],
      });
    },
  }));

  const layers = (region: string) => (
    <g clipPath={`url(#${region})`}>
      <path fill="currentColor" d={HOUSE.outline} clipPath={`url(#${id}-outline)`} />
      <path fill="currentColor" d={HOUSE.fill} clipPath={`url(#${id}-fill)`} />
    </g>
  );

  return (
    <IconSvg pressRef={press.setNode}>
      <defs>
        <clipPath id={`${id}-roof`}>
          <rect ref={roofClipRef} x="-8" y="-8" width="40" height={roofReach()} />
        </clipPath>
        <Band id={`${id}-walls`} top={HOUSE_CUT} bottom={32} />
        <clipPath id={`${id}-outline`}>
          <rect ref={outlineRef} x="-8" y="-8" width="40" height={outlineHeight()} />
        </clipPath>
        <clipPath id={`${id}-fill`}>
          <rect ref={fillRef} x="-8" y={fillTop()} width="40" height="48" />
        </clipPath>
      </defs>

      <g ref={houseRef} transform={house()}>
        <g ref={wallsRef} transform={walls()}>
          {layers(`${id}-walls`)}
        </g>
        <g ref={roofRef} transform={roof()}>
          {layers(`${id}-roof`)}
        </g>
      </g>
    </IconSvg>
  );
}

/* -------------------------------------------------------------------------- */
/* My Network: making room                                                    */
/* -------------------------------------------------------------------------- */

/** The outline's shared wall is split at x = 14, a whole unit. */
const PEOPLE_CUT = 14;
/** The small person's feet, for the lean. */
const FEET = "18 21";
/** How far the small person steps out to make room, before settling into the gap. */
const STEP = { x: 1.25, y: 0.6 };
/** How much the big person grows as the small one steps away. */
const GROW = 0.05;
/** Bodies fill up from the feet: the flood line runs from below them to above their shoulders. */
const BODY_FEET = 21.5;
const BODY_SHOULDERS = 11;

export function PeopleIcon({ selected, handle }: IconProps) {
  const id = useSvgId();
  const lean = useMotionValue(0);
  const step = useMotionValue(0);
  const fill = useMotionValue(selected ? 1 : 0);
  const playback = usePlayback();
  const press = usePress();

  const bigRef = useRef<SVGGElement>(null);
  const smallRef = useRef<SVGGElement>(null);
  const outlineBigRef = useRef<SVGPathElement>(null);
  const outlineSmallRef = useRef<SVGPathElement>(null);
  const fillBigRef = useRef<SVGGElement>(null);
  const fillSmallRef = useRef<SVGGElement>(null);
  const bigHeadRef = useRef<SVGPathElement>(null);
  const smallHeadRef = useRef<SVGPathElement>(null);
  const floodRef = useRef<SVGRectElement>(null);
  const bigClipRef = useRef<SVGRectElement>(null);

  // Outline and fill move together; the step is a there-and-back that ends at rest.
  const big = () => `translate(8.25 21) scale(${round(1 + GROW * step.get())}) translate(-8.25 -21)`;
  // Where the two people touch, the big one reaches over while they're pressed together.
  const bigReach = () =>
    String(PEOPLE_CUT + 8 + overlap(step.get() === 0 && lean.get() === 0, press.scale.get() === 1));
  const small = () =>
    `translate(${round(STEP.x * step.get())} ${round(STEP.y * step.get())}) rotate(${round(lean.get())} ${FEET})`;
  // The fill is solid from its first frame: heads grow inside their rings, bodies fill from the feet.
  const fillOpacity = () => (fill.get() > 0.001 ? "1" : "0");
  const outlineOpacity = () => String(round(1 - clamp01((fill.get() - 0.6) / 0.4)));
  const head = (cx: number, cy: number) => () => {
    const scale = round(0.3 + 0.7 * clamp01(fill.get()));

    return `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
  };
  const bigHead = head(8.25, 7);
  const smallHead = head(17.5, 9.75);
  const floodTop = () => String(round(BODY_FEET - (BODY_FEET - BODY_SHOULDERS) * clamp01(fill.get())));

  useBindings(
    [lean, step, fill, press.scale],
    [
      [bigRef, "transform", big],
      [bigClipRef, "width", bigReach],
      [smallRef, "transform", small],
      [outlineBigRef, "opacity", outlineOpacity],
      [outlineSmallRef, "opacity", outlineOpacity],
      [fillBigRef, "opacity", fillOpacity],
      [fillSmallRef, "opacity", fillOpacity],
      [bigHeadRef, "transform", bigHead],
      [smallHeadRef, "transform", smallHead],
      [floodRef, "y", floodTop],
    ],
  );

  useImperativeHandle(handle, () => ({
    ...press.methods,
    hint() {
      if (!playback.idle()) return;

      playback.hold(0.28);
      // Toward the big one: the top of the small person tips left.
      animate(lean, [lean.get(), -6, 0], {
        duration: 0.28,
        times: [0, 0.45, 1],
        ease: ["easeOut", "easeInOut"],
      });
    },
    activate(onFilled) {
      const run = playback.next();

      press.pop();

      playback.hold(0.5);
      animate(lean, 0, SETTLE);
      // Out to make room, a touch too far back, then still.
      animate(step, [step.get(), 1, -0.12, 0], {
        duration: 0.5,
        times: [0, 0.32, 0.68, 1],
        ease: ["easeOut", "easeInOut", "easeInOut"],
      });
      animate(fill, 1, {
        delay: 0.04,
        duration: 0.24,
        ease: LINKEDIN_EASE,
      }).then(() => {
        if (playback.current(run)) onFilled?.();
      });
    },
    deactivate() {
      playback.next();
      playback.release();
      animate(lean, 0, SETTLE);
      animate(step, 0, SETTLE);
      animate(fill, 0, UNFILL);
    },
    alert() {
      this.hint();
    },
    reselect() {
      this.hint();
    },
  }));

  return (
    <IconSvg pressRef={press.setNode}>
      <defs>
        <clipPath id={`${id}-big`}>
          <rect ref={bigClipRef} x="-8" y="-8" width={bigReach()} height="40" />
        </clipPath>
        <clipPath id={`${id}-small`}>
          <rect x={PEOPLE_CUT} y="-8" width="40" height="40" />
        </clipPath>
        <clipPath id={`${id}-flood`}>
          <rect ref={floodRef} x="-8" y={floodTop()} width="40" height="40" />
        </clipPath>
      </defs>

      <g ref={bigRef} transform={big()}>
        <path
          ref={outlineBigRef}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          d={PEOPLE.outline}
          clipPath={`url(#${id}-big)`}
          opacity={outlineOpacity()}
        />
        <g ref={fillBigRef} opacity={fillOpacity()}>
          <path fill="currentColor" d={PEOPLE.fillBigBody} clipPath={`url(#${id}-flood)`} />
          <path ref={bigHeadRef} fill="currentColor" d={PEOPLE.fillBigHead} transform={bigHead()} />
        </g>
      </g>

      <g ref={smallRef} transform={small()}>
        <path
          ref={outlineSmallRef}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          d={PEOPLE.outline}
          clipPath={`url(#${id}-small)`}
          opacity={outlineOpacity()}
        />
        <g ref={fillSmallRef} opacity={fillOpacity()}>
          <path fill="currentColor" d={PEOPLE.fillSmallBody} clipPath={`url(#${id}-flood)`} />
          <path ref={smallHeadRef} fill="currentColor" d={PEOPLE.fillSmallHead} transform={smallHead()} />
        </g>
      </g>
    </IconSvg>
  );
}

/* -------------------------------------------------------------------------- */
/* Jobs: the lid opens                                                        */
/* -------------------------------------------------------------------------- */

/** The lid and body part at y = 12, through the middle of the outline's belt. */
const LID_CUT = 12;
/** The handle parts from the lid at y = 5, just above where its legs meet the lid. */
const HANDLE_CUT = 5;
/** The lid's back edge, where it hinges. */
const HINGE = "2 11.5";
/** The top of the handle, where a hand would hold it. */
const HANDLE_TOP = "12 2";
const CASE_EMPTY = 24;
const CASE_FULL = -2;

export function BriefcaseIcon({ selected, handle }: IconProps) {
  const id = useSvgId();
  const lid = useMotionValue(0);
  const lift = useMotionValue(0);
  const carry = useMotionValue(0);
  const sway = useMotionValue(0);
  const water = useMotionValue(selected ? CASE_FULL : CASE_EMPTY);
  const playback = usePlayback();
  const press = usePress();

  const bagRef = useRef<SVGGElement>(null);
  const lidRef = useRef<SVGGElement>(null);
  const handleRef = useRef<SVGGElement>(null);
  const leftLegRef = useRef<SVGRectElement>(null);
  const rightLegRef = useRef<SVGRectElement>(null);
  const outlineRef = useRef<SVGRectElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const bodyClipRef = useRef<SVGRectElement>(null);
  const handleClipRef = useRef<SVGRectElement>(null);

  // Carried: the whole bag hangs from the top of its handle.
  const bag = () => `translate(0 ${round(-carry.get())}) rotate(${round(sway.get())} ${HANDLE_TOP})`;
  const lidTransform = () => `rotate(${round(lid.get())} ${HINGE})`;
  const handleTransform = () => `translate(0 ${round(-lift.get())})`;
  // While the handle is up, its legs stretch to stay attached. At rest they're empty.
  const legTop = () => String(round(HANDLE_CUT - lift.get()));
  const legHeight = () => String(round(Math.max(0, lift.get())));
  const outlineHeight = () => String(round(water.get() + 8));
  const fillTop = () => String(round(water.get()));
  // The body reaches up into the lid while it's shut, the handle down into
  // the lid while it's down, whenever the bag isn't at rest.
  const carried = () => carry.get() !== 0 || sway.get() !== 0 || press.scale.get() !== 1;
  const bodyTop = () => String(LID_CUT - overlap(lid.get() === 0, !carried()));
  const handleReach = () => String(HANDLE_CUT + 8 + overlap(lift.get() === 0, !carried() && lid.get() === 0));

  useBindings(
    [lid, lift, carry, sway, water, press.scale],
    [
      [bodyClipRef, "y", bodyTop],
      [handleClipRef, "height", handleReach],
      [bagRef, "transform", bag],
      [lidRef, "transform", lidTransform],
      [handleRef, "transform", handleTransform],
      [leftLegRef, "y", legTop],
      [leftLegRef, "height", legHeight],
      [rightLegRef, "y", legTop],
      [rightLegRef, "height", legHeight],
      [outlineRef, "height", outlineHeight],
      [fillRef, "y", fillTop],
    ],
  );

  useImperativeHandle(handle, () => ({
    ...press.methods,
    hint(direction = 1) {
      if (!playback.idle()) return;

      // Picked up: the handle goes first, the bag follows a beat later and
      // lags behind the pointer's travel, then everything hangs still.
      const travel = direction < 0 ? -1 : 1;

      playback.hold(0.3);
      animate(lift, [lift.get(), 1, 0], {
        duration: 0.2,
        times: [0, 0.35, 1],
        ease: ["easeOut", "easeInOut"],
      });
      animate(carry, [carry.get(), 1, 0], {
        delay: 0.05,
        duration: 0.24,
        times: [0, 0.4, 1],
        ease: ["easeOut", "easeInOut"],
      });
      animate(sway, [sway.get(), 3 * travel, -1.5 * travel, 0], {
        delay: 0.05,
        duration: 0.25,
        times: [0, 0.35, 0.7, 1],
        ease: "easeInOut",
      });
    },
    activate(onFilled) {
      const run = playback.next();

      press.pop();

      playback.hold(0.56);
      animate(lift, 0, SETTLE);
      animate(carry, 0, SETTLE);
      animate(sway, 0, SETTLE);
      // Tips open on its hinge, drops shut and bounces once softly.
      animate(lid, [lid.get(), -18, 0, -2.5, 0], {
        duration: 0.56,
        times: [0, 0.26, 0.6, 0.78, 1],
        ease: ["easeOut", "easeIn", "easeOut", "easeIn"],
      });
      // The body fills under the lid as it closes, then the lid.
      animate(water, CASE_FULL, {
        delay: 0.12,
        duration: 0.2,
        ease: LINKEDIN_EASE,
      }).then(() => {
        if (playback.current(run)) onFilled?.();
      });
    },
    deactivate() {
      playback.next();
      playback.release();
      animate(lid, 0, SETTLE);
      animate(lift, 0, SETTLE);
      animate(carry, 0, SETTLE);
      animate(sway, 0, SETTLE);
      animate(water, CASE_EMPTY, UNFILL);
    },
    alert() {
      this.hint();
    },
    reselect() {
      this.hint();
    },
  }));

  const layers = (region: string) => (
    <g clipPath={`url(#${region})`}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d={BRIEFCASE.outline}
        clipPath={`url(#${id}-outline)`}
      />
      <g clipPath={`url(#${id}-fill)`}>
        <path fill="currentColor" d={BRIEFCASE.fillBody} />
        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={BRIEFCASE.fillLid} />
      </g>
    </g>
  );

  return (
    <IconSvg pressRef={press.setNode}>
      <defs>
        {/* The lid: everything above the cut except the handle's arch. */}
        <clipPath id={`${id}-lid`}>
          <path clipRule="evenodd" d={`M-8-8H32V${LID_CUT}H-8ZM6-8V${HANDLE_CUT}H18V-8Z`} />
        </clipPath>
        <clipPath id={`${id}-handle`}>
          <rect ref={handleClipRef} x="6" y="-8" width="12" height={handleReach()} />
        </clipPath>
        <clipPath id={`${id}-body`}>
          <rect ref={bodyClipRef} x="-8" y={bodyTop()} width="40" height="40" />
        </clipPath>
        <clipPath id={`${id}-outline`}>
          <rect ref={outlineRef} x="-8" y="-8" width="40" height={outlineHeight()} />
        </clipPath>
        <clipPath id={`${id}-fill`}>
          <rect ref={fillRef} x="-8" y={fillTop()} width="40" height="48" />
        </clipPath>
      </defs>

      <g ref={bagRef} transform={bag()}>
        {layers(`${id}-body`)}

        <g ref={lidRef} transform={lidTransform()}>
          {layers(`${id}-lid`)}
          <rect ref={leftLegRef} fill="currentColor" x="7.25" width="1.5" y={legTop()} height={legHeight()} />
          <rect ref={rightLegRef} fill="currentColor" x="15.25" width="1.5" y={legTop()} height={legHeight()} />
          <g ref={handleRef} transform={handleTransform()}>
            {layers(`${id}-handle`)}
          </g>
        </g>
      </g>
    </IconSvg>
  );
}

/* -------------------------------------------------------------------------- */
/* Messaging: typing                                                          */
/* -------------------------------------------------------------------------- */

/** The bubble's tail, where the pop grows from. */
const TAIL = { x: 10.25, y: 20.95 };
/** The fill sweeps out from the tail, where the pop grows from too. */
const BUBBLE_CENTER = TAIL;
const BUBBLE_FULL = 21;
const DOT_X = [8, 12, 16];

export function MessageIcon({ selected, handle }: IconProps) {
  const id = useSvgId();
  const pop = useMotionValue(1);
  const reveal = useMotionValue(selected ? BUBBLE_FULL : 0);
  const dot0 = useMotionValue(0);
  const dot1 = useMotionValue(0);
  const dot2 = useMotionValue(0);
  const dots = [dot0, dot1, dot2];
  const playback = usePlayback();
  const press = usePress();

  const bubbleRef = useRef<SVGGElement>(null);
  const dot0Ref = useRef<SVGPathElement>(null);
  const dot1Ref = useRef<SVGPathElement>(null);
  const dot2Ref = useRef<SVGPathElement>(null);
  const hole0Ref = useRef<SVGCircleElement>(null);
  const hole1Ref = useRef<SVGCircleElement>(null);
  const hole2Ref = useRef<SVGCircleElement>(null);
  const outlineRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGCircleElement>(null);

  const bubble = () => `translate(${TAIL.x} ${TAIL.y}) scale(${round(pop.get())}) translate(${-TAIL.x} ${-TAIL.y})`;
  const dotTransform = (dot: MotionValue<number>) => () => `translate(0 ${round(dot.get())})`;
  const dot0Transform = dotTransform(dot0);
  const dot1Transform = dotTransform(dot1);
  const dot2Transform = dotTransform(dot2);
  const radius = () => Math.max(0.001, round(reveal.get()));
  const fillRadius = () => String(radius());
  // Everything outside the growing circle, so the outline's solid dots
  // never sit inside the fill's knocked-out ones.
  const outlineClip = () => {
    const r = radius();
    const { x, y } = BUBBLE_CENTER;

    return `M-8-8H32V32H-8ZM${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  };

  useBindings(
    [pop, reveal, ...dots],
    [
      [bubbleRef, "transform", bubble],
      [dot0Ref, "transform", dot0Transform],
      [dot1Ref, "transform", dot1Transform],
      [dot2Ref, "transform", dot2Transform],
      [hole0Ref, "transform", dot0Transform],
      [hole1Ref, "transform", dot1Transform],
      [hole2Ref, "transform", dot2Transform],
      [outlineRef, "d", outlineClip],
      [fillRef, "r", fillRadius],
    ],
  );

  /** One iMessage-style wave across the dots, in the direction given. */
  const wave = (delay: number, each: number, direction = 1) => {
    dots.forEach((dot, index) => {
      const order = direction < 0 ? dots.length - 1 - index : index;

      animate(dot, [dot.get(), -1.5, 0], {
        delay: delay + order * 0.06,
        duration: each,
        times: [0, 0.45, 1],
        ease: ["easeOut", "easeIn"],
      });
    });
  };

  useImperativeHandle(handle, () => ({
    ...press.methods,
    hint(direction = 1) {
      if (!playback.idle()) return;

      playback.hold(0.28);
      wave(0, 0.16, direction);
    },
    activate(onFilled) {
      const run = playback.next();

      press.pop();

      playback.hold(0.44);
      animate(pop, [pop.get(), 0.92, 1.04, 1], {
        duration: 0.4,
        times: [0, 0.25, 0.6, 1],
        ease: ["easeOut", "easeOut", "easeInOut"],
      });
      wave(0.08, 0.22);
      animate(reveal, BUBBLE_FULL, {
        delay: 0.04,
        duration: 0.24,
        ease: LINKEDIN_EASE,
      }).then(() => {
        if (playback.current(run)) onFilled?.();
      });
    },
    deactivate() {
      playback.next();
      playback.release();
      animate(pop, 1, SETTLE);
      animate(reveal, 0, UNFILL);
    },
    alert() {
      // Someone's typing: two waves.
      playback.hold(0.62);
      wave(0, 0.2);
      wave(0.32, 0.2);
    },
    reselect() {
      this.hint();
    },
  }));

  return (
    <IconSvg pressRef={press.setNode}>
      <defs>
        <clipPath id={`${id}-outline`}>
          <path ref={outlineRef} clipRule="evenodd" d={outlineClip()} />
        </clipPath>
        <clipPath id={`${id}-fill`}>
          <circle ref={fillRef} cx={BUBBLE_CENTER.x} cy={BUBBLE_CENTER.y} r={fillRadius()} />
        </clipPath>
        {/* The dots are knocked out of the fill, and the holes move with them. */}
        <mask id={`${id}-holes`} maskUnits="userSpaceOnUse" x="-8" y="-8" width="40" height="40">
          <rect x="-8" y="-8" width="40" height="40" fill="#fff" />
          <circle ref={hole0Ref} cx={DOT_X[0]} cy="9.75" r="1" fill="#000" transform={dot0Transform()} />
          <circle ref={hole1Ref} cx={DOT_X[1]} cy="9.75" r="1" fill="#000" transform={dot1Transform()} />
          <circle ref={hole2Ref} cx={DOT_X[2]} cy="9.75" r="1" fill="#000" transform={dot2Transform()} />
        </mask>
      </defs>

      <g ref={bubbleRef} transform={bubble()}>
        <g clipPath={`url(#${id}-outline)`}>
          <path ref={dot0Ref} fill="currentColor" d={MESSAGE.dots[0]} transform={dot0Transform()} />
          <path ref={dot1Ref} fill="currentColor" d={MESSAGE.dots[1]} transform={dot1Transform()} />
          <path ref={dot2Ref} fill="currentColor" d={MESSAGE.dots[2]} transform={dot2Transform()} />
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={MESSAGE.bubble} />
        </g>
        <g clipPath={`url(#${id}-fill)`}>
          <path fill="currentColor" d={MESSAGE.fillContour} mask={`url(#${id}-holes)`} />
        </g>
      </g>
    </IconSvg>
  );
}

/* -------------------------------------------------------------------------- */
/* Notifications: the bell rings                                              */
/* -------------------------------------------------------------------------- */

/** The top of the bell, where it hangs. */
const PIVOT = "12 2.5";
/** In the outline the clapper joins the bell's rim; they part at y = 18. */
const CLAPPER_CUT = 18;
/** Flood line, poured from the top: the fill shows above it. */
const BELL_EMPTY = 1;
const BELL_FULL = 24;
/** A damped swing, ±14° to ±8° to ±3°, then rest. */
const RING = [14, -12, 8, -5, 3, 0];

export function BellIcon({ selected, handle }: IconProps) {
  const id = useSvgId();
  const swing = useMotionValue(0);
  const clapper = useMotionValue(0);
  const water = useMotionValue(selected ? BELL_FULL : BELL_EMPTY);
  const playback = usePlayback();
  const press = usePress();

  const bellRef = useRef<SVGGElement>(null);
  const bellClipRef = useRef<SVGRectElement>(null);
  const clapperRef = useRef<SVGGElement>(null);
  const outlineRef = useRef<SVGRectElement>(null);
  const fillRef = useRef<SVGRectElement>(null);

  const bell = () => `rotate(${round(swing.get())} ${PIVOT})`;
  const clapperTransform = () => `rotate(${round(clapper.get())} ${PIVOT})`;
  const outlineTop = () => String(round(water.get()));
  const fillHeight = () => String(round(water.get() + 8));
  // The bell reaches down over the clapper while they swing as one.
  const bellReach = () =>
    String(CLAPPER_CUT + 8 + overlap(swing.get() === clapper.get(), swing.get() === 0 && press.scale.get() === 1));

  useBindings(
    [swing, clapper, water, press.scale],
    [
      [bellClipRef, "height", bellReach],
      [bellRef, "transform", bell],
      [clapperRef, "transform", clapperTransform],
      [outlineRef, "y", outlineTop],
      [fillRef, "height", fillHeight],
    ],
  );

  /** The clapper follows the bell a beat late, so it lags a few degrees. */
  const ring = (angles: number[], duration: number, lag: number) => {
    const times = angles.map((_, index) => (index + 1) / angles.length);

    animate(swing, [swing.get(), ...angles], {
      duration,
      times: [0, ...times],
      ease: "easeInOut",
    });
    animate(clapper, [clapper.get(), ...angles], {
      delay: lag,
      duration,
      times: [0, ...times],
      ease: "easeInOut",
    });
  };

  useImperativeHandle(handle, () => ({
    ...press.methods,
    hint(direction = 1) {
      if (!playback.idle()) return;

      // Brushed by the pointer: the rim swings the way it was moving.
      const push = direction < 0 ? -1 : 1;

      playback.hold(0.28);
      ring([-6 * push, 4 * push, 0], 0.25, 0.03);
    },
    activate(onFilled) {
      const run = playback.next();

      press.pop();

      playback.hold(0.65);
      ring(RING, 0.6, 0.05);
      // Fills on the first swing.
      animate(water, BELL_FULL, { duration: 0.16, ease: LINKEDIN_EASE }).then(() => {
        if (playback.current(run)) onFilled?.();
      });
    },
    deactivate() {
      playback.next();
      playback.release();
      animate(swing, 0, SETTLE);
      animate(clapper, 0, SETTLE);
      animate(water, BELL_EMPTY, UNFILL);
    },
    alert() {
      // Rings from wherever it is, so ten quick notifications never stack.
      playback.hold(0.65);
      ring(RING, 0.6, 0.05);
    },
    reselect() {
      this.hint();
    },
  }));

  const layers = (region: string) => (
    <g clipPath={`url(#${region})`}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d={BELL.outline}
        clipPath={`url(#${id}-outline)`}
      />
      <g clipPath={`url(#${id}-fill)`}>
        <path fill="currentColor" d={BELL.fillBody} />
        <path fill="currentColor" d={BELL.fillClapper} />
      </g>
    </g>
  );

  return (
    <IconSvg pressRef={press.setNode}>
      <defs>
        <clipPath id={`${id}-bell`}>
          <rect ref={bellClipRef} x="-8" y="-8" width="40" height={bellReach()} />
        </clipPath>
        <Band id={`${id}-clapper`} top={CLAPPER_CUT} bottom={32} />
        <clipPath id={`${id}-outline`}>
          <rect ref={outlineRef} x="-8" y={outlineTop()} width="40" height="48" />
        </clipPath>
        <clipPath id={`${id}-fill`}>
          <rect ref={fillRef} x="-8" y="-8" width="40" height={fillHeight()} />
        </clipPath>
      </defs>

      <g ref={clapperRef} transform={clapperTransform()}>
        {layers(`${id}-clapper`)}
      </g>
      <g ref={bellRef} transform={bell()}>
        {layers(`${id}-bell`)}
      </g>
    </IconSvg>
  );
}

/* -------------------------------------------------------------------------- */
/* Reduced motion                                                             */
/* -------------------------------------------------------------------------- */

const STATIC: Record<Tab, { outline: ReactNode; fill: ReactNode }> = {
  home: {
    outline: <path fill="currentColor" d={HOUSE.outline} />,
    fill: <path fill="currentColor" d={HOUSE.fill} />,
  },
  network: {
    outline: <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={PEOPLE.outline} />,
    fill: <path fill="currentColor" d={PEOPLE_FILL} />,
  },
  jobs: {
    outline: <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={BRIEFCASE.outline} />,
    fill: (
      <>
        <path fill="currentColor" d={BRIEFCASE.fillBody} />
        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={BRIEFCASE.fillLid} />
      </>
    ),
  },
  messaging: {
    outline: (
      <>
        <path fill="currentColor" d={MESSAGE.outlineDots} />
        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={MESSAGE.bubble} />
      </>
    ),
    fill: <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={MESSAGE_FILL} />,
  },
  notifications: {
    outline: <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={BELL.outline} />,
    fill: (
      <>
        <path fill="currentColor" d={BELL.fillClapper} />
        <path fill="currentColor" d={BELL.fillBody} />
      </>
    ),
  },
};

/** No swings or floods: the outline crossfades to the fill over 120ms. */
export function StaticIcon({ tab, selected, handle }: IconProps & { tab: Tab }) {
  const [filled, setFilled] = useState(selected);
  const timer = useRef(0);

  useImperativeHandle(handle, () => ({
    hint() {},
    press() {},
    release() {},
    reselect() {},
    activate(onFilled) {
      setFilled(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => onFilled?.(), 120);
    },
    deactivate() {
      window.clearTimeout(timer.current);
      setFilled(false);
    },
    alert() {},
  }));

  return (
    <IconSvg>
      <g className="ln-xfade" style={{ opacity: filled ? 0 : 1 }}>
        {STATIC[tab].outline}
      </g>
      <g className="ln-xfade" style={{ opacity: filled ? 1 : 0 }}>
        {STATIC[tab].fill}
      </g>
    </IconSvg>
  );
}

const ANIMATED = {
  home: HouseIcon,
  network: PeopleIcon,
  jobs: BriefcaseIcon,
  messaging: MessageIcon,
  notifications: BellIcon,
} satisfies Record<Tab, unknown>;

/** The tab's icon, animated or, with reduced motion, crossfaded. */
export function NavIcon({ tab, selected, handle, reduced }: IconProps & { tab: Tab; reduced: boolean }) {
  if (reduced) return <StaticIcon tab={tab} selected={selected} handle={handle} />;

  const Icon = ANIMATED[tab];

  return <Icon selected={selected} handle={handle} />;
}
