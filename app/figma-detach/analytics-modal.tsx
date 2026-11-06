"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  breakdown,
  filesSummary,
  formatCount,
  insertSeries,
  sortRows,
  withSession,
  type Row,
  type Session,
  type SortDir,
  type SortKey,
} from "./analytics";
import { firstGrapheme, splitTail } from "./asking";
import { LIBRARY, RANGES, STATS, TOP_TEAMS, type RangeId } from "./data";
import { BackIcon, ChevronDownIcon, CloseIcon, InstanceIcon, LibraryIcon, SortIcon } from "./icons";

const EASE: [number, number, number, number] = [0.2, 0, 0, 1];

/* Figma's own accent colours, one per reason. Every bar also carries its label and count. */
const REASON_COLORS: Record<string, string> = {
  missing: "var(--reason-missing)",
  spacing: "var(--reason-spacing)",
  content: "var(--reason-content)",
  broken: "var(--reason-broken)",
};

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "instances", label: "Instances", numeric: true },
  { key: "inserts", label: "Inserts", numeric: true },
  { key: "detaches", label: "Detaches", numeric: true },
  { key: "reasons", label: "Reasons" },
];

type AnalyticsModalProps = {
  open: boolean;
  /** Where focus goes when the modal closes. */
  opener: RefObject<HTMLElement | null>;
  session: Session;
  reducedMotion: boolean;
  onClose: () => void;
};

export function AnalyticsModal({ open, opener, session, reducedMotion, onClose }: AnalyticsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"overview" | "analytics">("analytics");
  const [drill, setDrill] = useState<string | null>(null);
  const titleId = useId();

  /* A native modal dialog: the editor behind it is inert, and focus returns to the opener. */
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="fd-modal"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        /*
         * Escape closes the drill-in first, then the modal. Handled on keydown:
         * Chrome stops honouring preventDefault on repeated cancel events.
         */
        if (event.key === "Escape" && drill) {
          event.preventDefault();
          setDrill(null);
        }
      }}
      onCancel={(event) => {
        if (drill) {
          event.preventDefault();
          setDrill(null);
        }
      }}
      onClose={() => {
        setDrill(null);
        onClose();
        // Safari doesn't focus a clicked button, so it has no opener to go back to; say where.
        requestAnimationFrame(() => opener.current?.focus());
      }}
      onPointerDown={(event) => {
        // A click on the backdrop lands on the dialog itself.
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      {open && (
        <div className="fd-modal-frame">
          <header className="fd-modal-head">
            <LibraryIcon className="fd-modal-icon" />
            <h2 className="fd-modal-title" id={titleId}>
              {LIBRARY}
            </h2>
            <span className="fd-modal-by">Northwind</span>
            <button type="button" className="fd-icon-button fd-modal-close" aria-label="Close" onClick={() => dialogRef.current?.close()}>
              <CloseIcon />
            </button>
          </header>

          <div className="fd-modal-tabs" role="tablist" aria-label="Library">
            {(["overview", "analytics"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`fd-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`fd-panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                // The modal opens onto the selected tab, not the close button.
                autoFocus={tab === id}
                className="fd-tab"
                data-active={tab === id ? "" : undefined}
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  const next = id === "overview" ? "analytics" : "overview";
                  setTab(next);
                  document.getElementById(`fd-tab-${next}`)?.focus();
                }}
              >
                {id === "overview" ? "Overview" : "Analytics"}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="fd-modal-body" role="tabpanel" id="fd-panel-overview" aria-labelledby="fd-tab-overview">
              <Overview />
            </div>
          ) : (
            <div className="fd-modal-body" role="tabpanel" id="fd-panel-analytics" aria-labelledby="fd-tab-analytics">
              <Analytics session={session} drill={drill} onDrill={setDrill} reducedMotion={reducedMotion} />
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

/* ------------------------------------------------------------------------ */
/* Overview                                                                  */
/* ------------------------------------------------------------------------ */

function Overview() {
  return (
    <div className="fd-overview">
      <dl className="fd-cards">
        <Card label="Teams using this library" value="5" />
        <Card label="Total components" value="48" />
        <Card label="Total styles" value="32" />
        <Card label="Total variables" value="214" />
        <Card label="Activity this week" value="1,284 inserts" />
      </dl>
      <p className="fd-muted">
        Orbit is Northwind’s product design system: components, color and type styles, and spacing variables for web and
        mobile. Switch to Analytics to see how it’s used.
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="fd-card">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Analytics                                                                 */
/* ------------------------------------------------------------------------ */

function Analytics({
  session,
  drill,
  onDrill,
  reducedMotion,
}: {
  session: Session;
  drill: string | null;
  onDrill: (id: string | null) => void;
  reducedMotion: boolean;
}) {
  const [type, setType] = useState<"components" | "styles" | "variables">("components");
  const [range, setRange] = useState<RangeId>("30");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "detaches", dir: "descending" });
  const openerRef = useRef<string | null>(null);

  const rows = useMemo(() => sortRows(withSession(STATS, session, range), sort.key, sort.dir), [session, range, sort]);
  const series = useMemo(() => insertSeries(range), [range]);
  const rangeLabel = RANGES.find((entry) => entry.id === range)!.label;
  const drilled = drill ? rows.find((row) => row.id === drill) ?? null : null;

  function onSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "ascending" ? "descending" : "ascending" }
        : { key, dir: key === "name" ? "ascending" : "descending" },
    );
  }

  function openDrill(id: string) {
    openerRef.current = id;
    onDrill(id);
  }

  // Into the drill-in, focus goes to its heading, even when a panel still sliding
  // out is reused. The panel starts off to the right, so focusing without
  // preventScroll would scroll the whole analytics view sideways to reveal it.
  // Back out, focus returns to the count that opened it.
  useEffect(() => {
    if (drill) {
      document.getElementById("fd-drill-title")?.focus({ preventScroll: true });
      return;
    }

    if (!openerRef.current) return;

    document.querySelector<HTMLElement>(`[data-drill="${openerRef.current}"]`)?.focus();
    openerRef.current = null;
  }, [drill]);

  return (
    <div className="fd-analytics">
      <div className="fd-analytics-main" inert={drill ? true : undefined}>
        <div className="fd-filters">
          <Select label="Type" value={type} onChange={(value) => setType(value as typeof type)}>
            <option value="components">Components</option>
            <option value="styles">Styles</option>
            <option value="variables">Variables</option>
          </Select>
          <Select label="Duration" value={range} onChange={(value) => setRange(value as RangeId)}>
            {RANGES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </Select>
        </div>

        {type !== "components" ? (
          <p className="fd-empty">
            This concept only fills in components. Styles and variables work the same way in Figma, without reasons.
          </p>
        ) : (
          <>
            <div className="fd-insights">
              <Graph series={series} rangeLabel={rangeLabel} />
              <TopTeams total={series.reduce((sum, n) => sum + n, 0)} />
            </div>

            <table className="fd-table">
              <caption className="fd-sr-only">
                Component statistics, {rangeLabel.toLowerCase()}. Detaches open why people detached.
              </caption>
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={sort.key === column.key ? sort.dir : "none"}
                      data-numeric={column.numeric ? "" : undefined}
                      data-col={column.key}
                    >
                      <button type="button" className="fd-sort" onClick={() => onSort(column.key)}>
                        {column.label}
                        <SortIcon dir={sort.key === column.key ? sort.dir : "none"} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <TableRow key={row.id} row={row} onOpen={() => openDrill(row.id)} />
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <AnimatePresence>
        {drilled && (
          <motion.section
            key="drill"
            className="fd-drill"
            aria-labelledby="fd-drill-title"
            initial={reducedMotion ? { opacity: 0 } : { transform: "translateX(100%)" }}
            animate={
              reducedMotion
                ? { opacity: 1, transition: { duration: 0.12, ease: EASE } }
                : { transform: "translateX(0%)", transition: { duration: 0.22, ease: EASE } }
            }
            exit={
              reducedMotion
                ? { opacity: 0, transition: { duration: 0.12, ease: EASE } }
                : { transform: "translateX(100%)", transition: { duration: 0.16, ease: EASE } }
            }
          >
            {/* Keyed by row, so another component's bars grow from zero rather than morphing. */}
            <DrillIn key={drilled.id} row={drilled} rangeLabel={rangeLabel} reducedMotion={reducedMotion} onBack={() => onDrill(null)} />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="fd-select">
      <span className="fd-sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      <ChevronDownIcon aria-hidden="true" />
    </label>
  );
}

function Graph({ series, rangeLabel }: { series: number[]; rangeLabel: string }) {
  const width = 480;
  const height = 120;
  const max = Math.max(...series) * 1.1;
  const step = width / (series.length - 1);
  const points = series.map((value, index) => [index * step, height - (value / max) * height] as const);
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const total = series.reduce((sum, n) => sum + n, 0);

  return (
    <figure className="fd-graph">
      <figcaption>
        <span className="fd-section-title">Insertions</span>
        <span className="fd-graph-total">{formatCount(total)}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${total.toLocaleString("en-US")} component insertions, ${rangeLabel.toLowerCase()}. Weekdays run three times higher than weekends.`}
      >
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line key={fraction} x1="0" x2={width} y1={height * fraction} y2={height * fraction} className="fd-graph-grid" />
        ))}
        <path d={`${line} L${width} ${height} L0 ${height} Z`} className="fd-graph-area" />
        <path d={line} className="fd-graph-line" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="fd-graph-axis" aria-hidden="true">
        <span>{rangeLabel}</span>
        <span>This week</span>
      </div>
    </figure>
  );
}

function TopTeams({ total }: { total: number }) {
  return (
    <div className="fd-teams">
      <h3 className="fd-section-title">Top teams</h3>
      <ol>
        {TOP_TEAMS.map((team) => (
          <li key={team.name}>
            <span className="fd-team-name" title={team.name}>
              {team.name}
            </span>
            <span className="fd-team-count">{formatCount(Math.round(total * team.share))}</span>
            <span className="fd-team-share">{Math.round(team.share * 100)}%</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TableRow({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const parts = breakdown(row.reasons).filter((part) => part.count > 0);

  return (
    <tr
      onClick={(event) => {
        // The whole row opens the drill-in for pointer users; the count is the keyboard target.
        if (!(event.target as HTMLElement).closest("button")) onOpen();
      }}
    >
      <th scope="row" className="fd-table-name">
        <span className="fd-table-name-inner">
          <InstanceIcon className="fd-table-icon" aria-hidden="true" />
          <span className="fd-table-name-text" title={row.name}>
            {row.name}
          </span>
          <span className="fd-table-variants">{row.variants} {row.variants === 1 ? "variant" : "variants"}</span>
        </span>
      </th>
      <td data-numeric="">{formatCount(row.instances)}</td>
      <td data-numeric="">{formatCount(row.inserts)}</td>
      <td data-numeric="">
        <button type="button" className="fd-count" data-drill={row.id} onClick={onOpen}>
          {formatCount(row.detaches)}
          <span className="fd-sr-only">
            {" "}
            detaches of {row.name}
            {row.mine ? ", including yours" : ""}. Show why
          </span>
        </button>
        {row.mine && <span className="fd-mine" aria-hidden="true" title="Includes your detach" />}
      </td>
      <td>
        {row.reasonTotal > 0 ? (
          <span className="fd-stack" role="img" aria-label={parts.map((part) => `${part.short} ${part.count}`).join(", ")}>
            {parts.map((part) => (
              <span key={part.id} style={{ flexGrow: part.count, background: REASON_COLORS[part.id] }} />
            ))}
          </span>
        ) : (
          <span className="fd-muted">{row.detaches > 0 ? "None yet" : "—"}</span>
        )}
      </td>
    </tr>
  );
}

/**
 * Truncates in the middle, so "…review" and "…review (copy)" stay apart. The
 * head ellipsises and the tail always shows; when the text fits, they join up.
 */
function MiddleText({ text, className }: { text: string; className: string }) {
  const [head, tail] = splitTail(text, 12);

  return (
    <span className={`fd-middle ${className}`} title={text}>
      {/* Screen readers would read the two halves as separate lines, so they get the whole name. */}
      <span className="fd-middle-head" aria-hidden="true">
        {head}
      </span>
      <span className="fd-middle-tail" aria-hidden="true">
        {tail}
      </span>
      <span className="fd-sr-only">{text}</span>
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Why people detached                                                       */
/* ------------------------------------------------------------------------ */

function DrillIn({
  row,
  rangeLabel,
  reducedMotion,
  onBack,
}: {
  row: Row;
  rangeLabel: string;
  reducedMotion: boolean;
  onBack: () => void;
}) {
  const tipId = useId();
  const parts = breakdown(row.reasons);
  const max = Math.max(1, ...parts.map((part) => part.count));
  const files = filesSummary(row.files);
  const unexplained = row.detaches - row.reasonTotal;

  return (
    <>
      <header className="fd-drill-head">
        <button type="button" className="fd-icon-button" aria-label="Back to components" onClick={onBack}>
          <BackIcon />
        </button>
        <div className="fd-drill-title-wrap">
          <h3 className="fd-drill-title" id="fd-drill-title" tabIndex={-1}>
            <InstanceIcon aria-hidden="true" className="fd-drill-icon" />
            <MiddleText className="fd-drill-name" text={row.name} />
          </h3>
          <p className="fd-muted">
            Why people detached · {rangeLabel.replace("Last", "last")}
          </p>
        </div>
      </header>

      <div className="fd-drill-body">
        {row.detaches === 0 ? (
          <p className="fd-empty">No detaches in the {rangeLabel.toLowerCase()}.</p>
        ) : row.reasonTotal === 0 ? (
          <p className="fd-empty">
            {row.detaches.toLocaleString("en-US")} {row.detaches === 1 ? "detach" : "detaches"}, no reasons yet: reasons started Nov
            2026.
          </p>
        ) : (
          <>
            <p className="fd-drill-summary">
              {/* The drill-in has room, so counts are exact here; the table abbreviates. */}
              <strong>{row.detaches.toLocaleString("en-US")}</strong> {row.detaches === 1 ? "detach" : "detaches"} ·{" "}
              <strong>{row.reasonTotal.toLocaleString("en-US")}</strong> with a reason
              {unexplained > 0 && (
                <span className="fd-muted"> · {unexplained.toLocaleString("en-US")} skipped or before Nov 2026</span>
              )}
            </p>

            <ul className="fd-bars" aria-label="Reasons">
              {parts.map((part, index) => (
                <li key={part.id} className="fd-bar-row">
                  <span className="fd-bar-label">{part.short}</span>
                  <span className="fd-bar-track" aria-hidden="true">
                    <motion.span
                      className="fd-bar"
                      style={{ background: REASON_COLORS[part.id], transformOrigin: "0 50%" }}
                      initial={reducedMotion ? false : { transform: "scaleX(0)" }}
                      animate={{ transform: `scaleX(${part.count / max})` }}
                      transition={{ duration: 0.22, ease: EASE, delay: reducedMotion ? 0 : 0.12 + index * 0.03 }}
                    />
                  </span>
                  <span className="fd-bar-count">{part.count.toLocaleString("en-US")}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {row.notes.length > 0 && (
          <section className="fd-drill-section" aria-labelledby="fd-notes-title">
            <h4 className="fd-section-title" id="fd-notes-title">
              Recent notes
            </h4>
            <ul className="fd-notes">
              {row.notes.slice(0, 5).map((note, index) => (
                <li key={`${note.text}-${index}`} className="fd-note-item" data-mine={note.who === "You" ? "" : undefined}>
                  <span className="fd-avatar" aria-hidden="true">
                    {firstGrapheme(note.who)}
                  </span>
                  <span className="fd-note-body">
                    <q dir="auto">{note.text}</q>
                    <span className="fd-muted">
                      {note.who} · {note.file} · {note.when === "now" ? "just now" : `${note.when} ago`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {row.files.length > 0 && (
          <section className="fd-drill-section" aria-labelledby="fd-files-title">
            <h4 className="fd-section-title" id="fd-files-title">
              Files
            </h4>
            <ul className="fd-files">
              {files.top.map((file) => (
                <li key={file.name}>
                  <MiddleText className="fd-file-row-name" text={file.name} />
                  <span className="fd-file-row-count">
                    {file.count.toLocaleString("en-US")}
                    <span className="fd-sr-only"> {file.count === 1 ? "detach" : "detaches"}</span>
                  </span>
                </li>
              ))}
              {files.more > 0 && (
                <li className="fd-muted">
                  {files.moreCount.toLocaleString("en-US")} more in {files.more} other {files.more === 1 ? "file" : "files"}
                </li>
              )}
            </ul>
          </section>
        )}

        {row.reasonTotal > 0 && (
          <div className="fd-drill-foot">
            <button type="button" className="fd-request" aria-disabled="true" aria-describedby={tipId}>
              Create variant request
            </button>
            <span className="fd-request-tip" id={tipId} role="tooltip">
              Concept
            </span>
          </div>
        )}
      </div>
    </>
  );
}
