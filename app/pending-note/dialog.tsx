"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";
import { EASE_OUT, HEIGHT } from "./note-box";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogProps = {
  title: string;
  size: "confirm" | "medium";
  reduced: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** Folds the footer away, e.g. while a note inside is being edited, so there's only one Cancel on screen. */
  footerHidden?: boolean;
  /** Where focus goes on open; the first button otherwise. */
  initialFocus?: () => HTMLElement | null | undefined;
  /** Where focus goes back to on close; whatever had it before otherwise. */
  returnFocus?: () => HTMLElement | null | undefined;
};

/**
 * LinkedIn's modal: top-anchored, so a dialog that grows only grows
 * downwards, over a 75% black scrim. Focus stays inside, Escape closes it,
 * and focus goes back to whatever opened it.
 */
export function Dialog({
  title,
  size,
  reduced,
  onClose,
  children,
  footer,
  footerHidden = false,
  initialFocus,
  returnFocus,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const opener = useRef<HTMLElement | null>(null);
  const returnRef = useRef(returnFocus);

  useEffect(() => {
    returnRef.current = returnFocus;
  }, [returnFocus]);

  /* The footer fold. ----------------------------------------------------- */

  const foldRef = useRef<HTMLDivElement>(null);
  const foldHeight = useMotionValue(footerHidden ? 0 : -1);
  const foldOpacity = useMotionValue(footerHidden ? 0 : 1);
  const foldStyle = useTransform(foldHeight, (h) => (h < 0 ? "auto" : h));
  const foldShown = useRef(!footerHidden);

  useLayoutEffect(() => {
    const inner = foldRef.current?.firstElementChild as HTMLElement | null | undefined;

    if (!inner || foldShown.current === !footerHidden) return;

    foldShown.current = !footerHidden;

    const full = inner.getBoundingClientRect().height;

    // A note box starts its height change from a ResizeObserver, a frame after render. Starting the fold from one
    // too puts both on the same frame, so the dialog's bottom edge moves one way only (or jumps once, reduced).
    const tweens: { stop: () => void }[] = [];
    const observer = new ResizeObserver(() => {
      observer.disconnect();

      if (reduced) {
        foldHeight.jump(footerHidden ? 0 : -1);
        foldOpacity.jump(footerHidden ? 0 : 1);

        return;
      }

      if (foldHeight.get() < 0) foldHeight.jump(full);
      tweens.push(
        animate(foldHeight, footerHidden ? 0 : full, {
          ...HEIGHT,
          onComplete: () => {
            if (!footerHidden) foldHeight.jump(-1);
          },
        }),
        animate(foldOpacity, footerHidden ? 0 : 1, HEIGHT),
      );
    });

    observer.observe(inner);

    return () => {
      observer.disconnect();
      tweens.forEach((tween) => tween.stop());
    };
  }, [footerHidden, reduced, foldHeight, foldOpacity]);

  const pendingReturn = useRef(0);

  useLayoutEffect(() => {
    // Strict mode mounts twice: the first cleanup's focus return is cancelled, and the opener is kept.
    window.cancelAnimationFrame(pendingReturn.current);
    opener.current ??= document.activeElement as HTMLElement | null;

    const target = initialFocus?.() ?? ref.current?.querySelector<HTMLElement>("[data-pn-dialog-foot] button");

    target?.focus({ preventScroll: true });

    const html = document.documentElement;
    const previous = html.style.overflow;

    html.style.overflow = "hidden";

    return () => {
      html.style.overflow = previous;

      // After the exit: whatever opened the dialog may have moved or gone.
      pendingReturn.current = window.requestAnimationFrame(() => {
        const back = returnRef.current?.() ?? opener.current;

        if (back && back.isConnected) back.focus({ preventScroll: true });
      });
    };
    // Mount and unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();

      return;
    }

    if (event.key !== "Tab" || !ref.current) return;

    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null,
    );

    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // The dialog answers a click, so it leaves fast from its first frame (ease-out, not ease-in). With reduced
  // motion it still fades, it just doesn't move.
  const fade = { duration: 0.2, ease: EASE_OUT };
  const enter = reduced ? fade : { duration: 0.22, ease: EASE_OUT };
  const leave = { duration: 0.15, ease: EASE_OUT };
  const rise = reduced ? 0 : 16;
  const sink = reduced ? 0 : 8;

  return createPortal(
    <div data-pn-portal data-pn-desktop>
      <motion.div
        data-pn-scrim
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: leave }}
        transition={fade}
        onClick={onClose}
      />
      <div data-pn-dialog-frame>
        <motion.div
          ref={ref}
          data-pn-dialog
          data-size={size}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0, y: rise }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: sink, transition: leave }}
          transition={enter}
          onKeyDown={handleKeyDown}
        >
          <div data-pn-dialog-head>
            <h2 id={titleId} data-pn-dialog-title>
              {title}
            </h2>
            <button type="button" data-pn-dialog-close aria-label="Dismiss" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
          <div data-pn-dialog-body>{children}</div>
          <motion.div ref={foldRef} data-pn-dialog-fold inert={footerHidden} style={{ height: foldStyle, opacity: foldOpacity }}>
            <div data-pn-dialog-foot>{footer}</div>
          </motion.div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
