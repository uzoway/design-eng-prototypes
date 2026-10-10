import type { Metadata, Viewport } from "next";
import PluriseLab from "./plurise-lab";

export const metadata: Metadata = {
  title: "PLURISE — Research prototype",
  description:
    "A researcher demo of a study instrument: the same AI patch, either proposed to the developer or applied by an agent, with a local behavioural trace.",
  alternates: { canonical: "/plurise" },
};

export const viewport: Viewport = {
  themeColor: "#08090c",
  colorScheme: "dark",
};

export default function PlurisePage() {
  return <PluriseLab />;
}
