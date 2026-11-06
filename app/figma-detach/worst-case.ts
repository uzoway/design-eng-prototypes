/*
 * Worst-case data for QA: the longest names a real Orbit library would plausibly
 * have, counts of exactly 1 and in the millions, notes in other scripts, and
 * components nobody has used. Dev only: run
 * `NEXT_PUBLIC_FIGMA_DETACH_DATA=worst npm run dev` to see the concept with it.
 */

import type { ComponentStats, ReasonId } from "./data.ts";

const FILE = "Checkout – Q4 refresh – Payments squad working file (copy)";

export const WORST_CASE = {
  library: "Northwind Product Design System – Web & Mobile",
  libraryTeam: "Design Systems Platform",
  fileName: FILE,

  componentNames: {
    input: "Form field / Text input / With helper text and counter",
    card: "Card / Order summary / Collapsible",
    icon: "Icon / Payments / Credit card / 16",
  } as Record<string, string>,

  layerNames: {
    button: "Pay now – primary CTA (keep linked to Orbit, see DS-1432)",
    email: "Email address for the receipt and order updates",
    "card-number": "Card number",
  } as Record<string, string>,

  thisWeek: {
    button: { others: 1, top: "missing" },
    input: { others: 21, top: "content" },
    card: { others: 0, top: null },
    icon: { others: 112, top: "broken" },
    badge: { others: 2, top: null },
    tabs: { others: 3, top: "spacing" },
  } as Record<string, { others: number; top: ReasonId | null }>,

  stats: [
    {
      id: "button",
      name: "Button",
      variants: 1,
      instances: 1,
      inserts: 1,
      detaches: 1,
      reasons: { missing: 1 },
      notes: [
        {
          text: "loading state, see https://northwind.atlassian.net/wiki/spaces/ORBIT/pages/2147483647/Button+loading+state",
          who: "Bartholomew",
          file: FILE,
          when: "2d",
        },
      ],
      files: [{ name: FILE, count: 1 }],
    },
    {
      id: "input",
      name: "Form field / Text input / With helper text and counter",
      variants: 312,
      instances: 1_284_907,
      inserts: 99_950,
      detaches: 12_480,
      reasons: { missing: 4812, spacing: 3120, content: 2201, broken: 9 },
      notes: [
        { text: "🫠 helper text wraps again", who: "Zoë", file: "Onboarding", when: "1d" },
        { text: "النص المساعد يلتف إلى سطرين في الجوال", who: "Yusuf", file: "Onboarding – AR", when: "1d" },
        {
          text: "needs orbit.color.text.secondary.on-surface-variant.disabled-hover-pressed for the counter",
          who: "Aleksandra",
          file: "Settings",
          when: "3d",
        },
        { text: "x", who: "Jo", file: "Scratch", when: "4d" },
        { text: "prefix slot for currency", who: "Ada", file: FILE, when: "5d" },
        { text: "the sixth note, which the drill-in shouldn't show", who: "Mei", file: "Admin", when: "6d" },
      ],
      files: [
        { name: "Onboarding – Arabic and Hebrew right-to-left review", count: 4120 },
        { name: "Onboarding – Arabic and Hebrew right-to-left review (copy)", count: 3011 },
        { name: FILE, count: 2004 },
        { name: "Settings", count: 1890 },
        { name: "Admin console", count: 1201 },
        { name: "Scratch", count: 254 },
      ],
    },
    {
      id: "card",
      name: "Card / Order summary / Collapsible",
      variants: 6,
      instances: 3402,
      inserts: 640,
      detaches: 9,
      reasons: {},
      notes: [],
      files: [{ name: "Settings", count: 9 }],
    },
    {
      id: "icon",
      name: "Icon / Payments / Credit card / 16",
      variants: 2,
      instances: 999_999,
      inserts: 9_999,
      detaches: 10_000,
      reasons: { broken: 10_000 },
      notes: [],
      files: [],
    },
    {
      id: "avatar",
      name: "Avatar",
      variants: 8,
      instances: 2215,
      inserts: 512,
      detaches: 2,
      reasons: { spacing: 1 },
      notes: [],
      files: [
        { name: "Admin console", count: 1 },
        { name: "Settings", count: 1 },
        { name: "Onboarding", count: 1 },
        { name: "Marketing site", count: 1 },
        { name: "Account deletion", count: 1 },
      ],
    },
    {
      id: "tag",
      name: "Tag",
      variants: 1,
      instances: 0,
      inserts: 0,
      detaches: 0,
      reasons: {},
      notes: [],
      files: [],
    },
  ] satisfies ComponentStats[],

  topTeams: [
    { name: "Payments & Checkout Experience (EMEA and APAC)", share: 0.62 },
    { name: "QA", share: 0.38 },
  ],

  /** A library that went live yesterday. */
  dailyInserts: [...Array.from({ length: 28 }, () => 0), 3, 1240],
};
