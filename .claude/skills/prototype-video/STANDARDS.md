# Prototype Video Standards

The exact values behind the rules in [SKILL.md](SKILL.md). Most are already built into `engine/`. They're here so you can judge a take, tune a shot, or fix the engine without guessing.

## Platform exports

What each feed displays, so the file goes in at that size and nothing gets resampled on the way. Checked November 2026 against third-party spec guides (the platforms don't publish full numbers). Re-check if a platform changes its player.

| Platform | Size (4:5) | fps | Upload limits | Why |
|---|---|---|---|---|
| LinkedIn | 1080×1350 | 30 | up to 4096×2304, 10–60fps, ~30 Mbps | Re-encodes to a fixed bitrate per size, so 30fps gives each frame twice the bits. Text stays crisp. |
| X | 1080×1350 | 60 | up to 1920×1200 landscape, 1200×1900 portrait, ≤60fps, ~25 Mbps | Plays 60, and its encode holds up at that rate. |
| Instagram | 1080×1350 | 30 | feed 4:5 at 1080 wide, 30fps constant | Converts 60 down itself, badly. Never upload 60. |

**Aspect.** 4:5 is the default. It takes the most room in every feed and fits a panel-and-grid UI. Use 1:1 only when Uzo asks. 16:9 (1920×1080) suits wide layouts going to X or LinkedIn only.

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
| `slow` | 10 | ~11 captures per real second × 10 ≈ 110fps of real time, enough for 60fps output |
| Slow-mo `setSlow` | ≥ 8 / speed (0.25× → 32, use 40) | Every output frame needs its own captured frame: 60 / speed fps |
| Screenshot | `page.screenshot` | A raw CDP `captureScreenshot` ignores `deviceScaleFactor` and returns 1× frames |
| Frame time | Midpoint of each screenshot call | |

The time warp wraps `performance.now`, `Date.now`, `setTimeout`, `setInterval` and rAF in an init script. CDP `Animation.setPlaybackRate(1/slow)` slows CSS transitions, CSS animations and WAAPI (Motion's opacity runs on WAAPI). Change speed only through `setSlow()`, which keeps every clock continuous. Not slowed: the caret (handled), `<video>`, GIFs, smooth scrolling, anything in a cross-origin iframe.

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
- **Press:** scales to 0.9 over 60ms with smoothstep, and back on release.
- **Placement:** drawn at the interpolated sample position with a sub-pixel affine shift, never snapped to whole pixels. The cursor scales with the camera, like a real one under zoom.

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

## Slow-mo replay

- Show the moment at real speed in the main segment first.
- Then replay a 0.6–1.5s window at 0.25× (or 0.2×). Start it 0.1–0.2s before the trigger so the cause is visible.
- Crossfade into the replay over 0.25s (`fade_in`). Frame the replay a little closer than the original if the capture `dpr` allows it.
- The label is a pill at the bottom centre: "4× slower", SF Pro Semibold at 2.6% of the width. It fades in over 0.25s and out 0.3s before the segment ends. Keep the bottom ~10% of the frame clear of UI for it.
- Keep the cursor in, unless it covers the detail.

## Before delivering

- [ ] `edit.py` printed no `!` warnings.
- [ ] A full-size frame at every camera hold, the payoff and typing is sharp and nothing important is cut off.
- [ ] The hand shows over every clickable thing, the I-beam over text fields, the arrow everywhere else.
- [ ] No sped-up tells: the caret and every animation run at a believable real speed.
- [ ] Frame 1 is readable and interesting. It's the thumbnail in most feeds, and `-cover.png` covers the rest.
- [ ] `ffprobe` shows each file at 1080×1350 with the right fps and `bt709` tags.
- [ ] The prototype ends in a sensible state, so the loop restarting isn't jarring.
