// Records the Time away prototype in slow motion with a scripted, human-like
// macOS cursor. Frames are tagged with virtual (real-speed) time for the
// post step, which adds the camera moves and builds a 60fps video.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'take1';
const S = 10; // slow-motion factor while recording
const DPR = 3;
const VIEW = { width: 1100, height: 900 };
const REASON = process.env.REASON || 'Private repo, trust me';
const DAY_START = 20464; // Sun Jan 11 2026
const DAY_END = 20505; // Sat Feb 21 2026
const DAY_HOVER = 20485; // Sun Feb 1 2026, mid-range

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const CURSORS = {
  arrow: { src: b64('arrow.png'), w: 17, h: 23, hx: 4, hy: 4 },
  hand: { src: b64('hand.png'), w: 32, h: 32, hx: 13, hy: 8 },
  ibeam: { src: b64('ibeam.png'), w: 9, h: 18, hx: 4, hy: 9 },
};

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR, colorScheme: 'light', reducedMotion: 'no-preference' });
await ctx.route(/googletagmanager|google-analytics|_vercel\/insights/, (r) => r.abort());

await ctx.addInitScript((cursors) => {
  try { localStorage.setItem('merchant-theme', 'light'); } catch {}

  // Time warp: JS clocks, timers and rAF run 1/S as fast once __setSlow is called.
  const rn = performance.now.bind(performance);
  const rdn = Date.now;
  const rST = window.setTimeout.bind(window);
  const rSI = window.setInterval.bind(window);
  const rRAF = window.requestAnimationFrame.bind(window);
  let S = 1, baseR = rn(), baseV = baseR, baseDR = rdn(), baseDV = baseDR;
  const v = () => baseV + (rn() - baseR) / S;
  window.__setSlow = (s) => { const nv = v(); const nd = Date.now(); baseR = rn(); baseV = nv; baseDR = rdn(); baseDV = nd; S = s; };
  performance.now = v;
  Date.now = () => baseDV + (rdn() - baseDR) / S;
  window.setTimeout = (fn, d = 0, ...a) => rST(fn, (Number(d) || 0) * S, ...a);
  window.setInterval = (fn, d = 0, ...a) => rSI(fn, (Number(d) || 0) * S, ...a);
  window.requestAnimationFrame = (cb) => rRAF(() => cb(v()));

  // The cursor layer.
  const mount = () => {
    const el = document.createElement('div');
    el.id = '__cursor';
    el.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform;opacity:0';
    const img = document.createElement('img');
    img.style.cssText = 'display:block;width:100%;height:100%';
    el.appendChild(img);
    document.documentElement.appendChild(el);
    let kind = '';
    window.__cursor = (x, y, k, pressed) => {
      const c = cursors[k];
      if (k !== kind) { img.src = c.src; el.style.width = c.w + 'px'; el.style.height = c.h + 'px'; kind = k; }
      el.style.opacity = '0'; // drawn in post at exact times
      el.style.transformOrigin = `${c.hx}px ${c.hy}px`;
      el.style.transform = `translate(${x - c.hx}px, ${y - c.hy}px) scale(${pressed ? 0.88 : 1})`;
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
}, CURSORS);

const page = await ctx.newPage();
await page.goto(process.env.URL || 'https://uzookafor.com/time-away/', { waitUntil: 'networkidle' });
await page.waitForSelector(`td[data-day="${DAY_END}"]`);
await page.waitForTimeout(800);

const label = async (d) => page.$eval(`td[data-day="${d}"]`, (e) => e.getAttribute('aria-label'));
console.log('start:', await label(DAY_START), '| end:', await label(DAY_END), '| hover:', await label(DAY_HOVER));

const rect = (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const rects = {
  h2: await rect('h2'),
  box: await rect('.ta-box'),
  table: await rect('.ta-grid'),
  years: await rect('.ta-years'),
  start: await rect(`td[data-day="${DAY_START}"]`),
  end: await rect(`td[data-day="${DAY_END}"]`),
  hover: await rect(`td[data-day="${DAY_HOVER}"]`),
};

// ---- human-like motion ----
const minJerk = (t) => t * t * t * (10 + t * (-15 + 6 * t));
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** A reach: one curved, min-jerk main movement with a small overshoot, then a correction. */
function reach(from, to, { width = 12, curve = 0.07, overshoot = true, dur } = {}) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const T = dur ?? 0.2 + 0.11 * Math.log2(dist / width + 1);
  const ux = dx / (dist || 1), uy = dy / (dist || 1);
  const os = overshoot && dist > 60 ? Math.min(5, 1.5 + dist * 0.008) : 0;
  const aim = { x: to.x + ux * os + (rand() - 0.5) * 1.2, y: to.y + uy * os + (rand() - 0.5) * 1.2 };
  // Bow the path a little, like a wrist pivoting.
  const side = dx >= 0 ? 1 : -1;
  const ctrl = { x: (from.x + aim.x) / 2 - uy * dist * curve * side, y: (from.y + aim.y) / 2 + ux * dist * curve * side };
  const segs = [{
    T,
    at: (t) => { const s = minJerk(t); const a = 1 - s; return { x: a * a * from.x + 2 * a * s * ctrl.x + s * s * aim.x, y: a * a * from.y + 2 * a * s * ctrl.y + s * s * aim.y }; },
  }];
  if (os) {
    const cT = 0.13 + rand() * 0.04;
    segs.push({ T: cT, at: (t) => { const s = minJerk(t); return { x: aim.x + (to.x - aim.x) * s, y: aim.y + (to.y - aim.y) * s }; } });
  }
  return segs;
}

// ---- timeline (virtual seconds) ----
const steps = [];
let pos = { x: rects.box.x + 560, y: rects.box.y + 300 };
let t = 0;
const marks = {};
const mark = (name) => { marks[name] = +t.toFixed(3); };
const wait = (s) => { steps.push({ t0: t, T: s, at: ((p) => () => p)({ ...pos }) }); t += s; };
const moveTo = (to, opts) => { for (const seg of reach(pos, to, opts)) { steps.push({ t0: t, T: seg.T, at: seg.at }); t += seg.T; } pos = { ...to }; };
const events = [];
const at = (type, extra = {}) => events.push({ t, type, ...extra });

wait(0.35);
mark('moveToStart');
moveTo(center(rects.start), { width: 10 });
wait(0.32);
mark('down');
at('down');
wait(0.12);
// The drag: slower and steadier than a reach, ending on Feb 21.
{
  const from = { ...pos }, to = center(rects.end);
  const T = 1.25;
  const ctrl = { x: (from.x + to.x) / 2 + 8, y: (from.y + to.y) / 2 - 10 };
  steps.push({ t0: t, T, at: (u) => { const s = minJerk(u); const a = 1 - s; return { x: a * a * from.x + 2 * a * s * ctrl.x + s * s * to.x, y: a * a * from.y + 2 * a * s * ctrl.y + s * s * to.y }; } });
  t += T; pos = { ...to };
}
wait(0.35);
mark('up');
at('up');
wait(0.7);
// The panel and its buttons only exist now, so these targets resolve at run time.
mark('toChip');
steps.push({ t0: t, dynamic: 'chip' });
events.push({ t, type: 'resolve', target: 'chip' });
t += 0; // the dynamic reach inserts its own time below
const plan = { steps, events, marks };

// Resolve dynamic targets by running the timeline in two phases.
async function run(phaseSteps, phaseEvents, startT, cap) {
  const startReal = performance.now();
  const vt = () => startT + (performance.now() - startReal) / 1000 / S;
  const end = phaseSteps.length ? Math.max(...phaseSteps.map((s) => s.t0 + s.T)) : startT;
  let pressed = false, kind = 'arrow', ei = 0;
  const evs = [...phaseEvents].sort((a, b) => a.t - b.t);
  while (true) {
    const now = vt();
    while (ei < evs.length && evs[ei].t <= now) {
      const e = evs[ei++];
      if (e.type === 'down') { await page.mouse.down(); pressed = true; }
      if (e.type === 'up') { await page.mouse.up(); pressed = false; }
      if (e.type === 'click') { await page.mouse.down(); pressed = true; e.release = e.t + 0.09; evs.push({ t: e.release, type: 'up' }); evs.sort((a, b) => a.t - b.t); }
    }
    const s = phaseSteps.find((s) => now >= s.t0 && now < s.t0 + s.T) || phaseSteps[phaseSteps.length - 1];
    const p = s.at(Math.min(1, Math.max(0, (now - s.t0) / s.T)));
    await page.mouse.move(p.x, p.y);
    if (!pressed) kind = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      const c = el ? getComputedStyle(el).cursor : 'auto';
      return c === 'pointer' ? 'hand' : c === 'text' ? 'ibeam' : 'arrow';
    }, [p.x, p.y]);
    await page.evaluate(([x, y, k, pr]) => window.__cursor(x, y, k, pr), [p.x, p.y, kind, pressed]);
    cap.pos.push({ vt: +now.toFixed(4), x: +p.x.toFixed(2), y: +p.y.toFixed(2), kind, pressed });
    if (now >= end && ei >= evs.length) break;
  }
  return end;
}

// ---- capture loop ----
const cdp = await ctx.newCDPSession(page);
await cdp.send('Animation.enable');
const cap = { frames: [], pos: [], rects, marks, S, DPR, VIEW };
let capturing = true, frameNo = 0, clock0 = 0;
const capVt = () => (performance.now() - clock0) / 1000 / S;
async function captureLoop() {
  while (capturing) {
    const a = capVt();
    const data = await page.screenshot({ type: 'jpeg', quality: 95, caret: 'initial' });
    const bvt = capVt();
    const name = String(frameNo++).padStart(5, '0') + '.jpg';
    fs.writeFileSync(path.join(OUT, 'frames', name), data);
    cap.frames.push({ name, vt: +((a + bvt) / 2).toFixed(4) });
  }
}

// Place the cursor before slowing down, so frame 0 has it.
await page.mouse.move(pos.x, pos.y);
await page.evaluate(([x, y]) => window.__cursor(x, y, 'arrow', false), [rects.box.x + 560, rects.box.y + 300]);
pos = { x: rects.box.x + 560, y: rects.box.y + 300 };

await page.evaluate((s) => window.__setSlow(s), S);
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / S });
clock0 = performance.now();
const capP = captureLoop();

// Phase 1: reach, drag, release.
const phase1Steps = steps.filter((s) => !s.dynamic);
const phase1End = await run(phase1Steps, events.filter((e) => e.type !== 'resolve'), 0, cap);

// Phase 2: the panel is open; aim for the chip, then "Mark as away".
pos = center(rects.end);
const chipBtn = page.locator('.ta-chips button', { hasText: REASON });
const markBtn = page.getByRole('button', { name: 'Mark as away' });
const chipR = await chipBtn.boundingBox();
const markR = await markBtn.boundingBox();
rects.panel = await rect('[role="dialog"]');
rects.chip = { x: chipR.x, y: chipR.y, w: chipR.width, h: chipR.height };
rects.mark = { x: markR.x, y: markR.y, w: markR.width, h: markR.height };

const s2 = [], e2 = [];
t = capVt();
const push = (segs) => { for (const seg of segs) { s2.push({ t0: t, T: seg.T, at: seg.at }); t += seg.T; } };
const hold = (sec) => { const p = { ...pos }; s2.push({ t0: t, T: sec, at: () => p }); t += sec; };
mark('toChip');
const chipTarget = { x: chipR.x + chipR.width * 0.42, y: chipR.y + chipR.height * 0.55 };
push(reach(pos, chipTarget, { width: chipR.height })); pos = chipTarget;
hold(0.18); mark('clickChip'); e2.push({ t, type: 'click' }); hold(0.55);
mark('toMark');
const markTarget = { x: markR.x + markR.width * 0.55, y: markR.y + markR.height * 0.5 };
push(reach(pos, markTarget, { width: markR.height })); pos = markTarget;
hold(0.2); mark('clickMark'); e2.push({ t, type: 'click' }); hold(0.5);
// Step back off the graph so the wave is unobstructed.
mark('stepAway');
const aside = { x: rects.end.x + 150, y: rects.box.y + rects.box.h * 0.62 };
push(reach(pos, aside, { width: 40, overshoot: false })); pos = aside;
hold(0.75);
mark('toHover');
const hov = center(rects.hover);
push(reach(pos, hov, { width: 10 })); pos = hov;
hold(1.7);
mark('leave');
const out = { x: rects.box.x + rects.box.w * 0.74, y: rects.box.y + rects.box.h * 0.8 };
push(reach(pos, out, { width: 60, overshoot: false })); pos = out;
hold(2.0);
mark('end');
await run(s2, e2, capVt(), cap);

capturing = false;
await capP;
cap.rects = rects;
cap.marks = marks;
fs.writeFileSync(path.join(OUT, 'take.json'), JSON.stringify(cap));
console.log('frames', cap.frames.length, 'virtual length', cap.frames.at(-1).vt.toFixed(2) + 's', 'marks', JSON.stringify(marks));
await browser.close();
