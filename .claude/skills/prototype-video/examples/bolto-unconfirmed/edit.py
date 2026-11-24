"""Bolto concept, light, a page tour: the whole dashboard, in on the table while the hover glides
up the rows to Amara's, her payment's "We're missing a confirmation." card, Check payment status,
the history entry that says no new attempt was created, then back out to the whole dashboard.
About 15.5s, real speed, no replay.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/bolto-unconfirmed/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/bolto-unconfirmed/take3')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/bolto-unconfirmed/bolto-unconfirmed-15s-v2')
t = Take(TAKE)
m = t.marks

# (start, move duration, centre x, centre y, view width) in CSS px of the 1100×1375 window.
#   whole    the window: sidebar, totals, banner, table. Nothing to read yet, it sets the scene.
#   table    x 268–864, y 350–1095: the attention banner, then name, amount and status on all six
#            rows; it stops short of "Last update" (x 876). The highlight runs off the right edge.
#   panel    x 572–1092 from y 20 (below the panel's top edge, so no backdrop strip): Amara,
#            $2,400.00, the status pill, the card and its button.
#   history  "2 payment attempts" down to the new "Payment status confirmed" entry.
WHOLE = (550, 687.5, 1100)  # 0.98×
TABLE = (566, 722, 596)     # 1.81×
PANEL = (832, 345, 520)     # 2.08×
HISTORY = (832, 870, 520)   # 2.08×
flow = [
    (0.00, 0.0, *WHOLE),
    (m['enter'], 1.0, *TABLE),           # push in as the cursor comes in; still before the hover starts
    (m['open'] + 0.4, 0.9, *PANEL),      # once the panel has slid in, while the cursor heads for the button
    (m['gone'] + 0.05, 1.0, *HISTORY),   # after the card is read and the cursor has left
    (m['out'], 1.2, *WHOLE),             # back out to the whole dashboard, panel open
]

render(t, OUT, aspect='4:5', cover=m['check'] - 0.05, preview='--preview' in sys.argv, segments=[
    Segment(0.5, m['end'] - 0.1, shots=flow),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
