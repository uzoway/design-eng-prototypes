/*
 * LinkedIn's nav icons, copied path for path from app/linkedin-nav/paths.ts
 * (its shipped Nov 2026 set), drawn static. The smaller icons (search,
 * clock, send, close and the rest) are drawn here in the same style: filled
 * shapes with 1.5 unit contours on a 16 or 24 unit grid. The iOS status bar
 * and keyboard glyphs come from app/quote-reply/icons.tsx.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, viewBox = "0 0 24 24", children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Nav (24)                                                                   */
/* -------------------------------------------------------------------------- */

const HOUSE_OUTLINE =
  "M15.5 13.5v6h1.15c.642 0 1.079 0 1.416-.028.329-.027.497-.075.615-.135.282-.144.512-.374.656-.656.06-.118.108-.286.135-.615.027-.337.028-.774.028-1.416V9.863L12 3.954l-7.5 5.91v6.786c0 .642 0 1.079.028 1.416.027.329.075.497.135.615.144.282.374.512.656.656.118.06.286.108.615.135.337.027.774.028 1.416.028H8.5v-6zm5.5 3.150c0 .618 0 1.126-.033 1.539-.035.421-.109.81-.294 1.173a3 3 0 0 1-1.31 1.31c-.365.186-.753.26-1.174.295-.413.034-.921.033-1.539.033H14v-6h-4v6H7.35c-.618 0-1.126 0-1.538-.033-.422-.035-.81-.109-1.174-.294a3 3 0 0 1-1.31-1.31c-.186-.365-.26-.753-.295-1.174C3 17.776 3 17.268 3 16.65V9.136l.286-.225L12 2.045l8.714 6.866.286.225z";
const PEOPLE_OUTLINE =
  "M8.25 2.5a4.5 4.5 0 0 1 2.69 8.107 6.27 6.27 0 0 1 3.093 3.273 4.5 4.5 0 0 1 1.163-.996 3.5 3.5 0 1 1 4.606 0A4.5 4.5 0 0 1 22 16.75V21H2v-4.75a6.250 6.25 0 0 1 3.559-5.643A4.5 4.5 0 0 1 8.25 2.5m0 9a4.75 4.75 0 0 0-4.75 4.75v3.250H13v-3.25a4.75 4.75 0 0 0-4.750-4.75m9.25 2.25a3 3 0 0 0-3 3v2.75h6v-2.75a3 3 0 0 0-3-3m0-5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4M8.25 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6";
const PEOPLE_FILL =
  "M8.25 11.75A6.25 6.25 0 0 1 14.5 18v3H2v-3a6.25 6.25 0 0 1 6.25-6.25m9.249 2a4.5 4.5 0 0 1 4.5 4.5V21h-6v-3c0-1.29-.317-2.504-.874-3.573a4.5 4.5 0 0 1 2.374-.677M17.5 6.5a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5M8.25 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8";
const BRIEFCASE_OUTLINE =
  "M13.75 2a3 3 0 0 1 3 3v.5h5.255v11.15c0 .618 0 1.126-.033 1.539-.035.421-.109.81-.294 1.173a3 3 0 0 1-1.31 1.31c-.365.186-.752.26-1.174.295-.412.034-.921.033-1.539.033H6.35c-.618 0-1.126 0-1.538-.033-.422-.035-.81-.109-1.174-.294a3 3 0 0 1-1.31-1.310c-.186-.365-.26-.753-.295-1.174C2 17.776 2 17.268 2 16.65V5.5h5.25V5a3 3 0 0 1 3-3zm6.755 10.595q-.34.197-.729.303c-.405.108-.877.102-1.526.102H5.75c-.65 0-1.12.006-1.526-.102a3 3 0 0 1-.724-.3v4.052c0 .642 0 1.079.028 1.416.027.329.075.497.135.615.144.282.374.512.656.656.118.06.286.108.615.135.337.027.774.028 1.416.028h11.305c.642 0 1.079 0 1.416-.028.329-.027.497-.075.614-.135.283-.144.513-.374.657-.656.06-.118.108-.286.135-.615.027-.337.028-.774.028-1.416zM3.5 9.25c0 .746.006.972.05 1.139a1.5 1.5 0 0 0 1.061 1.06c.167.045.393.051 1.139.051h12.5c.746 0 .972-.006 1.139-.05a1.5 1.5 0 0 0 1.06-1.061c.045-.167.051-.393.051-1.139h.005V7H3.5zm6.75-5.75A1.5 1.5 0 0 0 8.750 5v.5h6.5V5a1.5 1.5 0 0 0-1.5-1.5z";
const MESSAGE_BUBBLE =
  "M13.864 2a8.136 8.136 0 0 1 3.568 15.447L10.25 20.95V17.5h-.5a7.75 7.75 0 0 1 0-15.5zM9.75 3.5a6.25 6.25 0 1 0 0 12.5h2v2.549l5.023-2.450A6.635 6.635 0 0 0 13.864 3.5z";
const MESSAGE_DOTS =
  "M8 8.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2m4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2m4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2";
export const BELL_OUTLINE =
  "M12 2.5a6.75 6.75 0 0 1 6.75 6.75v2.365a4.4 4.4 0 0 0 1.29 3.114l.96.96V18h-5.259a3.75 3.75 0 0 1-7.482 0H3v-2.31l.96-.961a4.4 4.4 0 0 0 1.29-3.114V9.25A6.75 6.75 0 0 1 12 2.5M9.765 18a2.250 2.25 0 0 0 4.47 0zM12 4a5.25 5.25 0 0 0-5.250 5.25v2.365a5.9 5.9 0 0 1-1.729 4.174l-.521.522v.189h15v-.19l-.521-.52a5.9 5.9 0 0 1-1.729-4.175V9.25C17.25 6.350 14.9 4 12 4";
const POST_SQUARE =
  "M18 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM6 4.5A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 18 4.5z";
const POST_PLUS = "M12.75 8v3.25H16v1.5h-3.25V16h-1.5v-3.25H8v-1.5h3.25V8z";

export type NavTab = "home" | "network" | "jobs" | "messaging" | "notifications";

export function NavIcon({ tab, selected }: { tab: NavTab | "post"; selected?: boolean }) {
  return (
    <Svg data-pn-nav-icon="">
      {tab === "home" && <path fill="currentColor" d={HOUSE_OUTLINE} />}
      {tab === "network" &&
        (selected ? (
          <path fill="currentColor" d={PEOPLE_FILL} />
        ) : (
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={PEOPLE_OUTLINE} />
        ))}
      {tab === "jobs" && <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={BRIEFCASE_OUTLINE} />}
      {tab === "messaging" && (
        <>
          <path fill="currentColor" d={MESSAGE_DOTS} />
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={MESSAGE_BUBBLE} />
        </>
      )}
      {tab === "notifications" && <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={BELL_OUTLINE} />}
      {tab === "post" && (
        <>
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={POST_SQUARE} />
          <path fill="currentColor" d={POST_PLUS} />
        </>
      )}
    </Svg>
  );
}

/** For Business: LinkedIn's 3 × 3 app launcher. */
export function GridIcon() {
  return (
    <Svg>
      <path
        fill="currentColor"
        d="M3 3h4v4H3zm7 0h4v4h-4zm7 0h4v4h-4zM3 10h4v4H3zm7 0h4v4h-4zm7 0h4v4h-4zM3 17h4v4H3zm7 0h4v4h-4zm7 0h4v4h-4z"
      />
    </Svg>
  );
}

/** Advertise: a compass needle turning inside a broken ring. */
export function AdvertiseIcon() {
  return (
    <Svg>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5H20A8 8 0 1 0 12 20v1.5a9.5 9.5 0 0 1 0-19"
      />
      <path fill="currentColor" d="m21.5 2.5-3 9-2-4-4-2zM13.06 9.88l1.06 1.06-4.18 4.18-1.06-1.06z" />
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 6.5a5.5 5.5 0 0 1 5.4 4.43l-1.47.3A4 4 0 1 0 12 16v1.5a5.5 5.5 0 0 1 0-11"
      />
    </Svg>
  );
}

/** caret-down-fill-small (16). */
export function CaretIcon() {
  return (
    <Svg size={16} viewBox="0 0 16 16" data-pn-caret="">
      <path fill="currentColor" d="M8 11 3.5 6.5h9z" />
    </Svg>
  );
}

/** LinkedIn's "in" bug, in its own blue. */
export function LogoIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" focusable="false">
      <rect width="34" height="34" rx="4" fill="#0a66c2" />
      <path
        fill="#fff"
        d="M7.2 13.4h4.05V26.6H7.2zM9.23 6.9a2.34 2.34 0 1 1 0 4.69 2.34 2.34 0 0 1 0-4.69M13.8 13.4h3.88v1.8h.06c.54-1.02 1.86-2.1 3.83-2.1 4.1 0 4.86 2.7 4.86 6.2v7.3h-4.05v-6.47c0-1.54-.03-3.53-2.15-3.53-2.15 0-2.48 1.68-2.48 3.42v6.58H13.8z"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <Svg size={16} viewBox="0 0 16 16">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.75 1.5a5.25 5.25 0 0 1 4.19 8.41l3.59 3.59-1.06 1.06-3.59-3.59A5.25 5.25 0 1 1 6.75 1.5m0 1.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons and actions                                                        */
/* -------------------------------------------------------------------------- */

/** close-medium (24). */
export function CloseIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path
        fill="currentColor"
        d="M13.06 12 19 17.94 17.94 19 12 13.06 6.06 19 5 17.94 10.94 12 5 6.06 6.06 5 12 10.94 17.94 5 19 6.06z"
      />
    </Svg>
  );
}

/** Pending: clock-small (16). */
export function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size} viewBox="0 0 16 16">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1m0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11M8.75 4v3.62l2.47 1.85-.9 1.2-3.07-2.3V4z"
      />
    </Svg>
  );
}

/** Message: send-privately-small (16), a paper plane. */
export function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size} viewBox="0 0 16 16">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 1 9.6 15h-.02L7.06 8.94 1 6.42V6.4zm-6.88 7.4 1.44 3.47 3.12-8.08zm-.12-1.06 4.62-4.61-8.08 3.12z"
      />
    </Svg>
  );
}

/** Connect: person-add-small (16), after a withdraw. */
export function ConnectIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size} viewBox="0 0 16 16">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6m0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M6.5 8.5c2.9 0 5 1.7 5 4.5v1.5h-10V13c0-2.8 2.1-4.5 5-4.5m0 1.5c-2 0-3.4 1.04-3.5 3h7c-.1-1.96-1.5-3-3.5-3M13.25 4v1.75H15v1.5h-1.75V9h-1.5V7.25H10v-1.5h1.75V4z"
      />
    </Svg>
  );
}

export function MoreIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path fill="currentColor" d="M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-7 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0m14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0" />
    </Svg>
  );
}

export function BellIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={BELL_OUTLINE} />
    </Svg>
  );
}

/** The verification shield beside a name. */
export function VerifiedIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size} viewBox="0 0 16 16">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 .8 14 3v4.6c0 3.6-2.5 6.3-6 7.6C4.5 13.9 2 11.2 2 7.6V3zm0 1.6L3.5 4.04V7.6c0 2.74 1.82 4.9 4.5 6.04 2.68-1.14 4.5-3.3 4.5-6.04V4.04zm2.95 3.07 1.06 1.06L7.25 11.3 4.5 8.55l1.06-1.06 1.69 1.69z"
      />
    </Svg>
  );
}

export function BackIcon() {
  return (
    <Svg>
      <path fill="currentColor" d="M21 11.25H5.87l5.66-5.66-1.06-1.06L3 12l7.47 7.47 1.06-1.06-5.66-5.66H21z" />
    </Svg>
  );
}

/** The Invitation Manager's settings cog: eight teeth and a hub, in 1.5 contours. */
export function GearIcon() {
  return (
    <Svg>
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M10.02 5.08 10.58 3.01A9.1 9.1 0 0 1 13.42 3.01L13.98 5.08A7.2 7.2 0 0 1 15.49 5.7L17.35 4.64A9.1 9.1 0 0 1 19.36 6.65L18.3 8.51A7.2 7.2 0 0 1 18.92 10.02L20.99 10.58A9.1 9.1 0 0 1 20.99 13.42L18.92 13.98A7.2 7.2 0 0 1 18.3 15.49L19.36 17.35A9.1 9.1 0 0 1 17.35 19.36L15.49 18.3A7.2 7.2 0 0 1 13.98 18.92L13.42 20.99A9.1 9.1 0 0 1 10.58 20.99L10.02 18.92A7.2 7.2 0 0 1 8.51 18.3L6.65 19.36A9.1 9.1 0 0 1 4.64 17.35L5.7 15.49A7.2 7.2 0 0 1 5.08 13.98L3.01 13.42A9.1 9.1 0 0 1 3.01 10.58L5.08 10.02A7.2 7.2 0 0 1 5.7 8.51L4.64 6.65A9.1 9.1 0 0 1 6.65 4.64L8.51 5.7A7.2 7.2 0 0 1 10.02 5.08Z"
      />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  );
}

/** LinkedIn's inline error pebble (16). */
export function ErrorIcon() {
  return (
    <Svg size={16} viewBox="0 0 16 16">
      <path
        fill="currentColor"
        d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1m.75 9.5h-1.5V12h1.5zm0-6.5h-1.5v5h1.5z"
      />
    </Svg>
  );
}

/** Highlights: two speech bubbles, LinkedIn's blue-grey and gold. */
export function IntroIllustration() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M2 4a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8l-6 6z" fill="#a9bfd6" />
      <path d="M6 8h16M6 12h16M6 16h10" stroke="#38434f" strokeWidth="1.6" />
      <path d="M12 22a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2v10l0 6-6-4H14a2 2 0 0 1-2-2z" fill="#f5c075" />
      <path d="M17 26h16M17 30h12" stroke="#c37d16" strokeWidth="1.6" />
    </svg>
  );
}

/** LinkedIn Premium's gold badge. */
export function PremiumIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect width="16" height="16" rx="2" fill="#f8c77e" />
      <path d="M0 2a2 2 0 0 1 2-2h4.5L16 9.5V14a2 2 0 0 1-2 2h-4.5L0 6.5z" fill="#e7a33e" />
    </svg>
  );
}

/** Fernway's logo: a fern frond in a square, fictional. */
export function CompanyLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="4" fill="#1d4b3a" />
      <path
        d="M16 25V8m0 4-4-2m4 5-5-2.5m5 5.5-5.5-2.5M16 12l4-2m-4 5 5-2.5m-5 5.5 5.5-2.5"
        stroke="#bfe3c9"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Northbridge School of Design: a bridge arch, fictional. */
export function SchoolLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="4" fill="#2b3a67" />
      <path d="M6 22h20M8 22v-4a8 8 0 0 1 16 0v4M12 22v-3m4 3v-5m4 5v-3" stroke="#e6ecff" strokeWidth="1.6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* iOS (device mode), from app/quote-reply/icons.tsx                          */
/* -------------------------------------------------------------------------- */

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
        d="M8 2.3c2.3 0 4.4.9 6 2.4.17.16.43.16.6-.01l1.07-1.08a.42.42 0 000-.6A10.9 10.9 0 008 0 10.9 10.9 0 00.33 3.01a.42.42 0 000 .6L1.4 4.69c.17.17.43.17.6.01A8.6 8.6 0 018 2.3zm0 3.55c1.33 0 2.55.5 3.48 1.33.17.15.42.15.58-.01l1.07-1.08a.42.42 0 00-.01-.61A7.4 7.4 0 008 3.55c-1.97 0-3.77.76-5.12 2a.42.42 0 00-.01.62L3.94 7.25c.16.16.41.16.58.01A5.2 5.2 0 018 5.850zm2.04 2.6a.42.42 0 00-.02-.62A3.1 3.1 0 008 7.1c-.77 0-1.48.27-2.02.73a.42.42 0 00-.02.62l1.74 1.75c.16.16.43.16.6 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BatteryIcon() {
  return (
    <svg viewBox="0 0 27 13" aria-hidden="true">
      <rect x="0.5" y="0.5" width="22.6" height="12" rx="3.8" fill="none" stroke="currentColor" strokeOpacity="0.36" />
      <rect x="2" y="2" width="19.6" height="9" rx="2.5" fill="currentColor" />
      <path d="M24.6 4.4v4.2a2.3 2.3 0 000-4.2z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

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
      <path d="M12.6 7.6l6.8 6.8M19.4 7.6l-6.8 6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
      <rect x="8.4" y="2.2" width="7.2" height="12.6" rx="3.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 11.4a7 7 0 0014 0M12 18.4v3.2M8.6 21.6h6.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmojiKeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.4" fill="currentColor" />
      <circle cx="9" cy="9.6" r="1.25" fill="var(--pn-key-fn, #abb0ba)" />
      <circle cx="15" cy="9.6" r="1.25" fill="var(--pn-key-fn, #abb0ba)" />
      <path d="M6.9 13.2h10.2a5.1 5.1 0 01-10.2 0z" fill="var(--pn-key-fn, #abb0ba)" />
    </svg>
  );
}
