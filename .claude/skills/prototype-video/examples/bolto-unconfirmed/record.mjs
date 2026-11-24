// Bolto concept (bolto.uzookafor.com), light: a payment whose confirmation never came back.
// A page tour like contra-schedule: the whole dashboard, then in close on the table, where the
// cursor walks up the rows so the Fluid hover highlight glides from row to row. It opens Amara's
// payment and checks the status instead of retrying. The card says the payment is moving again,
// the history records that no new attempt was created, and the camera steps back out to the
// whole dashboard. For the LinkedIn post on 2026-11-30. Take 2 (2026-11-24): take 1 framed only
// the table and the panel, and its hover lasted half a second.
//   node .claude/skills/prototype-video/examples/bolto-unconfirmed/record.mjs
//
// A 1100×1375 window is 4:5, so frame 1 is the whole dashboard at desktop layout, and the 520px
// panel is tall enough that the new history entry shows without scrolling the panel (a scroll
// would play on the browser's own clock). Close shots are 520–596 wide (1.8–2.1×), so dpr 2.5;
// frames are 2750×3438, so slow 16 keeps capture near ~110fps.
// The "Status unconfirmed" scenario is loaded off camera through the demo controls.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/bolto-unconfirmed/take3';

const s = await session({
  url: process.env.URL || 'https://bolto.uzookafor.com/contractor-payments?payment=BOL-1101',
  out: OUT,
  slow: 16,
  dpr: 2.5,
  viewport: { width: 1100, height: 1375 },
  theme: 'light',
  themeStorage: { 'bolto-concept-theme': null },
  start: { x: 1160, y: 1440 }, // off the window, bottom-right, so frame 1 (the whole dashboard) has no cursor
  setup: async (page) => {
    await page.evaluate(() => document.fonts.ready);
    const panel = page.getByRole('dialog');
    await panel.getByText('Demo controls').click();
    await panel.getByRole('combobox', { name: 'Load a scenario' }).click();
    await page.getByRole('option', { name: 'Status unconfirmed' }).click();
    await page.waitForTimeout(400);
    await panel.getByText('Demo controls').click(); // fold it away again
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.mouse.move(1099, 1374);
    await page.waitForTimeout(300);
  },
});
const { page, box } = s;
const row = (name) => box(page.getByRole('row').filter({ hasText: name }));

// 1. The whole dashboard, still. The camera pushes in on the table as the cursor comes in.
// 2. The hover: up the table from Luca to Amara at a calm pace. Each move passes over the rows
// in between, so the highlight keeps gliding; it rests on a few. The cursor stays in the empty
// space between name and amount, so it covers neither. Then it opens Amara's payment.
{
  const [luca, theo, daniel, amara] = [await row('Luca Ferreira'), await row('Theo Martin'), await row('Daniel Kim'), await row('Amara Nwosu')];
  const mid = (r, x) => ({ x, y: r.y + r.h * 0.58 });
  await s.phase((p) => {
    p.hold(1.7); p.mark('enter');
    p.to(mid(luca, 530), { width: luca.h, dur: 0.95 });
    p.hold(0.4); p.mark('hover');
    p.to(mid(theo, 548), { width: theo.h, dur: 0.6, overshoot: false });
    p.hold(0.35);
    p.to(mid(daniel, 536), { width: daniel.h, dur: 0.6, overshoot: false });
    p.hold(0.3);
    p.to(mid(amara, 522), { width: amara.h, dur: 0.4, overshoot: false });
    p.hold(0.5); p.mark('open'); p.click();
    p.hold(0.9); p.mark('panelIn');
  });
}

// 3. Check payment status. The card changes in place; the camera holds while it's read.
{
  const check = await box(page.getByRole('dialog').getByRole('button', { name: 'Check payment status' }));
  await s.phase((p) => {
    p.mark('toCheck'); p.to(s.aim(check, 0.8, 0.85), { width: check.h });
    p.hold(0.45); p.mark('check'); p.click();
    p.hold(2.0); p.mark('read');
  });
}

// 4. The cursor leaves down-right; the camera moves to the new history entry and holds, then
// steps back out to the whole dashboard.
{
  const card = await box(page.getByRole('dialog').getByText('The payment is moving again').locator('xpath=ancestor::div[3]'));
  await s.phase((p) => {
    p.to(s.offstage(card, 160), { width: 200, overshoot: false, dur: 0.6 }); p.mark('gone');
    p.hold(3.1); p.mark('out');
    p.hold(2.5); p.mark('end');
  });
}

const after = await page.evaluate(() => ({
  title: [...document.querySelectorAll('[role=dialog] *')].some((e) => e.textContent?.trim() === 'The payment is moving again.'),
  last: [...document.querySelectorAll('[role=dialog] *')].some((e) => e.textContent?.trim() === 'The existing attempt is processing. No new attempt was created.'),
  attempts: [...document.querySelectorAll('[role=dialog] p')].find((e) => /payment attempts/.test(e.textContent))?.textContent,
}));
console.log('after', JSON.stringify(after));
await s.finish();
