"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Composer, type ComposerHandle, type Draft } from "./composer";
import { Count } from "./count";
import { ForYou, Scheduled } from "./feed";
import { formatCount, formatWhenInline } from "./schedule";
import { SchedulePopover } from "./schedule-popover";
import { compose, feedPosts, queuedPosts, reducer, type Post } from "./state";
import { Tabs, type TabId } from "./tabs";
import { Toast, type ToastState } from "./toast";
import { readNow, useNow } from "./use-now";
import "./contra-schedule.css";

/** What the schedule popover is setting a time for, and the control it opened from. */
type Target = { anchor: HTMLElement; draft: true; id?: undefined } | { anchor: HTMLElement; draft: false; id: string };
type Popover = Target & { openId: number };

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

let toasts = 0;

/** The centre column of Contra's community page: tabs, composer and feed. */
export function ContraSchedule() {
  const reduced = useReducedMotion() ?? false;
  const now = useNow();
  const [state, dispatch] = useReducer(reducer, { posts: [] });
  const [seeded, setSeeded] = useState(false);
  const [tab, setTab] = useState<TabId>("for-you");
  const [draftAt, setDraftAt] = useState<number | null>(null);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [column, setColumn] = useState<HTMLDivElement | null>(null);

  const composerRef = useRef<ComposerHandle>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  /*
   * The posts are seeded once the clock is known, which is only on the
   * client: their times are relative to the moment the page opens.
   */
  if (now !== null && !seeded) {
    setSeeded(true);
    dispatch({ type: "seed", now });
  }

  // What's out and what's waiting are worked out from the time, so a post goes live by itself.
  const feed = now === null ? [] : feedPosts(state.posts, now);
  const queue = now === null ? [] : queuedPosts(state.posts, now);

  // A post that went out while its reschedule popover was open takes the popover with it.
  const open = popover && (popover.draft || queue.some((post) => post.id === popover.id)) ? popover : null;
  const rescheduled = open && !open.draft ? (queue.find((post) => post.id === open.id) ?? null) : null;

  /* ------------------------------------------------------------------------ */
  /* Popover                                                                  */
  /* ------------------------------------------------------------------------ */

  const opens = useRef(0);

  /* The open popover, readable from callbacks without making them change identity. */
  const popoverNow = useRef(popover);

  useEffect(() => {
    popoverNow.current = popover;
  }, [popover]);

  const close = useCallback((reason: "escape" | "outside" | "picked" | "removed") => {
    const current = popoverNow.current;

    setPopover(null);

    // Escape and a pick hand focus back to where the popover came from.
    if (current && reason !== "outside") {
      // A frame later: by then a chip that was just added exists, and inert states have cleared.
      requestAnimationFrame(() => {
        const composer = composerRef.current;
        // A chip that's been removed is still in the page while it fades, but it's no place for focus.
        // And on a phone the clock steps aside once a time is set, so focus goes to the chip in its place.
        const candidates =
          reason === "removed" ? [composer?.clock] : [current.anchor, composer?.chip, composer?.clock];
        const next = candidates.find((node) => node && node.isConnected && !node.closest("[inert]"));

        next?.focus({ preventScroll: true });
      });
    }
  }, []);

  /** Opens the popover from a control, or closes it if that control already has it open. */
  function toggle(next: Target | null) {
    if (!next) return;

    if (popoverNow.current?.anchor === next.anchor) {
      // Closed by the control that opened it: focus goes back there, as with Escape.
      close("escape");

      return;
    }

    opens.current += 1;
    setPopover({ ...next, openId: opens.current });
  }

  /* ------------------------------------------------------------------------ */
  /* Toasts and tabs                                                          */
  /* ------------------------------------------------------------------------ */

  function show(text: string, action?: { label: string; run: () => void }, leadsTo?: TabId) {
    toasts += 1;
    setToast({ id: toasts, text, action, leadsTo });
  }

  const dismiss = useCallback((id: number) => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);

  function select(next: TabId) {
    setTab(next);
    // The queue's popover belongs to a post that's about to leave the screen.
    setPopover((current) => (current && !current.draft ? null : current));
    // A toast offering to take you there has nothing left to offer.
    setToast((current) => (current?.leadsTo === next ? null : current));
  }

  /** "View" on a toast: go to the tab, and put focus on it so the keyboard follows. */
  function view(next: TabId) {
    select(next);
    column?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------------ */
  /* Posting and the queue                                                    */
  /* ------------------------------------------------------------------------ */

  function submit(draft: Draft) {
    const time = readNow();

    if (draftAt !== null && draftAt > time) {
      dispatch({ type: "add", post: compose(draft.text, draftAt, "scheduled", draft.image) });
      show(
        `Scheduled for ${formatWhenInline(draftAt, time)}`,
        tab === "scheduled" ? undefined : { label: "View", run: () => view("scheduled") },
        "scheduled",
      );
    } else {
      dispatch({ type: "add", post: compose(draft.text, time, "posted", draft.image) });
      // You left the composer open past the time you'd picked: it goes out now, and says so.
      show(
        draftAt !== null ? "That time had passed, so it went out now" : "Posted",
        tab === "for-you" ? undefined : { label: "View", run: () => view("for-you") },
        "for-you",
      );
    }

    setDraftAt(null);
    setPopover(null);
  }

  /** After a queued post leaves, focus goes to the next one, or to the tab if it was the last. */
  function refocusQueue(id: string) {
    const items = [...(column?.querySelectorAll<HTMLElement>("[data-queued]") ?? [])];
    const index = items.findIndex((item) => item.dataset.queued === id);
    const next = items[index + 1] ?? items[index - 1];
    const stop =
      next?.querySelector<HTMLElement>(".cs-chip-main") ?? column?.querySelector<HTMLElement>('[data-tab="scheduled"]');

    stop?.focus({ preventScroll: true });
  }

  function postNow(post: Post) {
    refocusQueue(post.id);
    dispatch({ type: "post-now", id: post.id, now: readNow() });
    show("Posted", { label: "View", run: () => view("for-you") }, "for-you");
  }

  function remove(post: Post) {
    refocusQueue(post.id);
    dispatch({ type: "delete", id: post.id });
    show("Scheduled post deleted", {
      label: "Undo",
      run: () => {
        dispatch({ type: "add", post });
        setToast(null);
      },
    });
  }

  const count = queue.length;

  return (
    <div ref={setColumn} className="cs-column">
      <Tabs
        tab={tab}
        reduced={reduced}
        onSelect={select}
        scheduledLabel={count === 0 ? "Scheduled" : `Scheduled, ${count} ${count === 1 ? "post" : "posts"}`}
        count={
          <AnimatePresence initial={false}>
            {count > 0 && (
              <motion.span
                key="count"
                className="cs-tab-count"
                initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(0.9)" }}
                animate={{ opacity: 1, transform: "scale(1)", transition: { duration: 0.2, ease: EASE_OUT } }}
                exit={
                  reduced
                    ? { opacity: 0, transition: { duration: 0.12 } }
                    : { opacity: 0, transform: "scale(0.9)", transition: { duration: 0.12, ease: EASE_OUT } }
                }
              >
                <Count value={count} label={formatCount(count)} reduced={reduced} />
              </motion.span>
            )}
          </AnimatePresence>
        }
      />

      <Composer
        ref={composerRef}
        at={draftAt}
        now={now}
        reduced={reduced}
        popoverOpen={open?.draft === true}
        popoverRef={popoverRef}
        onOpenSchedule={(from) => {
          const anchor = composerRef.current?.[from];

          toggle(anchor ? { anchor, draft: true } : null);
        }}
        onClearSchedule={() => setDraftAt(null)}
        onSubmit={submit}
      />

      {now !== null &&
        (tab === "for-you" ? (
          <ForYou posts={feed} now={now} reduced={reduced} onLike={(id) => dispatch({ type: "like", id })} />
        ) : (
          <Scheduled
            posts={queue}
            now={now}
            reduced={reduced}
            reschedulingId={open && !open.draft ? open.id : null}
            onReschedule={(post, anchor) => toggle({ anchor, draft: false, id: post.id })}
            onPostNow={postNow}
            onDelete={remove}
          />
        ))}

      <AnimatePresence>
        {open && column && now !== null && (
          <SchedulePopover
            key="schedule"
            ref={popoverRef}
            anchor={open.anchor}
            container={column}
            openId={open.openId}
            mode={open.draft ? "new" : "reschedule"}
            value={open.draft ? draftAt : (rescheduled?.at ?? null)}
            now={now}
            reduced={reduced}
            onPick={(at) => {
              if (open.draft) setDraftAt(at);
              else dispatch({ type: "reschedule", id: open.id, at });

              close("picked");
            }}
            onRemove={() => {
              setDraftAt(null);
              close("removed");
            }}
            onClose={close}
          />
        )}
      </AnimatePresence>

      <Toast toast={toast} reduced={reduced} onDone={dismiss} />
    </div>
  );
}
