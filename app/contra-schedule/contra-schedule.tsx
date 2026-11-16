"use client";

import { useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { Composer, type ComposerHandle } from "./composer";
import { Tabs, type TabId } from "./tabs";
import { useNow } from "./use-now";
import "./contra-schedule.css";

/** The centre column of Contra's community page: tabs, composer and feed. */
export function ContraSchedule() {
  const reduced = useReducedMotion() ?? false;
  const now = useNow();
  const [tab, setTab] = useState<TabId>("for-you");
  const [draftAt, setDraftAt] = useState<number | null>(null);

  const composerRef = useRef<ComposerHandle>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  return (
    <div className="cs-column">
      <Tabs tab={tab} reduced={reduced} onSelect={setTab} count={null} />

      <Composer
        ref={composerRef}
        at={draftAt}
        now={now}
        reduced={reduced}
        popoverOpen={false}
        popoverRef={popoverRef}
        onOpenSchedule={() => {}}
        onClearSchedule={() => setDraftAt(null)}
        onSubmit={() => setDraftAt(null)}
      />
    </div>
  );
}
