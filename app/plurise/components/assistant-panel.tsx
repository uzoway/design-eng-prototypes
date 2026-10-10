import {
  Ban,
  Bot,
  Check,
  ChevronRight,
  FileDiff,
  Info,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "../plurise.module.css";
import { unifiedDiff } from "../lib/diff";
import type { TraceEvent } from "../lib/instrumentation";
import {
  AGENT_MESSAGE,
  CANONICAL_AI_PATCH,
  FILE_PATHS,
  INITIAL_CODE,
  TASK_PROMPT,
  type Condition,
} from "../lib/scenario";
import type { PanelTab, PatchState } from "../lib/session-state";
import { DiffPreview } from "./diff-preview";
import { EventStream } from "./event-stream";
import { AgentMark } from "./marks";
import { QUICK, SPRING } from "./motion";

// Computed once from the one canonical patch, so both conditions show the
// same rows and the label can never drift from what the diff contains.
const PATCH_DIFF = unifiedDiff(INITIAL_CODE, CANONICAL_AI_PATCH);
const DIFF_LINES = PATCH_DIFF.additions + PATCH_DIFF.deletions;
const FILE = FILE_PATHS["retry.ts"];

type CardCopy = { title: string; chip: string; chipIcon: typeof Check; toggle: string; footer: string };

function cardCopy(condition: Condition, patchState: PatchState): CardCopy {
  if (condition === "agent-applied") {
    return {
      title: `Updated ${FILE}`,
      chip: "Applied automatically",
      chipIcon: Bot,
      toggle: "View applied diff",
      footer: "The change entered the working file before this message was shown.",
    };
  }

  if (patchState === "applied") {
    return {
      title: "Change applied",
      chip: "Applied by you",
      chipIcon: Check,
      toggle: `Review ${DIFF_LINES}-line diff`,
      footer: "You applied this change to the working file.",
    };
  }

  return {
    title: patchState === "dismissed" ? "Suggestion dismissed" : "Suggested change ready",
    chip: patchState === "dismissed" ? "Dismissed" : "Awaiting your decision",
    chipIcon: patchState === "dismissed" ? Ban : Info,
    toggle: `Review ${DIFF_LINES}-line diff`,
    footer: "The working file remains unchanged.",
  };
}

function PatchCard({
  condition,
  patchState,
  diffOpen,
  hasManualEdits,
  reducedMotion,
  onToggleDiff,
  onApply,
  onDismiss,
}: {
  condition: Condition;
  patchState: PatchState;
  diffOpen: boolean;
  hasManualEdits: boolean;
  reducedMotion: boolean;
  onToggleDiff: () => void;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const applyRef = useRef<HTMLButtonElement>(null);
  const copy = cardCopy(condition, patchState);
  const ChipIcon = copy.chipIcon;
  const gated = condition === "human-gated" && patchState !== "applied";

  useEffect(() => {
    if (confirming) {
      confirmRef.current?.focus();
    }
  }, [confirming]);

  const requestApply = () => {
    // Never overwrite manual work silently.
    if (hasManualEdits) {
      setConfirming(true);
    } else {
      onApply();
    }
  };

  return (
    <div className={styles.patchCard} data-state={condition === "agent-applied" ? "agent" : patchState}>
      <div className={styles.patchHead}>
        <span className={styles.patchIcon} aria-hidden="true">
          <FileDiff />
        </span>
        <div className={styles.patchHeadText}>
          <AnimatePresence initial={false} mode="wait">
            <motion.p
              key={copy.title}
              className={styles.patchTitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={QUICK}
            >
              {copy.title}
            </motion.p>
          </AnimatePresence>
          <p className={styles.patchMeta}>
            <span>{FILE}</span>
            <span aria-hidden="true">·</span>
            <span>1 file</span>
            <span aria-hidden="true">·</span>
            <span className={styles.diffAdd}>+{PATCH_DIFF.additions}</span>
            <span className={styles.diffDel}>−{PATCH_DIFF.deletions}</span>
          </p>
        </div>
      </div>

      <p className={styles.patchChip} data-state={condition === "agent-applied" ? "agent" : patchState}>
        <ChipIcon aria-hidden="true" />
        {copy.chip}
      </p>

      <button
        type="button"
        className={styles.diffToggle}
        aria-expanded={diffOpen}
        aria-controls="patch-diff"
        onClick={onToggleDiff}
      >
        <ChevronRight className={styles.diffChevron} aria-hidden="true" />
        {copy.toggle}
      </button>

      <AnimatePresence initial={false}>
        {diffOpen ? (
          <motion.div
            key="diff"
            className={styles.diffReveal}
            initial={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reducedMotion ? QUICK : SPRING}
          >
            <DiffPreview
              id="patch-diff"
              file={FILE}
              rows={PATCH_DIFF.rows}
              additions={PATCH_DIFF.additions}
              deletions={PATCH_DIFF.deletions}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {gated ? (
        confirming ? (
          <div className={styles.patchConfirm} role="group" aria-labelledby="confirm-copy">
            <p id="confirm-copy">
              <TriangleAlert aria-hidden="true" />
              Applying replaces your edits to {FILE}.
            </p>
            <div className={styles.patchActions}>
              <button
                ref={confirmRef}
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setConfirming(false);
                  onApply();
                }}
              >
                Replace and apply
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setConfirming(false);
                  requestAnimationFrame(() => applyRef.current?.focus());
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : patchState === "ready" ? (
          <div className={styles.patchActions}>
            <button ref={applyRef} type="button" className={styles.primaryButton} onClick={requestApply}>
              Apply patch
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        ) : (
          <div className={styles.patchActions}>
            <button ref={applyRef} type="button" className={styles.secondaryButton} onClick={requestApply}>
              Apply dismissed patch
            </button>
          </div>
        )
      ) : null}

      <p className={styles.patchFoot}>{copy.footer}</p>
    </div>
  );
}

export function AssistantPanel({
  sessionId,
  condition,
  patchState,
  diffOpen,
  hasManualEdits,
  tab,
  events,
  reducedMotion,
  onTab,
  onToggleDiff,
  onApply,
  onDismiss,
}: {
  sessionId: string;
  condition: Condition;
  patchState: PatchState;
  diffOpen: boolean;
  hasManualEdits: boolean;
  tab: PanelTab;
  events: TraceEvent[];
  reducedMotion: boolean;
  onTab: (tab: PanelTab) => void;
  onToggleDiff: () => void;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const tabs: { id: PanelTab; label: string }[] = [
    { id: "assistant", label: "Assistant" },
    { id: "events", label: "Events" },
  ];

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }

    event.preventDefault();

    const next: PanelTab =
      event.key === "Home" ? "assistant" : event.key === "End" ? "events" : tab === "assistant" ? "events" : "assistant";

    onTab(next);
    document.getElementById(`panel-tab-${next}`)?.focus();
  };

  // Identical entrance in both conditions: only the words differ.
  const enter = (step: number) =>
    reducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.12 } }
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { ...SPRING, delay: 0.08 + step * 0.12 },
        };

  return (
    <aside className={styles.panel} aria-label="AI assistant">
      <div className={styles.panelTabs} role="tablist" aria-label="Side panel">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            id={`panel-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={styles.panelTab}
            onClick={() => onTab(id)}
            onKeyDown={onTabKey}
          >
            {id === "assistant" ? <AgentMark /> : null}
            {label}
            {id === "events" ? (
              <span className={styles.countBadge}>
                <span className={styles.srOnly}>, </span>
                {events.length}
                <span className={styles.srOnly}> captured</span>
              </span>
            ) : null}
            {tab === id ? (
              <motion.span
                layoutId="panel-tab-indicator"
                className={styles.panelTabIndicator}
                transition={reducedMotion ? { duration: 0 } : SPRING}
              />
            ) : null}
          </button>
        ))}
      </div>

      <div
        id="panel-assistant"
        role="tabpanel"
        aria-labelledby="panel-tab-assistant"
        className={styles.panelBody}
        hidden={tab !== "assistant"}
      >
        <div key={sessionId} className={styles.thread}>
          <motion.div className={styles.message} {...enter(0)}>
            <p className={styles.messageAuthor}>
              <span className={styles.userAvatar} aria-hidden="true">
                <UserRound />
              </span>
              You
            </p>
            <p className={styles.messageText}>{TASK_PROMPT}</p>
          </motion.div>

          <motion.div className={styles.message} {...enter(1)}>
            <p className={styles.messageAuthor}>
              <AgentMark />
              PLURISE agent
            </p>
            <p className={styles.messageText}>{AGENT_MESSAGE[condition]}</p>
          </motion.div>

          <motion.div {...enter(2)}>
            <PatchCard
              condition={condition}
              patchState={patchState}
              diffOpen={diffOpen}
              hasManualEdits={hasManualEdits}
              reducedMotion={reducedMotion}
              onToggleDiff={onToggleDiff}
              onApply={onApply}
              onDismiss={onDismiss}
            />
          </motion.div>
        </div>
      </div>

      <div
        id="panel-events"
        role="tabpanel"
        aria-labelledby="panel-tab-events"
        className={styles.panelBody}
        hidden={tab !== "events"}
      >
        <EventStream events={events} reducedMotion={reducedMotion} />
      </div>
    </aside>
  );
}
