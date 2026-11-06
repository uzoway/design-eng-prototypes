/*
 * Library analytics as the Orbit team would see them: the canned 30 days,
 * plus whatever this visitor detached and told them during the session.
 */

import {
  DAILY_INSERTS,
  FILE_NAME,
  RANGES,
  SENT_REASONS,
  type ComponentStats,
  type Note,
  type RangeId,
  type ReasonCounts,
  type ReasonId,
} from "./data.ts";

export type SentReason = {
  /** One send can cover several layers of the same component. */
  componentId: string;
  reason: Exclude<ReasonId, "exploring">;
  note: string;
};

export type Session = {
  /** Component ids, once per detached layer. */
  detaches: string[];
  reasons: SentReason[];
};

export type Row = ComponentStats & { reasonTotal: number; mine: boolean };

export function scaleFor(range: RangeId) {
  return RANGES.find((entry) => entry.id === range)?.scale ?? 1;
}

export function withSession(stats: ComponentStats[], session: Session, range: RangeId = "30"): Row[] {
  const scale = scaleFor(range);

  return stats.map((row) => {
    const detached = session.detaches.filter((id) => id === row.id).length;
    const sent = session.reasons.filter((entry) => entry.componentId === row.id);
    const reasons: ReasonCounts = { ...row.reasons };

    for (const entry of sent) reasons[entry.reason] = (reasons[entry.reason] ?? 0) + 1;

    const notes: Note[] = [
      ...sent
        .filter((entry) => entry.note)
        .reverse()
        .map((entry) => ({ text: entry.note, who: "You", file: FILE_NAME, when: "now" })),
      ...row.notes,
    ];

    return {
      ...row,
      inserts: Math.round(row.inserts * scale),
      detaches: Math.round(row.detaches * scale) + detached,
      reasons,
      notes,
      reasonTotal: totalOf(reasons),
      mine: detached > 0 || sent.length > 0,
    };
  });
}

export function totalOf(reasons: ReasonCounts) {
  return SENT_REASONS.reduce((sum, reason) => sum + (reasons[reason.id as keyof ReasonCounts] ?? 0), 0);
}

/** Reasons in their fixed order, with counts and shares of the total. */
export function breakdown(reasons: ReasonCounts) {
  const total = totalOf(reasons);

  return SENT_REASONS.map((reason) => {
    const count = reasons[reason.id as keyof ReasonCounts] ?? 0;

    return { ...reason, count, share: total === 0 ? 0 : count / total };
  });
}

export function topReason(reasons: ReasonCounts) {
  const [top] = [...breakdown(reasons)].sort((a, b) => b.count - a.count);

  return top && top.count > 0 ? top : null;
}

export type SortKey = "name" | "instances" | "inserts" | "detaches" | "reasons";
export type SortDir = "ascending" | "descending";

export function sortRows(rows: Row[], key: SortKey, dir: SortDir) {
  const sign = dir === "ascending" ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (key === "name") return sign * a.name.localeCompare(b.name);

    const value = (row: Row) => (key === "reasons" ? row.reasonTotal : row[key]);
    const diff = value(a) - value(b);

    return diff !== 0 ? sign * diff : a.name.localeCompare(b.name);
  });
}

/** 9,999 stays exact; 12,406 becomes 12.4k, as Figma's analytics do. */
export function formatCount(n: number) {
  if (n < 10_000) return n.toLocaleString("en-US");
  if (n < 1_000_000) return `${trim(n / 1000)}k`;

  return `${trim(n / 1_000_000)}M`;
}

function trim(n: number) {
  return (Math.floor(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
}

/** Insert counts for the graph: daily for 30 days, then grouped so there are never more than 30 points. */
export function insertSeries(range: RangeId) {
  const scale = scaleFor(range);
  const days = Math.round(30 * scale);
  const points = Math.min(30, days);
  const perPoint = days / points;

  return Array.from({ length: points }, (_, index) => {
    const base = DAILY_INSERTS[index % DAILY_INSERTS.length];

    // Older stretches of the year ran a little lower.
    const drift = 1 - (points - 1 - index) * 0.004 * (scale - 1);

    return Math.round(base * perPoint * drift);
  });
}

export function filesSummary(files: ComponentStats["files"], shown = 4) {
  const top = files.slice(0, shown);
  const rest = files.slice(shown);

  return { top, more: rest.length, moreCount: rest.reduce((sum, file) => sum + file.count, 0) };
}
