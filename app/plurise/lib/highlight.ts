export type TokenKind =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "function"
  | "property"
  | "punctuation";

export type Token = { kind: TokenKind; text: string };

const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "catch",
  "const",
  "continue",
  "else",
  "export",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "void",
  "while",
]);

const TYPES = new Set(["number", "string", "boolean", "unknown", "any", "never"]);

// One pass per line. Good enough for a forty-line TypeScript file: it never
// needs to be right about grammar, only stable and quick while typing.
// Block comments spanning lines are tracked across lines.
export function highlight(code: string): Token[][] {
  const lines = code.split("\n");
  const result: Token[][] = [];
  let inBlockComment = false;

  for (const line of lines) {
    const tokens: Token[] = [];
    let index = 0;

    const push = (kind: TokenKind, text: string) => {
      const last = tokens.at(-1);

      if (last && last.kind === kind) {
        last.text += text;
      } else {
        tokens.push({ kind, text });
      }
    };

    while (index < line.length) {
      const rest = line.slice(index);

      if (inBlockComment) {
        const end = rest.indexOf("*/");
        const text = end === -1 ? rest : rest.slice(0, end + 2);

        push("comment", text);
        index += text.length;
        inBlockComment = end === -1;
        continue;
      }

      if (rest.startsWith("//")) {
        push("comment", rest);
        break;
      }

      if (rest.startsWith("/*")) {
        inBlockComment = true;
        continue;
      }

      const char = line[index];

      if (char === '"' || char === "'" || char === "`") {
        let end = index + 1;

        while (end < line.length && line[end] !== char) {
          end += line[end] === "\\" ? 2 : 1;
        }

        push("string", line.slice(index, end + 1));
        index = end + 1;
        continue;
      }

      const number = /^\d[\d_]*(\.\d+)?/.exec(rest);

      if (number) {
        push("number", number[0]);
        index += number[0].length;
        continue;
      }

      const word = /^[A-Za-z_$][\w$]*/.exec(rest);

      if (word) {
        const text = word[0];
        const after = line.slice(index + text.length);
        const before = line.slice(0, index);

        if (KEYWORDS.has(text)) {
          push("keyword", text);
        } else if (TYPES.has(text) || /^[A-Z]/.test(text)) {
          push("type", text);
        } else if (/^\s*(<[^>]*>)?\(/.test(after)) {
          push("function", text);
        } else if (/\.\s*$/.test(before) || /^\??:\s*/.test(after)) {
          push("property", text);
        } else {
          push("plain", text);
        }

        index += text.length;
        continue;
      }

      if (/\s/.test(char)) {
        push("plain", char);
      } else {
        push("punctuation", char);
      }

      index += 1;
    }

    result.push(tokens);
  }

  return result;
}
