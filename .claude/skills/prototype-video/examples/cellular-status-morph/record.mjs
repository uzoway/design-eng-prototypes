// Cellular status morph (app/cellular-status-morph), light. For Contra, 26 Nov 2026.
// Opens on the status bar icons (cellular, Wi-Fi, battery), clicks Forward and they morph into the
// iPhone Duo glyph, then Reverse takes them back. The edit replays the bars' travel 4× slower.
//   node .claude/skills/prototype-video/examples/cellular-status-morph/record.mjs
//
// A 520×650 window is 4:5, so the whole page is the wide shot (2.08×), glyph and dock together.
// dpr 4.5 leaves room for the close replay on the glyph alone (~240 wide, 4.5×).
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/cellular-status-morph/take1';
const W = 520, H = 650;

const s = await session({
  url: process.env.URL || 'http://localhost:3000/cellular-status-morph/',
  out: OUT,
  viewport: { width: W, height: H },
  dpr: 4.5,
  slow: 20,
  theme: 'light',
  start: { x: W + 40, y: H + 40 },
  setup: async (page) => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(3600); // the page plays the morph once on load
    await page.locator('[data-control="direction"]').evaluate((b) => b.click()); // back to the status icons
    await page.waitForTimeout(3700);
  },
});
const { page, box, aim } = s;
const btn = await box(page.locator('[data-control="direction"]'));
const glyph = await page.locator('[data-status="glyph"] g').first().evaluate(() => {
  const r = document.querySelector('[data-status="glyph"]').getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
console.log('button', JSON.stringify(btn), 'svg', JSON.stringify(glyph), 'label', await page.locator('[data-control="direction-text"]').textContent());

// 1. At rest, then in to Forward. Captured dense from here, for the replay of the morph.
await s.setSlow(40);
await s.phase((p) => {
  p.hold(1.2); p.mark('enter');
  p.to(aim(btn, 0.8, 0.85), { width: btn.h }); p.hold(0.45); p.mark('forward'); p.click();
  p.hold(3.3); p.mark('fwdEnd'); p.hold(0.6);
});
// 2. The same button now says Reverse: the icons go back to the status bar.
await s.setSlow(20);
await s.phase((p) => {
  p.mark('reverse'); p.click(); p.hold(3.3); p.mark('revEnd'); p.hold(0.3);
  p.to({ x: W + 40, y: btn.y + btn.h * 0.6 }, { width: 200, overshoot: false, dur: 0.7 }); p.mark('gone'); p.hold(1.0); p.mark('end');
});
console.log('after', await page.locator('[data-control="direction-text"]').textContent());
await s.finish();
