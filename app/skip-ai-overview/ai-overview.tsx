"use client";

import {
  AnimatePresence,
  motion,
  useIsPresent,
  useMotionValue,
  usePresenceData,
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

const SOURCES_ROW_QUERY = "(max-width: 1199px)";
const subscribeSourcesRow = (onChange: () => void) => {
  const query = window.matchMedia(SOURCES_ROW_QUERY);

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
};
const isSourcesRow = () => window.matchMedia(SOURCES_ROW_QUERY).matches;

/** The slim bar: the heading row plus room for its 36px buttons and their focus rings. */
const FOLDED_HEIGHT = 52;

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

/* Label + YouTube's 16px/6px padding, a 36px icon slot, and two 1px borders. */
const PILL_CHROME = 16 + 36 + 6 + 2;

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
      : { duration: REVEAL_S, ease: EASE_OUT, delay: restored ? FOLD_S * 0.65 : 0 };

  // Clip only while the height moves (or while folded), so focus rings and
  // the sticky pill aren't cut off the rest of the time.
  const clip = folded || animating;
  // The label resolves near the end of the fold, rather than becoming a
  // compact bar while an empty, full-size overview is still underneath it.
  const headDelay = folded && phase === "skipped" && !reducedMotion ? FOLD_S : 0;

  return (
    <section className="aio" data-folded={folded ? "" : undefined} aria-labelledby={headingId}>
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
                <AnimatePresence initial={false} custom={headDelay}>
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
                            <button type="button" className="aio-text-button aio-always" onClick={alwaysSkip}>
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
              data-generating={!generated ? "" : undefined}
              data-expanded={expanded ? "" : undefined}
              initial={false}
              animate={{ opacity: folded ? 0 : 1 }}
              transition={bodyTransition}
            >
              {/* First in the tab order after the heading, though it sits at the bottom. */}
              <div className="aio-rail">
                <div className="aio-rail-stick">
                  <AnimatePresence>
                    {pillShown && (
                      <SkipPill
                        key="pill"
                        ready={phase === "ready"}
                        seconds={seconds}
                        progress={progress}
                        delay={restored && !reducedMotion ? FOLD_S * 0.65 : 0}
                        reducedMotion={reducedMotion}
                        onSkip={skip}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <motion.div
                id={contentId}
                className="aio-clip"
                initial={false}
                animate={{ height: expanded ? "auto" : phone ? COLLAPSED_HEIGHT_PHONE : COLLAPSED_HEIGHT }}
                transition={reducedMotion ? { duration: 0 } : { duration: FOLD_S, ease: FOLD_EASE }}
              >
                <AnimatePresence initial={false} mode="wait">
                  {generated ? (
                    <Overview key="answer" blocks={search.overview} stagger={!restored} reducedMotion={reducedMotion} />
                  ) : (
                    <motion.div key="shimmer" exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.1 }}>
                      <Shimmer reducedMotion={reducedMotion} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <AnimatePresence initial={false}>
                {generated && !expanded && (
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
                aria-hidden={!generated ? true : undefined}
                disabled={!generated}
                onClick={() => setExpanded((value) => !value)}
                initial={restored || reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: REVEAL_S, ease: EASE_OUT }}
              >
                <span>{expanded ? "Show less" : "Show more"}</span>
                <ChevronDownIcon size={20} className="aio-more-chevron" />
              </motion.button>
            </motion.div>
          </div>

          <motion.div
            className="aio-side"
            inert={folded || !generated}
            aria-hidden={folded || !generated ? true : undefined}
            initial={false}
            animate={{ opacity: folded || !generated ? 0 : 1 }}
            transition={bodyTransition}
          >
            <SourcesPanel cards={search.cards} topic={search.id} reducedMotion={reducedMotion} />
          </motion.div>
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
  const delay: number = usePresenceData() ?? 0;

  return (
    <motion.div
      className="aio-head-line"
      inert={!present}
      aria-hidden={present ? undefined : true}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? REDUCED_FADE_S : 0.12, ease: "linear", delay }}
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
        whileTap={ready && !reducedMotion ? { scale: 0.96 } : undefined}
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
              <motion.span
                key="glyph"
                className="sk-skip-icon-cell"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0 }}
                transition={reducedMotion ? swap : { type: "spring", duration: 0.3, bounce: 0 }}
              >
                <SkipGlyph />
              </motion.span>
            ) : (
              <motion.span key="ring" className="sk-skip-icon-cell" exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: "blur(4px)" }} transition={swap}>
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
  // Keep the citation with the last word so it never becomes an orphaned
  // line. The chip itself is compact enough for the 320px layout.
  const last = line.runs.at(-1);
  const tail = line.cite && typeof last === "string" ? last.match(/\S+\s*$/)?.[0] : undefined;

  return (
    <>
      {line.runs.map((run, index) => {
        if (typeof run !== "string") return <strong key={index}>{run.bold}</strong>;

        return tail && index === line.runs.length - 1 ? run.slice(0, -tail.length) : run;
      })}
      {line.cite && (
        <span className="aio-cite-tail">
          {tail}
          {" "}
          <CiteChip cite={line.cite} />
        </span>
      )}
    </>
  );
}

function CiteChip({ cite }: { cite: Cite }) {
  const sources = cite.sources.map((id) => SOURCES[id]);
  const extra = (cite.more ?? 0) + sources.length - 1;
  const names = sources.map((source) => source.name);
  const spoken = cite.more
    ? `Sources: ${names.join(", ")} and ${cite.more} more`
    : `Sources: ${names.join(" and ")}`;

  return (
    <span className="aio-chip">
      <span className="sk-sr-only">{spoken}</span>
      <span className="aio-chip-visual" aria-hidden="true">
        <Favicon sourceId={sources[0].id} size={18} />
        <span className="aio-chip-names">{names[0]}</span>
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

function SourcesPanel({ cards, topic, reducedMotion }: { cards: SourceCard[]; topic: Search["id"]; reducedMotion: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const horizontal = useSyncExternalStore(subscribeSourcesRow, isSourcesRow, () => false);
  const listId = useId();

  return (
    <div className="aio-panel" data-expanded={expanded ? "" : undefined}>
      <ul className="aio-panel-list" id={listId} aria-label="Sources">
        {cards.map((card, index) => {
          const source = SOURCES[card.source];
          const visible = index < 2 || expanded || horizontal;

          return (
            <motion.li
              key={card.source}
              className="aio-card"
              initial={false}
              animate={{ height: visible ? "auto" : 0, opacity: visible ? 1 : 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: FOLD_EASE }}
              inert={!visible}
              aria-hidden={!visible ? true : undefined}
            >
              <div className="aio-card-inner">
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
                  <SourceThumbnail topic={topic} hue={source.hue} />
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
      <motion.button
        type="button"
        className="aio-sources-more"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
        whileTap={reducedMotion ? undefined : { scale: 0.96 }}
      >
        <span>{expanded ? "Show fewer sources" : `Show all ${cards.length} sources`}</span>
        <ChevronDownIcon size={18} />
      </motion.button>
    </div>
  );
}

/** Small, original topic illustrations; no third-party images or branding. */
function SourceThumbnail({ topic, hue }: { topic: Search["id"]; hue: number }) {
  return (
    <svg className="sk-thumb" viewBox="0 0 58 58" style={{ ["--hue" as string]: hue }} aria-hidden="true" focusable="false">
      {topic === "egg" ? (
        <g transform="rotate(-16 29 29)">
          <path className="sk-thumb-paper" d="M42 32c0 10-6 16-13 16s-13-6-13-16S23 10 29 10s13 12 13 22Z" />
          <circle className="sk-thumb-detail" cx="29" cy="33" r="7" />
        </g>
      ) : topic === "tomato" ? (
        <>
          <path className="sk-thumb-paper" d="M46 32c0 10-8 16-17 16s-17-6-17-16 7-17 17-14c10-3 17 4 17 14Z" />
          <path className="sk-thumb-line" d="m29 22-9-7 9 3 7-5-3 8 7 4-11-3-7 4 3-6m4 0v-9" />
        </>
      ) : (
        <>
          <path className="sk-thumb-paper" d="M14 16h25v25a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6Z" />
          <path className="sk-thumb-line" d="M39 21h4a7 7 0 0 1 0 14h-4M20 23h6m-6 7h9m-9 7h6" />
        </>
      )}
    </svg>
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
