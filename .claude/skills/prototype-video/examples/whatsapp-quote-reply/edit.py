"""Whole phone, push in with the top of the phone in frame, step down to the keyboard for typing,
back out to the whole phone, then a short crossfade to the opening frame so the loop restarts clean.
Real speed throughout; no slow-mo replay.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/whatsapp-quote-reply/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Device, Segment, render

D = 'briefs/refs/lab-masters/quote-reply'
t = Take(f'{D}/{os.environ.get("TAKE", "take-v2")}')
m = t.marks
dev = Device(t)
W = 600     # page px across: 1.8x, the phone about 70% of the frame
TOP = 340   # centre y that keeps the phone's top edge and some stage above it
KEYS = 470  # centre y that keeps the lifted message, the composer and the whole keyboard in frame

render(dev, f'{D}/quote-reply-{round(m["end"])}s', aspect='4:5', cover=m['selected'] + 0.6, segments=[
    Segment(0, m['end'], shots=[
        dev.whole(0),
        dev.shot(1.2, 1.0, 196, TOP, W),                   # in, before the finger arrives
        dev.shot(m['selected'] + 0.55, 0.9, 196, KEYS, W),  # down after the selection, before Reply: the flight and keyboard play under a still camera
        dev.whole(m['gone'] - 0.2, 1.0),                   # out once the keyboard has dropped
    ]),
    Segment(0, 0.6, shots=[dev.whole(0)], fade_in=0.35),   # back to the opening frame
])
