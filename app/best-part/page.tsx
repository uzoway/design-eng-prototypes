import { BestPartPlayer } from "./best-part-player";

export default function BestPartPrototype() {
  return (
    <main data-bp-page>
      <h1 className="sr-only">Spotify Best Part concept</h1>

      <BestPartPlayer />

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
          background: #ddddda;
        }

        button,
        input {
          font: inherit;
        }

        [data-bp-page] {
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 36px 20px;
          background: radial-gradient(
            90% 68% at 50% 35%,
            #eeeeeb 0%,
            #dfdfdc 58%,
            #d4d4d0 100%
          );
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
          clip: rect(0 0 0 0);
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }

        @media (max-width: 32.5rem) {
          [data-bp-page] {
            padding-inline: 16px;
          }
        }
      `}</style>
    </main>
  );
}
