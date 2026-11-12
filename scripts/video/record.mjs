// Time away, take 2: drag a range -> Job hunting; click one day -> type a custom
// reason; click a job-hunting day -> Remove; hover the custom day.
// Recorded 10x slow with a human cursor; the cursor and caret are drawn in post.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'take';
const URL = process.env.URL || 'http://localhost:3000/time-away/';
const S = 10;
const DPR = 3;
const VIEW = { width: 1100, height: 900 };
const CUSTOM = 'Fighting Safari';
const DAY_START = 20464; // Sun Jan 11 2026
const DAY_END = 20505; // Sat Feb 21 2026
const DAY_JOB = 20485; // Sun Feb 1, inside the range
const SINGLE_CANDIDATES = [20558, 20557, 20559, 20551, 20565]; // Wed Apr 15 and neighbours

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR, colorScheme: 'light' });
await ctx.route(/googletagmanager|google-analytics|_vercel\/insights/, (r) => r.abort());
await ctx.addInitScript(() => {
  try { localStorage.setItem('merchant-theme', 'light'); } catch {}
  // Time warp (see README).
  const rn = performance.now.bind(performance), rdn = Date.now;
  const rST = window.setTimeout.bind(window), rSI = window.setInterval.bind(window), rRAF = window.requestAnimationFrame.bind(window);
  let S = 1, baseR = rn(), baseV = baseR, baseDR = rdn(), baseDV = baseDR;
  const v = () => baseV + (rn() - baseR) / S;
  window.__setSlow = (s) => { const nv = v(), nd = Date.now(); baseR = rn(); baseV = nv; baseDR = rdn(); baseDV = nd; S = s; };
  performance.now = v;
  Date.now = () => baseDV + (rdn() - baseDR) / S;
  window.setTimeout = (fn, d = 0, ...a) => rST(fn, (Number(d) || 0) * S, ...a);
  window.setInterval = (fn, d = 0, ...a) => rSI(fn, (Number(d) || 0) * S, ...a);
  window.requestAnimationFrame = (cb) => rRAF(() => cb(v()));
  // The browser's caret blinks on its own clock, so hide it; post draws it at the real rate.
  const style = () => { const s = document.createElement('style'); s.textContent = '*{caret-color:transparent!important}'; document.head.appendChild(s); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', style); else style();
  // Where the caret is, for post.
  const canvas = document.createElement('canvas').getContext('2d');
  window.__probe = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const c = el ? getComputedStyle(el).cursor : 'auto';
    const kind = c === 'pointer' ? 'hand' : c === 'text' ? 'ibeam' : 'arrow';
    let caret = null;
    const a = document.activeElement;
    if (a && a.tagName === 'INPUT' && a.selectionStart === a.selectionEnd) {
      const st = getComputedStyle(a), r = a.getBoundingClientRect();
      canvas.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
      const w = canvas.measureText(a.value.slice(0, a.selectionStart)).width;
      const fs = parseFloat(st.fontSize);
      const h = Math.round(fs * 1.2);
      caret = {
        x: r.left + parseFloat(st.borderLeftWidth) + parseFloat(st.paddingLeft) + w - a.scrollLeft,
        y: r.top + r.height / 2 - h / 2, h, color: st.color, len: a.value.length,
      };
    }
    return { kind, caret };
  };
});

const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector(`td[data-day="${DAY_END}"]`);
await page.waitForTimeout(800);

const label = (d) => page.$eval(`td[data-day="${d}"]`, (e) => e.getAttribute('aria-label'));
let DAY_SINGLE = null;
for (const d of SINGLE_CANDIDATES) if ((await label(d)).startsWith('No contributions')) { DAY_SINGLE = d; break; }
console.log('range', await label(DAY_START), '→', await label(DAY_END), '| single', await label(DAY_SINGLE));

const rect = (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const box = async (loc) => { const b = await loc.boundingBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const day = (d) => rect(`td[data-day="${d}"]`);
const rects = {
  h2: await rect('h2'), box: await rect('.ta-box'), table: await rect('.ta-grid'),
  start: await day(DAY_START), end: await day(DAY_END), job: await day(DAY_JOB), single: await day(DAY_SINGLE),
};

// ---- human-like motion ----
const minJerk = (t) => t * t * t * (10 + t * (-15 + 6 * t));
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function reach(from, to, { width = 12, curve = 0.07, overshoot = true, dur } = {}) {
  const dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy);
  const T = dur ?? 0.2 + 0.11 * Math.log2(dist / width + 1);
  const ux = dx / (dist || 1), uy = dy / (dist || 1);
  const os = overshoot && dist > 60 ? Math.min(5, 1.5 + dist * 0.008) : 0;
  const aim = { x: to.x + ux * os + (rand() - 0.5) * 1.2, y: to.y + uy * os + (rand() - 0.5) * 1.2 };
  const side = dx >= 0 ? 1 : -1;
  const ctrl = { x: (from.x + aim.x) / 2 - uy * dist * curve * side, y: (from.y + aim.y) / 2 + ux * dist * curve * side };
  const segs = [{ T, at: (t) => { const s = minJerk(t), a = 1 - s; return { x: a * a * from.x + 2 * a * s * ctrl.x + s * s * aim.x, y: a * a * from.y + 2 * a * s * ctrl.y + s * s * aim.y }; } }];
  if (os) { const cT = 0.13 + rand() * 0.04; segs.push({ T: cT, at: (t) => { const s = minJerk(t); return { x: aim.x + (to.x - aim.x) * s, y: aim.y + (to.y - aim.y) * s }; } }); }
  return segs;
}

// ---- capture ----
const cdp = await ctx.newCDPSession(page);
await cdp.send('Animation.enable');
const cap = { frames: [], pos: [], keys: [], rects, marks: {}, S, DPR, VIEW, custom: CUSTOM };
let capturing = true, frameNo = 0, clock0 = 0;
const vt = () => (performance.now() - clock0) / 1000 / S;
async function captureLoop() {
  while (capturing) {
    const a = vt();
    const data = await page.screenshot({ type: 'jpeg', quality: 95, caret: 'initial' });
    const b = vt();
    const name = String(frameNo++).padStart(5, '0') + '.jpg';
    fs.writeFileSync(path.join(OUT, 'frames', name), data);
    cap.frames.push({ name, vt: +((a + b) / 2).toFixed(4) });
  }
}

// ---- phase runner: a phase is planned from the current DOM, then played in real time ----
let pos = { x: rects.box.x + 560, y: rects.box.y + 300 };
let pressed = false, kind = 'arrow';
function planner() {
  let t = vt();
  const steps = [], events = [];
  const api = {
    mark: (n) => { cap.marks[n] = +t.toFixed(3); },
    hold: (s) => { const p = { ...pos }; steps.push({ t0: t, T: s, at: () => p }); t += s; },
    to: (target, opts) => { for (const seg of reach(pos, target, opts)) { steps.push({ t0: t, T: seg.T, at: seg.at }); t += seg.T; } pos = { ...target }; },
    path: (T, at, end) => { steps.push({ t0: t, T, at }); t += T; pos = { ...end }; },
    down: () => events.push({ t, type: 'down' }),
    up: () => events.push({ t, type: 'up' }),
    click: () => { events.push({ t, type: 'down' }); events.push({ t: t + 0.085, type: 'up' }); },
    type: (text) => {
      for (const ch of text) {
        const gap = 0.075 + rand() * 0.06 + (ch === ' ' ? 0.05 : 0) + (ch === ch.toUpperCase() && ch !== ' ' ? 0.035 : 0);
        api.hold(gap);
        events.push({ t, type: 'key', ch });
      }
    },
    play: () => run(steps, events),
  };
  return api;
}
async function run(steps, events) {
  const end = Math.max(...steps.map((s) => s.t0 + s.T));
  const evs = [...events].sort((a, b) => a.t - b.t);
  let ei = 0;
  while (true) {
    const now = vt();
    while (ei < evs.length && evs[ei].t <= now) {
      const e = evs[ei++];
      if (e.type === 'down') { await page.mouse.down(); pressed = true; }
      if (e.type === 'up') { await page.mouse.up(); pressed = false; }
      if (e.type === 'key') { await page.keyboard.type(e.ch); cap.keys.push(+now.toFixed(4)); }
    }
    const s = steps.find((s) => now >= s.t0 && now < s.t0 + s.T) || steps[steps.length - 1];
    const p = s.at(Math.min(1, Math.max(0, (now - s.t0) / s.T)));
    await page.mouse.move(p.x, p.y);
    const probe = await page.evaluate(([x, y]) => window.__probe(x, y), [p.x, p.y]);
    if (!pressed) kind = probe.kind;
    cap.pos.push({ vt: +now.toFixed(4), x: +p.x.toFixed(2), y: +p.y.toFixed(2), kind, pressed, caret: probe.caret });
    if (now >= end && ei >= evs.length) break;
  }
}

await page.mouse.move(pos.x, pos.y);
await page.evaluate((s) => window.__setSlow(s), S);
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / S });
clock0 = performance.now();
const capP = captureLoop();

// 1. Drag Jan 11 -> Feb 21.
{
  const p = planner();
  p.hold(0.35); p.mark('moveToStart');
  p.to(center(rects.start), { width: 10 });
  p.hold(0.32); p.mark('down1'); p.down(); p.hold(0.12);
  const from = { ...pos }, to = center(rects.end);
  const ctrl = { x: (from.x + to.x) / 2 + 8, y: (from.y + to.y) / 2 - 10 };
  p.path(1.25, (u) => { const s = minJerk(u), a = 1 - s; return { x: a * a * from.x + 2 * a * s * ctrl.x + s * s * to.x, y: a * a * from.y + 2 * a * s * ctrl.y + s * s * to.y }; }, to);
  p.hold(0.35); p.mark('up1'); p.up(); p.hold(0.7);
  await p.play();
}
// 2. Job hunting -> Mark as away.
{
  rects.panel1 = await rect('[role="dialog"]');
  const chip = await box(page.locator('.ta-chips button', { hasText: 'Job hunting' }));
  const mark = await box(page.getByRole('button', { name: 'Mark as away' }));
  const p = planner();
  p.mark('toChip'); p.to({ x: chip.x + chip.w * 0.45, y: chip.y + chip.h * 0.55 }, { width: chip.h });
  p.hold(0.18); p.mark('clickChip'); p.click(); p.hold(0.55);
  p.to({ x: mark.x + mark.w * 0.55, y: mark.y + mark.h * 0.5 }, { width: mark.h });
  p.hold(0.2); p.mark('clickMark1'); p.click(); p.hold(0.75);
  await p.play();
}
// 3. One day, typed reason.
{
  const p = planner();
  p.mark('toSingle'); p.to(center(rects.single), { width: 10 });
  p.hold(0.45); p.mark('clickSingle'); p.click(); p.hold(0.6);
  await p.play();
}
{
  rects.panel2 = await rect('[role="dialog"]');
  const p = planner();
  p.mark('typeStart'); p.type(CUSTOM); p.mark('typeEnd'); p.hold(0.4);
  await p.play();
}
{
  const mark = await box(page.getByRole('button', { name: 'Mark as away' }));
  const p = planner();
  p.to({ x: mark.x + mark.w * 0.5, y: mark.y + mark.h * 0.5 }, { width: mark.h });
  p.hold(0.2); p.mark('clickMark2'); p.click(); p.hold(0.75);
  await p.play();
}
// 4. Remove Job hunting.
{
  const p = planner();
  p.mark('toJob'); p.to(center(rects.job), { width: 10 });
  p.hold(0.9); p.mark('clickJob'); p.click(); p.hold(0.6);
  await p.play();
}
{
  rects.panel3 = await rect('[role="dialog"]');
  const remove = await box(page.getByRole('button', { name: 'Remove' }));
  rects.remove = remove;
  const p = planner();
  p.to({ x: remove.x + remove.w * 0.5, y: remove.y + remove.h * 0.55 }, { width: remove.h });
  p.hold(0.22); p.mark('clickRemove'); p.click(); p.hold(1.0);
  await p.play();
}
// 5. Hover the custom day, then step back.
{
  const p = planner();
  p.mark('toSingleHover'); p.to(center(rects.single), { width: 10 });
  p.hold(1.5); p.mark('leave');
  p.to({ x: rects.box.x + rects.box.w * 0.72, y: rects.box.y + rects.box.h * 0.8 }, { width: 60, overshoot: false });
  p.hold(2.0); p.mark('end');
  await p.play();
}

capturing = false;
await capP;
const after = await page.evaluate(() => ({ h2: document.querySelector('h2').innerText, away: [...document.querySelectorAll('.ta-day[data-away]')].length }));
fs.writeFileSync(path.join(OUT, 'take.json'), JSON.stringify(cap));
console.log('frames', cap.frames.length, 'length', cap.frames.at(-1).vt.toFixed(2) + 's', 'final:', JSON.stringify(after));
console.log('marks', JSON.stringify(cap.marks));
console.log('panels', JSON.stringify({ p1: rects.panel1, p2: rects.panel2, p3: rects.panel3, single: rects.single }));
await browser.close();
