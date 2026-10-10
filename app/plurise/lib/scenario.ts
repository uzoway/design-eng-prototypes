/*
 * Research constants for PLURISE Researcher Demo V1.
 *
 * Everything a participant could compare across conditions lives here, once.
 * Both conditions read CANONICAL_AI_PATCH; nothing else may hold a copy of it.
 */

export type Condition = "human-gated" | "agent-applied";
export type FileId = "retry.ts" | "retry.test.ts";

export const PROTOTYPE_NAME = "PLURISE researcher demo V1";
export const SCHEMA_VERSION = "1.0";
export const TASK_ID = "RETRY-01";
export const PATCH_ID = "async-retry-v1-fixed";

export const TASK_TITLE = "Make asynchronous requests resilient";
export const TASK_PROMPT =
  "Add retries for network errors, 429s, and 5xx responses. Use exponential backoff, do not retry other 4xx responses, and respect AbortSignal.";

export const FILE_PATHS: Record<FileId, string> = {
  "retry.ts": "src/retry.ts",
  "retry.test.ts": "src/retry.test.ts",
};

export const INITIAL_CODE = `export type RetryOptions = RequestInit & {
  retries?: number;
  backoffMs?: number;
};

export async function fetchJson<T>(
  url: string,
  options: RetryOptions = {},
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }

  return response.json() as Promise<T>;
}
`;

/*
 * The one intended defect: wait() has no signal and no abort listener, so an
 * abort during backoff stays pending until the timer fires.
 *
 * Deviation from the brief's literal patch: there, the non-retryable throw sat
 * inside the try block and its own catch swallowed it, so a 404 was retried
 * three times (a second, unintended defect). Network errors are now caught on
 * the fetch call only, which keeps the abort defect as the single failure.
 */
export const CANONICAL_AI_PATCH = `export type RetryOptions = RequestInit & {
  retries?: number;
  backoffMs?: number;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number) {
  return status === 429 || status >= 500;
}

export async function fetchJson<T>(
  url: string,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 2, backoffMs = 250, ...request } = options;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    // A network error resolves to null so the attempt can be retried.
    const response = await fetch(url, request).catch((error) => {
      if (options.signal?.aborted || attempt === retries) {
        throw error;
      }

      return null;
    });

    if (response) {
      if (response.ok) {
        return response.json() as Promise<T>;
      }

      if (!shouldRetry(response.status) || attempt === retries) {
        throw new Error("Request failed: " + response.status);
      }
    }

    await wait(backoffMs * 2 ** attempt);
  }

  throw new Error("Retry limit reached");
}
`;

/*
 * QA only. Never shown to participants. Mirrors the brief's reference
 * correction applied to the canonical patch.
 */
export const REFERENCE_CORRECTION = CANONICAL_AI_PATCH.replace(
  `function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}`,
  `function wait(ms: number, signal?: AbortSignal) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}`,
).replace(
  "await wait(backoffMs * 2 ** attempt);",
  "await wait(backoffMs * 2 ** attempt, options.signal);",
);

/*
 * Deviation from the brief: its abort test called controller.abort() before
 * the first fetch had settled, so the abort never happened during backoff and
 * the reference correction could not pass it either. backoffStarted() moves the
 * abort into the backoff window, which is what the test name promises.
 */
export const TEST_CODE = `import { describe, expect, it } from "vitest";
import { fetchJson } from "./retry";

// mockFetch, delays and backoffStarted come from test/setup.ts (fake timers).

describe("fetchJson", () => {
  it("returns parsed JSON after a successful request", async () => {
    mockFetch(200, { ok: true });
    await expect(fetchJson("/health")).resolves.toEqual({ ok: true });
  });

  it("does not retry a non-retryable 404", async () => {
    mockFetch(404);
    await expect(fetchJson("/missing")).rejects.toThrow("404");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries status 429", async () => {
    mockFetch(429, 200);
    await expect(fetchJson("/events")).resolves.toBeDefined();
  });

  it("retries status 500 and 503", async () => {
    mockFetch(500, 503, 200);
    await expect(fetchJson("/events")).resolves.toBeDefined();
  });

  it("uses exponential backoff between attempts", async () => {
    mockFetch(503, 503, 200);
    await fetchJson("/events", { backoffMs: 100 });
    expect(delays()).toEqual([100, 200]);
  });

  it("aborts immediately during backoff", async () => {
    mockFetch(503);
    const controller = new AbortController();
    const request = fetchJson("/events", {
      backoffMs: 10_000,
      signal: controller.signal,
    });
    await backoffStarted();
    controller.abort();
    await expect(request).rejects.toHaveProperty("name", "AbortError");
  });
});
`;

export const TEST_COMMAND = "vitest run src/retry.test.ts";

/*
 * The only copy that differs between conditions. It describes whether the
 * same patch is proposed or already in the file; it never describes the patch
 * differently.
 */
export const CONDITIONS: Record<
  Condition,
  {
    letter: "A" | "B";
    name: string;
    shortName: string;
    description: string;
    patchActor: "developer" | "agent";
    actorLabel: string;
  }
> = {
  "human-gated": {
    letter: "A",
    name: "Human-gated",
    shortName: "Human gate",
    description:
      "The AI prepares the change, but the developer decides if and when it enters the working file.",
    patchActor: "developer",
    actorLabel: "Developer",
  },
  "agent-applied": {
    letter: "B",
    name: "Agent-applied",
    shortName: "Agent applies",
    description:
      "The AI applies the same change to the working file immediately, then reports what changed.",
    patchActor: "agent",
    actorLabel: "AI agent",
  },
};

export const AGENT_MESSAGE: Record<Condition, string> = {
  "human-gated":
    "I prepared retry handling for transient responses and network failures, with exponential backoff.",
  "agent-applied":
    "I added retry handling for transient responses and network failures, with exponential backoff.",
};

export function patchForCondition(condition: Condition) {
  // Deliberately condition-independent. Kept as a function so the parity test
  // exercises the same path the UI uses.
  void condition;
  return CANONICAL_AI_PATCH;
}
