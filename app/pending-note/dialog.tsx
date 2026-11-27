"use client";

import { motion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";
import { EASE_OUT } from "./note-box";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogProps = {
  title: string;
  size: "confirm" | "medium";
  reduced: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
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
export function Dialog({ title, size, reduced, onClose, children, footer, initialFocus, returnFocus }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const opener = useRef<HTMLElement | null>(null);
  const returnRef = useRef(returnFocus);

  useEffect(() => {
    returnRef.current = returnFocus;
  }, [returnFocus]);

  useLayoutEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;

    const target = initialFocus?.() ?? ref.current?.querySelector<HTMLElement>("[data-pn-dialog-foot] button");

    target?.focus({ preventScroll: true });

    const html = document.documentElement;
    const previous = html.style.overflow;

    html.style.overflow = "hidden";

    return () => {
      html.style.overflow = previous;

      const back = returnRef.current?.() ?? opener.current;

      // After the exit: whatever opened the dialog may have moved or gone.
      window.requestAnimationFrame(() => {
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

  const fade = reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" as const };
  const enter = reduced ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT };
  const leave = reduced ? { duration: 0 } : { duration: 0.15, ease: [0.4, 0, 1, 1] as const };

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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8, transition: leave }}
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
          <div data-pn-dialog-foot>{footer}</div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
