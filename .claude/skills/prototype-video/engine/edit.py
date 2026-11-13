"""Edit a recorded take into platform-ready videos.

A take (from record.mjs) is a folder of frames tagged with real-speed time,
plus every cursor sample, key press and caret position. This file rebuilds
the video from that: camera moves, the real macOS cursor, the caret at its
real blink rate, normal-speed and slow-motion segments, a speed label, and
one encode per platform fed from the same rendered frames (no re-encoding
of an encode).

Write a small edit script per video (see examples/) and run it with the
engine's Python:  ~/.cache/prototype-video/venv/bin/python edit_bell.py [--preview]

    import sys; sys.path.insert(0, '.claude/skills/prototype-video/engine')
    from edit import Take, Segment, render
    t = Take('briefs/refs/lab-masters/bell/take')
    m = t.marks
    render(t, 'briefs/refs/lab-masters/bell/bell', aspect='4:5', segments=[
        Segment(0, m['end'], shots=[(0, 0, 640, 40, 380)]),
        Segment(m['ring'] - 0.3, m['ring'] + 1.4, speed=0.2, label='5× slower',
                shots=[(0, 0, 655, 36, 200)]),
    ])
"""
from __future__ import annotations

import bisect, json, math, os, subprocess, sys
from dataclasses import dataclass, field
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

# Exports. Sizes are what each feed displays, so nothing upscales on the way in.
# fps: X plays 60; LinkedIn and Instagram re-encode to roughly fixed bitrates per
# resolution, so 30fps gives every frame twice the bits and keeps UI text crisp.
# Specs checked Nov 2026 from third-party guides; re-check before relying on them.
PLATFORMS = {
    'x':         dict(fps=60, maxrate='20M'),
    'linkedin':  dict(fps=30, maxrate='20M'),
    'instagram': dict(fps=30, maxrate='10M'),
}
SIZES = {'4:5': (1080, 1350), '1:1': (1080, 1080), '16:9': (1920, 1080), '9:16': (1080, 1920)}
MASTER_FPS = 60

CURSORS = {  # css size and hotspot of each macOS cursor; the PNGs are 10x
    'arrow': ('arrow.png', 17, 23, 4, 4),
    'hand':  ('hand.png', 32, 32, 13, 8),
    'ibeam': ('ibeam.png', 9, 18, 4, 9),
}


def smootherstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * t * (t * (6 * t - 15) + 10)


class Take:
    def __init__(self, path):
        self.path = path
        d = json.load(open(os.path.join(path, 'take.json')))
        self.d = d
        self.frames = d['frames']
        self.vts = [f['vt'] for f in self.frames]
        self.dpr = d['dpr']
        self.marks = d['marks']
        self.clip = d.get('clip') or {'x': 0, 'y': 0, 'width': d['viewport']['width'], 'height': d['viewport']['height']}
        self.theme = d.get('theme', 'light')
        P = self.P = d['pos']
        self.pvt = [p['vt'] for p in P]
        # Debounce the cursor kind: 2–3px gaps between targets would flicker hand/arrow.
        self.kinds, stable, cand, since = [], P[0]['kind'], None, 0
        for p in P:
            if p['kind'] == stable:
                cand = None
            elif p['kind'] != cand:
                cand, since = p['kind'], p['vt']
            elif p['vt'] - since >= 0.07:
                stable, cand = cand, None
            self.kinds.append(stable)
        self.presses = [(P[i]['vt'], P[i]['pressed']) for i in range(1, len(P)) if P[i]['pressed'] != P[i - 1]['pressed']]
        # macOS Chrome's caret: 500ms on / 500ms off, solid again on focus and on every key.
        self.appears = [P[i]['vt'] for i in range(1, len(P)) if P[i]['caret'] and not P[i - 1]['caret']]
        self.resets = sorted(d['keys'] + self.appears)
        self._cache = (None, None)

    def frame(self, t):
        i = min(bisect.bisect_left(self.vts, t), len(self.frames) - 1)
        if i > 0 and abs(self.vts[i - 1] - t) < abs(self.vts[i] - t):
            i -= 1
        name = self.frames[i]['name']
        if self._cache[0] != name:
            self._cache = (name, Image.open(os.path.join(self.path, 'frames', name)).convert('RGB'))
        return self._cache[1]

    def density(self, a, b):
        """Captured frames per real-speed second between a and b."""
        i, j = bisect.bisect_left(self.vts, a), bisect.bisect_right(self.vts, b)
        return (j - i) / max(1e-6, b - a)

    def sample(self, t):
        return min(max(bisect.bisect_left(self.pvt, t), 1), len(self.P) - 1)

    def cursor(self, t):
        i = self.sample(t)
        a, b = self.P[i - 1], self.P[i]
        u = 0 if b['vt'] == a['vt'] else min(1, max(0, (t - a['vt']) / (b['vt'] - a['vt'])))
        x, y = a['x'] + (b['x'] - a['x']) * u, a['y'] + (b['y'] - a['y']) * u
        amt, state, last = 0.0, False, 0
        for (tt, st) in self.presses:
            if tt > t:
                break
            state, last = st, tt
        if self.presses and self.presses[0][0] <= t:
            k = min(1, (t - last) / 0.06)
            k = k * k * (3 - 2 * k)
            amt = k if state else 1 - k
        return x, y, self.kinds[i], amt


@dataclass
class Segment:
    """A stretch of the take. speed 1 = real time, 0.2 = five times slower.

    shots: camera keyframes in take time, (start, move duration, centre x, centre y, view width),
    all in CSS px of the page. The first one is where the camera starts; later ones ease in.
    """
    start: float
    end: float
    speed: float = 1.0
    shots: list = field(default_factory=list)
    label: str | None = None
    cursor: bool = True
    fade_in: float = 0.0  # crossfade from the previous segment, in output seconds

    @property
    def length(self):
        return (self.end - self.start) / self.speed


class Renderer:
    def __init__(self, take, W, H):
        self.t, self.W, self.H, self.aspect = take, W, H, W / H
        self.sprites = {k: (Image.open(os.path.join(HERE, 'cursors', f)).convert('RGBA'), cw, ch, hx, hy)
                        for k, (f, cw, ch, hx, hy) in CURSORS.items()}
        self.font_path = '/System/Library/Fonts/SFNS.ttf'

    def camera(self, seg, t):
        c = self.t.clip
        cur = seg.shots[0][2:]
        for (t0, dur, cx, cy, w) in seg.shots[1:]:
            if t < t0:
                break
            u = smootherstep((t - t0) / dur) if dur else 1
            lw = math.log(cur[2]) + (math.log(w) - math.log(cur[2])) * u  # zoom evenly, not linearly
            cur = (cur[0] + (cx - cur[0]) * u, cur[1] + (cy - cur[1]) * u, math.exp(lw))
        cx, cy, w = cur
        h = w / self.aspect
        w = min(w, c['width'], c['height'] * self.aspect); h = w / self.aspect
        cx = min(max(cx, c['x'] + w / 2), c['x'] + c['width'] - w / 2)
        cy = min(max(cy, c['y'] + h / 2), c['y'] + c['height'] - h / 2)
        return cx, cy, w, h

    def draw_caret(self, fr, t, view):
        T = self.t
        c = T.P[T.sample(t)]['caret']
        if not c:
            return
        j = bisect.bisect_right(T.resets, t) - 1
        if j >= 0 and ((t - T.resets[j]) % 1.0) >= 0.5:
            return
        # The caret lives inside whatever just opened, so it fades in with it (0.2s ease-out).
        a = bisect.bisect_right(T.appears, t) - 1
        u = min(1, (t - T.appears[a]) / 0.2) if a >= 0 else 1
        alpha = 1 - (1 - u) ** 3
        cx, cy, w, h = view
        k = self.W / w
        x0, y0 = (c['x'] - (cx - w / 2)) * k, (c['y'] - (cy - h / 2)) * k
        rgb = tuple(int(float(v)) for v in c['color'][c['color'].index('(') + 1:-1].split(',')[:3])
        layer = Image.new('RGBA', fr.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).rectangle([round(x0), round(y0), round(x0 + max(1, k)) - 1, round(y0 + c['h'] * k) - 1],
                                        fill=rgb + (round(255 * alpha),))
        fr.alpha_composite(layer)

    def draw_cursor(self, fr, t, view):
        x, y, kind, amt = self.t.cursor(t)
        img, cw, ch, hx, hy = self.sprites[kind]
        cx, cy, w, h = view
        k = self.W / w
        s = k * (1 - 0.1 * amt)  # squeezes a little while pressed
        Wc, Hc = max(1, round(cw * s)), max(1, round(ch * s))
        sprite = img.resize((Wc, Hc), Image.LANCZOS)
        ox = (x - (cx - w / 2)) * k - hx * s
        oy = (y - (cy - h / 2)) * k - hy * s
        ix, iy = math.floor(ox), math.floor(oy)  # sub-pixel placement: shift by the remainder
        pad = Image.new('RGBA', (Wc + 2, Hc + 2), (0, 0, 0, 0))
        pad.paste(sprite, (1, 1))
        pad = pad.transform(pad.size, Image.AFFINE, (1, 0, -(ox - ix), 0, 1, -(oy - iy)), resample=Image.BICUBIC)
        layer = Image.new('RGBA', fr.size, (0, 0, 0, 0))
        layer.paste(pad, (ix - 1, iy - 1))
        fr.alpha_composite(layer)

    def draw_label(self, fr, text, alpha):
        if alpha <= 0:
            return
        size = round(self.W * 0.026)  # 28px at 1080 wide
        f = ImageFont.truetype(self.font_path, size)
        try:
            f.set_variation_by_axes([100, 28, 400, 590])  # width, optical size, grade, weight
        except Exception:
            pass
        dark = self.t.theme == 'dark'
        bg = (255, 255, 255) if dark else (31, 35, 40)
        fg = (31, 35, 40) if dark else (255, 255, 255)
        d0 = ImageDraw.Draw(fr)
        l, tp, r, b = d0.textbbox((0, 0), text, font=f)
        px, py = round(size * 0.7), round(size * 0.42)
        bw, bh = (r - l) + 2 * px, (b - tp) + 2 * py
        x0, y0 = (self.W - bw) // 2, self.H - bh - round(self.H * 0.045)
        layer = Image.new('RGBA', fr.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        a = round(255 * alpha)
        d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=bh // 2, fill=bg + (round(a * 0.9),))
        d.text((x0 + px - l, y0 + py - tp), text, font=f, fill=fg + (a,))
        fr.alpha_composite(layer)

    def frame(self, seg, local, out_len):
        t = seg.start + local * seg.speed
        view = self.camera(seg, t)
        cx, cy, w, h = view
        c, D = self.t.clip, self.t.dpr
        box = ((cx - w / 2 - c['x']) * D, (cy - h / 2 - c['y']) * D, (cx + w / 2 - c['x']) * D, (cy + h / 2 - c['y']) * D)
        fr = self.t.frame(t).resize((self.W, self.H), Image.LANCZOS, box=box).convert('RGBA')
        self.draw_caret(fr, t, view)
        if seg.cursor:
            self.draw_cursor(fr, t, view)
        if seg.label:
            # In with the segment, out 0.3s before it ends.
            self.draw_label(fr, seg.label, min(1, local / 0.25, max(0, (out_len - local - 0.3) / 0.25)))
        return fr


def check(take, segments, W):
    """Warn about the things that make a video look cheap before spending a render on it."""
    ok = True
    for n, seg in enumerate(segments):
        need = MASTER_FPS / seg.speed
        have = take.density(seg.start, seg.end)
        if have < need * 0.9:
            ok = False
            print(f'! segment {n}: {have:.0f} captured fps but {need:.0f} needed at speed {seg.speed} '
                  f'— frames will repeat (stutter). Record that part with a higher slow (setSlow).')
        for (t0, dur, cx, cy, w) in seg.shots:
            scale = W / w
            if scale > take.dpr + 0.01:
                ok = False
                print(f'! segment {n} shot at {t0:.2f}s: {scale:.2f} output px per CSS px but captured at dpr {take.dpr} '
                      f'— upscaled, soft. Record with dpr ≥ {math.ceil(scale)} (use clip to keep frames small).')
            if scale < 1.8:
                print(f'  segment {n} shot at {t0:.2f}s: {scale:.2f}× — 12px text lands at {12 * scale:.0f}px. '
                      f'Fine for a brief establishing shot, too small for anything people need to read.')
    return ok


def render(take, out, segments, aspect='4:5', platforms=('linkedin', 'x', 'instagram'), cover=None,
           preview='--preview' in sys.argv, force='--force' in sys.argv):
    """Render once, encode every platform from the same frames. Writes <out>-<platform>.mp4."""
    W, H = SIZES[aspect] if isinstance(aspect, str) else aspect
    if not check(take, segments, W) and not preview and not force:
        print('fix the warnings above, or pass --force'); sys.exit(1)
    if preview:
        W, H = W // 2 // 2 * 2, H // 2 // 2 * 2
        platforms = ('preview',)
    rnd = Renderer(take, W, H)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)

    encoders = []
    for p in platforms:
        cfg = PLATFORMS.get(p, dict(fps=60, maxrate='8M'))
        step = MASTER_FPS // cfg['fps']
        path = f'{out}-{p}.mp4'
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
               '-r', str(cfg['fps']), '-i', '-', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p']
        if preview:
            cmd += ['-preset', 'veryfast', '-crf', '23']
        else:
            # Near-transparent quality, capped under the platform's upload limit.
            cmd += ['-preset', 'slow', '-crf', '12', '-tune', 'animation', '-maxrate', cfg['maxrate'],
                    '-bufsize', str(int(cfg['maxrate'][:-1]) * 2) + 'M', '-g', str(cfg['fps'] * 2)]
        # FFmpeg 9 drops -color_trc on encode, so write the tags into the stream itself (Chrome reads
        # these) and the container's colr atom (Safari reads that). BT.709 is what feed transcoders expect.
        cmd += ['-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',
                '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
                '-movflags', '+faststart', path]
        encoders.append((step, subprocess.Popen(cmd, stdin=subprocess.PIPE), path))

    total = sum(s.length for s in segments)
    n = round(total * MASTER_FPS)
    bounds, acc = [], 0
    for s in segments:
        bounds.append(acc); acc += s.length
    for k in range(n):
        T = k / MASTER_FPS
        i = max(0, bisect.bisect_right(bounds, T) - 1)
        seg, local = segments[i], T - bounds[i]
        fr = rnd.frame(seg, local, seg.length)
        if i > 0 and seg.fade_in and local < seg.fade_in:
            prev = segments[i - 1]
            under = rnd.frame(prev, prev.length + local, prev.length)
            fr = Image.blend(under, fr, smootherstep(local / seg.fade_in))
        data = fr.convert('RGB').tobytes()
        for step, ff, _ in encoders:
            if k % step == 0:
                ff.stdin.write(data)
        if k % 120 == 0:
            print(f'  {T:5.1f}s / {total:.1f}s', flush=True)
    for _, ff, path in encoders:
        ff.stdin.close(); ff.wait()
        print('wrote', path)

    if cover is not None:
        seg = next((s for s in segments if s.start <= cover <= s.end), segments[0])
        rnd.frame(seg, (cover - seg.start) / seg.speed, seg.length).convert('RGB').save(f'{out}-cover.png')
        print('wrote', f'{out}-cover.png')


def sheet(video, out=None, every=0.5, cols=6, width=360):
    """A contact sheet of the finished video, to look at before calling it done."""
    out = out or video.rsplit('.', 1)[0] + '-sheet.jpg'
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video],
                               capture_output=True, text=True, check=True).stdout)
    rows = math.ceil(dur / every / cols)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-vf',
                    f'fps=1/{every},scale={width}:-2,tile={cols}x{rows}:padding=4:color=white', '-frames:v', '1', '-q:v', '3', out],
                   check=True)
    print('wrote', out)
