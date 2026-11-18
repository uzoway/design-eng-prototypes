// Photo pager (app/photo-pager), dark by design. For Contra, 24 Nov 2026.
// A finger swipes 1 → 2 → 3, peeks a little at 3 and lets it spring back, swipes back to 1, then
// pulls past the first photo to show the rubber band. Ends on photo 1 at rest, so it loops.
//   node .claude/skills/prototype-video/examples/photo-pager/record.mjs
//
// The page centres a fixed 340×480 photo with the "1 of 8" pager 40px under it. A 540-wide touch
// viewport (wider than a phone, which nobody can tell on black) lets a 4:5 shot hold both at 2.16×.
// The release spring steps a fixed 16ms per rAF, so rafHz: 60 keeps it at real speed. No slow-mo
// replay for the same reason: the spring only has 60 steps a second to show.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/photo-pager/take1';
const SHOT = { x: 20, y: 137.5, w: 500, h: 625 };

const s = await session({
  url: process.env.URL || 'http://localhost:3000/photo-pager/',
  out: OUT,
  pointer: 'touch',
  viewport: { width: 540, height: 900 },
  dpr: 3,
  rafHz: 60,
  theme: 'dark', // the page is black either way; this gives the touch dot its light-on-dark style
  clip: { x: SHOT.x - 4, y: SHOT.y - 4, width: SHOT.w + 8, height: SHOT.h + 8 },
  start: { x: SHOT.x + SHOT.w + 60, y: SHOT.y + SHOT.h + 60 },
  setup: async (page) => {
    await page.evaluate(() => Promise.all([...document.querySelectorAll('[aria-label^="Photo "] div')].map((d) => {
      const u = getComputedStyle(d).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
      return u ? new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }) : null;
    })));
    await page.waitForTimeout(800);
  },
});
const { page, box, offstage } = s;
const photo = await box(page.locator('[aria-label="Photo gallery"] [aria-label="Photo 1 of 8"]').locator('..').locator('..'));
console.log('photo', JSON.stringify(photo));
const y = photo.y + photo.h * 0.52;
const X = (f) => photo.x + photo.w * f;

await s.phase((p) => {
  p.hold(1.1); p.mark('enter');
  // 1 → 2 → 3
  p.to({ x: X(0.78), y }, { width: 80 }); p.hold(0.22); p.mark('swipe1'); p.swipe({ x: X(0.2), y }); p.hold(0.75);
  p.to({ x: X(0.8), y: y + 6 }, { width: 80 }); p.hold(0.2); p.mark('swipe2'); p.swipe({ x: X(0.22), y: y + 4 }); p.hold(0.85);
  // A peek: drag a little, let go, and it springs back (under the 25% commit line, slow enough not to flick).
  p.to({ x: X(0.3), y }, { width: 80 }); p.hold(0.2); p.mark('peek');
  p.down(); p.hold(0.1); p.drag({ x: X(0.3) + 62, y: y - 3 }, 0.85); p.hold(0.25); p.up(); p.hold(0.85);
  // 3 → 2 → 1
  p.to({ x: X(0.22), y }, { width: 80 }); p.hold(0.2); p.mark('back1'); p.swipe({ x: X(0.8), y }); p.hold(0.7);
  p.to({ x: X(0.2), y: y + 5 }, { width: 80 }); p.hold(0.2); p.mark('back2'); p.swipe({ x: X(0.78), y: y + 3 }); p.hold(0.8);
  // Past the first photo: the rubber band, then it settles.
  p.to({ x: X(0.25), y }, { width: 80 }); p.hold(0.2); p.mark('band');
  p.down(); p.hold(0.1); p.drag({ x: X(0.25) + 190, y: y + 4 }, 0.9); p.hold(0.3); p.up(); p.mark('release'); p.hold(0.9);
  p.to(offstage(SHOT, 60), { overshoot: false, dur: 0.7 }); p.mark('gone'); p.hold(0.9); p.mark('end');
});

const after = await page.evaluate(() => document.querySelector('[aria-live="polite"]')?.textContent);
console.log('after', after);
await s.finish();
