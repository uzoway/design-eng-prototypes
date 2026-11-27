import type { Metadata, Viewport } from "next";
import { PendingNote } from "./pending-note";

export const metadata: Metadata = {
  title: "LinkedIn: fix the note on a pending invite",
  description:
    "A LinkedIn concept: spot a typo in the note you sent with a connection request, and fix it in place instead of withdrawing and waiting three weeks.",
  alternates: { canonical: "/pending-note" },
};

// The phone screens reach under the notch and the home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#ffffff",
};

/*
 * ?device: the phone recording mode (edge to edge, iPhone safe areas, status
 * bar and keyboard). ?expire: Maya's window closes 20 seconds after load.
 * ?free: the 200-character limit. ?profile: start on Maya's profile.
 * Set before first paint so nothing jumps.
 */
const modes = `
  (() => {
    const params = new URLSearchParams(location.search);
    const html = document.documentElement;
    for (const flag of ["device", "expire", "free", "profile"]) {
      if (params.has(flag)) html.setAttribute("data-pn-" + flag, "");
    }
  })();
`;

export default function PendingNotePrototype() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: modes }} />
      <PendingNote />
      <style>{`
        html,
        body {
          margin: 0;
          background: #f4f2ee;
          color-scheme: light;
        }

        html[data-pn-device],
        html[data-pn-device] body {
          background: #fff;
          overflow: hidden;
        }

        @media (max-width: 640px) {
          html,
          body {
            background: #fff;
          }
        }
      `}</style>
    </>
  );
}
