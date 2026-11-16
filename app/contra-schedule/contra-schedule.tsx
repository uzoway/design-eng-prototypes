"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Composer, type ComposerHandle } from "./composer";
import { SchedulePopover } from "./schedule-popover";
import { Tabs, type TabId } from "./tabs";
import { useNow } from "./use-now";
import "./contra-schedule.css";

/** What the schedule popover is setting a time for, and the control it opened from. */
type Popover = { anchor: HTMLElement; target: { kind: "draft" } | { kind: "post"; id: string } };

/** The centre column of Contra's community page: tabs, composer and feed. */
export function ContraSchedule() {
  const reduced = useReducedMotion() ?? false;
  const now = useNow();
  const [tab, setTab] = useState<TabId>("for-you");
  const [draftAt, setDraftAt] = useState<number | null>(null);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [column, setColumn] = useState<HTMLDivElement | null>(null);

  const composerRef = useRef<ComposerHandle>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  /** Opens the popover from a control, or closes it if that control already has it open. */
  function toggle(anchor: HTMLElement | null, target: Popover["target"]) {
    if (!anchor) return;

    setPopover((current) => (current?.anchor === anchor ? null : { anchor, target }));
  }

  /* The open popover, readable from callbacks without making them change identity. */
  const popoverNow = useRef(popover);

  useEffect(() => {
    popoverNow.current = popover;
  }, [popover]);

  const close = useCallback((reason: "escape" | "outside" | "picked") => {
    const current = popoverNow.current;

    setPopover(null);

    // Escape and a pick hand focus back to where the popover came from.
    if (current && reason !== "outside") {
      // By the next frame a chip that was removed is gone, and one that was added exists.
      requestAnimationFrame(() => {
        const anchor = current.anchor.isConnected ? current.anchor : composerRef.current?.clock;

        anchor?.focus({ preventScroll: true });
      });
    }
  }, []);

  return (
    <div ref={setColumn} className="cs-column">
      <Tabs tab={tab} reduced={reduced} onSelect={setTab} count={null} />

      <Composer
        ref={composerRef}
        at={draftAt}
        now={now}
        reduced={reduced}
        popoverOpen={popover?.target.kind === "draft"}
        popoverRef={popoverRef}
        onOpenSchedule={(from) => toggle(composerRef.current?.[from] ?? null, { kind: "draft" })}
        onClearSchedule={() => setDraftAt(null)}
        onSubmit={() => setDraftAt(null)}
      />

      <AnimatePresence>
        {popover && column && now !== null && (
          <SchedulePopover
            key="schedule"
            ref={popoverRef}
            anchor={popover.anchor}
            container={column}
            mode={popover.target.kind === "draft" ? "new" : "reschedule"}
            value={draftAt}
            now={now}
            reduced={reduced}
            onPick={(at) => {
              setDraftAt(at);
              close("picked");
            }}
            onRemove={() => {
              setDraftAt(null);
              close("picked");
            }}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
