"""LinkedIn pending-note concept, light, desktop, one looping GIF for every feed (Uzo, 2026-11-27).

A GIF autoplays everywhere with no play button. X takes GIFs up to 1280×1080, 15 MB and 350 frames
(and width × height × frames ≤ 300M through its upload API), so this is one 1280×720 file at a
video-like 33⅓ fps (3 cs a frame, the finest delay every browser honours), from the same renderer
as the MP4s: real cursor, drawn caret, frames sampled at exact real-speed times. gifski merges
identical frames, so the holds cost almost nothing and a ~13s loop stays under the frame limit.

v2 shape (Uzo): the whole LinkedIn window for a second, push in on Maya's card, the edit with the
camera still, the note folded back, the cursor gone, pull back out to the window, loop. The pointer
hides while typing, as macOS does, and comes back when the hand moves to Save.

    WIDTH=1440 ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/pending-note-edit/edit.py [--stills]
"""
import os, sys, shutil, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, Renderer, check

W_WIN = int(os.environ.get('WIDTH', '1440'))
TAKE = os.environ.get('TAKE', f'briefs/refs/lab-masters/pending-note/take-{W_WIN}')
OUT = os.environ.get('OUT', f'briefs/refs/lab-masters/pending-note/edit-a-note-{W_WIN}')
W, H = 1280, 720
CS = 3   # centiseconds a frame: 33⅓ fps
t = Take(TAKE)
m = t.marks
win = t.clip  # the whole window

# Maya's card: 792 wide from a 1200px window up, 632 below. The close-up is the card with 12px of
# page grey either side, and from just above the Received / Sent tabs (y 120) down: the tabs say
# what page this is, then Maya, then Theo's row.
CARD = {1440: (156, 792), 1180: (110, 632)}[W_WIN]
view = CARD[1] + 26
close = (CARD[0] + CARD[1] / 2, 120 + view * H / W / 2, view)
wide = (win['width'] / 2, win['height'] / 2, win['width'])

START, END = 0.0, m['gone'] + 1.0 + 0.3
shots = [(0, 0, *wide), (m['push'], 1.0, *close), (m['gone'], 1.0, *wide)]
segments = [
    Segment(START, m['typing'], shots=shots),
    Segment(m['typing'], m['typed'], shots=shots, cursor=False),   # macOS hides the pointer while typing
    Segment(m['typed'], END, shots=shots),
]
print(f'window {W_WIN}: close-up {view:.0f} CSS px across = {W / view:.2f}×, wide {W / win["width"]:.2f}×')

rnd = Renderer(t, W, H)
bounds, acc = [], 0
for sg in segments:
    bounds.append(acc); acc += sg.length
total = acc

def at(T):
    i = max(k for k, b in enumerate(bounds) if b <= T + 1e-9)
    sg = segments[i]
    return rnd.frame(sg, T - bounds[i], sg.length)

if '--stills' in sys.argv:
    os.makedirs(OUT + '-stills', exist_ok=True)
    for name, T in [('0-start', 0.5), ('1-push', m['push'] + 0.5), ('2-close', m['enter'] + 0.6), ('3-read', m['read']),
                    ('4-typed', m['typed'] - 0.05), ('5-saved', m['save'] + 0.5), ('6-less', m['leave']),
                    ('7-pull', m['gone'] + 0.5), ('8-end', END - 0.02)]:
        at(T - START).convert('RGB').save(f'{OUT}-stills/{name}.png')
    print('stills in', OUT + '-stills', f'({total:.2f}s)')
    sys.exit()

check(t, segments, W)
gif = f'{OUT}-{round(total)}s.gif'
if os.path.exists(gif) and '--overwrite' not in sys.argv:
    print('! exists, may be delivered:', gif); sys.exit(1)
frames = OUT + '-frames'
shutil.rmtree(frames, ignore_errors=True); os.makedirs(frames)
n = int(total / (CS / 100) + 1e-6)
for k in range(n):
    at(k * CS / 100).convert('RGB').save(f'{frames}/{k:04d}.png', compress_level=1)
    if k % 100 == 0:
        print(f'  {k}/{n}', flush=True)
subprocess.run(['gifski', '--quiet', '--fps', f'{100 / CS:.4f}', '--quality', '100', '-W', str(W), '-H', str(H),
                '-o', gif, *sorted(f'{frames}/{f}' for f in os.listdir(frames))], check=True)
shutil.rmtree(frames)  # the rendered PNGs are only an input to gifski
from PIL import Image
g = Image.open(gif)
print('wrote', gif, f'{os.path.getsize(gif) / 1e6:.2f} MB, {g.n_frames} frames stored ({n} rendered) at {100 / CS:.2f} fps, '
      f'{total:.2f}s, {W * H * g.n_frames / 1e6:.0f}M px')
