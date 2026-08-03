"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PHOTO_WIDTH = 340;
const PHOTO_HEIGHT = 480;
const GAP = 20; // black gap between photos
const STRIDE = PHOTO_WIDTH + GAP; // per-photo horizontal slot
const PHOTO_COUNT = 8;

const SLOWDOWN = 0.3; // incoming-layer lag factor
const COMMIT_RATIO = 0.28; // distance threshold to advance
const VELOCITY_THR = 8; // px/frame flick threshold

const GRAY = "#c8c8c8";
const NUM_COLOR = "#8a8a8a";

/* ------------------------------------------------------------------ */
/*  Physics helpers                                                    */
/* ------------------------------------------------------------------ */

const rubberBand = (offset, dim) =>
  (1 - 1 / (Math.abs(offset) / dim + 1)) * dim * Math.sign(offset);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PhotoPager() {
  const trackRef = useRef(null);
  const photoRefs = useRef([]);

  const currentIndexRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartPtrRef = useRef(0);
  const rafRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const velocityRef = useRef(0);

  const [displayIdx, setDisplayIdx] = useState(1);

  /* --- write current state to the DOM --- */
  const applyState = useCallback(() => {
    const N = currentIndexRef.current;
    const rawOff = dragOffsetRef.current;

    // rubber-band at first/last photo
    const atLeftEdge = N === 0 && rawOff > 0;
    const atRightEdge = N === PHOTO_COUNT - 1 && rawOff < 0;
    const isEdge = atLeftEdge || atRightEdge;

    const offset = isEdge ? rubberBand(rawOff, PHOTO_WIDTH) : rawOff;

    // track base translate
    if (trackRef.current) {
      const trackX = -N * STRIDE + offset;
      trackRef.current.style.transform = `translate3d(${trackX}px, 0, 0)`;
    }

    // per-photo parallax offset
    // incoming layer lags behind the finger by SLOWDOWN, fading to 0 at full commit
    const fade = 1 - Math.min(1, Math.abs(rawOff) / STRIDE);
    for (let i = 0; i < PHOTO_COUNT; i++) {
      const el = photoRefs.current[i];
      if (!el) continue;

      let extra = 0;
      if (!isEdge && rawOff !== 0) {
        const M = i - N; // signed distance to current
        const incoming =
          (M > 0 && rawOff < 0) || // revealing photos to the right
          (M < 0 && rawOff > 0); // revealing photos to the left
        if (incoming) {
          extra = -rawOff * SLOWDOWN * fade;
        }
      }
      el.style.transform = `translate3d(${extra}px, 0, 0)`;
    }
  }, []);

  /* --- spring animate the drag offset toward a target, then callback --- */
  const springTo = useCallback(
    (target, onDone) => {
      const stiffness = 0.18;
      const damping = 0.68;
      let velocity = velocityRef.current;

      const step = () => {
        const current = dragOffsetRef.current;
        const distance = target - current;
        velocity = velocity * damping + distance * stiffness;
        dragOffsetRef.current = current + velocity;
        applyState();

        if (Math.abs(distance) < 0.5 && Math.abs(velocity) < 0.3) {
          dragOffsetRef.current = target;
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

  /* --- decide what to spring to on release --- */
  const onRelease = useCallback(() => {
    const N = currentIndexRef.current;
    const offset = dragOffsetRef.current;
    const velocity = velocityRef.current;

    // at edges, only option is to snap back
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
        setDisplayIdx(N + 2);
      } else if (commitTo === "prev") {
        currentIndexRef.current = N - 1;
        dragOffsetRef.current = 0;
        setDisplayIdx(N);
      }
      applyState();
    });
  }, [springTo, applyState]);

  /* --- pointer handlers on the viewport (interruptible) --- */
  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl) return;
    const viewport = trackEl.parentElement;
    if (!viewport) return;

    const onDown = (e) => {
      e.preventDefault();
      cancelAnimationFrame(rafRef.current);
      isDraggingRef.current = true;
      // origin = clientX - existing offset, so future deltas are absolute
      dragStartPtrRef.current = e.clientX - dragOffsetRef.current;
      lastMoveTimeRef.current = performance.now();
      lastMoveXRef.current = e.clientX;
      velocityRef.current = 0;
      viewport.setPointerCapture(e.pointerId);
      viewport.style.cursor = "grabbing";
    };

    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      dragOffsetRef.current = e.clientX - dragStartPtrRef.current;
      applyState();

      const now = performance.now();
      const dt = now - lastMoveTimeRef.current;
      if (dt > 0) {
        velocityRef.current = ((e.clientX - lastMoveXRef.current) / dt) * 16;
      }
      lastMoveTimeRef.current = now;
      lastMoveXRef.current = e.clientX;
    };

    const onUp = (e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
      viewport.style.cursor = "grab";
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

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#c9c9c9",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "20px 24px",
          fontSize: 11,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          color: "#5a5a5a",
          letterSpacing: "0.03em",
        }}
      >
        <span>photo_pager.jsx</span>
        <span>prototype 01 · 2026</span>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          padding: "24px",
        }}
      >
        {/* viewport: overflow-hidden window; the black gap between photos
            shows through here during a drag */}
        <div
          style={{
            width: PHOTO_WIDTH,
            height: PHOTO_HEIGHT,
            overflow: "hidden",
            borderRadius: 20,
            background: "#000",
            cursor: "grab",
            touchAction: "pan-y",
            position: "relative",
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
                ref={(el) => (photoRefs.current[i] = el)}
                style={{
                  width: PHOTO_WIDTH,
                  height: PHOTO_HEIGHT,
                  flexShrink: 0,
                  marginRight: i < PHOTO_COUNT - 1 ? GAP : 0,
                  background: GRAY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  fontSize: 128,
                  fontWeight: 300,
                  color: NUM_COLOR,
                  letterSpacing: "-0.05em",
                  willChange: "transform",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>

        {/* counter */}
        <div
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: 11,
            color: "#5a5a5a",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ color: "#d5d5d5" }}>
            {String(displayIdx).padStart(2, "0")}
          </span>
          <span> / {String(PHOTO_COUNT).padStart(2, "0")}</span>
        </div>
      </main>

      <footer
        style={{
          padding: "20px 24px 24px",
          fontSize: 10,
          color: "#3a3a3a",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        drag to swipe · flick to page
      </footer>
    </div>
  );
}
