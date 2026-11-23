"""Whole phone, push in with the top of the phone in frame, step down to the keyboard for typing,
and end on the jump highlight (Uzo cut the pull-back: 16s, no loop crossfade).
Real speed throughout; no slow-mo replay.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/whatsapp-quote-reply/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Device, Segment, render

D = 'briefs/refs/lab-masters/quote-reply'
t = Take(f'{D}/{os.environ.get("TAKE", "take-v3")}')
m = t.marks
dev = Device(t)
W = 600     # page px across: 1.8x, the phone about 70% of the frame
TOP = 340   # centre y that keeps the phone's top edge and some stage above it
KEYS = 470  # centre y that keeps the lifted message, the composer and the whole keyboard in frame

END = m['dismiss'] - 0.05  # the highlight has played out; stop before the tap that drops the keyboard

render(dev, f'{D}/quote-reply-{round(END)}s', aspect='4:5', cover=m['selected'] + 0.3, segments=[
    Segment(0, END, shots=[
        dev.whole(0),
        dev.shot(0.6, 0.9, 196, TOP, W),                    # in, before the finger arrives
        dev.shot(m['selected'] + 0.35, 0.75, 196, KEYS, W),  # down after the selection, before Reply: the flight and keyboard play under a still camera
    ]),
])
