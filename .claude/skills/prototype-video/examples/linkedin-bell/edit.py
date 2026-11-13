"""LinkedIn bell, light: open on the nav, push in on the bell, a notification arrives and it
swings, the cursor clicks it, step back; then the swing again at 0.25×, close.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/linkedin-bell/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/linkedin-bell/take')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/linkedin-bell/linkedin-bell-light')
t = Take(TAKE)
m = t.marks

# (start, move duration, centre x, centre y, view width) in CSS px at 1×.
# The bell icon is 658–682 × 430–454, so its centre is (670, 442).
# WIDE: 250 frames Messaging, Notifications and Me whole (~4.3×), so it reads as LinkedIn.
# CLOSE: 94 runs from 623 to 717, inside the gaps between the labels ("Messaging" ends at
# 620.5, "Me" starts at 733.3), so the bell, its badge, label and underline are whole and
# nothing is cut in half. ~11.5× with the bell dead centre.
BELL = (670, 442)
WIDE, CLOSE = 250, 94

main = [
    (0.00, 0.0, *BELL, WIDE),                   # open: the nav, readable from frame 1
    (m['push'], 0.9, *BELL, CLOSE),             # push in; settled 0.35s before the swing
    (m['clickEnd'] + 0.15, 1.0, *BELL, WIDE),   # step back once the click has settled
]
replay = [(0, 0, *BELL, CLOSE)]

render(t, OUT, aspect='4:5', cover=m['ring'] + 0.45, segments=[
    Segment(0, m['end'], shots=main),
    Segment(m['ring'] - 0.15, m['ring'] + 1.1, speed=0.25, label='4× slower', shots=replay, fade_in=0.25),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
