"""LinkedIn nav, dark, split screen: the same moment with motion (top) and with Reduce motion
on (bottom). Two takes with the same cursor path, each rendered as a 1080×585 half with the
engine's renderer under a 90px label strip, stacked into one 4:5 frame, encoded per platform.

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

W, STRIP, HALF = (540, 45, 292) if preview else (1080, 90, 585)
H = 2 * (STRIP + HALF)
# The labels sit in their own strips, so the camera can push right in without covering them.
# WIDE: Messaging, Notifications and Me, whole (~4.3×), so both halves read as LinkedIn.
# CLOSE: 96 wide runs 622–718, between "Messaging" (ends 620.5) and "Me" (starts 733.3):
# the bell dead centre at ~11×, its badge, label and underline whole, the bar edge to edge.
BELL = (670, 450)
WIDE, CLOSE = 250, 96

# Line the takes up on the notification; they were planned on the same clock, so it's ~0.
mt, mb = top.marks, bot.marks
off = mb['ring'] - mt['ring']
start = max(0.0, -off)
end = min(mt['end'], mb['end'] - off)
def shots(dt):
    return [(dt, 0, *BELL, WIDE), (mt['push'] + dt, 0.9, *BELL, CLOSE)]  # settled 0.35s before the bell


seg_top = Segment(start, end, shots=shots(0))
seg_bot = Segment(start + off, end + off, shots=shots(off))
ok = check(top, [seg_top], 1080) & check(bot, [seg_bot], 1080)
if not ok and not preview:
    sys.exit('fix the warnings above')

r_top, r_bot = Renderer(top, W, HALF), Renderer(bot, W, HALF)

size = round(W * 0.033)  # 36px at 1080: readable on a phone
font = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', size)
try:
    font.set_variation_by_axes([100, 28, 400, 590])
except Exception:
    pass


def pill(fr, text, y_top):
    """A quiet label at the top centre of a half: white text on a faint white pill."""
    d0 = ImageDraw.Draw(fr)
    l, tp, r, b = d0.textbbox((0, 0), text, font=font)
    px, py = round(size * 0.7), round(size * 0.42)
    bw, bh = (r - l) + 2 * px, (b - tp) + 2 * py
    x0, y0 = (W - bw) // 2, y_top + (STRIP - bh) // 2
    layer = Image.new('RGBA', fr.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=bh // 2, fill=(255, 255, 255, 36))
    d.text((x0 + px - l, y0 + py - tp), text, font=font, fill=(255, 255, 255, 235))
    fr.alpha_composite(layer)


def frame(local):
    fr = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    fr.paste(r_top.frame(seg_top, local, seg_top.length), (0, STRIP))
    fr.paste(r_bot.frame(seg_bot, local, seg_bot.length), (0, 2 * STRIP + HALF))
    pill(fr, 'Motion', 0)
    pill(fr, 'Reduce motion', STRIP + HALF)
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
