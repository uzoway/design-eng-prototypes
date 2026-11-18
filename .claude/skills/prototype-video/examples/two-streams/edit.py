"""Spotify Two Streams for Contra: play the new episode, Sirens tucks behind, hover the handle and
it lifts, click and Sirens is back in front on the same second.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/two-streams/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/two-streams/take1')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/two-streams/two-streams-9s')
t = Take(TAKE)
m = t.marks

# From "New episode" down to the phone's bottom edge, locked (2.35×).
render(t, OUT, aspect='4:5', platforms=('contra',), segments=[
    Segment(0.15, m['end'] - 0.05, shots=[(0, 0, 550, 530, 460)]),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4', every=0.5)
