"""LinkedIn pending-note concept, light, desktop, one GIF for every feed (Uzo, 2026-11-27).

A GIF autoplays everywhere with no play button. X takes GIFs up to 1280×1080, 15 MB and 350 frames
(and width × height × frames ≤ 300M through its upload API), so this is one 1280-wide file at a
video-like 33⅓ fps (3 cs a frame, the finest delay every browser honours), from the same renderer
as the MP4s: real cursor, drawn caret, frames sampled at exact real-speed times.

The camera is locked on Maya's card (Emil Kowalski's packaging: one component, a clean frame 1 with
no cursor, the hand in from the bottom-right and out again before the loop). The pointer hides while
typing, as macOS does, and comes back when the hand moves to Save.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/pending-note-edit/edit.py [--stills] [--fps 33.333]
"""
import os, sys, shutil, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, Renderer, check

TAKE = os.environ.get('TAKE', 'briefs/refs/lab-masters/pending-note/take3')
OUT = os.environ.get('OUT', 'briefs/refs/lab-masters/pending-note/edit-a-note')
W, H = (int(v) for v in os.environ.get('SIZE', '1280x720').split('x'))
CS = int(os.environ.get('CS', '3'))   # centiseconds a frame: 3 = 33⅓ fps
t = Take(TAKE)
m = t.marks

# The card is x 83–717 in the 1128-wide window; 12px of page grey either side of it. Vertically
# y 120–490: the Received / Sent tabs on top (they say what page this is), Maya, and Theo's row
# down to its divider at rest; the editor pushes Theo down past the edge while it's open.
VIEW = float(os.environ.get('VIEW', '658'))
CX = 400
CY = float(os.environ.get('CY', '305'))
shot = [(0, 0, CX, CY, VIEW)]
START = float(os.environ.get('START', '0.4'))
END = m['gone'] + float(os.environ.get('TAIL', '0.6'))
segments = [
    Segment(START, m['typing'], shots=shot),
    Segment(m['typing'], m['typed'], shots=shot, cursor=False),   # macOS hides the pointer while typing
    Segment(m['typed'], END, shots=shot),
]

rnd = Renderer(t, W, H)
bounds, acc = [], 0
for sg in segments:
    bounds.append(acc); acc += sg.length
total = acc

def at(T):
    i = max(0, max(k for k, b in enumerate(bounds) if b <= T + 1e-9))
    sg = segments[i]
    return rnd.frame(sg, T - bounds[i], sg.length)

if '--stills' in sys.argv:
    os.makedirs(OUT + '-stills', exist_ok=True)
    for name in ('start', 'more', 'read', 'editing', 'typed', 'save', 'leave', 'end'):
        T = (m.get(name, 0) if name not in ('start', 'end') else (START if name == 'start' else END - 0.01)) - START
        T = min(max(T + (0.45 if name in ('more', 'save') else 0), 0), total - 0.01)
        at(T).convert('RGB').save(f'{OUT}-stills/{name}.png')
    print('stills in', OUT + '-stills', f'({total:.2f}s)')
    sys.exit()

ok = check(t, segments, W)
gif = f'{OUT}-{total:.0f}s.gif'
if os.path.exists(gif) and '--overwrite' not in sys.argv:
    print('! exists, may be delivered:', gif); sys.exit(1)
frames = OUT + '-frames'
shutil.rmtree(frames, ignore_errors=True); os.makedirs(frames)
n = int(total / (CS / 100) + 1e-6)
for k in range(n):
    at(k * CS / 100).convert('RGB').save(f'{frames}/{k:04d}.png', compress_level=1)
    if k % 50 == 0:
        print(f'  {k}/{n}', flush=True)
fps = 100 / CS
subprocess.run(['gifski', '--quiet', '--fps', f'{fps:.4f}', '--quality', os.environ.get('Q', '100'), '-W', str(W), '-H', str(H),
                '-o', gif, *sorted(f'{frames}/{f}' for f in os.listdir(frames))], check=True)
print('wrote', gif, f'{os.path.getsize(gif) / 1e6:.2f} MB, {n} frames rendered at {fps:.2f} fps, {total:.2f}s')
