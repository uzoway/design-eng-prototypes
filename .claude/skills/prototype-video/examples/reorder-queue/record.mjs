// Reorder queue (app/reorder-queue), light. For Contra, 23 Nov 2026.
// One locked shot of the queue card. APT. is dragged from 3rd to 1st, the cursor leaves, then the
// same track goes back down to 3rd with the keyboard only (focus ring, ArrowDown twice), and the
// ring clears. The last frame is the first frame, so it loops.
//   node .claude/skills/prototype-video/examples/reorder-queue/record.mjs
//
// The card is 452×566 at x 324, y 167. A 540-wide view (2.0×) holds all of it in 4:5 with room
// below it for the "Keyboard only" pill, which would otherwise sit on the last row.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/reorder-queue/take1';
export const SHOT = { x: 280, y: 139, w: 540, h: 675 };

const s = await session({
  url: process.env.URL || 'http://localhost:3000/reorder-queue/',
  out: OUT,
  slow: 13, // 1632×2032 frames: slow 10 gave 85fps
  dpr: 3,
  clip: { x: SHOT.x - 4, y: SHOT.y - 4, width: SHOT.w + 8, height: SHOT.h + 8 }, // a little past the shot: clip edges round // only the shot, so capture keeps up
  theme: 'light',
  start: { x: SHOT.x + SHOT.w + 40, y: SHOT.y + SHOT.h + 40 },
  setup: async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200); },
});
const { page, box, aim, offstage } = s;
const grip = (t) => box(page.locator(`[aria-label^="Move ${t}"]`).first());

// 1. Rest, then the cursor comes in to APT.'s handle, rests on its hover, and drags it to the top.
{
  const from = await grip('APT.'), to = await grip('Die With');
  const a = aim(from, 0.62, 0.62);
  await s.phase((p) => {
    p.hold(1.2); p.mark('enter');
    p.to(a, { width: from.h }); p.hold(0.45); p.mark('grab'); p.down(); p.hold(0.12);
    p.drag({ x: a.x, y: a.y + (to.y - from.y) }, 1.25); p.hold(0.1); p.up(); p.mark('dropped'); p.hold(1.0);
    p.to(offstage(SHOT, 40, 'right'), { width: 200, overshoot: false, dur: 0.7 }); p.mark('gone'); p.hold(0.5);
  });
}
// 2. Keyboard only: the focus ring lands on APT. (as a Tab would), then ArrowDown twice takes it back to 3rd.
await s.phase((p) => {
  p.mark('kbd');
  p.call((page) => page.evaluate(() => document.querySelector('[aria-label^="Move APT."]').focus({ focusVisible: true })));
  p.hold(0.9); p.mark('down1'); p.press('ArrowDown'); p.hold(0.85); p.mark('down2'); p.press('ArrowDown'); p.hold(1.0);
  p.mark('blur'); p.call((page) => page.evaluate(() => document.activeElement.blur())); p.hold(1.3); p.mark('end');
});

const after = await page.evaluate(() => [...document.querySelectorAll('[aria-label^="Move "]')].map((e) => e.getAttribute('aria-label').split(' by')[0].slice(5)));
console.log('after', JSON.stringify(after));
await s.finish();
