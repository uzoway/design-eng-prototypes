// LinkedIn nav (app/linkedin-nav), dark: a notification arrives, then the cursor clicks
// Notifications. Recorded twice with the same cursor path, once with Reduce motion on,
// for a split-screen comparison. The Nov 16 LinkedIn post.
//   node .claude/skills/prototype-video/examples/linkedin-reduced-motion/record.mjs           # motion
//   REDUCE=1 node .claude/skills/prototype-video/examples/linkedin-reduced-motion/record.mjs  # reduced
import { session } from '../../engine/record.mjs';

const REDUCE = process.env.REDUCE === '1';
const OUT = process.env.OUT || `briefs/refs/lab-masters/linkedin-reduced-motion/take-${REDUCE ? 'reduced' : 'motion'}`;
// The edit opens on Messaging, Notifications and Me (250 × 135 CSS px) and pushes in to the
// bell (96 × 52, ~11×), so the capture is dpr 12 on a small clip.
const CLIP = { x: 540, y: 376, width: 260, height: 148 };

const s = await session({
  url: process.env.URL || 'http://localhost:3000/linkedin-nav/',
  out: OUT,
  slow: 12,
  dpr: 12,
  clip: CLIP,
  theme: 'dark',
  seed: 11, // same seed, same cursor path in both takes
  start: { x: 600, y: 505 }, // on the page below Messaging, in frame but clear of the bar
  setup: async (page) => {
    // Hide the demo's own controls for the take; the notification still fires from the hidden button.
    await page.addStyleTag({ content: '.ln-desktop .ln-control-group, .ln-desktop .ln-theme { visibility: hidden !important; }' });
    // The nav follows the setting live, so switching it here swaps in the static icons.
    if (REDUCE) await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(400);
  },
});
const { page, box, center } = s;

const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
const label = await box(page.locator('.ln-desktop button[aria-label^="Notifications"] .ln-label').first());

// 1. The bar at rest, so both halves read as LinkedIn; the edit pushes in on the bell and
//    settles before anything moves.
await s.phase((p) => { p.mark('open'); p.hold(0.8); p.mark('push'); p.hold(1.25); });

// 2. A notification arrives on its own.
await s.phase((p) => {
  p.mark('ring');
  p.call((pg) => pg.locator('.ln-desktop [data-event="notification"]').evaluate((b) => b.click()));
  p.hold(1.3);
  p.mark('ringEnd');
});

// 3. Reach for the tab, then click: the bell rings and fills (or crossfades), the badge goes.
await s.phase((p) => {
  p.mark('toBell');
  p.to(center(label, 0.56, 0.5), { width: label.h });
  p.hold(0.4);
  p.mark('click');
  p.click();
  p.hold(1.4);
  p.mark('end');
});

const after = await page.evaluate(() => document.querySelector('.ln-desktop [aria-current="page"]')?.getAttribute('aria-label'));
console.log('reduced', reduced, 'selected', after);
await s.finish();
