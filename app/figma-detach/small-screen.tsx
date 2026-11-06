"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { FigmaMark } from "./icons";
import { ThemeToggle } from "./theme-toggle";

export const SMALL_QUERY = "(max-width: 899px)";

function subscribeSmall(listener: () => void) {
  const query = window.matchMedia(SMALL_QUERY);

  query.addEventListener("change", listener);

  return () => query.removeEventListener("change", listener);
}

const getSmall = () => window.matchMedia(SMALL_QUERY).matches;
const getServerSmall = () => false;

/**
 * Figma isn't a phone app, so phones get an honest note and a silent clip of
 * the flow instead of a squeezed editor. With reduced motion the clip waits
 * to be played.
 */
export function SmallScreen() {
  const reducedMotion = useReducedMotion() ?? false;
  // The clip only loads where it's shown, so laptops never download it.
  const small = useSyncExternalStore(subscribeSmall, getSmall, getServerSmall);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (reducedMotion) video.pause();
    else video.play().catch(() => {});
  }, [reducedMotion, small]);

  return (
    <section className="fd-small" aria-labelledby="fd-small-title">
      <div className="fd-small-top">
        <FigmaMark className="fd-small-mark" />
        <ThemeToggle />
      </div>

      <h2 className="fd-small-title" id="fd-small-title">
        Best on a bigger screen
      </h2>
      <p className="fd-small-text">
        This is a concept for Figma’s editor, and the editor needs room. Open it on a laptop to detach a component
        yourself. Here’s the flow in 15 seconds.
      </p>

      <figure className="fd-small-clip">
        {small && (
          <video
            ref={videoRef}
            src="/figma-detach/flow.mp4"
            poster="/figma-detach/flow.jpg"
            width={704}
            height={1290}
            muted
            loop
            playsInline
            autoPlay={!reducedMotion}
            controls={reducedMotion}
            preload="metadata"
            aria-describedby="fd-small-caption"
          />
        )}
        <figcaption id="fd-small-caption">
          Detaching Orbit’s Button. Figma asks why, the reason goes to the Orbit team, and their library analytics show
          it next to everyone else’s.
        </figcaption>
      </figure>

      <p className="fd-small-text">
        Today Figma counts detaches per component but never records why. This popover asks once, never blocks the
        detach, and gives design system teams the reasons grouped by component.
      </p>

      <p className="fd-small-note">A concept by Uzo Okafor. Not affiliated with Figma.</p>
    </section>
  );
}
