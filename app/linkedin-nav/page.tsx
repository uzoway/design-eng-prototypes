import type { Metadata } from "next";
import { LinkedInNav } from "./linkedin-nav";

const description =
  "A concept for LinkedIn's top nav: the same icons, each with its own small motion. The house lights up, the people make room, the briefcase opens, the bubble types and the bell rings.";

/* A page's openGraph and twitter replace the site's rather than merge, so they're complete here. */
const image = {
  url: "/linkedin-nav/og.png",
  width: 2400,
  height: 1260,
  alt: "LinkedIn's top navigation bar at double size in light mode, with Home selected and a red dot on its icon.",
};

export const metadata: Metadata = {
  title: "LinkedIn nav, in motion",
  description,
  alternates: { canonical: "/linkedin-nav" },
  openGraph: {
    title: "LinkedIn nav, in motion. A concept",
    description,
    type: "website",
    url: "/linkedin-nav",
    siteName: "Uzo Okafor",
    locale: "en_US",
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn nav, in motion. A concept",
    description,
    creator: "@uzodev",
    images: [image.url],
  },
};

export default function LinkedInNavPrototype() {
  return (
    <main data-ln-page>
      <h1 className="ln-sr-only">LinkedIn nav, in motion. A concept</h1>

      <LinkedInNav />

      <style>{`
        html,
        body {
          margin: 0;
          background: #f4f2ee;
        }

        html[data-theme="dark"],
        html[data-theme="dark"] body {
          background: #000;
        }
      `}</style>
    </main>
  );
}
