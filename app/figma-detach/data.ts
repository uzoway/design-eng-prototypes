/*
 * Everything the concept knows: the Orbit components, the checkout file's
 * layers, and the library analytics the Orbit team would see. All of it is
 * invented. Northwind, Orbit and the people below don't exist.
 */

import { WORST_CASE } from "./worst-case.ts";

/** Dev only: `NEXT_PUBLIC_FIGMA_DETACH_DATA=worst npm run dev` swaps in the worst-case data. */
const worst =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_FIGMA_DETACH_DATA === "worst" ? WORST_CASE : null;

export const LIBRARY = worst?.library ?? "Orbit Design System";
export const LIBRARY_TEAM = worst?.libraryTeam ?? "Orbit";
export const FILE_NAME = worst?.fileName ?? "Checkout – Q4 refresh";

export type ReasonId = "missing" | "spacing" | "content" | "broken" | "exploring";

export const REASONS: { id: ReasonId; label: string; short: string }[] = [
  { id: "missing", label: "Missing a variant", short: "Missing a variant" },
  { id: "spacing", label: "Spacing doesn't fit", short: "Spacing" },
  { id: "content", label: "Content doesn't fit", short: "Content" },
  { id: "broken", label: "It's broken", short: "Broken" },
  { id: "exploring", label: "Just exploring", short: "Exploring" },
];

/** Reasons the library team sees. "Just exploring" isn't a signal, so it's never sent. */
export const SENT_REASONS = REASONS.filter((reason) => reason.id !== "exploring");

export const NOTE_LIMIT = 140;

export type Library = "orbit" | "local";

export type Component = {
  id: string;
  name: string;
  library: Library;
  /** Variant properties, as the properties panel lists them. */
  props: { label: string; value: string }[];
};

const DEMO_COMPONENTS: Record<string, Component> = {
  button: {
    id: "button",
    name: "Button",
    library: "orbit",
    props: [
      { label: "Variant", value: "Primary" },
      { label: "Size", value: "Large" },
      { label: "Icon", value: "None" },
    ],
  },
  input: {
    id: "input",
    name: "Input",
    library: "orbit",
    props: [
      { label: "State", value: "Default" },
      { label: "Size", value: "Medium" },
      { label: "Leading icon", value: "False" },
    ],
  },
  card: {
    id: "card",
    name: "Card",
    library: "orbit",
    props: [
      { label: "Elevation", value: "Raised" },
      { label: "Padding", value: "16" },
    ],
  },
  badge: {
    id: "badge",
    name: "Badge",
    library: "orbit",
    props: [
      { label: "Tone", value: "Success" },
      { label: "Size", value: "Small" },
    ],
  },
  avatar: {
    id: "avatar",
    name: "Avatar",
    library: "orbit",
    props: [
      { label: "Size", value: "32" },
      { label: "Type", value: "Initials" },
    ],
  },
  icon: {
    id: "icon",
    name: "Icon",
    library: "orbit",
    props: [
      { label: "Name", value: "credit-card" },
      { label: "Size", value: "16" },
    ],
  },
  tabs: {
    id: "tabs",
    name: "Navigation / Tabs / Segmented / Small",
    library: "orbit",
    props: [
      { label: "Items", value: "3" },
      { label: "Selected", value: "1" },
    ],
  },
  logo: {
    id: "logo",
    name: "Logo",
    library: "local",
    props: [{ label: "Theme", value: "Light" }],
  },
};

export const COMPONENTS: Record<string, Component> = Object.fromEntries(
  Object.entries(DEMO_COMPONENTS).map(([id, component]) => [
    id,
    { ...component, name: worst?.componentNames[id] ?? component.name },
  ]),
);

/* ------------------------------------------------------------------------ */
/* The checkout file                                                         */
/* ------------------------------------------------------------------------ */

export type NodeType = "frame" | "instance" | "text";

export type SceneNode = {
  id: string;
  name: string;
  type: NodeType;
  parent: string | null;
  /** Set on instances, and kept on detached frames so undo can restore them. */
  componentId?: string;
  /** Position and size in design pixels, relative to the parent. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Layer rows that start expanded. */
  open?: boolean;
};

/**
 * Children are listed in paint order. The layers panel shows them reversed,
 * topmost first, as Figma does.
 */
const DEMO_SCENE_NODES: SceneNode[] = [
  { id: "checkout", name: "Checkout", type: "frame", parent: null, x: 0, y: 0, w: 375, h: 812, open: true },
  { id: "top-bar", name: "Top bar", type: "frame", parent: "checkout", x: 0, y: 0, w: 375, h: 64 },
  { id: "logo", name: "Logo", type: "instance", componentId: "logo", parent: "top-bar", x: 24, y: 20, w: 92, h: 24 },
  { id: "avatar", name: "Avatar", type: "instance", componentId: "avatar", parent: "top-bar", x: 319, y: 16, w: 32, h: 32 },
  { id: "title", name: "Checkout", type: "text", parent: "checkout", x: 24, y: 88, w: 160, h: 32 },
  { id: "badge", name: "Badge", type: "instance", componentId: "badge", parent: "checkout", x: 289, y: 94, w: 62, h: 20 },
  { id: "card", name: "Order summary", type: "instance", componentId: "card", parent: "checkout", x: 24, y: 140, w: 327, h: 164 },
  { id: "payment", name: "Payment", type: "text", parent: "checkout", x: 24, y: 332, w: 327, h: 20 },
  { id: "method", name: "Payment method", type: "instance", componentId: "tabs", parent: "checkout", x: 24, y: 364, w: 327, h: 32 },
  { id: "email", name: "Email", type: "instance", componentId: "input", parent: "checkout", x: 24, y: 412, w: 327, h: 66 },
  { id: "card-number", name: "Card number", type: "instance", componentId: "input", parent: "checkout", x: 24, y: 494, w: 327, h: 66 },
  { id: "card-icon", name: "Icon", type: "instance", componentId: "icon", parent: "card-number", x: 14, y: 36, w: 16, h: 16 },
  { id: "name-on-card", name: "Name on card", type: "instance", componentId: "input", parent: "checkout", x: 24, y: 576, w: 327, h: 66 },
  { id: "button", name: "Button", type: "instance", componentId: "button", parent: "checkout", x: 24, y: 716, w: 327, h: 48 },
];

/* ------------------------------------------------------------------------ */
/* What others did this week (for the popover's social line)                 */
/* ------------------------------------------------------------------------ */

export const SCENE_NODES = DEMO_SCENE_NODES.map((node) => ({ ...node, name: worst?.layerNames[node.id] ?? node.name }));

const DEMO_THIS_WEEK: Record<string, { others: number; top: ReasonId | null }> = {
  button: { others: 4, top: "missing" },
  input: { others: 2, top: "content" },
  card: { others: 1, top: "spacing" },
  badge: { others: 0, top: null },
  avatar: { others: 3, top: "spacing" },
  icon: { others: 6, top: "missing" },
  tabs: { others: 2, top: "missing" },
};

export const THIS_WEEK = worst?.thisWeek ?? DEMO_THIS_WEEK;

/* ------------------------------------------------------------------------ */
/* Library analytics, last 30 days                                           */
/* ------------------------------------------------------------------------ */

export type ReasonCounts = Partial<Record<Exclude<ReasonId, "exploring">, number>>;

export type Note = { text: string; who: string; file: string; when: string };

export type ComponentStats = {
  id: string;
  name: string;
  /** Variants in the component set, which Figma's table shows beside the name. */
  variants: number;
  /** Instances in use today. Not tied to the date range. */
  instances: number;
  /** Inserts and detaches over the last 30 days. */
  inserts: number;
  detaches: number;
  /** Reasons only exist since the popover shipped, so these don't scale with the range. */
  reasons: ReasonCounts;
  notes: Note[];
  files: { name: string; count: number }[];
};

const DEMO_STATS: ComponentStats[] = [
  {
    id: "button",
    name: "Button",
    variants: 24,
    instances: 4812,
    inserts: 1206,
    detaches: 31,
    reasons: { missing: 14, spacing: 5, content: 3, broken: 1 },
    notes: [
      { text: "icon-only, small", who: "Priya", file: "Settings", when: "2d" },
      { text: "need a loading state", who: "Tomás", file: FILE_NAME, when: "4d" },
      { text: "destructive variant", who: "Mei", file: "Account deletion", when: "6d" },
    ],
    files: [
      { name: FILE_NAME, count: 6 },
      { name: "Settings", count: 4 },
      { name: "Onboarding flow", count: 3 },
      { name: "Account deletion", count: 2 },
      { name: "Marketing site", count: 2 },
      { name: "Admin console", count: 1 },
    ],
  },
  {
    id: "input",
    name: "Input",
    variants: 12,
    instances: 9140,
    inserts: 2388,
    detaches: 18,
    reasons: { missing: 3, spacing: 2, content: 8 },
    notes: [
      { text: "helper text wraps to two lines", who: "Jonah", file: "Onboarding flow", when: "1d" },
      { text: "need a prefix slot for currency", who: "Ada", file: FILE_NAME, when: "5d" },
    ],
    files: [
      { name: "Onboarding flow", count: 7 },
      { name: FILE_NAME, count: 5 },
      { name: "Settings", count: 3 },
    ],
  },
  {
    id: "icon",
    name: "Icon",
    variants: 186,
    instances: 48213,
    inserts: 12406,
    detaches: 64,
    reasons: { missing: 21, spacing: 2, broken: 4 },
    notes: [
      { text: "no receipt icon", who: "Kofi", file: "Admin console", when: "1d" },
      { text: "stroke too thin at 12px", who: "Lena", file: "Marketing site", when: "3d" },
    ],
    files: [
      { name: "Admin console", count: 19 },
      { name: "Marketing site", count: 14 },
      { name: FILE_NAME, count: 9 },
    ],
  },
  {
    id: "card",
    name: "Card",
    variants: 6,
    instances: 3402,
    inserts: 640,
    detaches: 12,
    reasons: { missing: 1, spacing: 6, content: 3 },
    notes: [{ text: "16 padding is too much on mobile", who: "Mei", file: FILE_NAME, when: "2d" }],
    files: [
      { name: FILE_NAME, count: 5 },
      { name: "Settings", count: 4 },
    ],
  },
  {
    id: "avatar",
    name: "Avatar",
    variants: 8,
    instances: 2215,
    inserts: 512,
    detaches: 7,
    reasons: { missing: 2, spacing: 4 },
    notes: [],
    files: [{ name: "Admin console", count: 7 }],
  },
  {
    id: "modal",
    name: "Modal",
    variants: 4,
    instances: 940,
    inserts: 188,
    detaches: 6,
    reasons: { missing: 3, content: 2 },
    notes: [{ text: "no full-screen option on mobile", who: "Tomás", file: "Account deletion", when: "3d" }],
    files: [{ name: "Account deletion", count: 6 }],
  },
  {
    id: "tabs",
    name: "Navigation / Tabs / Segmented / Small",
    variants: 6,
    instances: 1032,
    inserts: 210,
    detaches: 5,
    reasons: { missing: 2, spacing: 1 },
    notes: [],
    files: [{ name: "Settings", count: 5 }],
  },
  {
    id: "tooltip",
    name: "Tooltip",
    variants: 8,
    instances: 1880,
    inserts: 402,
    detaches: 4,
    reasons: {},
    notes: [],
    files: [{ name: "Admin console", count: 4 }],
  },
  {
    id: "badge",
    name: "Badge",
    variants: 10,
    instances: 5870,
    inserts: 1450,
    detaches: 3,
    reasons: { content: 2, broken: 1 },
    notes: [],
    files: [{ name: "Marketing site", count: 3 }],
  },
  {
    id: "divider",
    name: "Divider",
    variants: 2,
    instances: 7650,
    inserts: 1322,
    detaches: 0,
    reasons: {},
    notes: [],
    files: [],
  },
];

export const STATS = worst?.stats ?? DEMO_STATS;

export const RANGES = [
  { id: "30", label: "Last 30 days", scale: 1 },
  { id: "60", label: "Last 60 days", scale: 1.9 },
  { id: "90", label: "Last 90 days", scale: 2.8 },
  { id: "365", label: "Last year", scale: 10.6 },
] as const;

export type RangeId = (typeof RANGES)[number]["id"];

const DEMO_TOP_TEAMS = [
  { name: "Payments", share: 0.31 },
  { name: "Growth", share: 0.24 },
  { name: "Platform", share: 0.19 },
  { name: "Marketing web", share: 0.15 },
  { name: "Mobile", share: 0.11 },
];

/** Daily inserts for the last 30 days, oldest first. Weekends dip. */
const DEMO_DAILY_INSERTS = [
  880, 1040, 1120, 990, 1210, 380, 310, 1060, 1180, 1250, 1130, 1290, 420, 350, 1110, 1270, 1340, 1220,
  1380, 460, 390, 1190, 1300, 1420, 1290, 1460, 510, 430, 1330, 1480,
];

export const TOP_TEAMS = worst?.topTeams ?? DEMO_TOP_TEAMS;
export const DAILY_INSERTS = worst?.dailyInserts ?? DEMO_DAILY_INSERTS;
