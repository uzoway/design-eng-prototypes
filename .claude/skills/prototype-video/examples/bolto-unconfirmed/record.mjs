// Bolto concept (bolto.uzookafor.com), light: a payment whose confirmation never came back.
// The cursor glides over the payments table (the Fluid hover highlight follows it), opens
// Amara's payment, and checks the status instead of retrying. The card says the payment is
// moving again, and the history records that no new attempt was created. For the LinkedIn post
// on 2026-11-30.
//   node .claude/skills/prototype-video/examples/bolto-unconfirmed/record.mjs
//
// A 1100×1400 window keeps the sidebar and table at desktop layout, and makes the 520px panel
// tall enough that the new history entry shows without scrolling the panel (a scroll would play
// on the browser's own clock). Shots are 440–520 wide (2.1–2.45×), so dpr 2.5 and slow 14.
// The "Status unconfirmed" scenario is loaded off camera through the demo controls.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/bolto-unconfirmed/take1';

const s = await session({
  url: process.env.URL || 'https://bolto.uzookafor.com/contractor-payments?payment=BOL-1101',
  out: OUT,
  slow: 14,
  dpr: 2.5,
  viewport: { width: 1100, height: 1400 },
  theme: 'light',
  themeStorage: { 'bolto-concept-theme': null },
  start: { x: 800, y: 1130 }, // off the table shot, bottom-right, so frame 1 has no cursor
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
    await page.mouse.move(800, 1130);
    await page.waitForTimeout(300);
  },
});
const { page, box } = s;

// 1. The table at rest. The cursor comes in, rests on Theo's row, then glides up to Amara's
// (the highlight follows), and opens it. It points into the empty space between the name and
// the amount, so it covers neither.
{
  const theo = await box(page.getByRole('row').filter({ hasText: 'Theo Martin' }));
  const amara = await box(page.getByRole('row').filter({ hasText: 'Amara Nwosu' }));
  await s.phase((p) => {
    p.hold(1.5); p.mark('enter');
    p.to({ x: 505, y: theo.y + theo.h * 0.62 }, { width: theo.h });
    p.hold(0.35); p.mark('glide');
    p.to({ x: 515, y: amara.y + amara.h * 0.6 }, { width: amara.h });
    p.hold(0.45); p.mark('open'); p.click();
    p.hold(0.9); p.mark('panelIn');
  });
}

// 2. Check payment status. The card changes in place; the camera holds while it's read.
{
  const check = await box(page.getByRole('dialog').getByRole('button', { name: 'Check payment status' }));
  await s.phase((p) => {
    p.mark('toCheck'); p.to(s.aim(check, 0.8, 0.85), { width: check.h });
    p.hold(0.45); p.mark('check'); p.click();
    p.hold(2.0); p.mark('read');
  });
}

// 3. The cursor leaves down-right, then the camera moves to the new history entry and holds.
{
  const card = await box(page.getByRole('dialog').getByText('The payment is moving again').locator('xpath=ancestor::div[3]'));
  await s.phase((p) => {
    p.to(s.offstage(card, 160), { width: 200, overshoot: false, dur: 0.6 }); p.mark('gone');
    p.hold(3.2); p.mark('end');
  });
}

const after = await page.evaluate(() => ({
  url: location.href,
  title: [...document.querySelectorAll('[role=dialog] *')].find((e) => e.textContent?.trim() === 'The payment is moving again.')?.textContent,
  last: [...document.querySelectorAll('[role=dialog] *')].some((e) => e.textContent?.trim() === 'The existing attempt is processing. No new attempt was created.'),
  attempts: [...document.querySelectorAll('[role=dialog] p')].find((e) => /payment attempts/.test(e.textContent))?.textContent,
}));
console.log('after', JSON.stringify(after));
await s.finish();
