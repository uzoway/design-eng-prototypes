# Prototype Video Standards

The exact values behind the rules in [SKILL.md](SKILL.md). Most are already built into `engine/`. They're here so you can judge a take, tune a shot, or fix the engine without guessing.

## Platform exports

What each feed displays, so the file goes in at that size and nothing gets resampled on the way. Checked November 2026 against third-party spec guides (the platforms don't publish full numbers). Re-check if a platform changes its player.

| Platform | Size (4:5) | fps | Upload limits | Why |
|---|---|---|---|---|
| LinkedIn | 1080×1350 | 30 | up to 4096×2304, 10–60fps, ~30 Mbps | Re-encodes to a fixed bitrate per size, so 30fps gives each frame twice the bits. Text stays crisp. |
| X | 1080×1350 | 60 | up to 1920×1200 landscape, 1200×1900 portrait, ≤60fps, ~25 Mbps | Plays 60, and its encode holds up at that rate. |
| Instagram | 1080×1350 | 30 | feed 4:5 at 1080 wide, 30fps constant | Converts 60 down itself, badly. Never upload 60. |
| Contra | 1080×1350 | 60 | Claude in Chrome's upload path takes ≤10 MB | `maxrate` 5M keeps a 15s clip under the cap. Week 1 clips came out 0.8–4.3 MB. |

**Aspect.** 4:5 is the default. It takes the most room in every feed and fits a panel-and-grid UI. Use 1:1 only when Uzo asks. 16:9 (1920×1080) suits wide layouts going to X or LinkedIn only. If a wide component framed at ~75% of a 4:5 width lands under 2.2×, don't shrink it to fit: go 16:9 for X and LinkedIn, or frame the part that changes.

**X takes more than this table says (seen, not yet tested here).** Emil's 17 Nov 2026 post was uploaded at 3600×2250 60fps, and X served it at every rung up to 3456×2160 at 25 Mbps (1728×1080 at 10 Mbps, 1152×720 at 2 Mbps). So X keeps a 4K-class variant, at least for his account, and every lower rung is scaled from a sharper source. It may need X Premium. Worth one test on Uzo's account: post an X export rendered at 2× (2160×2700, which needs `dpr` ≥ 2× the shot scale, so ≥ 5 for a 2.2× shot) and pull the variants back to see the top one. Until that's checked, keep 1080×1350.

**Encode** (built into `edit.py`): libx264 High, yuv420p, preset slow, CRF 12, `-tune animation` (flat UI), `-maxrate` 20M for X and LinkedIn and 10M for Instagram with a 2× buffer, a keyframe every 2s, faststart, BT.709 tags written with `h264_metadata` in the stream and the container. FFmpeg 9 ignores `-color_trc` on its own. Flat UI comes out around 3 Mbps at CRF 12. That's expected: the bits go where the detail is.

**Portfolio lab loops** (uzookafor.com, not social): 1920 wide, CRF 20, no audio, then a lossless remux to the sRGB transfer so the video matches its poster in Chrome and Safari:
`ffmpeg -i in.mp4 -map 0 -c copy -bsf:v h264_metadata=transfer_characteristics=13 -color_trc iec61966-2-1 -color_primaries bt709 -colorspace bt709 -color_range tv -movflags +faststart out.mp4`

## Legibility

| Output px per CSS px | 12px text becomes | Use for |
|---|---|---|
| ≥ 2.2 | ≥ 26px | Anything with text to read: panels, tooltips, typing |
| 2.0 | 24px | The floor for reading |
| 1.8–2.0 | 22–24px | Brief transitions |
| < 1.8 | < 22px | A 1–2s establishing or closing beat only |
| > capture dpr | — | Never: upscaled and soft. Raise `dpr`. |

At 1080 wide: view width 480 → 2.25×, 440 → 2.45×, 400 → 2.7×, 160 → 6.75× (needs `dpr: 7`).

**Close-ups.** For something like a 24px icon at 6–7×, record with `dpr: 7` and `clip` set to a box around the subject. A 1100×900 page at dpr 7 is 7700×6300 per frame, far too slow to capture; a 300×200 clip is 2100×1400. Shots must then stay inside the clip (the camera clamps to it).

## Capture

| Setting | Value | Why |
|---|---|---|
| Format | PNG | Lossless. Benchmarked as fast as JPEG q95 (86 vs 77ms at 3300×2700) and smaller on flat UI |
| `dpr` | 3, more for close-ups | Leaves headroom for 2–3× shots |
| Viewport | 1100×900 | Desktop layout with room for panels. Match what the prototype is designed for |
| `slow` | 10, touch 20 | ~11 captures per real second × 10 ≈ 110fps of real time, enough for 60fps output. A phone frame (1179×2556) captures at half that rate: slow 10 gave 51fps, slow 20 gives 105 |
| Touch | `pointer: 'touch'` | 393×852 at dpr 3 with `isMobile` and `hasTouch`. Taps and swipes go through CDP `Input.dispatchTouchEvent`, so the page gets real touch and pointer events (`pointerType: 'touch'`). Nothing is sent while the finger is in the air |
| Slow-mo `setSlow` | ≥ 8 / speed (0.25× → 32, use 40) | Every output frame needs its own captured frame: 60 / speed fps |
| Screenshot | `page.screenshot` | A raw CDP `captureScreenshot` ignores `deviceScaleFactor` and returns 1× frames |
| Frame time | Midpoint of each screenshot call | |

The time warp wraps `performance.now`, `Date.now`, `setTimeout`, `setInterval` and rAF in an init script. CDP `Animation.setPlaybackRate(1/slow)` slows CSS transitions, CSS animations and WAAPI (Motion's opacity runs on WAAPI). `<audio>` and `<video>` get their `playbackRate` scaled by 1/slow, while the page still reads back the rate it set. Chrome only plays media at 0.0625× or faster, so past slow 16 media runs fast: keep audio-driven UI (a progress bar) at slow ≤ 16. Change speed only through `setSlow()`, which keeps every clock continuous. Not slowed: the caret (handled), GIFs, smooth scrolling, anything in a cross-origin iframe.

**Fixed-step animation.** Code that adds a fixed `dt` each rAF (a spring stepping 16ms a frame, like the photo pager's) runs `slow`× too fast, because the browser still paints 60 real frames a second. Pass `rafHz: 60` and rAF fires 60 times per real-speed second. Such an animation only has 60 steps a second, so don't slow-mo replay it.

## Motion

| | Value |
|---|---|
| Path easing | Minimum jerk: `t³(10 − 15t + 6t²)` |
| Path shape | Quadratic Bézier bowed 7% of the distance to one side, the way a wrist arcs |
| Move duration | Fitts: `0.2 + 0.11 · log2(distance / target width + 1)` s |
| Overshoot | `min(5, 1.5 + distance × 0.008)` px past the target for moves over 60px, then a 0.13–0.17s correction. Aim jitter ±0.6px |
| Drag | 1.2–1.25s, minimum jerk, slight bow |
| Click | Down and up 85ms apart. Dwell 0.15–0.45s before it |
| Typing | 75–135ms a key, +50ms after a space, +35ms for a capital |
| Before a payoff | 0.3–0.9s still, so the eye arrives before the thing happens |
| After a payoff | Hold until it fully settles, then 0.5s more |

Pass `width` (the target's size along the approach) to `p.to()`. Small targets take longer, as they do for people. Use `overshoot: false` for slow, deliberate moves, like drifting away at the end.

## Cursor

macOS AppKit cursors, exported at 10× (`engine/cursors/`). `export-cursors.swift` regenerates them. The pointing hand's bitmap tops out at 64px, so it came from the system's `cursor.pdf`.

| Kind | CSS size | Hotspot | When |
|---|---|---|---|
| arrow | 17×23 | 4, 4 | default |
| hand | 32×32 | 13, 8 | computed `cursor: pointer` |
| ibeam | 9×18 | 4, 9 | computed `cursor: text` |

- **Kind:** debounced 70ms, so 2–3px gaps between targets don't flicker hand/arrow. It holds while the button is down.
- **Press:** nothing happens to the cursor, as on a real Mac. The press shows in the UI's `:active` state. (`PRESS_SQUEEZE` in `edit.py` brings back a shrink if a video ever needs it; it was 0.1.)
- **Aim:** `s.aim(box)` clicks at 76% across and 78% down the target. The hand's body hangs below and right of its hotspot, so this keeps the label and the state change visible. Emil's clips do the same on every target.
- **Placement:** drawn at the interpolated sample position with a sub-pixel affine shift, never snapped to whole pixels. The cursor scales with the camera, like a real one under zoom.

**Touch dot** (`pointer: 'touch'`), measured off Emil's phone clip:

| | Value |
|---|---|
| Size | 32 CSS px across (96px at dpr 3). Smaller than the 44pt hit target, so the target shows around it |
| Light UI | 6.5% black fill, 1 CSS px rim at 13% black, no shadow. Over white that's #EFEFEF with a #DEDEDE edge |
| Dark UI | 10% white fill, 20% white rim |
| Press | No change in size or shade. The UI's own pressed state shows the tap |
| Between touches | Always visible. It glides to the next target with minimum-jerk easing and no overshoot |
| Tap | Down and up 100ms apart, at the target's centre |
| Swipe | `p.swipe(to, 0.32)`: lands, accelerates (`(3u² − u³)/2`, released at 1.5× the average speed), lifts while still moving, drifts 12% further over 0.18s |

## Caret

macOS Chrome blinks 500ms on, 500ms off. It turns solid again on focus and on every key press. The engine hides the real caret (`caret-color: transparent`) and draws it from a per-sample probe:

- **Position:** canvas `measureText` of the text before the caret, plus the border, padding and `scrollLeft`.
- **Height:** `round(font-size × 1.2)`. This matched Chrome's caret to 0.33px.
- **Width:** 1 CSS px, in the input's text colour.
- **Fade:** 0.2s with `1 − (1 − u)³`, the same entrance as the panel it appears in.

## Camera

- **Keyframe:** `(take time, move duration, centre x, centre y, view width)` in page CSS px. Height follows the aspect.
- **Move:** smootherstep `t³(6t² − 15t + 10)` over 0.8–1.1s. Zoom is interpolated in log space, so it feels even.
- **Clamp:** the view stays inside the viewport (or the clip). Ask for a centre near an edge and it slides inward.
- **Timing:** start moves just after an action lands (+0.05–0.3s) and finish them before the next one. Never move during a payoff.
- **Order:** open readable, push in for detail, step back only at the very end.

## iPhone body

`Device(take)` in `edit.py`. An iPhone 15 Pro / 16 in points, with the take's viewport (393×852 for `pointer: 'touch'`) as the screen.

| | Value |
|---|---|
| Screen corners | 55pt, continuous: Figma's corner smoothing at 60% (its iOS preset), a circular arc eased into the edges from 1.6× the radius. A plain superellipse looked like an Android phone (Uzo, Nov 2026) |
| Bezel | 11pt black (#060607) inside a 3pt titanium band (#3A3A3D), with a 0.6pt lighter outer edge (#76767B) |
| Dynamic Island | 126×37, fully round, 11pt below the screen's top edge, centred |
| Buttons | Out 3pt. Left: action 148–181, volume 209–271 and 287–349. Right: power 255–347 (body pt from the top). Measured off an iOS Simulator recording |
| Shadow | A soft 16% shadow, 22pt down, 28pt blur |
| Stage | 2400×1600pt. A radial wash from #F6F7F9 behind the phone to #E2E5EB at the edges |
| Whole-phone shot | `dev.whole()`: 7% margin. At 4:5 that's 1.32×, so it's an opening or closing beat (1–2s), never where anything is read |
| Payoff shots | `dev.shot(t0, dur, x, y, w)` in page px. Keep w ≤ 490 at 4:5 (≥2.2×). The phone's bottom going off-frame is fine; Vishal's sat at 1.9× the whole time |
| Safe areas | The page leaves 59pt at the top and 34pt at the bottom, draws its own status bar ("9:41", cellular, Wi-Fi, battery) and home indicator, and keeps the island's 126×37 clear |
| Speed | Body, mask and island are drawn once at 2×dpr and downsampled. Each frame resamples straight from the source at sub-pixel position: ~80ms a frame at 1080×1350 |

The two references (Nov 2026):
- **Lorenzo Dossi:** the iOS Simulator's whole device on white, no camera moves. The Mac cursor shows because it's a Simulator window.
- **Vishal Bhardwaj:** 1:1, a screen-only iPhone (no bezel) at 70% of the width, bleeding off the bottom, on a cool grey wash, with a 0.4s push-in at the start.

## Slow-mo replay

- Show the moment at real speed in the main segment first.
- Then replay a 0.6–1.5s window at 0.25× (or 0.2×). Start it 0.1–0.2s before the trigger so the cause is visible.
- Crossfade into the replay over 0.25s (`fade_in`). Frame the replay a little closer than the original if the capture `dpr` allows it.
- The label is a pill at the bottom centre: "4× slower", SF Pro Semibold at 2.6% of the width. It fades in over 0.25s and out 0.3s before the segment ends. Keep the bottom ~10% of the frame clear of UI for it.
- Keep the cursor in, unless it covers the detail.

## Packaging

The numbers behind SKILL.md's Packaging rules. Measured frame by frame from Emil Kowalski's `/package-my-work` post (x.com/emilkowalski/status/2122704498334339368, 17 Nov 2026): 20s, 60fps, silent, four before/after chapters. The "before" side of each is Playwright's own `recordVideo` (800×450 webm, no cursor, a blank first second while the page loads), which is everything this engine already avoids.

| | Value |
|---|---|
| Subject | One component per clip, ~75% of the frame width. Card 796 of 1060px, chart 814 of 1060 |
| Output | Shaped by the subject at up to 3840 wide (3120×2004, 2432×2128, 3840×2080); phone at native 1179×2556. We keep the feed sizes and fit the subject inside them |
| Camera | Locked for the whole clip. No push-ins, no pans |
| Opening | ~1.0s of the finished UI at rest, no cursor. That frame is the poster |
| Entry | From the bottom-right edge, ease-out, ~0.5s, with a slow last ~0.25s settle. The arrow turns to the hand as it crosses the target |
| Hover | ~0.4s on the hover state before pressing |
| After a click | ~1.0s hold before the next action. Repeated clicks (+, +) ~1s apart, cursor still |
| Exit | Leave the frame (or return to rest) before a cut; ~0.6s at rest before the cut |
| Cuts | Hard cuts only, on matching rest states. No crossfades between chapters or items |
| Reel | Same framing per item, 3.0s each |
| Length | 5–10s a clip, length in the file name |
| Loop | Ends in the start state (Visitors → Signups → Visitors) |
| Audio | None |

**When the post is about the craft itself** (a before/after, a tool, a technique), package the post the way Emil packaged his: a 16:10 canvas with the two versions side by side, each panel labelled with its file name and pixel size, one monospaced line above as the caption for that chapter, "Before" and "After" pills below, ~5s chapters with hard cuts. Frame 1 already shows the difference (his "before" panel was still blank while the "after" was finished), so the poster makes the argument on its own. The engine's `render()` takes one take, so these are composed by hand: start from `examples/contra-popover-height` (two takes from production builds via `serve`, one with the fix reverted, composed with the engine's `Renderer`, checked to loop pixel-for-pixel before encoding). Ask Uzo before making one.

## Before delivering

- [ ] `edit.py` printed no `!` warnings.
- [ ] A full-size frame at every camera hold, the payoff and typing is sharp and nothing important is cut off.
- [ ] The hand shows over every clickable thing, the I-beam over text fields, the arrow everywhere else.
- [ ] No sped-up tells: the caret and every animation run at a believable real speed.
- [ ] Frame 1 is readable and interesting, at rest, with no cursor. It's the thumbnail in most feeds, and `-cover.png` covers the rest.
- [ ] Only the subject is in frame, and the cursor never sits on the label or state it changes.
- [ ] The cursor enters from off-frame and is gone before every cut and the end.
- [ ] `ffprobe` shows each file at 1080×1350 with the right fps and `bt709` tags.
- [ ] The last frame matches the first, so the loop restarts without a jump.
