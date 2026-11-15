"""LinkedIn nav, dark, split screen: the whole icon set with motion and with Reduce motion on.
Two takes with the same cursor path. Each is rendered as a tight crop of the bar with the
engine's renderer, and the two bars are stacked close together in the middle of one 4:5
frame, each under its label, then encoded per platform.

    ~/.cache/prototype-video/venv/bin/python .claude/skills/prototype-video/examples/linkedin-reduced-motion/edit.py [--preview]
"""
import os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine'))
from edit import Take, Segment, Renderer, check, sheet, PLATFORMS, MASTER_FPS
from PIL import Image, ImageDraw, ImageFont

BASE = os.environ.get('BASE', 'briefs/refs/lab-masters/linkedin-reduced-motion')
OUT = os.path.join(BASE, 'linkedin-reduced-motion-dark')
top, bot = Take(os.path.join(BASE, 'take-motion')), Take(os.path.join(BASE, 'take-reduced'))
preview = '--preview' in sys.argv

S = 0.5 if preview else 1.0  # the preview is half size
W, H = round(1080 * S), round(1350 * S) // 2 * 2
# The five animated tabs, Home to Notifications, are items 310–710: a 400-wide view holds
# them exactly (Me's label starts at 733.3) at 2.7×, so 12px labels land at 32px. Each crop
# is just the 52px bar plus 6px either side, so the bars aren't lost in empty black.
VIEW = (510, 450, 400)
BAR = round(W * 64 / 400)

# Line the takes up on the notification; they were planned on the same clock, so it's ~0.
mt, mb = top.marks, bot.marks
off = mb['ring'] - mt['ring']
start = max(0.0, -off)
end = min(mt['end'], mb['end'] - off)
seg_top = Segment(start, end, shots=[(0, 0, *VIEW)])
seg_bot = Segment(start + off, end + off, shots=[(0, 0, *VIEW)])
ok = check(top, [seg_top], 1080) & check(bot, [seg_bot], 1080)
if not ok and not preview:
    sys.exit('fix the warnings above')

r_top, r_bot = Renderer(top, W, BAR), Renderer(bot, W, BAR)

size = round(36 * S)  # readable on a phone
font = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', size)
try:
    font.set_variation_by_axes([100, 28, 400, 590])
except Exception:
    pass
PX, PY = round(size * 0.7), round(size * 0.42)
_l, _t, _r, _b = ImageDraw.Draw(Image.new('RGB', (1, 1))).textbbox((0, 0), 'Reduce motion', font=font)
PILL = (_b - _t) + 2 * PY
GAP_LABEL, GAP_PAIR = round(22 * S), round(70 * S)

# Label, bar, gap, label, bar: centred as one group, so the eye only travels a short way.
group = 2 * (PILL + GAP_LABEL + BAR) + GAP_PAIR
y0 = (H - group) // 2
Y_TOP_PILL, Y_TOP_BAR = y0, y0 + PILL + GAP_LABEL
Y_BOT_PILL = Y_TOP_BAR + BAR + GAP_PAIR
Y_BOT_BAR = Y_BOT_PILL + PILL + GAP_LABEL


def pill(fr, text, y):
    """A quiet label centred above a bar: white text on a faint white pill."""
    d0 = ImageDraw.Draw(fr)
    l, tp, r, b = d0.textbbox((0, 0), text, font=font)
    bw = (r - l) + 2 * PX
    x0 = (W - bw) // 2
    layer = Image.new('RGBA', fr.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([x0, y, x0 + bw, y + PILL], radius=PILL // 2, fill=(255, 255, 255, 36))
    d.text((x0 + PX - l, y + PY - tp), text, font=font, fill=(255, 255, 255, 235))
    fr.alpha_composite(layer)


def frame(local):
    fr = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    fr.paste(r_top.frame(seg_top, local, seg_top.length), (0, Y_TOP_BAR))
    fr.paste(r_bot.frame(seg_bot, local, seg_bot.length), (0, Y_BOT_BAR))
    pill(fr, 'Motion', Y_TOP_PILL)
    pill(fr, 'Reduce motion', Y_BOT_PILL)
    return fr


def encoder(p):
    cfg = PLATFORMS.get(p, dict(fps=60, maxrate='8M'))
    path = f'{OUT}-{p}.mp4'
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
           '-r', str(cfg['fps']), '-i', '-', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p']
    if preview:
        cmd += ['-preset', 'veryfast', '-crf', '23']
    else:  # same settings as the engine's render()
        cmd += ['-preset', 'slow', '-crf', '12', '-tune', 'animation', '-maxrate', cfg['maxrate'],
                '-bufsize', str(int(cfg['maxrate'][:-1]) * 2) + 'M', '-g', str(cfg['fps'] * 2)]
    cmd += ['-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
            '-movflags', '+faststart', path]
    return MASTER_FPS // cfg['fps'], subprocess.Popen(cmd, stdin=subprocess.PIPE), path


encoders = [encoder(p) for p in (('preview',) if preview else ('linkedin', 'x', 'instagram'))]
n = round(seg_top.length * MASTER_FPS)
for k in range(n):
    data = frame(k / MASTER_FPS).convert('RGB').tobytes()
    for step, ff, _ in encoders:
        if k % step == 0:
            ff.stdin.write(data)
for _, ff, path in encoders:
    ff.stdin.close(); ff.wait()
    print('wrote', path)

frame(mt['ring'] + 0.3 - start).convert('RGB').save(f'{OUT}-cover.png')
print('wrote', f'{OUT}-cover.png', f'({seg_top.length:.2f}s, takes offset {off:+.3f}s)')
if preview:
    sheet(f'{OUT}-preview.mp4', every=0.25)
