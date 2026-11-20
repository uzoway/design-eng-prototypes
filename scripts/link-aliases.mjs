// Writes small redirect pages into the static export for the ways a shared link gets
// mangled: "(uzookafor.com/plurise)" keeps its ")", a sentence's full stop sticks to the
// URL, a professor types "PLURISE". GitHub Pages has no redirects and would answer those
// with a 404 status, which is what email link scanners and previews see. With a real page
// at each of these paths they get a 200 and go straight to the right page.
//
// The 404 page (app/not-found.tsx) catches everything else in the browser; this covers
// the common cases without relying on JavaScript.
//
//   node scripts/link-aliases.mjs [out]
//
// Safe to run twice: it never overwrites a page that already exists. The deploy runs it
// again after Lunon Living Report is copied in, so that page gets its aliases too.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "out";

// What a sentence or a mail client leaves on the end of a link.
const ENDINGS = [")", ".", ",", ").", "),", ")]", ";", ":", "]", ">", "!", "'"];

// Links I send to people by hand get every variant, in any case and after a slash too.
const SHARED = {
  plurise: {
    spellings: ["plurise", "PLURISE", "Plurise", "plurise-lab", "PLURISE-lab"],
    afterSlash: true,
  },
};

const routes = readdirSync(OUT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && entry.name !== "404")
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(OUT, name, "index.html")) && !/[^a-z0-9-]/.test(name));

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// The target's title and preview tags, so a link preview of the alias still looks right.
function previewTags(route) {
  const html = readFileSync(join(OUT, route, "index.html"), "utf8");
  const title = html.match(/<title>[^<]*<\/title>/)?.[0] ?? "";
  const metas =
    html.match(/<meta (?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>/g) ?? [];
  return [title, ...metas].join("\n    ");
}

function redirectPage(route) {
  const target = `/${route}/`;
  const href = escapeHtml(target);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="https://uzookafor.com${href}" />
    ${previewTags(route)}
    <script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
    <meta http-equiv="refresh" content="0; url=${href}" />
    <style>body{margin:0;background:#f4f4f1;color:#111;font:14px/1.6 system-ui,sans-serif}a{color:inherit}p{padding:24px}</style>
  </head>
  <body>
    <p>Taking you to <a href="${href}">uzookafor.com${href}</a>…</p>
  </body>
</html>
`;
}

let written = 0;

function writeAlias(alias, route) {
  const dir = join(OUT, alias);
  // existsSync also stops "PLURISE" overwriting "plurise" on a case-insensitive disk (macOS).
  // On the Linux build machine the folders are separate, so every spelling gets its page.
  if (existsSync(dir)) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), redirectPage(route));
  written++;
}

for (const route of routes) {
  const shared = SHARED[route];
  const spellings = shared?.spellings ?? [route];

  for (const spelling of spellings) {
    if (spelling !== route) writeAlias(spelling, route);
    for (const ending of ENDINGS) writeAlias(spelling + ending, route);
  }

  // "uzookafor.com/plurise/)": the ending lands inside the real page's folder.
  if (shared?.afterSlash) {
    for (const ending of ENDINGS) {
      if (ending.startsWith(".")) continue; // "/plurise/." is the folder itself
      writeAlias(join(route, ending), route);
    }
  }
}

console.log(`link-aliases: ${written} redirect pages for ${routes.length} routes`);
