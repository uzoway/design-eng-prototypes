"""Scheduled posts for Contra, light: write a post, schedule it for tomorrow morning, View.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/contra-schedule/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/contra-schedule/take2')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/contra-schedule/contra-schedule-light')
t = Take(TAKE)
m = t.marks

# The take is a 600×750 window, already 4:5, so the whole page fills the frame at 1.8×:
# the post text lands at 34px and the menu at 29px. The composer runs edge to edge, so any
# push-in would cut its corners or the Post button. The camera holds still the whole way;
# every beat (typing, the menu, the chip, the count, the queue) is a payoff.
still = [(0.00, 0.0, 300, 375, 600)]

render(t, OUT, aspect='4:5', cover=m['scheduled'] - 0.3, segments=[
    Segment(0, m['end'] - 0.4, shots=still),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
