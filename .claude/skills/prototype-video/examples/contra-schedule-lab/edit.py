"""Scheduled posts for Contra, light: the portfolio lab loop. 16:9, real speed, two views: the
composer (also the opening and the queue) and the calendar below it. Ends with a crossfade back to
the opening frame, so the loop has no seam. Writes a near-lossless master; the lab encode is the
"Portfolio lab loops" recipe in STANDARDS.md.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/contra-schedule-lab/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/contra-schedule-lab/take')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/contra-schedule-lab/contra-schedule-light')
t = Take(TAKE)
m = t.marks


def arrive(start, by, longest=1.0):
    """A move that starts at `start` and lands before the click at `by`."""
    return (start, min(longest, by - start - 0.05))


# (start, move duration, centre x, centre y, view width) in CSS px of the 1200×900 window.
# The column is x 260–940. Tabs 40–96, the open composer 96–523 (clock and Post at 375–415),
# the popover 531–851 × 423–849, the queue's first post 325–460.
MAIN = (600, 282, 880)   # y 34–529: the tabs and the whole open composer, or the queue (2.18×)
CAL = (600, 615, 900)    # y 362–868: the Post row and the whole calendar popover (2.13×)

flow = [
    (0.00, 0.0, *MAIN),
    (*arrive(m['toClock'], m['clickClock']), *CAL),   # down to the clock as the cursor heads there
    (m['confirm'] + 0.4, 1.0, *MAIN),                 # back up: the chip, Post → Schedule, the queue
]

# Open 0.5s in (the cursor enters at 1.5s), end once the cursor has left, then crossfade to the
# opening frame: the page is still until 1.5s, so the last frame is the first.
render(t, OUT, aspect='16:9', platforms=('lab',), segments=[
    Segment(0.5, m['end'] - 0.2, shots=flow),
    Segment(0.5, 1.0, shots=[(0, 0, *MAIN)], fade_in=0.5),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4', every=1.0)
