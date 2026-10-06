import { TwoStreamsPhone } from "./two-streams-phone";

export default function TwoStreamsPrototype() {
  return (
    <main data-tsm-page>
      <h1 className="sr-only">Spotify Two Streams concept</h1>

      <TwoStreamsPhone />

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

        [data-tsm-page] {
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

        @media (max-width: 520px) {
          html,
          body {
            background: #121212;
          }

          [data-tsm-page] {
            padding: 0;
            background: #121212;
          }
        }
      `}</style>
    </main>
  );
}
