"use client";

import { useEffect, useRef, useState } from "react";
import {
  Reorder,
  motion,
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
  reducedMotion,
}) {
  const controls = useDragControls();
  const y = useMotionValue(0);
  const velocity = useMotionValue(0);
  const lastY = useRef(0);
  const tilt = useTransform(velocity, [-1400, 0, 1400], [-0.8, 0, 0.8], {
    clamp: true,
  });

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

  const onKeyDown = (e) => {
    let destination = index;

    if (e.key === "ArrowUp") destination = Math.max(0, index - 1);
    if (e.key === "ArrowDown") destination = Math.min(total - 1, index + 1);
    if (e.key === "Home") destination = 0;
    if (e.key === "End") destination = total - 1;

    if (destination === index) return;

    e.preventDefault();
    onMove(index, destination);
  };

  const dimmed = anyDragging && !isDragging;

  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={controls}
      style={{ y }}
      onDragStart={onLift}
      onDragEnd={onDrop}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 600, damping: 45, mass: 0.8 }
      }
      whileDrag={{ zIndex: 40 }}
      className="relative list-none"
    >
      <motion.div
        style={{ rotate: reducedMotion ? 0 : tilt, transformOrigin: "center" }}
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
        <span
          className="text-center text-[12.5px] font-semibold tabular-nums text-[#81735f]"
          aria-hidden="true"
        >
          {index + 1}
        </span>

        <span
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
        </span>

        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-[14px] font-semibold tracking-[-0.012em] text-[#2f281d] max-[360px]:overflow-visible max-[360px]:text-clip max-[360px]:whitespace-normal max-[360px]:leading-[1.15]">
            {track.title}
          </span>
          <span className="truncate text-[12px] font-medium text-[#81735f]">
            {track.artist}
          </span>
        </span>

        <span
          className="pr-0.5 text-[12px] tabular-nums text-[#81735f] max-[360px]:hidden"
          aria-hidden="true"
        >
          {track.duration}
        </span>

        <button
          type="button"
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
    </Reorder.Item>
  );
}

export default function ReorderQueue() {
  const [tracks, setTracks] = useState(INITIAL_TRACKS);
  const [draggingId, setDraggingId] = useState(null);
  const [announce, setAnnounce] = useState("");
  const reducedMotion = useReducedMotion();
  const orderRef = useRef(tracks.map((t) => t.id));
  const tracksRef = useRef(tracks);
  const draggingIdRef = useRef(null);

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

  const onLift = (id) => {
    draggingIdRef.current = id;
    setDraggingId(id);
    haptic(13, reducedMotion);
  };
  const onDrop = (track) => {
    draggingIdRef.current = null;
    setDraggingId(null);
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
          <span
            className="flex h-[18px] items-end gap-[3px]"
            aria-hidden="true"
          >
            {[0, 0.15, 0.3, 0.45].map((delay, i) => (
              <motion.i
                key={i}
                className="w-[3px] rounded-[2px] bg-[#d98a3d]"
                style={{ height: ["40%", "90%", "60%", "100%"][i] }}
                animate={
                  draggingId && !reducedMotion
                    ? { scaleY: [1, 0.55, 1] }
                    : { scaleY: 1 }
                }
                transition={
                  reducedMotion || !draggingId
                    ? { duration: 0 }
                    : { duration: 0.32, ease: "easeOut", delay }
                }
              />
            ))}
          </span>
        </header>

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
              reducedMotion={reducedMotion}
            />
          ))}
        </Reorder.Group>

        <p id="queue-keyboard-instructions" className="sr-only">
          Use the Up and Down Arrow keys to move one position, or Home and End to
          move to the start or end of the queue.
        </p>
        <p className="sr-only" role="status">
          {announce}
        </p>
      </section>
    </main>
  );
}
