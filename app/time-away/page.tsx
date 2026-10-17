import type { Metadata } from "next";
import { ThemeToggle } from "./theme-toggle";
import { TimeAway } from "./time-away";

export const metadata: Metadata = {
  title: "Time away",
  description:
    "A concept for GitHub: mark the gaps in your contribution graph as time away.",
};

export default function TimeAwayPrototype() {
  return (
    <main data-ta-page>
      <h1 className="ta-page-title">Time away on the contribution graph</h1>

      <ThemeToggle />

      <div className="ta-stage">
        <TimeAway />
      </div>

      <p className="ta-page-note">A concept by Uzo Okafor. Not affiliated with GitHub.</p>

      <style>{`
        html,
        body {
          min-height: 100%;
          margin: 0;
          background: #ffffff;
        }

        html[data-theme="dark"],
        html[data-theme="dark"] body {
          background: #0d1117;
        }
      `}</style>
    </main>
  );
}
