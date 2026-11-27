"use client";

import { AnimatePresence, MotionConfig, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  changedWords,
  FREE_NOTE_LIMIT,
  isEditable,
  makeInvites,
  NOTE_LIMIT,
  SUBJECT_ID,
  type Invite,
} from "./data";
import { DemoNote, DialogNote, ProfilePage, Rail, SentPage, TopBar } from "./desktop";
import { Dialog } from "./dialog";
import type { Flash } from "./note-box";
import { Phone } from "./phone";
import "./desktop.css";
import "./phone.css";

/* Modes set on <html> by page.tsx before first paint. ----------------------- */

function noop() {
  return () => {};
}

function useHtmlFlag(name: string) {
  return useSyncExternalStore(
    noop,
    () => document.documentElement.hasAttribute(name),
    () => false,
  );
}

const PHONE_LAYOUT = "(max-width: 640px)";

function subscribePhone(listener: () => void) {
  const query = window.matchMedia(PHONE_LAYOUT);

  query.addEventListener("change", listener);

  return () => query.removeEventListener("change", listener);
}

/** Which layout to draw; null on the server, so a phone never flashes the desktop first. */
function useLayout(device: boolean) {
  return useSyncExternalStore(
    subscribePhone,
    () => (device || window.matchMedia(PHONE_LAYOUT).matches ? "phone" : "desktop"),
    () => null,
  );
}

/** Where the note was being edited from: a Sent row, or the profile's Pending dialog (a sheet on the phone). */
export type Surface = "row" | "dialog";
export type Editing = { id: string; surface: Surface; draft: string; session: number };
export type Screen = "sent" | "profile";
export type DialogState = null | { kind: "withdraw"; id: string } | { kind: "pending" };

export function PendingNote() {
  const [run, setRun] = useState(0);

  return (
    <MotionConfig reducedMotion="user">
      <Demo key={run} onReset={() => setRun((n) => n + 1)} />
    </MotionConfig>
  );
}

function Demo({ onReset }: { onReset: () => void }) {
  const device = useHtmlFlag("data-pn-device");
  const expire = useHtmlFlag("data-pn-expire");
  const free = useHtmlFlag("data-pn-free");
  const startOnProfile = useHtmlFlag("data-pn-profile");
  const layout = useLayout(device);

  // The flags can only be read on the client, so the state starts once they're known.
  if (layout === null) return <div data-pn-root data-pn-blank />;

  return (
    <App
      device={device}
      expire={expire}
      free={free}
      startOnProfile={startOnProfile}
      layout={layout}
      onReset={onReset}
    />
  );
}

function App({
  device,
  expire,
  free,
  startOnProfile,
  layout,
  onReset,
}: {
  device: boolean;
  expire: boolean;
  free: boolean;
  startOnProfile: boolean;
  layout: "phone" | "desktop";
  onReset: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const limit = free ? FREE_NOTE_LIMIT : NOTE_LIMIT;

  const [loadedAt] = useState(() => Date.now());
  const [now, setNow] = useState(loadedAt);
  const [invites, setInvites] = useState(() => makeInvites(loadedAt, { expire }));
  const [screen, setScreen] = useState<Screen>(() => (startOnProfile ? "profile" : "sent"));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [closedError, setClosedError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<(Flash & { id: string }) | null>(null);
  const [focus, setFocus] = useState({ id: "", serial: 0 });
  const [dialog, setDialog] = useState<DialogState>(null);
  const [announcement, setAnnouncement] = useState("");

  const session = useRef(0);
  const savedSession = useRef(-1);
  const timers = useRef<number[]>([]);
  const withdrawReturn = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const pending = timers.current;

    return () => {
      window.clearInterval(tick);
      pending.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);

  const subject = invites.find((invite) => invite.id === SUBJECT_ID) ?? null;

  const say = useCallback((text: string) => {
    // A trailing no-break space makes a repeat a new string, so it's read again.
    setAnnouncement((current) => (current === text ? `${text} ` : text));
  }, []);

  /* Editing ---------------------------------------------------------------- */

  const startEdit = useCallback(
    (invite: Invite, surface: Surface) => {
      if (!invite.note) return;

      session.current += 1;
      setClosedError(false);
      setCopied(false);
      setFlash(null);
      setEditing({ id: invite.id, surface, draft: invite.note, session: session.current });
    },
    [],
  );

  const changeDraft = useCallback((draft: string) => {
    setEditing((current) => (current ? { ...current, draft } : current));
    setCopied(false);
  }, []);

  const cancel = useCallback(() => {
    if (!editing) return;

    setEditing(null);
    setClosedError(false);
    setFocus((current) => ({ id: `${editing.surface}:${editing.id}`, serial: current.serial + 1 }));
  }, [editing]);

  const save = useCallback(() => {
    if (!editing || savedSession.current === editing.session) return;

    const invite = invites.find((item) => item.id === editing.id);

    if (!invite?.note) return;

    // The window closed while you were typing: keep the text and say why.
    if (!isEditable(invite, Date.now())) {
      setClosedError(true);

      return;
    }

    savedSession.current = editing.session;

    const text = editing.draft.trim();
    const spans = changedWords(invite.note, text);

    setInvites((list) =>
      list.map((item) => (item.id === invite.id ? { ...item, note: text, editedAt: Date.now() } : item)),
    );
    setEditing(null);
    setClosedError(false);
    // The phone's editor slides away first; the highlight waits for it.
    setFlash((current) => ({
      id: invite.id,
      spans,
      serial: (current?.serial ?? 0) + 1,
      delay: layout === "phone" && !reduced ? 0.42 : 0,
    }));
    setFocus((current) => ({ id: `${editing.surface}:${invite.id}`, serial: current.serial + 1 }));
    say(`Note updated. ${invite.firstName} will see it as edited.`);
  }, [editing, invites, layout, reduced, say]);

  const copy = useCallback(() => {
    if (!editing) return;

    navigator.clipboard?.writeText(editing.draft).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }, [editing]);

  /* Withdrawing ------------------------------------------------------------ */

  const remove = useCallback(
    (id: string) => {
      const invite = invites.find((item) => item.id === id);

      setInvites((list) => list.filter((item) => item.id !== id));
      if (editing?.id === id) setEditing(null);
      if (invite) say(`Invitation to ${invite.name} withdrawn.`);
    },
    [editing, invites, say],
  );

  /* Desktop ---------------------------------------------------------------- */

  const handlers = {
    now,
    limit,
    reduced,
    editingId: editing?.id ?? null,
    editingSurface: editing?.surface ?? null,
    draft: editing?.draft ?? "",
    closedError,
    flash,
    focus,
    copied,
    onEdit: (invite: Invite, surface: "row" | "dialog") => startEdit(invite, surface),
    onDraft: changeDraft,
    onCancel: cancel,
    onSave: save,
    onCopy: copy,
  };

  const openWithdraw = (invite: Invite, button: HTMLButtonElement) => {
    withdrawReturn.current = button;

    // Withdraw while editing: the editor closes first, then the confirm opens.
    if (editing?.id === invite.id) {
      setEditing(null);
      setClosedError(false);
      later(reduced ? 0 : 220, () => setDialog({ kind: "withdraw", id: invite.id }));

      return;
    }

    setDialog({ kind: "withdraw", id: invite.id });
  };

  const confirmWithdraw = (id: string) => {
    const index = invites.findIndex((item) => item.id === id);
    const next = invites[index + 1] ?? invites[index - 1];

    withdrawReturn.current = next
      ? document.querySelector<HTMLElement>(`[data-withdraw="${next.id}"]`)
      : null;
    setDialog(null);
    // The dialog leaves first; then the row closes up.
    later(reduced ? 0 : 140, () => remove(id));
  };

  const closePending = () => {
    if (editing?.surface === "dialog") {
      setEditing(null);
      setClosedError(false);
    }

    setDialog(null);
  };

  const withdrawPending = () => {
    if (!subject) return;

    const id = subject.id;

    closePending();
    later(reduced ? 0 : 140, () => remove(id));
  };

  const showScreen = (next: Screen) => {
    if (editing) setEditing(null);
    setScreen(next);
    window.scrollTo(0, 0);
  };

  const live = (
    <p className="pn-sr-only" role="status" aria-live="polite">
      {announcement}
    </p>
  );

  if (layout === "phone") {
    return (
      <>
        <Phone
          device={device}
          reduced={reduced}
          now={now}
          limit={limit}
          free={free}
          invites={invites}
          subject={subject}
          screen={screen}
          onScreen={setScreen}
          editing={editing}
          closedError={closedError}
          copied={copied}
          flash={flash}
          focus={focus}
          dialog={dialog}
          onOpenWithdraw={openWithdraw}
          onConfirmWithdraw={confirmWithdraw}
          onCloseDialog={closePending}
          onOpenPending={() => setDialog({ kind: "pending" })}
          onWithdrawPending={withdrawPending}
          withdrawReturn={() => withdrawReturn.current}
          onEdit={startEdit}
          onDraft={changeDraft}
          onCancel={cancel}
          onSave={save}
          onCopy={copy}
          onReset={onReset}
        />
        {live}
      </>
    );
  }

  const withdrawing = dialog?.kind === "withdraw" ? invites.find((item) => item.id === dialog.id) : null;

  return (
    <div data-pn-root data-pn-desktop>
      {/* linkedin.com marks no item current on Invitation Manager or a profile (checked 27 Nov 2026). */}
      <TopBar selected={null} onNetwork={() => showScreen("sent")} />
      <div data-pn-layout>
        {screen === "sent" ? (
          <SentPage
            invites={invites}
            handlers={handlers}
            onWithdraw={openWithdraw}
            onOpenProfile={() => showScreen("profile")}
          />
        ) : (
          <ProfilePage invite={subject} onPending={() => setDialog({ kind: "pending" })} />
        )}
        <Rail />
      </div>
      <DemoNote onReset={onReset} />

      <AnimatePresence>
        {withdrawing && (
          <Dialog
            key="withdraw"
            title="Withdraw invitation"
            size="confirm"
            reduced={reduced}
            onClose={() => setDialog(null)}
            returnFocus={() => withdrawReturn.current}
            footer={
              <>
                <button type="button" data-pn-button="secondary" onClick={() => setDialog(null)}>
                  Cancel
                </button>
                <button type="button" data-pn-button="primary" onClick={() => confirmWithdraw(withdrawing.id)}>
                  Withdraw
                </button>
              </>
            }
          >
            <p>If you withdraw now, you won’t be able to resend to this person for up to 3 weeks.</p>
          </Dialog>
        )}

        {dialog?.kind === "pending" && subject && (
          <Dialog
            key="pending"
            title="Pending invitation"
            size="medium"
            reduced={reduced}
            onClose={closePending}
            initialFocus={() => document.querySelector<HTMLElement>("[data-pn-dialog] [data-pn-text-button][data-strong]")}
            // Safari doesn't focus a button on click, so the opener can't be read from document.activeElement.
            returnFocus={() => document.querySelector<HTMLElement>("[data-pn-connect-action]")}
            footer={
              <>
                <button type="button" data-pn-button="secondary" onClick={closePending}>
                  Cancel
                </button>
                <button type="button" data-pn-button="primary" onClick={withdrawPending}>
                  Withdraw
                </button>
              </>
            }
          >
            {subject.note && (
              <>
                <p data-pn-note-label>Your note</p>
                <DialogNote invite={{ ...subject, note: subject.note }} handlers={handlers} />
              </>
            )}
            <p data-pn-dialog-warning data-first={!subject.note || undefined}>
              If you withdraw now, you won’t be able to resend to this person for up to 3 weeks.
            </p>
          </Dialog>
        )}
      </AnimatePresence>

      {live}
    </div>
  );
}
