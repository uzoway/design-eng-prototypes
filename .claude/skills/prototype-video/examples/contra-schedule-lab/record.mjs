// Scheduled posts for Contra (app/contra-schedule), light: the portfolio lab loop on uzookafor.com.
// The same flow as the social take (write a post, pick tomorrow 8:30 AM, Schedule, then the
// Scheduled tab), in a 1200×900 window for a 16:9 edit. The cursor enters from off-screen and
// leaves before the end; edit.py crossfades back to the opening so the loop has no seam.
//   node .claude/skills/prototype-video/examples/contra-schedule-lab/record.mjs
//
// From the tabs to the bottom of the calendar is ~810px, too tall for one readable 16:9 view, so
// the edit eases between ~860-wide views (~2.2×). dpr 2.5; 3000×2250 frames, so slow 14.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/contra-schedule-lab/take';
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
  viewport: { width: 1200, height: 900 },
  theme: 'light',
  start: { x: 1240, y: 940 }, // off-screen bottom-right, so frame 1 has no cursor and it enters from there
  setup: async (page) => {
    await page.route('**/contra-schedule/time-away.webp', (r) => r.fulfill({ path: CLEAN_IMAGE, contentType: 'image/webp' }));
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('.cs-feed');
  },
});
const { page, rect, box, center, aim } = s;
const at = (sel, opts) => box(opts ? page.locator(sel, opts).first() : page.locator(sel).first());

// 1. The tabs and the composer at rest, no cursor. Then the cursor comes in and opens the composer.
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
    p.mark('toClock'); p.to(aim(clock), { width: clock.w });
    p.hold(0.4); p.mark('clickClock'); p.click(); p.hold(0.55);
  });
}
{
  const pick = await at('.cs-pop .cs-menu-item', { hasText: 'Pick date' });
  await s.phase((p) => {
    p.mark('toPick'); p.to(aim(pick), { width: pick.h }); // right of the label, in the row's empty end
    p.hold(0.4); p.mark('pick'); p.click(); p.hold(0.75);
  });
}
// 4. 8:30 AM from the time list, then confirm. The calendar opens on tomorrow at 9:00 AM, so only
// the time changes: 8:30 lands before the queue's first post (tomorrow 9:00) and leads the list.
// (Take 3 picked today 8:30, which only works when recorded after midnight.)
{
  const trigger = await at('.cs-time-trigger');
  await s.phase((p) => {
    p.mark('toTime'); p.to(aim(trigger), { width: trigger.h });
    p.hold(0.4); p.mark('timeOpen'); p.click(); p.hold(0.5);
  });
}
{
  const option = await at('.cs-time-option', { hasText: /^8:30 AM$/ });
  await s.phase((p) => {
    p.mark('toOption'); p.to(aim(option), { width: option.h });
    p.hold(0.4); p.mark('time'); p.click(); p.hold(0.5);
  });
}
{
  const confirm = await at('.cs-cal-foot .cs-button');
  await s.phase((p) => {
    p.mark('toConfirm'); p.to(aim(confirm, 0.8, 0.9), { width: confirm.h });
    p.hold(0.4); p.mark('confirm'); p.click();
    // Post rolls into Schedule here, as the camera eases back up to the composer.
    p.hold(2.3); p.mark('chipSeen');
  });
}
// 5. Schedule: the card closes and the Scheduled count rolls 2 → 3 in the tabs above.
{
  const submit = await at('.cs-submit');
  await s.phase((p) => {
    p.mark('toSubmit'); p.to(aim(submit, 0.8, 0.9), { width: submit.h }); // under the label, so Post → Schedule stays readable
    p.hold(0.4); p.mark('submit'); p.click(); p.hold(1.3); p.mark('closed');
  });
}
// 6. The Scheduled tab: the pill glides over and the post is first in the queue.
{
  const tab = await at('[data-tab="scheduled"]');
  await s.phase((p) => {
    p.mark('toTab'); // Under "Scheduled" and left of its count, so the hand covers neither while the pill glides over.
    p.to(aim(tab, 0.42, 0.9), { width: tab.h });
    p.hold(0.4); p.mark('tab'); p.click(); p.hold(1.7); p.mark('queue');
  });
}
// 7. Leave: out past the right edge, below the tabs. Hold on the page at rest with no cursor; edit.py
// crossfades from here back to the opening frame.
{
  const tabs = await rect('.cs-tabs');
  await s.phase((p) => {
    p.hold(0.2);
    p.to({ x: 1260, y: tabs.y + tabs.h + 90 }, { width: 200, overshoot: false, dur: 0.75 }); p.mark('gone');
    p.hold(1.0); p.mark('end');
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
