"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { ME_AVATAR, PROFILE, sentLabel, SUBJECT_ID, type Invite } from "./data";
import {
  AdvertiseIcon,
  BellIcon,
  CaretIcon,
  WordmarkIcon,
  ClockIcon,
  CompanyLogo,
  ConnectIcon,
  GridIcon,
  IntroIllustration,
  LogoIcon,
  NavIcon,
  SchoolLogo,
  SearchIcon,
  SendIcon,
  VerifiedIcon,
  type NavTab,
} from "./icons";
import { EASE_OUT, NoteBox, type NoteBoxProps } from "./note-box";

/* -------------------------------------------------------------------------- */
/* Top bar                                                                    */
/* -------------------------------------------------------------------------- */

const NAV: { tab: NavTab; label: string }[] = [
  { tab: "home", label: "Home" },
  { tab: "network", label: "My Network" },
  { tab: "jobs", label: "Jobs" },
  { tab: "messaging", label: "Messaging" },
  { tab: "notifications", label: "Notifications" },
];

export function TopBar({ selected, onNetwork }: { selected: NavTab | null; onNetwork: () => void }) {
  return (
    <header data-pn-bar>
      <div data-pn-bar-inner>
        <a data-pn-logo href="#" aria-label="LinkedIn" onClick={(event) => event.preventDefault()}>
          <LogoIcon />
        </a>
        {/* Below 960px LinkedIn folds the field into its glass; the field itself is decorative here. */}
        <label data-pn-search>
          <SearchIcon />
          <span data-pn-search-text>I’m looking for…</span>
        </label>

        <nav data-pn-nav aria-label="Primary">
          {NAV.map(({ tab, label }) => (
            <button
              key={tab}
              type="button"
              data-pn-nav-item
              aria-current={selected === tab ? "page" : undefined}
              onClick={tab === "network" ? onNetwork : undefined}
            >
              <span data-pn-nav-icon-box>
                <NavIcon tab={tab} selected={selected === tab} />
                {tab === "home" && <span data-pn-dot aria-hidden="true" />}
              </span>
              <span data-pn-nav-label>
                <span data-pn-nav-text>{label}</span>
              </span>
            </button>
          ))}
          <button type="button" data-pn-nav-item aria-label="Me" aria-haspopup="menu">
            <span data-pn-nav-icon-box>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img data-pn-nav-avatar src={ME_AVATAR} width={24} height={24} alt="" />
            </span>
            <span data-pn-nav-label>
              <span data-pn-nav-text>Me</span>
              <CaretIcon />
            </span>
          </button>
          <span data-pn-nav-rule aria-hidden="true" />
          <button type="button" data-pn-nav-item data-wide aria-haspopup="menu">
            <span data-pn-nav-icon-box>
              <GridIcon />
            </span>
            <span data-pn-nav-label>
              <span data-pn-nav-text>For Business</span>
              <CaretIcon />
            </span>
          </button>
          <button type="button" data-pn-nav-item>
            <span data-pn-nav-icon-box>
              <AdvertiseIcon />
            </span>
            <span data-pn-nav-label>
              <span data-pn-nav-text>Advertise</span>
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Rail                                                                       */
/* -------------------------------------------------------------------------- */

const FOOTER = [
  "About",
  "Accessibility",
  "Help Center",
  "Privacy & Terms",
  "Ad Choices",
  "Advertising",
  "Business Services",
  "Get the LinkedIn app",
  "More",
];

export function Rail() {
  return (
    <aside data-pn-rail aria-label="Footer">
      <footer data-pn-footer>
        <p data-pn-footer-links>
          {FOOTER.map((link) => (
            <span key={link}>
              {link}
              {(link === "Privacy & Terms" || link === "Business Services") && <CaretIcon />}
            </span>
          ))}
        </p>
        <p data-pn-footer-mark>
          <WordmarkIcon />
          <span>LinkedIn Corporation © 2026</span>
        </p>
      </footer>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Sent tab                                                                   */
/* -------------------------------------------------------------------------- */

export type NoteHandlers = Pick<
  NoteBoxProps,
  "onDraft" | "onCancel" | "onSave" | "onCopy" | "copied" | "limit" | "reduced" | "now"
> & {
  editingId: string | null;
  editingSurface: string | null;
  draft: string;
  closedError: boolean;
  flash: (NoteBoxProps["flash"] & { id: string }) | null;
  focus: { id: string; serial: number };
  onEdit: (invite: Invite, surface: "row" | "dialog", button: HTMLButtonElement) => void;
};

export function noteProps(invite: Invite & { note: string }, surface: "row" | "dialog", handlers: NoteHandlers) {
  const editing = handlers.editingId === invite.id && handlers.editingSurface === surface;

  return {
    invite,
    now: handlers.now,
    limit: handlers.limit,
    reduced: handlers.reduced,
    editing,
    draft: editing ? handlers.draft : invite.note,
    closedError: editing && handlers.closedError,
    flash: handlers.flash?.id === invite.id ? handlers.flash : null,
    focusSerial: handlers.focus.id === `${surface}:${invite.id}` ? handlers.focus.serial : 0,
    onEdit: (button: HTMLButtonElement) => handlers.onEdit(invite, surface, button),
    onDraft: handlers.onDraft,
    onCancel: handlers.onCancel,
    onSave: handlers.onSave,
    onCopy: handlers.onCopy,
    copied: handlers.copied,
  } satisfies Omit<NoteBoxProps, "variant">;
}

const ROW_OUT = { duration: 0.26, ease: EASE_OUT };

export function SentPage({
  invites,
  handlers,
  onWithdraw,
  onOpenProfile,
}: {
  invites: Invite[];
  handlers: NoteHandlers;
  onWithdraw: (invite: Invite, button: HTMLButtonElement) => void;
  onOpenProfile: () => void;
}) {
  return (
    <main data-pn-main>
      <section data-pn-card data-pn-manage aria-labelledby="pn-manage-title">
        <h1 id="pn-manage-title" data-pn-manage-title>
          Manage invitations
        </h1>
        <div data-pn-tabs role="tablist" aria-label="Invitations">
          <button type="button" role="tab" data-pn-tab aria-selected="false">
            Received
          </button>
          <button type="button" role="tab" data-pn-tab aria-selected="true">
            Sent
          </button>
        </div>
      </section>

      <section data-pn-card data-pn-list aria-label="Sent invitations">
        <div data-pn-filter>
          <span data-pn-pill>People {invites.length}</span>
        </div>
        <ul data-pn-rows>
          <AnimatePresence initial={false}>
            {invites.map((invite) => (
              <motion.li
                key={invite.id}
                data-pn-row-wrap
                exit={{ height: 0, opacity: 0 }}
                transition={handlers.reduced ? { duration: 0 } : ROW_OUT}
              >
                <SentRow
                  invite={invite}
                  handlers={handlers}
                  onWithdraw={onWithdraw}
                  onOpenProfile={invite.id === SUBJECT_ID ? onOpenProfile : undefined}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </main>
  );
}

function SentRow({
  invite,
  handlers,
  onWithdraw,
  onOpenProfile,
}: {
  invite: Invite;
  handlers: NoteHandlers;
  onWithdraw: (invite: Invite, button: HTMLButtonElement) => void;
  onOpenProfile?: () => void;
}) {
  const avatar = (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-pn-avatar src={invite.avatar} width={72} height={72} alt="" />
  );

  return (
    <div data-pn-row data-invite={invite.id}>
      <div data-pn-row-main>
        {onOpenProfile ? (
          <a
            data-pn-avatar-link
            href="#"
            tabIndex={-1}
            aria-hidden="true"
            onClick={(event) => {
              event.preventDefault();
              onOpenProfile();
            }}
          >
            {avatar}
          </a>
        ) : (
          avatar
        )}
        <div data-pn-row-text>
          {onOpenProfile ? (
            <a
              data-pn-name
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onOpenProfile();
              }}
            >
              {invite.name}
            </a>
          ) : (
            <span data-pn-name>{invite.name}</span>
          )}
          <p data-pn-headline>{invite.headline}</p>
          <p data-pn-sent>{sentLabel(invite.sentAt, handlers.now)}</p>
        </div>
        <button
          type="button"
          data-pn-withdraw
          data-withdraw={invite.id}
          aria-label={`Withdraw invitation sent to ${invite.name}`}
          onClick={(event) => onWithdraw(invite, event.currentTarget)}
        >
          Withdraw
        </button>
      </div>
      {invite.note && <NoteBox variant="desktop" {...noteProps({ ...invite, note: invite.note }, "row", handlers)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

export function ProfilePage({
  invite,
  onPending,
}: {
  invite: Invite | null;
  onPending: (button: HTMLButtonElement) => void;
}) {
  return (
    <main data-pn-main>
      <section data-pn-card data-pn-profile aria-label="Maya Okonkwo’s profile">
        <div data-pn-cover />
        <div data-pn-profile-photo>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pending-note/avatars/maya-okonkwo.svg" width={152} height={152} alt="Maya Okonkwo" />
        </div>
        <div data-pn-profile-tools>
          <BellIcon />
        </div>
        <div data-pn-profile-body>
          <div>
            <h1 data-pn-profile-name>
              Maya Okonkwo
              <VerifiedIcon size={16} />
              <span data-pn-degree>· 2nd</span>
            </h1>
            <p data-pn-profile-headline>Design Lead, Payments at Fernway</p>
            <p data-pn-profile-meta>
              {PROFILE.location} · <span data-pn-contact>Contact info</span>
            </p>
            <p data-pn-profile-meta data-pn-connections>
              <b>500+</b> connections
            </p>
            <p data-pn-mutual>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PROFILE.mutual.avatar} width={24} height={24} alt="" />
              <span>
                <b>{PROFILE.mutual.name}</b> is a mutual connection
              </span>
            </p>
            <div data-pn-profile-actions>
              <button type="button" data-pn-button="primary">
                <SendIcon />
                Message
              </button>
              {invite ? (
                <button
                  type="button"
                  data-pn-button="muted"
                  data-pn-connect-action
                  aria-haspopup="dialog"
                  onClick={(event) => onPending(event.currentTarget)}
                >
                  <ClockIcon />
                  Pending
                </button>
              ) : (
                <button type="button" data-pn-button="secondary" data-pn-connect-action>
                  <ConnectIcon />
                  Connect
                </button>
              )}
              <button type="button" data-pn-button="muted">
                More
              </button>
            </div>
          </div>
          <ul data-pn-profile-orgs>
            <li data-pn-org>
              <CompanyLogo />
              {PROFILE.company}
            </li>
            <li data-pn-org>
              <SchoolLogo />
              {PROFILE.school}
            </li>
          </ul>
        </div>
      </section>

      <section data-pn-card data-pn-section aria-labelledby="pn-highlights">
        <h2 id="pn-highlights" data-pn-section-title>
          Highlights
        </h2>
        <div data-pn-highlight>
          <IntroIllustration />
          <div>
            <h3>Get introduced to Maya</h3>
            <p>Ask your mutual connections to help you start a conversation.</p>
            <button type="button" data-pn-button="muted" data-size="small">
              Message top connections
            </button>
          </div>
        </div>
      </section>

      <section data-pn-card data-pn-section aria-labelledby="pn-about">
        <h2 id="pn-about" data-pn-section-title>
          About
        </h2>
        <p data-pn-about>{PROFILE.about}</p>
      </section>
    </main>
  );
}

/** The note in the profile's Pending dialog. */
export function DialogNote({ invite, handlers }: { invite: Invite & { note: string }; handlers: NoteHandlers }) {
  return <NoteBox variant="desktop" {...noteProps(invite, "dialog", handlers)} />;
}

export function DemoNote({ onReset }: { onReset: () => void }): ReactNode {
  return (
    <p data-pn-demo>
      <span>A concept by Uzo Okafor. Not affiliated with LinkedIn.</span>
      <button type="button" data-pn-reset onClick={onReset}>
        Reset
      </button>
    </p>
  );
}
