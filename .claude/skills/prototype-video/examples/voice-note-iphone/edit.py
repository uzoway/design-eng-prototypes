"""The iPhone body: whole phone, push in for the tap, back out to the whole phone.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/voice-note-iphone/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Device, Segment, render

D = 'briefs/refs/lab-masters/voice-note-iphone'
t = Take(f'{D}/take')
m = t.marks
dev = Device(t)
render(dev, f'{D}/voice-note-iphone-5s', aspect='4:5', platforms=('linkedin',), segments=[
    Segment(0, m['end'], shots=[dev.whole(0), dev.shot(0.9, 0.9, 196, 560, 470), dev.whole(m['gone'] - 0.2, 1.0)]),
])
