"use client";

import {
  AnimatePresence,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
  type Transition,
} from "motion/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { ChevronDownIcon, MoreVertIcon, SkipGlyph, SparkleIcon } from "./icons";
import { SOURCES, type Block, type Cite, type Line, type Search, type SourceCard } from "./queries";

/*
 * Phases, in order. "shown" is the beat between the content landing and the
 * skip pill appearing; "ready" is also where Show brings you back to.
 */
type Phase = "generating" | "shown" | "counting" | "ready" | "skipped" | "off";

const GENERATING_MS = 900;
const COUNTDOWN_MS = 5000;

/** Height of the clipped overview, from the first line to the top of "Show more" (google.com). */
const COLLAPSED_HEIGHT = 273;
const COLLAPSED_HEIGHT_PHONE = 224;

const PHONE_QUERY = "(max-width: 720px)";

const subscribePhone = (onChange: () => void) => {
  const query = window.matchMedia(PHONE_QUERY);

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
};

const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

/** The slim bar: the heading row plus room for its 36px buttons and their focus rings. */
const FOLDED_HEIGHT = 44;

const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1];
/** Google's emphasized easing, used for the fold. */
const FOLD_EASE: [number, number, number, number] = [0.2, 0, 0, 1];
/** The house spring: critically damped (damping = 2√stiffness). */
const HOUSE_SPRING: Transition = { type: "spring", stiffness: 157.91, damping: 25.13 };

const REVEAL_S = 0.2;
const STAGGER_S = 0.03;
const FADE_OUT_S = 0.12;
const FOLD_S = 0.35;
const REDUCED_FADE_S = 0.15;

/* YouTube's skip button: 16px padding, the label, a 36px icon slot, 6px padding. */
const PILL_CHROME = 16 + 36 + 6;

type Props = {
  search: Search;
  announce: (message: string) => void;
  onAlwaysSkip: () => void;
  onTurnBackOn: () => void;
};

export function AiOverview({ search, announce, onAlwaysSkip, onTurnBackOn }: Props) {
  const reducedMotion = useReducedMotion() ?? false;
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);

  const [phase, setPhase] = useState<Phase>("generating");
  const [expanded, setExpanded] = useState(false);
  /** Shown again after a skip: no stagger, and the pill comes back already ready. */
  const [restored, setRestored] = useState(false);
  const [animating, setAnimating] = useState(false);

  const headingId = useId();
  const contentId = useId();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const showRef = useRef<HTMLButtonElement>(null);
  const turnOnRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<RefObject<HTMLElement | null> | null>(null);

  const folded = phase === "skipped" || phase === "off";
  const generated = phase !== "generating";
  const pillShown = phase === "counting" || phase === "ready";

  /* ---------------------------------------------------------------------- */
  /* Timeline: generate, reveal, count down                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (phase === "generating") {
      const timer = window.setTimeout(() => setPhase("shown"), GENERATING_MS);

      return () => window.clearTimeout(timer);
    }

    if (phase === "shown") {
      // Wait for the staggered lines to settle before the pill turns up.
      const lines = countLines(search.overview);
      const settle = reducedMotion ? 150 : (REVEAL_S + STAGGER_S * lines) * 1000 + 150;
      const timer = window.setTimeout(() => setPhase("counting"), settle);

      return () => window.clearTimeout(timer);
    }
  }, [phase, search.overview, reducedMotion]);

  const { seconds, progress } = useCountdown(phase === "counting", COUNTDOWN_MS, () => {
    setPhase("ready");
    announce("You can skip the AI Overview now.");
  });

  // Focus follows the control that replaced the one you used.
  useEffect(() => {
    const target = focusNext.current;

    if (!target) return;

    focusNext.current = null;
    target.current?.focus({ preventScroll: true });
  }, [phase]);

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */

  const skip = () => {
    focusNext.current = showRef;
    setPhase("skipped");
    announce("AI Overview skipped");
  };

  const show = () => {
    focusNext.current = headingRef;
    setRestored(true);
    setPhase("ready");
    announce("AI Overview shown");
  };

  const alwaysSkip = () => {
    focusNext.current = turnOnRef;
    setPhase("off");
    onAlwaysSkip();
    announce("AI Overviews turned off for future searches");
  };

  const turnBackOn = () => {
    focusNext.current = headingRef;
    setRestored(true);
    setPhase("ready");
    onTurnBackOn();
    announce("AI Overviews turned back on");
  };

  /* ---------------------------------------------------------------------- */
  /* Fold                                                                   */
  /* ---------------------------------------------------------------------- */

  // Folding: content out first, then the height. Unfolding: the reverse.
  const heightTransition: Transition = reducedMotion
    ? { duration: 0, delay: folded ? REDUCED_FADE_S : 0 }
    : { duration: FOLD_S, ease: FOLD_EASE, delay: folded ? FADE_OUT_S : 0 };

  const bodyTransition: Transition = reducedMotion
    ? { duration: REDUCED_FADE_S }
    : folded
      ? { duration: FADE_OUT_S, ease: "linear" }
      : { duration: REVEAL_S, ease: EASE_OUT, delay: FOLD_S };

  // Clip only while the height moves (or while folded), so focus rings and
  // the sticky pill aren't cut off the rest of the time.
  const clip = folded || animating;
  const hideBody = folded && !animating;

  return (
    <section className="aio" aria-labelledby={headingId}>
      <motion.div
        className="aio-frame"
        data-clip={clip ? "" : undefined}
        initial={false}
        animate={{ height: folded ? FOLDED_HEIGHT : "auto" }}
        transition={heightTransition}
        onAnimationStart={() => setAnimating(true)}
        onAnimationComplete={() => setAnimating(false)}
      >
        <div className="aio-grid">
          <div className="aio-main">
            <div className="aio-head">
              <SparkleIcon className="aio-sparkle" />
              <div className="aio-head-stack">
                <AnimatePresence initial={false}>
                  {phase === "skipped" ? (
                    <HeadLine key="skipped" reducedMotion={reducedMotion}>
                      {(present) => (
                        <>
                          <h2 id={present ? headingId : undefined} className="aio-title" ref={present ? headingRef : undefined} tabIndex={-1}>
                            AI Overview skipped
                          </h2>
                          <span className="aio-actions">
                            <button type="button" className="aio-text-button" ref={present ? showRef : undefined} onClick={show}>
                              Show
                            </button>
                            <button type="button" className="aio-text-button" onClick={alwaysSkip}>
                              Always skip
                            </button>
                          </span>
                        </>
                      )}
                    </HeadLine>
                  ) : phase === "off" ? (
                    <HeadLine key="off" reducedMotion={reducedMotion}>
                      {(present) => (
                        <>
                          <h2 id={present ? headingId : undefined} className="aio-title" ref={present ? headingRef : undefined} tabIndex={-1}>
                            AI Overviews are off
                          </h2>
                          <span className="aio-dot" aria-hidden="true">
                            ·
                          </span>
                          <button type="button" className="aio-link-button" ref={present ? turnOnRef : undefined} onClick={turnBackOn}>
                            Turn back on
                          </button>
                        </>
                      )}
                    </HeadLine>
                  ) : (
                    <HeadLine key="shown" reducedMotion={reducedMotion}>
                      {(present) => (
                        <h2 id={present ? headingId : undefined} className="aio-title" ref={present ? headingRef : undefined} tabIndex={-1}>
                          AI Overview
                        </h2>
                      )}
                    </HeadLine>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.div
              className="aio-body"
              inert={folded}
              aria-hidden={folded ? true : undefined}
              data-hidden={hideBody ? "" : undefined}
              initial={false}
              animate={{ opacity: folded ? 0 : 1 }}
              transition={bodyTransition}
            >
              {/* First in the tab order after the heading, though it sits at the bottom. */}
              <div className="aio-rail" data-above-more={generated ? "" : undefined}>
                <div className="aio-rail-stick">
                  <AnimatePresence>
                    {pillShown && (
                      <SkipPill
                        key="pill"
                        ready={phase === "ready"}
                        seconds={seconds}
                        progress={progress}
                        delay={restored && !reducedMotion ? FOLD_S + REVEAL_S : 0}
                        reducedMotion={reducedMotion}
                        onSkip={skip}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {generated ? (
                <>
                  <motion.div
                    id={contentId}
                    className="aio-clip"
                    initial={{ height: "auto" }}
                    animate={{ height: expanded ? "auto" : phone ? COLLAPSED_HEIGHT_PHONE : COLLAPSED_HEIGHT }}
                    transition={reducedMotion ? { duration: 0 } : { duration: FOLD_S, ease: FOLD_EASE }}
                  >
                    <Overview blocks={search.overview} stagger={!restored} reducedMotion={reducedMotion} />
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {!expanded && (
                      <motion.div
                        key="fade"
                        className="aio-fade"
                        aria-hidden="true"
                        exit={{ opacity: 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.2 }}
                      />
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    className="aio-more"
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={() => setExpanded((value) => !value)}
                    initial={restored || reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: REVEAL_S, ease: EASE_OUT }}
                  >
                    <span>{expanded ? "Show less" : "Show more"}</span>
                    <ChevronDownIcon size={20} className="aio-more-chevron" />
                  </motion.button>
                </>
              ) : (
                <Shimmer reducedMotion={reducedMotion} />
              )}
            </motion.div>
          </div>

          {generated && (
            <motion.div
              className="aio-side"
              inert={folded}
              aria-hidden={folded ? true : undefined}
              data-hidden={hideBody ? "" : undefined}
              initial={restored || reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: folded ? 0 : 1, y: 0 }}
              transition={bodyTransition}
            >
              <SourcesPanel cards={search.cards} />
            </motion.div>
          )}
        </div>
      </motion.div>

      <hr className="aio-divider" />
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Heading row                                                              */
/* ------------------------------------------------------------------------ */

/**
 * One version of the heading row. Versions cross-fade in place; the one on
 * its way out drops the heading id and leaves the accessibility tree.
 */
function HeadLine({
  children,
  reducedMotion,
}: {
  reducedMotion: boolean;
  children: (present: boolean) => ReactNode;
}) {
  const present = useIsPresent();

  return (
    <motion.div
      className="aio-head-line"
      inert={!present}
      aria-hidden={present ? undefined : true}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? REDUCED_FADE_S : 0.12, ease: "linear" }}
    >
      {children(present)}
    </motion.div>
  );
}

/* ------------------------------------------------------------------------ */
/* Skip pill                                                                */
/* ------------------------------------------------------------------------ */

function SkipPill({
  ready,
  seconds,
  progress,
  delay,
  reducedMotion,
  onSkip,
}: {
  ready: boolean;
  seconds: number;
  progress: MotionValue<number>;
  delay: number;
  reducedMotion: boolean;
  onSkip: () => void;
}) {
  const descriptionId = useId();
  const { widths, ref: measureRef } = useLabelWidths();

  const width = widths ? (ready ? widths.ready : widths.counting) : undefined;
  const swap = { duration: reducedMotion ? 0 : 0.12, ease: "linear" } as const;

  return (
    <>
      <motion.button
        type="button"
        className="sk-skip"
        data-ready={ready ? "" : undefined}
        aria-label="Skip AI Overview"
        aria-disabled={ready ? undefined : true}
        aria-describedby={ready ? undefined : descriptionId}
        onClick={() => {
          if (ready) onSkip();
        }}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1, ...(width ? { width } : {}) }}
        exit={{ opacity: 0, transition: { duration: reducedMotion ? REDUCED_FADE_S : FADE_OUT_S } }}
        transition={{
          opacity: { duration: 0.18, ease: EASE_OUT, delay },
          scale: { duration: 0.18, ease: EASE_OUT, delay },
          width: reducedMotion ? { duration: 0 } : HOUSE_SPRING,
        }}
      >
        <span className="sk-skip-text">
          <AnimatePresence initial={false}>
            {ready ? (
              <motion.span key="ready" className="sk-skip-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={swap}>
                Skip
              </motion.span>
            ) : (
              <motion.span key="counting" className="sk-skip-label" exit={{ opacity: 0 }} transition={swap}>
                Skip in <Digit value={seconds} reducedMotion={reducedMotion} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="sk-skip-icon">
          <AnimatePresence initial={false}>
            {ready ? (
              <motion.span key="glyph" className="sk-skip-icon-cell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={swap}>
                <SkipGlyph />
              </motion.span>
            ) : (
              <motion.span key="ring" className="sk-skip-icon-cell" exit={{ opacity: 0 }} transition={swap}>
                <Ring progress={progress} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>

      {/* Read when the pill is focused; it changes quietly, with no announcement per tick. */}
      <span id={descriptionId} hidden>
        {`Available in ${seconds} ${seconds === 1 ? "second" : "seconds"}`}
      </span>

      <span className="sk-skip-measure" aria-hidden="true" ref={measureRef}>
        <span className="sk-skip-label" data-measure="counting">
          Skip in <span className="sk-digit">0</span>
        </span>
        <span className="sk-skip-label" data-measure="ready">
          Skip
        </span>
      </span>
    </>
  );
}

/** Each second's digit slides up and out as the next comes in from below. */
function Digit({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  if (reducedMotion) return <span className="sk-digit">{value}</span>;

  return (
    <span className="sk-digit">
      <AnimatePresence initial={false}>
        <motion.span
          key={value}
          className="sk-digit-cell"
          initial={{ y: "0.6em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-0.6em", opacity: 0 }}
          transition={{ duration: 0.15, ease: EASE_OUT }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** A thin ring that drains over each second. */
function Ring({ progress }: { progress: MotionValue<number> }) {
  return (
    <svg className="sk-ring" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle className="sk-ring-track" cx="12" cy="12" r="8" />
      <motion.circle className="sk-ring-fill" cx="12" cy="12" r="8" style={{ pathLength: progress }} />
    </svg>
  );
}

/**
 * The pill's two widths, so it can spring from one to the other. Measured
 * from hidden copies of the labels, and again when the web font arrives.
 */
function useLabelWidths() {
  const [widths, setWidths] = useState<{ counting: number; ready: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const measure = () => {
      const counting = element.querySelector<HTMLElement>('[data-measure="counting"]')!;
      const ready = element.querySelector<HTMLElement>('[data-measure="ready"]')!;

      setWidths({
        counting: Math.ceil(counting.getBoundingClientRect().width) + PILL_CHROME,
        ready: Math.ceil(ready.getBoundingClientRect().width) + PILL_CHROME,
      });
    };

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { widths, ref };
}

/* ------------------------------------------------------------------------ */
/* Countdown                                                                */
/* ------------------------------------------------------------------------ */

/**
 * Counts down while active, in whole seconds plus a 0–1 drain for the current
 * second. It pauses while the tab is hidden, as ads do, and resumes exactly
 * where it stopped because the time left lives in a ref.
 */
function useCountdown(active: boolean, total: number, onDone: () => void) {
  const [seconds, setSeconds] = useState(Math.ceil(total / 1000));
  const progress = useMotionValue(1);
  const remainingRef = useRef(total);
  const secondsRef = useRef(seconds);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let last = 0;

    const tick = (now: number) => {
      if (last) remainingRef.current = Math.max(0, remainingRef.current - (now - last));

      last = now;

      const remaining = remainingRef.current;
      const next = Math.ceil(remaining / 1000);

      if (next !== secondsRef.current && next > 0) {
        secondsRef.current = next;
        setSeconds(next);
      }

      progress.set(remaining <= 0 ? 0 : (((remaining - 1) % 1000) + 1) / 1000);

      if (remaining <= 0) {
        frame = 0;
        onDoneRef.current();

        return;
      }

      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame) return;

      last = 0;
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, progress]);

  return { seconds, progress };
}

/* ------------------------------------------------------------------------ */
/* Content                                                                  */
/* ------------------------------------------------------------------------ */

function countLines(blocks: Block[]) {
  return blocks.reduce((sum, block) => sum + (block.kind === "ul" || block.kind === "ol" ? block.items.length : 1), 0);
}

function Overview({ blocks, stagger, reducedMotion }: { blocks: Block[]; stagger: boolean; reducedMotion: boolean }) {
  // Where each block's lines start in the reveal order.
  const starts = blocks.map((_, index) => countLines(blocks.slice(0, index)));

  // Each line fades up 4px, 30ms after the one before.
  const reveal = (line: number) =>
    stagger && !reducedMotion
      ? {
          initial: { opacity: 0, y: 4 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: REVEAL_S, ease: EASE_OUT, delay: STAGGER_S * line },
        }
      : stagger
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: REDUCED_FADE_S } }
        : { initial: false as const };

  return (
    <div className="aio-content">
      {blocks.map((block, blockIndex) => {
        switch (block.kind) {
          case "p":
            return (
              <motion.p key={blockIndex} className="aio-p" {...reveal(starts[blockIndex])}>
                <LineText line={block.line} />
              </motion.p>
            );
          case "h":
            return (
              <motion.div key={blockIndex} className="aio-h" role="heading" aria-level={3} {...reveal(starts[blockIndex])}>
                {block.text}
              </motion.div>
            );
          case "ul":
          case "ol": {
            const List = block.kind === "ul" ? motion.ul : motion.ol;

            return (
              <List key={blockIndex} className={`aio-list aio-${block.kind}`}>
                {block.items.map((item, itemIndex) => (
                  <motion.li key={itemIndex} {...reveal(starts[blockIndex] + itemIndex)}>
                    <LineText line={item} />
                  </motion.li>
                ))}
              </List>
            );
          }
        }
      })}
    </div>
  );
}

function LineText({ line }: { line: Line }) {
  return (
    <>
      {line.runs.map((run, index) => (typeof run === "string" ? run : <strong key={index}>{run.bold}</strong>))}
      {line.cite && (
        <>
          {" "}
          <CiteChip cite={line.cite} />
        </>
      )}
    </>
  );
}

function CiteChip({ cite }: { cite: Cite }) {
  const sources = cite.sources.map((id) => SOURCES[id]);
  const extra = (cite.more ?? 0) + Math.max(0, sources.length - 2);
  const names = sources.slice(0, 2).map((source) => source.name);
  const spoken = extra
    ? `Sources: ${names.join(", ")} and ${extra} more`
    : `Sources: ${names.join(" and ")}`;

  return (
    <span className="aio-chip">
      <span className="sk-sr-only">{spoken}</span>
      <span className="aio-chip-visual" aria-hidden="true">
        <Favicon sourceId={sources[0].id} size={18} />
        <span className="aio-chip-names">
          {names.length > 1 ? (
            <>
              {names[0]} · <span className="aio-chip-second">{names[1]}</span>
            </>
          ) : (
            names[0]
          )}
        </span>
        {extra > 0 && <span className="aio-chip-more">+{extra}</span>}
      </span>
    </span>
  );
}

export function Favicon({ sourceId, size }: { sourceId: string; size: number }) {
  const source = SOURCES[sourceId];

  return (
    <span
      className="sk-favicon"
      aria-hidden="true"
      style={{ width: size, height: size, ["--hue" as string]: source.hue, fontSize: Math.round(size * 0.55) }}
    >
      {source.name[0]}
    </span>
  );
}

function SourcesPanel({ cards }: { cards: SourceCard[] }) {
  return (
    <div className="aio-panel">
      <ul className="aio-panel-list" aria-label="Sources">
        {cards.map((card) => {
          const source = SOURCES[card.source];

          return (
            <li key={card.source} className="aio-card">
              <div className="aio-card-site">
                <Favicon sourceId={source.id} size={16} />
                <span>{source.name}</span>
                <MoreVertIcon size={18} className="aio-card-more" />
              </div>
              <div className="aio-card-row">
                <div className="aio-card-text">
                  <div className="aio-card-title">{card.title}</div>
                  <div className="aio-card-description">{card.description}</div>
                </div>
                <div className="sk-thumb" style={{ ["--hue" as string]: source.hue }} aria-hidden="true" />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="aio-panel-fade" aria-hidden="true" />
    </div>
  );
}

/** Google's placeholder lines while the overview "generates". */
function Shimmer({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="aio-shimmer" data-static={reducedMotion ? "" : undefined} role="status" aria-label="Generating">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
