// Contra scheduled posts: the schedule popover's height when its view changes, before and
// after commit 32d144c (spring → 0.24s ease-out). One take per version, composed side by side
// by edit.py. Record both in one sitting: the quick picks depend on the time of day.
//
//   VERSION=before SERVE=<before worktree>/out node .claude/skills/prototype-video/examples/contra-popover-height/record.mjs
//   VERSION=after  SERVE=<after worktree>/out  node .claude/skills/prototype-video/examples/contra-popover-height/record.mjs
//
// SERVE is a production static export (`next build`): "before" is HEAD with only 32d144c
// reverted, "after" is HEAD. Production, because dev-build stalls would muddy the timing.
// Same seed and layout in both, so the cursor moves identically and the takes line up.
import { session } from '../../engine/record.mjs';

const VERSION = process.env.VERSION;
if (!['before', 'after'].includes(VERSION) || !process.env.SERVE) throw new Error('set VERSION=before|after and SERVE=<out folder>');
const OUT = process.env.OUT || `briefs/refs/lab-masters/contra-popover-height/take-${VERSION}`;

// Only the popover and its clock and Post are in frame (CSS px, 1100×900 desktop window):
// popover 481–801 × 423–849 with the calendar, clock and Post at y 375–415.
const CLIP = { x: 430, y: 360, width: 460, height: 510 };
const SLOW = 20;
const SLOW_REPLAY = 48; // the Back moment gets a 0.25× replay: 60 / 0.25 = 240 fps needed
const OFF = { x: CLIP.x + CLIP.width + 25, y: CLIP.y + CLIP.height + 25 }; // just past the bottom-right corner

const s = await session({
  url: 'http://proto.test/contra-schedule/',
  serve: process.env.SERVE,
  out: OUT,
  slow: SLOW,
  dpr: 3,
  clip: CLIP,
  theme: 'light',
  start: OFF,
  setup: async (page) => {
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.cs-editor').click();
    await page.keyboard.type("Batching next week's posts tonight.");
    await page.locator('.cs-clock').click();
    await page.waitForSelector('.cs-pop .cs-menu-item');
    await page.mouse.move(OFF.x, OFF.y); // off the clock, so nothing is hovered in frame 1
    await page.waitForTimeout(600);
  },
});
const { page, box, aim } = s;

// 1. At rest on the quick picks, no cursor. Then in from the bottom right to Pick date & time.
{
  const pick = await box(page.locator('.cs-pop .cs-menu-item', { hasText: 'Pick date' }));
  await s.phase((p) => {
    p.mark('rest'); p.hold(1.0); p.mark('enter');
    p.to(aim(pick), { width: pick.h });
    p.hold(0.45); p.mark('pick'); p.click(); p.hold(0.85); p.mark('cal');
  });
}
// 2. Over to Back and rest on its hover.
{
  const back = await box(page.locator('[aria-label="Back to quick picks"]'));
  await s.phase((p) => { p.to(aim(back), { width: back.w }); p.hold(0.45); });
}
// 3. Back: the moment the fix is about. Dense capture for the 4× replay.
await s.setSlow(SLOW_REPLAY);
await s.phase((p) => { p.mark('back'); p.click(); p.hold(0.9); p.mark('settled'); });
await s.setSlow(SLOW);
// 4. Out the way it came in, and the popover rests as it started.
await s.phase((p) => {
  p.to(OFF, { width: 60, overshoot: false });
  p.mark('gone'); p.hold(0.7); p.mark('end');
});

const after = await page.evaluate(() => ({
  view: document.querySelector('.cs-pop .cs-menu') ? 'quick picks' : 'calendar',
  height: Math.round(document.querySelector('.cs-pop').getBoundingClientRect().height),
  resize: document.querySelector('.cs-pop-body')?.style.height,
}));
console.log(VERSION, 'after', JSON.stringify(after));
await s.finish();
