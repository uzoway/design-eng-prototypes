"""Time away, light: the full flow at real speed, then the wave again at 0.25×.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/time-away/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/time-away/take')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/time-away/time-away-light')
t = Take(TAKE)
m = t.marks

# (start, move duration, centre x, centre y, view width) in CSS px. 4:5 at 1080 wide:
# width 480 puts 12px text at 27px. Hold still through every payoff; move between them.
flow = [
    (0.00, 0.0, 330, 372, 480),                        # open on the graph, readable from frame 1
    (m['moveToStart'] + 0.3, 0.9, 300, 330, 400),      # in on the days for the drag
    (m['up1'] - 0.05, 0.8, 302, 482, 480),             # the panel; hold through Job hunting and the wave
    (m['toSingle'] + 0.1, 0.9, 439, 500, 460),         # over to April for the typed reason
    (m['clickMark2'] + 0.15, 0.9, 305, 462, 480),      # the heading, the April pop, then Remove
    (m['toSingleHover'] + 0.05, 0.8, 324, 350, 440),   # the Fighting Safari tooltip with the heading in frame
    (m['leave'] + 0.15, 1.1, 430, 440, 620),           # step back a little; still readable
]
# Cause and payoff in one still frame: the button below, the grid that waves above.
wave = [(0, 0, 302, 430, 480)]

render(t, OUT, aspect='4:5', cover=m['toSingleHover'] + 1.2, segments=[
    Segment(0, m['end'] - 0.6, shots=flow),
    Segment(m['clickMark1'] - 0.15, m['waveEnd'], speed=0.25, label='4× slower', shots=wave, fade_in=0.25),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
