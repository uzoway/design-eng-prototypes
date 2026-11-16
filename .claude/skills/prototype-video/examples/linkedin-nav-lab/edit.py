"""LinkedIn nav, light: the portfolio lab loop. One still 16:9 view of the whole bar, real speed,
no slow-mo. Writes a near-lossless master; the lab encode (1920, CRF 20, sRGB remux) is the
"Portfolio lab loops" recipe in STANDARDS.md.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/linkedin-nav-lab/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/linkedin-nav/take')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/linkedin-nav/linkedin-nav-light')
t = Take(TAKE)
m = t.marks

# (start, move duration, centre x, centre y, view width) in CSS px at 1×.
# The bar is 310–790 × 424–476; 520 wide leaves 20px either side of Home and Me (~3.7×).
# The card is small, so the camera never moves: every icon is in frame the whole time.
BAR = (550, 450, 520)

render(t, OUT, aspect='16:9', platforms=('lab',), segments=[
    Segment(0, m['end'], shots=[(0, 0, *BAR)]),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
