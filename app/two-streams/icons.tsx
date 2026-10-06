// Glyphs for the Two Streams mobile prototype. Transport paths follow the
// Best Part player so both prototypes share one icon language.

type IconProps = { className?: string };

export const SHUFFLE_PATH =
  "M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.978 1.167-1.796-2.14A2.25 2.25 0 00.39 3.5z";
export const SHUFFLE_PATH_2 =
  "M7.5 10.723l.98-1.167.957 1.14a2.25 2.25 0 001.724.804h1.947l-1.017-1.018a.75.75 0 111.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 11-1.06-1.06L13.109 13H11.16a3.75 3.75 0 01-2.873-1.34l-.787-.938z";
export const PREV_PATH =
  "M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 9.149V14.3a.7.7 0 01-.7.7H1.7a.7.7 0 01-.7-.7V1.7a.7.7 0 01.7-.7h1.6z";
export const NEXT_PATH =
  "M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107a.7.7 0 00-1.05.606v12.575a.7.7 0 001.05.607L12 9.149V14.3a.7.7 0 00.7.7h1.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-1.6z";
export const REPEAT_PATH =
  "M0 4.75A3.75 3.75 0 013.75 1h8.5A3.75 3.75 0 0116 4.75v5a3.75 3.75 0 01-3.75 3.75H9.81l1.018 1.018a.75.75 0 11-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 111.06 1.06L9.811 12h2.439a2.25 2.25 0 002.25-2.25v-5a2.25 2.25 0 00-2.25-2.25h-8.5A2.25 2.25 0 001.5 4.75v5A2.25 2.25 0 003.75 12H5v1.5H3.75A3.75 3.75 0 010 9.75v-5z";

export function ShuffleIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={SHUFFLE_PATH} fill="currentColor" />
      <path d={SHUFFLE_PATH_2} fill="currentColor" />
    </svg>
  );
}

export function PrevIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={PREV_PATH} fill="currentColor" />
    </svg>
  );
}

export function NextIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={NEXT_PATH} fill="currentColor" />
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={REPEAT_PATH} fill="currentColor" />
    </svg>
  );
}

export function SkipIcon({ direction }: { direction: "back" | "forward" }) {
  const back = direction === "back";

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={
          back
            ? "M12 4.25A8.75 8.75 0 1 1 3.78 10.01"
            : "M12 4.25A8.75 8.75 0 1 0 20.22 10.01"
        }
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d={back ? "M14.3 1.75L11.6 4.25l2.7 2.5" : "M9.7 1.75l2.7 2.5-2.7 2.5"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="12"
        y="13.4"
        fill="currentColor"
        fontSize="7.4"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="-0.2"
      >
        15
      </text>
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.6 9.9A6 6 0 016.1 2.4a6 6 0 107.5 7.5z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.5 9l6.5 6.5L18.5 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.9" fill="currentColor" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
      <circle cx="19" cy="12" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function DevicesIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 2.75C6 1.784 6.784 1 7.75 1h6.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15h-6.5A1.75 1.75 0 016 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h6.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25h-6.5zm-6 0a.25.25 0 00-.25.25v6.5c0 .138.112.25.25.25H4V11H1.75A1.75 1.75 0 010 9.25v-6.5C0 1.784.784 1 1.75 1H4v1.5H1.75zM4 15H2v-1.5h2V15z"
        fill="currentColor"
      />
      <path
        d="M13 10a2 2 0 11-4 0 2 2 0 014 0zm-1-5a1 1 0 11-2 0 1 1 0 012 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5v11.25M7.75 7.5L12 3.25l4.25 4.25M6 11.5H5.25a1.5 1.5 0 00-1.5 1.5v6a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-6a1.5 1.5 0 00-1.5-1.5H18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QueueIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M15 15H1v-1.5h14V15zm0-4.5H1V9h14v1.5zm-14-7A2.5 2.5 0 013.5 1h9a2.5 2.5 0 010 5h-9A2.5 2.5 0 011 3.5zm2.5-1a1 1 0 000 2h9a1 1 0 100-2h-9z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M13.5 1.515a3 3 0 00-3 0L3 5.845a2 2 0 00-1 1.732V21a1 1 0 001 1h6a1 1 0 001-1v-6h4v6a1 1 0 001 1h6a1 1 0 001-1V7.577a2 2 0 00-1-1.732l-7.5-4.33z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="7.25" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M16 16l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 3v18M9.5 3v18M15 3.6l5.3 17"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CreateIcon() {
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

export function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.3l-1.2-1.08C6.3 15.2 3.5 12.7 3.5 9.6 3.5 7.1 5.45 5.2 7.9 5.2c1.4 0 2.95.66 4.1 2.02C13.15 5.86 14.7 5.2 16.1 5.2c2.45 0 4.4 1.9 4.4 4.4 0 3.1-2.8 5.6-7.3 9.62L12 20.3z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 3.5h12a.5.5 0 01.5.5v16.4a.4.4 0 01-.64.32L12 16.3l-5.86 4.42a.4.4 0 01-.64-.32V4a.5.5 0 01.5-.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PlayGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M8 5.6c0-.78.85-1.26 1.52-.86l9.3 5.55a1.98 1.98 0 010 3.42l-9.3 5.55c-.67.4-1.52-.08-1.52-.86V5.6z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PauseGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="6.5" y="5" width="4" height="14" rx="1.1" fill="currentColor" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.1" fill="currentColor" />
    </svg>
  );
}
