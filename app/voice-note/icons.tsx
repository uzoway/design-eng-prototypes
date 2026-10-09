// Icons drawn for this prototype in the iOS WhatsApp idiom: 24px grid,
// rounded caps, ~1.7px strokes. None are copied from WhatsApp's assets.

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

export function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2.6"
        y="6"
        width="13.4"
        height="12"
        rx="3.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M16 10.4l4.05-2.55a.8.8 0 011.22.68v6.94a.8.8 0 01-1.22.68L16 13.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.2 3.6l1.55 3.58a1.3 1.3 0 01-.33 1.5L7.9 10a11.2 11.2 0 006.1 6.1l1.32-1.52a1.3 1.3 0 011.5-.33l3.58 1.55a1.3 1.3 0 01.76 1.34l-.2 1.62a2.3 2.3 0 01-2.28 2.02C10.12 20.78 3.22 13.88 3.22 5.35A2.3 2.3 0 015.24 3.07l1.62-.2a1.3 1.3 0 011.34.73z"
        stroke="currentColor"
        strokeWidth="1.7"
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

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.4 8.6a2.2 2.2 0 012.2-2.2h1.9l1.3-1.95a1.2 1.2 0 011-.53h4.4a1.2 1.2 0 011 .53l1.3 1.95h1.9a2.2 2.2 0 012.2 2.2v8.6a2.2 2.2 0 01-2.2 2.2H5.6a2.2 2.2 0 01-2.2-2.2V8.6z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.6" r="3.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="8.6"
        y="2.9"
        width="6.8"
        height="11.6"
        rx="3.4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5.4 11.2a6.6 6.6 0 0013.2 0M12 17.8v3.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StickerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.4 12.8V7.6a4 4 0 00-4-4H7.6a4 4 0 00-4 4v8.8a4 4 0 004 4h5.2m7.6-7.6l-7.6 7.6m7.6-7.6h-3.6a4 4 0 00-4 4v3.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Filled mic for the badge on the sender's avatar. */
export function MicBadgeGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.2a2.6 2.6 0 012.6 2.6v3.9a2.6 2.6 0 01-5.2 0V3.8A2.6 2.6 0 018 1.2z"
        fill="currentColor"
      />
      <path
        d="M3.9 7.3a4.1 4.1 0 008.2 0M8 11.5v2.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Double tick for a read message. */
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

export function LockIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2.4" y="5.2" width="7.2" height="5.4" rx="1.2" fill="currentColor" />
      <path
        d="M4 5.2V3.9a2 2 0 014 0v1.3"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
