"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  Reorder,
  motion,
  useAnimate,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { GripVertical } from "lucide-react";

const INITIAL_TRACKS = [
  {
    id: "t1",
    title: "Die With a Smile",
    artist: "Lady Gaga & Bruno Mars",
    seed: "GagaMars",
    duration: "4:11",
  },
  {
    id: "t2",
    title: "BIRDS OF A FEATHER",
    artist: "Billie Eilish",
    seed: "Billie",
    duration: "3:30",
  },
  {
    id: "t3",
    title: "APT.",
    artist: "ROSÉ & Bruno Mars",
    seed: "RoseApt",
    duration: "2:49",
  },
  {
    id: "t4",
    title: "luther",
    artist: "Kendrick Lamar & SZA",
    seed: "KdotSZA",
    duration: "2:57",
  },
  {
    id: "t5",
    title: "Golden",
    artist: "HUNTR/X",
    seed: "GoldenKpop",
    duration: "3:15",
  },
  {
    id: "t6",
    title: "Ordinary",
    artist: "Alex Warren",
    seed: "AlexWarren",
    duration: "3:06",
  },
  {
    id: "t7",
    title: "DtMF",
    artist: "Bad Bunny",
    seed: "BadBunny",
    duration: "3:58",
  },
];

const avatarUrl = (seed) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=f4ede1,eaddca,e7e0d2`;

const EQUALIZER_PATTERNS = [
  [0.42, 0.78, 0.52, 0.94, 0.58, 0.42],
  [0.84, 0.5, 0.92, 0.62, 0.76, 0.84],
  [0.58, 0.9, 0.46, 0.72, 0.96, 0.58],
  [0.94, 0.64, 0.82, 0.48, 0.74, 0.94],
];

const EQUALIZER_DURATIONS = [1.54, 1.72, 1.46, 1.63];
const EQUALIZER_RESTING = [0.46, 0.82, 0.62, 0.94];

const haptic = (pattern, reducedMotion) => {
  if (
    !reducedMotion &&
    typeof navigator !== "undefined" &&
    "vibrate" in navigator
  ) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
};

function TrackChip({
  track,
  index,
  total,
  isDragging,
  anyDragging,
  onLift,
  onDrop,
  onMove,
  onBoundaryAttempt,
  onBoundaryChange,
  dragConstraints,
  interactionBoundsRef,
  reducedMotion,
}) {
  const controls = useDragControls();
  const [scope, animateScope] = useAnimate();
  const y = useMotionValue(0);
  const velocity = useMotionValue(0);
  const lastY = useRef(0);
  const [positionMotion, setPositionMotion] = useState({ index, direction: 0 });
  const activeBoundary = useRef(null);
  if (positionMotion.index !== index) {
    setPositionMotion({
      index,
      direction: index > positionMotion.index ? 1 : -1,
    });
  }
  const indexDirection = positionMotion.direction;
  const contentLag = useTransform(
    velocity,
    [-1200, -40, 40, 1200],
    [2.2, 0, 0, -2.2],
    { clamp: true },
  );

  useEffect(() => {
    if (!isDragging) {
      velocity.set(0);
      return;
    }
    lastY.current = y.get();
    let raf;
    const tick = () => {
      const cur = y.get();
      velocity.set((cur - lastY.current) * 60);
      lastY.current = cur;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      velocity.set(0);
    };
  }, [isDragging, y, velocity]);

  const signalKeyboardBoundary = (edge) => {
    const direction = edge === "top" ? -3 : 3;
    const grip = scope.current?.querySelector("[data-grip]");

    if (!reducedMotion && scope.current) {
      animateScope(
        scope.current,
        { y: [0, direction, 0], scaleY: [1, 0.992, 1] },
        { duration: 0.22, ease: "easeOut" },
      );
    }
    if (grip) {
      animateScope(
        grip,
        { color: ["#c9bca2", "#d98a3d", "#c9bca2"] },
        { duration: reducedMotion ? 0.12 : 0.26, ease: "easeOut" },
      );
    }
    onBoundaryAttempt(edge, track, "keyboard");
  };

  const onKeyDown = (e) => {
    let destination;
    let boundary;

    if (e.key === "ArrowUp") {
      destination = Math.max(0, index - 1);
      boundary = "top";
    } else if (e.key === "ArrowDown") {
      destination = Math.min(total - 1, index + 1);
      boundary = "bottom";
    } else if (e.key === "Home") {
      destination = 0;
      boundary = "top";
    } else if (e.key === "End") {
      destination = total - 1;
      boundary = "bottom";
    } else {
      return;
    }

    e.preventDefault();
    if (destination === index) {
      signalKeyboardBoundary(boundary);
      return;
    }
    onMove(index, destination);
  };

  const onDrag = (event, info) => {
    const bounds = interactionBoundsRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const pointerX = "clientX" in event ? event.clientX : info.point.x;
    const pointerY = "clientY" in event ? event.clientY : info.point.y;
    let edge = null;

    if (pointerY < bounds.top) edge = "top";
    else if (pointerY > bounds.bottom) edge = "bottom";
    else if (pointerX < bounds.left) edge = "left";
    else if (pointerX > bounds.right) edge = "right";

    if (edge === activeBoundary.current) return;
    activeBoundary.current = edge;
    onBoundaryChange(edge);
    if (edge) onBoundaryAttempt(edge, track, "pointer");
  };

  const handleDragEnd = () => {
    activeBoundary.current = null;
    onBoundaryChange(null);
    onDrop();
  };

  const dimmed = anyDragging && !isDragging;

  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={controls}
      dragConstraints={dragConstraints}
      dragElastic={0.14}
      dragMomentum={false}
      style={{ y }}
      onDragStart={onLift}
      onDrag={onDrag}
      onDragEnd={handleDragEnd}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 600, damping: 45, mass: 0.8 }
      }
      whileDrag={{ zIndex: 40 }}
      className="relative list-none"
    >
      <motion.div ref={scope} className="relative">
        <motion.div
          animate={{
            scale: isDragging && !reducedMotion ? 1.018 : 1,
            y: isDragging && !reducedMotion ? -1 : 0,
            boxShadow: isDragging
              ? "0 18px 34px -16px rgba(75, 62, 45, 0.36), 0 5px 12px -7px rgba(75, 62, 45, 0.22)"
              : "0 1px 2px rgba(75, 62, 45, 0.035)",
          }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 34 }
          }
          className={`relative grid grid-cols-[22px_40px_minmax(0,1fr)_auto_40px] items-center gap-[11px] rounded-[15px] border px-[11px] py-[9px] transition-[opacity,border-color] duration-150 max-[360px]:grid-cols-[18px_36px_minmax(0,1fr)_40px] max-[360px]:gap-[9px] ${
            isDragging
              ? "border-[#d98a3d]/40 bg-gradient-to-b from-[#fffdf9] to-[#fdf6ea]"
              : "border-[#786a4a]/[0.11] bg-gradient-to-b from-white to-[#fcfaf6]"
          } ${dimmed ? "opacity-[0.5]" : "opacity-100"}`}
        >
          <motion.span
            style={{ y: reducedMotion ? 0 : contentLag }}
            className="relative grid h-[18px] place-items-center overflow-hidden text-center text-[12.5px] font-semibold tabular-nums text-[#81735f]"
            aria-hidden="true"
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={index}
                className="[grid-area:1/1]"
                initial={
                  reducedMotion
                    ? false
                    : { y: (indexDirection || 1) * 7, opacity: 0 }
                }
                animate={{ y: 0, opacity: 1 }}
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { y: (indexDirection || 1) * -7, opacity: 0 }
                }
                transition={{
                  duration: reducedMotion ? 0 : 0.18,
                  ease: "easeOut",
                }}
              >
                {index + 1}
              </motion.span>
            </AnimatePresence>
          </motion.span>

          <motion.span
            style={{ y: reducedMotion ? 0 : contentLag }}
            className="size-10 overflow-hidden rounded-full bg-[#f0e9dc] shadow-[inset_0_0_0_1px_rgba(120,102,74,0.14)] max-[360px]:size-9"
            aria-hidden="true"
          >
            {/* Plain img keeps the remote DiceBear SVG compatible with static export. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(track.seed)}
              alt=""
              width="40"
              height="40"
              decoding="async"
              draggable="false"
              className="block size-full outline outline-1 -outline-offset-1 outline-black/10"
            />
          </motion.span>

          <motion.span
            style={{ y: reducedMotion ? 0 : contentLag }}
            className="flex min-w-0 flex-col gap-px"
          >
            <span className="truncate text-[14px] font-semibold tracking-[-0.012em] text-[#2f281d] max-[360px]:overflow-visible max-[360px]:text-clip max-[360px]:whitespace-normal max-[360px]:leading-[1.15]">
              {track.title}
            </span>
            <span className="truncate text-[12px] font-medium text-[#81735f]">
              {track.artist}
            </span>
          </motion.span>

          <motion.span
            style={{ y: reducedMotion ? 0 : contentLag }}
            className="pr-0.5 text-[12px] tabular-nums text-[#81735f] max-[360px]:hidden"
            aria-hidden="true"
          >
            {track.duration}
          </motion.span>

          <button
            type="button"
            data-grip
            aria-label={`Move ${track.title} by ${track.artist}, position ${index + 1} of ${total}`}
            aria-describedby="queue-keyboard-instructions"
            aria-keyshortcuts="ArrowUp ArrowDown Home End"
            onPointerDown={(e) => controls.start(e)}
            onKeyDown={onKeyDown}
            className={`grid size-10 cursor-grab touch-none place-items-center rounded-[10px] bg-transparent transition-[color,background-color,scale] duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#786a4a]/[0.07] hover:text-[#766951] active:scale-[0.96] active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a45a18] ${
              isDragging ? "text-[#8a7c60]" : "text-[#c9bca2]"
            }`}
          >
            <GripVertical size={16} strokeWidth={2.25} />
          </button>
        </motion.div>
      </motion.div>
    </Reorder.Item>
  );
}

export default function ReorderQueue() {
  const [tracks, setTracks] = useState(INITIAL_TRACKS);
  const [draggingId, setDraggingId] = useState(null);
  const [announce, setAnnounce] = useState("");
  const [activeBoundary, setActiveBoundary] = useState(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [settleSignal, setSettleSignal] = useState(0);
  const reducedMotion = useReducedMotion();
  const orderRef = useRef(tracks.map((t) => t.id));
  const tracksRef = useRef(tracks);
  const draggingIdRef = useRef(null);
  const queueBoundsRef = useRef(null);
  const boundaryTimerRef = useRef(null);

  useEffect(() => {
    const updateVisibility = () =>
      setPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(
    () => () => {
      if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
    },
    [],
  );

  const handleReorder = (next) => {
    const nextIds = next.map((t) => t.id);
    if (nextIds.join() !== orderRef.current.join()) {
      orderRef.current = nextIds;
      tracksRef.current = next;
      if (draggingIdRef.current) haptic(6, reducedMotion);
    }
    setTracks(next);
  };

  const moveByKeyboard = (from, to) => {
    const next = [...tracksRef.current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    orderRef.current = next.map((t) => t.id);
    tracksRef.current = next;
    setTracks(next);
    setAnnounce(`Moved ${item.title} to position ${to + 1} of ${next.length}`);
    haptic(9, reducedMotion);
  };

  const handleBoundaryAttempt = (edge, track, input) => {
    haptic(input === "pointer" ? 18 : 14, reducedMotion);
    if (input !== "keyboard") return;

    if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
    setActiveBoundary(edge);
    boundaryTimerRef.current = setTimeout(() => setActiveBoundary(null), 320);
    setAnnounce(
      edge === "top"
        ? `${track.title} is already first in the queue`
        : `${track.title} is already last in the queue`,
    );
  };

  const onLift = (id) => {
    draggingIdRef.current = id;
    setDraggingId(id);
    haptic(13, reducedMotion);
  };
  const onDrop = (track) => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setActiveBoundary(null);
    setSettleSignal((signal) => signal + 1);
    haptic([9, 26, 9], reducedMotion);
    const pos = tracksRef.current.findIndex((t) => t.id === track.id) + 1;
    setAnnounce(
      `Placed ${track.title} at position ${pos} of ${tracksRef.current.length}`,
    );
  };

  return (
    <main
      className="grid min-h-screen place-items-center px-3 py-12 font-sans antialiased sm:px-5"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, #f0ebe2 0%, #e7e0d4 55%, #e0d8c9 100%)",
      }}
    >
      <section
        className="w-full max-w-[452px] rounded-[24px] border border-[#78664a]/10 p-2.5"
        style={{
          background: "linear-gradient(180deg, #fbf9f5, #f3efe7)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(75,62,45,0.06), 0 30px 60px -24px rgba(75,62,45,0.28)",
        }}
        aria-label="Playback queue"
      >
        <header className="flex items-center justify-between px-3.5 pb-4 pt-3.5">
          <div>
            <h1 className="m-0 text-[15px] font-bold tracking-[-0.02em] text-[#3a3125]">
              Queue
            </h1>
            <p className="mt-[3px] text-[12px] font-medium text-[#81735f]">
              {tracks.length} tracks · drag to reorder
            </p>
          </div>
          <motion.span
            key={settleSignal}
            className="flex h-[18px] items-end gap-[3px]"
            aria-hidden="true"
            initial={
              settleSignal > 0 && !reducedMotion
                ? { scale: 0.92, opacity: 0.72 }
                : false
            }
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            {EQUALIZER_PATTERNS.map((pattern, i) => (
              <motion.i
                key={i}
                className="h-full w-[3px] rounded-[2px] bg-[#d98a3d]"
                style={{ transformOrigin: "50% 100%" }}
                animate={
                  pageVisible && !reducedMotion
                    ? { scaleY: pattern }
                    : { scaleY: EQUALIZER_RESTING[i] }
                }
                transition={
                  pageVisible && !reducedMotion
                    ? {
                        duration: EQUALIZER_DURATIONS[i],
                        ease: "easeInOut",
                        repeat: Infinity,
                      }
                    : { duration: reducedMotion ? 0 : 0.15 }
                }
              />
            ))}
          </motion.span>
        </header>

        <div ref={queueBoundsRef} className="relative">
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 top-0 z-50 h-px origin-center rounded-full bg-[#d98a3d] shadow-[0_1px_8px_rgba(217,138,61,0.55)]"
            animate={{
              opacity: activeBoundary === "top" ? 1 : 0,
              scaleX: activeBoundary === "top" ? 1 : 0.4,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 bottom-0 z-50 h-px origin-center rounded-full bg-[#d98a3d] shadow-[0_-1px_8px_rgba(217,138,61,0.55)]"
            animate={{
              opacity: activeBoundary === "bottom" ? 1 : 0,
              scaleX: activeBoundary === "bottom" ? 1 : 0.4,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-5 left-0 z-50 w-px origin-center rounded-full bg-[#d98a3d] shadow-[1px_0_8px_rgba(217,138,61,0.55)]"
            animate={{
              opacity: activeBoundary === "left" ? 1 : 0,
              scaleY: activeBoundary === "left" ? 1 : 0.4,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-5 right-0 z-50 w-px origin-center rounded-full bg-[#d98a3d] shadow-[-1px_0_8px_rgba(217,138,61,0.55)]"
            animate={{
              opacity: activeBoundary === "right" ? 1 : 0,
              scaleY: activeBoundary === "right" ? 1 : 0.4,
            }}
            transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
          />

          <Reorder.Group
            axis="y"
            values={tracks}
            onReorder={handleReorder}
            as="ul"
            className="m-0 flex list-none flex-col gap-[7px] p-1"
            aria-label="Track order"
          >
            {tracks.map((track, index) => (
              <TrackChip
                key={track.id}
                track={track}
                index={index}
                total={tracks.length}
                isDragging={draggingId === track.id}
                anyDragging={draggingId !== null}
                onLift={() => onLift(track.id)}
                onDrop={() => onDrop(track)}
                onMove={moveByKeyboard}
                onBoundaryAttempt={handleBoundaryAttempt}
                onBoundaryChange={setActiveBoundary}
                dragConstraints={queueBoundsRef}
                interactionBoundsRef={queueBoundsRef}
                reducedMotion={reducedMotion}
              />
            ))}
          </Reorder.Group>
        </div>

        <p id="queue-keyboard-instructions" className="sr-only">
          Use the Up and Down Arrow keys to move one position, or Home and End
          to move to the start or end of the queue.
        </p>
        <p className="sr-only" role="status">
          {announce}
        </p>
      </section>
    </main>
  );
}
