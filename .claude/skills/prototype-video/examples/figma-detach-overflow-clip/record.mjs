// Figma detach concept: the analytics table sliding sideways when a row's drill-in opens, before
// and after commit 676364b. One take: the first half runs with the bug brought back in the page
// (overflow: hidden on the clipping boxes, and the drill-in heading focused without
// preventScroll), then the take switches the fix back on and repeats the same click.
// The repo's code is never touched; the bug only exists inside this browser.
//
//   npm run dev   # localhost:3000
//   node .claude/skills/prototype-video/examples/figma-detach-overflow-clip/record.mjs
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/figma-detach-overflow-clip/take';
const SLOW = 10;
const SLOW_REPLAY = 40; // the slide gets a 0.25× replay
// The shot is 940 × 529 CSS px around the analytics (modal 90–1010 wide); this point is past its bottom-right corner.
const OFF = { x: 1065, y: 800 };

const s = await session({
  url: 'http://localhost:3000/figma-detach/',
  out: OUT,
  slow: SLOW,
  dpr: 3,
  theme: 'light',
  start: OFF,
  setup: async (page) => {
    await page.evaluate(() => document.fonts.ready);
    // Bring the bug back: what 676364b changed, undone in the page only.
    await page.addStyleTag({ content: '.fd-analytics, .fd-modal, .fd-canvas { overflow: hidden !important; }' });
    await page.evaluate(() => {
      document.querySelector('style:last-of-type').id = 'fd-bug';
      window.__fdBug = true;
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (options) {
        return focus.call(this, window.__fdBug && this.id === 'fd-drill-title' ? {} : options);
      };
    });
    await page.getByRole('button', { name: /team sees/ }).click();
    await page.waitForSelector('.fd-analytics [data-drill]');
    await page.mouse.move(OFF.x, OFF.y);
    await page.waitForTimeout(700);
  },
});
const { page, box, aim } = s;
const count = await box(page.locator('[data-drill]').first());

// Before. At rest, then in from the bottom right to Icon's detach count.
await s.phase((p) => {
  p.mark('rest'); p.hold(1.0); p.mark('enter');
  p.to(aim(count), { width: count.w });
  p.hold(0.5);
});
await s.setSlow(SLOW_REPLAY);
await s.phase((p) => { p.mark('open1'); p.click(); p.hold(0.9); p.mark('settled1'); });
await s.setSlow(SLOW);
const slid = await page.evaluate(() => document.querySelector('.fd-analytics').scrollLeft);
const back = await box(page.getByRole('button', { name: 'Back to components' }));
await s.phase((p) => {
  p.hold(0.3);
  p.to(aim(back), { width: back.w }); p.hold(0.4); p.click(); p.hold(0.7);
  p.to(OFF, { width: 60, overshoot: false }); p.mark('gone1'); p.hold(0.4);
  // After: the fix back on.
  p.call((pg) => pg.evaluate(() => { window.__fdBug = false; document.getElementById('fd-bug').remove(); }));
  p.mark('after'); p.hold(0.9);
  p.to(aim(count), { width: count.w }); p.hold(0.5);
  p.mark('open2'); p.click(); p.hold(1.2); p.mark('settled2');
  p.to(aim(back), { width: back.w }); p.hold(0.4); p.click(); p.hold(0.7);
  p.to(OFF, { width: 60, overshoot: false }); p.mark('gone2'); p.hold(0.7); p.mark('end');
});

const end = await page.evaluate(() => ({
  bugStyle: !!document.getElementById('fd-bug'),
  overflow: getComputedStyle(document.querySelector('.fd-analytics')).overflowX,
  scrollLeft: document.querySelector('.fd-analytics').scrollLeft,
  drill: !!document.querySelector('.fd-drill'),
}));
console.log('scrollLeft right after the first open (should be 0 once settled):', slid, '| end', JSON.stringify(end));
await s.finish();
