"""Reorder queue, light, for Contra: drag APT. to the top, then back down with the keyboard only.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/reorder-queue/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/reorder-queue/take2')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/reorder-queue/reorder-queue-keyboard-10s')
t = Take(TAKE)
m = t.marks
SHOT = [(0, 0, 550, 476.5, 540)]  # the whole card, locked (2.0×), with the pill's room below it

# The mouse half plays plain. The keyboard half carries a label, since a key press can't be seen.
render(t, OUT, aspect='4:5', platforms=('contra',), segments=[
    Segment(0.15, m['kbd'] - 0.05, shots=SHOT),
    Segment(m['kbd'] - 0.05, m['end'] - 0.1, shots=SHOT, label='Keyboard only  ↓ ↓'),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
