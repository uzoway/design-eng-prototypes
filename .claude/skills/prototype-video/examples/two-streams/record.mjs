// Spotify Two Streams (app/two-streams). For Contra, 28 Nov 2026.
// Sirens is already playing. Play the new episode: the podcast takes over and Sirens tucks behind
// it. Hover the handle and the held card lifts; click and Sirens is back in front, on the same second.
//   node .claude/skills/prototype-video/examples/two-streams/record.mjs
//
// The phone is 390×790 at x 355, y 32 in an 1100×900 window. The shot runs from "New episode" to
// the phone's bottom edge, 460 wide (2.35×). Playback progress comes from <audio>, which the engine
// slows with everything else.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/two-streams/take1';
const SHOT = { x: 320, y: 242.5, w: 460, h: 575 };

const s = await session({
  url: process.env.URL || 'http://localhost:3000/two-streams/',
  out: OUT,
  dpr: 3,
  slow: 13,
  theme: 'light',
  clip: { x: SHOT.x - 4, y: SHOT.y - 4, width: SHOT.w + 8, height: SHOT.h + 8 },
  start: { x: SHOT.x + SHOT.w + 40, y: SHOT.y + SHOT.h + 30 },
  setup: async (page) => {
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-tsm-mini-play]').click(); // Sirens is already playing when the video starts
    await page.mouse.move(1090, 890);
    await page.waitForTimeout(2500);
  },
});
const { page, box, aim } = s;
console.log('before', await page.locator('[data-tsm-mini-play]').getAttribute('aria-label'), await page.locator('[data-tsm-mini-title]').first().textContent());

// 1. Play the new episode: the podcast takes over and Sirens tucks behind it.
{
  const play = await box(page.locator("[data-tsm-episode-play]"));
  await s.phase((p) => {
    p.hold(1.2); p.mark('enter');
    p.to(aim(play, 0.72, 0.8), { width: play.h }); p.hold(0.45); p.mark('episode'); p.click();
    p.hold(1.8); p.mark('tucked');
  });
}
// 2. The handle: hover lifts the held card, click brings Sirens back to the front.
{
  const handle = await box(page.locator('[data-tsm-mini-handle]'));
  console.log('handle', JSON.stringify(handle), await page.locator('[data-tsm-mini-handle]').getAttribute('aria-label'));
  await s.phase((p) => {
    p.mark('toHandle'); p.to(aim(handle, 0.74, 0.86), { width: handle.h }); p.mark('hover'); p.hold(1.0);
    p.mark('swap'); p.click(); p.hold(1.9); p.mark('swapped');
    p.to({ x: SHOT.x + SHOT.w + 40, y: handle.y + 20 }, { width: 200, overshoot: false, dur: 0.7 }); p.mark('gone'); p.hold(1.0); p.mark('end');
  });
}
console.log('after', await page.locator('[data-tsm-mini-title]').first().textContent(), await page.locator('[data-tsm-mini-handle]').getAttribute('aria-label'));
await s.finish();
