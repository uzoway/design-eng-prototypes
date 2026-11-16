"""Paint the baked-in tooltip and hand cursor out of the Time away cover, for the video only.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/contra-schedule/clean-image.py \
        public/contra-schedule/time-away.webp briefs/refs/lab-masters/contra-schedule/time-away-clean.webp

The grid repeats every 28.65px, so 14 columns to the left (401px) lines up to a tenth of a pixel.
The hatched away cell is redrawn from its own stripes. Writes <out>-check.png beside it to look at.
"""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
px = im.load()
W, H = im.size
SHIFT = 401  # 14 columns at 28.65px

# 1. The tooltip: dark box above the grid (y < 512 keeps the hand out of the measurement).
xs, ys = [], []
for y in range(420, 512):
    for x in range(540, 1060):
        r, g, b = px[x, y]
        if r < 60 and g < 60:
            xs.append(x); ys.append(y)
tip = (min(xs) - 4, min(ys) - 4, max(xs) + 5, max(ys) + 5)
# 2. The hand, generous.
hand = (774, 523, 826, 574)

out_im = im.copy()
op = out_im.load()
for (x0, y0, x1, y1) in (tip, hand):
    for y in range(y0, y1):
        for x in range(x0, x1):
            op[x, y] = op[x - SHIFT, y]  # left to right, so a source inside the box is already clean

# 3. Redraw the hatched cell (col 22, Wed row) from its own stripes, shaped like a plain neighbour.
cx0, cy0, cx1, cy1 = 781, 517, 805, 541
# Stripe profile from the visible, hand-free rows: stripes run along x + y = const, period 10.
acc = {u: [0, 0, 0, 0] for u in range(10)}
for y in range(519, 526):
    for x in range(784, 803):
        u = (x + y) % 10
        r, g, b = px[x, y]
        a = acc[u]; a[0] += r; a[1] += g; a[2] += b; a[3] += 1
prof = {u: tuple(round(c / a[3]) for c in a[:3]) for u, a in acc.items()}
# Shape: the cell one column left (plain, same row) gives the rounded mask and its anti-aliased edge.
NEIGH = -29  # one column left; whole-pixel close enough for a 1px edge
fill = 238
for y in range(cy0, cy1):
    for x in range(cx0, cx1):
        n = px[x + NEIGH, y][0]
        alpha = max(0.0, min(1.0, (255 - n) / (255 - fill)))
        s = prof[(x + y) % 10]
        bg = (255, 255, 255)
        op[x, y] = tuple(round(bg[i] * (1 - alpha) + s[i] * alpha) for i in range(3))

print('tooltip box', tip, 'profile', [prof[u][0] for u in range(10)])
out_im.save(out, 'WEBP', quality=92)
out_im.crop((540, 380, 1080, 640)).resize((1080, 520), Image.LANCZOS).save(out.rsplit('.', 1)[0] + '-check.png')
