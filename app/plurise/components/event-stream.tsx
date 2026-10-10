import { Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import styles from "../plurise.module.css";
import { formatClock, type TraceEvent } from "../lib/instrumentation";
import { QUICK } from "./motion";

export const EventStream = memo(function EventStream({
  events,
  reducedMotion,
}: {
  events: TraceEvent[];
  reducedMotion: boolean;
}) {
  const newestFirst = [...events].reverse();

  return (
    <div className={styles.events}>
      <p className={styles.eventsNotice}>
        <Lock aria-hidden="true" />
        Stored in this browser tab only. Nothing is sent or persisted to a server.
      </p>

      <ol className={styles.eventList} aria-label="Captured events, newest first">
        <AnimatePresence initial={false}>
          {newestFirst.map((event) => (
            <motion.li
              key={event.sequence}
              className={styles.eventItem}
              data-actor={event.actor}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={QUICK}
            >
              <span className={styles.eventTime}>{formatClock(event.elapsedMs)}</span>
              <span className={styles.eventText}>
                <span className={styles.eventLabel}>{event.label}</span>
                <span className={styles.eventType}>
                  {event.type}
                  {event.actor ? <span className={styles.eventActor}> · {event.actor}</span> : null}
                </span>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
});
