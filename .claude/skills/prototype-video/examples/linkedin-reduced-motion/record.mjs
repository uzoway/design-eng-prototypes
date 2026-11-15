// LinkedIn nav (app/linkedin-nav), dark: a notification arrives, then the cursor clicks
// My Network, Jobs, Messaging and Notifications. Recorded twice with the same cursor path,
// once with Reduce motion on, for a split-screen comparison. The Nov 16 LinkedIn post.
//   node .claude/skills/prototype-video/examples/linkedin-reduced-motion/record.mjs           # motion
//   REDUCE=1 node .claude/skills/prototype-video/examples/linkedin-reduced-motion/record.mjs  # reduced
import { session } from '../../engine/record.mjs';

const REDUCE = process.env.REDUCE === '1';
const OUT = process.env.OUT || `briefs/refs/lab-masters/linkedin-reduced-motion/take-${REDUCE ? 'reduced' : 'motion'}`;
// The edit holds one view of Home to Notifications (410 × 222 CSS px, ~2.6×), so dpr 3 is enough.
const CLIP = { x: 300, y: 335, width: 420, height: 230 };
const TABS = ['My Network', 'Jobs', 'Messaging', 'Notifications'];

const s = await session({
  url: process.env.URL || 'http://localhost:3000/linkedin-nav/',
  out: OUT,
  slow: 10,
  dpr: 3,
  clip: CLIP,
  theme: 'dark',
  seed: 11, // same seed, same cursor path in both takes
  start: { x: 372, y: 532 }, // on the page below Home, in frame but clear of the bar
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

// 1. The bar at rest, so both halves read as LinkedIn.
await s.phase((p) => { p.mark('open'); p.hold(0.7); });

// 2. A notification arrives on its own.
await s.phase((p) => {
  p.mark('ring');
  p.call((pg) => pg.locator('.ln-desktop [data-event="notification"]').evaluate((b) => b.click()));
  p.hold(1.0);
  p.mark('ringEnd');
});

// 3. Click across the tabs, on their labels so the hand never covers an icon mid-animation.
for (const [i, name] of TABS.entries()) {
  const label = await box(page.locator(`.ln-desktop button[aria-label^="${name}"] .ln-label`).first());
  const last = i === TABS.length - 1;
  await s.phase((p) => {
    p.to(center(label, 0.5, 0.55), { width: label.h });
    p.hold(0.22 + (i % 2) * 0.06); // a person's dwell, not a metronome
    p.mark(`click${i}`);
    p.click();
    p.hold(last ? 1.3 : 0.75);
  });
}
await s.phase((p) => p.mark('end'));

const after = await page.evaluate(() => document.querySelector('.ln-desktop [aria-current="page"]')?.getAttribute('aria-label'));
console.log('reduced', reduced, 'selected', after);
await s.finish();
