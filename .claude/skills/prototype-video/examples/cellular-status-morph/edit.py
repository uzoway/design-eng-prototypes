"""Cellular status morph for Contra: status icons → iPhone Duo glyph, a close 3× slower replay of the
bars and battery travelling, then Reverse back to the status icons.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/cellular-status-morph/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/cellular-status-morph/take1')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/cellular-status-morph/cellular-status-morph-16s')
t = Take(TAKE)
m = t.marks

# The 520×650 window: the glyph sits at x ~156–371, y ~281–372; the dock is pinned at the bottom.
# Framed on the glyph alone (the morph is the work; the dock is the prototype's chrome), so the
# cursor's trips to Forward/Reverse along the bottom stay out of shot. 300 wide is 3.6×; the replay
# goes in a little closer.
GLYPH = [(0, 0, 263, 327, 300)]
CLOSE = [(0, 0, 263, 327, 262)]  # 4.1×: any tighter and the bars touch the edge
f = m['forward']
render(t, OUT, aspect='4:5', platforms=('contra',), segments=[
    Segment(f - 1.0, m['fwdEnd'] + 0.25, shots=GLYPH),
    Segment(f + 1.0, f + 3.2, speed=1 / 3, label='3× slower', shots=CLOSE, fade_in=0.25),
    Segment(m['fwdEnd'] + 0.25, m['revEnd'] + 1.0, shots=GLYPH, fade_in=0.25),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4', every=0.75)
