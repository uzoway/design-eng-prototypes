import type { Metadata, Viewport } from "next";
import { PendingNote } from "./pending-note";

const description =
  "A LinkedIn concept: spot a typo in the note you sent with a connection request, and fix it in place instead of withdrawing and waiting three weeks.";

/* A page's openGraph and twitter replace the site's rather than merge, so they're complete here. */
const image = {
  url: "/pending-note/og.png",
  width: 2400,
  height: 1260,
  alt: "A concept of LinkedIn's Sent invitations, with the note to Maya just fixed: “design” is highlighted and the note reads Edited.",
};

export const metadata: Metadata = {
  title: "LinkedIn: fix the note on a pending invite",
  description,
  alternates: { canonical: "/pending-note" },
  openGraph: {
    title: "Fix the note on a pending invite: a LinkedIn concept",
    description,
    type: "website",
    url: "/pending-note",
    siteName: "Uzo Okafor",
    locale: "en_US",
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fix the note on a pending invite: a LinkedIn concept",
    description,
    creator: "@uzodev",
    images: [image.url],
  },
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
