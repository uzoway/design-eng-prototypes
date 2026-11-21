"""Figma detach overflow: clip, before and after, for a LinkedIn bug write-up. One 16:9 file.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/figma-detach-overflow-clip/edit.py [--preview]

Before (the table slides), the slide again at 4× slower, the close, then After (it stays put).
The camera never moves: the whole analytics view at 2.04×.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render

D = 'briefs/refs/lab-masters/figma-detach-overflow-clip'
t = Take(f'{D}/take')
m = t.marks
VIEW = [(0, 0, 550, 466, 940)]  # x 80–1020, y 202–730: the modal's width, Back button to the table's ninth row

segments = [
    Segment(0, m['settled1'] + 0.2, shots=VIEW, label='Before · overflow: hidden'),
    Segment(m['open1'] - 0.1, m['open1'] + 0.55, speed=0.25, shots=VIEW, label='4× slower', fade_in=0.25),
    Segment(m['settled1'] + 0.2, m['after'], shots=VIEW),
    Segment(m['after'], m['end'], shots=VIEW, label='After · overflow: clip'),
]
length = round(sum((s.end - s.start) / s.speed for s in segments))
render(t, f'{D}/figma-detach-overflow-clip-{length}s', segments, aspect='16:9', platforms=('linkedin',),
       cover=m['rest'] + 0.5)
