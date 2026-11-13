---
name: prototype-video
description: Records a prototype from this repo (or its live URL) as a social video for LinkedIn, X and Instagram — the real macOS cursor that turns into the hand over clickable things, human mouse paths and typing, real-speed motion, optional slow-motion replays, and an export per platform at the size and frame rate each feed actually shows. Use whenever Uzo asks for a video, clip, demo, recording or slow-mo of something built here. Not for portfolio lab loops on uzookafor.com (that's the lab recipe in STANDARDS.md) or for screen-recording native apps.
---

# Prototype Video

## Initial Response

If invoked without saying which prototype, respond only with:

> Which prototype, light or dark, and what should the video show? I'll send you the flow to confirm before I record anything.

A specialised skill. It does ONE thing: turn a prototype into a video people can read on a phone and that never looks automated. It doesn't build or fix the prototype (if recording surfaces a bug, stop and report it), write the post, or post anything.

## Operating Posture

You are making the thing people judge the work by. A video that's soft, tiny, sped-up or robotic undoes the craft in the prototype. Default to doubting the take: watch the full-resolution frames, not the flow.

Cheap-looking videos fail in a handful of known ways. Each one has happened on this account:

| Failure | What viewers see | Prevented by |
|---|---|---|
| Fake or static cursor | Automation | Rule 1 |
| Straight, constant-speed, teleporting mouse | "AI sloppy" movement | Rule 2 |
| Browser-clock effects at recording speed | A caret blinking 10× fast: "this was sped up" | Rule 4 |
| UI too small in frame | Soft, unreadable text on every platform | Rule 6 |
| Camera moving during the payoff | The detail you made the video for is a blur | Rule 7 |
| Close-up wider than the capture | Upscaled, mushy edges | Rule 8 |
| 60fps into a 30fps feed, wrong size | The platform resamples and re-compresses harder | Rule 10 |

For every number (motion constants, cursor hotspots, caret timing, platform specs, encode settings), see [STANDARDS.md](STANDARDS.md). Load it before planning shots.

## Hard Rules

1. **Real macOS cursor, drawn in post.** Never a CSS cursor, never computer use (it teleports and pauses between screenshots). The engine records the page's computed `cursor` under the pointer and draws Apple's own arrow, pointing hand and I-beam at exact times. The hand must appear over everything clickable.

2. **Human motion.** Every move uses `p.to()` (Fitts timing, a slight wrist arc, a small overshoot and correction) and every drag `p.drag()`. Pause before clicks like a person reading (0.15–0.45s), and longer before anything the viewer should notice. Type with `p.type()`, which runs at a normal human pace. Never hand-write straight lines or even spacing.

3. **Everything plays at real speed** unless it's a labelled slow-mo replay. The page is recorded slowed (`slow`, default 10) only so capture keeps up. Playback is retimed to real speed.

4. **Nothing reveals the slowdown.** JS clocks, timers, rAF, CSS transitions/animations and WAAPI are slowed by the engine. The text caret isn't (it blinks on the browser's own clock), so it's hidden and redrawn in post at 500ms on/off. Anything else on its own clock (a `<video>`, a GIF, smooth scrolling) must be checked frame by frame and either avoided or handled the same way.

5. **Confirm the story before recording.** Send Uzo the flow as a short numbered list: the steps, the theme, any text you'll type (offer two or three options when it's a joke or custom value), the platforms, and whether there's a slow-mo replay. Record only after they say yes. A re-take costs minutes; a wrong story wastes the whole thing.

6. **Legible on a phone.** Default to 4:5 at 1080×1350. Anything people need to read sits at **≥2× (12px UI text → ≥24px)**, so a 1080-wide frame shows at most ~480 CSS px of the page. Open already zoomed so frame 1 is readable. Wide shots (<1.8×) only as a brief establishing or closing beat with nothing to read. `edit.py` warns on both.

7. **The camera holds still on every payoff.** Move between moments, never during one: the click, the animation it causes, the typed text, the tooltip. Ease moves with smootherstep over 0.8–1.1s and zoom in log space (the engine does this).

8. **Never upscale.** Output px per CSS px must not exceed the capture's `dpr`. Close-ups (an icon, a badge) need a higher `dpr` with a `clip` around the subject so frames stay small. `edit.py` refuses to render past this without `--force`.

9. **Slow-mo is a replay, not the main take.** Show the moment at real speed first, then replay it slower with a label ("4× slower"). Record that part with `s.setSlow()` high enough that every output frame is a real captured frame (`edit.py` checks density). Never stretch or blend frames.

10. **One render, an encode per platform.** Lossless PNG capture → one render → separate encodes at each platform's display size and frame rate (STANDARDS.md has the table). X gets 60fps, LinkedIn and Instagram 30fps. Never re-encode an encode.

11. **Safe to run.** The engine blocks analytics (GA, Vercel) in every take. It only reads the page. Never post, upload or message on Uzo's behalf. Deliver files and stop.

12. **Outputs stay out of git.** Takes and renders go to `briefs/refs/lab-masters/<slug>/` (gitignored). The take and edit scripts get committed to `examples/<slug>/` so the next video starts from a working one. Commit as uzoway with no co-author line. Uzo pushes.

## Build Sequence

Work in this order. Each step has a check before the next.

| # | Step | Done when |
|---|---|---|
| 1 | **Story.** Read the prototype and pick the moment that's worth watching. Draft the flow, typed text options, theme and platforms. Send it to Uzo (Rule 5). | Uzo says yes |
| 2 | **Setup.** Run `sh .claude/skills/prototype-video/engine/setup.sh` once (it installs into `~/.cache/prototype-video`, not the repo). Make sure `npm run dev` is serving `localhost:3000`; check with `curl`. | `ready` printed, page returns 200 |
| 3 | **Take script.** Copy the closest `examples/*/record.mjs`. Measure targets from the live DOM (`rect`, `box`) inside the phase that uses them, because layout moves. Add `p.mark('name')` at every moment the edit will cut or frame on. Set `setSlow()` around any slow-mo moment. | Script reads like the story |
| 4 | **Record.** `node <script>`. It prints the frame count, captured fps and marks. Check the end state it logs against what should have happened. | Flow completed, ≥100 captured fps |
| 5 | **Edit.** Copy the closest `examples/*/edit.py`. Write the shot list from the marks (Rules 6–8), then the segments (Rule 9). Run with `--preview` for a half-size render and a contact sheet. Fix every warning. | Sheet shows the right framing at every beat |
| 6 | **Look closely.** Pull full-size frames (`ffmpeg -ss <t> -i out.mp4 -frames:v 1 f.png`) at the payoff, during typing and at each camera hold, and read them. Check the cursor type at each hover, the caret, and anything mid-animation. | Nothing soft, cut off or wrong |
| 7 | **Render.** Run the edit without `--preview`. It writes `<out>-linkedin.mp4`, `-x.mp4`, `-instagram.mp4` and `-cover.png`. Confirm sizes, fps and colour tags with `ffprobe`. | Matches the STANDARDS table |
| 8 | **Deliver.** Send the files with `SendUserFile` and say which file goes where in one line each. If asked for a caption, write it in Uzo's voice: short, plain, warm, no lists. | Files in Uzo's hands |
| 9 | **Keep it.** Move the scripts into `examples/<slug>/`, commit, and delete the take's `frames/` once Uzo is happy (they're gigabytes). | Committed, disk cleaned |

## Engine at a glance

```js
// record: examples/<slug>/record.mjs
import { session } from '../../engine/record.mjs';
const s = await session({ url: 'http://localhost:3000/linkedin-nav/', out: 'briefs/refs/lab-masters/bell/take',
                          theme: 'light', dpr: 3 /* , clip: {x, y, width, height} for close-ups */ });
const bell = await s.box(s.page.locator('.ln-nav button[aria-label^="Notifications"]'));
await s.phase((p) => { p.hold(0.5); p.to(s.center(bell), { width: bell.h }); p.hold(0.3); p.mark('hover'); p.hold(1); });
await s.setSlow(40);                                   // dense capture for the slow-mo replay
await s.phase((p) => { p.mark('ring'); p.call((page) => page.getByRole('button', { name: 'New notification' }).evaluate((b) => b.click())); p.hold(1.5); p.mark('ringEnd'); });
await s.finish();
```

```python
# edit: examples/<slug>/edit.py  →  ~/.cache/prototype-video/venv/bin/python edit.py [--preview]
render(t, out, aspect='4:5', cover=m['ring'] + 0.4, segments=[
    Segment(0, m['ringEnd'], shots=[(0, 0, cx, cy, 420)]),                    # real speed
    Segment(m['ring'] - 0.1, m['ringEnd'], speed=0.25, label='4× slower',
            shots=[(0, 0, cx, cy, 160)], fade_in=0.25),                       # replay, closer
])
```

Phase API: `hold(s)`, `to(point, {width})`, `drag(point, s)`, `path(T, at, end)`, `click()`, `down()`, `up()`, `type(text)`, `press(key)`, `call(fn)`, `mark(name)`. Shots are `(take time, move duration, centre x, centre y, view width)` in CSS px. Segment options: `speed`, `label`, `cursor=False`, `fade_in`.

A trigger with no on-screen control (a "simulate" button outside the shot, a timer) fires with `p.call()`. Inside it, click with `el.click()` through `evaluate`, never `locator.click()`, which moves the real mouse away from the cursor you're drawing. Ask Uzo whether the cursor should be seen pressing the demo control or parked out of frame.

The reference take is [examples/time-away](examples/time-away): drag a range, pick a reason, type a custom one, remove, hover a tooltip, then the "Mark as away" wave again at 4× slower.
