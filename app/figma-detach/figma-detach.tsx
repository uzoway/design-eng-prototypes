"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePageDefaultTheme, useTheme } from "../components/theme-provider";
import { type Session, type SentReason } from "./analytics";
import { AnalyticsModal } from "./analytics-modal";
import { decide, endOfDay, fromLibrary } from "./asking";
import { Canvas, geometryFor, ROOT, screenBox, type Geometry } from "./canvas";
import { ContextMenu, type MenuState } from "./context-menu";
import { LIBRARY, LIBRARY_TEAM, type ReasonId } from "./data";
import { DetachPopover, type Ask } from "./detach-popover";
import { LayersPanel, Rail } from "./layers-panel";
import { PropertiesPanel } from "./properties-panel";
import {
  ancestorsOf,
  boundsOf,
  createScene,
  describe,
  detach,
  detachSubject,
  isInstance,
  type Detached,
  type Scene,
} from "./scene";
import { getQuietUntil, getServerQuietUntil, setQuietUntil, subscribeQuietUntil } from "./settings";
import { SmallScreen } from "./small-screen";
import { ThemeToggle } from "./theme-toggle";
import { Toast, type ToastState } from "./toast";
import "./figma-detach.css";

/** The popover waits a beat after the detach, so the detach itself reads first. */
const POPOVER_DELAY = 180;

type DetachRecord = {
  id: number;
  ids: string[];
  /** The scene before this detach, for ⌘Z. */
  before: Scene;
  items: Detached[];
  sent: SentReason[];
};

let nextId = 1;

export function FigmaDetach() {
  usePageDefaultTheme("dark");

  const { theme } = useTheme() as { theme: "light" | "dark" | null };
  const reducedMotion = useReducedMotion() ?? false;
  const quietUntil = useSyncExternalStore(subscribeQuietUntil, getQuietUntil, getServerQuietUntil);

  const [scene, setScene] = useState<Scene>(createScene);
  const [records, setRecords] = useState<DetachRecord[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [scope, setScope] = useState(ROOT);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([ROOT]));
  const [hover, setHover] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [asked, setAsked] = useState<ReadonlySet<string>>(() => new Set());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  /* Whether the open menu came from the keyboard, still known after it closes. */
  const menuKeyboardRef = useRef(false);
  const askTimerRef = useRef(0);
  const announceTimerRef = useRef(0);

  /* ---------------------------------------------------------------------- */
  /* Canvas size                                                            */
  /* ---------------------------------------------------------------------- */

  useLayoutEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const measure = () => setGeometry(geometryFor(canvas.clientWidth, canvas.clientHeight));
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(askTimerRef.current);
      window.clearTimeout(announceTimerRef.current);
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Helpers                                                                */
  /* ---------------------------------------------------------------------- */

  const announce = useCallback((text: string) => {
    // Cleared first so the same sentence twice is still read twice.
    setAnnouncement("");
    window.clearTimeout(announceTimerRef.current);
    announceTimerRef.current = window.setTimeout(() => setAnnouncement(text), 60);
  }, []);

  const showToast = useCallback((next: Omit<ToastState, "id">) => setToast({ ...next, id: nextId++ }), []);

  const focusSelectedLayer = useCallback(() => {
    const id = selection[0];
    const row = id && document.querySelector<HTMLElement>(`[data-layer-row="${id}"]`);

    if (row) row.focus({ preventScroll: false });
    else document.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]')?.focus();
  }, [selection]);

  /* ---------------------------------------------------------------------- */
  /* Selection                                                              */
  /* ---------------------------------------------------------------------- */

  const select = useCallback(
    (id: string | null, additive = false) => {
      if (!id) {
        setSelection([]);
        return;
      }

      // Selecting a nested layer opens its parents in the layers panel, as Figma does.
      const parents = ancestorsOf(scene, id).map((node) => node.id);

      setExpanded((current) =>
        parents.every((parent) => current.has(parent)) ? current : new Set([...current, ...parents]),
      );
      setSelection((current) => {
        if (!additive) return [id];

        return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      });
    },
    [scene],
  );

  const toggle = useCallback((id: string, open?: boolean) => {
    setExpanded((current) => {
      const next = new Set(current);
      const shouldOpen = open ?? !current.has(id);

      if (shouldOpen) next.add(id);
      else next.delete(id);

      return next;
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* The popover                                                            */
  /* ---------------------------------------------------------------------- */

  const openAsk = useCallback((recordId: number, items: Detached[], immediately: boolean) => {
    window.clearTimeout(askTimerRef.current);

    setAsk((current) => {
      // Already open: swap the content in place rather than stacking a second popover.
      if (current?.shown || immediately) return { recordId, items, shown: true };

      return { recordId, items, shown: false };
    });

    askTimerRef.current = window.setTimeout(
      () => setAsk((current) => (current && current.recordId === recordId ? { ...current, shown: true } : current)),
      immediately ? 0 : POPOVER_DELAY,
    );
  }, []);

  const closeAsk = useCallback(() => {
    window.clearTimeout(askTimerRef.current);
    setAsk(null);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Detach and undo                                                        */
  /* ---------------------------------------------------------------------- */

  const detachSelection = useCallback(() => {
    const targets = selection.filter((id) => isInstance(scene, id));

    if (targets.length === 0) {
      announce(selection.length === 0 ? "Nothing selected." : "Only instances can be detached.");
      return;
    }

    const items = describe(scene, targets);
    const record: DetachRecord = { id: nextId++, ids: targets, before: scene, items, sent: [] };
    const decision = decide(items, { asked, quietUntil }, Date.now());

    setScene(detach(scene, targets));
    setRecords((current) => [...current, record]);
    announce(`Detached ${detachSubject(items)}. ${targets.length === 1 ? "It's now a frame." : "They're now frames."}`);

    if (decision.kind === "ask") {
      setAsked((current) => new Set([...current, ...decision.items.map((item) => item.component.id)]));
      setToast(null);
      openAsk(record.id, decision.items, false);
      return;
    }

    closeAsk();

    if (decision.kind === "nudge") {
      showToast({
        text: `Detached ${detachSubject(decision.items)}`,
        action: { label: `Tell ${LIBRARY_TEAM} why?`, run: () => openAsk(record.id, decision.items, true) },
        recordId: record.id,
      });
    }
  }, [selection, scene, asked, quietUntil, announce, openAsk, closeAsk, showToast]);

  const undo = useCallback(() => {
    const last = records.at(-1);

    if (!last) {
      announce("Nothing to undo.");
      return;
    }

    setScene(last.before);
    setRecords((current) => current.slice(0, -1));

    // Undone before answering, so it never really asked: the next detach can.
    if (ask?.recordId === last.id) {
      closeAsk();
      setAsked((current) => {
        const next = new Set(current);

        for (const item of ask.items) next.delete(item.component.id);

        return next;
      });
    }

    if (toast?.recordId === last.id) setToast(null);

    const subject = detachSubject(last.items);

    announce(
      `Undid detach. ${subject} ${last.ids.length === 1 ? "is an instance" : "are instances"} again.${
        last.sent.length > 0 ? " The reason was taken back." : ""
      }`,
    );
  }, [records, ask, toast, announce, closeAsk]);

  /* ---------------------------------------------------------------------- */
  /* Answering                                                              */
  /* ---------------------------------------------------------------------- */

  const send = useCallback(
    (reason: ReasonId, note: string) => {
      if (!ask) return;

      const recordId = ask.recordId;

      closeAsk();
      focusSelectedLayer();

      if (reason === "exploring") {
        // Exploring isn't a signal, so nothing goes to the library team.
        showToast({ text: "Got it" });
        announce("Got it. Nothing was sent.");
        return;
      }

      const componentIds = [...new Set(ask.items.map((item) => item.component.id))];
      const sent = componentIds.map((componentId) => ({ componentId, reason, note }));

      setRecords((current) => current.map((record) => (record.id === recordId ? { ...record, sent } : record)));
      showToast({
        text: `Sent to ${LIBRARY}`,
        recordId,
        action: {
          label: "Undo",
          run: () => {
            setRecords((current) => current.map((record) => (record.id === recordId ? { ...record, sent: [] } : record)));
            showToast({ text: "Removed", recordId });
            announce(`Reason removed. Nothing was sent to ${LIBRARY}.`);
          },
        },
      });
      announce(`Reason sent to ${LIBRARY}.`);
    },
    [ask, closeAsk, focusSelectedLayer, showToast, announce],
  );

  const skip = useCallback(
    (refocus = true) => {
      closeAsk();
      if (refocus) focusSelectedLayer();
    },
    [closeAsk, focusSelectedLayer],
  );

  const dontAskToday = useCallback(() => {
    if (!ask) return;

    const current = ask;

    setQuietUntil(endOfDay(Date.now()));
    closeAsk();
    focusSelectedLayer();
    showToast({
      text: "Won't ask again today",
      action: {
        label: "Undo",
        run: () => {
          setQuietUntil(null);
          setToast(null);
          openAsk(current.recordId, current.items, true);
        },
      },
    });
    announce("Won't ask again today.");
  }, [ask, closeAsk, focusSelectedLayer, showToast, announce, openAsk]);

  const reset = useCallback(() => {
    closeAsk();
    setScene(createScene());
    setRecords([]);
    setAsked(new Set());
    setSelection([]);
    setScope(ROOT);
    setToast(null);
    setQuietUntil(null);
    announce("Concept reset. The file is back to its first state.");
  }, [closeAsk, announce]);

  /* What the Orbit team sees: every library detach this session, and the reasons sent. */
  const session = useMemo<Session>(
    () => ({
      detaches: records.flatMap((record) =>
        record.items.filter((item) => fromLibrary(item.component)).map((item) => item.component.id),
      ),
      reasons: records.flatMap((record) => record.sent),
    }),
    [records],
  );

  /* ---------------------------------------------------------------------- */
  /* Menus and shortcuts                                                    */
  /* ---------------------------------------------------------------------- */

  const openMenuForSelection = useCallback(() => {
    const bounds = boundsOf(scene, selection);
    const canvas = canvasRef.current?.getBoundingClientRect();

    if (!bounds || !canvas || !geometry) return;

    const box = screenBox(geometry, bounds);

    menuKeyboardRef.current = true;
    setMenu({
      x: canvas.left + box.left + Math.min(box.width / 2, 120),
      y: canvas.top + box.top + Math.min(box.height / 2, 40),
      keyboard: true,
    });
  }, [scene, selection, geometry]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || menu || analyticsOpen) return;

      const typing = (event.target as HTMLElement).closest("input, textarea, [contenteditable]");
      const mod = event.metaKey || event.ctrlKey;

      // ⌥ changes event.key on a Mac (⌥B is ∫), so match the physical key.
      if (mod && event.altKey && event.code === "KeyB") {
        event.preventDefault();
        detachSelection();
        return;
      }

      if (typing) return;

      if (mod && !event.shiftKey && !event.altKey && event.code === "KeyZ") {
        event.preventDefault();
        undo();
        return;
      }

      if ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") {
        event.preventDefault();
        openMenuForSelection();
        return;
      }

      if (event.key === "Escape" && selection.length > 0) {
        const parent = selection.length === 1 ? scene[selection[0]]?.parent : null;

        // Escape steps out to the parent, like Figma; from the top it clears.
        if (parent && parent !== ROOT) {
          select(parent);
          setScope(scene[parent].parent ?? ROOT);
        } else {
          select(null);
          setScope(ROOT);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menu, analyticsOpen, selection, scene, select, detachSelection, undo, openMenuForSelection]);

  function openMenuAt(id: string | null, x: number, y: number) {
    if (!id) {
      setMenu(null);
      return;
    }

    if (!selection.includes(id)) select(id);
    menuKeyboardRef.current = false;
    setMenu({ x, y, keyboard: false });
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  const askRecord = ask ? records.find((record) => record.id === ask.recordId) : null;
  const anchorBounds = askRecord ? boundsOf(scene, askRecord.ids) : null;
  const anchor = anchorBounds && geometry ? screenBox(geometry, anchorBounds) : null;
  const hasInstance = useMemo(() => selection.some((id) => isInstance(scene, id)), [selection, scene]);
  const canvasColor = theme === "light" ? "#F5F5F5" : "#1E1E1E";

  return (
    <>
      <SmallScreen />

      <div className="fd-app">
        <div className="fd-editor">
          <Rail />

          <LayersPanel
            scene={scene}
            selection={selection}
            expanded={expanded}
            hover={hover}
            onSelect={select}
            onToggle={toggle}
            onHover={setHover}
            onContextMenu={openMenuAt}
          />

          <Canvas
            canvasRef={canvasRef}
            scene={scene}
            geometry={geometry}
            selection={selection}
            hover={hover}
            scope={scope}
            onSelect={(id, { additive, scope: nextScope }) => {
              // Clicking the canvas counts as a skip. Nothing is sent.
              if (ask) skip(false);
              setScope(nextScope);
              select(id, additive);
            }}
            onHover={setHover}
            onEnter={(parent, child) => {
              setScope(parent);
              select(child);
            }}
            onContextMenu={(id, x, y, nextScope) => {
              if (ask) skip(false);
              setScope(nextScope);
              openMenuAt(id, x, y);
            }}
          >
            <DetachPopover
              ask={ask?.shown && anchor ? ask : null}
              anchor={anchor}
              bounds={geometry}
              reducedMotion={reducedMotion}
              onSend={send}
              onSkip={() => skip()}
              onDontAskToday={dontAskToday}
            />
            <Toast toast={toast} reducedMotion={reducedMotion} onDone={() => setToast(null)} />
          </Canvas>

          <PropertiesPanel
            scene={scene}
            selection={selection}
            zoom={geometry?.zoom ?? 1}
            canvasColor={canvasColor}
          />
        </div>

        <ContextMenu
          menu={menu}
          hasInstance={hasInstance}
          onClose={() => setMenu(null)}
          onDetach={detachSelection}
          onCloseFocus={(reason) => {
            if (reason === "detach" || menuKeyboardRef.current) focusSelectedLayer();
          }}
        />

        <div className="fd-sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>

        <AnalyticsModal
          open={analyticsOpen}
          opener={ctaRef}
          session={session}
          reducedMotion={reducedMotion}
          onClose={() => setAnalyticsOpen(false)}
        />

        <footer className="fd-demo-bar">
          <p className="fd-demo-note">A concept by Uzo Okafor. Not affiliated with Figma.</p>
          <button type="button" className="fd-demo-link" onClick={reset}>
            Reset concept
          </button>
          <button
            ref={ctaRef}
            type="button"
            className="fd-demo-cta"
            onClick={() => {
              if (ask) skip(false);
              setAnalyticsOpen(true);
            }}
          >
            See what the {LIBRARY_TEAM} team sees →
          </button>
          <ThemeToggle />
        </footer>
      </div>
    </>
  );
}
