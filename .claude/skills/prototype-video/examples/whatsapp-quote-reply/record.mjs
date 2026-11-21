// WhatsApp reply-to-selection (app/quote-reply) on the phone: long-press Ada's message, drag across
// "can Tobi crash at yours on Friday", Reply, type, send; again with "2 or 3?"; then tap the first
// reply's quote to jump back to those exact words. Recorded in the page's ?device mode, which draws
// the status bar, safe areas and iOS keyboard itself.
//   node .claude/skills/prototype-video/examples/whatsapp-quote-reply/record.mjs
import { session } from '../../engine/record.mjs';

const OFF = { x: 440, y: 900 }; // off the glass, bottom right: the finger glides in from here
const ASIDE = { x: 440, y: 560 }; // off the glass to the right: the finger steps aside while keys are typed
const s = await session({
  url: 'http://localhost:3000/quote-reply/?device',
  out: process.env.OUT || 'briefs/refs/lab-masters/quote-reply/take',
  pointer: 'touch',
  theme: 'light',
  start: OFF,
  setup: async (page) => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
  },
});

/** A word's box: `scope` is the thread or the lifted copy. */
const word = (scope, text, nth = 0) => s.page.evaluate(([scope, text, nth]) => {
  const span = [...document.querySelectorAll(`${scope} [data-u]`)].filter((e) => e.textContent === text)[nth];
  const r = span.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
}, [scope, text, nth]);
const THREAD = '[data-qr-thread]';
const LIFTED = '[data-qr-lifted]';
const log = (...a) => console.log('  ·', ...a);

// 1. At rest, then a long-press on Ada's message lifts it. The press lands on the first line, so it
// sits inside the pushed-in shot, which keeps the top of the phone in frame.
const sat = await word(THREAD, 'Saturday');
await s.phase((p) => {
  p.mark('rest'); p.hold(2.6);
  p.to({ x: sat.x + sat.w / 2, y: sat.y + sat.h / 2 }, { width: 40 }); p.hold(0.25);
  p.mark('press'); p.down(); p.hold(0.75); p.mark('lifted'); p.up(); p.hold(0.9);
});

// 2. Drag across the lifted words.
const can = await word(LIFTED, 'can');
const friday = await word(LIFTED, 'Friday');
log('lifted can', can, 'friday', friday);
await s.phase((p) => {
  p.to({ x: can.x + 4, y: can.y + can.h / 2 }, { width: 20 }); p.hold(0.2);
  p.mark('drag'); p.down(); p.hold(0.08);
  p.drag({ x: friday.x + friday.w * 0.55, y: friday.y + friday.h / 2 }, 1.0);
  p.up(); p.mark('selected'); p.hold(1.4);
});
log('pill', await s.page.locator('[data-qr-pill-item]:nth-child(2)').getAttribute('aria-label'));

// 3. Reply: the words fly into the composer, the keyboard comes up, type and send.
let reply = await s.rect('[data-qr-pill-item]:nth-child(2)');
await s.phase((p) => {
  p.to(s.center(reply), { width: reply.w }); p.hold(0.3);
  p.mark('reply'); p.tap(); p.hold(0.5); p.mark('flown');
  p.to(ASIDE, { width: 60 }); p.hold(0.35);
  p.mark('type'); p.type('yes, he can have the spare room'); p.hold(0.35);
});
let send = await s.rect('[data-qr-send]');
await s.phase((p) => {
  p.to(s.center(send), { width: send.w }); p.hold(0.2);
  p.mark('send'); p.tap(); p.hold(0.9);
});
log('after send 1', await s.page.evaluate(() => [...document.querySelectorAll('[data-qr-quote-text]')].map((e) => e.textContent)));

// 4. The same, quicker, with "2 or 3?".
let two = await word(THREAD, '2');
await s.phase((p) => {
  p.to({ x: two.x + two.w / 2, y: two.y + two.h / 2 }, { width: 20 }); p.hold(0.2);
  p.mark('press2'); p.down(); p.hold(0.65); p.up(); p.hold(0.5);
});
two = await word(LIFTED, '2');
const three = await word(LIFTED, '3');
log('lifted 2', two, '3', three);
await s.phase((p) => {
  p.to({ x: two.x + 2, y: two.y + two.h / 2 }, { width: 20 }); p.hold(0.15);
  p.mark('drag2'); p.down(); p.hold(0.08);
  p.drag({ x: three.x + three.w + 6, y: three.y + three.h / 2 }, 0.6);
  p.up(); p.mark('selected2'); p.hold(0.8);
});
log('pill 2', await s.page.locator('[data-qr-pill-item]:nth-child(2)').getAttribute('aria-label'));
reply = await s.rect('[data-qr-pill-item]:nth-child(2)');
await s.phase((p) => {
  p.to(s.center(reply), { width: reply.w }); p.hold(0.25);
  p.mark('reply2'); p.tap(); p.hold(0.5);
  p.to(ASIDE, { width: 60 }); p.hold(0.3);
  p.mark('type2'); p.type('3, I finish work at 2'); p.hold(0.3);
});
send = await s.rect('[data-qr-send]');
await s.phase((p) => {
  p.to(s.center(send), { width: send.w }); p.hold(0.2);
  p.mark('send2'); p.tap(); p.hold(0.9);
});

// 5. Tap the first reply's quote: back to Ada's message, only those words light up.
const quote = await s.rect('[data-qr-quote]');
log('first quote', quote);
await s.phase((p) => {
  p.to(s.center(quote), { width: quote.w * 0.6 }); p.hold(0.3);
  p.mark('jump'); p.tap(); p.hold(2.5); p.mark('jumped');
});

// 6. A tap on the wallpaper drops the keyboard, and the finger leaves.
const ada = await s.page.evaluate(() => {
  const b = [...document.querySelectorAll('[data-qr-thread] [data-qr-bubble]')].find((e) => e.textContent.startsWith('Okay so'));
  const r = b.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await s.phase((p) => {
  p.to({ x: 362, y: ada.y + ada.h * 0.4 }, { width: 40 }); p.hold(0.2);
  p.mark('dismiss'); p.tap(); p.hold(0.5);
  p.to(OFF, { width: 60 }); p.mark('gone'); p.hold(1.4); p.mark('end');
});
log('keyboard down', await s.page.evaluate(() => getComputedStyle(document.querySelector('[data-qr-keyboard-layer]')).transform));
log('jump band seen', await s.page.evaluate(() => document.querySelectorAll('[data-qr-band][data-kind="jump"]').length));
await s.finish();
