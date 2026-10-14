import { HomeviewClock } from "./homeview-clock";

export default function HomeviewClockPrototype() {
  return (
    <main data-hv-page>
      <h1 className="sr-only">Apple Homeview clock customization, rebuilt</h1>

      <HomeviewClock />

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

        [data-hv-page] {
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 24px 16px;
          overflow-x: clip;
          background:
            radial-gradient(
              72% 58% at 50% 34%,
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
      `}</style>
    </main>
  );
}
