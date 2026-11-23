// Icons drawn for this prototype in the iOS WhatsApp idiom: 24px grid,
// rounded caps, ~1.7px strokes. None are copied from WhatsApp's or Apple's
// assets. The chat-bar and header icons are copied from app/voice-note.

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.75 4.75L7.5 12l7.25 7.25"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Drawn in pt to the ink box of WhatsApp's header icon: a 19.3 x 17.8 body, a lens
 * that widens from 5 to ~14 tall, 1.4 strokes. Rendered at 26.4 x 17.8. */
export function VideoIcon() {
  return (
    <svg viewBox="0 0 26.4 17.8" fill="none" aria-hidden="true">
      <rect x="0.7" y="0.7" width="17.9" height="16.4" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M18.6 6.4l5.3-3.4a1.2 1.2 0 0 1 1.8 1v9.8a1.2 1.2 0 0 1-1.8 1l-5.3-3.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The viewBox hugs the path plus its stroke, so at 20.3 x 20.3 the ink matches
 * WhatsApp's header icon and the stroke lands at 1.5. */
export function PhoneIcon() {
  return (
    <svg viewBox="2.505 2.143 19.38 19.38" fill="none" aria-hidden="true">
      <path
        d="M8.2 3.6l1.55 3.58a1.3 1.3 0 01-.33 1.5L7.9 10a11.2 11.2 0 006.1 6.1l1.32-1.52a1.3 1.3 0 011.5-.33l3.58 1.55a1.3 1.3 0 01.76 1.34l-.2 1.62a2.3 2.3 0 01-2.28 2.02C10.12 20.78 3.22 13.88 3.22 5.35A2.3 2.3 0 015.24 3.07l1.62-.2a1.3 1.3 0 011.34.73z"
        stroke="currentColor"
        strokeWidth="1.43"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5v15M4.5 12h15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Drawn in pt to the ink box of WhatsApp's composer camera: a 23 x 18 body with
 * tight corners, a rounded hump, a large lens and a flash dot, 1.4 strokes. */
export function CameraIcon() {
  return (
    <svg viewBox="0 0 23 18" fill="none" aria-hidden="true">
      <path
        d="M.7 6a2.6 2.6 0 0 1 2.6-2.6h4C8.3 3.4 8.2.7 9.4.7h4.2c1.2 0 1.1 2.7 2.1 2.7h4a2.6 2.6 0 0 1 2.6 2.6v8.7a2.6 2.6 0 0 1-2.6 2.6H3.3a2.6 2.6 0 0 1-2.6-2.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="11.5" cy="10.1" r="4.4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18.2" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

/** WhatsApp's mic, in pt: a solid 6.3 x 11 capsule on an 11.7-wide stand and a
 * short stem. Rendered at 11.7 x 17.7, centred in the 32pt button. */
export function MicIcon() {
  return (
    <svg viewBox="0 0 11.7 17.7" fill="none" aria-hidden="true">
      <rect x="2.7" y="0" width="6.3" height="11" rx="3.15" fill="currentColor" />
      <path
        d="M.68 8a5.17 5.17 0 0 0 10.34 0M5.85 13.4v3.55"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** WhatsApp's sticker, in pt: an 18 x 17.5 squircle (drawn at 17, stretched 3%) whose lower-right corner peels
 * back, the flap's top a little over halfway down and its inner edge bowed. */
export function StickerIcon() {
  return (
    <svg viewBox="0 0 18 17" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path
        d="M17.35 9.7V5.65a5 5 0 0 0-5-5h-6.7a5 5 0 0 0-5 5v5.7a5 5 0 0 0 5 5h4.65Q15.2 14.6 17.35 9.7ZM17.2 9.75l-4.6.15c-1.4.05-2.4 1.3-2.5 3.1l.2 3.35"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** WhatsApp's send: a paper plane in the green circle. */
export function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.6 4.2c-.5-.24-1.04.25-.86.77L6.1 11.3a1 1 0 00.92.66h6.08a.55.55 0 010 1.1H7.02a1 1 0 00-.92.66l-2.36 6.33c-.18.52.36 1.01.86.77l15.6-7.46a.75.75 0 000-1.36z"
        fill="currentColor"
      />
    </svg>
  );
}

/** One grey tick, sent. */
export function SentTick() {
  return (
    <svg viewBox="0 0 18 11" fill="none" aria-hidden="true">
      <path
        d="M4.3 6.1l2.9 2.85L14 1.6"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Two ticks: delivered (grey) or read (blue), by colour. */
export function ReadTicks() {
  return (
    <svg viewBox="0 0 18 11" fill="none" aria-hidden="true">
      <path
        d="M1.3 6.1l2.9 2.85L11 1.6M7.4 8.3l.7.65L14.9 1.6"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Long-press menu ---------------------------------------------------------- */

export function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.2 5.2L4 11.2l6.2 6v-3.8c4.6 0 7.6 1.2 9.8 4.6-.6-5.4-3.6-9.2-9.8-9.8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ForwardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13.8 5.2l6.2 6-6.2 6v-3.8c-4.6 0-7.6 1.2-9.8 4.6.6-5.4 3.6-9.2 9.8-9.8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="8.2"
        y="7.4"
        width="10.6"
        height="13.4"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M15.8 7.4V5.6a2.4 2.4 0 00-2.4-2.4H7.6a2.4 2.4 0 00-2.4 2.4v9a2.4 2.4 0 002.4 2.4h.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

/** A generic assistant mark: a ring of small rings, not Meta's logo. */
export function AskIcon() {
  const dots = Array.from({ length: 7 }, function dot(_, i) {
    const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
    return { cx: 12 + Math.cos(angle) * 7, cy: 12 + Math.sin(angle) * 7 };
  });

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {dots.map(function ring(dot, i) {
        return (
          <circle
            key={i}
            cx={dot.cx.toFixed(2)}
            cy={dot.cy.toFixed(2)}
            r="2.1"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        );
      })}
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.6 6.4h14.8M9.4 6.2V4.6a1 1 0 011-1h3.2a1 1 0 011 1v1.6M6.4 6.4l.9 12.4a2 2 0 002 1.8h5.4a2 2 0 002-1.8l.9-12.4M10.2 9.8v7.4M13.8 9.8v7.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.2" cy="12" r="1.15" fill="currentColor" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
      <circle cx="15.8" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function CloseCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.4 8.4l7.2 7.2M15.6 8.4l-7.2 7.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* Status bar (device mode) -------------------------------------------------- */

export function CellularIcon() {
  return (
    <svg viewBox="0 0 18 12" aria-hidden="true">
      <rect x="0" y="7.6" width="3" height="4.4" rx="0.9" fill="currentColor" />
      <rect x="5" y="5.2" width="3" height="6.8" rx="0.9" fill="currentColor" />
      <rect x="10" y="2.6" width="3" height="9.4" rx="0.9" fill="currentColor" />
      <rect x="15" y="0" width="3" height="12" rx="0.9" fill="currentColor" />
    </svg>
  );
}

export function WifiIcon() {
  return (
    <svg viewBox="0 0 16 12" aria-hidden="true">
      <path
        d="M8 2.3c2.3 0 4.4.9 6 2.4.17.16.43.16.6-.01l1.07-1.08a.42.42 0 000-.6A10.9 10.9 0 008 0 10.9 10.9 0 00.33 3.01a.42.42 0 000 .6L1.4 4.69c.17.17.43.17.6.01A8.6 8.6 0 018 2.3zm0 3.55c1.33 0 2.55.5 3.48 1.33.17.15.42.15.58-.01l1.07-1.08a.42.42 0 00-.01-.61A7.4 7.4 0 008 3.55c-1.97 0-3.77.76-5.12 2a.42.42 0 00-.01.62L3.94 7.25c.16.16.41.16.58.01A5.2 5.2 0 018 5.85zm2.04 2.6a.42.42 0 00-.02-.62A3.1 3.1 0 008 7.1c-.77 0-1.48.27-2.02.73a.42.42 0 00-.02.62l1.74 1.75c.16.16.43.16.6 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BatteryIcon() {
  return (
    <svg viewBox="0 0 27 13" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="22.6"
        height="12"
        rx="3.8"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.36"
      />
      <rect x="2" y="2" width="19.6" height="9" rx="2.5" fill="currentColor" />
      <path
        d="M24.6 4.4v4.2a2.3 2.3 0 000-4.2z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

/* Keyboard (device mode) ---------------------------------------------------- */

export function ShiftIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.6a.9.9 0 01.66.29l7.4 8.1a.8.8 0 01-.6 1.34h-3.86v5.67a1.4 1.4 0 01-1.4 1.4H9.8a1.4 1.4 0 01-1.4-1.4v-5.67H4.54a.8.8 0 01-.6-1.34l7.4-8.1A.9.9 0 0112 3.6z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={on ? 0 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DeleteKeyIcon() {
  return (
    <svg viewBox="0 0 28 22" fill="none" aria-hidden="true">
      <path
        d="M9.2 3.2h14.2a2.4 2.4 0 012.4 2.4v10.8a2.4 2.4 0 01-2.4 2.4H9.2a1.6 1.6 0 01-1.2-.55L2.5 11.8a1.2 1.2 0 010-1.6L8 3.75a1.6 1.6 0 011.2-.55z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12.6 7.6l6.8 6.8M19.4 7.6l-6.8 6.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.8 12h18.4M12 2.8c2.6 2.6 3.9 5.7 3.9 9.2s-1.3 6.6-3.9 9.2M12 2.8C9.4 5.4 8.1 8.5 8.1 12s1.3 6.6 3.9 9.2M4.6 6.6h14.8M4.6 17.4h14.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function DictationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="8.4"
        y="2.2"
        width="7.2"
        height="12.6"
        rx="3.6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5 11.4a7 7 0 0014 0M12 18.4v3.2M8.6 21.6h6.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmojiKeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.4" fill="currentColor" />
      <circle cx="9" cy="9.6" r="1.25" fill="var(--qr-key-fn, #abb0ba)" />
      <circle cx="15" cy="9.6" r="1.25" fill="var(--qr-key-fn, #abb0ba)" />
      <path
        d="M6.9 13.2h10.2a5.1 5.1 0 01-10.2 0z"
        fill="var(--qr-key-fn, #abb0ba)"
      />
    </svg>
  );
}
