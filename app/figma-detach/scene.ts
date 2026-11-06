/*
 * The scene model: one list of layers that the layers panel, the canvas and
 * the properties panel all read. Detaching turns instances into frames;
 * undo puts the previous scene back.
 */

import { COMPONENTS, SCENE_NODES, type Component, type SceneNode } from "./data.ts";

export type Scene = Record<string, SceneNode>;

export function createScene(nodes: SceneNode[] = SCENE_NODES): Scene {
  return Object.fromEntries(nodes.map((node) => [node.id, { ...node }]));
}

/** Children in paint order. */
export function childrenOf(scene: Scene, id: string | null) {
  return Object.values(scene).filter((node) => node.parent === id);
}

export function ancestorsOf(scene: Scene, id: string) {
  const ancestors: SceneNode[] = [];
  let parent = scene[id]?.parent ?? null;

  while (parent) {
    ancestors.push(scene[parent]);
    parent = scene[parent].parent;
  }

  return ancestors;
}

/** Depth from the page: the top frame is 0. */
export function depthOf(scene: Scene, id: string) {
  return ancestorsOf(scene, id).length;
}

/** Position on the page, adding up the parents' offsets. */
export function absoluteBox(scene: Scene, id: string) {
  const node = scene[id];
  let { x, y } = node;

  for (const ancestor of ancestorsOf(scene, id)) {
    x += ancestor.x;
    y += ancestor.y;
  }

  return { x, y, w: node.w, h: node.h };
}

/** The bounding box around several layers, in page coordinates. */
export function boundsOf(scene: Scene, ids: string[]) {
  const boxes = ids.filter((id) => scene[id]).map((id) => absoluteBox(scene, id));

  if (boxes.length === 0) return null;

  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.w));
  const bottom = Math.max(...boxes.map((box) => box.y + box.h));

  return { x: left, y: top, w: right - left, h: bottom - top };
}

export function componentOf(scene: Scene, id: string): Component | null {
  const node = scene[id];

  return node?.componentId ? COMPONENTS[node.componentId] ?? null : null;
}

/** The nearest instance above a layer, for "Icon in Input". */
export function containingInstance(scene: Scene, id: string) {
  return ancestorsOf(scene, id).find((node) => node.type === "instance") ?? null;
}

export function isInstance(scene: Scene, id: string) {
  return scene[id]?.type === "instance";
}

/** Detaches the instances in `ids`. Everything else is left alone, nested instances included. */
export function detach(scene: Scene, ids: string[]): Scene {
  const targets = ids.filter((id) => isInstance(scene, id));

  if (targets.length === 0) return scene;

  const next = { ...scene };

  for (const id of targets) next[id] = { ...scene[id], type: "frame" };

  return next;
}

/* ------------------------------------------------------------------------ */
/* Naming what was detached                                                  */
/* ------------------------------------------------------------------------ */

export type Detached = {
  id: string;
  component: Component;
  /** The instance this one sits inside, if any. */
  inside: string | null;
};

export function describe(scene: Scene, ids: string[]): Detached[] {
  return ids.flatMap((id) => {
    const component = componentOf(scene, id);

    if (!component) return [];

    const outer = containingInstance(scene, id);
    const inside = outer ? (componentOf(scene, outer.id)?.name ?? outer.name) : null;

    return [{ id, component, inside }];
  });
}

function plural(name: string) {
  return /(s|x|ch|sh)$/i.test(name) ? `${name}es` : `${name}s`;
}

/** "Icon in Input", or just "Button". */
export function displayName(item: Detached) {
  return item.inside ? `${item.component.name} in ${item.inside}` : item.component.name;
}

/** The subject of the popover title, after "You detached". */
export function detachSubject(items: Detached[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return displayName(items[0]);

  const names = new Set(items.map(displayName));

  if (names.size === 1) {
    const [first] = items;
    // "3 Inputs", but a path like "Navigation / Tabs / Small" can't take a plural.
    const many = first.component.name.includes("/") ? `× ${first.component.name}` : plural(first.component.name);

    return `${items.length} ${first.inside ? `${many} in ${first.inside}` : many}`;
  }

  return `${items.length} components`;
}

/** Listed under the title when the components differ. */
export function detachList(items: Detached[]) {
  const names = [...new Set(items.map(displayName))];

  return names.length > 1 ? names : [];
}
