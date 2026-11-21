// The iPhone body's test take: the voice note (app/voice-note) at phone size, a finger glides in,
// taps "First" in the transcript and leaves. The voice note has no ?device mode, so setup stands one
// in (safe areas and a status bar). This example is for the engine, not for posting.
//   node .claude/skills/prototype-video/examples/voice-note-iphone/record.mjs
import { session } from '../../engine/record.mjs';

const OFF = { x: 440, y: 900 }; // off the screen, bottom right: the finger glides in from here
const s = await session({
  url: 'http://localhost:3000/voice-note/',
  out: process.env.OUT || 'briefs/refs/lab-masters/voice-note-iphone/take',
  pointer: 'touch',
  theme: 'light',
  start: OFF,
  setup: async (page) => {
    // The voice note has no ?device mode, so stand one in for the test: iPhone safe areas (59pt top,
    // 34pt bottom) and an iOS status bar. Prototypes built for phone videos draw these themselves.
    await page.addStyleTag({ content: `
      @media (max-width: 520px) { [data-vn-stage] { --vn-top: 59px !important; --vn-bottom: 34px !important; } }
      #sb { position: fixed; inset: 0 0 auto; height: 54px; z-index: 2147483647; pointer-events: none;
            display: flex; align-items: center; justify-content: space-between; padding: 0 30px 0 52px;
            font: 590 17px/1 -apple-system, "SF Pro Text", system-ui; letter-spacing: -0.2px; color: #000; }
      #sb .r { display: flex; gap: 6px; align-items: center; }` });
    await page.evaluate(() => {
      const sb = document.createElement('div');
      sb.id = 'sb';
      sb.innerHTML = `<span>9:41</span><span class="r">
        <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="7.5" width="3.2" height="4.5" rx="1"/><rect x="4.8" y="5.3" width="3.2" height="6.7" rx="1"/><rect x="9.6" y="2.8" width="3.2" height="9.2" rx="1"/><rect x="14.4" y="0" width="3.2" height="12" rx="1"/></svg>
        <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.3 10.3 0 0 0 8 .8 10.3 10.3 0 0 0 .8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.5c1.4 0 2.6.5 3.6 1.4l1.2-1.3A7 7 0 0 0 8 4.3 7 7 0 0 0 3.2 6.2l1.2 1.3c1-.9 2.2-1.4 3.6-1.4Zm0 3.4c.6 0 1.1.2 1.5.6L8 11.7 6.5 10.1c.4-.4.9-.6 1.5-.6Z"/></svg>
        <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="#000" stroke-opacity=".35"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.3v4.4c.8-.3 1.4-1.2 1.4-2.2S25.8 4.6 25 4.3Z" fill-opacity=".4"/></svg>
      </span>`;
      document.body.appendChild(sb);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(4500);
  },
});
const tr = await s.box(s.page.locator('[aria-label="Transcript"]').first());
await s.phase((p) => {
  p.mark('rest'); p.hold(1.2);
  p.to({ x: tr.x + tr.w * 0.4, y: tr.y + 20 }, { width: 60 }); p.hold(0.4);
  p.mark('tap'); p.tap(); p.hold(1.2);
  p.to(OFF, { width: 60 }); p.mark('gone'); p.hold(1.5); p.mark('end');
});
await s.finish();
