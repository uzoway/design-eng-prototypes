"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { type SceneNode } from "./data";
import {
  ActionsToolIcon,
  CodeToolIcon,
  CommentToolIcon,
  DesignModeIcon,
  DevModeIcon,
  DrawModeIcon,
  FrameIcon,
  MoveToolIcon,
  PenToolIcon,
  PrototypeModeIcon,
  RectangleToolIcon,
  SmallChevronIcon,
  TextIcon,
} from "./icons";
import { absoluteBox, boundsOf, childrenOf, type Scene } from "./scene";

export const FRAME_W = 375;
export const FRAME_H = 812;
export const ROOT = "checkout";

/** Room above the frame for its name, and below it for the toolbar. */
const SPACE_TOP = 56;
const SPACE_BOTTOM = 96;

export type Geometry = { zoom: number; x: number; y: number; width: number; height: number };

export function geometryFor(width: number, height: number): Geometry {
  const fit = Math.min(1, (height - SPACE_TOP - SPACE_BOTTOM) / FRAME_H, (width - 96) / FRAME_W);
  const zoom = Math.max(0.25, Math.floor(fit * 100) / 100);
  const free = height - SPACE_TOP - SPACE_BOTTOM - FRAME_H * zoom;

  return {
    zoom,
    x: Math.round((width - FRAME_W * zoom) / 2),
    y: Math.round(SPACE_TOP + Math.max(0, free) / 2),
    width,
    height,
  };
}

/** A box on the page, in canvas pixels. */
export function screenBox(geometry: Geometry, box: { x: number; y: number; w: number; h: number }) {
  return {
    left: geometry.x + box.x * geometry.zoom,
    top: geometry.y + box.y * geometry.zoom,
    width: box.w * geometry.zoom,
    height: box.h * geometry.zoom,
  };
}

/**
 * What a click lands on. Like Figma, a click picks the topmost layer at the
 * current depth (children of the frame you're "in"), not the deepest one.
 */
export function resolveTarget(scene: Scene, deepest: string | null, scope: string) {
  if (!deepest || deepest === ROOT) return { id: null, scope: ROOT };

  const chain: string[] = [];
  let id: string | null = deepest;

  while (id) {
    chain.push(id);
    id = scene[id]?.parent ?? null;
  }

  const inScope = chain.find((entry) => scene[entry].parent === scope);

  if (inScope) return { id: inScope, scope };

  return { id: chain.find((entry) => scene[entry].parent === ROOT) ?? null, scope: ROOT };
}

function nodeAt(target: EventTarget | null) {
  return (target as HTMLElement | null)?.closest<HTMLElement>("[data-node]")?.dataset.node ?? null;
}

/* ------------------------------------------------------------------------ */

type CanvasProps = {
  scene: Scene;
  geometry: Geometry | null;
  selection: string[];
  hover: string | null;
  scope: string;
  onSelect: (id: string | null, options: { additive: boolean; scope: string }) => void;
  onHover: (id: string | null) => void;
  onEnter: (parent: string, child: string) => void;
  onContextMenu: (id: string | null, x: number, y: number, scope: string) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  children?: ReactNode;
};

export function Canvas({
  scene,
  geometry,
  selection,
  hover,
  scope,
  onSelect,
  onHover,
  onEnter,
  onContextMenu,
  canvasRef,
  children,
}: CanvasProps) {
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    const label = (event.target as HTMLElement).closest("[data-frame-label]");

    if (label) {
      onSelect(ROOT, { additive: event.shiftKey, scope: ROOT });
      return;
    }

    if ((event.target as HTMLElement).closest("[data-canvas-ui]")) return;

    const target = resolveTarget(scene, nodeAt(event.target), scope);

    onSelect(target.id, { additive: event.shiftKey, scope: target.scope });
  }

  function onDoubleClick(event: ReactMouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-canvas-ui]")) return;

    const deepest = nodeAt(event.target);
    const target = resolveTarget(scene, deepest, scope);

    if (!target.id || !deepest || target.id === deepest) return;

    // Step one level in: the child of the target that holds the pointer.
    const inner = resolveTarget(scene, deepest, target.id);

    if (inner.id) onEnter(target.id, inner.id);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;

    if ((event.target as HTMLElement).closest("[data-canvas-ui]")) {
      onHover(null);
      return;
    }

    onHover(resolveTarget(scene, nodeAt(event.target), scope).id);
  }

  function onContext(event: ReactMouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-canvas-ui]")) return;

    event.preventDefault();

    const target = resolveTarget(scene, nodeAt(event.target), scope);

    onContextMenu(target.id, event.clientX, event.clientY, target.scope);
  }

  const frameSelected = selection.includes(ROOT);

  return (
    <div
      ref={canvasRef}
      className="fd-canvas"
      role="region"
      aria-label="Canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => onHover(null)}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContext}
    >
      {geometry && (
        <>
          {/* The canvas is a picture of the file; the layers panel is how assistive tech reaches it. */}
          <div aria-hidden="true">
            <div
              className="fd-frame-label"
              data-frame-label
              data-selected={frameSelected ? "" : undefined}
              data-hover={hover === ROOT ? "" : undefined}
              style={{ left: geometry.x, top: geometry.y - 20 }}
            >
              {scene[ROOT].name}
            </div>

            <div
              className="fd-frame"
              style={{
                left: geometry.x,
                top: geometry.y,
                width: FRAME_W,
                height: FRAME_H,
                transform: `scale(${geometry.zoom})`,
              }}
            >
              <Nodes scene={scene} parent={ROOT} />
            </div>

            <Overlays scene={scene} geometry={geometry} selection={selection} hover={hover} />
          </div>

          {children}
        </>
      )}

      <Toolbar />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* The checkout screen, built from Orbit components                          */
/* ------------------------------------------------------------------------ */

function Nodes({ scene, parent }: { scene: Scene; parent: string }) {
  return childrenOf(scene, parent).map((node) => (
    <div
      key={node.id}
      data-node={node.id}
      className={`fd-node fd-node-${node.id}`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
    >
      <NodeContent node={node} />
      <Nodes scene={scene} parent={node.id} />
    </div>
  ));
}

function NodeContent({ node }: { node: SceneNode }) {
  switch (node.id) {
    case "logo":
      return (
        <span className="o-logo">
          <span className="o-logo-mark" />
          northwind
        </span>
      );
    case "avatar":
      return <span className="o-avatar">SL</span>;
    case "title":
      return <span className="o-title">Checkout</span>;
    case "badge":
      return (
        <span className="o-badge">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2.5 4.5h5v4h-5zM3.5 4.5V3.2a1.5 1.5 0 0 1 3 0v1.3" fill="none" stroke="currentColor" />
          </svg>
          Secure
        </span>
      );
    case "card":
      return (
        <div className="o-card">
          <div className="o-item">
            <span className="o-thumb">
              <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
                <path
                  d="M9 6.5 5 9l1.8 4.2 2.2-1V22h10v-9.8l2.2 1L23 9l-4-2.5c-.6 1.6-2.7 2.7-5 2.7S9.6 8.1 9 6.5Z"
                  fill="#c5cbe0"
                />
              </svg>
            </span>
            <span className="o-item-text">
              <span className="o-item-name">Orbit hoodie</span>
              <span className="o-item-meta">Navy · M · Qty 1</span>
            </span>
            <span className="o-item-price">$42.00</span>
          </div>
          <div className="o-row">
            <span>Shipping</span>
            <span>$6.00</span>
          </div>
          <div className="o-row o-total">
            <span>Total</span>
            <span>$48.00</span>
          </div>
        </div>
      );
    case "payment":
      return <span className="o-section">Payment</span>;
    case "email":
      return <Field label="Email" value="sam.lee@example.com" />;
    case "card-number":
      return <Field label="Card number" value="4242 4242 4242 4242" inset />;
    case "card-icon":
      return (
        <svg className="o-card-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" />
          <path d="M1.5 6.5h13" stroke="currentColor" />
        </svg>
      );
    case "name-on-card":
      return <Field label="Name on card" value="Sam Lee" />;
    case "button":
      return <span className="o-button">Pay $48.00</span>;
    default:
      return null;
  }
}

function Field({ label, value, inset }: { label: string; value: string; inset?: boolean }) {
  return (
    <span className="o-field">
      <span className="o-field-label">{label}</span>
      <span className="o-field-box" data-inset={inset ? "" : undefined}>
        {value}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Hover and selection                                                       */
/* ------------------------------------------------------------------------ */

function kindOf(scene: Scene, ids: string[]) {
  return ids.length > 0 && ids.every((id) => scene[id]?.type === "instance") ? "instance" : "frame";
}

function Overlays({
  scene,
  geometry,
  selection,
  hover,
}: {
  scene: Scene;
  geometry: Geometry;
  selection: string[];
  hover: string | null;
}) {
  const ids = selection.filter((id) => scene[id]);
  const bounds = boundsOf(scene, ids);
  const showHover = hover && !ids.includes(hover) && scene[hover];

  return (
    <>
      {showHover && (
        <div
          className="fd-hover"
          data-kind={kindOf(scene, [hover])}
          style={screenBox(geometry, absoluteBox(scene, hover))}
        />
      )}

      {bounds && (
        /*
         * Keyed by what's selected: a new selection appears in its colour at
         * once, while a detach (same layers, new type) eases purple to blue.
         */
        <div key={ids.join(" ")} className="fd-selection" data-kind={kindOf(scene, ids)}>
          {ids.length > 1 &&
            ids.map((id) => (
              <div key={id} className="fd-selection-item" style={screenBox(geometry, absoluteBox(scene, id))} />
            ))}

          <div className="fd-selection-box" style={screenBox(geometry, bounds)}>
            <span className="fd-handle" data-corner="nw" />
            <span className="fd-handle" data-corner="ne" />
            <span className="fd-handle" data-corner="sw" />
            <span className="fd-handle" data-corner="se" />
            <span className="fd-size">
              {Math.round(bounds.w)} × {Math.round(bounds.h)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Bottom toolbar                                                            */
/* ------------------------------------------------------------------------ */

const TOOLS = [
  { label: "Move", icon: MoveToolIcon, active: true },
  { label: "Frame", icon: FrameIcon },
  { label: "Shapes", icon: RectangleToolIcon },
  { label: "Pen", icon: PenToolIcon },
  { label: "Text", icon: TextIcon },
  { label: "Code", icon: CodeToolIcon },
];

function Toolbar() {
  /*
   * Only the selection matters in this concept, so the tools are a picture
   * of Figma's toolbar rather than controls.
   */
  return (
    <div className="fd-toolbar" data-canvas-ui aria-hidden="true">
      <div className="fd-toolbar-tools">
        {TOOLS.map(({ label, icon: ToolIcon, active }) => (
          <span key={label} className="fd-tool-pair">
            <span className="fd-tool" data-active={active ? "" : undefined}>
              <ToolIcon />
            </span>
            <span className="fd-tool-more">
              <SmallChevronIcon />
            </span>
          </span>
        ))}
        <span className="fd-tool">
          <CommentToolIcon />
        </span>
        <span className="fd-tool">
          <ActionsToolIcon />
        </span>
      </div>

      <div className="fd-toolbar-modes">
        <span className="fd-mode">
          <DrawModeIcon />
        </span>
        <span className="fd-mode" data-active="">
          <DesignModeIcon />
        </span>
        <span className="fd-mode">
          <PrototypeModeIcon />
        </span>
        <span className="fd-mode">
          <DevModeIcon />
        </span>
      </div>
    </div>
  );
}
