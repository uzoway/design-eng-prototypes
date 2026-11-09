/*
 * Proves the rebuilt LinkedIn nav icons are pixel-identical at rest to the
 * shipped SVGs in briefs/refs/linkedin-nav/icons.
 *
 * For every tab it takes the icon's live markup from /linkedin-nav, outline
 * and filled, renders it beside the shipped SVG at 24px and 192px on white,
 * in Chrome and WebKit, and diffs them. Only anti-aliasing may differ: no
 * pixel may be off by more than MAX_CHANNEL, and the mean must stay tiny.
 *
 * Usage, with `next dev` running on :3000 and playwright-core 1.64 and pngjs
 * importable (e.g. installed in a scratch folder on NODE_PATH):
 *   node scripts/linkedin-nav/icon-match.mjs [http://localhost:3000]
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require("playwright-core");
const { PNG } = require("pngjs");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const ICONS = path.join(ROOT, "briefs/refs/linkedin-nav/icons");
const BASE = process.argv[2] ?? "http://localhost:3000";

const MAX_CHANNEL = 64;
const MAX_MEAN = 0.5;

/* message-fill-medium was never captured; the built one is checked against its own static path. */
const MESSAGE_FILL =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M13.864 2a8.136 8.136 0 0 1 3.568 15.447L10.25 20.95V17.5h-.5a7.75 7.75 0 0 1 0-15.5zM8 8.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2m4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2m4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></svg>';

const shipped = (name) => fs.readFileSync(path.join(ICONS, `${name}.svg`), "utf8");

const TABS = [
  { tab: "Home", outline: "house-outline-medium", fill: "house-fill-medium" },
  { tab: "My Network", outline: "people-two-outline-medium", fill: "people-two-fill-medium" },
  { tab: "Jobs", outline: "briefcase-outline-medium", fill: "briefcase-fill-medium" },
  { tab: "Messaging", outline: "message-outline-medium", fill: null },
  { tab: "Notifications", outline: "bell-outline-medium", fill: "bell-fill-medium" },
];

async function grab(page, tab) {
  return page.evaluate((name) => {
    const button = [...document.querySelectorAll(".ln-desktop .ln-item")].find((b) => b.getAttribute("aria-label")?.startsWith(`${name},`));

    return button.querySelector("svg.ln-icon").outerHTML;
  }, tab);
}

function sized(svg, size) {
  return svg.replace(/<svg([^>]*?)width="24" height="24"/, `<svg$1width="${size}" height="${size}"`);
}

async function diff(page, a, b, size) {
  const html = (svg) =>
    `<div style="position:absolute;left:0;top:0;width:${size + 32}px;height:${size + 32}px;background:#fff;color:#000"><div style="position:absolute;left:16px;top:16px;line-height:0">${sized(svg, size)}</div></div>`;
  const shot = async (svg) => {
    await page.setContent(`<body style="margin:0">${html(svg)}</body>`);
    return PNG.sync.read(await page.screenshot({ clip: { x: 0, y: 0, width: size + 32, height: size + 32 } }));
  };
  const [x, y] = [await shot(a), await shot(b)];
  let worst = 0;
  let total = 0;
  let off = 0;

  for (let i = 0; i < x.data.length; i += 4) {
    const d = Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]));

    worst = Math.max(worst, d);
    total += d;
    if (d > MAX_CHANNEL) off++;
  }

  return { worst, mean: total / (x.data.length / 4), off };
}

let failed = 0;

for (const [engine, launcher] of [
  ["chrome", () => chromium.launch({ channel: "chrome" })],
  ["webkit", () => webkit.launch()],
]) {
  const browser = await launcher();
  const context = await browser.newContext({ viewport: { width: 1440, height: 700 }, deviceScaleFactor: 2, reducedMotion: "no-preference" });

  // Never send test visits to the real analytics property.
  await context.route(/googletagmanager|google-analytics/, (route) => route.abort());

  const page = await context.newPage();
  const scratch = await context.newPage();

  await page.goto(`${BASE}/linkedin-nav/`);
  await page.waitForSelector(".ln-desktop .ln-item svg");

  for (const { tab, outline, fill } of TABS) {
    // Outline: select something else first (Home starts selected).
    const other = tab === "Jobs" ? "My Network" : "Jobs";

    await page.locator(`.ln-desktop .ln-item[aria-label^="${other},"]`).click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(900);
    const rebuiltOutline = await grab(page, tab);

    await page.locator(`.ln-desktop .ln-item[aria-label^="${tab},"]`).click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(1100);
    const rebuiltFill = await grab(page, tab);

    for (const [state, rebuilt, reference] of [
      ["outline", rebuiltOutline, shipped(outline)],
      ["fill", rebuiltFill, fill ? shipped(fill) : MESSAGE_FILL],
    ]) {
      for (const size of [24, 192]) {
        const result = await diff(scratch, rebuilt, reference, size);
        const pass = result.off === 0 && result.mean <= MAX_MEAN;

        if (!pass) failed++;
        console.log(
          `${pass ? "pass" : "FAIL"}  ${engine.padEnd(6)} ${tab.padEnd(13)} ${state.padEnd(7)} ${String(size).padStart(3)}px  worst ${String(result.worst).padStart(3)}  mean ${result.mean.toFixed(3)}  off ${result.off}`,
        );
      }
    }
  }

  await browser.close();
}

console.log(failed ? `\n${failed} comparisons failed` : "\nAll rebuilt icons match the shipped SVGs at rest.");
process.exit(failed ? 1 : 0);
