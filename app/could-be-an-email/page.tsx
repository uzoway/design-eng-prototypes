import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Flex } from "next/font/google";
import { CalendarApp } from "./calendar-app";

// Both families are on Google Fonts under the OFL. Google Sans carries an
// optical-size axis (17–18), so with font-optical-sizing on, small UI text
// gets the Google Sans Text cut and headings get the display cut.
const googleSans = Google_Sans({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-gsans",
  display: "swap",
  // No metric-matched fallback exists; the page waits for the font instead.
  adjustFontFallback: false,
});

const googleSansFlex = Google_Sans_Flex({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-gsans-flex",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Google Calendar: this could be an email",
  description:
    "A Google Calendar concept. One tap turns a recurring meeting's details into Calendar's own Email guests dialog, pre-written from the agenda, and cancels that week's meeting when you send.",
};

export default function CouldBeAnEmailPrototype() {
  return (
    <main
      data-gc-page
      className={`${googleSans.variable} ${googleSansFlex.variable}`}
    >
      <h1 className="sr-only">Google Calendar “This could be an email” concept</h1>

      <CalendarApp />

      <style>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: #f8fafd;
          overscroll-behavior: none;
        }

        [data-gc-page] {
          height: 100%;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </main>
  );
}
