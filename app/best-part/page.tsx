"use client";

import { useState } from "react";
import { BestPartPlayer } from "./best-part-player";

export default function BestPartPrototype() {
  const [hasBestPart, setHasBestPart] = useState(true);

  return (
    <main data-bp-page>
      <h1 className="sr-only">Spotify Best Part concept</h1>

      <div data-bp-prototype-stack>
        <BestPartPlayer hasBestPart={hasBestPart} />

        <div data-bp-prototype-control>
          <div data-bp-prototype-control-copy>
            <span data-bp-prototype-control-label>Best part metadata</span>
            <span data-bp-prototype-control-state>
              {hasBestPart ? "Available" : "Unavailable"}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={hasBestPart}
            aria-label="Toggle Best part availability"
            data-bp-prototype-switch
            data-checked={hasBestPart ? "true" : "false"}
            onClick={function toggleBestPart() {
              setHasBestPart(function toggle(current) {
                return !current;
              });
            }}
          >
            <span data-bp-prototype-switch-thumb aria-hidden="true" />
          </button>
        </div>
      </div>

      <style>{`
        :root {
          color-scheme: light;
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

        button {
          font: inherit;
        }

        [data-bp-page] {
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 36px 20px;
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

        [data-bp-prototype-stack] {
          width: min(392px, calc(100vw - 32px));
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 14px;
        }

        [data-bp-prototype-control] {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 7px 8px 7px 12px;
          border: 1px solid rgba(0, 0, 0, 0.075);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.38);
          box-shadow:
            0 1px 1px rgba(255, 255, 255, 0.45) inset,
            0 8px 24px -20px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        [data-bp-prototype-control-copy] {
          min-width: 0;
          display: flex;
          align-items: baseline;
          gap: 7px;
        }

        [data-bp-prototype-control-label] {
          color: #242424;
          font-size: 12px;
          font-weight: 620;
          letter-spacing: -0.01em;
          line-height: 1.2;
        }

        [data-bp-prototype-control-state] {
          color: #777772;
          font-size: 11px;
          font-weight: 510;
          line-height: 1.2;
        }

        [data-bp-prototype-switch] {
          position: relative;
          width: 38px;
          height: 22px;
          flex: 0 0 auto;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: #a8a8a4;
          cursor: pointer;
          touch-action: manipulation;
          transition: background-color 180ms cubic-bezier(0.22, 0.72, 0, 1);
          -webkit-tap-highlight-color: transparent;
        }

        [data-bp-prototype-switch][data-checked="true"] {
          background: #1ed760;
        }

        [data-bp-prototype-switch-thumb] {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transform: translateX(0);
          transition: transform 220ms cubic-bezier(0.22, 0.72, 0, 1);
          will-change: transform;
        }

        [data-bp-prototype-switch][data-checked="true"]
          [data-bp-prototype-switch-thumb] {
          transform: translateX(16px);
        }

        [data-bp-prototype-switch]:focus-visible {
          outline: 2px solid #191919;
          outline-offset: 3px;
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
          [data-bp-page] {
            padding-inline: 16px;
          }

          [data-bp-prototype-stack] {
            width: min(392px, calc(100vw - 32px));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-bp-prototype-switch],
          [data-bp-prototype-switch-thumb] {
            transition-duration: 0.01ms;
          }
        }
      `}</style>
    </main>
  );
}
