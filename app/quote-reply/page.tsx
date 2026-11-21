import type { Metadata, Viewport } from "next";
import { QuoteReplyChat } from "./quote-reply-chat";

export const metadata: Metadata = {
  title: "WhatsApp: reply to just part of a message",
  description:
    "A WhatsApp concept: select a few words in a long message, tap Reply, and only those words get quoted. Tapping the quote takes you back to that exact sentence.",
};

// The chat reaches under the notch and home indicator on a real phone.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#f6f6f6",
};

/*
 * ?device: the phone recording mode (edge to edge, iPhone safe areas, status
 * bar and keyboard). ?edited: Ada edits her message after it's quoted, to show
 * the fallback. Set before first paint so nothing jumps.
 */
const modes = `
  (() => {
    const params = new URLSearchParams(location.search);
    if (params.has("device")) document.documentElement.setAttribute("data-qr-device-mode", "");
    if (params.has("edited")) document.documentElement.setAttribute("data-qr-edited", "");
  })();
`;

export default function QuoteReplyPrototype() {
  return (
    <main data-qr-page>
      <script dangerouslySetInnerHTML={{ __html: modes }} />
      <h1 className="sr-only">WhatsApp reply-to-selection concept</h1>

      <QuoteReplyChat />

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          min-height: 100%;
          margin: 0;
          background: #d8d8d4;
          color-scheme: light;
        }

        [data-qr-page] {
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

        @media (max-width: 520px) {
          html,
          body,
          [data-qr-page] {
            padding: 0;
            background: #f5f1eb;
          }
        }

        html[data-qr-device-mode],
        html[data-qr-device-mode] body,
        html[data-qr-device-mode] [data-qr-page] {
          padding: 0;
          background: #f5f1eb;
          overflow: hidden;
        }
      `}</style>
    </main>
  );
}
