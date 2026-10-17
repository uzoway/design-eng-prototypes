import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import { TimeAway } from "./time-away";

const monaSans = Mona_Sans({
  subsets: ["latin"],
  variable: "--font-mona",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Time away",
  description:
    "A concept for GitHub: mark the gaps in your contribution graph as time away.",
};

export default function TimeAwayPrototype() {
  return (
    <main data-ta-page className={monaSans.variable}>
      <h1 className="ta-page-title">Time away on the contribution graph</h1>

      <TimeAway />

      <p className="ta-page-note">A concept by Uzo Okafor. Not affiliated with GitHub.</p>

      <style>{`
        html,
        body {
          min-height: 100%;
          margin: 0;
          background: #ffffff;
        }

        @media (prefers-color-scheme: dark) {
          html,
          body {
            background: #0d1117;
          }
        }

        [data-ta-page] {
          box-sizing: border-box;
          min-height: 100svh;
          max-width: 928px;
          margin: 0 auto;
          padding: 72px 16px 40px;
          overflow-x: clip;
          font-family: var(--font-mona), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .ta-page-title {
          position: absolute;
          width: 1px;
          height: 1px;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
        }

        .ta-page-note {
          margin: 32px 0 0;
          color: #59636e;
          font-size: 12px;
        }

        @media (prefers-color-scheme: dark) {
          .ta-page-note {
            color: #9198a1;
          }
        }
      `}</style>
    </main>
  );
}
