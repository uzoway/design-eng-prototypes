"""Scheduled posts for Contra, light: the whole window, then in close to write a post, pick
tomorrow 8:30 AM in the calendar, Schedule, and open the Scheduled tab. Then back out.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/contra-schedule/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/contra-schedule/take4')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/contra-schedule/contra-schedule-light-v2')
t = Take(TAKE)
m = t.marks


def arrive(start, by, longest=1.0):
    """A move that starts at `start` and lands before the click at `by`."""
    return (start, min(longest, by - start - 0.05))


# (start, move duration, centre x, centre y, view width) in CSS px of the 1000×1250 window.
# Contra's column is 680 wide (x 160–840), more than any reading-size shot, so each close shot
# cuts only through empty space or background feed text, never what's being used:
#   left  x 150–630: tabs (160–506), the typed line (229–549), the chip (177–354), the queue's
#         first post; it stops short of "Want this on your profile?" (~645).
#   right x 556–1000: the clock and Schedule (691–822), starting just past the typed line.
# The camera holds still through every payoff and moves while the cursor travels.
LEFT = (390, 300, 480)                                         # 2.25×
flow = [
    (0.00, 0.0, 500, 625, 1000),                               # the whole window
    (*arrive(m['toEditor'], m['open']), *LEFT),                # tabs and composer; the typed line
    (*arrive(m['toClock'], m['clickClock']), 630, 648, 460),   # clock, menu, calendar, time list
    (m['confirm'] + 0.55, 1.0, *LEFT),                         # the text and its new time chip
    (*arrive(m['toSubmit'], m['submit']), 778, 278, 444),      # Schedule; the card closes
    # Once the card has closed (~0.35s) there's nothing left on the right, so head back left
    # straight away: Scheduled 3 comes into view, then the pill and the queue.
    (m['submit'] + 0.45, 1.0, *LEFT),
    (m['gone'] + 0.1, 1.2, 500, 625, 1000),                    # back to the window once the cursor has left
]

# Open on 1s of the window with no cursor (the take holds 1.5), end on ~1s of the window at rest.
# One video, for X: its first frame is the poster, so no separate cover.
render(t, OUT, aspect='4:5', platforms=('x',), segments=[
    Segment(0.5, m['end'] - 0.2, shots=flow),
])
if '--preview' in sys.argv:
    sheet(OUT + '-preview.mp4')
