import type { Metadata } from "next";
import { VoiceNoteChat } from "./voice-note-chat";

export const metadata: Metadata = {
  title: "WhatsApp: tap a word to hear it",
  description:
    "A WhatsApp concept where the voice note transcript becomes the scrubber. Tap any word to play from it; the words light up as it plays.",
};

export default function VoiceNotePrototype() {
  return (
    <main data-vn-page>
      <h1 className="sr-only">WhatsApp voice note transcript concept</h1>

      <VoiceNoteChat />

      <style>{`
        :root {
          color-scheme: light dark;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          min-height: 100%;
          margin: 0;
          background: #d8d8d4;
        }

        [data-vn-page] {
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 32px 20px 24px;
          background:
            radial-gradient(
              72% 58% at 50% 30%,
              rgba(255, 255, 255, 0.72) 0%,
              rgba(238, 238, 234, 0.74) 52%,
              rgba(216, 216, 212, 0) 100%
            ),
            #d8d8d4;
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Text",
            "Helvetica Neue",
            sans-serif;
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

        @media (prefers-color-scheme: dark) {
          html,
          body {
            background: #161616;
          }

          [data-vn-page] {
            background:
              radial-gradient(
                72% 58% at 50% 30%,
                rgba(255, 255, 255, 0.06) 0%,
                rgba(255, 255, 255, 0.02) 52%,
                rgba(0, 0, 0, 0) 100%
              ),
              #161616;
          }
        }

        @media (max-width: 520px) {
          html,
          body {
            background: #f5f1eb;
          }

          [data-vn-page] {
            padding: 0;
            background: #f5f1eb;
          }
        }

        @media (max-width: 520px) and (prefers-color-scheme: dark) {
          html,
          body,
          [data-vn-page] {
            background: #0b0b0b;
          }
        }
      `}</style>
    </main>
  );
}
