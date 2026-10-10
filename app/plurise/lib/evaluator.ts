/*
 * Deterministic stand-in for `vitest run src/retry.test.ts`.
 *
 * Nothing is executed. The evaluator reads the working file and decides, test
 * by test, whether the code has the capability that test checks. The same code
 * always yields the same results, durations included.
 */

export type TestId =
  | "json"
  | "no-retry-404"
  | "retry-429"
  | "retry-5xx"
  | "backoff"
  | "abort-backoff";

export type TestResult = {
  id: TestId;
  label: string;
  passed: boolean;
  durationMs: number;
  detail?: string;
};

export const TEST_CASES: { id: TestId; label: string }[] = [
  { id: "json", label: "returns parsed JSON after a successful request" },
  { id: "no-retry-404", label: "does not retry a non-retryable 404" },
  { id: "retry-429", label: "retries status 429" },
  { id: "retry-5xx", label: "retries status 500 and 503" },
  { id: "backoff", label: "uses exponential backoff between attempts" },
  { id: "abort-backoff", label: "aborts immediately during backoff" },
];

export const ABORT_FAILURE_DETAIL =
  "Expected AbortError before 50 ms; promise remained pending for 10,000 ms.";

// Replace comments with spaces and, optionally, string contents too, keeping
// every index in place so positions still line up with the source.
function mask(code: string, { strings }: { strings: boolean }) {
  let out = "";
  let index = 0;

  while (index < code.length) {
    const pair = code.slice(index, index + 2);

    if (pair === "//") {
      const end = code.indexOf("\n", index);
      const stop = end === -1 ? code.length : end;

      out += " ".repeat(stop - index);
      index = stop;
      continue;
    }

    if (pair === "/*") {
      const end = code.indexOf("*/", index + 2);
      const stop = end === -1 ? code.length : end + 2;

      out += code.slice(index, stop).replace(/[^\n]/g, " ");
      index = stop;
      continue;
    }

    const char = code[index];

    if (char === '"' || char === "'" || char === "`") {
      let end = index + 1;

      while (end < code.length && code[end] !== char && !(char !== "`" && code[end] === "\n")) {
        end += code[end] === "\\" ? 2 : 1;
      }

      const literal = code.slice(index, end + 1);

      out += strings
        ? char + literal.slice(1, -1).replace(/[^\n]/g, " ") + (literal.length > 1 ? char : "")
        : literal;
      index = end + 1;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

function isBalanced(code: string) {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];

  for (const char of code) {
    if (char === "(" || char === "[" || char === "{") {
      stack.push(char);
    } else if (char in pairs) {
      if (stack.pop() !== pairs[char]) {
        return false;
      }
    }
  }

  return stack.length === 0;
}

// Index just past the bracket that closes the one at `open`, or -1.
function closeOf(code: string, open: number) {
  const close = code[open] === "(" ? ")" : code[open] === "[" ? "]" : "}";
  let depth = 0;

  for (let index = open; index < code.length; index += 1) {
    if (code[index] === code[open]) {
      depth += 1;
    } else if (code[index] === close) {
      depth -= 1;

      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return -1;
}

type Helper = { name: string; start: number; end: number; params: string; body: string };

// Function declarations and arrow constants, with their parameter lists and
// bodies. Arrow bodies without braces run to the end of the statement.
function findHelpers(code: string): Helper[] {
  const helpers: Helper[] = [];
  const declaration = /function\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/g;
  const arrow = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:<[^>]*>)?\s*\(/g;

  for (const pattern of [declaration, arrow]) {
    for (const match of code.matchAll(pattern)) {
      const open = match.index + match[0].length - 1;
      const paramsEnd = closeOf(code, open);

      if (paramsEnd === -1) {
        continue;
      }

      const params = code.slice(open + 1, paramsEnd - 1);
      let cursor = paramsEnd;

      if (pattern === arrow) {
        const arrowAt = code.slice(cursor).search(/=>/);

        if (arrowAt === -1 || /[;{}]/.test(code.slice(cursor, cursor + arrowAt).replace(/:[^=]*/, ""))) {
          continue;
        }

        cursor += arrowAt + 2;
      }

      const braceAt = code.slice(cursor).search(/\S/) + cursor;
      let end: number;

      if (code[braceAt] === "{") {
        end = closeOf(code, braceAt);
      } else if (pattern === declaration) {
        const brace = code.indexOf("{", cursor);
        end = brace === -1 ? -1 : closeOf(code, brace);
      } else {
        // Expression body: run to the first `;` or blank line at depth zero.
        let depth = 0;
        end = code.length;

        for (let index = cursor; index < code.length; index += 1) {
          const char = code[index];

          if ("([{".includes(char)) depth += 1;
          if (")]}".includes(char)) depth -= 1;

          if (depth === 0 && (char === ";" || code.startsWith("\n\n", index))) {
            end = index;
            break;
          }
        }
      }

      if (end === -1) {
        continue;
      }

      helpers.push({
        name: match[1],
        start: match.index,
        end,
        params,
        body: code.slice(cursor, end),
      });
    }
  }

  return helpers;
}

function callSites(code: string, helper: Helper) {
  const calls: string[] = [];
  const pattern = new RegExp(`(?<![\\w$.])${helper.name.replace(/\$/g, "\\$")}\\s*\\(`, "g");

  for (const match of code.matchAll(pattern)) {
    if (match.index >= helper.start && match.index < helper.end) {
      continue;
    }

    const open = match.index + match[0].length - 1;
    const close = closeOf(code, open);

    if (close !== -1) {
      calls.push(code.slice(open + 1, close - 1));
    }
  }

  return calls;
}

const LISTENS_FOR_ABORT = /addEventListener\(\s*["']abort["']|\.onabort\s*=/;

function hasAbortableBackoff(code: string, codeWithStrings: string) {
  // Node's promise timers take the signal directly.
  if (/timers\/promises/.test(codeWithStrings) && /\{\s*signal\b/.test(code)) {
    return true;
  }

  const timers = findHelpers(codeWithStrings).filter((helper) =>
    /\bsetTimeout\s*\(/.test(helper.body),
  );

  if (timers.length > 0) {
    // Every call to every timer helper has to be able to end early.
    return timers.every((helper) => {
      const calls = callSites(code, helper);
      const abortable =
        LISTENS_FOR_ABORT.test(helper.body) && /\breject\s*\(|throwIfAborted/.test(helper.body);

      return abortable && calls.every((args) => /signal/.test(args));
    });
  }

  // Inline: `await new Promise(...)` written straight into the retry loop.
  return (
    /new\s+Promise/.test(code) &&
    /\bsetTimeout\s*\(/.test(code) &&
    LISTENS_FOR_ABORT.test(codeWithStrings) &&
    /\breject\s*\(/.test(code)
  );
}

// The brief's original patch threw the non-retryable error inside the same
// try block whose catch only rethrew on abort or the last attempt, so a 404 was
// swallowed and retried. Spot that shape wherever it appears.
function swallowsOwnErrors(code: string) {
  for (const match of code.matchAll(/\btry\s*\{/g)) {
    const open = match.index + match[0].length - 1;
    const tryEnd = closeOf(code, open);

    if (tryEnd === -1) {
      continue;
    }

    const handler = /^\s*catch\s*(\([^)]*\))?\s*\{/.exec(code.slice(tryEnd));

    if (!handler) {
      continue;
    }

    const catchOpen = tryEnd + handler[0].length - 1;
    const catchBody = code.slice(catchOpen + 1, closeOf(code, catchOpen) - 1).trim();
    const tryBody = code.slice(open + 1, tryEnd - 1);
    const rethrowsAll = /^throw\b/.test(catchBody) || /instanceof/.test(catchBody);

    if (/\bthrow\b/.test(tryBody) && /status/.test(tryBody) && !rethrowsAll) {
      return true;
    }
  }

  return false;
}

export function evaluate(source: string): TestResult[] {
  const codeWithStrings = mask(source, { strings: false });
  const code = mask(source, { strings: true });

  const results = (
    outcome: Partial<Record<TestId, { passed: boolean; detail?: string }>>,
    fallback: { passed: boolean; detail?: string },
  ) =>
    TEST_CASES.map(({ id, label }) => {
      const { passed, detail } = outcome[id] ?? fallback;

      return {
        id,
        label,
        passed,
        durationMs: DURATIONS[id][passed ? 0 : 1],
        ...(passed ? {} : { detail }),
      };
    });

  if (!isBalanced(code)) {
    return results({}, {
      passed: false,
      detail: "SyntaxError: Unexpected end of input in src/retry.ts. Check your brackets.",
    });
  }

  if (!/export\s+(async\s+)?function\s+fetchJson\b|export\s+const\s+fetchJson\b/.test(code)) {
    return results({}, {
      passed: false,
      detail: "SyntaxError: The requested module './retry' does not provide an export named 'fetchJson'.",
    });
  }

  const callsFetch = /(?<![\w$.])fetch\s*\(/.test(code);
  const parsesJson = callsFetch && /\.json\s*\(\s*\)/.test(code);
  const loops = /\b(for|while)\s*\(|\bdo\s*\{/.test(code);
  const retries429 = loops && /\b429\b/.test(code);
  const retries5xx =
    loops &&
    (/>=\s*500\b|>\s*499\b/.test(code) ||
      (/\b500\b/.test(code) && /\b503\b/.test(code)) ||
      /\/\s*100\s*\)?\s*===?\s*5\b/.test(code));
  const guardsOtherStatuses =
    /!\s*[\w$]*[Rr]etr[\w$]*\s*\(/.test(code) ||
    /status\s*<\s*500\b|status\s*!==?\s*429\b/.test(code);
  const swallows = loops && swallowsOwnErrors(code);
  const retries404 = loops && (!guardsOtherStatuses || swallows);
  const exponential = /\*\*\s*\(?\s*[\w$.]+|Math\.pow\(\s*2\s*,|<<\s*[\w$.]+|\*=\s*2\b/.test(code);
  const abortable = hasAbortableBackoff(code, codeWithStrings);

  const firstStatusError = (status: number) =>
    `Expected a retry after ${status}; received Error: Request failed: ${status}.`;

  return results(
    {
      json: {
        passed: parsesJson,
        detail: "Expected { ok: true }; fetchJson did not resolve to the parsed body.",
      },
      "no-retry-404": {
        passed: !retries404,
        detail: "Expected fetch to have been called 1 time; it was called 3 times.",
      },
      "retry-429": { passed: retries429, detail: firstStatusError(429) },
      "retry-5xx": { passed: retries5xx, detail: firstStatusError(500) },
      backoff: {
        passed: retries5xx && exponential,
        detail: retries5xx
          ? "Expected delays [100, 200]; received [100, 100]."
          : "Expected delays [100, 200]; received Error: Request failed: 503.",
      },
      "abort-backoff": {
        passed: retries5xx && abortable,
        detail: retries5xx
          ? ABORT_FAILURE_DETAIL
          : "Expected AbortError; received Error: Request failed: 503.",
      },
    },
    { passed: false },
  );
}

// [passed, failed] in ms. Fixed so a rerun of the same code looks identical.
const DURATIONS: Record<TestId, [number, number]> = {
  json: [3, 4],
  "no-retry-404": [2, 6],
  "retry-429": [4, 3],
  "retry-5xx": [6, 3],
  backoff: [5, 4],
  "abort-backoff": [2, 52],
};

export function tally(results: TestResult[]) {
  return {
    passed: results.filter((result) => result.passed).length,
    total: results.length,
  };
}
