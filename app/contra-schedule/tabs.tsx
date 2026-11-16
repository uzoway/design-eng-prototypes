"use client";

import { motion } from "motion/react";
import { ClockIcon, SearchIcon } from "./icons";

export type TabId = "for-you" | "scheduled";

/** The pill's glide: about 300ms, no bounce. */
const GLIDE = { type: "spring", visualDuration: 0.3, bounce: 0 } as const;

function Pill({ reduced }: { reduced: boolean }) {
  return (
    <motion.span
      layoutId="cs-tab-pill"
      className="cs-tab-pill"
      // Motion keeps the corners round while the pill changes width.
      style={{ borderRadius: 32 }}
      transition={reduced ? { duration: 0 } : GLIDE}
    />
  );
}

/**
 * Contra's feed tabs, with Scheduled added after Topics. Topics is drawn as
 * Contra draws it but goes nowhere here.
 */
export function Tabs({
  tab,
  reduced,
  onSelect,
  count,
}: {
  tab: TabId;
  reduced: boolean;
  onSelect: (tab: TabId) => void;
  /** The Scheduled tab's count pill. */
  count: React.ReactNode;
}) {
  return (
    <nav className="cs-tabs" aria-label="Community feeds">
      <button
        type="button"
        className="cs-tab"
        aria-current={tab === "for-you" ? "page" : undefined}
        onClick={() => onSelect("for-you")}
      >
        {tab === "for-you" && <Pill reduced={reduced} />}
        <span className="cs-tab-content">For you</span>
      </button>

      <button type="button" className="cs-tab" aria-disabled="true">
        <span className="cs-tab-content">
          <SearchIcon />
          Topics
        </span>
      </button>

      <button
        type="button"
        className="cs-tab"
        aria-current={tab === "scheduled" ? "page" : undefined}
        onClick={() => onSelect("scheduled")}
      >
        {tab === "scheduled" && <Pill reduced={reduced} />}
        <span className="cs-tab-content">
          <ClockIcon />
          Scheduled
          {count}
        </span>
      </button>
    </nav>
  );
}
