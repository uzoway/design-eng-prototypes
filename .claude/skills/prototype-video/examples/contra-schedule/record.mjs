// Scheduled posts for Contra (app/contra-schedule), light, at Contra's desktop layout.
// The whole window first, then in close: write a post, pick today 8:30 AM in the calendar,
// Schedule, then the Scheduled tab.
//   node .claude/skills/prototype-video/examples/contra-schedule/record.mjs
//
// A 1000×1250 window is 4:5, so frame 1 is the whole page. It's still ≥62rem, so it's
// Contra's desktop column (680px). Close-ups are 460–510 wide (2.1–2.35×), so dpr 2.5.
// Frames are 2500×3125, so slow 14 keeps capture above ~120fps.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/contra-schedule/take3';
const TEXT = "Batching next week's posts tonight.";
// The Time away post's real cover has a hand cursor and a tooltip baked in, right where the
// toast lands. For the video only, serve a copy with both painted out (the live page keeps the
// original). If it's missing, rebuild it with clean-image.py in this folder.
const CLEAN_IMAGE = 'briefs/refs/lab-masters/contra-schedule/time-away-clean.webp';

const s = await session({
  url: process.env.URL || 'http://localhost:3000/contra-schedule/',
  out: OUT,
  slow: 14,
  dpr: 2.5,
  viewport: { width: 1000, height: 1250 },
  theme: 'light',
  start: { x: 0.74, y: 0.6 },
  setup: async (page) => {
    await page.route('**/contra-schedule/time-away.webp', (r) => r.fulfill({ path: CLEAN_IMAGE, contentType: 'image/webp' }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('.cs-feed');
  },
});
const { page, rect, box, center } = s;
const at = (sel, opts) => box(opts ? page.locator(sel, opts).first() : page.locator(sel).first());

// 1. The whole window, still. Then into the composer while the camera pushes in.
{
  const editor = await rect('.cs-editor');
  await s.phase((p) => {
    p.hold(1.5); p.mark('toEditor');
    // Right of where the typed line will end, so the I-beam never sits on the words.
    p.to(center(editor, 0.65, 0.5), { width: editor.h });
    p.hold(0.45); p.mark('open'); p.click(); p.hold(0.7);
  });
}
// 2. Write the post.
await s.phase((p) => { p.mark('typeStart'); p.type(TEXT); p.mark('typeEnd'); p.hold(0.4); });

// 3. The clock, then Pick date & time: the menu gives way to the calendar.
{
  const clock = await at('.cs-clock');
  await s.phase((p) => {
    p.mark('toClock'); p.to(center(clock), { width: clock.w });
    p.hold(0.35); p.mark('clickClock'); p.click(); p.hold(0.55);
  });
}
{
  const pick = await at('.cs-pop .cs-menu-item', { hasText: 'Pick date' });
  await s.phase((p) => {
    p.mark('toPick'); p.to(center(pick, 0.3, 0.5), { width: pick.h });
    p.hold(0.3); p.mark('pick'); p.click(); p.hold(0.75);
  });
}
// 4. Today, then 8:30 AM from the time list, then confirm.
{
  const today = await at('.cs-cal-day[aria-label$=", today"]');
  await s.phase((p) => {
    p.mark('toDay'); p.to(center(today), { width: today.w });
    p.hold(0.3); p.mark('day'); p.click(); p.hold(0.5);
  });
}
{
  const trigger = await at('.cs-time-trigger');
  await s.phase((p) => {
    p.mark('toTime'); p.to(center(trigger, 0.4, 0.5), { width: trigger.h });
    p.hold(0.3); p.mark('timeOpen'); p.click(); p.hold(0.5);
  });
}
{
  const option = await at('.cs-time-option', { hasText: /^8:30 AM$/ });
  await s.phase((p) => {
    p.mark('toOption'); p.to(center(option, 0.4, 0.5), { width: option.h });
    p.hold(0.3); p.mark('time'); p.click(); p.hold(0.5);
  });
}
{
  const confirm = await at('.cs-cal-foot .cs-button');
  await s.phase((p) => {
    p.mark('toConfirm'); p.to(center(confirm), { width: confirm.h });
    p.hold(0.3); p.mark('confirm'); p.click();
    // Post rolls into Schedule here, then the camera drifts left to the text and the chip.
    p.hold(2.3); p.mark('chipSeen');
  });
}
// 5. Schedule: the card closes and the Scheduled count rolls 2 → 3 in the tabs above.
{
  const submit = await at('.cs-submit');
  await s.phase((p) => {
    p.mark('toSubmit'); p.to(center(submit), { width: submit.h });
    p.hold(0.35); p.mark('submit'); p.click(); p.hold(1.3); p.mark('closed');
  });
}
// 6. The Scheduled tab: the pill glides over and the post is first in the queue.
{
  const tab = await at('[data-tab="scheduled"]');
  await s.phase((p) => {
    p.mark('toTab'); p.to(center(tab), { width: tab.h });
    p.hold(0.35); p.mark('tab'); p.click(); p.hold(1.7); p.mark('queue');
  });
}
// 7. Drift off the tab, clear of every control, while the camera steps back to the window.
{
  const tabs = await rect('.cs-tabs');
  await s.phase((p) => {
    p.to({ x: tabs.x + tabs.w * 0.78, y: tabs.y + tabs.h * 0.55 }, { width: 60, overshoot: false });
    p.hold(1.5); p.mark('end');
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
