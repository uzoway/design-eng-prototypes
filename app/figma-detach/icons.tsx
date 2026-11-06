/*
 * Icons drawn on Figma's UI3 grid: 24px boxes, 1px strokes on the half
 * pixel so they stay sharp at 1x. Decorative everywhere; the controls that
 * hold them carry the names.
 */

import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---- Layers ------------------------------------------------------------ */

export function FrameIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6v12M14.5 6v12M6 9.5h12M6 14.5h12" />
    </Icon>
  );
}

export function InstanceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6.7 17.3 12 12 17.3 6.7 12Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function ComponentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="m12 5.6 2.4 2.4-2.4 2.4L9.6 8ZM16 9.6l2.4 2.4-2.4 2.4-2.4-2.4ZM8 9.6l2.4 2.4L8 14.4 5.6 12ZM12 13.6l2.4 2.4-2.4 2.4L9.6 16Z"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function TextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 8V6.5h9V8M12 6.5v11M10 17.5h4" />
    </Icon>
  );
}

export function CaretIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" width={16} height={16} viewBox="0 0 16 16" {...props}>
      <path d="M6 5.5 9 8l-3 2.5Z" fill="currentColor" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 12s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4Z" />
      <circle cx="12" cy="12" r="1.5" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 11.5h7v5h-7zM10 11.5V10a2 2 0 0 1 4 0v1.5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m7.5 12.5 3 3 6-7" />
    </Icon>
  );
}

/* ---- Panels ------------------------------------------------------------ */

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9 10.5 3 3 3-3" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m10.5 9 3 3-3 3" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 7v10M7 12h10" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 12h10" />
    </Icon>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props} stroke="none" fill="currentColor">
      <circle cx="7" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="17" cy="12" r="1" />
    </Icon>
  );
}

export function InstanceOptionsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 6.5h4v4h-4zM13.5 6.5h4v4h-4zM6.5 13.5h4v4h-4zM13.5 13.5h4v4h-4z" strokeDasharray="1.5 1" />
    </Icon>
  );
}

export function GoToMainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 6.6 16.4 12 11 17.4 5.6 12Z" strokeLinejoin="round" />
      <path d="M9.5 12h9M16 9.5l2.5 2.5-2.5 2.5" />
    </Icon>
  );
}

export function DetachIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6.5h5M16.5 9v5M15 17.5h-5M7.5 15v-5" />
    </Icon>
  );
}

export function SidebarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 7.5h11v9h-11zM10.5 7.5v9" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 7.5v9l7-4.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="4.5" />
      <path d="m14.5 14.5 3 3" />
    </Icon>
  );
}

export function FocusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 10V7.5H10M14 7.5h2.5V10M16.5 14v2.5H14M10 16.5H7.5V14" />
      <path d="M10.5 10.5h3v3h-3z" />
    </Icon>
  );
}

export function AlignLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 6v12M10 10.5h7M10 13.5h4" />
    </Icon>
  );
}

export function AlignHCenterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6v12M8 10.5h8M9.5 13.5h5" />
    </Icon>
  );
}

export function AlignRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16.5 6v12M7 10.5h7M10 13.5h4" />
    </Icon>
  );
}

export function AlignTopIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 7.5h12M10.5 10v7M13.5 10v4" />
    </Icon>
  );
}

export function AlignVCenterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 12h12M10.5 8v8M13.5 9.5v5" />
    </Icon>
  );
}

export function AlignBottomIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 16.5h12M10.5 7v7M13.5 10v4" />
    </Icon>
  );
}

export function DistributeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 7.5h10M7 16.5h10M8.5 11.5h7v1h-7z" />
    </Icon>
  );
}

export function AngleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 7.5v8h8M8.5 11.5a4 4 0 0 1 4 4" />
    </Icon>
  );
}

export function RotateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 8.6 15.4 12 12 15.4 8.6 12Z" strokeLinejoin="round" />
      <path d="M8 7.5A5.5 5.5 0 0 1 16.5 9M16.5 6.5V9H14" />
    </Icon>
  );
}

export function FlipHIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6v12M10 8.5v7l-3.5-3.5ZM14 8.5v7l3.5-3.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function FlipVIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 12h12M8.5 10h7L12 6.5ZM8.5 14h7L12 17.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function RadiusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 16.5V11a3.5 3.5 0 0 1 3.5-3.5h5.5" />
    </Icon>
  );
}

export function OpacityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 7.5h9v9h-9z" />
      <path d="M7.5 7.5h3v3h-3zM13.5 7.5h3v3h-3zM10.5 10.5h3v3h-3zM7.5 13.5h3v3h-3zM13.5 13.5h3v3h-3z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ClipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6v8.5H18M6 9.5h8.5V18" />
    </Icon>
  );
}

export function AutoLayoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 7.5h9v3h-9zM7.5 13.5h9v3h-9z" />
    </Icon>
  );
}

export function StylesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 7.5h3v3h-3zM13.5 7.5h3v3h-3zM7.5 13.5h3v3h-3zM13.5 13.5h3v3h-3z" />
    </Icon>
  );
}

/* ---- Left rail --------------------------------------------------------- */

export function FigmaMark(props: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" width={16} height={24} viewBox="0 0 16 24" {...props}>
      <path d="M4 24a4 4 0 0 0 4-4v-4H4a4 4 0 0 0 0 8Z" fill="#0acf83" />
      <path d="M0 12a4 4 0 0 1 4-4h4v8H4a4 4 0 0 1-4-4Z" fill="#a259ff" />
      <path d="M0 4a4 4 0 0 1 4-4h4v8H4a4 4 0 0 1-4-4Z" fill="#f24e1e" />
      <path d="M8 0h4a4 4 0 0 1 0 8H8V0Z" fill="#ff7262" />
      <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" fill="#1abcfe" />
    </svg>
  );
}

export function FileRailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 5.5h6l3 3v10h-9z" />
      <path d="M13.5 5.5v3h3M9.5 12.5h5M9.5 15h5" />
    </Icon>
  );
}

export function AgentsRailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5.5c.6 3.4 3.1 5.9 6.5 6.5-3.4.6-5.9 3.1-6.5 6.5-.6-3.4-3.1-5.9-6.5-6.5 3.4-.6 5.9-3.1 6.5-6.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function AssetsRailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 6.2 11 8.7 8.5 11.2 6 8.7ZM15.5 6.2 18 8.7l-2.5 2.5L13 8.7ZM8.5 12.8l2.5 2.5-2.5 2.5L6 15.3ZM15.5 12.8l2.5 2.5-2.5 2.5-2.5-2.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function ToolsRailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 6.5h4v4h-4zM13.5 6.5h4v4h-4zM6.5 13.5h4v4h-4z" />
      <path d="M15.5 13v5M13 15.5h5" />
    </Icon>
  );
}

export function VariablesRailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5.8 17.5 9v6L12 18.2 6.5 15V9Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.8" />
    </Icon>
  );
}

/* ---- Toolbar ----------------------------------------------------------- */

export function MoveToolIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m7.5 6.5 9.5 3.6-4.2 1.6-1.6 4.3Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function RectangleToolIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1" />
    </Icon>
  );
}

export function PenToolIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 17.5 5.5-5.5-5.5-6-5.5 6Z M12 12v5.5" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="1.2" />
    </Icon>
  );
}

export function CodeToolIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6.5c-1.5 0-2 .6-2 1.8v1.8c0 .9-.6 1.6-1.5 1.9.9.3 1.5 1 1.5 1.9v1.8c0 1.2.5 1.8 2 1.8M14.5 6.5c1.5 0 2 .6 2 1.8v1.8c0 .9.6 1.6 1.5 1.9-.9.3-1.5 1-1.5 1.9v1.8c0 1.2-.5 1.8-2 1.8" />
    </Icon>
  );
}

export function CommentToolIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6a6 6 0 0 1 0 12H6v-6a6 6 0 0 1 6-6Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function ActionsToolIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8.5" cy="8.5" r="2.5" />
      <circle cx="8.5" cy="15.5" r="2.5" />
      <circle cx="15.5" cy="15.5" r="2.5" />
      <path d="M15.5 5.5v6M12.5 8.5h6" />
    </Icon>
  );
}

export function DrawModeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 15.5c1.5-3.5 3-5 4-5s-1 4 .5 4.5 3-3.5 4.5-3.5c1 0 0 2.5 1 3" strokeLinecap="round" />
    </Icon>
  );
}

export function DesignModeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17.5 11V6.5h-11v11H11" />
      <path d="m12 12 6 2.3-2.7 1-1 2.7Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function PrototypeModeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6.6 17.4 12 12 17.4 6.6 12Z" strokeLinejoin="round" />
      <path d="M10.5 12h3" />
    </Icon>
  );
}

export function DevModeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 8.5-3.5 3.5 3.5 3.5M14.5 8.5l3.5 3.5-3.5 3.5M12.8 7.5l-1.6 9" />
    </Icon>
  );
}

export function SmallChevronIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" width={8} height={24} viewBox="0 0 8 24" fill="none" stroke="currentColor" {...props}>
      <path d="m1.5 11 2.5 2.5L6.5 11" />
    </svg>
  );
}

/* ---- Analytics ---------------------------------------------------------- */

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m8 8 8 8M16 8l-8 8" />
    </Icon>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m13.5 8.5-3.5 3.5 3.5 3.5" />
    </Icon>
  );
}

export function SortIcon({ dir, ...props }: IconProps & { dir: "ascending" | "descending" | "none" }) {
  return (
    <svg aria-hidden="true" focusable="false" width={8} height={16} viewBox="0 0 8 16" {...props}>
      {dir !== "descending" && <path d="M4 4.5 6.5 7.5h-5Z" fill="currentColor" opacity={dir === "none" ? 0.4 : 1} />}
      {dir !== "ascending" && <path d="M4 11.5 1.5 8.5h5Z" fill="currentColor" opacity={dir === "none" ? 0.4 : 1} />}
    </svg>
  );
}

export function LibraryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 6.5h3v11h-3zM10.5 6.5h3v11h-3zM14.3 7.2l2.9-.8 2.9 10.6-2.9.8Z" strokeLinejoin="round" />
    </Icon>
  );
}
