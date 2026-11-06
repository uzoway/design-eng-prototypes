"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePageDefaultTheme, useTheme } from "../components/theme-provider";
import { Canvas, geometryFor, ROOT, type Geometry } from "./canvas";
import { LayersPanel, Rail } from "./layers-panel";
import { PropertiesPanel } from "./properties-panel";
import { ancestorsOf, createScene, type Scene } from "./scene";
import { ThemeToggle } from "./theme-toggle";
import "./figma-detach.css";

export function FigmaDetach() {
  usePageDefaultTheme("dark");

  const { theme } = useTheme() as { theme: "light" | "dark" | null };

  const [scene] = useState<Scene>(createScene);
  const [selection, setSelection] = useState<string[]>([]);
  const [scope, setScope] = useState(ROOT);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([ROOT]));
  const [hover, setHover] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

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

      setExpanded((current) => (parents.every((parent) => current.has(parent)) ? current : new Set([...current, ...parents])));
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;

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
  }, [selection, scene, select]);

  const canvasColor = theme === "light" ? "#F5F5F5" : "#1E1E1E";

  return (
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
          onContextMenu={() => {}}
        />

        <Canvas
          canvasRef={canvasRef}
          scene={scene}
          geometry={geometry}
          selection={selection}
          hover={hover}
          scope={scope}
          onSelect={(id, { additive, scope: nextScope }) => {
            setScope(nextScope);
            select(id, additive);
          }}
          onHover={setHover}
          onEnter={(parent, child) => {
            setScope(parent);
            select(child);
          }}
          onContextMenu={() => {}}
        />

        <PropertiesPanel scene={scene} selection={selection} zoom={geometry?.zoom ?? 1} canvasColor={canvasColor} />
      </div>

      <footer className="fd-demo-bar">
        <p className="fd-demo-note">A concept by Uzo Okafor. Not affiliated with Figma.</p>
        <ThemeToggle />
      </footer>
    </div>
  );
}
