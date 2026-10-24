/*
 * "Always skip AI Overviews", remembered per visitor. Storage can be missing
 * or throw (private windows, blocked site data), so every access is guarded
 * and the page works the same without it: the setting just won't survive a
 * reload.
 */

const KEY = "skip-ai-overview:always-skip";

let alwaysSkip: boolean | null = null;
const listeners = new Set<() => void>();

function read() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function getAlwaysSkip() {
  alwaysSkip ??= read();

  return alwaysSkip;
}

/** Nothing is known on the server, so the page waits for the client. */
export function getServerAlwaysSkip() {
  return null;
}

export function setAlwaysSkip(value: boolean) {
  alwaysSkip = value;

  try {
    if (value) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // Kept in memory for this visit only.
  }

  listeners.forEach((listener) => listener());
}

export function subscribeAlwaysSkip(listener: () => void) {
  listeners.add(listener);

  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;

    alwaysSkip = read();
    listener();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
