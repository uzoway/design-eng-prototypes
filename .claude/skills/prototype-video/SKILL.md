---
name: prototype-video
description: Records a prototype from this repo (or its live URL) as a social video for LinkedIn, X and Instagram — framed on the one component that matters, the real macOS cursor that turns into the hand over clickable things (or a touch dot and real swipes for phone UIs), human mouse paths and typing, real-speed motion, clean loops, optional slow-motion replays, and an export per platform at the size and frame rate each feed actually shows. Use whenever Uzo asks for a video, clip, demo, recording or slow-mo of something built here. Not for portfolio lab loops on uzookafor.com (that's the lab recipe in STANDARDS.md) or for screen-recording native apps.
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
| The whole page when the work is one component | Sidebar and chrome compete with the thing you made | Packaging 1 |
| A cursor sitting in frame 1, or still in frame at a cut | A cluttered thumbnail, a jump when the loop restarts | Packaging 2 |
| The hand parked on the label it clicks | The state change happens under the cursor | Packaging 3 |
| Ending somewhere else than it started | The loop snaps back | Packaging 5 |
| A mouse cursor on a phone UI | Reads as a desktop site squeezed small | Packaging 7 |
| A phone screen floating with no phone around it | A web page pretending, not an app | Packaging 8 |

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

12. **Outputs stay out of git, and nothing delivered is ever overwritten.** Takes and renders go to `briefs/refs/lab-masters/<slug>/` (gitignored). Every new render gets a new name (`-v2`, `-v3`); the engine refuses to write over an existing video or take unless told to (`--overwrite`, `OVERWRITE=1`), and you only tell it to when Uzo asks. The take and edit scripts get committed to `examples/<slug>/` so the next video starts from a working one. Commit as uzoway with no co-author line. Uzo pushes.

## Packaging

The rules above make a take that's correct. These make it look made. They come from taking apart Emil Kowalski's `/package-my-work` demo frame by frame (Nov 2026); his four "after" clips follow every one of them. Numbers are in STANDARDS.md under Packaging.

1. **Frame the subject, not the page.** One component per clip, cropped to its bounding box with room around it (it fills about three quarters of the width). Sidebar, header and the rest of the app stay out. For a single component the camera doesn't move at all: the crop is the zoom. Camera moves are for flows that span areas, like the Contra page tour (open on the whole window, push in to each detail, step back at the end), which is the shape Uzo picked for those.
2. **Clean in, clean out.** Frame 1 is the finished UI at rest with no cursor. It's the thumbnail (X uses frame 1 as the poster). Hold it about a second, then the cursor enters from off-frame (bottom-right, so the hand trails its fingertip and never sweeps across the subject). Before every cut and at the end it leaves the frame again. Start it with `start` outside the shot, and send it out with `s.offstage(box)`.
3. **Never cover what changes.** Click with `s.aim(box)`, low and right of the target's centre, so the hand hangs off the label instead of sitting on it. When a click turns a control into another one (Add → a − 1 + stepper), aim where the next control will be so the cursor doesn't have to move again.
4. **Show the hover, then the press.** Rest on the hover state long enough to see it before clicking. The click itself shows through the UI's own pressed state. No click rings, ripples or cursor squish (the engine no longer shrinks the cursor; a real one doesn't).
5. **Round trip.** End in the state you started in: switch the tab and switch it back, add and remove, open and close. The loop then restarts without a jump.
6. **Short, one idea.** 5–10s for a component. Put the length in the file name (`add-to-cart-7s`). A set of similar things is a reel: same framing for each, about 3s per item, a hard cut between identical rest states with no cursor in frame.
7. **Phone UIs get a finger.** `pointer: 'touch'` records at a phone viewport with real touch events (taps, swipes with release velocity, no hover) and draws a soft touch dot instead of a cursor. It stays visible between touches and glides to the next one, so the eye can follow.
8. **Phone UIs sit in a real iPhone.** Wrap the take in `Device(take)` and the edit puts it inside an iPhone body (the 393×852 size of the iPhone 15 Pro and 16): titanium band, black bezel, side buttons and the Dynamic Island, on a soft light stage. This is the look Uzo picked in Nov 2026 from Lorenzo Dossi's and Vishal Bhardwaj's posts.
   - **The camera:** open on the whole phone (`dev.whole()`, a 1–2s beat), push in for every payoff so text stays ≥2× (the bottom of the phone goes off-frame), and pull back to the whole phone at the end so the loop is clean.
   - **The finger** shows only on the glass, cut by the screen's corners.
   - **The page draws its own status bar and leaves the island's space free** (59pt at the top, 34pt at the bottom). Prototypes built for this have a `?device` mode; record that URL. The edit never fakes a status bar.

## Build Sequence

Work in this order. Each step has a check before the next.

| # | Step | Done when |
|---|---|---|
| 1 | **Story.** Read the prototype and pick the moment that's worth watching: which one component is in frame, and the round trip that brings it back to rest (Packaging 1, 5). Draft the flow, typed text options, theme, platforms and length. Send it to Uzo (Rule 5). | Uzo says yes |
| 2 | **Setup.** Run `sh .claude/skills/prototype-video/engine/setup.sh` once (it installs into `~/.cache/prototype-video`, not the repo). Make sure `npm run dev` is serving `localhost:3000`; check with `curl`. | `ready` printed, page returns 200 |
| 3 | **Take script.** Copy the closest `examples/*/record.mjs`. Measure targets from the live DOM (`rect`, `box`) inside the phase that uses them, because layout moves. Start the cursor outside the shot, click with `s.aim()`, and leave with `s.offstage()` (Packaging 2, 3). Add `p.mark('name')` at every moment the edit will cut or frame on. Set `setSlow()` around any slow-mo moment. | Script reads like the story |
| 4 | **Record.** `node <script>`. It prints the frame count, captured fps and marks. Check the end state it logs against what should have happened. | Flow completed, ≥100 captured fps |
| 5 | **Edit.** Copy the closest `examples/*/edit.py`. Write the shot list from the marks (Rules 6–8), then the segments (Rule 9). Run with `--preview` for a half-size render and a contact sheet. Fix every warning. | Sheet shows the right framing at every beat |
| 6 | **Look closely.** Pull full-size frames (`ffmpeg -ss <t> -i out.mp4 -frames:v 1 f.png`) at the payoff, during typing and at each camera hold, and read them. Check the cursor type at each hover, the caret, and anything mid-animation. Put the first and last frames side by side: both at rest, no cursor, the same state. | Nothing soft, cut off or wrong; the loop is seamless |
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

```js
// a phone UI: touch events, a touch dot instead of a cursor, 393×852 at dpr 3 (1179×2556), slow 20
const s = await session({ url, out, pointer: 'touch', start: { x: 440, y: 900 } /* off-screen: the finger glides in */ });
const photo = await s.box(s.page.locator('[aria-label="Photo 1 of 8"]'));
await s.phase((p) => { p.hold(1); p.to(right, { width: 80 }); p.hold(0.25); p.swipe(left); p.hold(1); /* …and back */
                       p.to(s.offstage(photo, 60)); p.hold(0.6); });
```

```python
# a phone UI in an iPhone body: shots are on the stage, dev.shot() takes page px like any other shot
dev = Device(Take('briefs/refs/lab-masters/<slug>/take'))
render(dev, out, aspect='4:5', segments=[Segment(0, m['end'], shots=[
    dev.whole(0), dev.shot(m['enter'], 0.9, 196, 520, 470), dev.whole(m['gone'], 1.0)])])
```

Phase API: `hold(s)`, `to(point, {width})`, `drag(point, s)`, `path(T, at, end)`, `click()`, `tap()`, `swipe(point, s)`, `down()`, `up()`, `type(text)`, `press(key)`, `call(fn)`, `mark(name)`. Session helpers: `box`, `rect`, `center`, `aim(box)`, `offstage(box, pad, side)`. Shots are `(take time, move duration, centre x, centre y, view width)` in CSS px. Segment options: `speed`, `label`, `cursor=False`, `fade_in`.

A trigger with no on-screen control (a "simulate" button outside the shot, a timer) fires with `p.call()`. Inside it, click with `el.click()` through `evaluate`, never `locator.click()`, which moves the real mouse away from the cursor you're drawing. Ask Uzo whether the cursor should be seen pressing the demo control or parked out of frame.

The reference take is [examples/time-away](examples/time-away): drag a range, pick a reason, type a custom one, remove, hover a tooltip, then the "Mark as away" wave again at 4× slower.
