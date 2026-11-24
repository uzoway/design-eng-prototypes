"""Bolto concept, light: the table (the hover glides up to Amara's row), her payment's
"We're missing a confirmation." card, Check payment status, then the history entry that
says no new attempt was created. About 11s, real speed, no replay.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/bolto-unconfirmed/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/bolto-unconfirmed/take1')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/bolto-unconfirmed/bolto-unconfirmed-11s-v2')
t = Take(TAKE)
m = t.marks

# (start, move duration, centre x, centre y, view width) in CSS px of the 1100×1400 window.
#   table  x 266–698, y 480–1020: avatars, names and amounts of all six rows; it stops just short
#          of the status column (x 700, it would be cut mid-pill) and below the attention banner.
#          432 is the narrowest view at dpr 2.5 without upscaling.
#   panel  x 572–1092: Amara, $2,400.00, the status pill, the card and its button.
#   history: "2 payment attempts" down to the new "Payment status confirmed" entry.
TABLE = (482, 750, 432)    # 2.5×
PANEL = (832, 345, 520)    # 2.08×; starts at y 20, below the panel's top edge (y 8), so no backdrop strip
HISTORY = (832, 870, 520)  # 2.08×
flow = [
    (0.00, 0.0, *TABLE),
    (m['open'] + 0.4, 0.9, *PANEL),      # once the panel has slid in, while the cursor heads for the button
    (m['gone'] + 0.05, 1.0, *HISTORY),   # after the card is read and the cursor has left
]

render(t, OUT, aspect='4:5', cover=m['check'] - 0.05, preview='--preview' in sys.argv, segments=[
    Segment(0.5, m['end'] - 0.1, shots=flow),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
