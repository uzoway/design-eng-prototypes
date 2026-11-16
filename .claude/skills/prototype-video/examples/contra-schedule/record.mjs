// Scheduled posts for Contra (app/contra-schedule), light. The brief's demo flow:
// open the composer, write a post, schedule it for tomorrow morning, send it, then View.
//   node .claude/skills/prototype-video/examples/contra-schedule/record.mjs
//
// A 600×750 window: Contra's tablet layout keeps the clock beside Schedule, and the
// whole 4:5 frame at 1080 wide is 1.8×, so 14px text reads at 25px on a phone.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/contra-schedule/take2';
const TEXT = "Batching next week's posts tonight.";
// The Time away post's real cover has a hand cursor and a tooltip baked in, right where the
// toast lands. For the video only, serve a copy with both painted out (the live page keeps the
// original). If it's missing, rebuild it with clean-image.py in this folder.
const CLEAN_IMAGE = 'briefs/refs/lab-masters/contra-schedule/time-away-clean.webp';

const s = await session({
  url: process.env.URL || 'http://localhost:3000/contra-schedule/',
  out: OUT,
  slow: 10,
  dpr: 3,
  viewport: { width: 600, height: 750 },
  theme: 'light',
  start: { x: 0.72, y: 0.62 },
  setup: async (page) => {
    await page.route('**/contra-schedule/time-away.webp', (r) => r.fulfill({ path: CLEAN_IMAGE, contentType: 'image/webp' }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('.cs-feed');
  },
});
const { page, rect, box, center } = s;

// 1. The closed composer, then into it.
{
  const editor = await rect('.cs-editor');
  await s.phase((p) => {
    p.hold(0.9); p.mark('toEditor');
    // Right of where the typed line ends, so the I-beam never sits on the words.
    p.to(center(editor, 0.8, 0.5), { width: editor.h });
    p.hold(0.3); p.mark('open'); p.click(); p.hold(0.75);
  });
}
// 2. Write the post.
await s.phase((p) => { p.mark('typeStart'); p.type(TEXT); p.mark('typeEnd'); p.hold(0.45); });

// 3. The clock, then Tomorrow morning.
{
  const clock = await box(page.locator('.cs-clock'));
  await s.phase((p) => {
    p.mark('toClock'); p.to(center(clock), { width: clock.w });
    p.hold(0.3); p.mark('clickClock'); p.click(); p.hold(0.55);
  });
}
{
  const pick = await box(page.locator('.cs-pop .cs-menu-item', { hasText: 'Tomorrow morning' }));
  await s.phase((p) => {
    p.mark('toPick'); p.to(center(pick, 0.3, 0.5), { width: pick.h });
    p.hold(0.4); p.mark('pick'); p.click();
    // The chip arrives and Post rolls into Schedule. Hold on it.
    p.hold(1.7); p.mark('scheduled');
  });
}
// 4. Schedule: the card closes, the count rolls 2 → 3, the toast comes up.
{
  const submit = await box(page.locator('.cs-submit'));
  await s.phase((p) => {
    p.mark('toSubmit'); p.to(center(submit), { width: submit.h });
    p.hold(0.3); p.mark('submit'); p.click(); p.hold(1.3); p.mark('toastIn');
  });
}
// 5. View: the pill glides to Scheduled and the new post is first in the queue.
// (Measured here: the toast is gone once View is clicked, and phase 6 drifts from its spot.)
const view = await box(page.locator('.cs-toast-action'));
await s.phase((p) => {
  p.mark('toView'); p.to(center(view), { width: view.h });
  p.hold(0.35); p.mark('view'); p.click(); p.hold(1.4); p.mark('queue');
});
// 6. A short drift off the toast's old spot, clear of every control, and let the queue sit.
{
  await s.phase((p) => {
    p.to({ x: view.x + view.w / 2 + 110, y: view.y - 30 }, { width: 60, overshoot: false });
    p.hold(1.6); p.mark('end');
  });
}

const after = await page.evaluate(() => ({
  tab: document.querySelector('[aria-current="page"]')?.dataset.tab,
  count: document.querySelector('.cs-tab-count')?.textContent,
  first: document.querySelector('[data-queued] .cs-post-text')?.textContent,
  when: document.querySelector('[data-queued] .cs-chip-main')?.textContent,
  composer: document.querySelector('.cs-composer')?.dataset.open,
}));
console.log('after', JSON.stringify(after));
await s.finish();
