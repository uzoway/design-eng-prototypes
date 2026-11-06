/*
 * "Don't ask today", remembered per visitor until midnight. Storage can be
 * missing or throw (private windows, blocked site data), so every access is
 * guarded and the page works the same without it: the choice just won't
 * survive a reload.
 */

const KEY = "figma-detach:quiet-until";

let quietUntil: number | null | undefined;
const listeners = new Set<() => void>();

function read() {
  try {
    const value = Number(window.localStorage.getItem(KEY));

    return value > Date.now() ? value : null;
  } catch {
    return null;
  }
}

export function getQuietUntil() {
  if (quietUntil === undefined) quietUntil = read();

  return quietUntil;
}

export function getServerQuietUntil() {
  return null;
}

export function setQuietUntil(value: number | null) {
  quietUntil = value;

  try {
    if (value === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, String(value));
  } catch {
    // Kept in memory for this visit only.
  }

  listeners.forEach((listener) => listener());
}

export function subscribeQuietUntil(listener: () => void) {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;

    quietUntil = read();
    listener();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
