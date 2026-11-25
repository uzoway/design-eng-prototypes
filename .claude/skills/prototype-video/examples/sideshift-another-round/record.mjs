// SideShift "Another round" concept (sideshift.uzookafor.com), light, 16:9 page tour for the
// LinkedIn and X posts on 2026-11-25. Opens on the whole campaign page framed like Uzo's own
// screenshot (a 1700×956 window: strip, header, totals and seven idea rows), then:
//   1. the magnetic hover card gliding along the "Morning routine" row, clips playing;
//   2. the trap's breakout post (Devon K., 3.6M views) on the "POV" row;
//   3. By creator: all 6,000 dots pivot, and the "one creator" idea collapses into Devon K.'s row;
//   4. Rehire Devon K. flies into the tray, back to By idea, Rebrief Morning routine;
//   5. the tray grows into the draft brief, then folds back; the tray is emptied and the cursor
//      leaves, so the last frame matches the first.
// No slow-mo replay (Uzo, 2026-11-25).
//   node .claude/skills/prototype-video/examples/sideshift-another-round/record.mjs
//
// Take 1 lessons (2026-11-25):
// - Any pointer path across the field opens post cards on the way (a hover card covered the dock
//   button once). Moves between controls go round the dots: over the top of the field, down the
//   empty column right of the rows (x ≈ 1200), or down the label column (x < 404).
// - The brief's fold chevron lands right over the POV row's amber posts once the panel folds, so
//   it's clicked on its upper-left, away from them.
// - Resting on the dock button after opening the brief left the cursor on "Share with your
//   creators", whose tooltip covered the brief. The cursor steps into the footer's empty space.
// - Take 2: the glide's last rest (x 866) left the card 12px inside the magnet frame's edge. The
//   rests now stop at x 826, so the card keeps ~50px of room.
// - Chrome plays media no slower than 0.0625×, so slow 16 was the limit while clips played, and
//   that captured only ~45 fps. Now the clips are paused and stepped from the page's own (slowed)
//   clock, so they play at real speed at any slow, and the take runs at slow 24 (~65 fps).
import { session } from '../../engine/record.mjs';

const OUT = process.env.OUT || 'briefs/refs/lab-masters/sideshift-another-round/take3';

const s = await session({
  url: process.env.URL || 'http://localhost:4189/',
  out: OUT,
  slow: 24,
  dpr: 3.6, // 6120×3442 frames; the 4K render allows close shots down to 1067 CSS px wide
  viewport: { width: 1700, height: 956 },
  theme: 'light',
  start: { x: -40, y: 1000 }, // off the window, bottom-left: frame 1 has no cursor, and the way in runs down the label column, clear of the dots
  setup: async (page) => {
    await page.evaluate(() => document.fonts.ready);
    // Clips: step currentTime from performance.now (which the engine slows) instead of playing.
    await page.evaluate(() => {
      HTMLMediaElement.prototype.play = function () {
        const v = this;
        v.pause();
        const run = (v.__run = (v.__run || 0) + 1);
        const t0 = performance.now(), from = v.currentTime || 0;
        const tick = () => {
          if (v.__run !== run || !v.isConnected) return;
          const d = v.duration;
          if (d && !v.seeking) v.currentTime = (from + (performance.now() - t0) / 1000) % d;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        v.addEventListener('seeked', () => v.dispatchEvent(new Event('playing')), { once: true });
        return Promise.resolve();
      };
    });
    await page.waitForTimeout(2500); // the field's arrival, and every poster decoded
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  },
});
const { page, box } = s;

// A smooth gesture through waypoints: Catmull-Rom through the points, minimum-jerk along its
// length, so the speed never stops at a waypoint. Used where a direct path would cross the dots.
const minJerk = (t) => t * t * t * (10 - 15 * t + 6 * t * t);
function route(p, pts, T) {
  const P = [p.pos, ...pts];
  const seg = (i, u) => {
    const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
    const u2 = u * u, u3 = u2 * u;
    const f = (k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u3);
    return { x: f('x'), y: f('y') };
  };
  const samples = [];
  for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 40; k++) samples.push(seg(i, k / 40));
  samples.push(P[P.length - 1]);
  const len = [0];
  for (let i = 1; i < samples.length; i++) len.push(len[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
  const L = len[len.length - 1];
  p.path(T, (u) => {
    const target = minJerk(u) * L;
    let i = 1; while (i < len.length - 1 && len[i] < target) i++;
    const k = (target - len[i - 1]) / (len[i] - len[i - 1] || 1);
    return { x: samples[i - 1].x + (samples[i].x - samples[i - 1].x) * k, y: samples[i - 1].y + (samples[i].y - samples[i - 1].y) * k };
  }, P[P.length - 1]);
}

// Where the trap's breakout post is: the rightmost amber dot on the canvas.
const outlier = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  const k = c.width / r.width;
  const d = c.getContext('2d').getImageData(0, 0, c.width, Math.round(220 * k)).data;
  let best = null;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 200 && d[i] > 200 && d[i + 1] > 130 && d[i + 1] < 190 && d[i + 2] < 100) {
      const x = ((i / 4) % c.width) / k + r.left, y = Math.floor(i / 4 / c.width) / k + r.top;
      if (!best || x > best.x) best = { x, y };
    }
  }
  return { x: best.x - 3, y: best.y + 3 }; // the centre of that dot, not its right edge
});
const morning = await box(page.getByText(/^Morning routine, app open by 0:03$/).first());
const rowY = morning.y + 25; // the row's centre line, where its dots are densest

// 1–2. In from the bottom-left, up the label column, onto the Morning routine row and along it:
// the card follows from post to post and a clip starts each time the cursor rests. Then across to
// the trap's breakout post.
await s.phase((p) => {
  p.hold(1.4); p.mark('enter');
  route(p, [{ x: 300, y: 760 }, { x: 375, y: rowY + 4 }, { x: 560, y: rowY + 2 }], 1.3);
  p.hold(0.7); p.mark('magnet');
  p.to({ x: 610, y: rowY - 3 }, { width: 12, dur: 0.45, overshoot: false }); p.hold(0.8);
  p.to({ x: 682, y: rowY + 4 }, { width: 12, dur: 0.45, overshoot: false }); p.hold(0.8);
  p.to({ x: 756, y: rowY }, { width: 12, dur: 0.45, overshoot: false }); p.hold(0.8);
  p.to({ x: 826, y: rowY - 2 }, { width: 12, dur: 0.4, overshoot: false }); p.hold(0.9);
  p.mark('toTrap');
  p.to(outlier, { width: 10, dur: 1.0 });
  p.hold(1.6); p.mark('trap');
});

// 3. By creator, over the top of the field (the camera pulls back to the whole page meanwhile);
// the camera holds still through the pivot.
const toCreator = await box(page.getByRole('radio', { name: /By creator/ }));
await s.phase((p) => {
  const aim = s.aim(toCreator);
  route(p, [{ x: 1290, y: 430 }, { x: 900, y: 300 }, aim], 1.25); p.mark('atToggle');
  p.hold(0.5); p.mark('pivot'); p.click();
  p.hold(2.0); p.mark('pivoted');
});

// 4. Rehire Devon K. (row 1 in By creator), back to By idea, Rebrief Morning routine. Every move
// stays left of the field.
const rehire = await box(page.getByRole('button', { name: /^Rehire Devon/ }));
await s.phase((p) => {
  p.hold(1.0); p.mark('toRehire');
  route(p, [{ x: 300, y: 330 }, s.aim(rehire)], 1.0);
  p.hold(0.45); p.mark('rehire'); p.click();
  p.hold(1.3); p.mark('rehired');
});
const toIdea = await box(page.getByRole('radio', { name: /By idea/ }));
await s.phase((p) => {
  route(p, [{ x: 300, y: 340 }, s.aim(toIdea)], 0.9);
  p.hold(0.35); p.mark('back'); p.click();
  p.hold(1.5); p.mark('backed');
});
const rebrief = await box(page.getByRole('button', { name: /^Rebrief Morning/ }));
await s.phase((p) => {
  route(p, [{ x: 290, y: 360 }, s.aim(rebrief)], 0.9);
  p.hold(0.45); p.mark('rebrief'); p.click();
  p.hold(1.1); p.mark('rebriefed');
});

// 5. Round the field to the dock (over the top, down the empty column on the right), open the
// brief, step out of the way while it's read, fold it, empty the tray, leave.
const open = await box(page.locator('[data-demo="open-brief"]'));
await s.phase((p) => {
  route(p, [{ x: 330, y: 420 }, { x: 1080, y: 424 }, { x: 1170, y: 452 }, { x: 1190, y: 620 }, { x: 1185, y: 830 }, s.aim(open)], 2.1); p.mark('toOpen');
  p.hold(0.45); p.mark('open'); p.click();
  p.hold(0.25);
});
const share = await box(page.getByRole('button', { name: 'Share with your creators' }));
await s.phase((p) => {
  p.to({ x: share.x - 70, y: share.y + share.h * 0.55 }, { width: 40, dur: 0.5, overshoot: false });
  p.hold(0.5); p.mark('opening');
});
const fold = await box(page.getByRole('button', { name: 'Back to the tray' }));
await s.phase((p) => {
  p.hold(1.8); p.mark('read');
  p.to(s.aim(fold, 0.3, 0.3), { width: fold.h, dur: 0.9 });
  p.hold(0.5); p.mark('fold'); p.click();
  p.hold(0.9); p.mark('folded');
});
const empty = await box(page.getByRole('button', { name: /Empty the tray/ }));
await s.phase((p) => {
  const aim = s.aim(empty);
  route(p, [{ x: 1250, y: 720 }, { x: 1150, y: 905 }, aim], 1.1);
  p.hold(0.4); p.mark('empty'); p.click();
  p.hold(0.15); p.mark('leave');
  route(p, [{ x: aim.x + 160, y: aim.y + 20 }, { x: 1400, y: 1040 }], 0.8); p.mark('gone');
  p.hold(2.2); p.mark('end');
});

const geo = await page.evaluate(() => ({
  group: document.querySelector('section[aria-label^="Posts by"]')?.getAttribute('aria-label'),
  dock: !!document.querySelector('[data-demo="open-brief"]'),
  brief: !!document.querySelector('[data-brief]'),
  hover: !!document.querySelector('canvas[data-hover]'),
  scrollY,
}));
console.log('outlier', JSON.stringify(outlier), 'open', JSON.stringify(open), 'share', JSON.stringify(share), 'fold', JSON.stringify(fold), 'empty', JSON.stringify(empty));
console.log('after', JSON.stringify(geo));
await s.finish();
