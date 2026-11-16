"use client";

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { ClockIcon, CloseIcon, EmojiIcon, HashtagIcon, ImageIcon, TasteTestIcon } from "./icons";
import { formatWhen, formatWhenLong } from "./schedule";
import type { PostImage } from "./state";

/** Contra's own measurements for the composer's lower half. */
const DROP_ZONE = 164;
const GAP = 16;
const POST_ROW = 40;
/** The divider with its 16px margins, and the 4px gap under it. */
const DIVIDER = 37;
const TOOLBAR = 40;
/** What sits between the Post row and the bottom of the card: its 4px gap, then the divider. */
const UNDER_POST = 4 + DIVIDER;
const ERROR = 16 + GAP;
/** How far the reveal's soft edge runs ahead of the rows that uncover the drop zone. */
const REVEAL_LEAD = 12;
/** An attached image is shown at its own shape, up to this tall. */
const PREVIEW_MAX = 360;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** One spring drives the whole card. Closing is a little quicker than opening. */
const OPEN = { type: "spring", visualDuration: 0.32, bounce: 0, restDelta: 0.0005, restSpeed: 0.001 } as const;
const CLOSE = { type: "spring", visualDuration: 0.24, bounce: 0, restDelta: 0.0005, restSpeed: 0.001 } as const;
const RESIZE = { type: "spring", visualDuration: 0.28, bounce: 0 } as const;

/*
 * Contents arrive a beat after the card starts to move, and leave before it
 * does. Fades use a gentler ease-out (easeOutQuad, from easings.co): the
 * strong curve spends its whole change in the first few frames, which reads
 * as a snap on opacity.
 */
const EASE_FADE = [0.25, 0.46, 0.45, 0.94] as const;
const FADE_IN = { duration: 0.24, delay: 0.05, ease: EASE_FADE } as const;
const FADE_IN_LATE = { duration: 0.2, delay: 0.09, ease: EASE_FADE } as const;
const FADE_OUT = { duration: 0.09, ease: EASE_FADE } as const;
const ROLL = { duration: 0.2, ease: EASE_OUT } as const;

export type ComposerHandle = {
  /** The clock button, which the schedule popover opens from and returns focus to. */
  clock: HTMLButtonElement | null;
  /** The time chip, when a time is set. */
  chip: HTMLButtonElement | null;
};

export type Draft = { text: string; image?: PostImage };

type Attached = PostImage & { id: number };

let attachments = 0;

export function Composer({
  ref,
  at,
  now,
  reduced,
  popoverOpen,
  popoverRef,
  onOpenSchedule,
  onClearSchedule,
  onSubmit,
}: {
  ref: Ref<ComposerHandle>;
  /** The time the post is set to go out, if one's been picked. */
  at: number | null;
  now: number | null;
  reduced: boolean;
  /** The composer never collapses while its popover is open. */
  popoverOpen: boolean;
  popoverRef: React.RefObject<HTMLElement | null>;
  onOpenSchedule: (from: "clock" | "chip") => void;
  onClearSchedule: () => void;
  onSubmit: (draft: Draft) => void;
}) {
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState<Attached | null>(null);
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);

  const cardRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const clockRef = useRef<HTMLButtonElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const postLabelRef = useRef<HTMLSpanElement>(null);
  const scheduleLabelRef = useRef<HTMLSpanElement>(null);
  const postRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    get clock() {
      return clockRef.current;
    },
    get chip() {
      return chipRef.current;
    },
  }));

  const empty = text.trim() === "" && !image && at === null;
  /* Contra's rule: open while you're in it, and for as long as it holds anything. */
  const open = active || !empty;
  const scheduled = at !== null;

  /* ------------------------------------------------------------------------ */
  /* Geometry: everything below is derived from one progress value            */
  /* ------------------------------------------------------------------------ */

  /** 0 closed, 1 open. Every height and offset in the card follows it, so they can't disagree. */
  const progress = useMotionValue(0);
  /** The drop zone's height, or the attached image's. */
  const mediaHeight = useMotionValue(DROP_ZONE);
  /** "Want this on your profile?" wraps on a phone, which makes the bottom row taller. */
  const promptHeight = useMotionValue(TOOLBAR);
  const errorHeight = useMotionValue(0);

  /*
   * The slot runs a little past the drop zone and fades out over its last
   * 20px (a mask, in the CSS). So the rows riding down uncover the drop zone
   * through a soft edge instead of slicing through its text, and its bottom
   * border is in place before the spring's last few pixels.
   */
  const mediaSlot = useTransform(() => (mediaHeight.get() + GAP + REVEAL_LEAD) * progress.get());
  const mediaPull = useTransform(() => -REVEAL_LEAD * progress.get());
  const postSlot = useTransform(() => POST_ROW * progress.get());
  const dividerSlot = useTransform(() => DIVIDER * progress.get());
  const toolbarHeight = useTransform(() => TOOLBAR + (Math.max(TOOLBAR, promptHeight.get()) - TOOLBAR) * progress.get());
  /* Post is one element. It rides up from the toolbar row to its own row above the divider. */
  const actionsBottom = useTransform(() => (Math.max(TOOLBAR, promptHeight.get()) + UNDER_POST) * progress.get());

  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      progress.jump(open ? 1 : 0);

      return;
    }

    if (reduced) {
      progress.jump(open ? 1 : 0);

      return;
    }

    const controls = animate(progress, open ? 1 : 0, open ? OPEN : CLOSE);

    return () => controls.stop();
  }, [open, progress, reduced]);

  useEffect(() => {
    const target = error ? ERROR : 0;

    if (reduced) {
      errorHeight.jump(target);

      return;
    }

    const controls = animate(errorHeight, target, RESIZE);

    return () => controls.stop();
  }, [error, errorHeight, reduced]);

  /* The media area grows to an attached image's shape and back to the drop zone's. */
  const fitMedia = useCallback(
    (instant: boolean) => {
      const width = mediaRef.current?.offsetWidth ?? 0;
      const target = image && width ? Math.min(PREVIEW_MAX, Math.round((width * image.height) / image.width)) : DROP_ZONE;

      if (instant || reduced) {
        mediaHeight.jump(target);

        return undefined;
      }

      return animate(mediaHeight, target, RESIZE);
    },
    [image, mediaHeight, reduced],
  );

  useEffect(() => {
    const controls = fitMedia(false);

    return () => controls?.stop();
  }, [fitMedia]);

  useLayoutEffect(() => {
    const prompt = promptRef.current;
    const media = mediaRef.current;

    if (!prompt || !media) return;

    promptHeight.jump(prompt.offsetHeight);

    let width = media.offsetWidth;
    const observer = new ResizeObserver(() => {
      promptHeight.jump(prompt.offsetHeight);

      // A resized window refits the image at once; only attaching and removing spring.
      if (media.offsetWidth !== width) {
        width = media.offsetWidth;
        fitMedia(true);
      }
    });

    observer.observe(prompt);
    observer.observe(media);

    return () => observer.disconnect();
  }, [fitMedia, promptHeight]);

  /* ------------------------------------------------------------------------ */
  /* Post ↔ Schedule                                                          */
  /* ------------------------------------------------------------------------ */

  const postWidth = useMotionValue<number | string>("auto");
  const measured = useRef(false);

  useLayoutEffect(() => {
    const button = postRef.current;
    const label = (scheduled ? scheduleLabelRef : postLabelRef).current;

    if (!button || !label) return;

    const measure = () => {
      const style = getComputedStyle(button);

      return (
        label.getBoundingClientRect().width +
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight) +
        parseFloat(style.borderLeftWidth) +
        parseFloat(style.borderRightWidth)
      );
    };

    // The first measurement is where the button already is; after that, the width springs.
    if (!measured.current || reduced) {
      measured.current = true;
      postWidth.jump(measure());

      return;
    }

    const controls = animate(postWidth as never, measure(), RESIZE);

    return () => controls.stop();
  }, [postWidth, reduced, scheduled]);

  // The labels are measured before the font arrives on a cold load; measure again once it has.
  useEffect(() => {
    let live = true;

    document.fonts.ready.then(() => {
      const button = postRef.current;
      const label = (scheduled ? scheduleLabelRef : postLabelRef).current;

      if (!live || !button || !label) return;

      const style = getComputedStyle(button);

      postWidth.jump(
        label.getBoundingClientRect().width +
          parseFloat(style.paddingLeft) +
          parseFloat(style.paddingRight) +
          parseFloat(style.borderLeftWidth) +
          parseFloat(style.borderRightWidth),
      );
    });

    return () => {
      live = false;
    };
    // Only on mount: later changes are measured, and sprung, by the layout effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Opening and collapsing                                                   */
  /* ------------------------------------------------------------------------ */

  const popoverOpenRef = useRef(popoverOpen);

  useEffect(() => {
    popoverOpenRef.current = popoverOpen;
  }, [popoverOpen]);

  useEffect(() => {
    // A click anywhere else lets go of the composer. It only closes if it's empty.
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (cardRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      if (popoverOpenRef.current) return;

      setActive(false);
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [popoverRef]);

  function onBlur(event: React.FocusEvent) {
    const next = event.relatedTarget as Node | null;

    // Focus leaving the window, or going to nothing, is not tabbing away.
    if (!next) return;
    if (cardRef.current?.contains(next) || popoverRef.current?.contains(next)) return;

    setActive(false);
  }

  function onPointerDown(event: React.PointerEvent) {
    setActive(true);

    // A press on the card itself, not on a control, puts the caret in the editor.
    if (!(event.target as Element).closest("button, a, input, [contenteditable]")) {
      event.preventDefault();
      editorRef.current?.focus();
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Writing, attaching, sending                                              */
  /* ------------------------------------------------------------------------ */

  function onInput() {
    const editor = editorRef.current;

    if (!editor) return;

    // An emptied editor can keep a stray line break; without it the placeholder returns.
    if (editor.textContent === "" || editor.innerHTML === "<br>") editor.replaceChildren();

    setText(editor.innerText);
    setActive(true);
    setError(false);
  }

  function attach(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;

    // It never leaves the browser: the image is read from an object URL.
    const src = URL.createObjectURL(file);
    const probe = new Image();

    probe.onload = () => {
      attachments += 1;
      setImage((current) => {
        if (current) URL.revokeObjectURL(current.src);

        return { id: attachments, src, width: probe.naturalWidth, height: probe.naturalHeight, alt: "" };
      });
      setActive(true);
    };
    probe.onerror = () => URL.revokeObjectURL(src);
    probe.src = src;
  }

  function removeImage() {
    setImage((current) => {
      if (current) URL.revokeObjectURL(current.src);

      return null;
    });
    // The × is about to go; focus moves to the control that brings an image back.
    cardRef.current?.querySelector<HTMLButtonElement>(".cs-dropzone")?.focus({ preventScroll: true });
  }

  function submit() {
    if (text.trim() === "") {
      setError(true);
      setActive(true);
      editorRef.current?.focus();

      return;
    }

    onSubmit({ text, image: image ? { src: image.src, width: image.width, height: image.height, alt: "" } : undefined });

    // The image now belongs to the post, so its URL is kept.
    editorRef.current?.replaceChildren();
    setText("");
    setImage(null);
    setError(false);
    setActive(false);
  }

  const placeholder = "What are you working on, Uzochukwu?";
  const whenLabel = at !== null && now !== null ? formatWhen(at, now) : "";

  return (
    <section
      ref={cardRef}
      className="cs-composer"
      aria-label="Write a post"
      data-open={open}
      onPointerDown={onPointerDown}
      onBlur={onBlur}
    >
      <form
        className="cs-composer-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="cs-composer-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cs-avatar" src="/contra-schedule/avatar.avif" alt="" width={40} height={40} />

          <div className="cs-editor-wrap">
            <div
              ref={editorRef}
              className="cs-editor"
              role="textbox"
              aria-multiline="true"
              aria-label={placeholder}
              aria-invalid={error || undefined}
              aria-describedby={error ? "cs-composer-error" : undefined}
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              data-placeholder={placeholder}
              data-empty={text === "" || text === "\n"}
              spellCheck
              onFocus={() => setActive(true)}
              onInput={onInput}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
          </div>
        </div>

        <div className="cs-composer-lower">
          <motion.div className="cs-error-slot" style={{ height: errorHeight }}>
            <AnimatePresence initial={false}>
              {error && (
                <motion.p
                  id="cs-composer-error"
                  className="cs-error"
                  role="alert"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: FADE_IN }}
                  exit={{ opacity: 0, transition: FADE_OUT }}
                >
                  Post text is required
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Stays put under the text while the rows below ride the card's edge down and uncover it. */}
          <motion.div className="cs-media-slot" style={{ height: mediaSlot, marginBottom: mediaPull }} inert={!open}>
            <motion.div ref={mediaRef} className="cs-media" style={{ height: mediaHeight }}>
              <motion.button
                type="button"
                className="cs-dropzone"
                data-dragging={dragging}
                inert={Boolean(image)}
                initial={false}
                animate={{ opacity: open && !image ? 1 : 0 }}
                transition={open && !image ? FADE_IN : FADE_OUT}
                onClick={() => fileRef.current?.click()}
                onDragEnter={() => setDragging(true)}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  attach(event.dataTransfer.files[0]);
                }}
              >
                <ImageIcon size={24} />
                <span className="cs-dropzone-text">
                  <span className="cs-dropzone-title">Share progress, updates, or highlights</span>
                  <span className="cs-dropzone-hint">
                    Drop a file or <span className="cs-dropzone-browse">Browse</span>
                  </span>
                </span>
              </motion.button>

              <AnimatePresence initial={false}>
                {image && (
                  <motion.div
                    key={image.id}
                    className="cs-preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: open ? 1 : 0, transition: open ? FADE_IN : FADE_OUT }}
                    exit={{ opacity: 0, transition: FADE_OUT }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt="Attached image" />
                    <button type="button" className="cs-preview-remove" aria-label="Remove image" onClick={removeImage}>
                      <CloseIcon size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <div className="cs-chips">
            <AnimatePresence initial={false}>
              {scheduled && (
                <motion.div
                  key="when"
                  className="cs-chip-slot"
                  initial={reduced ? { height: 32 } : { height: 0 }}
                  animate={{ height: 32 }}
                  exit={reduced ? { height: 32, transition: FADE_OUT } : { height: 0 }}
                  transition={RESIZE}
                >
                  <motion.div
                    className="cs-chip"
                    data-pop-anchor
                    initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(0.92)" }}
                    animate={{ opacity: 1, transform: "scale(1)", transition: { duration: 0.2, ease: EASE_OUT } }}
                    exit={
                      reduced
                        ? { opacity: 0, transition: FADE_OUT }
                        : { opacity: 0, transform: "scale(0.92)", transition: { duration: 0.12, ease: EASE_OUT } }
                    }
                  >
                    <button
                      ref={chipRef}
                      type="button"
                      className="cs-chip-main"
                      aria-haspopup="dialog"
                      aria-expanded={popoverOpen}
                      aria-label={at !== null ? `Scheduled for ${formatWhenLong(at)}. Change time` : undefined}
                      onClick={() => onOpenSchedule("chip")}
                    >
                      <ClockIcon />
                      <span>{whenLabel}</span>
                    </button>
                    <button
                      type="button"
                      className="cs-chip-remove"
                      aria-label="Remove schedule"
                      onClick={() => {
                        onClearSchedule();
                        clockRef.current?.focus({ preventScroll: true });
                      }}
                    >
                      <CloseIcon />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* One group in one place: Post rides between the toolbar row and its own row. */}
          <motion.div className="cs-actions" style={{ bottom: actionsBottom }}>
            <motion.button
              ref={clockRef}
              type="button"
              className="cs-clock"
              aria-label="Schedule post"
              aria-haspopup="dialog"
              aria-expanded={popoverOpen}
              data-set={scheduled}
              inert={!open}
              initial={false}
              animate={
                open
                  ? {
                      visibility: "visible",
                      opacity: 1,
                      transform: "scale(1)",
                      transition: reduced ? FADE_IN : { duration: 0.2, delay: 0.08, ease: EASE_OUT },
                    }
                  : {
                      opacity: 0,
                      transform: reduced ? "scale(1)" : "scale(0.9)",
                      transition: FADE_OUT,
                      transitionEnd: { visibility: "hidden" },
                    }
              }
              onClick={() => onOpenSchedule("clock")}
            >
              <ClockIcon />
            </motion.button>

            <motion.button
              ref={postRef}
              type="submit"
              className="cs-post"
              aria-label={scheduled ? "Schedule" : "Post"}
              style={{ width: postWidth }}
            >
              {/* Holds the button at Post's width until the labels are measured. */}
              <span className="cs-post-sizer" aria-hidden="true">
                Post
              </span>
              <motion.span
                className="cs-post-label"
                aria-hidden="true"
                initial={false}
                animate={
                  scheduled
                    ? { opacity: 0, transform: reduced ? "translateY(0px)" : "translateY(-10px)", filter: "blur(2px)" }
                    : { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }
                }
                transition={ROLL}
              >
                <span ref={postLabelRef}>Post</span>
              </motion.span>
              <motion.span
                className="cs-post-label"
                aria-hidden="true"
                initial={false}
                animate={
                  scheduled
                    ? { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }
                    : { opacity: 0, transform: reduced ? "translateY(0px)" : "translateY(10px)", filter: "blur(2px)" }
                }
                transition={ROLL}
              >
                <span ref={scheduleLabelRef}>Schedule</span>
              </motion.span>
            </motion.button>
          </motion.div>

          <motion.div className="cs-post-slot" style={{ height: postSlot }} />

          <motion.div className="cs-divider-slot" style={{ height: dividerSlot }}>
            <motion.div
              className="cs-divider"
              initial={false}
              animate={{ opacity: open ? 1 : 0 }}
              transition={open ? FADE_IN_LATE : FADE_OUT}
            />
          </motion.div>

          <motion.div className="cs-toolbar" style={{ height: toolbarHeight }}>
            <div className="cs-tools">
              <button type="button" aria-label="Add media" onClick={() => fileRef.current?.click()}>
                <ImageIcon />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                tabIndex={-1}
                onChange={(event) => {
                  attach(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button type="button" aria-label="Add taste test" aria-disabled="true">
                <TasteTestIcon size={17} />
              </button>
              <button type="button" aria-label="open emoji menu" aria-disabled="true">
                <EmojiIcon />
              </button>
              <span className="cs-tools-divider" />
              <button type="button" className="cs-tags" aria-label="Add tags" aria-disabled="true">
                <HashtagIcon />
                <span>Add tags</span>
              </button>
            </div>

            <motion.div
              ref={promptRef}
              className="cs-prompt"
              inert={!open}
              initial={false}
              animate={{ opacity: open ? 1 : 0 }}
              transition={open ? FADE_IN_LATE : FADE_OUT}
            >
              <span>Want this on your profile?</span>
              <button type="button" className="cs-link" aria-disabled="true">
                Continue as work
              </button>
            </motion.div>
          </motion.div>
        </div>
      </form>
    </section>
  );
}
