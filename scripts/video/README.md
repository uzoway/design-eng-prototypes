# Prototype video recorder

Records a prototype for social video with the real macOS cursor, hand-like
mouse movement and smooth camera moves. Built for the Time away LinkedIn clip
(Nov 2026); the timeline in `record.mjs` is specific to that take.

How it works:
- `record.mjs` (Playwright, Chrome) slows the page 10×: JS clocks, timers and rAF
  through an init script, CSS and WAAPI animations through CDP
  `Animation.setPlaybackRate`. It drives real mouse events along min-jerk, slightly
  curved reaches with a small overshoot and correction, and captures 3× frames
  tagged with real-speed time. GA is blocked.
- `post.py` (Pillow + FFmpeg) picks the nearest frame for each 60fps output frame,
  applies the camera keyframes, and draws the cursor at its exact position. The
  arrow/hand switch follows the page's computed `cursor`, debounced over the gaps
  between cells, and a click gives an eased press.
- Cursor images come from AppKit (`export-cursors.swift`). The hand is the vector
  `pointinghand/cursor.pdf` from HIServices plus its plist shadow, because AppKit's
  hand bitmap tops out at 64px.

Setup in a scratch folder: `npm install playwright-core@1.64.1`, a venv with
`pillow numpy`, and the three cursor PNGs next to the scripts.

    URL=http://localhost:3000/time-away/ node record.mjs take
    venv/bin/python post.py take out.mp4
    # then tag sRGB with the remux in the portfolio video recipe
