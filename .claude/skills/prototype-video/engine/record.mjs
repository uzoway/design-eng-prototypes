// Prototype video recorder: slow-motion capture of a real page, driven by a
// human-like cursor. Frames are tagged with real-speed ("virtual") time so
// edit.py can rebuild smooth 60fps at any playback speed.
//
// Usage from a take script (see examples/):
//
//   import { session } from '<skill>/engine/record.mjs';
//   const s = await session({ url, out: 'takes/bell', slow: 25 });
//   await s.phase((p) => { p.hold(0.4); p.to(s.center(r)); p.click(); p.hold(1); });
//   await s.finish();
//
// Needs Google Chrome and `engine/setup.sh` (installs playwright-core into
// ~/.cache/prototype-video so the project's package.json stays untouched).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const CACHE = path.join(os.homedir(), '.cache', 'prototype-video');
let chromium;
try { ({ chromium } = createRequire(path.join(CACHE, 'package.json'))('playwright-core')); }
catch { ({ chromium } = createRequire(import.meta.url)('playwright-core')); }

const GA = /googletagmanager|google-analytics|_vercel\/insights|vitals\.vercel/;

export async function session({
  url,
  out,
  slow = 10, // page runs 1/slow as fast while recording; s.setSlow() changes it between phases
  dpr = 3, // raise for close-ups: output px per CSS px must never exceed it
  clip = null, // {x, y, width, height} in CSS px: capture only this region (faster, allows a high dpr)
  viewport = { width: 1100, height: 900 },
  theme = 'light', // 'light' | 'dark'
  themeStorage = { 'merchant-theme': null }, // localStorage keys the site reads for its theme; null = use `theme`
  format = 'png', // 'png' (lossless, default) | 'jpeg'
  start = { x: 0.6, y: 0.6 }, // where the cursor rests at frame 0, as a fraction of the viewport, or {x, y} in px
  seed = 11,
  setup = async () => {}, // runs after load, before recording (click a 2x toggle, wait for fonts, etc.)
} = {}) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'frames'), { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, colorScheme: theme });
  await ctx.route(GA, (r) => r.abort());
  await ctx.addInitScript(
    ({ theme, themeStorage }) => {
      try { for (const [k, v] of Object.entries(themeStorage)) localStorage.setItem(k, v ?? theme); } catch {}

      // Time warp: JS clocks, timers and rAF slow down once __setSlow runs.
      // CSS and WAAPI animations are slowed separately through CDP.
      const rn = performance.now.bind(performance), rdn = Date.now;
      const rST = window.setTimeout.bind(window), rSI = window.setInterval.bind(window);
      const rRAF = window.requestAnimationFrame.bind(window);
      let S = 1, baseR = rn(), baseV = baseR, baseDR = rdn(), baseDV = baseDR;
      const v = () => baseV + (rn() - baseR) / S;
      window.__setSlow = (s) => { const nv = v(), nd = Date.now(); baseR = rn(); baseV = nv; baseDR = rdn(); baseDV = nd; S = s; };
      performance.now = v;
      Date.now = () => baseDV + (rdn() - baseDR) / S;
      window.setTimeout = (fn, d = 0, ...a) => rST(fn, (Number(d) || 0) * S, ...a);
      window.setInterval = (fn, d = 0, ...a) => rSI(fn, (Number(d) || 0) * S, ...a);
      window.requestAnimationFrame = (cb) => rRAF(() => cb(v()));

      // The caret blinks on the browser's own clock, which nothing above can slow,
      // so it's hidden here and edit.py draws it at the real rate.
      const hide = () => { const s = document.createElement('style'); s.textContent = '*{caret-color:transparent!important}'; document.head.appendChild(s); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hide); else hide();

      const canvas = document.createElement('canvas').getContext('2d');
      window.__probe = (x, y) => {
        const el = document.elementFromPoint(x, y);
        const c = el ? getComputedStyle(el).cursor : 'auto';
        const kind = c === 'pointer' ? 'hand' : c === 'text' ? 'ibeam' : 'arrow';
        let caret = null;
        const a = document.activeElement;
        if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.selectionStart === a.selectionEnd && !a.readOnly) {
          const st = getComputedStyle(a), r = a.getBoundingClientRect();
          canvas.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
          const w = canvas.measureText(a.value.slice(0, a.selectionStart)).width;
          const h = Math.round(parseFloat(st.fontSize) * 1.2); // matches Chrome's caret on macOS
          caret = {
            x: r.left + parseFloat(st.borderLeftWidth) + parseFloat(st.paddingLeft) + w - a.scrollLeft,
            y: r.top + r.height / 2 - h / 2, h, color: st.color,
          };
        }
        return { kind, caret };
      };
    },
    { theme, themeStorage },
  );

  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await setup(page);

  // ---- helpers for take scripts ----
  const rect = (sel) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const box = async (loc) => { const b = await loc.boundingBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const center = (r, fx = 0.5, fy = 0.5) => ({ x: r.x + r.w * fx, y: r.y + r.h * fy });

  // ---- human-like motion ----
  const minJerk = (t) => t * t * t * (10 + t * (-15 + 6 * t));
  let rs = seed;
  const rand = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  function reach(from, to, { width = 12, curve = 0.07, overshoot = true, dur } = {}) {
    const dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy);
    const T = dur ?? 0.2 + 0.11 * Math.log2(dist / width + 1); // Fitts
    const ux = dx / (dist || 1), uy = dy / (dist || 1);
    const os = overshoot && dist > 60 ? Math.min(5, 1.5 + dist * 0.008) : 0;
    const aim = { x: to.x + ux * os + (rand() - 0.5) * 1.2, y: to.y + uy * os + (rand() - 0.5) * 1.2 };
    const side = dx >= 0 ? 1 : -1; // the wrist bows the path a little
    const ctrl = { x: (from.x + aim.x) / 2 - uy * dist * curve * side, y: (from.y + aim.y) / 2 + ux * dist * curve * side };
    const segs = [{ T, at: (t) => { const s = minJerk(t), a = 1 - s; return { x: a * a * from.x + 2 * a * s * ctrl.x + s * s * aim.x, y: a * a * from.y + 2 * a * s * ctrl.y + s * s * aim.y }; } }];
    if (os) { const cT = 0.13 + rand() * 0.04; segs.push({ T: cT, at: (t) => { const s = minJerk(t); return { x: aim.x + (to.x - aim.x) * s, y: aim.y + (to.y - aim.y) * s }; } }); }
    return segs;
  }

  // ---- capture ----
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Animation.enable');
  const take = { frames: [], pos: [], keys: [], marks: {}, slowRanges: [], dpr, viewport, clip, theme, url };
  let capturing = false, frameNo = 0;
  // Real-speed seconds since recording began, continuous across setSlow().
  let S = slow, realBase = 0, vBase = 0;
  const vt = () => vBase + (performance.now() - realBase) / 1000 / S;
  async function captureLoop() {
    while (capturing) {
      const a = vt();
      const data = await page.screenshot({ type: format, ...(format === 'jpeg' ? { quality: 95 } : {}), caret: 'initial', ...(clip ? { clip } : {}) });
      const b = vt();
      const name = String(frameNo++).padStart(5, '0') + '.' + (format === 'jpeg' ? 'jpg' : 'png');
      fs.writeFileSync(path.join(out, 'frames', name), data);
      take.frames.push({ name, vt: +((a + b) / 2).toFixed(4) });
    }
  }

  let pos = start.x <= 1 ? { x: viewport.width * start.x, y: viewport.height * start.y } : { ...start };
  let pressed = false, kind = 'arrow', loop;
  await page.mouse.move(pos.x, pos.y);

  async function applySlow(next) {
    await page.evaluate((s) => window.__setSlow(s), next);
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / next });
  }
  async function begin() {
    await applySlow(S);
    realBase = performance.now();
    take.slowRanges.push({ from: 0, slow: S });
    capturing = true;
    loop = captureLoop();
  }
  /** Change the slow-down between phases, e.g. 25 just before a payoff that gets a slow-mo replay. */
  async function setSlow(next) {
    if (!capturing) { S = next; return; }
    const v = vt();
    await applySlow(next);
    vBase = v; realBase = performance.now(); S = next;
    take.slowRanges.push({ from: +v.toFixed(4), slow: next });
  }

  async function run(steps, events) {
    if (!steps.length) return;
    const end = Math.max(...steps.map((s) => s.t0 + s.T));
    const evs = [...events].sort((a, b) => a.t - b.t);
    let ei = 0;
    while (true) {
      const now = vt();
      while (ei < evs.length && evs[ei].t <= now) {
        const e = evs[ei++];
        if (e.type === 'down') { await page.mouse.down(); pressed = true; }
        if (e.type === 'up') { await page.mouse.up(); pressed = false; }
        if (e.type === 'key') { await page.keyboard.type(e.ch); take.keys.push(+now.toFixed(4)); }
        if (e.type === 'press') { await page.keyboard.press(e.key); take.keys.push(+now.toFixed(4)); }
        if (e.type === 'call') await e.fn(page);
      }
      const s = steps.find((s) => now >= s.t0 && now < s.t0 + s.T) || steps[steps.length - 1];
      const p = s.at(Math.min(1, Math.max(0, (now - s.t0) / s.T)));
      await page.mouse.move(p.x, p.y);
      const probe = await page.evaluate(([x, y]) => window.__probe(x, y), [p.x, p.y]);
      if (!pressed) kind = probe.kind;
      take.pos.push({ vt: +now.toFixed(4), x: +p.x.toFixed(2), y: +p.y.toFixed(2), kind, pressed, caret: probe.caret });
      if (now >= end && ei >= evs.length) break;
    }
  }

  /** Plan one phase against the current DOM, then play it. Times are real-speed seconds. */
  async function phase(build) {
    if (!capturing) await begin();
    let t = vt();
    const steps = [], events = [];
    const p = {
      get now() { return t; },
      get pos() { return { ...pos }; },
      mark: (n) => { take.marks[n] = +t.toFixed(3); },
      hold: (sec) => { const q = { ...pos }; steps.push({ t0: t, T: sec, at: () => q }); t += sec; },
      to: (target, opts) => { for (const seg of reach(pos, target, opts)) { steps.push({ t0: t, T: seg.T, at: seg.at }); t += seg.T; } pos = { ...target }; },
      /** A drag or any custom path: at(u) for u in 0..1, ending at `end`. */
      path: (T, at, end) => { steps.push({ t0: t, T, at }); t += T; pos = { ...end }; },
      /** A steady drag from here to `to`, bowed slightly. */
      drag: (to, T = 1.2) => {
        const from = { ...pos }, ctrl = { x: (from.x + to.x) / 2 + 8, y: (from.y + to.y) / 2 - 10 };
        p.path(T, (u) => { const s = minJerk(u), a = 1 - s; return { x: a * a * from.x + 2 * a * s * ctrl.x + s * s * to.x, y: a * a * from.y + 2 * a * s * ctrl.y + s * s * to.y }; }, to);
      },
      down: () => events.push({ t, type: 'down' }),
      up: () => events.push({ t, type: 'up' }),
      click: () => { events.push({ t, type: 'down' }); events.push({ t: t + 0.085, type: 'up' }); },
      /** Type like a person: 75–135ms a key, a little longer after spaces and capitals. */
      type: (text) => {
        for (const ch of text) {
          p.hold(0.075 + rand() * 0.06 + (ch === ' ' ? 0.05 : 0) + (ch !== ' ' && ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? 0.035 : 0));
          events.push({ t, type: 'key', ch });
        }
      },
      press: (key) => events.push({ t, type: 'press', key }),
      /** Run page code at this moment (e.g. trigger something with no on-screen control). */
      call: (fn) => events.push({ t, type: 'call', fn }),
    };
    await build(p);
    await run(steps, events);
  }

  async function finish() {
    capturing = false;
    await loop;
    fs.writeFileSync(path.join(out, 'take.json'), JSON.stringify(take));
    const fps = take.frames.length / (take.frames.at(-1).vt || 1);
    console.log(`take: ${take.frames.length} frames over ${take.frames.at(-1).vt.toFixed(2)}s real time = ${fps.toFixed(0)} captured fps`);
    console.log('marks', JSON.stringify(take.marks));
    await browser.close();
    return take;
  }

  return { page, rect, box, center, phase, setSlow, finish, take, vt };
}
