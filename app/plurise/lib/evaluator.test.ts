import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ABORT_FAILURE_DETAIL, evaluate, tally } from "./evaluator.ts";
import { CANONICAL_AI_PATCH, INITIAL_CODE, REFERENCE_CORRECTION } from "./scenario.ts";

const failing = (code: string) =>
  evaluate(code)
    .filter((result) => !result.passed)
    .map((result) => result.id);

describe("evaluator", () => {
  it("initial code passes only what it already does: JSON and not retrying 404", () => {
    assert.deepEqual(tally(evaluate(INITIAL_CODE)), { passed: 2, total: 6 });
    assert.deepEqual(failing(INITIAL_CODE), ["retry-429", "retry-5xx", "backoff", "abort-backoff"]);
  });

  it("canonical AI patch fails only the abort-during-backoff test", () => {
    const results = evaluate(CANONICAL_AI_PATCH);

    assert.deepEqual(tally(results), { passed: 5, total: 6 });
    assert.deepEqual(failing(CANONICAL_AI_PATCH), ["abort-backoff"]);
    assert.equal(results.at(-1)?.detail, ABORT_FAILURE_DETAIL);
  });

  it("reference correction passes everything", () => {
    assert.deepEqual(tally(evaluate(REFERENCE_CORRECTION)), { passed: 6, total: 6 });
  });

  it("an abort-aware helper still fails if the signal never reaches it", () => {
    const helperOnly = REFERENCE_CORRECTION.replace(
      "await wait(backoffMs * 2 ** attempt, options.signal);",
      "await wait(backoffMs * 2 ** attempt);",
    );

    assert.deepEqual(failing(helperOnly), ["abort-backoff"]);
  });

  it("passing the signal to a helper that ignores it still fails", () => {
    const callOnly = CANONICAL_AI_PATCH.replace(
      "await wait(backoffMs * 2 ** attempt);",
      "await wait(backoffMs * 2 ** attempt, options.signal);",
    );

    assert.deepEqual(failing(callOnly), ["abort-backoff"]);
  });

  it("accepts a differently written but valid fix", () => {
    const arrowFix = CANONICAL_AI_PATCH.replace(
      `function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}`,
      `const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });`,
    ).replace("await wait(backoffMs * 2 ** attempt);", "await sleep(backoffMs * 2 ** attempt, request.signal);");

    assert.deepEqual(tally(evaluate(arrowFix)), { passed: 6, total: 6 });
  });

  it("ignores abort listeners that only exist in comments", () => {
    const commented = CANONICAL_AI_PATCH.replace(
      "function wait(ms: number) {",
      '// TODO: signal.addEventListener("abort", () => reject())\nfunction wait(ms: number) {',
    ).replace("await wait(backoffMs * 2 ** attempt);", "await wait(backoffMs * 2 ** attempt, options.signal);");

    assert.deepEqual(failing(commented), ["abort-backoff"]);
  });

  it("catches the brief's original shape, which retried 404s", () => {
    const original = `export type RetryOptions = RequestInit & { retries?: number; backoffMs?: number };
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function shouldRetry(status: number) {
  return status === 429 || status >= 500;
}
export async function fetchJson<T>(url: string, options: RetryOptions = {}): Promise<T> {
  const { retries = 2, backoffMs = 250, ...request } = options;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, request);
      if (response.ok) {
        return response.json() as Promise<T>;
      }
      if (!shouldRetry(response.status) || attempt === retries) {
        throw new Error("Request failed: " + response.status);
      }
    } catch (error) {
      if (options.signal?.aborted || attempt === retries) {
        throw error;
      }
    }
    await wait(backoffMs * 2 ** attempt);
  }
  throw new Error("Retry limit reached");
}`;

    assert.deepEqual(failing(original), ["no-retry-404", "abort-backoff"]);
  });

  it("linear backoff fails the exponential test", () => {
    const linear = CANONICAL_AI_PATCH.replace("backoffMs * 2 ** attempt", "backoffMs");

    assert.deepEqual(failing(linear), ["backoff", "abort-backoff"]);
  });

  it("broken syntax and a missing export fail every test", () => {
    assert.equal(tally(evaluate(CANONICAL_AI_PATCH.slice(0, -3))).passed, 0);
    assert.equal(
      tally(evaluate(CANONICAL_AI_PATCH.replace("export async function fetchJson", "async function fetchJson"))).passed,
      0,
    );
  });

  it("is deterministic, durations included", () => {
    assert.deepEqual(evaluate(CANONICAL_AI_PATCH), evaluate(CANONICAL_AI_PATCH));
  });
});
