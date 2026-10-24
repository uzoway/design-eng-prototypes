import type { Metadata } from "next";
import { Google_Sans, Roboto } from "next/font/google";
import { SkipAiOverview } from "./skip-ai-overview";

/* google.com loads Google Sans for its content; the skip pill is YouTube's, set in Roboto. */
const googleSans = Google_Sans({
  subsets: ["latin"],
  variable: "--font-google-sans",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skip AI Overview",
  description:
    "A concept for Google Search: the AI Overview gets the YouTube ad treatment, with a skip countdown and a setting to always skip it.",
};

export default function SkipAiOverviewPrototype() {
  return (
    <main data-sk-page className={`${googleSans.variable} ${roboto.variable}`}>
      <h1 className="sk-sr-only">Skip AI Overview, a Google Search concept</h1>

      <SkipAiOverview />

      <style>{`
        html,
        body {
          min-height: 100%;
          margin: 0;
          background: #ffffff;
        }

        html[data-theme="dark"],
        html[data-theme="dark"] body {
          background: rgb(34, 36, 42);
        }
      `}</style>
    </main>
  );
}
