// LinkedIn pending-note concept (app/pending-note), light, desktop, ~12s for a looping GIF (2026-11-27).
// Uzo's v2 shape: open on the whole LinkedIn window for a second (so it reads as LinkedIn), push in
// on Maya's invite, do the edit, fold the note back, pull out to the whole window, and loop.
//   1. the whole window at rest, no cursor (the poster frame); the edit pushes in on Maya's card;
//   2. the cursor comes in from the bottom-right, rests on "show more", clicks: "desgin" in sight;
//   3. a beat to spot the typo, the hand under Edit;
//   4. Edit; a click just after "desgin" with the I-beam, four ⌫ and "sign";
//   5. Save: "design" lights up and "Edited" appears;
//   6. "show less" folds the note back to two lines, so the row is as tall as in frame 1 and nothing
//      below it jumps when the GIF loops; the cursor leaves the window and the edit pulls out.
//   WIDTH=1440 node .claude/skills/prototype-video/examples/pending-note-edit/record.mjs
//
// WIDTH is the window. From 1200 up LinkedIn's card is 792 wide, below it 632 (the close-up reads
// 1.6× at 1440 and 1.95× at 1180 in a 1280-wide GIF). The window is 16:9 so the wide shot is all of it.
//
// The note editor is a textarea several lines tall. The engine's caret probe measures inputs as one
// line, so setup() wraps it: for the note it reads the caret's place from the page's own mirror
// (the <p> under the textarea that sizes the box with the same text and wrapping).
import { session } from '../../engine/record.mjs';

const W = Number(process.env.WIDTH || 1440);
const H = Math.round((W * 9) / 16);
const OUT = process.env.OUT || `briefs/refs/lab-masters/pending-note/take-${W}`;
const OFF = { x: W + 40, y: H + 40 }; // outside the window: the wide shots never show the cursor

const s = await session({
  url: process.env.URL || 'http://localhost:3000/pending-note/',
  out: OUT,
  slow: 20, // whole-window frames at dpr 2.5 are ~7M px; slow 20 keeps capture well above 60 fps
  dpr: 2.5, // the close-up needs ≤1.95 output px per CSS px; downscaling from 2.5 keeps 12px text crisp
  viewport: { width: W, height: H },
  theme: 'light',
  start: OFF,
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
const card = await box(row);

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

// Just right of the card, level with the top of Theo's row: the way in and out stays off the
// card until it's level with the note, so Theo's Withdraw never lights up.
const side = { x: card.x + card.w + 26, y: card.y + card.h + 35 };

const more = await box(row.locator('[data-pn-more]'));
// Where Edit sits once the note is open, measured before capture starts (open, measure, close,
// settle): the hand drifts to it straight after the click, before the page could tell us.
await row.locator('[data-pn-more]').evaluate((b) => b.click());
await page.waitForTimeout(1500);
const edit = await box(row.getByRole('button', { name: /^Edit note/ }));
await row.getByRole('button', { name: /^Show less/ }).evaluate((b) => b.click());
await page.waitForTimeout(1500);
await page.evaluate(() => document.activeElement?.blur());

// 1–3. The wide beat and the push in happen in the edit (0–2s); the hand starts its way in as the
// push lands, from outside the window, so it's never seen until it crosses into the close-up.
await s.phase((p) => {
  p.hold(1.0); p.mark('push');
  p.hold(0.85); p.mark('enter');
  route(p, [side, s.aim(more, 0.8, 0.95)], 0.95);
  p.hold(0.4); p.mark('more'); p.click();
  p.hold(0.12);
  // A beat to read: the hand drifts off the words that just opened up, to just under Edit.
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

// 5. Save and the highlight.
const save = await box(row.getByRole('button', { name: /^Save/ }));
await s.phase((p) => {
  p.to(s.aim(save), { width: save.h });
  p.hold(0.28); p.mark('save'); p.click();
  p.hold(1.1); p.mark('saved');
});

// 6. Fold it back, leave the window, and the edit pulls out.
const less = await box(row.getByRole('button', { name: /^Show less/ }));
await s.phase((p) => {
  p.to(s.aim(less, 0.8, 0.9), { width: less.h });
  p.hold(0.3); p.mark('less'); p.click();
  p.hold(0.45); p.mark('leave');
  route(p, [{ x: side.x + 20, y: less.y + 60 }, OFF], 0.6); p.mark('gone');
  p.hold(1.6); p.mark('end');
});

const after = await row.evaluate((r) => {
  const b = r.getBoundingClientRect();
  return {
    note: r.querySelector('[data-pn-note-text]:not([data-pn-note-probe])')?.textContent,
    edited: !!r.querySelector('[data-pn-edited]'),
    height: Math.round(b.height),
  };
});
console.log('card', JSON.stringify(card), 'typed at', at.i, '→', JSON.stringify(caret));
console.log('after', JSON.stringify(after), '(rest height', Math.round(card.h) + ')');
await s.finish();
