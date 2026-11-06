import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { FigmaDetach } from "./figma-detach";

/* Figma ships Inter as a variable font and uses in-between weights (450, 550). */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const description =
  "A concept for Figma: when you detach a library component, a small popover asks why, and the design system team sees the reasons in library analytics.";

/* A page's openGraph and twitter replace the site's rather than merge, so they're complete here. */
const image = {
  url: "/figma-detach/og.png",
  width: 2400,
  height: 1260,
  alt: "A concept of Figma's editor with a Button just detached and a popover beside it asking why, with Missing a variant picked.",
};

export const metadata: Metadata = {
  title: "Why are you detaching?",
  description,
  alternates: { canonical: "/figma-detach" },
  openGraph: {
    title: "Why are you detaching? A Figma concept",
    description,
    type: "website",
    url: "/figma-detach",
    siteName: "Uzo Okafor",
    locale: "en_US",
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: "Why are you detaching? A Figma concept",
    description,
    creator: "@uzodev",
    images: [image.url],
  },
};

/*
 * Figma's editor is dark for its owner, so the page starts dark unless the
 * visitor has already picked a theme. This runs before first paint; the
 * theme provider takes over after hydration.
 */
const darkByDefault = `
  try {
    if (!localStorage.getItem("merchant-theme")) document.documentElement.dataset.theme = "dark";
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
`;

export default function FigmaDetachPrototype() {
  return (
    <main data-fd-page className={inter.variable}>
      <script dangerouslySetInnerHTML={{ __html: darkByDefault }} />
      <h1 className="fd-sr-only">Why are you detaching? A Figma concept</h1>

      <FigmaDetach />

      <style>{`
        html,
        body {
          height: 100%;
          margin: 0;
          background: #f5f5f5;
          overscroll-behavior: none;
        }

        html[data-theme="dark"],
        html[data-theme="dark"] body {
          background: #1e1e1e;
        }
      `}</style>
    </main>
  );
}
