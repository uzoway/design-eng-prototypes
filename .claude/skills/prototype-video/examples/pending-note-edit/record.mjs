// LinkedIn pending-note concept (app/pending-note), light, desktop, ~10s for a GIF (2026-11-27).
// Camera locked on Maya's invite, the one component:
//   1. at rest: the note collapsed with "…show more", no cursor (the poster frame);
//   2. the cursor comes in from the bottom-right, rests on "show more", clicks: the note opens
//      and "desgin" is in sight;
//   3. a beat to spot the typo, the hand off to the side;
//   4. Edit; a click just after "desgin" with the I-beam, four ⌫ and "sign";
//   5. Save: "design" lights up and "Edited" appears; the cursor leaves bottom-right.
//   node .claude/skills/prototype-video/examples/pending-note-edit/record.mjs
//
// The note editor is a textarea several lines tall. The engine's caret probe measures inputs as one
// line, so setup() wraps it: for the note it reads the caret's place from the page's own mirror
// (the <p> under the textarea that sizes the box with the same text and wrapping).
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/pending-note/take';

const s = await session({
  url: process.env.URL || 'http://localhost:3000/pending-note/',
  out: OUT,
  slow: 12,
  dpr: 3, // the GIF shows ~658 CSS px across 1280 px (1.95×); downscaling from 3× keeps 12px text crisp
  viewport: { width: 1128, height: 900 }, // the card is 632 wide at any window from 960 to 1199
  clip: { x: 56, y: 120, width: 688, height: 480 }, // the card and its neighbours; the edit crops inside
  theme: 'light',
  start: { x: 800, y: 640 }, // off the shot, bottom-right
  setup: async (page) => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const probe = window.__probe;
      window.__probe = (x, y) => {
        const out = probe(x, y);
        const a = document.activeElement;
        if (!a || !a.matches('[data-pn-note-input]') || a.selectionStart !== a.selectionEnd) return out;
        const mirror = a.parentElement.querySelector('[data-pn-note-mirror]');
        const node = mirror && mirror.firstChild;
        if (!node) return out;
        const st = getComputedStyle(a);
        const h = Math.round(parseFloat(st.fontSize) * 1.2);
        const range = document.createRange();
        const i = a.selectionStart;
        // The glyph before the caret gives its line; at the start of a line use the one after it.
        if (i > 0) { range.setStart(node, i - 1); range.setEnd(node, i); } else { range.setStart(node, 0); range.setEnd(node, 1); }
        const rs = [...range.getClientRects()];
        const r = rs[rs.length - 1];
        if (!r) return out;
        const x0 = i > 0 ? r.right : r.left;
        return { ...out, caret: { x: x0, y: r.top + r.height / 2 - h / 2, h, color: st.color } };
      };
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  },
});
const { page, box } = s;
const row = page.locator('[data-invite="maya-okonkwo"]');

const minJerk = (t) => t * t * t * (10 - 15 * t + 6 * t * t);
// A smooth gesture through waypoints (Catmull-Rom, minimum-jerk along its length), from sideshift.
function route(p, pts, T) {
  const P = [p.pos, ...pts];
  const seg = (i, u) => {
    const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
    const u2 = u * u, u3 = u2 * u;
    const f = (k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u3);
    return { x: f('x'), y: f('y') };
  };
  const samples = [];
  for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 40; k++) samples.push(seg(i, k / 40));
  samples.push(P[P.length - 1]);
  const len = [0];
  for (let i = 1; i < samples.length; i++) len.push(len[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
  const L = len[len.length - 1];
  p.path(T, (u) => {
    const target = minJerk(u) * L;
    let i = 1; while (i < len.length - 1 && len[i] < target) i++;
    const k = (target - len[i - 1]) / (len[i] - len[i - 1] || 1);
    return { x: samples[i - 1].x + (samples[i].x - samples[i - 1].x) * k, y: samples[i - 1].y + (samples[i].y - samples[i - 1].y) * k };
  }, P[P.length - 1]);
}

// 1–2. In from the bottom-right, outside the card's right edge until level with Theo's row
// (so Theo's Withdraw never lights up), onto "show more".
const more = await box(row.locator('[data-pn-more]'));
// Where Edit sits once the note is open, measured before capture starts (open, measure, close,
// settle): the hand drifts to it straight after the click, before the page could tell us.
await row.locator('[data-pn-more]').evaluate((b) => b.click());
await page.waitForTimeout(1500);
const edit = await box(row.getByRole('button', { name: /^Edit note/ }));
await row.getByRole('button', { name: /^Show less/ }).evaluate((b) => b.click());
await page.waitForTimeout(1500);
await page.evaluate(() => document.activeElement?.blur());
await s.phase((p) => {
  p.hold(1.0); p.mark('enter');
  route(p, [{ x: 742, y: 420 }, s.aim(more, 0.8, 0.95)], 0.75);
  p.hold(0.4); p.mark('more'); p.click();
  p.hold(0.12);
  // 3. A beat to read: the hand drifts off the words that just opened up, to just under Edit.
  p.to({ x: edit.x + edit.w * 0.4, y: edit.y + edit.h + 15 }, { width: 30, dur: 0.4, overshoot: false });
  p.hold(0.5); p.mark('read');
  p.to(s.aim(edit), { width: edit.h });
  p.hold(0.3); p.mark('edit'); p.click();
  p.hold(0.4); p.mark('editing');
});

// 4. Click just after "desgin", then fix it. macOS hides the pointer once typing starts (the edit
// cuts it from 'typing' until the hand moves again).
const at = await row.locator('[data-pn-note-input]').evaluate((a) => {
  const node = a.parentElement.querySelector('[data-pn-note-mirror]').firstChild;
  const i = a.value.indexOf('desgin') + 6;
  const range = document.createRange();
  range.setStart(node, i - 1); range.setEnd(node, i);
  const r = range.getBoundingClientRect();
  return { x: r.right + 1.5, y: r.top + r.height / 2, i };
});
await s.phase((p) => {
  p.to({ x: at.x, y: at.y }, { width: 8 });
  p.hold(0.22); p.mark('caret'); p.click();
  p.hold(0.28); p.mark('typing');
  for (let k = 0; k < 4; k++) { p.press('Backspace'); p.hold(0.1 + 0.02 * ((k * 7) % 3)); }
  p.hold(0.1);
  p.type('sign');
  p.hold(0.26); p.mark('typed');
});
const caret = await row.locator('[data-pn-note-input]').evaluate((a) => ({ at: a.selectionStart, word: a.value.slice(a.selectionStart - 6, a.selectionStart) }));

// 5. Save, the highlight, and out bottom-right.
const save = await box(row.getByRole('button', { name: /^Save/ }));
await s.phase((p) => {
  p.to(s.aim(save), { width: save.h });
  p.hold(0.28); p.mark('save'); p.click();
  p.hold(1.1); p.mark('leave');
  route(p, [{ x: 742, y: save.y + 60 }, { x: 800, y: 600 }], 0.55); p.mark('gone');
  p.hold(0.9); p.mark('end');
});

const after = await row.evaluate((r) => ({
  note: r.querySelector('[data-pn-note-text]:not([data-pn-note-probe])')?.textContent,
  edited: !!r.querySelector('[data-pn-edited]'),
}));
console.log('typed at', at.i, '→', JSON.stringify(caret));
console.log('after', JSON.stringify(after));
await s.finish();
