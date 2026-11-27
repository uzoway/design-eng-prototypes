"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  counterAnnouncement,
  normalize,
  PROFILE,
  saveBlock,
  sentLabel,
  SUBJECT_ID,
  WINDOW_CLOSED,
  windowLine,
  type Invite,
} from "./data";
import {
  BackIcon,
  BellIcon,
  ClockIcon,
  CloseIcon,
  ConnectIcon,
  ErrorIcon,
  GearIcon,
  IntroIllustration,
  MoreIcon,
  NavIcon,
  PremiumIcon,
  SendIcon,
  VerifiedIcon,
} from "./icons";
import { HomeIndicator, IosKeyboard, StatusBar, type KeyboardApi } from "./keyboard";
import { NavIcon as AnimatedIcon, type Tab as AnimatedTab } from "./nav-icons";
import { useIconMoves } from "./nav-moves";
import { EASE_OUT, NoteBox, type Flash } from "./note-box";
import type { DialogState, Editing, Screen, Surface } from "./pending-note";

/** iOS's sheet and push curve: a fast start that settles softly. */
const IOS = [0.32, 0.72, 0, 1] as const;
const SHEET_IN = { duration: 0.42, ease: IOS };
const SHEET_OUT = { duration: 0.32, ease: IOS };
/** A sheet let go short of dismissing settles back like UIKit's. */
const SHEET_BACK = { type: "spring", stiffness: 520, damping: 46 } as const;
/** Pixels a press can wander before it's a drag; down faster than FLICK px/s dismisses wherever it's let go. */
const DRAG_SLOP = 6;
const FLICK = 500;
/** How far a sheet can be pulled up at most. */
const RUBBER = 40;
const EDITOR_IN = { duration: 0.42, ease: IOS };
const EDITOR_OUT = { duration: 0.38, ease: IOS };
const KEYBOARD = { duration: 0.35, ease: IOS };
const PUSH = { duration: 0.42, ease: IOS };
const ROW_OUT = { duration: 0.26, ease: EASE_OUT };
const NONE = { duration: 0 };

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WITHDRAW_COPY = "If you withdraw now, you won’t be able to resend to this person for up to 3 weeks.";

export type PhoneProps = {
  device: boolean;
  reduced: boolean;
  now: number;
  limit: number;
  free: boolean;
  invites: Invite[];
  subject: Invite | null;
  screen: Screen;
  /** Skip the push/pop slide: the browser already animated the way back. */
  instant: boolean;
  onScreen: (next: Screen) => void;
  editing: Editing | null;
  closedError: boolean;
  copied: boolean;
  flash: (Flash & { id: string }) | null;
  focus: { id: string; serial: number };
  dialog: DialogState;
  onOpenWithdraw: (invite: Invite, button: HTMLButtonElement) => void;
  onConfirmWithdraw: (id: string) => void;
  onCloseDialog: () => void;
  onOpenPending: () => void;
  onWithdrawPending: () => void;
  withdrawReturn: () => HTMLElement | null;
  onEdit: (invite: Invite, surface: Surface) => void;
  onDraft: (text: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onCopy: () => void;
  onReset: () => void;
};

type NoteContext = Pick<PhoneProps, "now" | "limit" | "reduced" | "flash" | "focus" | "onEdit"> & {
  expand: { id: string; serial: number };
};

/**
 * LinkedIn's iOS app at phone size: the Invitation Manager's Sent tab and
 * Maya's profile in a navigation stack, the bottom sheets, and the
 * "Personalize invitation" screen reused as the note's editor.
 */
export function Phone(props: PhoneProps) {
  const { device, reduced, editing, dialog, screen, subject } = props;

  // The edited note opens underneath once the editor covers it, so it's whole when the editor slides away.
  // (Not while the editor rises: that frame has enough to do.)
  const [expand, setExpand] = useState({ id: "", serial: 0 });
  const editingId = editing?.id ?? null;
  const covered = useCallback(() => {
    if (editingId) setExpand((current) => ({ id: editingId, serial: current.serial + 1 }));
  }, [editingId]);

  const [discard, setDiscard] = useState(false);
  const [wasEditing, setWasEditing] = useState(editing !== null);

  if ((editing !== null) !== wasEditing) {
    setWasEditing(editing !== null);
    if (!editing) setDiscard(false);
  }

  const sheetOpen = dialog !== null && !(dialog.kind === "pending" && !subject);
  const overlay = sheetOpen || editing !== null;
  const editingInvite = editing ? props.invites.find((invite) => invite.id === editing.id) : undefined;

  const context: NoteContext = {
    now: props.now,
    limit: props.limit,
    reduced,
    flash: props.flash,
    focus: props.focus,
    onEdit: props.onEdit,
    expand,
  };

  const withdrawing = dialog?.kind === "withdraw" ? props.invites.find((invite) => invite.id === dialog.id) : null;
  const push = reduced || props.instant ? NONE : PUSH;

  return (
    <div data-pn-root data-pn-phone data-device={device || undefined}>
      {device && <StatusBar light={(sheetOpen && !editing) || discard} />}

      <div data-pn-stack inert={overlay}>
        <motion.div
          data-pn-screen="sent"
          initial={false}
          animate={
            screen === "sent"
              ? { x: 0, visibility: "visible" }
              : { x: "-30%", transitionEnd: { visibility: "hidden" } }
          }
          transition={push}
          inert={screen !== "sent"}
        >
          <SentScreen
            {...props}
            context={context}
            onOpenProfile={() => props.onScreen("profile")}
          />
          <motion.div
            data-pn-screen-dim
            initial={false}
            animate={{ opacity: screen === "sent" ? 0 : 0.1 }}
            transition={push}
          />
        </motion.div>

        <motion.div
          data-pn-screen="profile"
          initial={false}
          animate={
            screen === "profile"
              ? { x: 0, visibility: "visible" }
              : { x: "100%", transitionEnd: { visibility: "hidden" } }
          }
          transition={push}
          inert={screen !== "profile"}
        >
          <ProfileScreen
            subject={subject}
            device={device}
            onBack={() => props.onScreen("sent")}
            onPending={props.onOpenPending}
            onReset={props.onReset}
          />
        </motion.div>
      </div>

      <TabBar inert={overlay} edge={screen === "profile"} reduced={reduced} onNetwork={() => props.onScreen("sent")} />

      <AnimatePresence>
        {withdrawing && (
          <Sheet
            key="withdraw"
            label="Withdraw invitation"
            reduced={reduced}
            onClose={props.onCloseDialog}
            returnFocus={props.withdrawReturn}
          >
            <p data-pn-sheet-text>{WITHDRAW_COPY}</p>
            <div data-pn-sheet-actions>
              <button type="button" data-pn-sbtn="outline" onClick={props.onCloseDialog}>
                Cancel
              </button>
              <button type="button" data-pn-sbtn="primary" onClick={() => props.onConfirmWithdraw(withdrawing.id)}>
                Withdraw
              </button>
            </div>
          </Sheet>
        )}

        {dialog?.kind === "pending" && subject && (
          <Sheet
            key="pending"
            label="Pending invitation"
            reduced={reduced}
            inert={editing !== null}
            onClose={props.onCloseDialog}
            // Safari doesn't focus a button on tap, so the opener can't be read from document.activeElement.
            returnFocus={() => document.querySelector<HTMLElement>("[data-pn-connect-action]")}
            initialFocus={(sheet) =>
              sheet.querySelector<HTMLElement>("[data-pn-text-button][data-strong]") ??
              sheet.querySelector<HTMLElement>("[data-pn-sheet-actions] button")
            }
          >
            {subject.note && (
              <>
                <p data-pn-sheet-label>Your note</p>
                <PhoneNote invite={{ ...subject, note: subject.note }} surface="dialog" context={context} open />
              </>
            )}
            <p data-pn-sheet-text>{WITHDRAW_COPY}</p>
            <div data-pn-sheet-actions>
              <button type="button" data-pn-sbtn="outline" onClick={props.onCloseDialog}>
                Cancel
              </button>
              <button type="button" data-pn-sbtn="primary" onClick={props.onWithdrawPending}>
                Withdraw
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && editingInvite?.note && (
          <Editor
            key={editing.session}
            invite={{ ...editingInvite, note: editingInvite.note }}
            draft={editing.draft}
            device={device}
            reduced={reduced}
            now={props.now}
            limit={props.limit}
            free={props.free}
            closedError={props.closedError}
            copied={props.copied}
            blocked={discard}
            onCovered={covered}
            onDraft={props.onDraft}
            onClose={(changed) => (changed ? setDiscard(true) : props.onCancel())}
            onSave={props.onSave}
            onCopy={props.onCopy}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {discard && editing && (
          <Sheet
            key="discard"
            label="Discard your changes?"
            reduced={reduced}
            overEditor
            onClose={() => setDiscard(false)}
            returnFocus={() => document.querySelector<HTMLElement>("[data-pn-field-input]")}
          >
            <p data-pn-sheet-text>Discard your changes? Your note will stay as it was.</p>
            <div data-pn-sheet-actions>
              <button type="button" data-pn-sbtn="outline" onClick={() => setDiscard(false)}>
                Keep editing
              </button>
              <button type="button" data-pn-sbtn="primary" onClick={props.onCancel}>
                Discard
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {device && <HomeIndicator />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The note box, phone variant                                                */
/* -------------------------------------------------------------------------- */

function PhoneNote({
  invite,
  surface,
  context,
  open = false,
}: {
  invite: Invite & { note: string };
  surface: Surface;
  context: NoteContext;
  open?: boolean;
}) {
  return (
    <NoteBox
      variant="phone"
      invite={invite}
      now={context.now}
      limit={context.limit}
      reduced={context.reduced}
      defaultExpanded={open}
      flash={context.flash?.id === invite.id ? context.flash : null}
      expandSerial={context.expand.id === invite.id ? context.expand.serial : 0}
      focusSerial={context.focus.id === `${surface}:${invite.id}` ? context.focus.serial : 0}
      onEdit={() => context.onEdit(invite, surface)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Invitation Manager → Sent                                                  */
/**
 * iOS truncates a label at the character, so a long headline ends "Creati…",
 * not at the last whole word as CSS line-clamp does. The visible copy is
 * trimmed to fit before paint and again on resize; screen readers get it whole.
 */
function ClampedLine({ text, lines }: { text: string; lines: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(
    function clamp() {
      const element = ref.current;
      const box = element?.parentElement;

      if (!element || !box) return;

      const range = document.createRange();
      const fit = () => {
        // Counts the lines the text lays out on, including any line-clamp hides.
        const fits = (candidate: string) => {
          element.textContent = candidate;
          range.selectNodeContents(element);

          const tops = new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top)));

          return tops.size <= lines;
        };

        if (fits(text)) return;

        // The longest prefix that still fits on `lines` lines with the ellipsis.
        let low = 0;
        let high = text.length;

        while (low < high) {
          const middle = Math.ceil((low + high) / 2);

          if (fits(text.slice(0, middle).trimEnd() + "…")) low = middle;
          else high = middle - 1;
        }

        element.textContent = text.slice(0, low).trimEnd() + "…";
      };

      fit();

      const observer = new ResizeObserver(fit);

      observer.observe(box);
      document.fonts?.ready.then(fit);

      return () => observer.disconnect();
    },
    [text, lines],
  );

  return (
    <p data-pn-prow-headline>
      <span ref={ref} aria-hidden="true">
        {text}
      </span>
      <span className="pn-sr-only">{text}</span>
    </p>
  );
}

/* -------------------------------------------------------------------------- */

function SentScreen({
  invites,
  device,
  context,
  onOpenProfile,
  onOpenWithdraw,
  onReset,
}: PhoneProps & { context: NoteContext; onOpenProfile: () => void }) {
  return (
    <>
      <header data-pn-ibar data-pn-hairline>
        <span data-pn-ibar-back aria-hidden="true">
          <BackIcon />
        </span>
        <h1 data-pn-ibar-title>Invitation Manager</h1>
      </header>

      <nav data-pn-ptabs aria-label="Invitations">
        <button type="button" data-pn-ptab>
          Received
        </button>
        <button type="button" data-pn-ptab aria-current="page">
          Sent
        </button>
        <button type="button" data-pn-gear aria-label="Invitation settings">
          <GearIcon />
        </button>
      </nav>

      <div data-pn-scroll>
        <div data-pn-pfilter>
          <span data-pn-ppill>People {invites.length}</span>
        </div>

        <ul aria-label="Sent invitations">
          <AnimatePresence initial={false}>
            {invites.map((invite) => (
              <motion.li
                key={invite.id}
                data-pn-prow
                data-invite={invite.id}
                exit={{ height: 0, opacity: 0 }}
                transition={context.reduced ? NONE : ROW_OUT}
              >
                <div data-pn-prow-inner>
                  <div data-pn-prow-main>
                    {invite.id === SUBJECT_ID ? (
                      <button
                        type="button"
                        data-pn-prow-avatar
                        tabIndex={-1}
                        aria-hidden="true"
                        onClick={onOpenProfile}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={invite.avatar} width={72} height={72} alt="" />
                      </button>
                    ) : (
                      <span data-pn-prow-avatar>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={invite.avatar} width={72} height={72} alt="" />
                      </span>
                    )}
                    <div data-pn-prow-text>
                      {invite.id === SUBJECT_ID ? (
                        <button type="button" data-pn-prow-name onClick={onOpenProfile}>
                          {invite.name}
                        </button>
                      ) : (
                        <p data-pn-prow-name>{invite.name}</p>
                      )}
                      <ClampedLine text={invite.headline} lines={2} />
                      <p data-pn-prow-sent>{sentLabel(invite.sentAt, context.now)}</p>
                    </div>
                    <button
                      type="button"
                      data-pn-pwithdraw
                      data-withdraw={invite.id}
                      aria-label={`Withdraw invitation to ${invite.name}`}
                      onClick={(event) => onOpenWithdraw(invite, event.currentTarget)}
                    >
                      Withdraw
                    </button>
                  </div>
                  {invite.note && (
                    <PhoneNote invite={{ ...invite, note: invite.note }} surface="row" context={context} />
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {!device && <DemoLine onReset={onReset} />}
      </div>
    </>
  );
}

function DemoLine({ onReset }: { onReset: () => void }) {
  return (
    <p data-pn-pdemo>
      A concept by Uzo Okafor. Not affiliated with LinkedIn.
      <button type="button" onClick={onReset}>
        Reset
      </button>
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Maya's profile                                                             */
/* -------------------------------------------------------------------------- */

function ProfileScreen({
  subject,
  device,
  onBack,
  onPending,
  onReset,
}: {
  subject: Invite | null;
  device: boolean;
  onBack: () => void;
  onPending: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <header data-pn-ibar data-kind="search" data-pn-hairline>
        <button type="button" data-pn-ibar-back aria-label="Back" onClick={onBack}>
          <BackIcon />
        </button>
        <div data-pn-isearch aria-hidden="true">
          I’m looking for…
        </div>
      </header>

      <div data-pn-scroll>
        <section data-pn-pcard aria-label="Maya Okonkwo’s profile">
          <div data-pn-pcover />
          <div data-pn-pphoto>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pending-note/avatars/maya-okonkwo.svg" width={96} height={96} alt="Maya Okonkwo" />
          </div>
          <span data-pn-pbell aria-hidden="true">
            <BellIcon />
          </span>
          <h1 data-pn-pname>
            Maya Okonkwo
            <VerifiedIcon size={22} />
            <span data-pn-pdegree>· 2nd</span>
          </h1>
          <p data-pn-phead>Design Lead, Payments at Fernway</p>
          <p data-pn-porgs>
            {PROFILE.company} · {PROFILE.school}
          </p>
          <p data-pn-ploc>{PROFILE.location}</p>
          <p data-pn-pconn>
            <b>500+</b> connections
          </p>
          <p data-pn-pmutual>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PROFILE.mutual.avatar} width={24} height={24} alt="" />
            <span>
              <b>{PROFILE.mutual.name}</b> is a mutual connection
            </span>
          </p>
          <div data-pn-pactions>
            <button type="button" data-pn-pbtn="primary">
              <SendIcon />
              Message
            </button>
            {subject ? (
              <button type="button" data-pn-pbtn="outline" data-pn-connect-action aria-haspopup="dialog" onClick={onPending}>
                <ClockIcon />
                Pending
              </button>
            ) : (
              <button type="button" data-pn-pbtn="blue-outline" data-pn-connect-action>
                <ConnectIcon />
                Connect
              </button>
            )}
            <button type="button" data-pn-pbtn="more" aria-label="More actions">
              <MoreIcon />
            </button>
          </div>
        </section>

        <section data-pn-psection aria-labelledby="pn-phone-highlights">
          <h2 id="pn-phone-highlights">Highlights</h2>
          <div data-pn-pintro>
            <IntroIllustration />
            <div>
              <h3>Get introduced to Maya</h3>
              <p>Ask your mutual connections to help you start a conversation.</p>
              <button type="button" data-pn-pbtn="outline">
                Message top connections
              </button>
            </div>
          </div>
        </section>

        <section data-pn-psection aria-labelledby="pn-phone-about">
          <h2 id="pn-phone-about">About</h2>
          <p data-pn-pabout>{PROFILE.about}</p>
        </section>

        {!device && <DemoLine onReset={onReset} />}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab bar (from app/linkedin-nav's phone bar, with its animated icons)      */
/* -------------------------------------------------------------------------- */

const TABS: { tab: AnimatedTab | "post"; label: string }[] = [
  { tab: "home", label: "Home" },
  { tab: "network", label: "My Network" },
  { tab: "post", label: "Post" },
  { tab: "notifications", label: "Notifications" },
  { tab: "jobs", label: "Jobs" },
];

/** `edge`: LinkedIn's iOS app draws the bar's top hairline on a profile but not on My Network or the Sent list (IMG_3152–3156). */
function TabBar({
  inert,
  edge,
  reduced,
  onNetwork,
}: {
  inert: boolean;
  edge: boolean;
  reduced: boolean;
  onNetwork: () => void;
}) {
  // A tap plays the icon's animation; only My Network goes anywhere, and the selection never moves.
  const moves = useIconMoves();

  return (
    <nav data-pn-tabbar aria-label="Primary" inert={inert} data-edge={edge ? "" : undefined}>
      <ul data-pn-tabbar-items>
        {TABS.map(({ tab, label }) => (
          <li key={tab}>
            <button
              type="button"
              data-pn-tabbar-item
              aria-current={tab === "network" ? "page" : undefined}
              onPointerDown={(event) => {
                if (event.button === 0 && tab !== "post") moves.press(tab);
              }}
              onPointerUp={() => tab !== "post" && moves.release(tab)}
              onPointerLeave={() => tab !== "post" && moves.release(tab)}
              onPointerCancel={() => tab !== "post" && moves.release(tab)}
              onClick={() => {
                if (tab === "post") return;
                if (tab === "network") {
                  moves.reselect(tab);
                  onNetwork();
                } else {
                  moves.play(tab);
                }
              }}
            >
              {tab === "post" ? (
                <NavIcon tab="post" />
              ) : (
                <AnimatedIcon tab={tab} selected={tab === "network"} reduced={reduced} handle={moves.iconRef(tab)} />
              )}
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
      <span data-pn-tabbar-indicator aria-hidden="true" />
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Bottom sheet                                                               */
/* -------------------------------------------------------------------------- */

function Sheet({
  label,
  reduced,
  overEditor = false,
  inert = false,
  onClose,
  initialFocus,
  returnFocus,
  children,
}: {
  label: string;
  reduced: boolean;
  overEditor?: boolean;
  inert?: boolean;
  onClose: () => void;
  initialFocus?: (sheet: HTMLElement) => HTMLElement | null | undefined;
  returnFocus?: () => HTMLElement | null | undefined;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const returnRef = useRef(returnFocus);
  const pendingReturn = useRef(0);

  useEffect(() => {
    returnRef.current = returnFocus;
  }, [returnFocus]);

  useLayoutEffect(() => {
    // Strict mode mounts twice: the first cleanup's focus return is cancelled, and the opener is kept.
    window.cancelAnimationFrame(pendingReturn.current);
    opener.current ??= document.activeElement as HTMLElement | null;

    const sheet = ref.current;

    if (sheet) {
      const target = initialFocus?.(sheet) ?? sheet.querySelector<HTMLElement>("[data-pn-sheet-actions] button");

      target?.focus({ preventScroll: true });
    }

    return () => {
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

    trapTab(event, ref.current);
  };

  /* Drag down to dismiss, as on iOS. ---------------------------------------- */

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  const dragY = useMotionValue(0);
  // Upwards it only gives a little, like UIKit's rubber band.
  const sheetY = useTransform(dragY, (y) => (y >= 0 ? y : -RUBBER * (1 - 1 / (1 + -y / RUBBER))));
  const scrimFade = useTransform(dragY, (y) => {
    const height = ref.current?.offsetHeight ?? 0;

    return height > 0 ? 1 - Math.min(Math.max(y, 0), height) / height : 1;
  });
  const drag = useRef<{ id: number; startY: number; dragging: boolean; samples: { y: number; t: number }[] } | null>(null);
  const springBack = useRef<{ stop: () => void } | null>(null);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;

    if (!scroller) return;

    // Content that overflows (very large text) keeps its scroll, so only the grabber strip drags it.
    const observer = new ResizeObserver(() => setScrolls(scroller.scrollHeight > scroller.clientHeight + 1));

    observer.observe(scroller);

    return () => observer.disconnect();
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || drag.current) return;
    if (scrolls && !(event.target as HTMLElement).closest("[data-pn-grab-zone]")) return;

    springBack.current?.stop();
    drag.current = { id: event.pointerId, startY: event.clientY - dragY.get(), dragging: false, samples: [] };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;

    if (!current || current.id !== event.pointerId) return;

    const y = event.clientY - current.startY;

    if (!current.dragging) {
      if (Math.abs(y) < DRAG_SLOP) return;

      // From here it's a drag: the pointer belongs to the sheet, so the button it started on won't be clicked.
      current.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    dragY.set(y);
    current.samples = [...current.samples.filter((sample) => event.timeStamp - sample.t < 100), { y, t: event.timeStamp }];
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;

    if (!current || current.id !== event.pointerId) return;

    drag.current = null;

    if (!current.dragging) return;

    const y = dragY.get();
    // The finger's speed over its last moves; nothing if it has been still for a moment.
    const recent = current.samples.filter((sample) => event.timeStamp - sample.t < 80);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const velocity = first && last && last.t > first.t ? ((last.y - first.y) / (last.t - first.t)) * 1000 : 0;
    const height = ref.current?.offsetHeight ?? Infinity;

    if (event.type === "pointerup" && y > 0 && (y > height / 3 || velocity > FLICK)) {
      // The exit slides on from here, so the sheet keeps going down.
      onClose();

      return;
    }

    springBack.current = reduced ? (dragY.jump(0), null) : animate(dragY, 0, { ...SHEET_BACK, velocity });
  };

  return (
    <div data-pn-sheet-layer data-over-editor={overEditor || undefined} inert={inert}>
      <motion.div data-pn-sheet-fade style={{ opacity: scrimFade }}>
        <motion.div
          data-pn-sheet-scrim
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: reduced ? NONE : SHEET_OUT }}
          transition={reduced ? NONE : SHEET_IN}
          onClick={onClose}
        />
      </motion.div>
      <motion.div
        data-pn-sheet-slide
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%", transition: reduced ? NONE : SHEET_OUT }}
        transition={reduced ? NONE : SHEET_IN}
      >
        <motion.div
          ref={ref}
          data-pn-sheet
          data-scrolls={scrolls || undefined}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          style={{ y: sheetY }}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div ref={scrollRef} data-pn-sheet-scroll>
            <div data-pn-grab-zone>
              <div data-pn-grabber aria-hidden="true" />
            </div>
            {children}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function trapTab(event: KeyboardEvent<HTMLElement>, root: HTMLElement | null) {
  if (event.key !== "Tab" || !root) return;

  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0,
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
}

/* -------------------------------------------------------------------------- */
/* The editor                                                                 */
/* -------------------------------------------------------------------------- */

const WORD = /[\p{L}\p{N}'’-]/u;

/** iOS puts the caret at the end of a word you tap. */
function wordEnd(text: string, index: number) {
  const inWord = WORD.test(text[index] ?? "") || (index > 0 && WORD.test(text[index - 1]));

  if (!inWord) return index;

  let end = index;

  while (end < text.length && WORD.test(text[end])) end += 1;

  return end;
}

/** The real keyboard covers the bottom of the screen on a phone; the editor stops above it. */
function useVisualViewport(enabled: boolean) {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!enabled || !viewport) return;

    const update = () => setHeight(Math.round(viewport.height));

    update();
    viewport.addEventListener("resize", update);

    return () => viewport.removeEventListener("resize", update);
  }, [enabled]);

  return enabled ? height : null;
}

type Caret = { x: number; y: number; key: string };

function Editor({
  invite,
  draft,
  device,
  reduced,
  now,
  limit,
  free,
  closedError,
  copied,
  blocked,
  onCovered,
  onDraft,
  onClose,
  onSave,
  onCopy,
}: {
  invite: Invite & { note: string };
  draft: string;
  device: boolean;
  reduced: boolean;
  now: number;
  limit: number;
  free: boolean;
  closedError: boolean;
  copied: boolean;
  blocked: boolean;
  /** The editor is all the way up. */
  onCovered: () => void;
  onDraft: (text: string) => void;
  onClose: (changed: boolean) => void;
  onSave: () => void;
  onCopy: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const keyboardApi = useRef<KeyboardApi | null>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const lineId = useId();
  const viewport = useVisualViewport(!device);

  const block = saveBlock(invite.note, draft, limit);
  const canSave = !closedError && block === null;
  const over = draft.length > limit;
  const changed = normalize(draft) !== normalize(invite.note);
  const spoken = counterAnnouncement(draft.length, limit);

  useEffect(
    function focusCopy() {
      // Save turns into Copy text. Safari never focused Save on tap, so focus is moved on purpose.
      if (closedError) copyRef.current?.focus({ preventScroll: true });
    },
    [closedError],
  );

  /* The caret, drawn in device mode so it's iOS's 2pt blue bar. -------------- */

  const [caret, setCaret] = useState<Caret | null>(null);
  const [caretAt, setCaretAt] = useState(draft.length);

  const placeCaret = useCallback(() => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;

    if (!input || !mirror) return;

    const start = input.selectionStart ?? 0;

    setCaretAt(start);

    if (!device) return;

    if (document.activeElement !== input || start !== input.selectionEnd) {
      setCaret(null);

      return;
    }

    const marker = document.createElement("span");

    marker.textContent = "​";
    mirror.replaceChildren(input.value.slice(0, start), marker, input.value.slice(start));
    setCaret({
      x: marker.offsetLeft - 1,
      y: marker.offsetTop - input.scrollTop + 0.5,
      key: `${start}:${input.value.length}`,
    });
  }, [device]);

  // Focus with the caret at the end, as soon as the editor is up.
  useLayoutEffect(() => {
    const input = inputRef.current;

    if (!input) return;

    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    placeCaret();
  }, [placeCaret]);

  useEffect(() => {
    const update = () => {
      if (document.activeElement === inputRef.current) placeCaret();
    };

    document.addEventListener("selectionchange", update);

    return () => document.removeEventListener("selectionchange", update);
  }, [placeCaret]);

  // A new draft re-wraps the text; the caret follows on the next frame.
  useLayoutEffect(() => {
    placeCaret();
  }, [draft, placeCaret]);

  /* Typing ------------------------------------------------------------------ */

  const [manualShift, setManualShift] = useState<boolean | null>(null);
  const before = draft.slice(0, caretAt);
  const autoShift = before.length === 0 || /[.!?]\s+$|\n$/.test(before);
  const shift = manualShift ?? autoShift;

  const typeKey = (key: string) => {
    const input = inputRef.current;

    if (!input) return;

    if (key === "Shift") {
      setManualShift(!shift);

      return;
    }

    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const text = key === "Enter" ? "\n" : key;
    let next = draft;
    let at = start;

    if (key === "Backspace") {
      if (start === end && start > 0) {
        next = draft.slice(0, start - 1) + draft.slice(end);
        at = start - 1;
      } else {
        next = draft.slice(0, start) + draft.slice(end);
      }
    } else {
      next = draft.slice(0, start) + text + draft.slice(end);
      at = start + text.length;
    }

    setManualShift(null);
    onDraft(next);
    requestAnimationFrame(() => {
      input.setSelectionRange(at, at);
      placeCaret();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose(changed);

      return;
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (canSave) onSave();

      return;
    }

    // A real key press shows on the drawn keyboard too.
    if (device && !event.metaKey && !event.ctrlKey && !event.altKey) keyboardApi.current?.flash(event.key);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLTextAreaElement>) => {
    if (event.pointerType === "mouse") return;

    const input = event.currentTarget;

    // After the browser has placed the caret where the finger landed.
    requestAnimationFrame(() => {
      if (input.selectionStart !== input.selectionEnd) return;

      const end = wordEnd(input.value, input.selectionStart ?? 0);

      input.setSelectionRange(end, end);
      placeCaret();
    });
  };

  const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose(changed);

      return;
    }

    trapTab(event, rootRef.current);
  };

  return (
    <motion.div
      ref={rootRef}
      data-pn-editor
      data-keyboard={device || undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      inert={blocked}
      style={viewport ? { height: viewport } : undefined}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%", transition: reduced ? NONE : EDITOR_OUT }}
      transition={reduced ? NONE : EDITOR_IN}
      onAnimationComplete={(definition) => {
        if (typeof definition === "object" && definition !== null && "y" in definition && definition.y === 0) onCovered();
      }}
      onKeyDown={handleRootKeyDown}
    >
      <header data-pn-ibar data-pn-hairline>
        <button type="button" data-pn-ibar-back aria-label="Close" onClick={() => onClose(changed)}>
          <CloseIcon />
        </button>
        <h2 id={titleId} data-pn-ibar-title>
          Edit note
        </h2>
      </header>

      <div data-pn-field>
        <div ref={mirrorRef} data-pn-field-mirror aria-hidden="true" />
        <textarea
          ref={inputRef}
          data-pn-field-input
          value={draft}
          aria-label={`Note to ${invite.name}`}
          aria-describedby={lineId}
          aria-invalid={over || undefined}
          inputMode={device ? "none" : undefined}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          onChange={(event) => {
            setManualShift(null);
            onDraft(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onPointerUp={handlePointerUp}
          onScroll={placeCaret}
          onBlur={() => setCaret(null)}
          onFocus={placeCaret}
        />
        {device && caret && (
          <span key={caret.key} data-pn-caret aria-hidden="true" style={{ left: caret.x, top: caret.y }} />
        )}
      </div>

      {closedError ? (
        <p data-pn-editor-window data-error id={lineId} role="alert">
          <ErrorIcon />
          <span>{WINDOW_CLOSED}</span>
        </p>
      ) : (
        <p data-pn-editor-window id={lineId}>
          {windowLine(invite, now)}
        </p>
      )}

      <div data-pn-editor-meta>
        {!free && (
          <span data-pn-premium>
            <PremiumIcon />
            PREMIUM
          </span>
        )}
        <span data-pn-editor-count data-over={over || undefined} aria-hidden="true">
          {draft.length}/{limit}
        </span>
      </div>
      <span className="pn-sr-only" role="status" aria-live="polite">
        {spoken}
      </span>

      <div data-pn-editor-foot>
        {closedError ? (
          <button ref={copyRef} type="button" data-pn-editor-save data-kind="outline" onClick={onCopy}>
            {copied ? "Copied" : "Copy text"}
          </button>
        ) : (
          <button
            type="button"
            data-pn-editor-save
            disabled={!canSave}
            onClick={() => {
              if (canSave) onSave();
            }}
          >
            Save
          </button>
        )}
      </div>

      {device && (
        <>
          {/* When the window closes, focus leaves the field for Copy text, so iOS drops the keyboard: it slides all the
              way off, and the footer follows its top down to the home indicator inset (the spacer's min-height). */}
          <motion.div
            data-pn-editor-keys
            aria-hidden="true"
            initial={false}
            animate={{ height: closedError ? 0 : 336 }}
            transition={reduced ? NONE : KEYBOARD}
          />
          <motion.div
            data-pn-editor-kb
            inert={closedError}
            initial={false}
            animate={{ y: closedError ? 336 : 0 }}
            transition={reduced ? NONE : KEYBOARD}
          >
            <IosKeyboard shift={shift} apiRef={keyboardApi} onType={typeKey} />
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
