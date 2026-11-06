"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRef } from "react";
import { ChevronRightIcon } from "./icons";

type Item = {
  label: string;
  /** Glyphs as Figma draws them, plus the same keys for aria-keyshortcuts. */
  keys?: [glyphs: string, aria: string];
  submenu?: boolean;
  instanceOnly?: boolean;
  action?: "detach";
};

/* Figma's menu for an instance, in order. Only Detach does anything here. */
const GROUPS: Item[][] = [
  [
    { label: "Copy", keys: ["⌘C", "Meta+C"] },
    { label: "Paste here" },
    { label: "Paste to replace", keys: ["⇧⌘R", "Shift+Meta+R"] },
    { label: "Copy/Paste as", submenu: true },
    { label: "Build this with code" },
    { label: "Add motion", submenu: true },
  ],
  [
    { label: "Select layer", submenu: true },
    { label: "Move to page", submenu: true },
    { label: "Bring to front", keys: ["]", "]"] },
    { label: "Send to back", keys: ["[", "["] },
  ],
  [
    { label: "Group selection", keys: ["⌘G", "Meta+G"] },
    { label: "Frame selection", keys: ["⌥⌘G", "Alt+Meta+G"] },
    { label: "Flatten", keys: ["⌥⇧F", "Alt+Shift+F"] },
    { label: "Outline stroke", keys: ["⌥⌘O", "Alt+Meta+O"] },
    { label: "Use as mask", keys: ["^⌘M", "Control+Meta+M"] },
  ],
  [
    { label: "Add auto layout", keys: ["⇧A", "Shift+A"] },
    { label: "Wrap in new slot" },
    { label: "Change variant", submenu: true, instanceOnly: true },
    { label: "Reset instance", instanceOnly: true },
    { label: "Detach instance", keys: ["⌥⌘B", "Alt+Meta+B"], instanceOnly: true, action: "detach" },
    { label: "Main component", submenu: true, instanceOnly: true },
    { label: "Plugins", submenu: true },
    { label: "Widgets", submenu: true },
  ],
  [
    { label: "Show/Hide", keys: ["⇧⌘H", "Shift+Meta+H"] },
    { label: "Lock/Unlock", keys: ["⇧⌘L", "Shift+Meta+L"] },
  ],
  [
    { label: "Flip horizontal", keys: ["⇧H", "Shift+H"] },
    { label: "Flip vertical", keys: ["⇧V", "Shift+V"] },
  ],
];

export type MenuState = { x: number; y: number; keyboard: boolean };

type ContextMenuProps = {
  menu: MenuState | null;
  hasInstance: boolean;
  onClose: () => void;
  onDetach: () => void;
  /** Called after the menu closes, so focus lands somewhere sensible. */
  onCloseFocus: (reason: "detach" | "dismiss") => void;
};

/**
 * Figma's canvas menu: Radix's dropdown anchored to an invisible point at
 * the pointer. It opens to the right of the pointer, slides up to stay on
 * screen, and flips left near the edge, like a native context menu. Opened
 * from the keyboard, Radix lands on the first item; from the pointer, nothing
 * is highlighted until you hover.
 */
export function ContextMenu({ menu, hasInstance, onClose, onDetach, onCloseFocus }: ContextMenuProps) {
  const reasonRef = useRef<"detach" | "dismiss">("dismiss");
  const groups = GROUPS.map((group) => group.filter((item) => hasInstance || !item.instanceOnly)).filter(
    (group) => group.length > 0,
  );

  return (
    <DropdownMenu.Root
      open={menu !== null}
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DropdownMenu.Trigger asChild>
        <span
          className="fd-menu-anchor"
          aria-hidden="true"
          tabIndex={-1}
          style={{ left: menu?.x ?? 0, top: menu?.y ?? 0 }}
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="fd-menu"
          side="right"
          align="start"
          sideOffset={2}
          collisionPadding={8}
          aria-label="Layer actions"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onCloseFocus(reasonRef.current);
            reasonRef.current = "dismiss";
          }}
        >
          {groups.map((group, index) => (
            <DropdownMenu.Group key={index}>
              {index > 0 && <DropdownMenu.Separator className="fd-menu-separator" />}
              {group.map((item) => (
                <DropdownMenu.Item
                  key={item.label}
                  className="fd-menu-item"
                  aria-keyshortcuts={item.keys?.[1]}
                  onSelect={(event) => {
                    if (item.action === "detach") {
                      reasonRef.current = "detach";
                      onDetach();
                      return;
                    }

                    // Everything else is a picture of Figma's menu: highlight, but stay open.
                    event.preventDefault();
                  }}
                >
                  <span className="fd-menu-label">{item.label}</span>
                  {item.keys && <Shortcut glyphs={item.keys[0]} />}
                  {item.submenu && <ChevronRightIcon className="fd-menu-chevron" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Group>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* Figma sets each modifier glyph on its own, with a little tracking. */
function Shortcut({ glyphs }: { glyphs: string }) {
  return (
    <span className="fd-menu-keys" aria-hidden="true">
      {[...glyphs].map((glyph, index) => (
        <span key={index}>{glyph}</span>
      ))}
    </span>
  );
}
