"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import type { AnimationPlaybackControls, MotionValue } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  CSSProperties,
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { Icon } from "./icons";
import type { IconName } from "./icons";

/* Content ------------------------------------------------------------------ */

type EventId =
  | "weekly-sync"
  | "cowork-tue"
  | "cowork-wed"
  | "cowork-thu"
  | "design-crit"
  | "one-on-one"
  | "coffee";

type CalendarId = "you" | "birthdays" | "tasks" | "coworking";

type GuestId = "you" | "ama" | "tobi" | "priya" | "jonas" | "mei";

type Guest = {
  id: GuestId;
  name: string;
  email: string;
  initial: string;
  bg: string;
  fg: string;
};

const GUESTS: Record<GuestId, Guest> = {
  you: {
    id: "you",
    name: "Uzochukwu Okafor",
    email: "uzochukwu@lumen.studio",
    initial: "U",
    bg: "#d3e3fd",
    fg: "#0842a0",
  },
  ama: {
    id: "ama",
    name: "Ama Owusu",
    email: "ama@lumen.studio",
    initial: "A",
    bg: "#ffdad6",
    fg: "#8c1d18",
  },
  tobi: {
    id: "tobi",
    name: "Tobi Adeyemi",
    email: "tobi@lumen.studio",
    initial: "T",
    bg: "#c4eed0",
    fg: "#0f5223",
  },
  priya: {
    id: "priya",
    name: "Priya Nair",
    email: "priya@lumen.studio",
    initial: "P",
    bg: "#ffdea6",
    fg: "#6d4800",
  },
  jonas: {
    id: "jonas",
    name: "Jonas Becker",
    email: "jonas@lumen.studio",
    initial: "J",
    bg: "#c2e7ff",
    fg: "#004a77",
  },
  mei: {
    id: "mei",
    name: "Mei Lin",
    email: "mei@lumen.studio",
    initial: "M",
    bg: "#eaddff",
    fg: "#4f378a",
  },
};

type Rsvp = "yes" | "awaiting";

type Attendee = { id: GuestId; rsvp: Rsvp; organizer?: boolean };

type CalEvent = {
  id: EventId;
  title: string;
  day: number;
  start: number;
  end: number;
  color: string;
  calendar: CalendarId;
  recurrence?: string;
  meet?: string;
  attendees?: Attendee[];
  /** The event description's numbered agenda, as the organiser wrote it. */
  agenda?: string[];
  description?: string;
  reminder?: string;
};

const PEACOCK = "#039be5";
const BASIL = "rgb(124, 179, 66)";

const WEEKLY_SYNC_AGENDA = [
  "Updates from each team",
  "Any changes to the Q4 roadmap?",
  "Anything blocking you",
  "AOB",
];

const COWORK_BASE = {
  title: "Coworking session",
  start: 9.5,
  end: 11.5,
  color: BASIL,
  calendar: "coworking" as const,
  recurrence: "Weekly on Tuesday, Wednesday, Thursday",
  description: "Shared desk time. Drop in when you can.",
};

const EVENTS: CalEvent[] = [
  { id: "cowork-tue", day: 2, ...COWORK_BASE },
  { id: "cowork-wed", day: 3, ...COWORK_BASE },
  { id: "cowork-thu", day: 4, ...COWORK_BASE },
  {
    id: "weekly-sync",
    title: "Weekly sync",
    day: 4,
    start: 10,
    end: 10.5,
    color: PEACOCK,
    calendar: "you",
    recurrence: "Weekly on Thursday",
    meet: "meet.google.com/qwz-mfjd-hkp",
    attendees: [
      { id: "you", rsvp: "yes", organizer: true },
      { id: "ama", rsvp: "yes" },
      { id: "tobi", rsvp: "yes" },
      { id: "priya", rsvp: "yes" },
      { id: "jonas", rsvp: "awaiting" },
      { id: "mei", rsvp: "yes" },
    ],
    agenda: WEEKLY_SYNC_AGENDA,
    reminder: "10 minutes before",
  },
  {
    id: "design-crit",
    title: "Design crit",
    day: 2,
    start: 14,
    end: 15,
    color: PEACOCK,
    calendar: "you",
    meet: "meet.google.com/hbt-wqen-zra",
    attendees: [
      { id: "priya", rsvp: "yes", organizer: true },
      { id: "you", rsvp: "yes" },
      { id: "mei", rsvp: "yes" },
      { id: "jonas", rsvp: "awaiting" },
    ],
    description: "Bring one thing you’re stuck on.",
    reminder: "10 minutes before",
  },
  {
    id: "one-on-one",
    title: "1:1 with Ama",
    day: 3,
    start: 13,
    end: 13.5,
    color: PEACOCK,
    calendar: "you",
    recurrence: "Weekly on Wednesday",
    meet: "meet.google.com/ykd-pqrs-tma",
    attendees: [
      { id: "ama", rsvp: "yes", organizer: true },
      { id: "you", rsvp: "yes" },
    ],
    reminder: "10 minutes before",
  },
  {
    id: "coffee",
    title: "Coffee chat",
    day: 5,
    start: 16,
    end: 16.5,
    color: PEACOCK,
    calendar: "you",
    attendees: [
      { id: "tobi", rsvp: "yes", organizer: true },
      { id: "you", rsvp: "yes" },
    ],
    reminder: "30 minutes before",
  },
];

const EVENTS_BY_ID = Object.fromEntries(
  EVENTS.map(function index(event) {
    return [event.id, event];
  }),
) as Record<EventId, CalEvent>;

const CALENDARS: Array<{
  id: CalendarId;
  name: string;
  color: string;
  group: "mine" | "other";
}> = [
  { id: "you", name: "Uzochukwu Okafor", color: "#039be5", group: "mine" },
  { id: "birthdays", name: "Birthdays", color: "#33b679", group: "mine" },
  { id: "tasks", name: "Tasks", color: "#039be5", group: "mine" },
  { id: "coworking", name: "Coworking", color: BASIL, group: "other" },
];

const WEEK = [
  { dow: "Sun", date: 11, long: "Sunday" },
  { dow: "Mon", date: 12, long: "Monday" },
  { dow: "Tue", date: 13, long: "Tuesday" },
  { dow: "Wed", date: 14, long: "Wednesday" },
  { dow: "Thu", date: 15, long: "Thursday" },
  { dow: "Fri", date: 16, long: "Friday" },
  { dow: "Sat", date: 17, long: "Saturday" },
];

const TODAY = 1;
/** A fixed "now": Monday, 10:40. A live clock would re-render mid-morph. */
const NOW_HOURS = 10 + 40 / 60;

/* Layout + motion constants ------------------------------------------------ */

const HOUR = 60;
const SIDEBAR = 256;
const HEADER = 64;
const RAIL = 56;
const POPOVER_W = 496;
const DIALOG_W = 640;
const POPOVER_BG = "#f0f4f9";
const DIALOG_BG = "#e9eef6";
const SCRIM = 0.32;

const MIN_W = 1200;
const MIN_H = 700;
const PHONE_W = 1280;
const PHONE_H = 860;

// One curve for everything that travels: fast out of the gate, long soft landing.
const EASE = [0.32, 0.72, 0, 1] as const;
const EASE_CSS = "cubic-bezier(0.32, 0.72, 0, 1)";
// Opacity gets Material's standard curve. The shared curve leaves the gate
// at full speed, which turns a 150ms fade into a 3-frame cut.
const FADE = [0.4, 0, 0.2, 1] as const;

const MAX_MESSAGE = 2400;

/* Helpers ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatClock(hours: number, withMinutes: boolean) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 && !withMinutes
    ? `${h12}`
    : `${h12}:${String(m).padStart(2, "0")}`;
}

function meridiem(hours: number) {
  return hours < 12 ? "am" : "pm";
}

/** Grid chip time, Calendar style: "9:30 – 11:30am", "1 – 2pm". */
function chipRange(start: number, end: number) {
  const same = meridiem(start) === meridiem(end);
  return `${formatClock(start, false)}${same ? "" : meridiem(start)} – ${formatClock(
    end,
    false,
  )}${meridiem(end)}`;
}

/** Popover time, always with minutes: "10:00 – 10:30am". */
function popoverRange(start: number, end: number) {
  const same = meridiem(start) === meridiem(end);
  return `${formatClock(start, true)}${same ? "" : meridiem(start)} – ${formatClock(
    end,
    true,
  )}${meridiem(end)}`;
}

function hourLabel(hour: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? "AM" : "PM"}`;
}

function spokenRange(start: number, end: number) {
  return `${formatClock(start, true)} to ${formatClock(end, true)}${meridiem(end)}`;
}

function hoursOfTime(event: CalEvent) {
  return (event.attendees?.length ?? 0) * (event.end - event.start);
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function isOrganizer(event: CalEvent) {
  return Boolean(
    event.attendees?.some(function you(attendee) {
      return attendee.id === "you" && attendee.organizer;
    }),
  );
}

/** Only one occurrence of a recurring meeting you organise can be converted. */
function canConvert(event: CalEvent) {
  return (
    isOrganizer(event) &&
    Boolean(event.recurrence) &&
    (event.attendees?.length ?? 0) > 2
  );
}

/**
 * The draft is a fixed template, not generated text: Calendar already
 * pre-fills the subject from the event title, and this does the same for the
 * body. The agenda is copied verbatim, so nothing is invented, and the
 * organiser edits it like any other draft.
 */
function buildMessage(event: CalEvent) {
  const agenda = event.agenda ?? [];
  const body =
    agenda.length > 0
      ? `Reply-all with notes on:\n${agenda
          .map(function numbered(item, index) {
            return `${index + 1}. ${item}`;
          })
          .join("\n")}`
      : "Reply-all with anything the group should know.";

  return `Hi all,\n\nLet’s skip ${WEEK[event.day].long}’s call and catch up by email. ${body}\n\nIf something needs a real conversation, reply and I’ll set up a call.\n\nThanks,\n${GUESTS.you.name.split(" ")[0]}`;
}

type Draft = {
  subject: string;
  message: string;
  cancelMeeting: boolean;
  include: { yes: boolean; awaiting: boolean; me: boolean };
  removed: GuestId[];
};

function convertDraft(event: CalEvent): Draft {
  return {
    subject: `${event.title}: updates by email this week`,
    message: buildMessage(event),
    cancelMeeting: true,
    include: { yes: true, awaiting: true, me: true },
    removed: [],
  };
}

function plainDraft(event: CalEvent): Draft {
  return {
    subject: event.title,
    message: "",
    cancelMeeting: false,
    include: { yes: true, awaiting: true, me: true },
    removed: [],
  };
}

function recipientsFor(event: CalEvent, draft: Draft) {
  return (event.attendees ?? []).filter(function included(attendee) {
    if (attendee.id === "you" || draft.removed.includes(attendee.id)) {
      return false;
    }

    return attendee.rsvp === "yes" ? draft.include.yes : draft.include.awaiting;
  });
}

type Slot = { col: number; cols: number };

/** Calendar's overlap layout: events that overlap split the column. */
function layoutDay(events: CalEvent[]) {
  const slots = new Map<EventId, Slot>();
  const sorted = [...events].sort(function byStart(a, b) {
    return a.start - b.start || b.end - a.end;
  });

  let cluster: Array<{ event: CalEvent; col: number }> = [];
  let columnsEnd: number[] = [];
  let clusterEnd = -1;

  function flush() {
    cluster.forEach(function place(item) {
      slots.set(item.event.id, { col: item.col, cols: columnsEnd.length });
    });
    cluster = [];
    columnsEnd = [];
  }

  sorted.forEach(function place(event) {
    if (event.start >= clusterEnd) {
      flush();
      clusterEnd = event.end;
    }

    let col = columnsEnd.findIndex(function free(end) {
      return end <= event.start;
    });

    if (col === -1) {
      col = columnsEnd.length;
      columnsEnd.push(event.end);
    } else {
      columnsEnd[col] = event.end;
    }

    clusterEnd = Math.max(clusterEnd, event.end);
    cluster.push({ event, col });
  });

  flush();
  return slots;
}

type LocalRect = { x: number; y: number; w: number; h: number };

/* The morph ------------------------------------------------------------------ */

// Material 3's container transform: one surface reshapes from the popover
// into the dialog while its content fades through. The surface rides the
// emphasized curve, which leaves gently and lands long; content fades on the
// standard curve, out early and in late, so the two never overlap.
const EMPHASIZED = [0.2, 0, 0, 1] as const;

const OPEN = {
  surface: 0.45,
  outDuration: 0.1,
  // The dialog's content waits until the surface is nearly its full width,
  // so nothing appears clipped at the edge while it is still growing.
  inDelay: 0.16,
  inDuration: 0.24,
};

const CLOSE = {
  surface: 0.4,
  outDuration: 0.09,
  inDelay: 0.1,
  inDuration: 0.22,
};

/* Stage sizing ------------------------------------------------------------- */

type Stage = { w: number; h: number; scale: number };

/**
 * The app is the whole viewport, like the real thing. Below a laptop-sized
 * floor it keeps that floor and scales down to fit; on a phone it renders at
 * a desktop size and scales to the screen's width.
 */
function measureStage(): Stage {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (vw < 900) {
    const scale = vw / PHONE_W;

    return {
      w: PHONE_W,
      h: Math.round(clamp(vh / scale, MIN_H, PHONE_H)),
      scale,
    };
  }

  const w = Math.max(vw, MIN_W);
  const h = Math.max(vh, MIN_H);

  return { w, h, scale: Math.min(1, vw / w, vh / h) };
}

/** `?slow=8` stretches every duration, for stepping through the motion. */
function readSlow() {
  const factor = Number(new URLSearchParams(window.location.search).get("slow"));
  return factor > 0 && factor <= 20 ? factor : 1;
}

function serverSlow() {
  return 1;
}

function subscribeToNothing() {
  return function unsubscribe() {};
}

/* Small UI pieces ---------------------------------------------------------- */

function IconButton({
  icon,
  label,
  size = 40,
  iconSize = 20,
  onClick,
  buttonRef,
  pressed,
  disabled,
}: {
  icon: IconName;
  label: string;
  size?: 32 | 40 | 48;
  iconSize?: number;
  onClick?: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      data-gc-icon-button={size}
      data-gc-sl
      data-gc-press
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

function Avatar({ guest, size = 24 }: { guest: Guest; size?: 24 | 32 }) {
  return (
    <span
      data-gc-avatar={size}
      style={{ background: guest.bg, color: guest.fg }}
      aria-hidden="true"
    >
      {guest.initial}
    </span>
  );
}

/**
 * Material 3 checkbox: an 18px box with a 2px outline that fills with the
 * colour, and a tick that draws itself in. Sidebar calendars pass their own
 * colour, which also tints the empty outline, as Calendar does.
 */
function Checkbox({
  checked,
  onChange,
  label,
  color = "#0b57d0",
  tinted = false,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  color?: string;
  tinted?: boolean;
  disabled?: boolean;
}) {
  return (
    <label data-gc-check data-disabled={disabled ? "true" : undefined}>
      <span
        data-gc-check-control
        data-checked={checked ? "true" : "false"}
        data-tinted={tinted ? "true" : undefined}
        style={{ "--gc-check": color } as CSSProperties}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={function toggle(event: ChangeEvent<HTMLInputElement>) {
            onChange(event.target.checked);
          }}
        />
        <span data-gc-check-box aria-hidden="true">
          <svg viewBox="0 0 18 18" focusable="false">
            <path d="M4.1 9.3 7.4 12.5 13.9 6" pathLength={1} />
          </svg>
        </span>
      </span>
      <span data-gc-check-label>{label}</span>
    </label>
  );
}

function Switch({
  checked,
  onChange,
  labelId,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelId: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      data-gc-switch
      data-on={checked ? "true" : "false"}
      disabled={disabled}
      onClick={function toggle() {
        onChange(!checked);
      }}
    >
      <span data-gc-switch-track />
      <span data-gc-switch-handle>
        <span data-gc-switch-glyph>
          <Icon name="check" size={16} />
        </span>
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <svg data-gc-spinner viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" />
    </svg>
  );
}

/* The Email guests dialog -------------------------------------------------- */

function DialogPanel({
  mode,
  event,
  draft,
  setDraft,
  sending,
  maxHeight,
  panelRef,
  bodyRef,
  messageRef,
  headingId,
  onCancel,
  onSend,
  onCopy,
  slow = 1,
  reducedMotion = false,
}: {
  mode: "convert" | "plain";
  event: CalEvent;
  draft: Draft;
  setDraft: (update: (current: Draft) => Draft) => void;
  sending: boolean;
  maxHeight: number;
  panelRef?: (node: HTMLDivElement | null) => void;
  bodyRef?: (node: HTMLDivElement | null) => void;
  messageRef?: (node: HTMLTextAreaElement | null) => void;
  headingId: string;
  onCancel: () => void;
  onSend: () => void;
  onCopy: () => void;
  slow?: number;
  reducedMotion?: boolean;
}) {
  const switchLabelId = useId();
  const messageId = useId();
  const subjectId = useId();
  const [overflowing, setOverflowing] = useState(false);
  const bodyNode = useRef<HTMLDivElement | null>(null);

  const attendees = event.attendees ?? [];
  const yesCount = attendees.filter(function yes(attendee) {
    return attendee.rsvp === "yes";
  }).length;
  const awaitingCount = attendees.length - yesCount;
  const recipients = recipientsFor(event, draft);
  const canSend =
    !sending && draft.message.trim().length > 0 && recipients.length > 0;
  const day = WEEK[event.day].long;

  const count = draft.message.length;

  useLayoutEffect(
    function trackOverflow() {
      const body = bodyNode.current;

      if (!body) {
        return;
      }

      function check() {
        const node = bodyNode.current;

        if (node) {
          setOverflowing(node.scrollHeight > node.clientHeight + 1);
        }
      }

      check();
      const observer = new ResizeObserver(check);
      observer.observe(body);

      return function cleanup() {
        observer.disconnect();
      };
    },
    [draft.message, recipients.length, maxHeight],
  );

  // When recipients change, the chips that stay glide to their new spots, the
  // ones leaving shrink away in place, and the field eases to its new height,
  // which carries everything below it. Positions come from offsetLeft/Top, so
  // the maths holds when the whole app is scaled down on a phone.
  const recipientsRef = useRef<HTMLDivElement | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<{
    height: number;
    positions: Map<string, { x: number; y: number }>;
  } | null>(null);
  const flipControlsRef = useRef<AnimationPlaybackControls[]>([]);
  const recipientKey = recipients
    .map(function id(attendee) {
      return attendee.id;
    })
    .join(",");

  useLayoutEffect(
    function flipRecipients() {
      const field = recipientsRef.current;
      const list = chipsRef.current;

      if (!field || !list) {
        return;
      }

      const previous = flipRef.current;
      const shownHeight = field.style.height
        ? field.offsetHeight
        : (previous?.height ?? field.offsetHeight);

      flipControlsRef.current.forEach(function stop(control) {
        control.stop();
      });
      flipControlsRef.current = [];
      field.style.height = "";

      const naturalHeight = field.offsetHeight;
      const positions = new Map<string, { x: number; y: number }>();
      const animateIt = previous !== null && !reducedMotion;
      const glide = {
        type: "spring" as const,
        bounce: 0,
        visualDuration: 0.34 * slow,
      };

      field
        .querySelectorAll<HTMLElement>("[data-gc-flip]")
        .forEach(function flip(node) {
          if (node.closest("[data-motion-pop-id]")) {
            return;
          }

          const id = node.dataset.gcFlip ?? "";
          const now = { x: node.offsetLeft, y: node.offsetTop };
          const before = previous?.positions.get(id);

          positions.set(id, now);

          if (!animateIt || !before) {
            return;
          }

          // Start from where it is on screen, including any glide in progress.
          const moving = getComputedStyle(node).transform;
          const matrix = new DOMMatrixReadOnly(moving === "none" ? undefined : moving);
          const dx = before.x + matrix.m41 - now.x;
          const dy = before.y + matrix.m42 - now.y;

          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
            return;
          }

          flipControlsRef.current.push(
            animate(node, { x: [dx, 0], y: [dy, 0] }, glide),
          );
        });

      flipRef.current = { height: naturalHeight, positions };

      if (animateIt && Math.abs(shownHeight - naturalHeight) > 0.5) {
        field.dataset.resizing = "true";

        const control = animate(
          field,
          { height: [shownHeight, naturalHeight] },
          glide,
        );

        flipControlsRef.current.push(control);
        control.finished.then(function release() {
          if (flipRef.current?.height === naturalHeight) {
            field.style.height = "";
            delete field.dataset.resizing;
          }
        });
      }
    },
    [recipientKey, reducedMotion, slow],
  );

  function update(patch: Partial<Draft>) {
    setDraft(function apply(current) {
      return { ...current, ...patch };
    });
  }

  function setInclude(key: keyof Draft["include"], value: boolean) {
    setDraft(function apply(current) {
      const status: Rsvp | null =
        key === "yes" ? "yes" : key === "awaiting" ? "awaiting" : null;

      return {
        ...current,
        include: { ...current.include, [key]: value },
        // Re-checking a status brings back anyone removed from it by hand.
        removed:
          value && status
            ? current.removed.filter(function keep(id) {
                return !attendees.some(function match(attendee) {
                  return attendee.id === id && attendee.rsvp === status;
                });
              })
            : current.removed,
      };
    });
  }

  function removeGuest(id: GuestId) {
    setDraft(function apply(current) {
      return { ...current, removed: [...current.removed, id] };
    });
  }

  function handleMessageKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSend) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div
      ref={panelRef}
      data-gc-dialog
      data-mode={mode}
      style={{ maxHeight }}
    >
      <div data-gc-dialog-head>
        <h2 id={headingId} data-gc-dialog-title>
          Email guests
        </h2>
        <div data-gc-dialog-checks role="group" aria-label="Recipients">
          <Checkbox
            checked={draft.include.yes}
            onChange={function toggleYes(value) {
              setInclude("yes", value);
            }}
            label={`Yes (${yesCount})`}
            disabled={sending}
          />
          {awaitingCount > 0 && (
            <Checkbox
              checked={draft.include.awaiting}
              onChange={function toggleAwaiting(value) {
                setInclude("awaiting", value);
              }}
              label={`Awaiting (${awaitingCount})`}
              disabled={sending}
            />
          )}
          <Checkbox
            checked={draft.include.me}
            onChange={function toggleMe(value) {
              setInclude("me", value);
            }}
            label="Send copy to me"
            disabled={sending}
          />
        </div>
      </div>

      <div
        data-gc-dialog-divider
      />

      <div
        ref={function attachBody(node) {
          bodyNode.current = node;
          bodyRef?.(node);
        }}
        data-gc-dialog-body
      >
        <div ref={recipientsRef} data-gc-recipients>
          <span
            data-gc-field-fill
          />
          <div ref={chipsRef} data-gc-chips role="list" aria-label="To">
            <AnimatePresence initial={false} mode="popLayout">
              {recipients.map(function chip(attendee) {
                const guest = GUESTS[attendee.id];

                return (
                  <motion.span
                    key={guest.id}
                    role="listitem"
                    data-gc-chip
                    initial={{ opacity: 0, scale: 0.86 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.86,
                      transition: { duration: 0.14 * slow, ease: EASE },
                    }}
                    transition={{ duration: 0.22 * slow, ease: EASE }}
                  >
                    <span data-gc-chip-inner data-gc-flip={guest.id}>
                      <span
                        data-gc-chip-fill
                      />
                      <Avatar guest={guest} />
                      <span
                        data-gc-chip-text
                      >
                        {guest.email}
                      </span>
                      <button
                        type="button"
                        data-gc-chip-remove
                        data-gc-sl
                        aria-label={`Remove ${guest.name}`}
                        disabled={sending}
                        onClick={function remove() {
                          removeGuest(guest.id);
                        }}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </span>
                  </motion.span>
                );
              })}
            </AnimatePresence>
            <span
              data-gc-chips-copy
            >
              <span data-gc-flip="copy">
                <IconButton
                  icon="contentCopy"
                  label="Copy guest emails"
                  size={32}
                  iconSize={18}
                  onClick={onCopy}
                />
              </span>
            </span>
          </div>
          <span data-gc-flip="add" data-gc-add-wrap>
            <input
              data-gc-add-guest
              type="text"
              placeholder="Add email or name"
              aria-label="Add email or name"
              disabled={sending}
            />
          </span>
        </div>

        <div data-gc-field data-filled={draft.subject ? "true" : "false"}>
          <span
            data-gc-field-fill
          />
          <label
            htmlFor={subjectId}
            data-gc-field-label
          >
            Subject
          </label>
          <div data-gc-subject>
            <input
              id={subjectId}
              data-gc-subject-input
              type="text"
              value={draft.subject}
              disabled={sending}
              onChange={function editSubject(event) {
                update({ subject: event.target.value });
              }}
            />
          </div>
        </div>

        <div
          data-gc-field
          data-kind="message"
          data-filled={draft.message ? "true" : "false"}
        >
          <span
            data-gc-field-fill
          />
          <label
            htmlFor={messageId}
            data-gc-field-label
          >
            Message
          </label>
          <div data-gc-message>
            <span data-gc-message-mirror aria-hidden="true">
              {draft.message}
              {"\u200b"}
            </span>
            <textarea
              ref={messageRef}
              id={messageId}
              data-gc-message-input
              value={draft.message}
              maxLength={MAX_MESSAGE}
              disabled={sending}
              aria-describedby={`${messageId}-count`}
              onKeyDown={handleMessageKeyDown}
              onChange={function editMessage(event) {
                update({ message: event.target.value });
              }}
            />
          </div>
        </div>

        <p
          id={`${messageId}-count`}
          data-gc-counter
        >
          {count.toLocaleString("en-US")}/2,400
        </p>
      </div>

      <div
        data-gc-dialog-foot
        data-overflowing={overflowing ? "true" : undefined}
      >
        {mode === "convert" && (
          <div data-gc-switch-row>
            <span id={switchLabelId} data-gc-switch-label>
              Cancel {day}’s meeting when sent
            </span>
            <Switch
              checked={draft.cancelMeeting}
              labelId={switchLabelId}
              disabled={sending}
              onChange={function toggleCancel(value) {
                update({ cancelMeeting: value });
              }}
            />
          </div>
        )}
        <div data-gc-dialog-actions>
          <p data-gc-dialog-note>
            Event information will be included in the message
          </p>
          <button
            type="button"
            data-gc-text-button
            data-gc-sl
            data-gc-press
            disabled={sending}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            data-gc-send
            data-gc-sl
            data-gc-press
            data-sending={sending ? "true" : undefined}
            disabled={!canSend}
            aria-label={sending ? "Sending" : undefined}
            onClick={onSend}
          >
            <span data-gc-send-label>Send</span>
            <span data-gc-send-spinner>
              <Spinner />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* The surface: one element that is a popover, then becomes the dialog ------ */

type Phase = "popover" | "toDialog" | "dialog" | "toPopover";

type Geometry = { left: number; top: number; width: number; height: number };

function Surface({
  event,
  stage,
  scaleRef,
  appRef,
  anchor,
  draft,
  setDraft,
  scrim,
  reducedMotion,
  slow,
  onClose,
  onSend,
  onEmailGuests,
  onCopyGuests,
  onPhaseChange,
  announce,
  blocked,
}: {
  event: CalEvent;
  stage: Stage;
  scaleRef: { current: number };
  appRef: { current: HTMLDivElement | null };
  anchor: () => HTMLElement | null;
  draft: Draft;
  setDraft: (update: (current: Draft) => Draft) => void;
  scrim: MotionValue<number>;
  reducedMotion: boolean;
  slow: number;
  onClose: (returnFocus: boolean) => void;
  onSend: (draft: Draft) => void;
  onEmailGuests: () => void;
  onCopyGuests: () => void;
  onPhaseChange: (phase: Phase) => void;
  announce: (message: string) => void;
  blocked: boolean;
}) {
  const titleId = useId();
  const headingId = useId();

  const left = useMotionValue(0);
  const top = useMotionValue(0);
  const width = useMotionValue(POPOVER_W);
  const height = useMotionValue(0);
  const background = useMotionValue(POPOVER_BG);
  const popOpacity = useMotionValue(1);
  const dialogOpacity = useMotionValue(0);
  // Whole pixels only. A surface resting on half pixels makes its edges and
  // text shimmer as a long ease-out crawls to a stop.
  const shownLeft = useMotionValue(0);
  const shownTop = useMotionValue(0);
  const shownWidth = useMotionValue(POPOVER_W);
  const shownHeight = useMotionValue(0);

  useLayoutEffect(
    function snapToPixels() {
      const pairs: Array<[MotionValue<number>, MotionValue<number>]> = [
        [left, shownLeft],
        [top, shownTop],
        [width, shownWidth],
        [height, shownHeight],
      ];

      const stops = pairs.map(function follow([source, shown]) {
        shown.set(Math.round(source.get()));
        return source.on("change", function snap(value) {
          shown.set(Math.round(value));
        });
      });

      return function cleanup() {
        stops.forEach(function stop(unsubscribe) {
          unsubscribe();
        });
      };
    },
    [left, top, width, height, shownLeft, shownTop, shownWidth, shownHeight],
  );

  const [phase, setPhaseState] = useState<Phase>("popover");
  const [sending, setSending] = useState(false);
  // The settled dialog keeps its top edge and grows or shrinks downward, so
  // ticking a recipient or typing a line never makes the whole thing hop.
  const [anchorTop, setAnchorTop] = useState(16);
  const [rsvp, setRsvp] = useState<"yes" | "no" | "maybe">("yes");

  const phaseRef = useRef<Phase>("popover");
  const runRef = useRef(0);
  const controlsRef = useRef<AnimationPlaybackControls[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const convertRef = useRef<HTMLButtonElement | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convertible = canConvert(event);
  const yours = isOrganizer(event) || event.calendar === "coworking";
  const attendees = event.attendees ?? [];
  const yesCount = attendees.filter(function yes(attendee) {
    return attendee.rsvp === "yes";
  }).length;
  const awaitingCount = attendees.length - yesCount;
  const timeCost = hoursOfTime(event);
  const day = WEEK[event.day];

  const setPhase = useCallback(
    function setPhase(next: Phase) {
      phaseRef.current = next;
      setPhaseState(next);
      onPhaseChange(next);
    },
    [onPhaseChange],
  );

  /* Geometry -------------------------------------------------------------- */

  const localRect = useCallback(
    function localRect(
      node: Element,
      origin: Element,
      scale = scaleRef.current,
    ): LocalRect {
      const rect = node.getBoundingClientRect();
      const base = origin.getBoundingClientRect();

      return {
        x: (rect.left - base.left) / scale,
        y: (rect.top - base.top) / scale,
        w: rect.width / scale,
        h: rect.height / scale,
      };
    },
    [scaleRef],
  );

  const popoverGeometry = useCallback(
    function popoverGeometry(): (Geometry & { side: "left" | "right" }) | null {
      const app = appRef.current;
      const target = anchor();
      const pop = popRef.current;

      if (!app || !target || !pop) {
        return null;
      }

      const rect = localRect(target, app);
      const popHeight = pop.offsetHeight;
      const gap = 8;
      const roomLeft = rect.x - gap - POPOVER_W;
      const placeLeft = roomLeft >= SIDEBAR - 40;
      const x = placeLeft ? roomLeft : rect.x + rect.w + gap;
      const y = clamp(
        rect.y + rect.h / 2 - popHeight / 2,
        HEADER + 8,
        Math.max(HEADER + 8, stage.h - popHeight - 8),
      );

      return {
        left: Math.round(clamp(x, 8, stage.w - POPOVER_W - 8)),
        top: Math.round(y),
        width: POPOVER_W,
        height: popHeight,
        side: placeLeft ? "left" : "right",
      };
    },
    [anchor, appRef, localRect, stage.h, stage.w],
  );

  const dialogGeometry = useCallback(
    function dialogGeometry(): Geometry | null {
      const panel = dialogRef.current;

      if (!panel) {
        return null;
      }

      const panelHeight = panel.offsetHeight;

      return {
        left: Math.round((stage.w - DIALOG_W) / 2),
        top: Math.max(16, Math.round((stage.h - panelHeight) / 2)),
        width: DIALOG_W,
        height: panelHeight,
      };
    },
    [stage.h, stage.w],
  );

  // Place the popover beside its event before the first paint, and again on
  // resize. Resizing while the dialog is open re-centres it without animating.
  useLayoutEffect(
    function place() {
      const current = phaseRef.current;

      if (current === "popover") {
        const geometry = popoverGeometry();

        if (geometry) {
          left.set(geometry.left);
          top.set(geometry.top);
          width.set(geometry.width);
          height.set(geometry.height);
        }
      } else if (current === "dialog") {
        // Height is auto here; only the position needs re-centring.
        const geometry = dialogGeometry();

        if (geometry) {
          left.set(geometry.left);
          top.set(geometry.top);
        }
      }
    },
    [popoverGeometry, dialogGeometry, left, top, width, height],
  );

  // Focus goes into the popover when it opens.
  useEffect(function focusOnOpen() {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(function clearTimers() {
    const controls = controlsRef;
    const sendTimer = sendTimerRef;

    return function cleanup() {
      controls.current.forEach(function stop(control) {
        control.stop();
      });

      if (sendTimer.current !== null) {
        clearTimeout(sendTimer.current);
      }
    };
  }, []);

  /* The morph -------------------------------------------------------------- */

  function stopAll() {
    runRef.current += 1;
    controlsRef.current.forEach(function stop(control) {
      control.stop();
    });
    controlsRef.current = [];
    return runRef.current;
  }

  function tween(
    value: MotionValue<number> | MotionValue<string>,
    to: number | string,
    duration: number,
    delay = 0,
    ease: typeof EMPHASIZED | typeof FADE | "linear" = EMPHASIZED,
  ) {
    const control = animate(value as MotionValue<number>, to as number, {
      duration: duration * slow,
      delay: delay * slow,
      ease: ease as typeof EMPHASIZED,
    });

    controlsRef.current.push(control);
    return control;
  }

  function whenDone(
    controls: AnimationPlaybackControls[],
    token: number,
    done: () => void,
  ) {
    Promise.all(
      controls.map(function finished(control) {
        return control.finished;
      }),
    ).then(function settle() {
      if (runRef.current === token) {
        done();
      }
    });
  }

  function reshape(to: Geometry, duration: number) {
    return [
      tween(left, to.left, duration),
      tween(top, to.top, duration),
      tween(width, to.width, duration),
      tween(height, to.height, duration),
    ];
  }

  function startForward() {
    if (phaseRef.current !== "popover" || blocked) {
      return;
    }

    const body = bodyRef.current;

    if (body) {
      body.scrollTop = 0;
    }

    const to = dialogGeometry();

    if (!to) {
      return;
    }

    const token = stopAll();

    pendingFocusRef.current = "message";
    setAnchorTop(to.top);
    setPhase("toDialog");

    if (reducedMotion) {
      left.set(to.left);
      top.set(to.top);
      width.set(to.width);
      height.set(to.height);
      background.set(DIALOG_BG);
      whenDone(
        [
          tween(popOpacity, 0, 0.15, 0, FADE),
          tween(dialogOpacity, 1, 0.15, 0, FADE),
          tween(scrim, 1, 0.15, 0, FADE),
        ],
        token,
        finishForward,
      );
      return;
    }

    whenDone(
      [
        ...reshape(to, OPEN.surface),
        tween(background, DIALOG_BG, OPEN.surface),
        tween(scrim, 1, OPEN.surface, 0, FADE),
        tween(popOpacity, 0, OPEN.outDuration, 0, "linear"),
        tween(dialogOpacity, 1, OPEN.inDuration, OPEN.inDelay, FADE),
      ],
      token,
      finishForward,
    );
  }

  function finishForward() {
    setPhase("dialog");
    announce(
      draft.cancelMeeting
        ? `Draft ready. ${day.long}’s ${event.title} will be cancelled when you send.`
        : "Draft ready.",
    );
  }

  function startReverse() {
    const current = phaseRef.current;

    if ((current !== "dialog" && current !== "toDialog") || sending) {
      return;
    }

    const from = popoverGeometry();

    if (!from) {
      return;
    }

    const container = containerRef.current;

    // The settled dialog hugs its content with an auto height; pin it to the
    // same number before handing it back to the animation.
    if (container && current === "dialog") {
      height.set(container.offsetHeight);
    }

    const token = stopAll();

    pendingFocusRef.current = "convert";
    setPhase("toPopover");

    if (reducedMotion) {
      left.set(from.left);
      top.set(from.top);
      width.set(from.width);
      height.set(from.height);
      background.set(POPOVER_BG);
      whenDone(
        [
          tween(popOpacity, 1, 0.15, 0, FADE),
          tween(dialogOpacity, 0, 0.15, 0, FADE),
          tween(scrim, 0, 0.15, 0, FADE),
        ],
        token,
        finishReverse,
      );
      return;
    }

    whenDone(
      [
        ...reshape(from, CLOSE.surface),
        tween(background, POPOVER_BG, CLOSE.surface),
        tween(scrim, 0, CLOSE.surface, 0, FADE),
        tween(dialogOpacity, 0, CLOSE.outDuration, 0, "linear"),
        tween(popOpacity, 1, CLOSE.inDuration, CLOSE.inDelay, FADE),
      ],
      token,
      finishReverse,
    );
  }

  function finishReverse() {
    setPhase("popover");
    announce("Back to event details. Your draft is kept.");
  }

  // Focus can only move once the side that's arriving is no longer inert.
  // Under reduced motion both phase changes can land in one render, so the
  // destination is recorded when the morph starts rather than inferred.
  const pendingFocusRef = useRef<"message" | "convert" | null>(null);

  useEffect(
    function moveFocus() {
      const pending = pendingFocusRef.current;

      if (phase === "dialog" && pending === "message") {
        pendingFocusRef.current = null;

        const message = messageRef.current;

        if (message) {
          message.focus({ preventScroll: true });
          message.setSelectionRange(0, 0);
        }
      } else if (phase === "popover" && pending === "convert") {
        pendingFocusRef.current = null;
        convertRef.current?.focus({ preventScroll: true });
      }
    },
    [phase],
  );

  function send() {
    if (phaseRef.current !== "dialog" || sending) {
      return;
    }

    setSending(true);
    announce("Sending.");
    sendTimerRef.current = setTimeout(function sent() {
      sendTimerRef.current = null;
      onSend(draft);
    }, 420 * slow);
  }

  /* Keyboard -------------------------------------------------------------- */

  useEffect(
    function bindKeys() {
      function handleKeyDown(keyEvent: KeyboardEvent) {
        if (blocked) {
          return;
        }

        const current = phaseRef.current;

        if (keyEvent.key === "Escape") {
          if (current === "popover") {
            keyEvent.preventDefault();
            onClose(true);
          } else if (current === "dialog" || current === "toDialog") {
            keyEvent.preventDefault();
            startReverse();
          }
          return;
        }

        // Focus stays inside the dialog while it's open.
        if (keyEvent.key === "Tab" && current === "dialog") {
          const panel = dialogRef.current;

          if (!panel) {
            return;
          }

          const focusable = Array.from(
            panel.querySelectorAll<HTMLElement>(
              "button:not([disabled]), input:not([disabled]), textarea:not([disabled])",
            ),
          );

          if (focusable.length === 0) {
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;

          if (keyEvent.shiftKey && (active === first || !panel.contains(active))) {
            keyEvent.preventDefault();
            last.focus();
          } else if (
            !keyEvent.shiftKey &&
            (active === last || !panel.contains(active))
          ) {
            keyEvent.preventDefault();
            first.focus();
          }
        }
      }

      window.addEventListener("keydown", handleKeyDown);

      return function cleanup() {
        window.removeEventListener("keydown", handleKeyDown);
      };
    },
    // startReverse reads fresh state through refs; rebinding per render is fine.
  );

  /* Render ---------------------------------------------------------------- */

  const isDialog = phase !== "popover";

  return (
    <motion.div
      data-gc-surface-root
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.16 * slow, ease: EASE }}
    >
      <motion.div
        ref={containerRef}
        data-gc-surface
        data-phase={phase}
        data-shape={phase === "popover" ? "popover" : "dialog"}
        role="dialog"
        aria-modal={phase === "dialog" ? true : undefined}
        aria-labelledby={isDialog ? headingId : titleId}
        tabIndex={-1}
        style={{
          left: shownLeft,
          top: shownTop,
          width: shownWidth,
          height: phase === "dialog" ? "auto" : shownHeight,
          backgroundColor: background,
        }}
      >
        <div
          ref={popRef}
          data-gc-pop
          inert={phase !== "popover"}
          aria-hidden={phase !== "popover" ? true : undefined}
          style={{ maxHeight: stage.h - HEADER - 16 }}
        >
          <motion.div data-gc-pop-inner style={{ opacity: popOpacity }}>
            <div data-gc-pop-toolbar>
              {yours && <IconButton icon="edit" label="Edit event" />}
              <IconButton icon="delete" label="Delete event" />
              <IconButton
                icon="moreVert"
                label="Options"
                size={32}
              />
              <IconButton
                icon="close"
                label="Close"
                onClick={function close() {
                  onClose(true);
                }}
              />
            </div>

            <div data-gc-row data-kind="title">
              <span data-gc-row-icon>
                <span data-gc-swatch style={{ background: event.color }} />
              </span>
              <div data-gc-row-main>
                <h2 id={titleId} data-gc-pop-title>
                  {event.title}
                </h2>
                <p data-gc-pop-meta>
                  {day.long}, October {day.date}
                  <span data-gc-dot aria-hidden="true">
                    ·
                  </span>
                  {popoverRange(event.start, event.end)}
                </p>
                {event.recurrence && (
                  <p data-gc-pop-meta>{event.recurrence}</p>
                )}
              </div>
            </div>

            {event.meet && (
              <div data-gc-row data-kind="meet">
                <span data-gc-row-icon>
                  <Icon name="videocam" size={20} />
                </span>
                <div data-gc-row-main>
                  <a
                    href="#"
                    data-gc-meet
                    data-gc-sl
                    data-gc-press
                    onClick={function stay(clickEvent) {
                      clickEvent.preventDefault();
                    }}
                  >
                    Join with Google Meet
                  </a>
                  <p data-gc-pop-small>{event.meet}</p>
                </div>
                <span data-gc-row-actions>
                  <IconButton
                    icon="contentCopy"
                    label="Copy conference info"
                    size={32}
                    iconSize={18}
                  />
                </span>
              </div>
            )}

            {attendees.length > 0 && (
              <>
                <div data-gc-row data-kind="guests">
                  <span data-gc-row-icon>
                    <Icon name="group" size={20} />
                  </span>
                  <div data-gc-row-main>
                    <p data-gc-pop-text>{plural(attendees.length, "guest")}</p>
                    <p data-gc-pop-small>
                      {yesCount} yes
                      {awaitingCount > 0 && `, ${awaitingCount} awaiting`}
                      {isOrganizer(event) && (
                        <>
                          <span data-gc-dot aria-hidden="true">
                            ·
                          </span>
                          <span data-gc-nudge>
                            {plural(timeCost, "hour")} of everyone’s time
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span data-gc-row-actions>
                    <IconButton
                      icon="contentCopy"
                      label="Copy guest emails"
                      size={32}
                      iconSize={18}
                      onClick={onCopyGuests}
                    />
                    <IconButton
                      icon="mail"
                      label="Email guests"
                      size={32}
                      iconSize={18}
                      onClick={onEmailGuests}
                    />
                  </span>
                </div>

                {convertible && (
                  <div data-gc-row data-kind="convert">
                    <span data-gc-row-icon />
                    <div data-gc-row-main>
                      <button
                        ref={convertRef}
                        type="button"
                        data-gc-tonal
                        data-gc-sl
                        data-gc-press
                        onClick={startForward}
                      >
                        <Icon name="mail" size={18} />
                        This could be an email
                      </button>
                    </div>
                  </div>
                )}

                <ul data-gc-guests aria-label="Guests">
                  {attendees.map(function guestRow(attendee) {
                    const guest = GUESTS[attendee.id];

                    return (
                      <li key={guest.id} data-gc-guest>
                        <span data-gc-guest-avatar>
                          <Avatar guest={guest} />
                          {attendee.rsvp === "yes" && (
                            <span data-gc-rsvp-badge aria-hidden="true">
                              <Icon name="check" size={10} />
                            </span>
                          )}
                        </span>
                        <span data-gc-guest-text>
                          <span data-gc-guest-name>
                            {guest.name}
                            <span className="sr-only">
                              {attendee.rsvp === "yes"
                                ? ", attending"
                                : ", awaiting response"}
                            </span>
                          </span>
                          {attendee.organizer && (
                            <span data-gc-guest-role>Organizer</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {event.agenda && (
              <div data-gc-row data-kind="text">
                <span data-gc-row-icon>
                  <Icon name="notes" size={20} />
                </span>
                <div data-gc-row-main data-gc-description>
                  <p>Agenda</p>
                  {event.agenda.map(function agendaLine(item, index) {
                    return (
                      <p key={item}>
                        {index + 1}. {item}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {event.description && (
              <div data-gc-row data-kind="text">
                <span data-gc-row-icon>
                  <Icon name="notes" size={20} />
                </span>
                <div data-gc-row-main data-gc-description>
                  <p>{event.description}</p>
                </div>
              </div>
            )}

            {event.reminder && (
              <div data-gc-row data-kind="text">
                <span data-gc-row-icon>
                  <Icon name="notifications" size={20} />
                </span>
                <p data-gc-row-main data-gc-pop-text>
                  {event.reminder}
                </p>
              </div>
            )}

            <div data-gc-row data-kind="text">
              <span data-gc-row-icon>
                <Icon name="calendarToday" size={20} />
              </span>
              <p data-gc-row-main data-gc-pop-text>
                {event.calendar === "coworking" ? "Coworking" : "Uzochukwu Okafor"}
              </p>
            </div>

            {!yours && attendees.length > 0 && (
              <div data-gc-rsvp role="group" aria-label="Going?">
                <span data-gc-rsvp-label>Going?</span>
                {(["yes", "no", "maybe"] as const).map(function option(value) {
                  return (
                    <button
                      key={value}
                      type="button"
                      data-gc-rsvp-option
                      data-gc-sl
                      data-gc-press
                      aria-pressed={rsvp === value}
                      onClick={function choose() {
                        setRsvp(value);
                      }}
                    >
                      {rsvp === value && <Icon name="check" size={18} />}
                      {value === "yes" ? "Yes" : value === "no" ? "No" : "Maybe"}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {convertible && (
          <motion.div
            data-gc-dialog-slot
            data-visible={isDialog ? "true" : "false"}
            inert={phase !== "dialog"}
            aria-hidden={phase !== "dialog" ? true : undefined}
            style={{ opacity: dialogOpacity }}
          >
            <DialogPanel
              mode="convert"
              event={event}
              draft={draft}
              setDraft={setDraft}
              sending={sending}
              maxHeight={stage.h - anchorTop - 16}
              panelRef={function attachPanel(node) {
                dialogRef.current = node;
              }}
              bodyRef={function attachBody(node) {
                bodyRef.current = node;
              }}
              messageRef={function attachMessage(node) {
                messageRef.current = node;
              }}
              headingId={headingId}
              onCancel={startReverse}
              onSend={send}
              onCopy={onCopyGuests}
              slow={slow}
              reducedMotion={reducedMotion}
            />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* Plain Email guests (today's behaviour, opened from the envelope icon) ---- */

function PlainDialog({
  event,
  stage,
  draft,
  setDraft,
  reducedMotion,
  slow,
  onCancel,
  onSend,
  onCopy,
}: {
  event: CalEvent;
  stage: Stage;
  draft: Draft;
  setDraft: (update: (current: Draft) => Draft) => void;
  reducedMotion: boolean;
  slow: number;
  onCancel: () => void;
  onSend: (draft: Draft) => void;
  onCopy: () => void;
}) {
  const headingId = useId();
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(function focusFirstField() {
    const panel = panelRef.current;
    const message = panel?.querySelector("textarea");

    message?.focus({ preventScroll: true });

    const timer = timerRef;

    return function cleanup() {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  useEffect(function bindKeys() {
    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        keyEvent.stopImmediatePropagation();
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return function cleanup() {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  });

  function send() {
    if (sending) {
      return;
    }

    setSending(true);
    timerRef.current = setTimeout(function sent() {
      timerRef.current = null;
      onSend(draft);
    }, 420 * slow);
  }

  return (
    <motion.div
      data-gc-plain
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.98 }}
      transition={{ duration: (reducedMotion ? 0.12 : 0.22) * slow, ease: EASE }}
      style={{ left: (stage.w - DIALOG_W) / 2 }}
    >
      <DialogPanel
        mode="plain"
        event={event}
        draft={draft}
        setDraft={setDraft}
        sending={sending}
        maxHeight={stage.h - 32}
        panelRef={function attach(node) {
          panelRef.current = node;
        }}
        headingId={headingId}
        onCancel={onCancel}
        onSend={send}
        onCopy={onCopy}
        slow={slow}
        reducedMotion={reducedMotion}
      />
    </motion.div>
  );
}

/* Snackbar ------------------------------------------------------------------ */

type SnackKind = "converted" | "sent" | "restored" | "undone" | "copied";

type Snack = { id: number; kind: SnackKind; hours: number };

function SnackbarBody({
  snack,
  reducedMotion,
  slow,
  onUndo,
}: {
  snack: Snack;
  reducedMotion: boolean;
  slow: number;
  onUndo: () => void;
}) {
  const counted = useMotionValue(reducedMotion ? snack.hours : 0);
  const label = useTransform(counted, function hoursLabel(value) {
    return plural(Math.round(value), "hour");
  });

  useEffect(
    function countUp() {
      if (snack.kind !== "converted" || reducedMotion) {
        return;
      }

      const control = animate(counted, snack.hours, {
        duration: 0.6 * slow,
        delay: 0.12 * slow,
        ease: [0.22, 0.61, 0.36, 1],
      });

      return function cleanup() {
        control.stop();
      };
    },
    [counted, reducedMotion, slow, snack.hours, snack.kind],
  );

  const undoable = snack.kind === "converted" || snack.kind === "sent";

  let text: ReactNode = null;

  if (snack.kind === "converted") {
    // The final sentence sizes the bar, so Undo never shifts while it counts.
    text = (
      <span data-gc-snack-count>
        <span data-gc-snack-sizer aria-hidden="true">
          Email sent
          <span data-gc-dot>·</span>
          {plural(snack.hours, "hour")} given back
        </span>
        <span data-gc-snack-live>
          Email sent
          <span data-gc-dot aria-hidden="true">
            ·
          </span>
          <motion.span>{label}</motion.span> given back
        </span>
      </span>
    );
  } else if (snack.kind === "sent") {
    text = "Email sent";
  } else if (snack.kind === "restored") {
    text = "Meeting restored";
  } else if (snack.kind === "undone") {
    text = "Sending undone";
  } else {
    text = "Guest emails copied";
  }

  return (
    <>
      <p data-gc-snack-text>{text}</p>
      {undoable && (
        <button
          type="button"
          data-gc-snack-action
          data-gc-sl
          data-gc-press
          onClick={onUndo}
        >
          Undo
        </button>
      )}
    </>
  );
}

/* The app ------------------------------------------------------------------- */

type Dissolve = "none" | "free" | "gone";

export function CalendarApp() {
  const reducedMotion = Boolean(useReducedMotion());

  const [stage, setStage] = useState<Stage | null>(null);
  const slow = useSyncExternalStore(subscribeToNothing, readSlow, serverSlow);
  const [openId, setOpenId] = useState<EventId | null>(null);
  const [phase, setPhase] = useState<Phase>("popover");
  const [plainOpen, setPlainOpen] = useState(false);
  const [dissolve, setDissolve] = useState<Dissolve>("none");
  const [visible, setVisible] = useState<Record<CalendarId, boolean>>({
    you: true,
    birthdays: true,
    tasks: true,
    coworking: true,
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [snack, setSnack] = useState<Snack | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [calendarsOpen, setCalendarsOpen] = useState({ mine: true, other: true });

  const appRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);
  const eventRefs = useRef<Partial<Record<EventId, HTMLButtonElement | null>>>({});
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const snackTimerRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    remaining: number;
    started: number;
  }>({ timer: null, remaining: 0, started: 0 });
  const snackIdRef = useRef(0);
  const lastSendRef = useRef<{ cancelled: boolean } | null>(null);
  const scrim = useMotionValue(0);
  const scrimOpacity = useTransform(scrim, [0, 1], [0, SCRIM]);

  const openEvent = openId ? EVENTS_BY_ID[openId] : null;

  /* Stage ----------------------------------------------------------------- */

  useLayoutEffect(function sizeStage() {
    function measure() {
      const next = measureStage();
      scaleRef.current = next.scale;
      setStage(next);
    }

    measure();
    window.addEventListener("resize", measure);

    return function cleanup() {
      window.removeEventListener("resize", measure);
    };
  }, []);

  useLayoutEffect(
    function scrollToMorning() {
      const grid = gridRef.current;

      if (grid && stage && grid.dataset.scrolled !== "true") {
        grid.scrollTop = HOUR * 7.5;
        grid.dataset.scrolled = "true";
      }
    },
    [stage],
  );

  useEffect(function clearAllTimers() {
    const timers = timersRef;
    const snackTimer = snackTimerRef;

    return function cleanup() {
      timers.current.forEach(clearTimeout);

      if (snackTimer.current.timer !== null) {
        clearTimeout(snackTimer.current.timer);
      }
    };
  }, []);

  const announce = useCallback(function announce(message: string) {
    setAnnouncement("");
    requestAnimationFrame(function speak() {
      setAnnouncement(message);
    });
  }, []);

  /* Snackbar timing --------------------------------------------------------- */

  function clearSnackTimer() {
    const state = snackTimerRef.current;

    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function startSnackTimer(ms: number) {
    clearSnackTimer();
    snackTimerRef.current.remaining = ms;
    snackTimerRef.current.started = performance.now();
    snackTimerRef.current.timer = setTimeout(function dismiss() {
      snackTimerRef.current.timer = null;
      setSnack(null);
    }, ms);
  }

  function pauseSnack() {
    const state = snackTimerRef.current;

    if (state.timer === null) {
      return;
    }

    clearSnackTimer();
    state.remaining = Math.max(
      1200,
      state.remaining - (performance.now() - state.started),
    );
  }

  function resumeSnack() {
    if (snack && snackTimerRef.current.timer === null) {
      startSnackTimer(snackTimerRef.current.remaining);
    }
  }

  function showSnack(kind: SnackKind, hours = 0) {
    snackIdRef.current += 1;
    setSnack({ id: snackIdRef.current, kind, hours });
    startSnackTimer(kind === "converted" || kind === "sent" ? 6000 : 4000);
  }

  /* Events + popover -------------------------------------------------------- */

  function later(fn: () => void, ms: number) {
    const timer = setTimeout(function fire() {
      timersRef.current = timersRef.current.filter(function keep(item) {
        return item !== timer;
      });
      fn();
    }, ms * slow);

    timersRef.current.push(timer);
  }

  function clearLater() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  const busy = openId !== null && phase !== "popover";

  function openPopover(id: EventId) {
    if (busy || plainOpen) {
      return;
    }

    setPhase("popover");
    setOpenId(function toggle(current) {
      return current === id ? null : id;
    });
  }

  const closePopover = useCallback(
    function closePopover(returnFocus: boolean) {
      const id = openId;

      setOpenId(null);
      setPhase("popover");

      if (returnFocus && id) {
        eventRefs.current[id]?.focus({ preventScroll: true });
      }
    },
    [openId],
  );

  const getAnchor = useCallback(
    function getAnchor() {
      return openId ? eventRefs.current[openId] ?? null : null;
    },
    [openId],
  );

  function handleAppPointerDown(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    if (!openId || phase !== "popover" || plainOpen) {
      return;
    }

    const target = pointerEvent.target as HTMLElement;

    if (
      target.closest("[data-gc-surface]") ||
      target.closest("[data-gc-event]") ||
      target.closest("[data-gc-snack]")
    ) {
      return;
    }

    closePopover(false);
  }

  function draftFor(event: CalEvent, mode: "convert" | "plain") {
    return (
      drafts[`${event.id}:${mode}`] ??
      (mode === "convert" ? convertDraft(event) : plainDraft(event))
    );
  }

  function setDraftFor(event: CalEvent, mode: "convert" | "plain") {
    return function setDraft(update: (current: Draft) => Draft) {
      setDrafts(function apply(current) {
        const key = `${event.id}:${mode}`;
        const base =
          current[key] ??
          (mode === "convert" ? convertDraft(event) : plainDraft(event));

        return { ...current, [key]: update(base) };
      });
    };
  }

  /* Sending ------------------------------------------------------------------ */

  function handleConvertSent(event: CalEvent, draft: Draft) {
    const cancelled = draft.cancelMeeting;
    const hours = hoursOfTime(event);

    lastSendRef.current = { cancelled };
    animate(scrim, 0, { duration: (reducedMotion ? 0 : 0.24) * slow, ease: EASE });
    setOpenId(null);
    setPhase("popover");
    gridRef.current?.focus({ preventScroll: true });

    // The sent draft is spent; the next conversion starts fresh.
    setDrafts(function clear(current) {
      const next = { ...current };
      delete next[`${event.id}:convert`];
      return next;
    });

    if (!cancelled) {
      later(function toast() {
        showSnack("sent");
      }, 120);
      announce("Email sent.");
      return;
    }

    clearLater();

    if (reducedMotion) {
      setDissolve("gone");
      showSnack("converted", hours);
    } else {
      later(function free() {
        setDissolve("free");
        showSnack("converted", hours);
      }, 120);
      later(function gone() {
        setDissolve("gone");
      }, 120 + 240 + 500);
    }

    announce(
      `Email sent. ${WEEK[event.day].long}’s ${event.title} was cancelled. ${plural(
        hours,
        "hour",
      )} given back.`,
    );
  }

  function handlePlainSent() {
    lastSendRef.current = { cancelled: false };
    setPlainOpen(false);
    animate(scrim, 0, { duration: (reducedMotion ? 0 : 0.24) * slow, ease: EASE });

    if (openEvent) {
      setDrafts(function clear(current) {
        const next = { ...current };
        delete next[`${openEvent.id}:plain`];
        return next;
      });
    }

    later(function toast() {
      showSnack("sent");
    }, 120);
    announce("Email sent.");
  }

  function undo() {
    const last = lastSendRef.current;

    lastSendRef.current = null;

    if (!last?.cancelled) {
      showSnack("undone");
      announce("Sending undone.");
      return;
    }

    clearLater();

    if (reducedMotion) {
      setDissolve("none");
    } else if (dissolve === "gone") {
      setDissolve("free");
      later(function refill() {
        setDissolve("none");
      }, 320);
    } else {
      setDissolve("none");
    }

    showSnack("restored");
    announce("Meeting restored.");
  }

  function copyGuests() {
    const event = openEvent;

    if (!event) {
      return;
    }

    const emails = (event.attendees ?? [])
      .map(function email(attendee) {
        return GUESTS[attendee.id].email;
      })
      .join(", ");

    void navigator.clipboard?.writeText(emails).catch(function ignore() {});
    showSnack("copied");
    announce("Guest emails copied.");
  }

  function openPlain() {
    if (!openEvent || plainOpen) {
      return;
    }

    setPlainOpen(true);
    animate(scrim, 1, { duration: (reducedMotion ? 0.12 : 0.22) * slow, ease: EASE });
  }

  function closePlain() {
    setPlainOpen(false);
    animate(scrim, 0, { duration: (reducedMotion ? 0.12 : 0.2) * slow, ease: EASE });
  }

  function resetPrototype() {
    clearLater();
    clearSnackTimer();
    scrim.set(0);
    setOpenId(null);
    setPhase("popover");
    setPlainOpen(false);
    setDissolve("none");
    setDrafts({});
    setSnack(null);
    setVisible({ you: true, birthdays: true, tasks: true, coworking: true });
    lastSendRef.current = null;

    const grid = gridRef.current;

    if (grid) {
      grid.scrollTop = HOUR * 7.5;
    }

    announce("Prototype reset.");
  }

  /* Week layout -------------------------------------------------------------- */

  const shown = EVENTS.filter(function onVisibleCalendar(event) {
    return visible[event.calendar];
  });

  function slotsFor(day: number, includeGone: boolean) {
    return layoutDay(
      shown.filter(function onDay(event) {
        return (
          event.day === day &&
          (includeGone || event.id !== "weekly-sync" || dissolve !== "gone")
        );
      }),
    );
  }

  const daySlots = WEEK.map(function slots(_, index) {
    return { live: slotsFor(index, false), all: slotsFor(index, true) };
  });

  const ready = stage !== null;
  const size = stage ?? { w: PHONE_W, h: PHONE_H, scale: 1 };

  return (
    <div
      data-gc-stage
      data-ready={ready ? "true" : "false"}
      data-scaled={size.scale < 1 ? "true" : undefined}
      style={{ "--gc-slow": slow } as CSSProperties}
    >
      <div
        data-gc-frame
        style={{ width: size.w * size.scale, height: size.h * size.scale }}
      >
        <div
          ref={appRef}
          data-gc-app
          style={{
            width: size.w,
            height: size.h,
            transform: size.scale === 1 ? undefined : `scale(${size.scale})`,
          }}
          onPointerDown={handleAppPointerDown}
        >
          {/* Header ------------------------------------------------------- */}
          <header data-gc-header>
            <div data-gc-brand>
              <IconButton icon="menu" label="Main menu" size={48} iconSize={24} />
              <span data-gc-logo aria-hidden="true">
                <span data-gc-logo-date>12</span>
              </span>
              <span data-gc-wordmark>Calendar</span>
            </div>
            <button
              type="button"
              data-gc-outline
              data-gc-sl
              data-gc-press
              aria-label="Today, Monday, October 12"
            >
              Today
            </button>
            <div data-gc-nav>
              <IconButton icon="chevronLeft" label="Previous week" iconSize={24} />
              <IconButton icon="chevronRight" label="Next week" iconSize={24} />
            </div>
            <p data-gc-month>October 2026</p>
            <div data-gc-header-tools>
              <IconButton icon="search" label="Search" iconSize={24} />
              <IconButton icon="help" label="Support" iconSize={24} />
              <IconButton icon="settings" label="Settings menu" iconSize={24} />
              <button
                type="button"
                data-gc-outline
                data-gc-view-menu
                data-gc-sl
                data-gc-press
                aria-label="Week view"
              >
                Week
                <Icon name="arrowDropDown" size={20} />
              </button>
              <div data-gc-toggle role="group" aria-label="Switch view">
                <button
                  type="button"
                  data-gc-toggle-option
                  data-gc-sl
                  aria-pressed="true"
                  aria-label="Calendar"
                >
                  <Icon name="calendarMonth" size={20} />
                </button>
                <button
                  type="button"
                  data-gc-toggle-option
                  data-gc-sl
                  aria-pressed="false"
                  aria-label="Tasks"
                >
                  <Icon name="taskAlt" size={20} />
                </button>
              </div>
              <IconButton icon="apps" label="Google apps" iconSize={24} />
              <button
                type="button"
                data-gc-account
                data-gc-press
                aria-label="Google Account: Uzochukwu Okafor"
              >
                <span data-gc-account-avatar>U</span>
              </button>
            </div>
          </header>

          {/* Sidebar ------------------------------------------------------- */}
          <nav data-gc-sidebar aria-label="Calendars">
            <button type="button" data-gc-create data-gc-sl data-gc-press>
              <Icon name="add" size={24} />
              <span>Create</span>
              <Icon name="arrowDropDown" size={20} />
            </button>

            <div data-gc-mini>
              <div data-gc-mini-head>
                <p>October 2026</p>
                <span>
                  <IconButton icon="chevronLeft" label="Previous month" size={32} iconSize={18} />
                  <IconButton icon="chevronRight" label="Next month" size={32} iconSize={18} />
                </span>
              </div>
              <div data-gc-mini-grid role="grid" aria-label="October 2026">
                {["S", "M", "T", "W", "T", "F", "S"].map(function weekday(letter, index) {
                  return (
                    <span key={`h${index}`} data-gc-mini-dow aria-hidden="true">
                      {letter}
                    </span>
                  );
                })}
                {MINI_DAYS.map(function miniDay(cell) {
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      data-gc-mini-day
                      data-gc-sl
                      data-muted={cell.muted ? "true" : undefined}
                      data-today={cell.today ? "true" : undefined}
                      aria-label={cell.label}
                      aria-current={cell.today ? "date" : undefined}
                    >
                      {cell.date}
                    </button>
                  );
                })}
              </div>
            </div>

            <label data-gc-people>
              <Icon name="group" size={20} />
              <input type="text" placeholder="Search for people" />
            </label>

            <div data-gc-side-section>
              <span>Booking pages</span>
              <IconButton icon="add" label="Create booking page" size={32} iconSize={20} />
            </div>

            {(["mine", "other"] as const).map(function group(key) {
              const open = calendarsOpen[key];

              return (
                <div key={key} data-gc-side-group>
                  <div data-gc-side-section>
                    <span>{key === "mine" ? "My calendars" : "Other calendars"}</span>
                    <span data-gc-side-actions>
                      {key === "other" && (
                        <IconButton icon="add" label="Add other calendars" size={32} iconSize={20} />
                      )}
                      <IconButton
                        icon={open ? "keyboardArrowUp" : "keyboardArrowDown"}
                        label={`${open ? "Hide" : "Show"} ${
                          key === "mine" ? "my" : "other"
                        } calendars`}
                        size={32}
                        iconSize={20}
                        onClick={function toggleGroup() {
                          setCalendarsOpen(function flip(current) {
                            return { ...current, [key]: !current[key] };
                          });
                        }}
                      />
                    </span>
                  </div>
                  {open && (
                    <ul data-gc-calendar-list>
                      {CALENDARS.filter(function inGroup(calendar) {
                        return calendar.group === key;
                      }).map(function calendarRow(calendar) {
                        return (
                          <li key={calendar.id}>
                            <Checkbox
                              checked={visible[calendar.id]}
                              color={calendar.color}
                              tinted
                              label={calendar.name}
                              disabled={busy || plainOpen}
                              onChange={function toggleCalendar(value) {
                                setVisible(function apply(current) {
                                  return { ...current, [calendar.id]: value };
                                });
                              }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}

            <div data-gc-side-foot>
              <p data-gc-terms>Terms – Privacy</p>
              <button
                type="button"
                data-gc-reset
                data-gc-sl
                data-gc-press
                onClick={resetPrototype}
                title="Reset this prototype"
              >
                <Icon name="refresh" size={16} />
                Reset demo
              </button>
            </div>
          </nav>

          {/* Week grid ------------------------------------------------------ */}
          <main data-gc-card aria-label="Week of October 11, 2026">
            <div data-gc-week-head>
              <span data-gc-tz>GMT+01</span>
              {WEEK.map(function dayHead(day, index) {
                const today = index === TODAY;

                return (
                  <div key={day.dow} data-gc-day-head data-today={today ? "true" : undefined}>
                    <span data-gc-dow>{day.dow.toUpperCase()}</span>
                    <button
                      type="button"
                      data-gc-day-number
                      data-gc-sl
                      aria-label={`${day.long}, October ${day.date}${today ? ", today" : ""}`}
                    >
                      {day.date}
                    </button>
                  </div>
                );
              })}
            </div>

            <div ref={gridRef} data-gc-grid-scroll tabIndex={-1}>
              <div data-gc-grid style={{ height: HOUR * 24 }}>
                <div data-gc-hours aria-hidden="true">
                  {Array.from({ length: 23 }, function label(_, index) {
                    const hour = index + 1;

                    return (
                      <span key={hour} data-gc-hour style={{ top: hour * HOUR }}>
                        {hourLabel(hour)}
                      </span>
                    );
                  })}
                </div>
                {WEEK.map(function column(day, index) {
                  const slots = daySlots[index];

                  return (
                    <div
                      key={day.dow}
                      data-gc-day
                      role="group"
                      aria-label={`${day.long}, October ${day.date}`}
                    >
                      {shown
                        .filter(function onDay(event) {
                          return event.day === index;
                        })
                        .map(function block(event) {
                          const isSync = event.id === "weekly-sync";
                          const slot =
                            (isSync && dissolve === "gone"
                              ? slots.all.get(event.id)
                              : slots.live.get(event.id)) ?? { col: 0, cols: 1 };
                          const state = isSync ? dissolve : "none";
                          const compact = event.end - event.start < 0.75;

                          return (
                            <button
                              key={event.id}
                              ref={function attach(node) {
                                eventRefs.current[event.id] = node;
                              }}
                              type="button"
                              data-gc-event
                              data-gc-press="soft"
                              data-compact={compact ? "true" : undefined}
                              data-split={slot.cols > 1 ? "true" : undefined}
                              data-selected={openId === event.id ? "true" : undefined}
                              data-dissolve={state}
                              aria-haspopup="dialog"
                              aria-expanded={openId === event.id}
                              aria-label={`${event.title}, ${WEEK[event.day].long}, October ${
                                WEEK[event.day].date
                              }, ${spokenRange(event.start, event.end)}`}
                              tabIndex={state === "none" ? 0 : -1}
                              disabled={state !== "none"}
                              style={
                                {
                                  top: event.start * HOUR,
                                  height: (event.end - event.start) * HOUR - 2,
                                  left: `calc((100% - 12px) * ${slot.col / slot.cols})`,
                                  width: `calc((100% - 12px) / ${slot.cols} - ${
                                    slot.cols > 1 ? 1 : 0
                                  }px)`,
                                  "--gc-event": event.color,
                                } as CSSProperties
                              }
                              onClick={function open() {
                                openPopover(event.id);
                              }}
                            >
                              <span data-gc-event-fill />
                              <span data-gc-event-dash />
                              <span data-gc-event-body>
                                {compact ? (
                                  // Short events read on one line; a split
                                  // column has room for the title alone.
                                  <span data-gc-event-line>
                                    <span data-gc-event-title>{event.title}</span>
                                    {slot.cols === 1 &&
                                      `, ${formatClock(event.start, false)}${meridiem(
                                        event.start,
                                      )}`}
                                  </span>
                                ) : (
                                  <>
                                    <span data-gc-event-title>{event.title}</span>
                                    <span data-gc-event-time>
                                      {chipRange(event.start, event.end)}
                                    </span>
                                  </>
                                )}
                              </span>
                              {isSync && (
                                <span data-gc-event-free aria-hidden="true">
                                  Free
                                </span>
                              )}
                            </button>
                          );
                        })}

                      {index === TODAY && (
                        <span
                          data-gc-now
                          style={{ top: NOW_HOURS * HOUR }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>

          {/* Side panel rail ------------------------------------------------ */}
          <aside data-gc-rail aria-label="Side panel">
            <span data-gc-rail-icons>
              <button type="button" data-gc-rail-button data-gc-sl aria-label="Keep">
                <Icon name="lightbulbFill" size={20} style={{ color: "#fbbc04" }} />
              </button>
              <button type="button" data-gc-rail-button data-gc-sl aria-label="Tasks">
                <Icon name="checkCircleFill" size={20} style={{ color: "#1a73e8" }} />
              </button>
              <button type="button" data-gc-rail-button data-gc-sl aria-label="Contacts">
                <Icon name="personFill" size={20} style={{ color: "#1a73e8" }} />
              </button>
              <button type="button" data-gc-rail-button data-gc-sl aria-label="Maps">
                <Icon name="locationOnFill" size={20} style={{ color: "#34a853" }} />
              </button>
              <span data-gc-rail-divider />
              <IconButton icon="add" label="Get add-ons" iconSize={20} />
            </span>
            <IconButton icon="chevronRight" label="Hide side panel" size={32} iconSize={20} />
          </aside>

          {/* Overlays ------------------------------------------------------- */}
          <motion.div data-gc-scrim style={{ opacity: scrimOpacity }} aria-hidden="true" />

          <AnimatePresence>
            {openEvent && stage && (
              <Surface
                key={openEvent.id}
                event={openEvent}
                stage={stage}
                scaleRef={scaleRef}
                appRef={appRef}
                anchor={getAnchor}
                draft={draftFor(openEvent, "convert")}
                setDraft={setDraftFor(openEvent, "convert")}
                scrim={scrim}
                reducedMotion={reducedMotion}
                slow={slow}
                onClose={closePopover}
                onSend={function sent(draft) {
                  handleConvertSent(openEvent, draft);
                }}
                onEmailGuests={openPlain}
                onCopyGuests={copyGuests}
                onPhaseChange={setPhase}
                announce={announce}
                blocked={plainOpen}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {plainOpen && openEvent && stage && (
              <PlainDialog
                key={`plain-${openEvent.id}`}
                event={openEvent}
                stage={stage}
                draft={draftFor(openEvent, "plain")}
                setDraft={setDraftFor(openEvent, "plain")}
                reducedMotion={reducedMotion}
                slow={slow}
                onCancel={closePlain}
                onSend={handlePlainSent}
                onCopy={copyGuests}
              />
            )}
          </AnimatePresence>

          <div data-gc-snack-region>
            <AnimatePresence mode="wait">
              {snack && (
                <motion.div
                  key={snack.id}
                  data-gc-snack
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: 0,
                    transition: { duration: 0.12 * slow, ease: EASE },
                  }}
                  transition={{ duration: 0.28 * slow, ease: EASE }}
                  onPointerEnter={pauseSnack}
                  onPointerLeave={resumeSnack}
                  onFocus={pauseSnack}
                  onBlur={resumeSnack}
                >
                  <SnackbarBody
                    snack={snack}
                    reducedMotion={reducedMotion}
                    slow={slow}
                    onUndo={undo}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p data-gc-live className="sr-only" aria-live="polite">
            {announcement}
          </p>
        </div>
      </div>

      <style>{STYLES}</style>
    </div>
  );
}

/* Mini month ---------------------------------------------------------------- */

const MINI_DAYS = (function buildMiniMonth() {
  const cells: Array<{
    key: string;
    date: number;
    muted: boolean;
    today: boolean;
    label: string;
  }> = [];
  // October 2026 starts on a Thursday; the grid opens on Sunday, September 27.
  for (let index = 0; index < 42; index += 1) {
    const offset = index - 4;
    let date: number;
    let month: "September" | "October" | "November";

    if (offset < 0) {
      date = 30 + offset + 1;
      month = "September";
    } else if (offset < 31) {
      date = offset + 1;
      month = "October";
    } else {
      date = offset - 30;
      month = "November";
    }

    cells.push({
      key: `${month}-${date}`,
      date,
      muted: month !== "October",
      today: month === "October" && date === 12,
      label: `${month} ${date}`,
    });
  }

  return cells;
})();

/* Styles -------------------------------------------------------------------- */

const STYLES = `
  [data-gc-stage] {
    --gc-ease: ${EASE_CSS};
    --gc-text: #1f1f1f;
    --gc-text-2: #444746;
    --gc-primary: #0b57d0;
    --gc-shell: #f8fafd;
    --gc-line: #dde3ea;
    --gc-sans: var(--font-gsans), "Google Sans", Roboto, Arial, sans-serif;
    --gc-flex: var(--font-gsans-flex), var(--font-gsans), "Google Sans", Roboto, Arial, sans-serif;
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: var(--gc-shell);
    opacity: 0;
    transition: opacity 240ms ease;
  }

  [data-gc-stage][data-ready="true"] {
    opacity: 1;
  }

  [data-gc-frame] {
    position: relative;
    flex: none;
  }

  [data-gc-app] {
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
    background: var(--gc-shell);
    color: var(--gc-text);
    font-family: var(--gc-sans);
    font-optical-sizing: auto;
    font-size: 14px;
    line-height: 20px;
    transform-origin: 0 0;
    isolation: isolate;
    -webkit-tap-highlight-color: transparent;
  }

  /* Resets sit in :where() so every component rule below wins without a fight. */
  :where([data-gc-app]) :where(button, input, textarea) {
    font: inherit;
    color: inherit;
  }

  :where([data-gc-app]) :where(button) {
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  :where([data-gc-app]) :where(button:disabled) {
    cursor: default;
  }

  :where([data-gc-app]) :where(p, h2, ul) {
    margin: 0;
    padding: 0;
  }

  :where([data-gc-app]) :where(ul) {
    list-style: none;
  }

  [data-gc-app] :focus {
    outline: none;
  }

  [data-gc-app] :focus-visible {
    outline: 2px solid var(--gc-primary);
    outline-offset: 2px;
  }

  [data-gc-app] [tabindex="-1"]:focus-visible,
  [data-gc-app] input[type="text"]:focus-visible,
  [data-gc-app] textarea:focus-visible {
    outline: none;
  }

  /* State layers: Google's translucent overlay. Hover never scales. ------- */

  [data-gc-sl] {
    position: relative;
    isolation: isolate;
  }

  [data-gc-sl]::after {
    content: "";
    position: absolute;
    z-index: -1;
    inset: 0;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
  }

  [data-gc-sl]:active:not(:disabled)::after {
    opacity: 0.12;
  }

  [data-gc-press] {
    scale: 1;
    transition:
      scale 240ms var(--gc-ease),
      background-color 160ms ease,
      color 160ms ease,
      box-shadow 200ms ease;
    backface-visibility: hidden;
  }

  [data-gc-press]:active:not(:disabled) {
    scale: 0.96;
    transition-duration: 90ms;
  }

  [data-gc-press="soft"]:active:not(:disabled) {
    scale: 0.98;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-gc-sl]:hover:not(:disabled)::after {
      opacity: 0.08;
    }

    [data-gc-sl]:hover:active:not(:disabled)::after {
      opacity: 0.12;
    }
  }

  [data-gc-icon-button] {
    display: inline-grid;
    place-items: center;
    flex: none;
    border-radius: 50%;
    color: var(--gc-text-2);
  }

  [data-gc-icon-button="48"] {
    width: 48px;
    height: 48px;
  }

  [data-gc-icon-button="40"] {
    width: 40px;
    height: 40px;
  }

  [data-gc-icon-button="32"] {
    width: 32px;
    height: 32px;
  }

  /* Header ----------------------------------------------------------------- */

  [data-gc-header] {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${HEADER}px;
    display: flex;
    align-items: center;
    /* The account avatar shares a centre line with the side-panel rail. */
    padding: 0 ${RAIL / 2 - 24}px 0 0;
  }

  [data-gc-brand] {
    width: ${SIDEBAR}px;
    flex: none;
    display: flex;
    align-items: center;
    padding-left: 8px;
  }

  [data-gc-brand] [data-gc-icon-button] {
    margin-right: 4px;
    color: var(--gc-text-2);
  }

  [data-gc-logo] {
    position: relative;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
  }

  [data-gc-logo]::before {
    content: "";
    position: absolute;
    inset: 5px 6px 5px 6px;
    border-radius: 6px;
    background: linear-gradient(180deg, #4c8df6 0 26%, #1a73e8 26% 100%);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
  }

  [data-gc-logo-date] {
    position: relative;
    margin-top: 6px;
    color: #fff;
    font-size: 15px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.3px;
  }

  [data-gc-wordmark] {
    margin-left: 4px;
    color: var(--gc-text-2);
    font-size: 22px;
    line-height: 48px;
    font-weight: 400;
    white-space: nowrap;
  }

  [data-gc-outline] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0 24px;
    border: 1px solid #747775;
    border-radius: 20px;
    color: var(--gc-text);
    font-family: var(--gc-flex);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0;
  }

  [data-gc-nav] {
    display: flex;
    margin: 0 4px 0 12px;
  }

  [data-gc-nav] [data-gc-icon-button] {
    color: var(--gc-text);
  }

  [data-gc-month] {
    margin-left: 12px;
    font-size: 22px;
    line-height: 28px;
    color: var(--gc-text);
    white-space: nowrap;
  }

  [data-gc-header-tools] {
    display: flex;
    align-items: center;
    margin-left: auto;
    gap: 4px;
  }

  [data-gc-header-tools] > [data-gc-icon-button] {
    color: var(--gc-text-2);
  }

  [data-gc-view-menu] {
    margin-left: 12px;
    gap: 8px;
    padding: 0 12px 0 16px;
  }

  [data-gc-toggle] {
    display: flex;
    height: 40px;
    margin-left: 12px;
    border: 1px solid #747775;
    border-radius: 20px;
    overflow: hidden;
  }

  [data-gc-toggle-option] {
    width: 52px;
    height: 38px;
    display: grid;
    place-items: center;
    color: var(--gc-text-2);
  }

  [data-gc-toggle-option][aria-pressed="true"] {
    background: #c2e7ff;
    color: #001d35;
  }

  [data-gc-toggle-option] + [data-gc-toggle-option] {
    border-left: 1px solid #747775;
  }

  [data-gc-header-tools] > [data-gc-icon-button="40"]:last-of-type {
    margin-left: 12px;
  }

  [data-gc-account] {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  [data-gc-account-avatar] {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #8430ce;
    color: #fff;
    font-size: 15px;
    font-weight: 500;
  }

  /* Sidebar ---------------------------------------------------------------- */

  [data-gc-sidebar] {
    position: absolute;
    top: ${HEADER}px;
    left: 0;
    bottom: 0;
    width: ${SIDEBAR}px;
    display: flex;
    flex-direction: column;
    padding: 14px 0 0;
  }

  [data-gc-create] {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    margin-left: 14px;
    padding: 0 12px 0 16px;
    border-radius: 16px;
    background: #fff;
    color: var(--gc-text);
    font-family: var(--gc-flex);
    font-weight: 500;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.3),
      0 4px 8px 3px rgba(0, 0, 0, 0.15);
  }

  [data-gc-create] svg:last-child {
    margin-left: -2px;
    color: var(--gc-text-2);
  }

  [data-gc-mini] {
    margin: 30px 12px 0 18px;
  }

  [data-gc-mini-head] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 6px;
  }

  [data-gc-mini-head] p {
    font-size: 14px;
    font-weight: 500;
  }

  [data-gc-mini-head] [data-gc-icon-button] {
    color: var(--gc-text);
  }

  [data-gc-mini-grid] {
    display: grid;
    grid-template-columns: repeat(7, 31px);
    grid-auto-rows: 28px;
    margin-top: 6px;
  }

  [data-gc-mini-dow],
  [data-gc-mini-day] {
    display: grid;
    place-items: center;
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
  }

  [data-gc-mini-dow] {
    color: var(--gc-text);
  }

  [data-gc-mini-day] {
    width: 24px;
    height: 24px;
    margin: auto;
    border-radius: 50%;
    color: var(--gc-text);
  }

  [data-gc-mini-day][data-muted="true"] {
    color: var(--gc-text-2);
  }

  [data-gc-mini-day][data-today="true"] {
    background: var(--gc-primary);
    color: #fff;
  }

  [data-gc-people] {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 36px;
    margin: 14px 26px 0 28px;
    padding: 0 12px;
    border-radius: 4px;
    background: #e9eef6;
    color: var(--gc-text-2);
  }

  [data-gc-people] input {
    min-width: 0;
    flex: 1;
    border: 0;
    background: none;
    font-size: 14px;
    color: var(--gc-text);
  }

  [data-gc-people] input::placeholder {
    color: var(--gc-text-2);
  }

  [data-gc-people]:focus-within {
    box-shadow: inset 0 -2px 0 var(--gc-primary);
  }

  [data-gc-side-section] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    margin: 16px 18px 0 28px;
    font-size: 14px;
    font-weight: 500;
  }

  [data-gc-side-section] [data-gc-icon-button] {
    color: var(--gc-text-2);
  }

  [data-gc-side-actions] {
    display: flex;
  }

  [data-gc-side-group] [data-gc-side-section] {
    margin-top: 8px;
  }

  [data-gc-calendar-list] {
    margin: 0 0 0 16px;
  }

  [data-gc-calendar-list] [data-gc-check] {
    height: 32px;
  }

  [data-gc-terms] {
    color: var(--gc-text-2);
    font-size: 12px;
  }

  /* Checkbox --------------------------------------------------------------- */

  [data-gc-check] {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 32px;
    cursor: pointer;
    font-size: 14px;
    color: var(--gc-text);
    -webkit-user-select: none;
    user-select: none;
  }

  [data-gc-check][data-disabled="true"] {
    cursor: default;
  }

  [data-gc-check-control] {
    --gc-check-idle: var(--gc-text-2);
    position: relative;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    flex: none;
    border-radius: 50%;
  }

  [data-gc-check-control][data-tinted="true"] {
    --gc-check-idle: var(--gc-check);
  }

  /* State layer: on-surface when empty, the check colour when ticked. */
  [data-gc-check-control]::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--gc-text);
    opacity: 0;
    transition:
      opacity 150ms ease,
      scale 240ms var(--gc-ease);
  }

  [data-gc-check-control][data-checked="true"]::before {
    background: var(--gc-check);
  }

  [data-gc-check-control] input {
    position: absolute;
    inset: 0;
    z-index: 1;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }

  [data-gc-check-box] {
    position: relative;
    width: 18px;
    height: 18px;
    border-radius: 2px;
    box-shadow: inset 0 0 0 2px var(--gc-check-idle);
    pointer-events: none;
    transition:
      box-shadow 90ms linear,
      background-color 90ms linear,
      scale 240ms var(--gc-ease);
  }

  [data-gc-check-box] svg {
    position: absolute;
    inset: 0;
    width: 18px;
    height: 18px;
    overflow: visible;
  }

  [data-gc-check-box] path {
    fill: none;
    stroke: #fff;
    stroke-width: 2;
    stroke-linecap: square;
    stroke-linejoin: miter;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 80ms linear;
  }

  [data-gc-check-control][data-checked="true"] [data-gc-check-box] {
    box-shadow: inset 0 0 0 9px var(--gc-check);
    background: var(--gc-check);
  }

  /* The tick draws in just after the fill lands, like Material's own. */
  [data-gc-check-control][data-checked="true"] [data-gc-check-box] path {
    stroke-dashoffset: 0;
    transition: stroke-dashoffset 180ms cubic-bezier(0.2, 0, 0, 1) 60ms;
  }

  [data-gc-check-control]:has(input:focus-visible) {
    outline: 2px solid var(--gc-primary);
    outline-offset: -2px;
  }

  [data-gc-check]:active:not([data-disabled="true"]) [data-gc-check-control]::before {
    opacity: 0.12;
  }

  [data-gc-check]:active:not([data-disabled="true"]) [data-gc-check-box] {
    scale: 0.9;
    transition-duration: 90ms, 90ms, 120ms;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-gc-check]:hover:not([data-disabled="true"]) [data-gc-check-control]::before {
      opacity: 0.08;
    }

    [data-gc-check]:hover:active:not([data-disabled="true"]) [data-gc-check-control]::before {
      opacity: 0.12;
    }
  }

  [data-gc-check-label] {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Week card -------------------------------------------------------------- */

  [data-gc-card] {
    position: absolute;
    top: ${HEADER}px;
    left: ${SIDEBAR}px;
    right: ${RAIL + 16}px;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 24px;
    background: #fff;
  }

  [data-gc-week-head] {
    position: relative;
    flex: none;
    display: grid;
    grid-template-columns: 64px repeat(7, 1fr) 16px;
    height: 84px;
    box-shadow: 0 1px 0 var(--gc-line);
    z-index: 2;
  }

  [data-gc-week-head]::after {
    content: "";
    grid-column: 9;
  }

  [data-gc-tz] {
    align-self: end;
    padding: 0 0 4px 12px;
    color: var(--gc-text-2);
    font-size: 10px;
    line-height: 16px;
    white-space: nowrap;
  }

  [data-gc-day-head] {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 9px;
  }

  [data-gc-day-head]::before {
    content: "";
    position: absolute;
    left: 0;
    top: 62px;
    bottom: 0;
    border-left: 1px solid var(--gc-line);
  }

  [data-gc-dow] {
    color: var(--gc-text-2);
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.8px;
  }

  [data-gc-day-number] {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    margin-top: 1px;
    border-radius: 50%;
    color: var(--gc-text-2);
    font-size: 26px;
    line-height: 1;
    font-optical-sizing: auto;
  }

  [data-gc-day-head][data-today="true"] [data-gc-dow] {
    color: var(--gc-primary);
  }

  [data-gc-day-head][data-today="true"] [data-gc-day-number] {
    background: var(--gc-primary);
    color: #fff;
    font-size: 25px;
  }

  [data-gc-grid-scroll] {
    position: relative;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    overscroll-behavior: contain;
  }

  [data-gc-grid-scroll]::-webkit-scrollbar {
    display: none;
  }

  [data-gc-grid] {
    position: relative;
    display: grid;
    grid-template-columns: 64px repeat(7, 1fr) 16px;
    background-image: repeating-linear-gradient(
      to bottom,
      var(--gc-line) 0 1px,
      transparent 1px ${HOUR}px
    );
    background-position: 56px 0;
    background-size: calc(100% - 56px - 16px) 100%;
    background-repeat: no-repeat;
  }

  [data-gc-hours] {
    position: relative;
  }

  [data-gc-hour] {
    position: absolute;
    right: 16px;
    margin-top: -8px;
    color: var(--gc-text-2);
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
    font-family: var(--gc-sans);
  }

  [data-gc-day] {
    position: relative;
    border-left: 1px solid var(--gc-line);
  }

  [data-gc-now] {
    position: absolute;
    z-index: 4;
    left: -1px;
    right: 0;
    height: 2px;
    margin-top: -1px;
    background: #ea4335;
    pointer-events: none;
  }

  [data-gc-now]::before {
    content: "";
    position: absolute;
    left: -6px;
    top: -5px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ea4335;
  }

  /* Event chips ------------------------------------------------------------ */

  [data-gc-event] {
    --gc-t: calc(1ms * var(--gc-slow, 1));
    position: absolute;
    z-index: 1;
    display: block;
    overflow: hidden;
    border-radius: 6px;
    color: #fff;
    text-align: left;
    transition:
      left calc(320 * var(--gc-t)) var(--gc-ease),
      width calc(320 * var(--gc-t)) var(--gc-ease),
      opacity calc(300 * var(--gc-t)) var(--gc-ease),
      box-shadow 200ms ease,
      scale 240ms var(--gc-ease),
      visibility 0s linear 0s;
  }

  [data-gc-event][data-split="true"] {
    box-shadow: 0 0 0 1px #fff;
  }

  [data-gc-event][data-selected="true"] {
    z-index: 3;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.3),
      0 4px 8px 3px rgba(0, 0, 0, 0.15);
  }

  [data-gc-event]:focus-visible {
    z-index: 3;
  }

  [data-gc-event-fill] {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--gc-event);
    transition: opacity calc(240 * var(--gc-t)) var(--gc-ease);
  }

  [data-gc-event-fill]::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: #000;
    opacity: 0;
    transition: opacity 150ms ease;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-gc-event]:hover:not(:disabled) [data-gc-event-fill]::after {
      opacity: 0.08;
    }
  }

  [data-gc-event]:active:not(:disabled) [data-gc-event-fill]::after {
    opacity: 0.12;
  }

  [data-gc-event-dash] {
    position: absolute;
    inset: 0;
    border: 1.5px dashed color-mix(in srgb, var(--gc-event) 60%, transparent);
    border-radius: inherit;
    background: color-mix(in srgb, var(--gc-event) 6%, transparent);
    opacity: 0;
    transition: opacity calc(240 * var(--gc-t)) var(--gc-ease);
  }

  /* Buttons centre their content vertically; Calendar pins it to the top. */
  [data-gc-event-body] {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: hidden;
    padding: 3px 7px;
    font-size: 12px;
    line-height: 15px;
    transition: opacity calc(200 * var(--gc-t)) var(--gc-ease);
  }

  [data-gc-event-title] {
    font-weight: 500;
  }

  [data-gc-event-body] > span {
    overflow: hidden;
  }

  /* In a split column, lines truncate cleanly instead of clipping mid-word. */
  [data-gc-event][data-split="true"] [data-gc-event-body] > span {
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  [data-gc-event-line] {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  [data-gc-event-free] {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    padding: 0 8px;
    color: var(--gc-event);
    font-size: 12px;
    font-weight: 500;
    opacity: 0;
    transition: opacity calc(240 * var(--gc-t)) var(--gc-ease);
  }

  [data-gc-event][data-dissolve="free"] [data-gc-event-fill],
  [data-gc-event][data-dissolve="gone"] [data-gc-event-fill],
  [data-gc-event][data-dissolve="free"] [data-gc-event-body],
  [data-gc-event][data-dissolve="gone"] [data-gc-event-body] {
    opacity: 0;
  }

  [data-gc-event][data-dissolve="free"] [data-gc-event-dash],
  [data-gc-event][data-dissolve="gone"] [data-gc-event-dash],
  [data-gc-event][data-dissolve="free"] [data-gc-event-free],
  [data-gc-event][data-dissolve="gone"] [data-gc-event-free] {
    opacity: 1;
  }

  [data-gc-event][data-dissolve="free"],
  [data-gc-event][data-dissolve="gone"] {
    cursor: default;
    box-shadow: none;
  }

  [data-gc-event][data-dissolve="gone"] {
    opacity: 0;
    visibility: hidden;
    transition:
      left calc(320 * var(--gc-t)) var(--gc-ease),
      width calc(320 * var(--gc-t)) var(--gc-ease),
      opacity calc(300 * var(--gc-t)) var(--gc-ease),
      visibility 0s linear calc(300 * var(--gc-t));
  }

  /* Side panel rail -------------------------------------------------------- */

  [data-gc-rail] {
    position: absolute;
    top: ${HEADER}px;
    right: 0;
    bottom: 0;
    width: ${RAIL}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0 14px;
  }

  [data-gc-rail-icons] {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  [data-gc-rail-button] {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--gc-text-2);
  }

  [data-gc-rail-divider] {
    width: 20px;
    height: 1px;
    margin: 6px 0;
    background: #c4c7c5;
  }

  /* Scrim + surface -------------------------------------------------------- */

  [data-gc-scrim] {
    position: absolute;
    z-index: 20;
    inset: 0;
    background: #000;
    pointer-events: none;
  }

  [data-gc-surface-root] {
    position: absolute;
    z-index: 30;
    inset: 0;
    pointer-events: none;
  }

  [data-gc-surface] {
    position: absolute;
    overflow: hidden;
    border-radius: 28px;
    pointer-events: auto;
    box-shadow:
      0 3px 4px rgba(0, 0, 0, 0.14),
      0 3px 3px -2px rgba(0, 0, 0, 0.12),
      0 1px 8px rgba(0, 0, 0, 0.2);
    transition: box-shadow 420ms var(--gc-ease);
  }

  [data-gc-surface]:focus-visible {
    outline: none;
  }

  [data-gc-surface][data-shape="dialog"] {
    box-shadow:
      0 4px 8px 3px rgba(0, 0, 0, 0.15),
      0 1px 3px rgba(0, 0, 0, 0.3);
  }

  [data-gc-surface][data-phase="dialog"] [data-gc-dialog-slot] {
    position: relative;
  }

  [data-gc-pop] {
    position: absolute;
    top: 0;
    left: 0;
    width: ${POPOVER_W}px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  [data-gc-surface]:not([data-phase="popover"]) [data-gc-pop] {
    pointer-events: none;
  }

  [data-gc-pop-inner] {
    padding: 8px 0 20px;
  }

  [data-gc-pop-toolbar] {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0 8px;
  }

  [data-gc-pop-toolbar] [data-gc-icon-button] {
    color: var(--gc-text-2);
  }

  [data-gc-pop-toolbar] [data-gc-icon-button="32"] {
    margin: 0 4px;
  }

  [data-gc-row] {
    display: grid;
    grid-template-columns: 40px 1fr auto;
    column-gap: 12px;
    align-items: start;
    padding: 0 12px 0 16px;
    margin-top: 12px;
  }

  [data-gc-row-icon] {
    height: 20px;
    display: grid;
    place-items: center;
    color: var(--gc-text-2);
  }

  [data-gc-row-main] {
    min-width: 0;
  }

  [data-gc-row-actions] {
    display: flex;
    gap: 4px;
    margin-top: -6px;
  }

  [data-gc-row-actions] [data-gc-icon-button] {
    color: var(--gc-text-2);
  }

  [data-gc-row][data-kind="title"] {
    margin-top: 2px;
  }

  [data-gc-row][data-kind="title"] [data-gc-row-icon] {
    height: 28px;
  }

  [data-gc-swatch] {
    width: 14px;
    height: 14px;
    border-radius: 4px;
  }

  [data-gc-pop-title] {
    color: var(--gc-text);
    font-size: 22px;
    line-height: 28px;
    font-weight: 400;
  }

  [data-gc-pop-meta],
  [data-gc-pop-text] {
    color: var(--gc-text);
    font-size: 14px;
    line-height: 20px;
  }

  [data-gc-pop-small] {
    color: var(--gc-text-2);
    font-size: 12px;
    line-height: 18px;
  }

  [data-gc-dot] {
    padding: 0 6px;
  }

  [data-gc-nudge] {
    color: var(--gc-text-2);
  }

  [data-gc-row][data-kind="meet"] {
    margin-top: 20px;
  }

  [data-gc-row][data-kind="meet"] [data-gc-row-icon] {
    height: 40px;
  }

  [data-gc-meet] {
    display: inline-flex;
    align-items: center;
    height: 40px;
    padding: 0 24px;
    border-radius: 20px;
    background: var(--gc-primary);
    color: #fff;
    font-family: var(--gc-flex);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    margin-bottom: 4px;
  }

  [data-gc-row][data-kind="meet"] [data-gc-row-actions] {
    margin-top: 4px;
  }

  [data-gc-row][data-kind="guests"] {
    margin-top: 16px;
  }

  [data-gc-row][data-kind="guests"] [data-gc-row-actions] {
    margin-top: 2px;
  }

  [data-gc-row][data-kind="convert"] {
    margin-top: 10px;
  }

  [data-gc-tonal] {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 20px 0 16px;
    border-radius: 20px;
    background: #c2e7ff;
    color: #001d35;
    font-family: var(--gc-flex);
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
  }

  [data-gc-guests] {
    padding: 8px 12px 0 68px;
  }

  [data-gc-guest] {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 32px;
  }

  [data-gc-guest]:first-child {
    min-height: 42px;
  }

  [data-gc-guest-avatar] {
    position: relative;
    width: 24px;
    height: 24px;
    flex: none;
  }

  [data-gc-avatar] {
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-family: var(--gc-sans);
    font-weight: 500;
    line-height: 1;
    user-select: none;
  }

  [data-gc-avatar="24"] {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  [data-gc-rsvp-badge] {
    position: absolute;
    right: -6px;
    bottom: -4px;
    width: 14px;
    height: 14px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #c4eed0;
    color: #0f5223;
    box-shadow: 0 0 0 2px ${POPOVER_BG};
  }

  [data-gc-guest-text] {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  [data-gc-guest-name] {
    font-size: 14px;
    line-height: 20px;
    color: var(--gc-text);
  }

  [data-gc-guest-role] {
    font-size: 12px;
    line-height: 16px;
    color: var(--gc-text-2);
  }

  [data-gc-description] p {
    font-size: 14px;
    line-height: 20px;
    color: var(--gc-text);
  }

  [data-gc-row][data-kind="text"] {
    margin-top: 14px;
  }

  [data-gc-rsvp] {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 18px 16px 0 24px;
    padding-top: 14px;
    border-top: 1px solid #c4c7c5;
  }

  [data-gc-rsvp-label] {
    margin-right: auto;
    font-size: 14px;
    font-weight: 500;
  }

  [data-gc-rsvp-option] {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 16px;
    border: 1px solid #747775;
    border-radius: 16px;
    font-family: var(--gc-flex);
    font-weight: 500;
    color: var(--gc-text-2);
  }

  [data-gc-rsvp-option][aria-pressed="true"] {
    padding-left: 10px;
    border-color: transparent;
    background: #c2e7ff;
    color: #001d35;
  }

  /* Email guests dialog ---------------------------------------------------- */

  [data-gc-dialog-slot] {
    position: absolute;
    top: 0;
    left: 0;
    width: ${DIALOG_W}px;
  }

  [data-gc-dialog-slot][data-visible="false"] {
    visibility: hidden;
  }

  [data-gc-dialog] {
    display: flex;
    flex-direction: column;
    width: ${DIALOG_W}px;
  }

  [data-gc-plain] {
    position: absolute;
    z-index: 40;
    top: 50%;
    translate: 0 -50%;
    overflow: hidden;
    border-radius: 28px;
    background: ${DIALOG_BG};
    box-shadow:
      0 4px 8px 3px rgba(0, 0, 0, 0.15),
      0 1px 3px rgba(0, 0, 0, 0.3);
  }

  [data-gc-dialog-head] {
    flex: none;
    padding: 24px 24px 6px;
  }

  [data-gc-dialog-title] {
    font-family: var(--gc-flex);
    font-size: 24px;
    line-height: 32px;
    font-weight: 400;
    color: var(--gc-text);
  }

  [data-gc-dialog-checks] {
    display: flex;
    flex-direction: column;
    margin: 10px 0 0 -13px;
  }

  [data-gc-dialog-checks] [data-gc-check] {
    height: 32px;
    gap: 12px;
  }

  [data-gc-dialog-divider] {
    flex: none;
    height: 1px;
    background: #c4c7c5;
  }

  [data-gc-dialog-body] {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 8px 24px 0;
    scrollbar-width: thin;
  }

  [data-gc-recipients],
  [data-gc-field] {
    position: relative;
    border-radius: 4px;
  }

  [data-gc-field-fill] {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: #dde3ea;
    pointer-events: none;
  }

  [data-gc-recipients] {
    padding: 8px 8px 4px;
  }

  [data-gc-recipients][data-resizing="true"] {
    overflow: clip;
  }

  [data-gc-chips] {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  [data-gc-chip] {
    display: inline-flex;
    transform-origin: 50% 50%;
  }

  [data-gc-chip-inner] {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex: none;
    gap: 6px;
    height: 28px;
    padding: 0 4px 0 2px;
    border-radius: 14px;
    white-space: nowrap;
  }

  [data-gc-chip-fill] {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: #c8ced5;
  }

  [data-gc-chip-inner] > [data-gc-avatar] {
    position: relative;
  }

  [data-gc-chip-text] {
    position: relative;
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    color: var(--gc-text-2);
  }

  [data-gc-chip-remove] {
    position: relative;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--gc-text-2);
  }

  [data-gc-chips-copy],
  [data-gc-chips-copy] > span {
    display: inline-flex;
  }

  [data-gc-add-wrap] {
    position: relative;
    display: block;
  }

  [data-gc-add-guest] {
    position: relative;
    display: block;
    width: 100%;
    height: 32px;
    padding: 0 8px;
    border: 0;
    background: none;
    font-size: 14px;
    color: var(--gc-text);
  }

  [data-gc-add-guest]::placeholder {
    color: var(--gc-text-2);
  }

  /* Filled-field focus: Material's active indicator, not a ring. */
  [data-gc-recipients]::after,
  [data-gc-field]::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    border-radius: 0 0 4px 4px;
    background: var(--gc-primary);
    opacity: 0;
    scale: 1 0.5;
    transform-origin: 50% 100%;
    pointer-events: none;
    transition:
      opacity 150ms ease,
      scale 200ms var(--gc-ease);
  }

  [data-gc-recipients]:focus-within::after,
  [data-gc-field]:focus-within::after {
    opacity: 1;
    scale: 1;
  }

  [data-gc-field] {
    margin-top: 8px;
  }

  [data-gc-field][data-kind="message"] {
    margin-top: 16px;
  }

  [data-gc-field-label] {
    position: absolute;
    top: 8px;
    left: 16px;
    color: var(--gc-text-2);
    font-size: 12px;
    line-height: 16px;
    pointer-events: none;
    transform-origin: 0 0;
    transition:
      translate 160ms var(--gc-ease),
      scale 160ms var(--gc-ease);
  }

  [data-gc-field][data-kind="message"][data-filled="false"]:not(:focus-within) [data-gc-field-label] {
    translate: 0 10px;
    scale: 1.1667;
  }

  [data-gc-subject] {
    position: relative;
    display: grid;
  }

  [data-gc-subject-input] {
    grid-area: 1 / 1;
    display: block;
    width: 100%;
    height: 52px;
    margin: 0;
    padding: 24px 16px 8px;
    border: 0;
    background: none;
    font-size: 14px;
    line-height: 20px;
    font-weight: 400;
    color: var(--gc-text);
    white-space: pre;
    overflow: hidden;
  }

  [data-gc-message] {
    position: relative;
    display: grid;
  }

  [data-gc-message-mirror],
  [data-gc-message-input] {
    grid-area: 1 / 1;
    display: block;
    width: 100%;
    min-height: 132px;
    margin: 0;
    padding: 26px 16px 10px;
    border: 0;
    background: none;
    font-size: 14px;
    line-height: 24px;
    font-weight: 400;
    color: var(--gc-text);
    white-space: pre-wrap;
    overflow-wrap: break-word;
    word-break: normal;
    tab-size: 4;
  }

  [data-gc-message-mirror] {
    position: relative;
    visibility: hidden;
    pointer-events: none;
  }

  [data-gc-message-input] {
    resize: none;
    overflow: hidden;
  }

  [data-gc-counter] {
    height: 22px;
    padding: 4px 16px 2px 0;
    text-align: right;
    color: var(--gc-text-2);
    font-size: 12px;
    line-height: 16px;
    font-variant-numeric: tabular-nums;
  }

  [data-gc-dialog-foot] {
    flex: none;
    padding: 2px 24px 20px;
    box-shadow: 0 -1px 0 transparent;
    transition: box-shadow 160ms ease;
  }

  [data-gc-dialog-foot][data-overflowing="true"] {
    box-shadow: 0 -1px 0 #c4c7c5;
  }

  [data-gc-switch-row] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 44px;
    padding: 2px 0 2px 14px;
    margin-bottom: 4px;
  }

  [data-gc-switch-label] {
    font-size: 14px;
    line-height: 20px;
    color: var(--gc-text);
  }

  [data-gc-dialog-actions] {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  [data-gc-dialog-note] {
    margin-right: auto;
    padding-left: 14px;
    color: var(--gc-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  [data-gc-text-button] {
    height: 40px;
    padding: 0 12px;
    border-radius: 20px;
    color: var(--gc-primary);
    font-family: var(--gc-flex);
    font-size: 14px;
    font-weight: 500;
  }

  [data-gc-send] {
    position: relative;
    display: grid;
    place-items: center;
    height: 40px;
    min-width: 80px;
    padding: 0 24px;
    border-radius: 20px;
    background: var(--gc-primary);
    color: #fff;
    font-family: var(--gc-flex);
    font-size: 14px;
    font-weight: 500;
  }

  [data-gc-send] > span {
    grid-area: 1 / 1;
    transition: opacity 160ms ease;
  }

  [data-gc-send]:disabled:not([data-sending="true"]) {
    background: rgba(31, 31, 31, 0.12);
    color: rgba(31, 31, 31, 0.38);
  }

  [data-gc-send][data-sending="true"] {
    background: var(--gc-primary);
  }

  [data-gc-send-spinner] {
    display: grid;
    opacity: 0;
  }

  [data-gc-send][data-sending="true"] [data-gc-send-label] {
    opacity: 0;
  }

  [data-gc-send][data-sending="true"] [data-gc-send-spinner] {
    opacity: 1;
  }

  [data-gc-spinner] {
    width: 18px;
    height: 18px;
    animation: gc-spin 900ms linear infinite;
  }

  [data-gc-spinner] circle {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-dasharray: 34 60;
  }

  @keyframes gc-spin {
    to {
      rotate: 360deg;
    }
  }

  /* M3 switch -------------------------------------------------------------- */

  [data-gc-switch] {
    position: relative;
    width: 52px;
    height: 32px;
    flex: none;
    border-radius: 16px;
  }

  [data-gc-switch-track] {
    position: absolute;
    inset: 0;
    border: 2px solid #747775;
    border-radius: inherit;
    background: #dde3ea;
    transition:
      background-color 200ms ease,
      border-color 200ms ease;
  }

  [data-gc-switch][data-on="true"] [data-gc-switch-track] {
    border-color: var(--gc-primary);
    background: var(--gc-primary);
  }

  [data-gc-switch-handle] {
    position: absolute;
    top: 50%;
    left: 16px;
    width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #747775;
    translate: -50% -50%;
    transition:
      left 300ms var(--gc-ease),
      width 200ms var(--gc-ease),
      height 200ms var(--gc-ease),
      background-color 200ms ease;
  }

  [data-gc-switch-handle]::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0;
    translate: -50% -50%;
    transition: opacity 150ms ease;
    color: var(--gc-text);
  }

  [data-gc-switch][data-on="true"] [data-gc-switch-handle] {
    left: 36px;
    width: 24px;
    height: 24px;
    background: #fff;
  }

  [data-gc-switch][data-on="true"] [data-gc-switch-handle]::before {
    color: var(--gc-primary);
  }

  [data-gc-switch-glyph] {
    position: relative;
    display: grid;
    color: var(--gc-primary);
    opacity: 0;
    scale: 0.5;
    transition:
      opacity 160ms ease,
      scale 240ms var(--gc-ease);
  }

  [data-gc-switch][data-on="true"] [data-gc-switch-glyph] {
    opacity: 1;
    scale: 1;
  }

  [data-gc-switch]:active:not(:disabled) [data-gc-switch-handle] {
    width: 28px;
    height: 28px;
  }

  [data-gc-switch]:active:not(:disabled) [data-gc-switch-handle]::before {
    opacity: 0.12;
  }

  @media (hover: hover) and (pointer: fine) {
    [data-gc-switch]:hover:not(:disabled) [data-gc-switch-handle]::before {
      opacity: 0.08;
    }

    [data-gc-switch]:hover:active:not(:disabled) [data-gc-switch-handle]::before {
      opacity: 0.12;
    }
  }

  /* Snackbar --------------------------------------------------------------- */

  [data-gc-snack-region] {
    position: absolute;
    z-index: 50;
    left: 24px;
    bottom: 36px;
    pointer-events: none;
  }

  [data-gc-snack] {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    min-width: 288px;
    padding: 6px 8px 6px 16px;
    border-radius: 4px;
    background: #303030;
    color: #f2f2f2;
    pointer-events: auto;
    box-shadow:
      0 4px 8px 3px rgba(0, 0, 0, 0.15),
      0 1px 3px rgba(0, 0, 0, 0.3);
  }

  [data-gc-snack-text] {
    flex: 1;
    padding-right: 8px;
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
  }

  [data-gc-snack-count] {
    display: inline-grid;
    justify-items: start;
    font-variant-numeric: tabular-nums;
  }

  [data-gc-snack-sizer],
  [data-gc-snack-live] {
    grid-area: 1 / 1;
  }

  [data-gc-snack-sizer] {
    visibility: hidden;
  }

  [data-gc-snack-action] {
    height: 36px;
    padding: 0 12px;
    border-radius: 18px;
    color: #a8c7fa;
    font-family: var(--gc-flex);
    font-size: 14px;
    font-weight: 500;
  }

  [data-gc-snack-action]:focus-visible {
    outline-color: #a8c7fa;
  }

  /* Sidebar footer: the legal links, and a quiet way to start over. */

  [data-gc-side-foot] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding: 0 12px 10px 28px;
  }

  [data-gc-reset] {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 10px 0 8px;
    border-radius: 14px;
    color: var(--gc-text-2);
    font-size: 12px;
    font-weight: 500;
  }

  /* On a phone the app is a scaled-down desktop: give it an edge. */
  [data-gc-stage][data-scaled="true"] [data-gc-app] {
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.06),
      0 24px 64px -24px rgba(0, 0, 0, 0.28);
  }

  @media (prefers-reduced-motion: reduce) {
    [data-gc-app] *,
    [data-gc-app] *::before,
    [data-gc-app] *::after {
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }

    [data-gc-spinner] {
      animation-duration: 1800ms;
    }
  }
`;
