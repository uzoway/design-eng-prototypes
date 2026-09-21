"use client";

import { useCallback, useState } from "react";
import {
  ReliableUpload,
  type MotionMode,
  type NetworkMode,
} from "./reliable-upload";

const NETWORK_MODES: {
  id: NetworkMode;
  label: string;
}[] = [
  {
    id: "normal",
    label: "Normal",
  },
  {
    id: "slow",
    label: "Slow",
  },
  {
    id: "offline",
    label: "Offline",
  },
];

const MOTION_MODES: {
  id: MotionMode;
  label: string;
}[] = [
  {
    id: "auto",
    label: "Auto",
  },
  {
    id: "full",
    label: "Full",
  },
  {
    id: "reduced",
    label: "Reduced",
  },
];

function PrototypeControls({
  networkMode,
  motionMode,
  failNextArmed,
  onNetworkChange,
  onMotionChange,
  onFailNext,
}: {
  networkMode: NetworkMode;
  motionMode: MotionMode;
  failNextArmed: boolean;
  onNetworkChange: (mode: NetworkMode) => void;
  onMotionChange: (mode: MotionMode) => void;
  onFailNext: () => void;
}) {
  return (
    <div data-prototype-controls aria-label="Prototype controls">
      <div data-control-row role="radiogroup" aria-label="Network condition">
        <span data-control-label>Network</span>

        <div data-control-options>
          {NETWORK_MODES.map(function renderMode(mode) {
            const active = networkMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-active={active ? "true" : "false"}
                onClick={function handleClick() {
                  onNetworkChange(mode.id);
                }}
              >
                {mode.label}
              </button>
            );
          })}

          <button
            type="button"
            data-active={failNextArmed ? "true" : "false"}
            aria-pressed={failNextArmed}
            onClick={onFailNext}
          >
            {failNextArmed ? "Fail armed" : "Fail next"}
          </button>
        </div>
      </div>

      <div data-control-row role="radiogroup" aria-label="Motion preference">
        <span data-control-label>Motion</span>

        <div data-control-options>
          {MOTION_MODES.map(function renderMode(mode) {
            const active = motionMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-active={active ? "true" : "false"}
                onClick={function handleClick() {
                  onMotionChange(mode.id);
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ReliableUploadPrototype() {
  const [networkMode, setNetworkMode] = useState<NetworkMode>("normal");

  const [motionMode, setMotionMode] = useState<MotionMode>("auto");

  const [failNextArmed, setFailNextArmed] = useState(false);

  const consumeFailNext = useCallback(function consumeFailNext() {
    setFailNextArmed(false);
  }, []);

  return (
    <main data-prototype-page>
      <h1 className="sr-only">Reliable file upload prototype</h1>

      <div data-prototype-stage>
        <ReliableUpload
          networkMode={networkMode}
          motionMode={motionMode}
          failNextArmed={failNextArmed}
          onFailNextConsumed={consumeFailNext}
        />

        <PrototypeControls
          networkMode={networkMode}
          motionMode={motionMode}
          failNextArmed={failNextArmed}
          onNetworkChange={setNetworkMode}
          onMotionChange={setMotionMode}
          onFailNext={function handleFailNext() {
            setFailNextArmed(true);
          }}
        />
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
          background: #e7e7e4;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        [data-prototype-page] {
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 32px 20px;
          color: #20201e;
          background: #e7e7e4;
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Text",
            "Helvetica Neue",
            sans-serif;
          -webkit-font-smoothing:
            antialiased;
          -moz-osx-font-smoothing:
            grayscale;
        }

        [data-prototype-stage] {
          width: min(
            100%,
            580px
          );
          display: grid;
          gap: 28px;
        }

        [data-prototype-controls] {
          display: grid;
          justify-content: center;
          gap: 6px;
          color: #666662;
          font-size: 9px;
          font-weight: 540;
          line-height: 1;
          user-select: none;
          -webkit-user-select: none;
        }

        [data-control-row] {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        [data-control-label] {
          width: 46px;
          color: #777773;
          text-align: right;
        }

        [data-control-options] {
          display: flex;
          gap: 2px;
          padding: 2px;
          border: 1px solid
            rgba(
              0,
              0,
              0,
              0.05
            );
          border-radius: 9px;
          background:
            rgba(
              247,
              247,
              245,
              0.52
            );
          box-shadow:
            inset
              0 1px 0
              rgba(
                255,
                255,
                255,
                0.55
              );
          backdrop-filter:
            blur(14px);
          -webkit-backdrop-filter:
            blur(14px);
        }

        [data-control-options]
          button {
          min-width: 44px;
          min-height: 24px;
          padding: 0 7px;
          border: 0;
          border-radius: 7px;
          color: #747470;
          background: transparent;
          font-size: 9px;
          font-weight: 560;
          line-height: 1;
          touch-action:
            manipulation;
          -webkit-tap-highlight-color:
            transparent;
        }

        [data-control-options]
          button[data-active="true"] {
          color: #292927;
          background:
            rgba(
              255,
              255,
              255,
              0.82
            );
          box-shadow:
            0 0 0 0.5px
              rgba(
                0,
                0,
                0,
                0.05
              ),
            0 1px 2px
              rgba(
                0,
                0,
                0,
                0.04
              );
        }

        [data-control-options]
          button:focus-visible {
          outline:
            2px solid
            #20201e;
          outline-offset: 2px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(
            0,
            0,
            0,
            0
          );
          white-space: nowrap;
          border: 0;
        }

        @media (
          max-width: 520px
        ) {
          [data-prototype-page] {
            padding-inline: 16px;
          }

          [data-prototype-stage] {
            gap: 22px;
          }

          [data-control-label] {
            display: none;
          }
        }

        @media (
          forced-colors:
            active
        ) {
          [data-control-options] {
            border:
              1px solid
              ButtonText;
          }
        }
      `}</style>
    </main>
  );
}
