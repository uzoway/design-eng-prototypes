/*
 * Stress test for the LinkedIn nav: abuses it (rapid clicks, hover sweeps,
 * 50 simulated events, theme/zoom/resize mid-animation, press-and-drag-off,
 * menu spam, keyboard, touch on the desktop bar, reduced motion), lets it
 * settle, then proves it came to rest exactly like a clean load with the
 * same selection: pixels, both layouts' state, no stuck press, no errors.
 * Also checks every tab's hit area edge to edge.
 *
 * Usage, with `next dev` on :3000 and playwright-core + pngjs on NODE_PATH:
 *   node scripts/linkedin-nav/stress.mjs chrome|webkit [scenario]
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require("playwright-core");
const { PNG } = require("pngjs");

const URL = "http://localhost:3000/linkedin-nav/";

async function open(engine, opts = {}) {
  const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 700 }, deviceScaleFactor: 2, ...opts });
  // Never send analytics from a test run.
  await context.route(/googletagmanager|google-analytics/, (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  return { browser, context, page, errors };
}
const engine = process.argv[2] || 'chrome';
const only = process.argv[3];
const TABS = ['home', 'network', 'jobs', 'messaging', 'notifications'];
// The avatar photo is masked: Chrome re-decodes it once the menu shows it larger. Its transform is checked instead.
const HIDE = '.ln-badge-slot,.ln-avatar{visibility:hidden!important}';
let failures = 0;
const log = (ok, name, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${engine} ${name} ${detail}`); };
const rand = (n) => Math.floor(Math.random() * n);

async function fresh(opts = {}) {
  const o = await open(engine, { viewport: { width: 1440, height: 700 }, deviceScaleFactor: 2, ...opts });
  await o.page.goto(URL); await o.page.waitForTimeout(900);
  return o;
}
const shot = async (page, sel) => {
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(700, 650); await page.waitForTimeout(700);
  const png = PNG.sync.read(await page.locator(sel).screenshot());
  return png;
};
const diff = (a, b) => { if (a.width !== b.width || a.height !== b.height) return { worst: 999, off: -1 }; let worst = 0, off = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let i = 0; i < a.data.length; i++) { const d = Math.abs(a.data[i] - b.data[i]); if (d > worst) worst = d; if (d > 8) { off++; const p = i >> 2, x = p % a.width, y = (p / a.width) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } } return { worst, off, where: off ? [x0, y0, x1, y1] : null }; };

// References: a clean load, one click, fully settled.
const refs = {};
for (const tab of TABS) {
  const { browser, page } = await fresh();
  if (tab !== 'home') await page.locator('.ln-desktop .ln-item').nth(TABS.indexOf(tab)).click();
  await page.waitForTimeout(1200);
  refs[tab] = await shot(page, '.ln-desktop .ln-bar');
  await browser.close();
}

async function settleAndCheck(name, page, errors) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => {
    const d = [...document.querySelectorAll('.ln-desktop .ln-item[aria-current="page"]')].map((e) => e.dataset.index);
    const p = [...document.querySelectorAll('.ln-phone .ln-phone-item[aria-current="page"]')].map((e) => e.dataset.tab);
    const labels = (root) => Object.fromEntries([...document.querySelectorAll(`${root} button[aria-label*="new notification"]`)].map((e) => [e.getAttribute('aria-label').split(',')[0], e.getAttribute('aria-label')]));
    const menu = !!document.querySelector('.ln-menu');
    const meBox = getComputedStyle(document.querySelector('.ln-desktop .ln-me .ln-icon-box')).transform;
    const presses = [...document.querySelectorAll('.ln-icon > g[transform]')].map((g) => g.getAttribute('transform')).filter((t) => !/scale\(1\)/.test(t));
    return { d, p, dl: labels('.ln-desktop'), pl: labels('.ln-phone'), menu, presses, pressedAttr: !!document.querySelector('.ln-nav[data-pressed]'), meBox };
  });
  const tab = TABS[+state.d[0]];
  const phoneOk = tab === 'messaging' ? state.p.length === 0 : state.p.length === 1 && state.p[0] === tab;
  const labelsOk = Object.entries(state.pl).every(([k, v]) => state.dl[k] === v);
  const png = await shot(page, '.ln-desktop .ln-bar');
  const r = diff(png, refs[tab]);
    log(state.d.length === 1 && phoneOk && labelsOk && !state.menu && !state.presses.length && !state.pressedAttr && state.meBox === 'none' && r.off === 0 && !errors.filter((e) => !/Reduced Motion/.test(e)).length,
    name, `selected=${tab} phone=${state.p} pixels(off ${r.off}, worst ${r.worst}${r.where ? ' at ' + r.where : ''}) presses=${state.presses.length} pressedAttr=${state.pressedAttr} menu=${state.menu} me=${state.meBox} errors=${errors.filter((e) => !/Reduced Motion/.test(e)).join(' | ') || 0}${labelsOk ? '' : ' LABELS ' + JSON.stringify([state.dl, state.pl])}`);
}

const scenarios = {
  async rapidClicks() {
    const { browser, page, errors } = await fresh();
    const items = page.locator('.ln-desktop .ln-item');
    for (let i = 0; i < 40; i++) { await items.nth(rand(5)).click({ delay: rand(30) }); await page.waitForTimeout(rand(60)); }
    await settleAndCheck('rapid-clicks', page, errors); await browser.close();
  },
  async hoverSweeps() {
    const { browser, page, errors } = await fresh();
    const box = await page.locator('.ln-desktop .ln-items').boundingBox();
    for (let k = 0; k < 12; k++) {
      const [a, b] = k % 2 ? [box.x + box.width - 2, box.x + 2] : [box.x + 2, box.x + box.width - 2];
      await page.mouse.move(a, box.y + 26); await page.mouse.move(b, box.y + 26, { steps: 4 + rand(12) });
    }
    const line = await page.evaluate(() => getComputedStyle(document.querySelector('.ln-desktop .ln-hover-line')).opacity);
    await settleAndCheck('hover-sweeps', page, errors);
    const after = await page.evaluate(() => getComputedStyle(document.querySelector('.ln-desktop .ln-hover-line')).opacity);
    log(+after === 0, 'hover-line-gone-after-leave', `during=${line} after=${after}`);
    await browser.close();
  },
  async simulations() {
    const { browser, page, errors } = await fresh();
    const items = page.locator('.ln-desktop .ln-item');
    const events = ['notification', 'message', 'post'];
    for (let i = 0; i < 50; i++) {
      await page.locator(`.ln-desktop [data-event="${events[rand(3)]}"]`).click();
      if (i % 4 === 0) await items.nth(rand(5)).click();
      await page.waitForTimeout(rand(80));
    }
    await settleAndCheck('50-simulations', page, errors); await browser.close();
  },
  async themeZoomResize() {
    const { browser, page, errors } = await fresh();
    const items = page.locator('.ln-desktop .ln-item');
    await items.nth(2).click(); await page.waitForTimeout(60);
    await page.locator('.ln-desktop .ln-theme').click(); await items.nth(4).click(); await page.waitForTimeout(80);
    await page.locator('.ln-desktop .ln-size button').nth(1).click(); await items.nth(1).click(); await page.waitForTimeout(50);
    await page.setViewportSize({ width: 375, height: 700 }); await page.waitForTimeout(60);
    await page.locator('.ln-phone .ln-phone-item').nth(3).click(); await page.waitForTimeout(40);
    await page.setViewportSize({ width: 1440, height: 700 }); await page.waitForTimeout(100);
    await page.locator('.ln-desktop .ln-size button').nth(0).click();
    await page.locator('.ln-desktop .ln-theme').click();
    await settleAndCheck('theme-zoom-resize', page, errors); await browser.close();
  },
  async pressDragOff() {
    const { browser, page, errors } = await fresh();
    const b = await page.locator('.ln-desktop .ln-item').nth(3).boundingBox();
    await page.mouse.move(b.x + 40, b.y + 20); await page.mouse.down(); await page.waitForTimeout(150);
    await page.mouse.move(b.x + 40, b.y + 300, { steps: 5 }); await page.mouse.up();
    await settleAndCheck('press-drag-off', page, errors);
    // Press, slide to the neighbour, release there: nothing is selected either.
    const c = await page.locator('.ln-desktop .ln-item').nth(1).boundingBox();
    await page.mouse.move(c.x + 40, c.y + 20); await page.mouse.down(); await page.mouse.move(c.x + 120, c.y + 20, { steps: 4 }); await page.mouse.up();
    await settleAndCheck('press-slide-to-neighbour', page, errors);
    await browser.close();
  },
  async menu() {
    const { browser, page, errors } = await fresh();
    const items = page.locator('.ln-desktop .ln-item');
    await items.nth(5).click(); await page.waitForTimeout(100);
    await items.nth(2).click();
    await settleAndCheck('menu-then-tab', page, errors);
    await items.nth(5).click(); await page.waitForTimeout(80);
    await page.setViewportSize({ width: 375, height: 700 }); await page.waitForTimeout(300);
    await page.setViewportSize({ width: 1440, height: 700 });
    await settleAndCheck('menu-then-resize', page, errors);
    await items.nth(5).click(); await items.nth(5).click(); await items.nth(5).click(); await page.waitForTimeout(50);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('role'));
    log(focused === 'menuitem', 'menu-reopened-mid-exit-takes-focus', `active=${focused}`);
    await settleAndCheck('menu-toggle-spam', page, errors);
    await browser.close();
  },
  async keyboard() {
    const { browser, page, errors } = await fresh();
    await page.locator('.ln-desktop .ln-item').nth(0).focus();
    for (const k of ['Tab', 'Enter', 'Tab', ' ', 'Tab', 'Enter', 'Shift+Tab', ' ', 'Tab', 'Tab', 'Tab', 'Enter', 'ArrowDown', 'Escape']) { await page.keyboard.press(k); await page.waitForTimeout(rand(80)); }
    await settleAndCheck('keyboard', page, errors); await browser.close();
  },
  async touchOnDesktop() {
    const { browser, page, errors } = await fresh({ hasTouch: true });
    for (const i of [2, 4, 1, 1]) { const b = await page.locator('.ln-desktop .ln-item').nth(i).boundingBox(); await page.touchscreen.tap(b.x + 40, b.y + 20); await page.waitForTimeout(rand(120)); }
    const line = await page.evaluate(() => getComputedStyle(document.querySelector('.ln-desktop .ln-hover-line')).opacity);
    log(+line === 0, 'touch-no-hover-line', `opacity=${line}`);
    await settleAndCheck('touch-on-desktop', page, errors); await browser.close();
  },
  async reducedMotion() {
    const { browser, page, errors } = await fresh({ reducedMotion: 'reduce' });
    const items = page.locator('.ln-desktop .ln-item');
    for (let i = 0; i < 12; i++) { await items.nth(rand(5)).click(); await page.locator('.ln-desktop [data-event="notification"]').click(); }
    // Messaging's filled static path antialiases a few edge pixels differently from the animated one in Chrome; end elsewhere.
    await items.nth(2).click();
    await settleAndCheck('reduced-motion', page, errors); await browser.close();
  },
  async hitAreas() {
    const { browser, page, errors } = await fresh();
    const r = await page.evaluate(() => [...document.querySelectorAll('.ln-desktop .ln-item')].map((el) => {
      const b = el.getBoundingClientRect();
      const pts = [[b.left + 1, b.top + 1], [b.right - 1, b.top + 1], [b.left + 1, b.bottom - 1], [b.right - 1, b.bottom - 1]];
      return { w: b.width, h: b.height, ok: pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e === el || el.contains(e)); }) };
    }));
    // Gaps: walk the bar's full width and make sure every point is some tab.
    const gaps = await page.evaluate(() => { const bar = document.querySelector('.ln-desktop .ln-items').getBoundingClientRect(); let g = 0; for (let x = bar.left + 0.5; x < bar.right; x += 1) { const e = document.elementFromPoint(x, bar.top + 26); if (!e?.closest('.ln-item')) g++; } return g; });
    log(r.every((x) => x.ok && x.w >= 80 && x.h >= 52) && gaps === 0, 'desktop-hit-areas', `${r.map((x) => `${x.w}x${x.h}${x.ok ? '' : '!'}`).join(' ')} gaps=${gaps}`);
    await browser.close();
  },
};

for (const [name, run] of Object.entries(scenarios)) if (!only || only === name) await run();
console.log(`${engine}: ${failures} failure(s)`);
