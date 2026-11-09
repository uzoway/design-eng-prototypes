/*
 * The nav's state: which tab is selected and what each badge counts. Kept
 * free of React so the reducer and the strings can be unit tested.
 */

export type Tab = "home" | "network" | "jobs" | "messaging" | "notifications";

export type Simulated = "notification" | "message" | "post";

export const TABS: readonly Tab[] = ["home", "network", "jobs", "messaging", "notifications"];

export const LABELS: Record<Tab, string> = {
  home: "Home",
  network: "My Network",
  jobs: "Jobs",
  messaging: "Messaging",
  notifications: "Notifications",
};

/** Which tab each simulated event lands on. */
export const TARGET: Record<Simulated, Tab> = {
  notification: "notifications",
  message: "messaging",
  post: "home",
};

/** Polite live-region text for each simulated event. */
export const ANNOUNCEMENT: Record<Simulated, string> = {
  notification: "New notification",
  message: "New message",
  post: "New post in your feed",
};

export type NavState = {
  selected: Tab;
  counts: Record<Tab, number>;
  /** One more for every event a tab is flagged for, so a badge can bump even when its count can't change. */
  pulses: Record<Tab, number>;
};

export type NavAction =
  { type: "select"; tab: Tab } | { type: "clear"; tab: Tab } | { type: "simulate"; event: Simulated };

/** As the owner's screenshot: Home selected, Home's dot showing, nothing else. */
export const INITIAL: NavState = {
  selected: "home",
  counts: { home: 1, network: 0, jobs: 0, messaging: 0, notifications: 0 },
  pulses: { home: 0, network: 0, jobs: 0, messaging: 0, notifications: 0 },
};

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "select":
      // The badge stays until the selection lands; "clear" removes it then.
      return state.selected === action.tab ? state : { ...state, selected: action.tab };

    case "clear":
      if (state.counts[action.tab] === 0) return state;

      return { ...state, counts: { ...state.counts, [action.tab]: 0 } };

    case "simulate": {
      const tab = TARGET[action.event];

      // You're already looking at it, so there's nothing new to flag.
      if (state.selected === tab) return state;

      // Home shows a dot, never a number, so it only needs to be on.
      const next = tab === "home" ? 1 : state.counts[tab] + 1;

      return {
        ...state,
        counts: { ...state.counts, [tab]: next },
        pulses: { ...state.pulses, [tab]: state.pulses[tab] + 1 },
      };
    }
  }
}

/** The text inside a count badge: "", "1" … "99", then "99+". */
export function formatCount(count: number) {
  if (count <= 0) return "";
  if (count > 99) return "99+";

  return String(Math.floor(count));
}

/** LinkedIn puts the count in each tab's name: "Notifications, 2 new notifications". */
export function tabName(tab: Tab, count: number) {
  const n = Math.max(0, Math.floor(count));

  return `${LABELS[tab]}, ${n} new notification${n === 1 ? "" : "s"}`;
}
