// LinkedIn nav (app/linkedin-nav), light: a notification arrives and the bell swings
// with its badge, then the cursor clicks the bell. The Nov 13 LinkedIn post.
//   node .claude/skills/prototype-video/examples/linkedin-bell/record.mjs
// Captured at 1× page zoom with dpr 12 and a clip around the bell, so the close-up on the
// bell (a 94px-wide view, ~11.5×) is never upscaled.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/linkedin-bell/take';
// Everything the edit frames on lies inside this box (CSS px at 1×, 1100×900 viewport):
// the wide open on Messaging, Notifications and Me, and the close-up on the bell.
const CLIP = { x: 540, y: 280, width: 260, height: 324 };
// A 12MP frame takes longer to capture, so the page runs slower to keep ≥100 captured fps.
const SLOW = 16;
const SLOW_REPLAY = 48; // the swing gets a 0.25× replay: 60 / 0.25 = 240 fps needed

const s = await session({
  url: process.env.URL || 'http://localhost:3000/linkedin-nav/',
  out: OUT,
  slow: SLOW,
  dpr: 12,
  clip: CLIP,
  theme: 'light',
  start: { x: 588, y: 548 }, // resting on the page below Messaging, clear of the bell
  setup: async (page) => {
    // The demo's own controls sit just under the bar. Hide them for this take only, so the
    // frame reads as LinkedIn; the notification still fires from the hidden button.
    await page.addStyleTag({ content: '.ln-desktop .ln-control-group, .ln-desktop .ln-theme { visibility: hidden !important; }' });
    await page.waitForTimeout(300);
  },
});
const { page, box, center } = s;


// 1. The bar at rest, wide enough to read as LinkedIn; the camera pushes in on the bell
//    (edit.py) and settles before anything moves.
await s.phase((p) => { p.mark('open'); p.hold(0.6); p.mark('push'); p.hold(1.25); });

// 2. A notification arrives on its own. Dense capture so it can be replayed at 0.25×.
await s.setSlow(SLOW_REPLAY);
await s.phase((p) => {
  p.mark('ring');
  p.call((pg) => pg.locator('.ln-desktop [data-event="notification"]').evaluate((b) => b.click()));
  p.hold(1.15); // the swing ends at ~0.65s and the badge has landed by ~0.45s
  p.mark('ringEnd');
});
await s.setSlow(SLOW);

// 3. Reach for the tab, let the hover hint play, then click: full ring, fill, badge goes in.
//    It clicks the label, not the bell: at ~11.5× the hand would otherwise cover the ring.
const label = await box(page.locator('.ln-desktop button[aria-label^="Notifications"] .ln-label').first());
await s.phase((p) => {
  p.mark('toBell');
  p.to(center(label, 0.56, 0.5), { width: label.h });
  p.hold(0.4);
  p.mark('click');
  p.click();
  p.hold(1.0); // full ring (~0.65s), the fill and the badge tucking back in
  p.mark('end');
});

const after = await page.evaluate(() => ({
  current: document.querySelector('.ln-desktop [aria-current="page"]')?.getAttribute('aria-label'),
}));
console.log('after', JSON.stringify(after));
await s.finish();
