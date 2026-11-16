import type { Metadata } from "next";
import { preload } from "react-dom";
import { ContraSchedule } from "./contra-schedule";

const description =
  "A feature request for Contra, made as a working prototype: a clock beside Post in the community composer. Pick a time and the post waits in a Scheduled tab until it goes out on its own.";

/* A page's openGraph and twitter replace the site's rather than merge, so they're complete here. */
const image = {
  url: "/contra-schedule/og.png",
  width: 2400,
  height: 1260,
  alt: "Contra's community composer with a clock button beside Schedule, a time chip reading Tomorrow at 9:00 AM, and a Scheduled tab beside For you and Topics.",
};

export const metadata: Metadata = {
  title: "Scheduled posts for Contra",
  description,
  alternates: { canonical: "/contra-schedule" },
  openGraph: {
    title: "Scheduled posts for Contra. A concept",
    description,
    type: "website",
    url: "/contra-schedule",
    siteName: "Uzo Okafor",
    locale: "en_US",
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scheduled posts for Contra. A concept",
    description,
    creator: "@uzodev",
    images: [image.url],
  },
};

export default function ContraSchedulePrototype() {
  // Contra's font, self-hosted. Preloaded so the first frame is never the fallback.
  preload("/contra-schedule/fonts/GT-Standard-VF-latin.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });

  return (
    <main data-cs-page>
      <h1 className="cs-sr-only">Scheduled posts for Contra. A concept</h1>

      <ContraSchedule />

      <p className="cs-note">A concept by Uzo Okafor. Not affiliated with Contra.</p>

      {/* Contra has no dark mode, so the page stays light whatever the site's theme is. */}
      <style>{`
        html,
        body,
        html[data-theme="dark"],
        html[data-theme="dark"] body {
          margin: 0;
          background: #fff;
          color-scheme: light;
        }

        @media (min-width: 62rem) {
          html,
          body,
          html[data-theme="dark"],
          html[data-theme="dark"] body {
            background: #fbfcfd;
          }
        }
      `}</style>
    </main>
  );
}
