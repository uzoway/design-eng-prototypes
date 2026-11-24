// Bolto concept (bolto.uzookafor.com), light, 16:9: a payment whose confirmation never came back.
// A page tour: the whole dashboard, then in close on the table, where the cursor walks up the
// rows so the Fluid hover highlight follows it. It opens Amara's payment and checks the status
// instead of retrying. The card says the payment is moving again, the panel scrolls to the
// history entry that says no new attempt was created, and the camera steps back out to the whole
// dashboard. For the LinkedIn post on 2026-11-30. Take history (2026-11-24): 4:5 cuts were too
// tall for Uzo; this is the 16:9 retake.
//   node .claude/skills/prototype-video/examples/bolto-unconfirmed/record.mjs
//
// A 1920×1080 window is 16:9 and shows the whole dashboard (title, totals, banner, all six rows).
// The panel is then 1064 tall, so the new history entry needs ~200px of scroll. A wheel scroll
// would animate on the browser's own clock, so the scroll is a rAF ease-out in the page, which the
// engine slows like every other animation. Close shots are 836–920 wide (2.1–2.3×), so dpr 2.3;
// frames are 4416×2484, so slow 18 keeps capture near ~100fps.
// The "Status unconfirmed" scenario is loaded off camera through the demo controls.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/bolto-unconfirmed/take1';

const s = await session({
  url: process.env.URL || 'https://bolto.uzookafor.com/contractor-payments?payment=BOL-1101',
  out: OUT,
  slow: 18,
  dpr: 2.3,
  viewport: { width: 1920, height: 1080 },
  theme: 'light',
  themeStorage: { 'bolto-concept-theme': null },
  start: { x: 1990, y: 1150 }, // off the window, bottom-right, so frame 1 (the whole dashboard) has no cursor
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
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
      document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; });
    });
    await page.mouse.move(1919, 1079);
    await page.waitForTimeout(300);
  },
});
const { page, box } = s;
const row = (name) => box(page.getByRole('row').filter({ hasText: name }));
const dialog = page.getByRole('dialog');

// 1. The whole dashboard, still. The camera pushes in on the table as the cursor comes in.
// 2. The hover: up the table from Luca to Amara at a calm pace. Each move passes over the rows in
// between, so the highlight keeps following; it rests on a few. The cursor stays in the empty
// space between name and amount, so it covers neither. Then it opens Amara's payment.
{
  const [luca, theo, daniel, amara] = [await row('Luca Ferreira'), await row('Theo Martin'), await row('Daniel Kim'), await row('Amara Nwosu')];
  const mid = (r, x) => ({ x, y: r.y + r.h * 0.58 });
  await s.phase((p) => {
    p.hold(1.5); p.mark('enter');
    p.to(mid(luca, 905), { width: luca.h, dur: 1.0 });
    p.hold(0.4); p.mark('hover');
    p.to(mid(theo, 928), { width: theo.h, dur: 0.6, overshoot: false });
    p.hold(0.35);
    p.to(mid(daniel, 914), { width: daniel.h, dur: 0.6, overshoot: false });
    p.hold(0.3);
    p.to(mid(amara, 898), { width: amara.h, dur: 0.4, overshoot: false });
    p.hold(0.5); p.mark('open'); p.click();
    p.hold(0.9); p.mark('panelIn');
  });
}

// 3. Check payment status. The card changes in place; the camera holds while it's read.
{
  const check = await box(dialog.getByRole('button', { name: 'Check payment status' }));
  await s.phase((p) => {
    p.mark('toCheck'); p.to(s.aim(check, 0.8, 0.85), { width: check.h });
    p.hold(0.45); p.mark('check'); p.click();
    p.hold(1.8); p.mark('read');
  });
}

// 4. The cursor drops to the lower half of the panel (the camera follows down), then scrolls it
// like a trackpad: the new history entry rises into view. Then it leaves to the right and the
// camera steps back out to the whole dashboard.
{
  await s.phase((p) => {
    p.to({ x: 1800, y: 720 }, { width: 120, dur: 0.7 }); p.mark('down');
    p.hold(0.25); p.mark('scroll');
    p.call((pg) => pg.evaluate(() => {
      const el = document.querySelector('[role=dialog] .overflow-y-auto');
      el.style.scrollBehavior = 'auto';
      const from = el.scrollTop, to = el.scrollHeight - el.clientHeight, t0 = performance.now(), D = 850;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
        el.scrollTop = from + (to - from) * e;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }));
    p.hold(0.9); p.mark('scrolled');
    p.hold(2.0); p.mark('leave');
    p.to({ x: 1990, y: 760 }, { width: 200, overshoot: false, dur: 0.5 }); p.mark('gone');
    p.hold(2.2); p.mark('end');
  });
}

const after = await page.evaluate(() => {
  const el = document.querySelector('[role=dialog] .overflow-y-auto');
  const entry = [...document.querySelectorAll('[role=dialog] *')].find((e) => e.textContent?.trim() === 'The existing attempt is processing. No new attempt was created.');
  return {
    moving: [...document.querySelectorAll('[role=dialog] *')].some((e) => e.textContent?.trim() === 'The payment is moving again.'),
    entryTop: entry ? Math.round(entry.getBoundingClientRect().top) : null,
    scrollTop: Math.round(el.scrollTop),
  };
});
console.log('after', JSON.stringify(after));
await s.finish();
