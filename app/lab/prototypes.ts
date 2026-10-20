export type Prototype = {
  slug: string;
  href?: string;
  title: string;
  description: string;
  disciplines: string[];
  featured: boolean;
};

// Newest first. A prototype's number comes from its place in this list, so
// it matches on the homepage and on /lab.
export const prototypes: Prototype[] = [
  {
    slug: "time-away",
    title: "GitHub Time away",
    description:
      "A GitHub concept that lets you drag across the quiet weeks in your contribution graph and mark them as time away, with a short note on why.",
    disciplines: ["Product UI", "Interaction", "Accessibility"],
    featured: true,
  },
  {
    slug: "homeview-clock",
    title: "Apple Homeview clock",
    description:
      "A rebuild of the clock customisation in Apple's Homeview footage, matched frame by frame, with numerals that spring between styles on a variable font's weight axis.",
    disciplines: ["Motion", "Typography"],
    featured: true,
  },
  {
    slug: "could-be-an-email",
    title: "This could be an email",
    description:
      "A Google Calendar concept that turns a recurring meeting into Calendar's own email dialog, pre-written from the agenda, and cancels that week's meeting when you send.",
    disciplines: ["Product UI", "Motion"],
    featured: false,
  },
  {
    slug: "voice-note",
    title: "WhatsApp voice note",
    description:
      "A WhatsApp concept where the voice note's transcript becomes the scrubber. Tap any word to play from it, and the words light up as it plays.",
    disciplines: ["Interaction", "Motion", "Audio"],
    featured: true,
  },
  {
    slug: "spotify-two-streams",
    href: "/two-streams",
    title: "Spotify Two Streams",
    description:
      "A Spotify concept that holds your album when you start a podcast, with a stacked mini player and crossfaded audio that resumes on the exact second you left.",
    disciplines: ["Product UI", "Motion", "Audio"],
    featured: true,
  },
  {
    slug: "spotify-best-part",
    href: "/best-part",
    title: "Spotify Best Part",
    description:
      "A Spotify concept that marks a song's best part on the scrubber, with a one-tap jump that dips the volume so the skip doesn't sound like a cut.",
    disciplines: ["Interaction", "Motion", "Audio"],
    featured: true,
  },
  {
    slug: "reliable-upload",
    title: "Reliable upload",
    description:
      "A file upload that stays clear and recoverable through slow networks, offline pauses, and failed transfers, with motion tuned to every state change.",
    disciplines: ["Interaction", "Motion"],
    featured: true,
  },
  {
    slug: "unified-connection",
    title: "Unified Connection",
    description:
      "A what-if exploration for iPhone Duo that unifies Wi-Fi, cellular, weak signal, no-internet, and offline states through SVG geometry.",
    disciplines: ["Interaction", "Motion", "SVG"],
    featured: false,
  },
  {
    slug: "cellular-status-morph",
    title: "Cellular status morph",
    description:
      "A frame-tuned status icon animation that transforms cellular, Wi-Fi, and battery states through continuous SVG motion.",
    disciplines: ["Interaction", "Motion", "SVG"],
    featured: false,
  },
  {
    slug: "morph-explorations",
    title: "Icon morph explorations",
    description:
      "Responsive SVG icon morphs exploring path interpolation, spring motion, state transitions, and accessible interaction.",
    disciplines: ["Interaction", "Motion", "Accessibility"],
    featured: false,
  },
  {
    slug: "reorder-queue",
    title: "Reorder queue",
    description:
      "A tactile playlist queue with spring reordering, boundary feedback, and accessible keyboard controls.",
    disciplines: ["Interaction", "Accessibility"],
    featured: false,
  },
  {
    slug: "merchant-onboarding",
    title: "Merchant onboarding",
    description:
      "A verification review flow that keeps status, actions, and focus clear across mouse and keyboard interactions.",
    disciplines: ["Product UI", "Accessibility"],
    featured: false,
  },
  {
    slug: "currency-converter",
    title: "Currency converter",
    description:
      "A conversion flow that makes rates, fees, and the final amount clear before commitment.",
    disciplines: ["Product UI", "Fintech"],
    featured: false,
  },
  {
    slug: "grid-to-detail",
    title: "Grid to detail",
    description:
      "A fluid transition from a responsive image grid into a focused detail view, tuned around layout continuity.",
    disciplines: ["Prototyping", "Layout"],
    featured: false,
  },
  {
    slug: "photo-pager",
    title: "Photo pager",
    description:
      "A tactile photo browser with gesture-led navigation, predictable keyboard behaviour, and clear spatial position.",
    disciplines: ["Interaction", "Motion"],
    featured: false,
  },
];
