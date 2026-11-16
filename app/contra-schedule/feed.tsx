"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { Count } from "./count";
import {
  BarChartAltIcon,
  BookmarkOutlineIcon,
  ChatOutlineIcon,
  ChevronDownIcon,
  ClockIcon,
  HashtagIcon,
  HeartIcon,
  MoreIcon,
  RepostIcon,
  TrashIcon,
  UploadIcon,
} from "./icons";
import { formatFeedDate, formatWhen, formatWhenLong, zoneLabel } from "./schedule";
import type { Post, Tag } from "./state";

const NAME = "Uzochukwu Okafor";
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** A post takes its place with a spring; what's in it fades in just behind. */
const ROW_SPRING = { type: "spring", visualDuration: 0.3, bounce: 0 } as const;
const ROW_IN = {
  height: ROW_SPRING,
  opacity: { duration: 0.2, delay: 0.1, ease: EASE_OUT },
} as const;
const ROW_OUT = {
  height: { type: "spring", visualDuration: 0.26, bounce: 0 },
  opacity: { duration: 0.1, ease: EASE_OUT },
} as const;

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/* -------------------------------------------------------------------------- */
/* Parts of a post                                                            */
/* -------------------------------------------------------------------------- */

function Chip({ tag }: { tag: Tag }) {
  return (
    <span className="cs-tag" data-kind={tag.kind}>
      {tag.kind === "tool" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cs-tag-logo" src={tag.icon} alt="" width={16} height={16} />
      )}
      {tag.kind === "hashtag" && (
        <span className="cs-tag-hash">
          <HashtagIcon />
        </span>
      )}
      <span>{tag.label}</span>
    </span>
  );
}

/**
 * Contra keeps a post's tags on one line and folds the rest into "+2". The
 * tags are measured in a hidden copy of the row, so the count is right
 * before anything is shown.
 */
function Tags({ tags }: { tags: Tag[] }) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState(tags.length);

  useLayoutEffect(() => {
    const measure = measureRef.current;

    if (!measure) return;

    const update = () => {
      const chips = [...measure.children] as HTMLElement[];
      const more = chips.pop();
      const room = measure.clientWidth;
      const gap = 6;
      let used = 0;
      let count = 0;

      for (const [index, chip] of chips.entries()) {
        const width = chip.offsetWidth + (index ? gap : 0);
        const rest = chips.length - index - 1;
        // Whatever is left after this one needs room for the "+N" chip.
        const reserve = rest > 0 ? gap + (more?.offsetWidth ?? 0) : 0;

        if (used + width + reserve > room) break;

        used += width;
        count += 1;
      }

      // A lone tag always shows, even if it has to be cut short.
      setFit(Math.max(1, count));
    };

    update();

    const observer = new ResizeObserver(update);

    observer.observe(measure);

    return () => observer.disconnect();
  }, [tags]);

  if (tags.length === 0) return null;

  const hidden = tags.length - fit;

  return (
    <div className="cs-tags" role="group" aria-label="Tags">
      <span ref={measureRef} className="cs-tags-measure" aria-hidden="true">
        {tags.map((tag) => (
          <Chip key={tag.label} tag={tag} />
        ))}
        <span className="cs-tag">+{tags.length}</span>
      </span>

      {tags.slice(0, fit).map((tag) => (
        <Chip key={tag.label} tag={tag} />
      ))}
      {hidden > 0 && (
        <span className="cs-tag" aria-label={`${hidden} more ${hidden === 1 ? "tag" : "tags"}`}>
          +{hidden}
        </span>
      )}
    </div>
  );
}

function Body({ post }: { post: Post }) {
  const image = post.image;

  return (
    <div className="cs-post-body">
      <p className="cs-post-text">
        {post.text.split(URL_PATTERN).map((part, index) =>
          index % 2 ? (
            <a key={index} href={part} target="_blank" rel="noreferrer">
              {part}
            </a>
          ) : (
            <Fragment key={index}>{part}</Fragment>
          ),
        )}
      </p>

      <Tags tags={post.tags} />

      {image && (
        <div
          className="cs-post-media"
          data-portrait={image.height > image.width}
          style={{ aspectRatio: `${image.width} / ${image.height}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} alt={image.alt} width={image.width} height={image.height} />
        </div>
      )}
    </div>
  );
}

function Avatar() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="cs-avatar cs-avatar--ring" src="/contra-schedule/avatar.avif" alt="" width={40} height={40} />
  );
}

/* -------------------------------------------------------------------------- */
/* A post in the feed                                                         */
/* -------------------------------------------------------------------------- */

function FeedPost({
  post,
  now,
  reduced,
  onLike,
}: {
  post: Post;
  now: number;
  reduced: boolean;
  onLike: (id: string) => void;
}) {
  return (
    <article className="cs-post" aria-label={`Post by ${NAME}`}>
      <div className="cs-post-row">
        <Avatar />

        <div className="cs-post-col">
          <div className="cs-post-main">
            <header className="cs-post-head">
              <div className="cs-post-meta">
                <span className="cs-post-name">{NAME}</span>
                <span className="cs-post-date">• {formatFeedDate(post.at, now)}</span>
              </div>
              <button type="button" className="cs-post-more" aria-label="More actions" aria-disabled="true">
                <MoreIcon />
              </button>
            </header>

            <Body post={post} />
          </div>

          <div className="cs-actions-row">
            <div className="cs-actions-grid">
              <div>
                {/* Your own post: Contra disables the upgoat. */}
                <button type="button" className="cs-action" aria-label="Upgoat" disabled>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/contra-schedule/upgoat.svg" alt="" width={16} height={16} />
                </button>
              </div>
              <div>
                <button type="button" className="cs-action" aria-label="Reply" aria-disabled="true">
                  <ChatOutlineIcon />
                  {post.replies > 0 && <span className="cs-action-count">{post.replies}</span>}
                </button>
              </div>
              <div>
                <button type="button" className="cs-action" aria-label="Repost" aria-disabled="true">
                  <RepostIcon />
                </button>
              </div>
              <div>
                <button
                  type="button"
                  className="cs-action cs-action--like"
                  aria-label={post.liked ? "Remove like" : "Like"}
                  aria-pressed={post.liked}
                  data-liked={post.liked}
                  onClick={() => onLike(post.id)}
                >
                  <HeartIcon liked={post.liked} />
                  {post.likes > 0 && (
                    <span className="cs-action-count">
                      <Count value={post.likes} label={String(post.likes)} reduced={reduced} />
                    </span>
                  )}
                </button>
              </div>
              <div className="cs-actions-wide">
                <button type="button" className="cs-action" aria-label="View post engagement" aria-disabled="true">
                  <BarChartAltIcon />
                  {post.views > 0 && <span className="cs-action-count">{post.views}</span>}
                </button>
              </div>
            </div>

            <div className="cs-actions-side">
              <button
                type="button"
                className="cs-action cs-actions-wide"
                aria-label="Add to bookmarks"
                aria-disabled="true"
              >
                <BookmarkOutlineIcon />
              </button>
              <button type="button" className="cs-action" aria-label="Share" aria-disabled="true">
                <UploadIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* A post in the queue                                                        */
/* -------------------------------------------------------------------------- */

function QueuedPost({
  post,
  now,
  rescheduling,
  onReschedule,
  onPostNow,
  onDelete,
}: {
  post: Post;
  now: number;
  /** Whether this post's reschedule popover is open. */
  rescheduling: boolean;
  onReschedule: (post: Post, anchor: HTMLElement) => void;
  onPostNow: (post: Post) => void;
  onDelete: (post: Post) => void;
}) {
  return (
    <article className="cs-post" aria-label={`Scheduled post, goes out ${formatWhenLong(post.at)}`} data-queued={post.id}>
      <div className="cs-post-row">
        <Avatar />

        <div className="cs-post-col">
          <div className="cs-post-main">
            <header className="cs-post-head">
              <div className="cs-post-meta">
                <span className="cs-post-name">{NAME}</span>
                <span className="cs-post-date cs-post-date--scheduled">
                  • <ClockIcon size={14} /> Scheduled
                </span>
              </div>
            </header>

            <Body post={post} />
          </div>

          <div className="cs-queue-row">
            <span className="cs-chip" data-pop-anchor>
              <button
                type="button"
                className="cs-chip-main"
                aria-haspopup="dialog"
                aria-expanded={rescheduling}
                aria-label={`Goes out ${formatWhenLong(post.at)}. Reschedule`}
                onClick={(event) => onReschedule(post, event.currentTarget)}
              >
                <ClockIcon />
                <span>{formatWhen(post.at, now)}</span>
                <ChevronDownIcon />
              </button>
            </span>

            <div className="cs-queue-side">
              <button type="button" className="cs-link" onClick={() => onPostNow(post)}>
                Post now
              </button>
              <button
                type="button"
                className="cs-action cs-action--delete"
                aria-label="Delete scheduled post"
                onClick={() => onDelete(post)}
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* The two lists                                                              */
/* -------------------------------------------------------------------------- */

/** One row of a list: grows in, collapses out, and glides when the order changes. */
function Row({
  children,
  reduced,
  order,
}: {
  children: React.ReactNode;
  reduced: boolean;
  /** Changes only when the list's order does, so nothing else can start a glide. */
  order: string;
}) {
  return (
    <motion.div
      className="cs-row"
      layout={reduced ? false : "position"}
      layoutDependency={order}
      initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1, transition: reduced ? { duration: 0.15 } : ROW_IN }}
      exit={
        reduced ? { opacity: 0, transition: { duration: 0.1 } } : { height: 0, opacity: 0, transition: ROW_OUT }
      }
      transition={{ layout: ROW_SPRING }}
    >
      {children}
    </motion.div>
  );
}

export function ForYou({
  posts,
  now,
  reduced,
  onLike,
}: {
  posts: Post[];
  now: number;
  reduced: boolean;
  onLike: (id: string) => void;
}) {
  const order = posts.map((post) => post.id).join(" ");

  return (
    <section className="cs-feed" aria-label="For you">
      <div className="cs-feed-list cs-feed-list--flush">
        <AnimatePresence initial={false}>
          {posts.map((post) => (
            <Row key={post.id} reduced={reduced} order={order}>
              <FeedPost post={post} now={now} reduced={reduced} onLike={onLike} />
            </Row>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

export function Scheduled({
  posts,
  now,
  reduced,
  reschedulingId,
  onReschedule,
  onPostNow,
  onDelete,
}: {
  posts: Post[];
  now: number;
  reduced: boolean;
  reschedulingId: string | null;
  onReschedule: (post: Post, anchor: HTMLElement) => void;
  onPostNow: (post: Post) => void;
  onDelete: (post: Post) => void;
}) {
  const order = posts.map((post) => post.id).join(" ");

  return (
    <section className="cs-feed" aria-label="Scheduled posts">
      <div className="cs-feed-head">
        <h2 className="cs-label">Scheduled</h2>
        <span className="cs-feed-zone">Times in {zoneLabel(now)}</span>
      </div>

      <div className="cs-feed-list">
       <AnimatePresence initial={false}>
        {posts.map((post) => (
          <Row key={post.id} reduced={reduced} order={order}>
            <QueuedPost
              post={post}
              now={now}
              rescheduling={reschedulingId === post.id}
              onReschedule={onReschedule}
              onPostNow={onPostNow}
              onDelete={onDelete}
            />
          </Row>
        ))}

        {/* A row like any other, so it grows in as the last post collapses out. */}
        {posts.length === 0 && (
          <Row key="empty" reduced={reduced} order={order}>
            <div className="cs-empty">
              <ClockIcon size={24} />
              <p className="cs-empty-title">Nothing scheduled</p>
              <p className="cs-empty-text">Write a post, tap the clock beside Post, and pick when it goes out.</p>
            </div>
          </Row>
        )}
       </AnimatePresence>
      </div>
    </section>
  );
}
