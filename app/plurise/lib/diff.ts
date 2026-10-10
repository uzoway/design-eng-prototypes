export type DiffRow =
  | {
      kind: "context" | "add" | "remove";
      text: string;
      oldLine: number | null;
      newLine: number | null;
    }
  | { kind: "hunk"; text: string };

type LineOp = {
  kind: "context" | "add" | "remove";
  text: string;
  oldLine: number | null;
  newLine: number | null;
};

function splitLines(code: string) {
  const lines = code.split("\n");

  if (lines.at(-1) === "") {
    lines.pop();
  }

  return lines;
}

// Classic LCS line diff. Files here are under a hundred lines, so the
// quadratic table is cheaper than anything cleverer.
function diffLines(before: string, after: string): LineOp[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const ops: LineOp[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      ops.push({ kind: "context", text: a[i], oldLine: i + 1, newLine: j + 1 });
      i += 1;
      j += 1;
    } else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) {
      ops.push({ kind: "add", text: b[j], oldLine: null, newLine: j + 1 });
      j += 1;
    } else {
      ops.push({ kind: "remove", text: a[i], oldLine: i + 1, newLine: null });
      i += 1;
    }
  }

  // LCS happily anchors on blank lines and lone braces, which splits one
  // logical rewrite into interleaved fragments. Fold short runs of those
  // trivial lines back into the surrounding change so the hunk reads cleanly.
  const isTrivial = (text: string) => /^\s*[{}()[\];,]*\s*$/.test(text);
  const isChange = (op: LineOp | undefined) => op !== undefined && op.kind !== "context";

  for (let start = 0; start < ops.length; start += 1) {
    if (ops[start].kind !== "context" || !isChange(ops[start - 1])) {
      continue;
    }

    let end = start;

    while (end < ops.length && ops[end].kind === "context" && isTrivial(ops[end].text)) {
      end += 1;
    }

    if (end - start > 0 && end - start <= 2 && isChange(ops[end])) {
      const folded = ops.slice(start, end).flatMap((op): LineOp[] => [
        { kind: "remove", text: op.text, oldLine: op.oldLine, newLine: null },
        { kind: "add", text: op.text, oldLine: null, newLine: op.newLine },
      ]);

      ops.splice(start, end - start, ...folded);
      start += folded.length - 1;
    }
  }

  // Show removals before additions inside each change block, like git does.
  const ordered: LineOp[] = [];
  let block: LineOp[] = [];

  const flush = () => {
    ordered.push(
      ...block.filter((op) => op.kind === "remove"),
      ...block.filter((op) => op.kind === "add"),
    );
    block = [];
  };

  for (const op of ops) {
    if (op.kind === "context") {
      flush();
      ordered.push(op);
    } else {
      block.push(op);
    }
  }

  flush();

  return ordered;
}

export function unifiedDiff(before: string, after: string, context = 3) {
  const ops = diffLines(before, after);
  const keep = new Array<boolean>(ops.length).fill(false);

  ops.forEach((op, index) => {
    if (op.kind === "context") {
      return;
    }

    for (
      let k = Math.max(0, index - context);
      k <= Math.min(ops.length - 1, index + context);
      k += 1
    ) {
      keep[k] = true;
    }
  });

  const rows: DiffRow[] = [];
  let index = 0;

  while (index < ops.length) {
    if (!keep[index]) {
      index += 1;
      continue;
    }

    const start = index;

    while (index < ops.length && keep[index]) {
      index += 1;
    }

    const hunk = ops.slice(start, index);
    const oldStart = hunk.find((op) => op.oldLine !== null)?.oldLine ?? 0;
    const newStart = hunk.find((op) => op.newLine !== null)?.newLine ?? 0;
    const oldCount = hunk.filter((op) => op.kind !== "add").length;
    const newCount = hunk.filter((op) => op.kind !== "remove").length;

    rows.push({
      kind: "hunk",
      text: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
    });
    rows.push(...hunk);
  }

  const additions = ops.filter((op) => op.kind === "add").length;
  const deletions = ops.filter((op) => op.kind === "remove").length;

  return { rows, additions, deletions };
}

// 1-based line numbers in `after` that are new or changed relative to `before`.
// Drives the gutter change bars in the editor.
export function changedLines(before: string, after: string) {
  const lines = new Set<number>();

  for (const op of diffLines(before, after)) {
    if (op.kind === "add" && op.newLine !== null) {
      lines.add(op.newLine);
    }
  }

  return lines;
}
