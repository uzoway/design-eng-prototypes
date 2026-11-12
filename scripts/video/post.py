"""Camera moves + 60fps square edit from a slow-motion take.

usage: venv/bin/python post.py take2 out.mp4 [--preview]
"""
import bisect, json, math, subprocess, sys
from PIL import Image

take, out = sys.argv[1], sys.argv[2]
preview = '--preview' in sys.argv
d = json.load(open(f'{take}/take.json'))
frames = d['frames']; vts = [f['vt'] for f in frames]
DPR = d['DPR']; VW, VH = d['VIEW']['width'], d['VIEW']['height']
m = d['marks']
SIZE = 540 if preview else 1080
FPS = 60
END = m['end'] - 0.6

# Camera keyframes: (start of move, move duration, centre x, centre y, view width in CSS px).
shots = [
    (0.00, 0.0, 330, 372, 540),                       # open on the graph, already readable
    (m['moveToStart'] + 0.3, 0.9, 300, 322, 400),     # in on the days while the cursor arrives
    (m['up'] - 0.05, 0.8, 302, 482, 540),             # the panel opens below the selection
    (m['toHover'] - 0.15, 0.8, 322, 330, 470),        # hold through the click and wave, then in for the hover
    (m['leave'] + 0.15, 1.1, 476, 462, 780),          # pull out to the whole card
]

def ease(t):  # ease-in-out, a touch softer than cubic
    t = max(0.0, min(1.0, t))
    return t * t * t * (t * (6 * t - 15) + 10)

def camera(t):
    cur = shots[0][2:]
    for (t0, dur, cx, cy, w) in shots[1:]:
        if t < t0:
            break
        u = ease((t - t0) / dur) if dur else 1
        lw = math.log(cur[2]) + (math.log(w) - math.log(cur[2])) * u
        cur = (cur[0] + (cx - cur[0]) * u, cur[1] + (cy - cur[1]) * u, math.exp(lw))
    cx, cy, w = cur
    cx = min(max(cx, w / 2), VW - w / 2); cy = min(max(cy, w / 2), VH - w / 2)
    return cx, cy, w

# ---- cursor, drawn at exact times ----
P = d['pos']; pvt = [p['vt'] for p in P]
CUR = {  # css size and hotspot of each macOS cursor; images are 10x
    'arrow': (Image.open('arrow.png').convert('RGBA'), 17, 23, 4, 4),
    'hand': (Image.open('hand.png').convert('RGBA'), 32, 32, 13, 8),
    'ibeam': (Image.open('ibeam.png').convert('RGBA'), 9, 18, 4, 9),
}
# Debounce the cursor type: the 3px gaps between days would flicker hand/arrow.
kinds = []
stable, cand, since = P[0]['kind'], None, 0
for p in P:
    if p['kind'] == stable:
        cand = None
    elif p['kind'] != cand:
        cand, since = p['kind'], p['vt']
    elif p['vt'] - since >= 0.07:
        stable, cand = cand, None
    kinds.append(stable)
# Press transitions, eased.
presses = [(P[i]['vt'], P[i]['pressed']) for i in range(1, len(P)) if P[i]['pressed'] != P[i - 1]['pressed']]

def cursor_at(t):
    i = min(max(bisect.bisect_left(pvt, t), 1), len(P) - 1)
    a, b = P[i - 1], P[i]
    u = 0 if b['vt'] == a['vt'] else min(1, max(0, (t - a['vt']) / (b['vt'] - a['vt'])))
    x, y = a['x'] + (b['x'] - a['x']) * u, a['y'] + (b['y'] - a['y']) * u
    amt, state = 0.0, False
    for (tt, st) in presses:
        if tt > t: break
        state, last = st, tt
    if presses and presses[0][0] <= t:
        k = min(1, (t - last) / 0.06); k = k * k * (3 - 2 * k)
        amt = k if state else 1 - k
    return x, y, kinds[i], amt

def draw_cursor(frame, t, cx, cy, w):
    x, y, kind, amt = cursor_at(t)
    img, cw, ch, hx, hy = CUR[kind]
    s = SIZE / w * (1 - 0.1 * amt)  # output px per css px, squeezed while pressed
    W, H = max(1, round(cw * s)), max(1, round(ch * s))
    sprite = img.resize((W, H), Image.LANCZOS)
    ox = (x - (cx - w / 2)) * SIZE / w - hx * s
    oy = (y - (cy - w / 2)) * SIZE / w - hy * s
    # Sub-pixel placement: shift the sprite by the fractional part before pasting.
    ix, iy = math.floor(ox), math.floor(oy)
    fx, fy = ox - ix, oy - iy
    pad = Image.new('RGBA', (W + 2, H + 2), (0, 0, 0, 0)); pad.paste(sprite, (1, 1))
    pad = pad.transform(pad.size, Image.AFFINE, (1, 0, -fx, 0, 1, -fy), resample=Image.BICUBIC)
    frame.alpha_composite(pad, (ix - 1, iy - 1)) if ix >= 1 and iy >= 1 else frame.paste(pad, (ix - 1, iy - 1), pad)

ff = subprocess.Popen([
    'ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SIZE}x{SIZE}', '-r', str(FPS), '-i', '-',
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryfast' if preview else 'slow', '-crf', '23' if preview else '14',
    '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', out], stdin=subprocess.PIPE)

n = int(END * FPS)
cache = {}
for k in range(n):
    t = k / FPS
    i = min(bisect.bisect_left(vts, t), len(frames) - 1)
    if i > 0 and abs(vts[i - 1] - t) < abs(vts[i] - t):
        i -= 1
    name = frames[i]['name']
    im = cache.get(name)
    if im is None:
        im = Image.open(f'{take}/frames/{name}').convert('RGB'); cache = {name: im}
    cx, cy, w = camera(t)
    box = ((cx - w / 2) * DPR, (cy - w / 2) * DPR, (cx + w / 2) * DPR, (cy + w / 2) * DPR)
    fr = im.resize((SIZE, SIZE), Image.LANCZOS, box=box).convert('RGBA')
    draw_cursor(fr, t, cx, cy, w)
    ff.stdin.write(fr.convert('RGB').tobytes())
    if k % 120 == 0:
        print(f'{t:5.2f}s', flush=True)
ff.stdin.close(); ff.wait()
print('done', out, n, 'frames')
