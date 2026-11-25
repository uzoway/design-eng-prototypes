"""SideShift "Another round" concept, light, 16:9 page tour, real speed, no replay (Uzo, 2026-11-25).
Opens on the whole campaign page (framed like Uzo's screenshot), in on the magnetic hover card along
the Morning routine row, across to the trap's breakout post, back out for the pivot to By creator,
in on Devon K.'s row and the tray, in on the brief as it grows and folds back, and out again.

LinkedIn gets a 4K 30fps file (3840×2160; at 1080p close-ups look soft fullscreen, Bolto 2026-11-24).
X gets 1920×1080 at 60fps, inside its documented upload limit.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/sideshift-another-round/edit.py [--preview]
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, render, sheet

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/sideshift-another-round/take3')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/sideshift-another-round/another-round-16x9')
t = Take(TAKE)
m = t.marks

# (centre x, centre y, view width) in CSS px of the 1700×956 window; height is width × 9/16.
# Every close frame's edges fall in empty space or across a box, never through a line of text
# (take 1 cut the heading, the legend and "Total views" at the edges).
#   whole    the window: strip, header, totals, seven idea rows. Opening and closing beat, and the
#            pivot, where the point is all 6,000 dots moving at once.
#   magnet   x 100–1220, y 326–956: below the legend; the stats row, the rows' labels and the
#            Morning routine row with its hover card (right of the pointer, ~330×210) the whole
#            way along the glide. In By creator the same frame holds Devon K.'s row (Rehire, name,
#            "One creator") and the dock the pick flies into.
#   trap     x 633–1700, y 334–934: POV's amber posts and Devon K.'s card at the window's right
#            edge; the left edge clears "Posts 6,000" and the median pill.
#   brief    x 390–1470, y 348–956: the whole draft brief (x 510–1270, y 544–940) with the rows'
#            labels clear on the left (they end at 388) and the Median column clear on the right.
WHOLE = (850, 478, 1700)      # 2.26× at 4K
MAGNET = (660, 641, 1120)     # 3.43×
TRAP = (1166.5, 634, 1067)    # 3.60× (the capture's dpr)
BRIEF = (930, 652, 1080)      # 3.56×
flow = [
    (0.00, 0.0, *WHOLE),
    (m['enter'] + 0.3, 1.0, *MAGNET),     # in as the cursor comes up the label column
    (m['toTrap'], 0.9, *TRAP),            # across with the cursor to the breakout post
    (m['trap'], 1.0, *WHOLE),             # out while the cursor goes over the field to By creator
    (m['pivoted'] - 0.2, 1.0, *MAGNET),   # in on Devon K.'s row and the dock once the dots land
    (m['rehired'], 1.0, *WHOLE),          # out while the cursor heads up to By idea
    (m['rebriefed'] + 0.3, 1.0, *BRIEF),  # down to the dock while the cursor goes round the field
    (m['gone'], 1.2, *WHOLE),             # out once the cursor has left
]

preview = '--preview' in sys.argv
segments = [Segment(0.3, m['end'] - 0.1, shots=flow)]
if '--x-only' not in sys.argv:
    render(t, OUT, aspect=(3840, 2160), platforms=('linkedin',), preview=preview, segments=segments)
if preview:
    sheet(OUT + '-preview.mp4')
else:
    # The legibility check counts output px per CSS px, so the same shots that pass at 4K read as
    # half that at 1080. Text takes the same share of the frame in both, so on a phone it's the
    # same size; the wide beats are the framing Uzo asked for. Forced for this encode only.
    render(t, OUT + '-1080', aspect='16:9', platforms=('x',), segments=segments, force=True)
