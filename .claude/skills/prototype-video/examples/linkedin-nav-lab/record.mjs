// LinkedIn nav (app/linkedin-nav), light: the portfolio lab loop on uzookafor.com. The cursor
// sweeps the bar, then clicks My Network and Jobs; a message and a notification arrive and get
// clicked; a new post puts a dot on Home and clicking Home reads it. It ends on the frame it
// opens on (Home selected, no badges, cursor resting below Home), so the loop is seamless.
// The nav never flags a post on the tab you're looking at, so Home's opening dot is read in
// setup: the bar can't get back to "Home selected with a dot" once you've left it.
//   node .claude/skills/prototype-video/examples/linkedin-nav-lab/record.mjs
// The edit holds one still 16:9 view of the whole bar (520 CSS px wide, ~3.7× at 1920), so
// dpr 4 with a clip around it is enough.
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/linkedin-nav/take';
// The bar is 310–790 × 424–476 in the 1100×900 viewport; the view is 290–810 × 304–596.
const CLIP = { x: 280, y: 290, width: 540, height: 320 };
const REST = { x: 362, y: 548 }; // below Home, in frame, clear of the bar: where it starts and ends

const s = await session({
  url: process.env.URL || 'http://localhost:3000/linkedin-nav/',
  out: OUT,
  slow: 10,
  dpr: 4,
  clip: CLIP,
  theme: 'light',
  seed: 7,
  start: REST,
  setup: async (page) => {
    // The demo's own controls sit just under the bar. Hide them for this take; the simulated
    // events still fire from the hidden buttons.
    await page.addStyleTag({ content: '.ln-desktop .ln-control-group, .ln-desktop .ln-theme { visibility: hidden !important; }' });
    // Reselect Home to read its dot, and let the hop settle before the take starts.
    await page.locator('.ln-desktop button[aria-label^="Home"]').evaluate((b) => b.click());
    await page.waitForTimeout(1500);
  },
});
const { page, box, center } = s;

const label = (name) => box(page.locator(`.ln-desktop button[aria-label^="${name}"] .ln-label`).first());
const simulate = (event) => (p) =>
  p.call((pg) => pg.locator(`.ln-desktop [data-event="${event}"]`).evaluate((b) => b.click()));

// Hover over a tab's label, wait like a person, click, and let its animation play out.
async function clickTab(name, { dwell = 0.28, after = 0.8, mark } = {}) {
  const l = await label(name);
  await s.phase((p) => {
    p.to(center(l, 0.5, 0.55), { width: l.h });
    p.hold(dwell);
    p.mark(mark);
    p.click();
    p.hold(after);
  });
}

// 1. The bar at rest: Home selected, nothing new. This is the poster frame.
await s.phase((p) => { p.mark('open'); p.hold(0.8); });

// 2. A quick sweep along the labels; each tab's hover hint plays as the cursor passes.
const sweep = [];
for (const name of ['Home', 'My Network', 'Jobs', 'Messaging', 'Notifications']) sweep.push(await label(name));
await s.phase((p) => {
  p.mark('sweep');
  sweep.forEach((l, i) => {
    p.to(center(l, 0.5, 0.55), { width: l.h });
    p.hold(0.12 + (i % 2) * 0.06); // a person's dwell, not a metronome
  });
});

// 3. Back to My Network, then Jobs.
await clickTab('My Network', { mark: 'network' });
await clickTab('Jobs', { dwell: 0.24, after: 0.6, mark: 'jobs' });

// 4. A message arrives on its own; its badge pops on Messaging. Then click it.
await s.phase((p) => { p.mark('message'); simulate('message')(p); p.hold(0.9); });
await clickTab('Messaging', { after: 0.95, mark: 'messaging' });

// 5. A notification arrives; the bell rings. Then click it: the bell rings again, the badge tucks in.
await s.phase((p) => { p.mark('notification'); simulate('notification')(p); p.hold(1.0); });
await clickTab('Notifications', { dwell: 0.3, after: 0.9, mark: 'notifications' });

// 6. A new post arrives: a dot pops on Home. Click Home: the house lights up and reads it.
await s.phase((p) => { p.mark('post'); simulate('post')(p); p.hold(0.85); });
await clickTab('Home', { dwell: 0.3, after: 0.9, mark: 'home' });

// 7. Back to rest, so the last frame matches the first.
await s.phase((p) => {
  p.to(REST, { width: 40 });
  p.hold(0.7);
  p.mark('end');
});

const after = await page.evaluate(() => ({
  selected: document.querySelector('.ln-desktop [aria-current="page"]')?.getAttribute('aria-label'),
  tabs: [...document.querySelectorAll('.ln-desktop .ln-nav button')].map((b) => b.getAttribute('aria-label')),
}));
console.log('after', JSON.stringify(after));
await s.finish();
