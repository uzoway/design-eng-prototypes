"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";

const PHOTO_FILE_COUNT = 20;
const PHOTO_ASPECT = 340 / 480;
const DETAIL_MAX_WIDTH = 400;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const PHOTOS = Array.from({ length: PHOTO_FILE_COUNT }).map((_, i) => ({
  id: `photo-${i}`,
  src: `${BASE_PATH}/photos/portrait-${i + 1}.webp`,
  aspectRatio: PHOTO_ASPECT,
}));

const COLUMN_OPTIONS = [3, 4, 5];
const GRID_MAX_WIDTH = 400;
const TILE_GAP = 3;

const SPRING_K = 350;
const SPRING_D = 38;
const DISMISS_DRAG_Y = 120;
const DISMISS_VELOCITY_Y = 400;
const LAYOUT_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const LAYOUT_DURATION = 500;
const SWITCHER_DURATION = 400;

const lerp = (a, b, t) => a + (b - a) * t;
const lerpRect = (r1, r2, t) => ({
  left: lerp(r1.left, r2.left, t),
  top: lerp(r1.top, r2.top, t),
  width: lerp(r1.width, r2.width, t),
  height: lerp(r1.height, r2.height, t),
});
const rubberBand = (offset, dim) =>
  (1 - 1 / (Math.abs(offset) / dim + 1)) * dim * Math.sign(offset);

const getTileLayout = (i, columns, width) => {
  const size = (width - TILE_GAP * (columns - 1)) / columns;
  const col = i % columns;
  const row = Math.floor(i / columns);
  return {
    left: col * (size + TILE_GAP),
    top: row * (size + TILE_GAP),
    size,
  };
};

const getGridHeight = (columns, width) => {
  const size = (width - TILE_GAP * (columns - 1)) / columns;
  const rows = Math.ceil(PHOTOS.length / columns);
  return rows * size + (rows - 1) * TILE_GAP;
};

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 4L12 12M12 4L4 12" />
    </svg>
  );
}

function ColumnSwitcher({ value, onChange, options }) {
  const TAB_WIDTH = 44;
  const PADDING = 4;
  const activeIndex = options.indexOf(value);
  const buttonsRef = useRef([]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIndex + 1) % options.length;
      onChange(options[next]);
      buttonsRef.current[next]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (activeIndex - 1 + options.length) % options.length;
      onChange(options[prev]);
      buttonsRef.current[prev]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Grid column count"
      onKeyDown={onKeyDown}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        padding: PADDING,
        background: "rgba(255, 255, 255, 0.04)",
        borderRadius: 10,
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: PADDING,
          left: PADDING,
          width: TAB_WIDTH,
          height: `calc(100% - ${PADDING * 2}px)`,
          background: "rgba(255, 255, 255, 0.09)",
          borderRadius: 7,
          transform: `translateX(${activeIndex * TAB_WIDTH}px)`,
          transition: `transform ${SWITCHER_DURATION}ms ${LAYOUT_EASING}`,
          boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.07)",
        }}
      />
      {options.map((n, i) => (
        <button
          key={n}
          type="button"
          role="radio"
          ref={(el) => (buttonsRef.current[i] = el)}
          aria-checked={n === value}
          tabIndex={n === value ? 0 : -1}
          onClick={() => {
            onChange(n);
            buttonsRef.current[i]?.focus();
          }}
          className={`switcher-tab ${n === value ? "active" : ""}`}
          style={{
            position: "relative",
            width: TAB_WIDTH,
            height: 28,
            border: "none",
            background: "transparent",
            fontSize: 12,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontVariantNumeric: "tabular-nums",
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          {n}
        </button>
      ))}
      <style jsx>{`
        .switcher-tab {
          color: #666;
          transition:
            color 250ms ease,
            transform 150ms ease;
        }
        .switcher-tab.active {
          color: #fff;
        }
        .switcher-tab:hover:not(.active) {
          color: #ccc;
        }
        .switcher-tab:active {
          transform: scale(0.94);
        }
        .switcher-tab:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.6);
          outline-offset: 2px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}

export default function GridToDetail() {
  const [activePhoto, setActivePhoto] = useState(null);
  const [phase, setPhase] = useState("closed");
  const [columns, setColumns] = useState(4);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [containerWidth, setContainerWidth] = useState(GRID_MAX_WIDTH);

  const gridWrapperRef = useRef(null);
  const gridContainerRef = useRef(null);
  const gridRefs = useRef(new Map());
  const lastTriggerRef = useRef(null);
  const overlayRef = useRef(null);
  const overlayImgRef = useRef(null);
  const backdropRef = useRef(null);
  const chromeRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useLayoutEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const engine = useRef({
    type: "idle",
    sourceRect: null,
    targetRect: null,
    progress: 0,
    velocity: 0,
    raf: 0,
    isDragging: false,
    dragBaseRect: null,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    lastMoveTime: 0,
    lastMoveY: 0,
    velocityY: 0,
  });

  const getFullscreenRect = useCallback((photo) => {
    const w = Math.min(window.innerWidth, DETAIL_MAX_WIDTH);
    const h = w / photo.aspectRatio;
    return {
      width: w,
      height: h,
      left: (window.innerWidth - w) / 2,
      top: Math.max(0, (window.innerHeight - h) / 2),
    };
  }, []);

  const getDraggedRect = useCallback(() => {
    const { dragBaseRect, deltaX, deltaY } = engine.current;
    if (!dragBaseRect) return null;
    const scale =
      deltaY > 0 ? Math.max(0.5, 1 - deltaY / (window.innerHeight * 1.2)) : 1;
    const adjY = deltaY < 0 ? rubberBand(deltaY, window.innerHeight) : deltaY;
    const width = dragBaseRect.width * scale;
    const height = dragBaseRect.height * scale;
    const left = dragBaseRect.left + deltaX + (dragBaseRect.width - width) / 2;
    const top = dragBaseRect.top + adjY + (dragBaseRect.height - height) / 2;
    return { left, top, width, height, scale };
  }, []);

  const getCurrentRect = useCallback(() => {
    const s = engine.current;
    if (s.isDragging) return getDraggedRect();
    if (s.sourceRect && s.targetRect)
      return lerpRect(s.sourceRect, s.targetRect, s.progress);
    return null;
  }, [getDraggedRect]);

  const applyFrame = useCallback(() => {
    const rect = getCurrentRect();
    if (
      !rect ||
      !overlayImgRef.current ||
      !backdropRef.current ||
      !chromeRef.current
    )
      return;
    const s = engine.current;

    overlayImgRef.current.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    overlayImgRef.current.style.width = `${rect.width}px`;
    overlayImgRef.current.style.height = `${rect.height}px`;

    let radius = 0;
    if (s.type === "open") radius = lerp(3, 0, s.progress);
    else if (s.type === "close") radius = lerp(0, 3, s.progress);
    overlayImgRef.current.style.borderRadius = `${radius}px`;

    let opacity = 1;
    if (s.isDragging) {
      opacity = Math.max(0, 1 - Math.max(0, s.deltaY) / 400);
    } else if (s.type === "open") {
      opacity = s.progress;
    } else if (s.type === "close") {
      opacity = lerp(
        Math.max(0, 1 - Math.max(0, s.deltaY) / 400),
        0,
        s.progress,
      );
    } else if (s.type === "snap") {
      opacity = lerp(
        Math.max(0, 1 - Math.max(0, s.deltaY) / 400),
        1,
        s.progress,
      );
    }
    backdropRef.current.style.opacity = opacity;

    if (s.type === "idle" && !s.isDragging) {
      overlayImgRef.current.style.boxShadow = "";
    } else {
      const y = 20 * opacity;
      const blur = 40 * opacity;
      const alpha = 0.5 * opacity;
      overlayImgRef.current.style.boxShadow = `0 ${y}px ${blur}px rgba(0, 0, 0, ${alpha})`;
    }

    let chromeOpacity = opacity;
    chromeRef.current.style.opacity = chromeOpacity;
    chromeRef.current.style.transform = `translateY(${(1 - chromeOpacity) * -8}px)`;
    if (closeBtnRef.current) {
      closeBtnRef.current.style.pointerEvents =
        !s.isDragging && s.type === "idle" ? "auto" : "none";
    }
  }, [getCurrentRect]);

  const startTransition = useCallback(
    (source, target, type, onComplete) => {
      const s = engine.current;
      cancelAnimationFrame(s.raf);

      s.sourceRect = source;
      s.targetRect = target;
      s.progress = 0;
      s.type = type;

      applyFrame();

      if (reducedMotion) {
        s.progress = 1;
        s.velocity = 0;
        if (type !== "close") {
          s.type = "idle";
          applyFrame();
        }
        if (onComplete) onComplete();
        return;
      }

      let velocity = s.velocity;
      const dt = 16 / 1000;

      const step = () => {
        const dist = 1 - s.progress;
        const acc = SPRING_K * dist - SPRING_D * velocity;
        velocity += acc * dt;
        s.progress += velocity * dt;
        s.velocity = velocity;
        applyFrame();

        if (Math.abs(dist) < 0.001 && Math.abs(velocity) < 0.01) {
          s.progress = 1;
          s.velocity = 0;
          s.raf = 0;

          if (s.type === "close") {
            if (onComplete) onComplete();
            return;
          }

          s.type = "idle";
          applyFrame();
          if (onComplete) onComplete();
          return;
        }
        s.raf = requestAnimationFrame(step);
      };
      s.raf = requestAnimationFrame(step);
    },
    [applyFrame, reducedMotion],
  );

  const openPhoto = useCallback(
    (photo, element) => {
      const s = engine.current;
      const isMidClose = s.type === "close";

      if (activePhoto && !isMidClose) return;

      if (isMidClose) {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
        if (overlayImgRef.current) {
          overlayImgRef.current.style.visibility = "hidden";
        }
      }

      lastTriggerRef.current = element;
      const sourceRect = element.getBoundingClientRect();
      const targetRect = getFullscreenRect(photo);

      s.velocity = 0;
      setActivePhoto(photo);
      setPhase("opening");

      requestAnimationFrame(() => {
        startTransition(sourceRect, targetRect, "open", () => {
          setPhase("open");
          closeBtnRef.current?.focus();
        });
        if (overlayImgRef.current) {
          overlayImgRef.current.style.visibility = "visible";
        }
      });
    },
    [activePhoto, getFullscreenRect, startTransition],
  );

  const closeToGrid = useCallback(
    (fromRect, velocity = 0) => {
      const photo = activePhoto;
      if (!photo) return;
      const gridEl = gridRefs.current.get(photo.id);
      const gridRect = gridEl ? gridEl.getBoundingClientRect() : fromRect;
      engine.current.velocity = velocity;
      setPhase("closing");
      startTransition(fromRect, gridRect, "close", () => {
        setActivePhoto(null);
        setPhase("closed");
        lastTriggerRef.current?.focus();
      });
    },
    [activePhoto, startTransition],
  );

  const dismiss = useCallback(() => {
    if (!activePhoto) return;
    const rect = getCurrentRect() || getFullscreenRect(activePhoto);
    closeToGrid(rect, 0);
  }, [activePhoto, getCurrentRect, getFullscreenRect, closeToGrid]);

  useEffect(() => {
    if (!activePhoto) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePhoto, dismiss]);

  useEffect(() => {
    if (!activePhoto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activePhoto]);

  useEffect(() => {
    const el = gridWrapperRef.current;
    if (!el) return;
    el.inert = phase === "opening" || phase === "open";
  }, [phase]);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    el.style.pointerEvents =
      phase === "opening" || phase === "open" ? "auto" : "none";
  }, [phase]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !activePhoto) return;

    const s = engine.current;

    const onPointerDown = (e) => {
      if (
        e.target === closeBtnRef.current ||
        closeBtnRef.current?.contains(e.target)
      )
        return;
      if (s.type !== "idle") return;
      e.preventDefault();
      cancelAnimationFrame(s.raf);

      s.isDragging = true;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.deltaX = 0;
      s.deltaY = 0;
      s.lastMoveTime = performance.now();
      s.lastMoveY = e.clientY;
      s.velocityY = 0;
      s.dragBaseRect = getCurrentRect() || getFullscreenRect(activePhoto);

      document.body.classList.add("gtd-dragging");
      overlay.setPointerCapture(e.pointerId);
      applyFrame();
    };

    const onPointerMove = (e) => {
      if (!s.isDragging) return;
      s.deltaX = e.clientX - s.startX;
      s.deltaY = e.clientY - s.startY;

      const now = performance.now();
      const dt = (now - s.lastMoveTime) / 1000;
      if (dt > 0) s.velocityY = (e.clientY - s.lastMoveY) / dt;

      s.lastMoveTime = now;
      s.lastMoveY = e.clientY;
      applyFrame();
    };

    const onPointerUp = (e) => {
      if (!s.isDragging) return;
      s.isDragging = false;
      document.body.classList.remove("gtd-dragging");
      try {
        overlay.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const currentDraggedRect = getDraggedRect();

      if (s.deltaY > DISMISS_DRAG_Y || s.velocityY > DISMISS_VELOCITY_Y) {
        closeToGrid(
          currentDraggedRect,
          s.velocityY > 0 ? Math.min(s.velocityY / 1000, 2) : 0,
        );
      } else {
        s.velocity = 0;
        startTransition(
          currentDraggedRect,
          getFullscreenRect(activePhoto),
          "snap",
        );
      }
    };

    overlay.addEventListener("pointerdown", onPointerDown);
    overlay.addEventListener("pointermove", onPointerMove);
    overlay.addEventListener("pointerup", onPointerUp);
    overlay.addEventListener("pointercancel", onPointerUp);

    return () => {
      overlay.removeEventListener("pointerdown", onPointerDown);
      overlay.removeEventListener("pointermove", onPointerMove);
      overlay.removeEventListener("pointerup", onPointerUp);
      overlay.removeEventListener("pointercancel", onPointerUp);
      document.body.classList.remove("gtd-dragging");
    };
  }, [
    activePhoto,
    applyFrame,
    getCurrentRect,
    getDraggedRect,
    getFullscreenRect,
    startTransition,
    closeToGrid,
  ]);

  const activeIndex = activePhoto
    ? PHOTOS.findIndex((p) => p.id === activePhoto.id)
    : -1;
  const tileTransition = reducedMotion
    ? "none"
    : `left ${LAYOUT_DURATION}ms ${LAYOUT_EASING}, top ${LAYOUT_DURATION}ms ${LAYOUT_EASING}, width ${LAYOUT_DURATION}ms ${LAYOUT_EASING}, height ${LAYOUT_DURATION}ms ${LAYOUT_EASING}, transform 250ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 250ms ease`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "20px 24px",
          fontSize: 12,
          fontWeight: 500,
          color: "#888",
        }}
      >
        <span>Grid to Detail</span>
        {/* <span>Interaction 03</span> */}
      </header>

      <div
        ref={gridWrapperRef}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          padding: "40px 24px",
        }}
      >
        <ColumnSwitcher
          value={columns}
          onChange={setColumns}
          options={COLUMN_OPTIONS}
        />

        <div
          ref={gridContainerRef}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: GRID_MAX_WIDTH,
            height: getGridHeight(columns, containerWidth),
            transition: reducedMotion
              ? "none"
              : `height ${LAYOUT_DURATION}ms ${LAYOUT_EASING}`,
          }}
        >
          {PHOTOS.map((photo, i) => {
            const layout = getTileLayout(i, columns, containerWidth);
            const isHidden = activePhoto?.id === photo.id;
            return (
              <button
                key={photo.id}
                type="button"
                ref={(el) => gridRefs.current.set(photo.id, el)}
                onClick={(e) => openPhoto(photo, e.currentTarget)}
                aria-label={`Open photo ${i + 1} of ${PHOTOS.length}`}
                className="grid-tile"
                style={{
                  position: "absolute",
                  left: layout.left,
                  top: layout.top,
                  width: layout.size,
                  height: layout.size,
                  opacity: isHidden ? 0 : 1,
                  backgroundColor: "#111",
                  backgroundImage: `url(${photo.src})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transition: tileTransition,
                }}
              />
            );
          })}
        </div>
      </div>

      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 50,
          visibility: activePhoto ? "visible" : "hidden",
          touchAction: "none",
        }}
      >
        <div
          ref={backdropRef}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#000",
            opacity: 0,
            willChange: "opacity",
          }}
        />

        {activePhoto && (
          <>
            <img
              ref={overlayImgRef}
              src={activePhoto.src}
              alt=""
              className="detail-img"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                objectFit: "cover",
                willChange:
                  "transform, width, height, border-radius, box-shadow",
                transformOrigin: "top left",
                cursor: "grab",
                visibility: "hidden",
              }}
              draggable={false}
            />
            <div
              ref={chromeRef}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                pointerEvents: "none",
              }}
            >
              <button
                ref={closeBtnRef}
                type="button"
                onClick={dismiss}
                aria-label="Close photo"
                className="close-btn"
              >
                <CloseIcon />
              </button>
              <div className="detail-label">
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(PHOTOS.length).padStart(2, "0")}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .grid-tile {
          border: none;
          padding: 0;
          border-radius: 3px;
          cursor: pointer;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
          -webkit-tap-highlight-color: transparent;
        }
        .grid-tile:hover {
          transform: scale(1.03);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
        }
        .grid-tile:active {
          transform: scale(0.96);
        }
        .grid-tile:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.6);
          outline-offset: 2px;
        }
        .detail-img {
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          transition: box-shadow 300ms ease;
        }
        .detail-img:hover {
          box-shadow: 0 30px 60px -10px rgba(0, 0, 0, 0.7);
        }
        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #fff;
          cursor: pointer;
          pointer-events: auto;
          -webkit-tap-highlight-color: transparent;
          transition:
            background 200ms ease,
            transform 150ms ease;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.18);
        }
        .close-btn:active {
          transform: scale(0.9);
        }
        .close-btn:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.6);
          outline-offset: 2px;
        }
        .detail-label {
          position: absolute;
          left: 16px;
          bottom: 16px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11px;
          letter-spacing: 0.03em;
          color: rgba(255, 255, 255, 0.6);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
      <style jsx global>{`
        body.gtd-dragging,
        body.gtd-dragging * {
          cursor: grabbing !important;
        }
      `}</style>
    </div>
  );
}
