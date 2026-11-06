"use client";

import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { FILE_NAME, type SceneNode } from "./data";
import {
  AgentsRailIcon,
  AssetsRailIcon,
  CaretIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  FigmaMark,
  FileRailIcon,
  FrameIcon,
  InstanceIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  SidebarIcon,
  TextIcon,
  ToolsRailIcon,
  VariablesRailIcon,
} from "./icons";
import { childrenOf, type Scene } from "./scene";

/* ------------------------------------------------------------------------ */
/* Left rail                                                                 */
/* ------------------------------------------------------------------------ */

const RAIL = [
  { label: "File", icon: FileRailIcon, active: true },
  { label: "Agents", icon: AgentsRailIcon },
  { label: "Assets", icon: AssetsRailIcon },
  { label: "Tools", icon: ToolsRailIcon },
  { label: "Variables", icon: VariablesRailIcon },
];

export function Rail() {
  return (
    <nav className="fd-rail" aria-label="Editor">
      <span className="fd-rail-logo" aria-hidden="true">
        <FigmaMark />
      </span>
      {RAIL.map(({ label, icon: RailIcon, active }) => (
        // Only the File view exists in this concept, so the others are inert.
        <span key={label} className="fd-rail-item" data-active={active ? "" : undefined} aria-hidden="true">
          <span className="fd-rail-tile">
            <RailIcon />
          </span>
          <span className="fd-rail-label">{label}</span>
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------------ */
/* Layers                                                                    */
/* ------------------------------------------------------------------------ */

type Row = { node: SceneNode; depth: number; hasChildren: boolean };

/** Visible rows, topmost layer first, as Figma lists them. */
export function visibleRows(scene: Scene, expanded: ReadonlySet<string>) {
  const rows: Row[] = [];

  function walk(parent: string | null, depth: number) {
    for (const node of [...childrenOf(scene, parent)].reverse()) {
      const hasChildren = childrenOf(scene, node.id).length > 0;

      rows.push({ node, depth, hasChildren });

      if (hasChildren && expanded.has(node.id)) walk(node.id, depth + 1);
    }
  }

  walk(null, 0);

  return rows;
}

type LayersPanelProps = {
  scene: Scene;
  selection: string[];
  expanded: ReadonlySet<string>;
  hover: string | null;
  onSelect: (id: string, additive: boolean) => void;
  onToggle: (id: string, open?: boolean) => void;
  onHover: (id: string | null) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
};

const TYPE_NAMES = { frame: "frame", instance: "instance", text: "text" } as const;

export function LayersPanel({
  scene,
  selection,
  expanded,
  hover,
  onSelect,
  onToggle,
  onHover,
  onContextMenu,
}: LayersPanelProps) {
  const rows = visibleRows(scene, expanded);
  const selected = new Set(selection);

  /* Rows inside a selected layer get the lighter "selected secondary" fill. */
  const inSelected = (node: SceneNode) => {
    let parent = node.parent;

    while (parent) {
      if (selected.has(parent)) return true;
      parent = scene[parent].parent;
    }

    return false;
  };

  const tone = rows.map(({ node }) => (selected.has(node.id) ? "selected" : inSelected(node) ? "child" : null));
  const tabStop = rows.find(({ node }) => selected.has(node.id))?.node.id ?? rows[0]?.node.id;

  function focusRow(id: string) {
    document.querySelector<HTMLElement>(`[data-layer-row="${id}"]`)?.focus();
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>, index: number) {
    const { node, hasChildren } = rows[index];
    const isOpen = expanded.has(node.id);
    let next: string | null = null;

    switch (event.key) {
      case "ArrowDown":
        next = rows[index + 1]?.node.id ?? null;
        break;
      case "ArrowUp":
        next = rows[index - 1]?.node.id ?? null;
        break;
      case "Home":
        next = rows[0].node.id;
        break;
      case "End":
        next = rows[rows.length - 1].node.id;
        break;
      case "ArrowRight":
        if (hasChildren && !isOpen) onToggle(node.id, true);
        else if (hasChildren) next = rows[index + 1]?.node.id ?? null;
        else return;
        break;
      case "ArrowLeft":
        if (hasChildren && isOpen) onToggle(node.id, false);
        else if (node.parent) next = node.parent;
        else return;
        break;
      case "Enter":
      case " ":
        onSelect(node.id, event.shiftKey);
        break;
      default:
        return;
    }

    event.preventDefault();

    if (next) {
      onSelect(next, false);
      focusRow(next);
    }
  }

  function onRowContextMenu(event: ReactMouseEvent<HTMLDivElement>, id: string) {
    event.preventDefault();
    onContextMenu(id, event.clientX, event.clientY);
  }

  return (
    <section className="fd-left" aria-label="Layers and pages">
      <header className="fd-file">
        <div className="fd-file-text">
          <span className="fd-file-name">
            {FILE_NAME}
            <ChevronDownIcon className="fd-file-chevron" />
          </span>
          <span className="fd-file-team">Northwind · Payments</span>
        </div>
        <span className="fd-icon-button" aria-hidden="true">
          <SidebarIcon />
        </span>
      </header>

      <div className="fd-section fd-pages" aria-hidden="true">
        <div className="fd-section-head">
          <span className="fd-section-title">Pages</span>
          <span className="fd-icon-button">
            <SearchIcon />
          </span>
          <span className="fd-icon-button">
            <PlusIcon />
          </span>
        </div>
        <div className="fd-page" data-current="">
          <CheckIcon className="fd-page-check" />
          Checkout
        </div>
        <div className="fd-page">Archive</div>
      </div>

      <div className="fd-section fd-layers">
        <div className="fd-section-head">
          <span className="fd-section-title" id="fd-layers-title">
            Layers
          </span>
        </div>

        <div
          className="fd-tree"
          role="tree"
          aria-labelledby="fd-layers-title"
          aria-multiselectable="true"
          onPointerLeave={() => onHover(null)}
        >
          {rows.map(({ node, depth, hasChildren }, index) => {
            const isOpen = expanded.has(node.id);
            const rowTone = tone[index];

            return (
              <div
                key={node.id}
                role="treeitem"
                aria-label={`${node.name}, ${TYPE_NAMES[node.type]}`}
                aria-level={depth + 1}
                aria-selected={selected.has(node.id)}
                aria-expanded={hasChildren ? isOpen : undefined}
                tabIndex={node.id === tabStop ? 0 : -1}
                className="fd-layer"
                data-layer-row={node.id}
                data-type={node.type}
                data-tone={rowTone ?? undefined}
                data-join-top={rowTone && tone[index - 1] ? "" : undefined}
                data-join-bottom={rowTone && tone[index + 1] ? "" : undefined}
                data-hover={hover === node.id ? "" : undefined}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  if ((event.target as HTMLElement).closest("[data-caret]")) return;
                  onSelect(node.id, event.shiftKey);
                }}
                onPointerEnter={(event) => event.pointerType === "mouse" && onHover(node.id)}
                onContextMenu={(event) => onRowContextMenu(event, node.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                <span className="fd-layer-inner" style={{ paddingLeft: 4 + depth * 21 }}>
                  <span
                    className="fd-layer-caret"
                    data-caret
                    data-open={isOpen ? "" : undefined}
                    aria-hidden="true"
                    onPointerDown={(event) => {
                      if (!hasChildren) return;
                      event.preventDefault();
                      onToggle(node.id);
                    }}
                  >
                    {hasChildren && <CaretIcon />}
                  </span>

                  <span className="fd-layer-icon" aria-hidden="true">
                    {node.type === "text" ? (
                      <TextIcon />
                    ) : (
                      <>
                        {/* Both icons share one cell, so a detach cross-fades diamond to #. */}
                        <InstanceIcon className="fd-layer-glyph" data-on={node.type === "instance" ? "" : undefined} />
                        <FrameIcon className="fd-layer-glyph" data-on={node.type === "frame" ? "" : undefined} />
                      </>
                    )}
                  </span>

                  <span className="fd-layer-name">{node.name}</span>

                  <span className="fd-layer-tools" aria-hidden="true">
                    <LockIcon />
                    <EyeIcon />
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
