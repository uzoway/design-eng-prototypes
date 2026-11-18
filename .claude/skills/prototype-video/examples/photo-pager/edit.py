"""Photo pager for Contra: swipe 1 → 3, a peek that springs back, back to 1, then the rubber band.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/photo-pager/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/photo-pager/take1')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/photo-pager/photo-pager-15s')
t = Take(TAKE)
m = t.marks

# Locked on the photo and its pager (2.16×). The touch viewport is 540×900.
render(t, OUT, aspect='4:5', platforms=('contra',), segments=[
    Segment(0.1, m['end'] - 0.05, shots=[(0, 0, 270, 450, 500)]),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4', every=0.75)
