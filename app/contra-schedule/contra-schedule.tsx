"use client";

import { useReducedMotion } from "motion/react";
import { useState } from "react";
import { Tabs, type TabId } from "./tabs";
import "./contra-schedule.css";

/** The centre column of Contra's community page: tabs, composer and feed. */
export function ContraSchedule() {
  const reduced = useReducedMotion() ?? false;
  const [tab, setTab] = useState<TabId>("for-you");

  return (
    <div className="cs-column">
      <Tabs tab={tab} reduced={reduced} onSelect={setTab} count={null} />
    </div>
  );
}
