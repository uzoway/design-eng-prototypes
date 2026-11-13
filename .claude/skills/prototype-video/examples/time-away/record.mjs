// Time away (app/time-away), light theme. The take behind the Nov 12 LinkedIn post,
// plus a slow-mo replay of the panel's "Mark as away" wave.
//   node .claude/skills/prototype-video/examples/time-away/record.mjs
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/time-away/take';
const CUSTOM = 'Fighting Safari';
const DAY = { start: 20464, end: 20505, job: 20485, singles: [20558, 20557, 20559, 20551, 20565] }; // Jan 11 → Feb 21, Feb 1, ~Apr 15

const s = await session({
  url: process.env.URL || 'http://localhost:3000/time-away/',
  out: OUT,
  slow: 10,
  theme: 'light',
  themeStorage: { 'merchant-theme': null },
  setup: (page) => page.waitForSelector(`td[data-day="${DAY.end}"]`),
});
const { page, rect, box, center } = s;
const day = (d) => rect(`td[data-day="${d}"]`);
const label = (d) => page.$eval(`td[data-day="${d}"]`, (e) => e.getAttribute('aria-label'));
let single;
for (const d of DAY.singles) if ((await label(d)).startsWith('No contributions')) { single = d; break; }
const R = { box: await rect('.ta-box'), start: await day(DAY.start), end: await day(DAY.end), job: await day(DAY.job), single: await day(single) };

// 1. Drag a range.
await s.phase((p) => {
  p.hold(0.35); p.mark('moveToStart');
  p.to(center(R.start), { width: 10 });
  p.hold(0.32); p.mark('down1'); p.down(); p.hold(0.12);
  p.drag(center(R.end), 1.25);
  p.hold(0.35); p.mark('up1'); p.up(); p.hold(0.7);
});
// 2. Pick Job hunting, Mark as away. Slow the page right down for the wave so it can be replayed at 0.25×.
{
  const chip = await box(page.locator('.ta-chips button', { hasText: 'Job hunting' }));
  const mark = await box(page.getByRole('button', { name: 'Mark as away' }));
  await s.phase((p) => {
    p.mark('toChip'); p.to(center(chip, 0.45, 0.55), { width: chip.h });
    p.hold(0.18); p.mark('clickChip'); p.click(); p.hold(0.55);
    p.to(center(mark, 0.55), { width: mark.h });
    p.hold(0.05);
  });
  await s.setSlow(40);
  await s.phase((p) => { p.hold(0.15); p.mark('clickMark1'); p.click(); p.hold(0.75); p.mark('waveEnd'); });
  await s.setSlow(10);
}
// 3. One day, a typed reason.
await s.phase((p) => { p.mark('toSingle'); p.to(center(R.single), { width: 10 }); p.hold(0.45); p.mark('clickSingle'); p.click(); p.hold(0.6); });
await s.phase((p) => { p.mark('typeStart'); p.type(CUSTOM); p.mark('typeEnd'); p.hold(0.4); });
{
  const mark = await box(page.getByRole('button', { name: 'Mark as away' }));
  await s.phase((p) => { p.to(center(mark), { width: mark.h }); p.hold(0.2); p.mark('clickMark2'); p.click(); p.hold(0.75); });
}
// 4. Remove Job hunting.
await s.phase((p) => { p.mark('toJob'); p.to(center(R.job), { width: 10 }); p.hold(0.9); p.mark('clickJob'); p.click(); p.hold(0.6); });
{
  const remove = await box(page.getByRole('button', { name: 'Remove' }));
  await s.phase((p) => { p.to(center(remove, 0.5, 0.55), { width: remove.h }); p.hold(0.22); p.mark('clickRemove'); p.click(); p.hold(1.0); });
}
// 5. Hover the custom day for its tooltip, then step back.
await s.phase((p) => {
  p.mark('toSingleHover'); p.to(center(R.single), { width: 10 });
  p.hold(1.5); p.mark('leave');
  p.to(center(R.box, 0.72, 0.8), { width: 60, overshoot: false });
  p.hold(2.0); p.mark('end');
});

const after = await page.evaluate(() => ({ heading: document.querySelector('h2').innerText, away: document.querySelectorAll('.ta-day[data-away]').length }));
console.log('after', JSON.stringify(after));
await s.finish();
