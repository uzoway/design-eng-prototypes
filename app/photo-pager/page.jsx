"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const PHOTO_WIDTH = 340;
const PHOTO_HEIGHT = 480;
const GAP = 20;
const STRIDE = PHOTO_WIDTH + GAP;
const PHOTO_COUNT = 8;
const PARALLAX_AMOUNT = 30;
const COMMIT_RATIO = 0.25;
const VELOCITY_THR = 500;
const SPRING_K = 350;
const SPRING_D = 38;
const rubberBand = (offset, dim) =>
  (1 - 1 / (Math.abs(offset) / dim + 1)) * dim * Math.sign(offset);

function Odometer({ value, total }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35em",
        fontVariantNumeric: "tabular-nums",
        fontSize: 13,
        fontWeight: 500,
        color: "#666",
        letterSpacing: "0.02em",
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      <div
        style={{ height: "1em", overflow: "hidden", display: "inline-block" }}
      >
        <div
          style={{
            transform: `translateY(-${value - 1}em)`,
            transition: "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{ height: "1em", lineHeight: 1, color: "#fff" }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <span>of {total}</span>
    </div>
  );
}

function Chevron({ direction }) {
  const d = direction === "left" ? "M10 12L6 8L10 4" : "M6 4L10 8L6 12";
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function PhotoPager() {
  const trackRef = useRef(null);
  const imgRefs = useRef([]);

  const currentIndexRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartPtrRef = useRef(0);
  const rafRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const velocityRef = useRef(0);
  const displayIdxRef = useRef(1);

  const [displayIdx, setDisplayIdx] = useState(1);
  const [committedIdx, setCommittedIdx] = useState(0);
  const [isPressed, setIsPressed] = useState(false);

  const applyState = useCallback(() => {
    const N = currentIndexRef.current;
    const rawOff = dragOffsetRef.current;

    const atLeftEdge = N === 0 && rawOff > 0;
    const atRightEdge = N === PHOTO_COUNT - 1 && rawOff < 0;
    const isEdge = atLeftEdge || atRightEdge;
    const offset = isEdge ? rubberBand(rawOff, PHOTO_WIDTH) : rawOff;

    if (trackRef.current) {
      const trackX = -N * STRIDE + offset;
      trackRef.current.style.transform = `translate3d(${trackX}px, 0, 0)`;
    }

    for (let i = 0; i < PHOTO_COUNT; i++) {
      const imgEl = imgRefs.current[i];
      if (!imgEl) continue;
      const progress = ((i - N) * STRIDE + offset) / STRIDE;
      const shift = -progress * PARALLAX_AMOUNT;
      imgEl.style.transform = `translate3d(${shift}px, 0, 0)`;
    }

    const rawPos = N + -rawOff / STRIDE;
    const rounded = Math.max(0, Math.min(PHOTO_COUNT - 1, Math.round(rawPos)));
    const nextDisplayIdx = rounded + 1;
    if (displayIdxRef.current !== nextDisplayIdx) {
      displayIdxRef.current = nextDisplayIdx;
      setDisplayIdx(nextDisplayIdx);
    }
  }, []);

  const springTo = useCallback(
    (target, onDone) => {
      let velocity = velocityRef.current;
      const dt = 16 / 1000;

      const step = () => {
        const current = dragOffsetRef.current;
        const dist = target - current;
        const acc = SPRING_K * dist - SPRING_D * velocity;
        velocity += acc * dt;
        dragOffsetRef.current = current + velocity * dt;
        applyState();

        if (Math.abs(dist) < 0.5 && Math.abs(velocity) < 10) {
          dragOffsetRef.current = target;
          velocityRef.current = 0;
          rafRef.current = 0;
          applyState();
          if (onDone) onDone();
          return;
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [applyState],
  );

  const onRelease = useCallback(() => {
    const N = currentIndexRef.current;
    const offset = dragOffsetRef.current;
    const velocity = velocityRef.current;

    if ((N === 0 && offset > 0) || (N === PHOTO_COUNT - 1 && offset < 0)) {
      springTo(0);
      return;
    }

    const threshold = PHOTO_WIDTH * COMMIT_RATIO;
    let target = 0;
    let commitTo = null;

    if (offset < -threshold || velocity < -VELOCITY_THR) {
      if (N < PHOTO_COUNT - 1) {
        target = -STRIDE;
        commitTo = "next";
      }
    } else if (offset > threshold || velocity > VELOCITY_THR) {
      if (N > 0) {
        target = STRIDE;
        commitTo = "prev";
      }
    }

    springTo(target, () => {
      if (commitTo === "next") {
        currentIndexRef.current = N + 1;
        dragOffsetRef.current = 0;
        setCommittedIdx(N + 1);
      } else if (commitTo === "prev") {
        currentIndexRef.current = N - 1;
        dragOffsetRef.current = 0;
        setCommittedIdx(N - 1);
      }
      applyState();
    });
  }, [springTo, applyState]);

  const goToNext = useCallback(() => {
    if (isDraggingRef.current) return;
    const N = currentIndexRef.current;
    if (N >= PHOTO_COUNT - 1) return;
    cancelAnimationFrame(rafRef.current);
    velocityRef.current = 0;
    springTo(-STRIDE, () => {
      currentIndexRef.current = N + 1;
      dragOffsetRef.current = 0;
      setCommittedIdx(N + 1);
      applyState();
    });
  }, [springTo, applyState]);

  const goToPrev = useCallback(() => {
    if (isDraggingRef.current) return;
    const N = currentIndexRef.current;
    if (N <= 0) return;
    cancelAnimationFrame(rafRef.current);
    velocityRef.current = 0;
    springTo(STRIDE, () => {
      currentIndexRef.current = N - 1;
      dragOffsetRef.current = 0;
      setCommittedIdx(N - 1);
      applyState();
    });
  }, [springTo, applyState]);

  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl) return;
    const viewport = trackEl.parentElement;
    if (!viewport) return;

    const onDown = (e) => {
      e.preventDefault();
      cancelAnimationFrame(rafRef.current);
      isDraggingRef.current = true;
      setIsPressed(true);
      dragStartPtrRef.current = e.clientX - dragOffsetRef.current;
      lastMoveTimeRef.current = performance.now();
      lastMoveXRef.current = e.clientX;
      velocityRef.current = 0;
      viewport.setPointerCapture(e.pointerId);
    };

    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      dragOffsetRef.current = e.clientX - dragStartPtrRef.current;
      applyState();
      const now = performance.now();
      const dt = (now - lastMoveTimeRef.current) / 1000;
      if (dt > 0) {
        velocityRef.current = (e.clientX - lastMoveXRef.current) / dt;
      }
      lastMoveTimeRef.current = now;
      lastMoveXRef.current = e.clientX;
    };

    const onUp = (e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsPressed(false);
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
      onRelease();
    };

    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    applyState();

    return () => {
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [applyState, onRelease]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToNext, goToPrev]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Photo gallery"
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Photo {committedIdx + 1} of {PHOTO_COUNT}
      </div>

      {/* <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "20px 24px",
          fontSize: 12,
          fontWeight: 500,
          color: "#888",
        }}
      >
        <span>Photo Pager</span>
        <span>Interaction 02</span>
      </header> */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
        }}
      >
        <div
          style={{
            transform: isPressed ? "scale(0.97)" : "scale(1)",
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            width: PHOTO_WIDTH,
            height: PHOTO_HEIGHT,
            position: "relative",
            overflow: "hidden",
            borderRadius: 8,
            cursor: isPressed ? "grabbing" : "grab",
            touchAction: "pan-y",
          }}
        >
          <div
            ref={trackRef}
            style={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              willChange: "transform",
            }}
          >
            {Array.from({ length: PHOTO_COUNT }).map((_, i) => (
              <div
                key={i}
                role="group"
                aria-roledescription="slide"
                aria-label={`Photo ${i + 1} of ${PHOTO_COUNT}`}
                aria-hidden={i !== committedIdx}
                style={{
                  width: PHOTO_WIDTH,
                  height: PHOTO_HEIGHT,
                  flexShrink: 0,
                  marginRight: i < PHOTO_COUNT - 1 ? GAP : 0,
                  overflow: "hidden",
                  position: "relative",
                  backgroundColor: "#111",
                }}
              >
                <div
                  ref={(el) => (imgRefs.current[i] = el)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: -PARALLAX_AMOUNT,
                    width: PHOTO_WIDTH + 2 * PARALLAX_AMOUNT,
                    height: "100%",
                    background: `#111 url(/photos/portrait-${String(i + 1)}.webp) center/cover no-repeat`,
                    willChange: "transform",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="nav"
            onClick={goToPrev}
            disabled={committedIdx === 0}
            aria-label="Previous photo"
          >
            <Chevron direction="left" />
          </button>
          <Odometer value={displayIdx} total={PHOTO_COUNT} />
          <button
            className="nav"
            onClick={goToNext}
            disabled={committedIdx === PHOTO_COUNT - 1}
            aria-label="Next photo"
          >
            <Chevron direction="right" />
          </button>
        </div>
      </main>

      <style jsx>{`
        .nav {
          background: transparent;
          border: none;
          padding: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          cursor: pointer;
          border-radius: 10px;
          transition:
            color 200ms,
            background 200ms,
            transform 150ms;
          -webkit-tap-highlight-color: transparent;
        }
        .nav:hover:not(:disabled) {
          color: #fff;
          background: rgba(255, 255, 255, 0.04);
        }
        .nav:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.5);
          outline-offset: 2px;
          color: #fff;
        }
        .nav:active:not(:disabled) {
          transform: scale(0.92);
        }
        .nav:disabled {
          opacity: 0.25;
          cursor: default;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
