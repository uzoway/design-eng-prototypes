"""Bolto concept, light, 16:9, a page tour: the whole dashboard, in on the table while the hover
follows the cursor up the rows to Amara's, her payment's "We're missing a confirmation." card,
Check payment status, a scroll to the history entry that says no new attempt was created, then
back out to the whole dashboard. About 16s, real speed, no replay. One LinkedIn video, no cover.
Rendered at 4K (3840×2160, LinkedIn takes up to 4096×2304): at 1080p the close-ups looked soft once
a retina screen or fullscreen player scaled them up.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/bolto-unconfirmed/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/bolto-unconfirmed/take3')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/bolto-unconfirmed/bolto-unconfirmed-16x9-4k-v2')
t = Take(TAKE)
m = t.marks

# (start, move duration, centre x, centre y, view width) in CSS px of the 1920×1080 window.
# The scales below are for a 1920-wide frame; the 4K render doubles them (2.0–4.6 px per CSS px).
#   whole    the window: sidebar, title, totals, banner, all six rows. Sets the scene.
#   table    x 556–1392, y 560–1030: header and six rows with name, amount and status; it stops
#            short of "Last update" (x 1408). The highlight runs off the right edge.
#   panel    x 1020–1920, y 0–506: the panel's header with its close button, Amara, $2,400.00,
#            the status pill, the card and its button, with the dimmed dashboard to its left.
#            The panel sits at the window's right edge, so the shot can't centre it.
#   history  x 960–1920, y 380–920: "Payment history" down to the new "Payment status
#            confirmed" entry after the scroll, its timestamp clear of the bottom edge.
WHOLE = (960, 540, 1920)    # 1.0×
TABLE = (974, 795, 836)     # 2.3×
PANEL = (1470, 253, 900)    # 2.13×
HISTORY = (1440, 650, 960)  # 2.0×
flow = [
    (0.00, 0.0, *WHOLE),
    (m['enter'], 1.0, *TABLE),             # push in as the cursor comes in; still before the hover starts
    (m['open'] + 0.4, 0.9, *PANEL),        # once the panel has slid in, while the cursor heads for the button
    (m['read'], 0.85, *HISTORY),           # down with the cursor, then still while the panel scrolls
    (m['gone'], 1.2, *WHOLE),              # back out to the whole dashboard once the cursor has left
]

render(t, OUT, aspect=(3840, 2160), platforms=('linkedin',), preview='--preview' in sys.argv, segments=[
    Segment(0.5, m['end'] - 0.1, shots=flow),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
