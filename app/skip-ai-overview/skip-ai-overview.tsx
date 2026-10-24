"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { AiOverview, Favicon } from "./ai-overview";
import { AppsIcon, ClearIcon, GoogleLogo, LensIcon, MenuIcon, MicIcon, MoreVertIcon, PaaChevronIcon, SearchIcon } from "./icons";
import { DEFAULT_SEARCH, SOURCES, searchFor, type Question, type Result, type Search } from "./queries";
import { getAlwaysSkip, getServerAlwaysSkip, setAlwaysSkip, subscribeAlwaysSkip } from "./settings";
import { ThemeToggle } from "./theme-toggle";
import "./skip-ai-overview.css";

const TABS = ["AI Mode", "All", "Images", "Videos", "Forums", "Short videos", "News"];

export function SkipAiOverview() {
  // The "Always skip" setting lives in this browser, so the page renders on the client.
  const alwaysSkip = useSyncExternalStore(subscribeAlwaysSkip, getAlwaysSkip, getServerAlwaysSkip);

  if (alwaysSkip === null) return <div className="sk-root sk-loading" aria-busy="true" />;

  return <SearchPage alwaysSkip={alwaysSkip} />;
}

function SearchPage({ alwaysSkip }: { alwaysSkip: boolean }) {
  const [text, setText] = useState(DEFAULT_SEARCH.query);
  const [search, setSearch] = useState<Search>(DEFAULT_SEARCH);
  /** Every search is a fresh run: a new overview, with its own timers. */
  const [run, setRun] = useState(0);
  /** Whether this run has an overview. Decided when you search, not when the setting changes. */
  const [withOverview, setWithOverview] = useState(!alwaysSkip);
  const [announcement, setAnnouncement] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const announceTimerRef = useRef(0);

  // Clearing first lets the same message be announced twice in a row.
  const announce = useCallback((message: string) => {
    window.clearTimeout(announceTimerRef.current);
    setAnnouncement("");
    announceTimerRef.current = window.setTimeout(() => setAnnouncement(message), 60);
  }, []);

  const startRun = (next: Search, overview: boolean) => {
    setSearch(next);
    setWithOverview(overview);
    setRun((value) => value + 1);
    window.scrollTo({ top: 0 });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!text.trim()) return;

    // Closes the keyboard on phones.
    inputRef.current?.blur();
    startRun(searchFor(text), !alwaysSkip);
  };

  const resetConcept = () => {
    setAlwaysSkip(false);
    startRun(search, true);
    announce("Concept reset. AI Overviews are back on.");
  };

  return (
    <div className="sk-root">
      <header className="sk-header">
        <div className="sk-header-top">
          <span className="sk-menu" aria-hidden="true">
            <MenuIcon />
          </span>

          <span className="sk-logo" role="img" aria-label="Google">
            <GoogleLogo />
          </span>

          <form role="search" className="sk-search" onSubmit={submit}>
            <span className="sk-search-glass" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              className="sk-search-input"
              type="text"
              name="q"
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label="Search"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
            />
            {text && (
              <button
                type="button"
                className="sk-search-clear"
                aria-label="Clear"
                onClick={() => {
                  setText("");
                  inputRef.current?.focus();
                }}
              >
                <ClearIcon size={28} />
              </button>
            )}
            <span className="sk-search-sep" aria-hidden="true" />
            <span className="sk-search-tool" aria-hidden="true">
              <MicIcon />
            </span>
            <span className="sk-search-tool sk-search-lens" aria-hidden="true">
              <LensIcon />
            </span>
          </form>

          <div className="sk-header-end">
            <ThemeToggle />
            <span className="sk-icon-button sk-apps" aria-hidden="true">
              <AppsIcon />
            </span>
            <span className="sk-avatar" role="img" aria-label="Account">
              <span>U</span>
            </span>
          </div>
        </div>

        <div className="sk-tabs" aria-hidden="true">
          {TABS.map((tab) => (
            <span key={tab} className="sk-tab" data-active={tab === "All" ? "" : undefined}>
              <span className="sk-tab-label">{tab}</span>
            </span>
          ))}
          <span className="sk-tab">
            <span className="sk-tab-label">
              More <span className="sk-caret" />
            </span>
          </span>
          <span className="sk-tab sk-tab-tools">
            <span className="sk-tab-label">
              Tools <span className="sk-caret" />
            </span>
          </span>
        </div>
      </header>

      <div className="sk-main">
        {withOverview && (
          <AiOverview
            key={`overview-${run}`}
            search={search}
            announce={announce}
            onAlwaysSkip={() => setAlwaysSkip(true)}
            onTurnBackOn={() => setAlwaysSkip(false)}
          />
        )}

        <h2 className="sk-sr-only">Search results</h2>

        <div className="sk-results">
          {search.results.map((result) => (
            <ResultItem key={`${run}-${result.title}`} result={result} />
          ))}
        </div>

        <PeopleAlsoAsk key={`paa-${run}`} questions={search.questions} />

        <footer className="sk-footer">
          <p>A concept by Uzo Okafor. Not affiliated with Google.</p>
          <button type="button" className="sk-reset" onClick={resetConcept}>
            Reset concept
          </button>
        </footer>
      </div>

      <div className="sk-sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}

function ResultItem({ result }: { result: Result }) {
  const source = SOURCES[result.source];

  return (
    <article className="sk-result">
      <div className="sk-result-site">
        <span className="sk-result-favicon">
          <Favicon sourceId={source.id} size={18} />
        </span>
        <span className="sk-result-names">
          <span className="sk-result-name">{source.name}</span>
          <span className="sk-result-cite">
            {source.url}
            <span className="sk-result-crumb"> › {result.breadcrumb}</span>
          </span>
        </span>
        <MoreVertIcon size={18} className="sk-result-more" />
      </div>
      <h3 className="sk-result-title">{result.title}</h3>
      <p className="sk-result-snippet">
        {result.date && <span className="sk-result-date">{result.date} — </span>}
        {result.snippet}
      </p>
    </article>
  );
}

function PeopleAlsoAsk({ questions }: { questions: Question[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const baseId = useId();

  return (
    <section className="sk-paa" aria-labelledby={`${baseId}-heading`}>
      <div className="sk-paa-head">
        <h2 id={`${baseId}-heading`} className="sk-paa-title">
          People also ask
        </h2>
        <MoreVertIcon size={18} className="sk-result-more" />
      </div>
      <ul className="sk-paa-list">
        {questions.map((item, index) => {
          const expanded = open === index;
          const answerId = `${baseId}-answer-${index}`;

          return (
            <li key={item.question} className="sk-paa-item">
              <h3 className="sk-paa-question">
                <button
                  type="button"
                  className="sk-paa-button"
                  aria-expanded={expanded}
                  aria-controls={answerId}
                  onClick={() => setOpen(expanded ? null : index)}
                >
                  <span>{item.question}</span>
                  <span className="sk-paa-chevron" data-open={expanded ? "" : undefined}>
                    <PaaChevronIcon />
                  </span>
                </button>
              </h3>
              <motion.div
                id={answerId}
                className="sk-paa-answer"
                initial={false}
                animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.2, 0, 0, 1] }}
                inert={!expanded}
              >
                <p>{item.answer}</p>
              </motion.div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
