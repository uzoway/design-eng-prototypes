"""Contra schedule popover, before and after 32d144c, side by side (the craft-post layout in
STANDARDS.md > Packaging): a 16:10 canvas, the two takes in sync, a mono caption, Before and
After pills with each version's setting, a hard cut to the Back moment at 4× slower, and a
hard cut back to rest so the loop is seamless.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/contra-popover-height/edit.py [--preview]

The engine's render() takes one take, so this composes two with its Renderer and encodes
the same way (one render, an encode per platform). X 60fps, LinkedIn 30fps.
"""
import os, sys, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from PIL import Image, ImageDraw, ImageFont
from edit import Take, Segment, Renderer, PLATFORMS, MASTER_FPS, check, sheet

D = 'briefs/refs/lab-masters/contra-popover-height'
before, after = Take(f'{D}/take-before'), Take(f'{D}/take-after')
for k in before.marks:  # same seed and layout, so the two takes must line up
    assert abs(before.marks[k] - after.marks[k]) < 0.01, (k, before.marks[k], after.marks[k])
m = before.marks

PREVIEW = '--preview' in sys.argv
S = 0.5 if PREVIEW else 1  # the preview renders at half size
W, H = round(1920 * S) // 2 * 2, round(1200 * S) // 2 * 2
LEN = 9  # seconds, rounded, for the file name
OUT = f'{D}/contra-popover-height-{LEN}s'

# Layout in 1920×1200 px.
MARGIN, GUTTER, TOP, PANEL_H = 28, 32, 112, 980
PANEL_W = (1920 - 2 * MARGIN - GUTTER) // 2          # 916
# Each panel shows 458 CSS px across (2.0×): the clock and Post on top, the popover with the
# calendar below (y 365–857 of the 1100×900 window).
VIEW = (660, 611, 458)  # 916 / 458 = 2.0×
CAPTION = 'schedule-popover.tsx · the height when the view changes'
SIDES = [('Before', 'spring, 0.28s', before), ('After', 'ease-out, 0.24s', after)]

INK, MUTED, CANVAS = (31, 35, 40), (101, 109, 118), (238, 240, 243)
mono = lambda px: ImageFont.truetype('/System/Library/Fonts/SFNSMono.ttf', round(px * S))


def sans(px, weight=590):
    f = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', round(px * S))
    try:
        f.set_variation_by_axes([100, min(max(px, 17), 96), 400, weight])
    except Exception:
        pass
    return f


def segments():
    return [
        Segment(0, m['gone'] + 0.55, shots=[(0, 0, *VIEW)]),                                 # real speed
        Segment(m['back'] - 0.1, m['back'] + 0.5, speed=0.25, shots=[(0, 0, *VIEW)]),       # Back, 4× slower
        Segment(m['gone'] + 0.05, m['gone'] + 0.65, shots=[(0, 0, *VIEW)]),                 # rest: loops into frame 1
    ]


SEGS = segments()
REPLAY = 1
pw, ph = round(PANEL_W * S), round(PANEL_H * S)
renderers = [Renderer(t, pw, ph) for (_, _, t) in SIDES]

# Everything that doesn't move, drawn once.
base = Image.new('RGBA', (W, H), CANVAS + (255,))
d = ImageDraw.Draw(base)
d.text((round(MARGIN * S), round(60 * S)), CAPTION, font=mono(26), fill=MUTED, anchor='lm')
mask = Image.new('L', (pw, ph), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=round(20 * S), fill=255)
xs = [round(MARGIN * S), round((MARGIN + PANEL_W + GUTTER) * S)]
for i, (name, spec, _) in enumerate(SIDES):
    x0, y0 = xs[i], round(TOP * S)
    d.rounded_rectangle([x0 - 1, y0 - 1, x0 + pw, y0 + ph], radius=round(21 * S), fill=(222, 225, 230))
    # The pill (dark for After) and the setting in mono beside it, centred under the panel.
    f, fm = sans(26), mono(24)
    l, t_, r, b = d.textbbox((0, 0), name, font=f)
    px, py = round(18 * S), round(10 * S)
    bw, bh = (r - l) + 2 * px, (b - t_) + 2 * py
    sw = d.textlength(spec, font=fm)
    gap = round(14 * S)
    gx = x0 + (pw - (bw + gap + sw)) / 2
    gy = round((TOP + PANEL_H + 46) * S)
    dark = name == 'After'
    d.rounded_rectangle([gx, gy - bh / 2, gx + bw, gy + bh / 2], radius=bh / 2,
                        fill=INK if dark else (255, 255, 255), outline=None if dark else (214, 218, 224), width=max(1, round(S)))
    d.text((gx + px - l, gy - (b + t_) / 2), name, font=f, fill=(255, 255, 255) if dark else INK)
    d.text((gx + bw + gap, gy), spec, font=fm, fill=MUTED, anchor='lm')


def slow_pill(fr, alpha):
    if alpha <= 0:
        return
    text, f = '4× slower', sans(24)
    layer = Image.new('RGBA', fr.size, (0, 0, 0, 0))
    dd = ImageDraw.Draw(layer)
    l, t_, r, b = dd.textbbox((0, 0), text, font=f)
    px, py = round(16 * S), round(9 * S)
    bw, bh = (r - l) + 2 * px, (b - t_) + 2 * py
    x1, cy = W - round(MARGIN * S), round(60 * S)
    a = round(255 * alpha)
    dd.rounded_rectangle([x1 - bw, cy - bh / 2, x1, cy + bh / 2], radius=bh / 2, fill=INK + (round(a * 0.92),))
    dd.text((x1 - bw + px - l, cy - (b + t_) / 2), text, font=f, fill=(255, 255, 255, a))
    fr.alpha_composite(layer)


def compose(i, local):
    seg = SEGS[i]
    fr = base.copy()
    for k, r in enumerate(renderers):
        fr.paste(r.frame(seg, local, seg.length).convert('RGB'), (xs[k], round(TOP * S)), mask)
    if i == REPLAY:
        slow_pill(fr, min(1, local / 0.25, max(0, (seg.length - local - 0.3) / 0.25)))
    return fr.convert('RGB')


if not all(check(t, SEGS, PANEL_W) for (_, _, t) in SIDES) and not PREVIEW and '--force' not in sys.argv:
    print('fix the warnings above, or pass --force'); sys.exit(1)

platforms = ('preview',) if PREVIEW else ('x', 'linkedin')
paths = [f'{OUT}-{p}.mp4' for p in platforms] + ([] if PREVIEW else [f'{OUT}-cover.png'])
if not PREVIEW and '--overwrite' not in sys.argv and any(os.path.exists(p) for p in paths):
    print('! already exists and may be delivered:', *[p for p in paths if os.path.exists(p)], sep='\n  ')
    print('render to a new name, or pass --overwrite if Uzo said to replace them'); sys.exit(1)

encoders = []
for p in platforms:
    cfg = PLATFORMS.get(p, dict(fps=60, maxrate='8M'))
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(cfg['fps']),
           '-i', '-', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p']
    cmd += (['-preset', 'veryfast', '-crf', '23'] if PREVIEW else
            ['-preset', 'slow', '-crf', '12', '-tune', 'animation', '-maxrate', cfg['maxrate'],
             '-bufsize', str(int(cfg['maxrate'][:-1]) * 2) + 'M', '-g', str(cfg['fps'] * 2)])
    cmd += ['-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
            '-movflags', '+faststart', f'{OUT}-{p}.mp4']
    encoders.append((MASTER_FPS // cfg['fps'], subprocess.Popen(cmd, stdin=subprocess.PIPE), f'{OUT}-{p}.mp4'))

total = sum(s.length for s in SEGS)
n = round(total * MASTER_FPS)
starts = [sum(s.length for s in SEGS[:i]) for i in range(len(SEGS))]
for k in range(n):
    T = k / MASTER_FPS
    i = max(j for j in range(len(SEGS)) if starts[j] <= T + 1e-9)
    data = compose(i, T - starts[i]).tobytes()
    for step, ff, _ in encoders:
        if k % step == 0:
            ff.stdin.write(data)
    if k % 120 == 0:
        print(f'  {T:4.1f}s / {total:.1f}s', flush=True)
for _, ff, path in encoders:
    ff.stdin.close(); ff.wait(); print('wrote', path)

if PREVIEW:
    sheet(f'{OUT}-preview.mp4', every=0.25, cols=6, width=480)
else:
    # The cover makes the argument on its own: Back at 4× slower, Before's picks in while its box still shrinks.
    compose(REPLAY, (0.1 + 0.16) / 0.25).save(f'{OUT}-cover.png')
    print('wrote', f'{OUT}-cover.png')
