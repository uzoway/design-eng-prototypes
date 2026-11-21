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
from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

# Exports. Sizes are what each feed displays, so nothing upscales on the way in.
# fps: X plays 60; LinkedIn and Instagram re-encode to roughly fixed bitrates per
# resolution, so 30fps gives every frame twice the bits and keeps UI text crisp.
# Specs checked Nov 2026 from third-party guides; re-check before relying on them.
PLATFORMS = {
    'x':         dict(fps=60, maxrate='20M'),
    'linkedin':  dict(fps=30, maxrate='20M'),
    'instagram': dict(fps=30, maxrate='10M'),
    'contra':    dict(fps=60, maxrate='5M'),  # the upload path to Contra caps files at 10 MB; 5 Mbps keeps a 15s clip under it
}
SIZES = {'4:5': (1080, 1350), '1:1': (1080, 1080), '16:9': (1920, 1080), '9:16': (1080, 1920)}
MASTER_FPS = 60

CURSORS = {  # css size and hotspot of each macOS cursor; the PNGs are 10x
    'arrow': ('arrow.png', 17, 23, 4, 4),
    'hand':  ('hand.png', 32, 32, 13, 8),
    'ibeam': ('ibeam.png', 9, 18, 4, 9),
}
# A real macOS cursor doesn't shrink when you click; the press shows in the UI's own :active state.
# Set above 0 (0.1 was the old default) only if a video needs the click spelled out.
PRESS_SQUEEZE = 0.0
TOUCH_DOT = 32  # css px across: a fingertip-sized dot, smaller than the 44pt hit target so it never hides it


def touch_sprite(dark):
    """The finger: a faint grey disc with a slightly darker rim, drawn at 10x like the cursor PNGs.
    Measured off a reference phone recording: 6% black fill and a ~1px 13% rim over white, no shadow.
    It reads on a busy screen without hiding what's under it. On dark UI it's white instead."""
    n = TOUCH_DOT * 10
    ink = (255, 255, 255) if dark else (0, 0, 0)
    big = Image.new('RGBA', (n, n), ink + (0,))  # transparent in the ink colour, so resizing leaves no fringe
    d = ImageDraw.Draw(big)
    d.ellipse([0, 0, n - 1, n - 1], fill=ink + (round(255 * (0.2 if dark else 0.13)),))
    d.ellipse([10, 10, n - 11, n - 11], fill=ink + (round(255 * (0.1 if dark else 0.065)),))
    return big


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


# ---- iPhone body ------------------------------------------------------------------------------
# iPhone 15 Pro / 16, in points. The take's viewport is the screen (393×852 for pointer: 'touch').
# The screen has 55pt continuous corners. Around it is an 11pt black bezel, then a 3pt titanium band.
# The Dynamic Island is 126×37, 11pt below the screen's top edge.
# Side buttons were measured off an iOS Simulator recording: action, volume up and down on the left, power on the right.
SCREEN_R = 55
BEZEL, BAND = 11, 3
ISLAND = (126, 37, 11)
BUTTONS = [('left', 148, 33), ('left', 209, 62), ('left', 287, 62), ('right', 255, 92)]  # side, top, height (body pt)
BUTTON_OUT = 3
TITANIUM, TITANIUM_EDGE = (58, 58, 61), (118, 118, 123)


def squircle(x0, y0, x1, y1, r, smoothing=0.6, steps=16):
    """A rounded rectangle with Apple's continuous corners: Figma's corner smoothing, which at 60% is
    its iOS preset. Each corner keeps a true circular arc of radius r in the middle and eases into the
    straight edges with two cubic curves, so the rounding starts (1 + smoothing)·r from the corner.
    A plain superellipse reads squarer, like an Android phone. (Figma, "Desperately seeking squircles".)"""
    w, h = x1 - x0, y1 - y0
    p = min((1 + smoothing) * r, min(w, h) / 2)
    arc = 90 * (1 - smoothing)
    arc_len = math.sin(math.radians(arc / 2)) * r * math.sqrt(2)
    alpha = (90 - arc) / 2
    p34 = r * math.tan(math.radians(alpha / 2))
    beta = 45 * smoothing
    c = p34 * math.cos(math.radians(beta))
    d = c * math.tan(math.radians(beta))
    b = (p - arc_len - c - d) / 3
    a = 2 * b

    def cubic(P0, P1, P2, P3):
        return [tuple((1 - u) ** 3 * P0[i] + 3 * (1 - u) ** 2 * u * P1[i] + 3 * (1 - u) * u * u * P2[i] + u ** 3 * P3[i]
                      for i in (0, 1)) for u in (k / steps for k in range(1, steps + 1))]

    # The top-right corner in local coordinates (x right, y down, corner at the origin's top right),
    # then rotated into each corner.
    q0 = (-p, 0)
    q1 = (-p + a + b + c, d)
    corner = cubic(q0, (-p + a, 0), (-p + a + b, 0), q1)
    cx, cy = -r, r  # the arc's centre: the same circle as an ordinary rounded corner
    a0, a1 = math.atan2(q1[1] - cy, q1[0] - cx), math.atan2(q1[1] + arc_len - cy, q1[0] + arc_len - cx)
    corner += [(cx + r * math.cos(a0 + (a1 - a0) * k / steps), cy + r * math.sin(a0 + (a1 - a0) * k / steps)) for k in range(1, steps + 1)]
    q2 = (q1[0] + arc_len, q1[1] + arc_len)
    corner += cubic(q2, (q2[0] + d, q2[1] + c), (q2[0] + d, q2[1] + b + c), (q2[0] + d, q2[1] + a + b + c))  # ends at (0, p)
    pts = [(x1 + u, y0 + v) for (u, v) in [q0] + corner]                    # top right
    pts += [(x1 - v, y1 + u) for (u, v) in [q0] + corner]                   # bottom right
    pts += [(x0 - u, y1 - v) for (u, v) in [q0] + corner]                   # bottom left
    pts += [(x0 + v, y0 - u) for (u, v) in [q0] + corner]                   # top left
    return pts


class Device:
    """A phone take shown as the screen of an iPhone, on a soft light stage. Use it in place of the Take.

        t = Take('briefs/refs/lab-masters/<slug>/take')     # recorded with pointer: 'touch'
        dev = Device(t)
        render(dev, out, aspect='4:5', segments=[Segment(0, m['end'], shots=[
            dev.whole(0),                                   # the whole phone
            dev.shot(m['tap'] - 1.0, 0.9, 196, 520, 470),   # push in: page CSS px, like any shot
            dev.whole(m['back'], 1.0),                      # and out again
        ])])

    Shots are in stage points, so the camera can frame the whole body. dev.shot() takes page coordinates
    like a normal shot and moves them onto the stage. The touch dot and caret are moved the same way.
    """

    def __init__(self, take, bg=((246, 247, 249), (226, 229, 235)), stage=(2400, 1600), shadow=0.16):
        c = take.clip
        if c['x'] or c['y']:
            raise ValueError('Device needs the whole viewport as the screen: record without clip')
        self.t = take
        self.glass = None
        self.dpr = D = take.dpr
        sw, sh = c['width'], c['height']
        bw, bh = sw + 2 * (BEZEL + BAND), sh + 2 * (BEZEL + BAND)
        SW, SH = stage
        self.clip = {'x': 0, 'y': 0, 'width': SW, 'height': SH}
        bx, by = (SW - bw) / 2, (SH - bh) / 2
        self.body = (bx, by, bw, bh)
        self.origin = (bx + BEZEL + BAND, by + BEZEL + BAND)  # the screen's top-left on the stage

        # Stage background: a soft radial wash, lighter behind the phone. Smooth, so 0.5 px/pt is plenty.
        g = Image.radial_gradient('L').resize((SW // 2, SH // 2), Image.BICUBIC)
        g = g.point(lambda v: min(255, int(v * 1.25)))
        self.bg = Image.composite(Image.new('RGB', g.size, bg[1]), Image.new('RGB', g.size, bg[0]), g)
        self.bg_scale = 0.5

        # The body (band, bezel, buttons, shadow) drawn once at 2×dpr and downsampled for clean edges.
        pad = 70
        S = 2 * D
        W0, H0 = round((bw + 2 * pad) * S), round((bh + 2 * pad) * S)
        under = Image.new('RGBA', (W0, H0), (0, 0, 0, 0))
        if shadow:
            sm = Image.new('L', (round(bw + 2 * pad), round(bh + 2 * pad)), 0)
            ImageDraw.Draw(sm).polygon(squircle(pad + 6, pad + 22, pad + bw - 6, pad + bh + 6, SCREEN_R + BEZEL + BAND), fill=round(255 * shadow))
            from PIL import ImageFilter
            sm = sm.filter(ImageFilter.GaussianBlur(28)).resize((W0, H0), Image.BICUBIC)
            under.paste(Image.new('RGBA', (W0, H0), (20, 24, 34, 255)), (0, 0), sm)
        d = ImageDraw.Draw(under)
        P = lambda x, y: (x * S, y * S)
        for side, top, height in BUTTONS:
            x0 = pad - BUTTON_OUT if side == 'left' else pad + bw - 1
            x1 = pad + 1 if side == 'left' else pad + bw + BUTTON_OUT
            d.rounded_rectangle([*P(x0, pad + top), *P(x1, pad + top + height)], radius=1.6 * S, fill=TITANIUM + (255,))
        R0 = SCREEN_R + BEZEL + BAND
        d.polygon([P(*p) for p in squircle(pad, pad, pad + bw, pad + bh, R0)], fill=TITANIUM_EDGE + (255,))
        d.polygon([P(*p) for p in squircle(pad + 0.6, pad + 0.6, pad + bw - 0.6, pad + bh - 0.6, R0 - 0.6)], fill=TITANIUM + (255,))
        d.polygon([P(*p) for p in squircle(pad + BAND, pad + BAND, pad + bw - BAND, pad + bh - BAND, R0 - BAND)], fill=(6, 6, 7, 255))
        self.under = under.resize((round(W0 / 2), round(H0 / 2)), Image.LANCZOS)
        self.under_at = (bx - pad, by - pad)

        # The screen's mask and the Dynamic Island, at the take's dpr.
        m = Image.new('L', (round(sw * S), round(sh * S)), 0)
        ImageDraw.Draw(m).polygon([P(*p) for p in squircle(0, 0, sw, sh, SCREEN_R)], fill=255)
        self.mask = m.resize((round(sw * D), round(sh * D)), Image.LANCZOS)
        iw, ih, iy = ISLAND
        isl = Image.new('RGBA', (round((iw + 4) * S), round((ih + 4) * S)), (0, 0, 0, 0))
        ImageDraw.Draw(isl).rounded_rectangle([*P(2, 2), *P(2 + iw, 2 + ih)], radius=ih / 2 * S, fill=(0, 0, 0, 255))
        self.island = isl.resize((round((iw + 4) * D), round((ih + 4) * D)), Image.LANCZOS)
        self.island_at = (self.origin[0] + (sw - iw) / 2 - 2, self.origin[1] + iy - 2)

    def __getattr__(self, name):  # marks, density, P, sample, theme… come from the take
        return getattr(self.t, name)

    def shot(self, t0, dur, x, y, w):
        """A camera keyframe in page CSS px, moved onto the stage."""
        return (t0, dur, x + self.origin[0], y + self.origin[1], w)

    def whole(self, t0=0, dur=0, aspect='4:5', margin=0.07):
        """A keyframe that shows the whole phone, buttons included, with `margin` of the frame around it."""
        bx, by, bw, bh = self.body
        W, H = SIZES[aspect] if isinstance(aspect, str) else aspect
        w = max((bw + 2 * BUTTON_OUT) / (1 - 2 * margin), bh / (1 - 2 * margin) * W / H)
        return (t0, dur, bx + bw / 2, by + bh / 2, w)

    def cursor(self, t):
        x, y, kind, amt = self.t.cursor(t)
        return x + self.origin[0], y + self.origin[1], kind, amt

    def compose(self, t, view, W, H):
        cx, cy, w, h = view
        k = W / w
        x0, y0 = cx - w / 2, cy - h / 2
        s = self.bg_scale
        fr = self.bg.resize((W, H), Image.BICUBIC, box=(x0 * s, y0 * s, (x0 + w) * s, (y0 + h) * s)).convert('RGBA')
        self._blit(fr, self.under, self.dpr, *self.under_at, x0, y0, k)
        self.glass = self._blit(fr, self.t.frame(t), self.dpr, *self.origin, x0, y0, k, mask=self.mask)
        self._blit(fr, self.island, self.dpr, *self.island_at, x0, y0, k)
        return fr

    @staticmethod
    def _blit(fr, img, s, X, Y, x0, y0, k, mask=None):
        """Draw img (s px per pt, top-left at stage X, Y) into the frame, resampled straight from the
        source so it lands at sub-pixel precision and is never resized twice."""
        W, H = fr.size
        iw, ih = img.size
        dx0, dy0 = max(0, math.floor((X - x0) * k)), max(0, math.floor((Y - y0) * k))
        dx1, dy1 = min(W, math.ceil((X + iw / s - x0) * k)), min(H, math.ceil((Y + ih / s - y0) * k))
        if dx1 <= dx0 or dy1 <= dy0:
            return None
        box = tuple(v for v in ((x0 + dx0 / k - X) * s, (y0 + dy0 / k - Y) * s, (x0 + dx1 / k - X) * s, (y0 + dy1 / k - Y) * s))
        box = (max(0, box[0]), max(0, box[1]), min(iw, box[2]), min(ih, box[3]))
        size = (dx1 - dx0, dy1 - dy0)
        piece = img.resize(size, Image.LANCZOS, box=box)
        alpha = None
        if mask is not None:
            piece = piece.convert('RGBA')
            alpha = mask.resize(size, Image.LANCZOS, box=box)
            piece.putalpha(alpha)
        elif piece.mode != 'RGBA':
            piece = piece.convert('RGBA')
        fr.alpha_composite(piece, (dx0, dy0))
        return alpha, dx0, dy0  # where the glass is in this frame, so the finger can be kept on it


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
        self.sprites['touch'] = (touch_sprite(take.theme == 'dark'), TOUCH_DOT, TOUCH_DOT, TOUCH_DOT / 2, TOUCH_DOT / 2)
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
        w = min(w, c['width'], c['height'] * self.aspect); h = min(w / self.aspect, c['height'])  # float error must not push the box off the frame
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
        ox, oy = T.origin if isinstance(T, Device) else (0, 0)
        x0, y0 = (c['x'] + ox - (cx - w / 2)) * k, (c['y'] + oy - (cy - h / 2)) * k
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
        s = k * (1 - (0 if kind == 'touch' else PRESS_SQUEEZE) * amt)
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
        if isinstance(self.t, Device):
            # A finger only shows where it touches the glass: off the screen it's gone, and it's cut
            # by the rounded corners like everything else on the screen.
            glass = Image.new('L', fr.size, 0)
            if self.t.glass:
                glass.paste(self.t.glass[0], self.t.glass[1:])
            layer.putalpha(ImageChops.multiply(layer.getchannel('A'), glass))
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
        if isinstance(self.t, Device):
            fr = self.t.compose(t, view, self.W, self.H)
        else:
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
        for k, (t0, dur, cx, cy, w) in enumerate(seg.shots):
            scale = W / w
            if scale > take.dpr + 0.01:
                ok = False
                print(f'! segment {n} shot at {t0:.2f}s: {scale:.2f} output px per CSS px but captured at dpr {take.dpr} '
                      f'— upscaled, soft. Record with dpr ≥ {math.ceil(scale)} (use clip to keep frames small).')
            # How long the camera rests on this shot. Anything held is being read, so it needs the
            # reading floor; a wide shot may only be a short establishing or closing beat.
            t1 = seg.shots[k + 1][0] if k + 1 < len(seg.shots) else seg.end
            held = (min(t1, seg.end) - max(t0 + dur, seg.start)) / seg.speed
            if scale < 2.0 and held > 2.0:
                ok = False
                print(f'! segment {n} shot at {t0:.2f}s: {scale:.2f}× held for {held:.1f}s — 12px text lands at '
                      f'{12 * scale:.0f}px. Anything held needs ≥2.0× (2.2× for text people read); keep wide '
                      f'shots to a 1–2s opening or closing beat and push in for the rest.')
            elif scale < 1.8:
                print(f'  segment {n} shot at {t0:.2f}s: {scale:.2f}× — 12px text lands at {12 * scale:.0f}px. '
                      f'Fine for a brief establishing shot, too small for anything people need to read.')
    return ok


def render(take, out, segments, aspect='4:5', platforms=('linkedin', 'x', 'instagram'), cover=None,
           preview='--preview' in sys.argv, force='--force' in sys.argv):
    """Render once, encode every platform from the same frames. Writes <out>-<platform>.mp4."""
    W, H = SIZES[aspect] if isinstance(aspect, str) else aspect
    W, H = W // 2 * 2, H // 2 * 2  # H.264 4:2:0 needs even sides (a native 1179×2556 phone frame becomes 1178×2556)
    if not check(take, segments, W) and not preview and not force:
        print('fix the warnings above, or pass --force'); sys.exit(1)
    if preview:
        W, H = W // 2 // 2 * 2, H // 2 // 2 * 2
        platforms = ('preview',)
    # Never write over a video that may already be delivered or posted. Re-renders get a new name (-v2, -v3).
    if not preview and '--overwrite' not in sys.argv:
        taken = [f'{out}-{p}.mp4' for p in platforms if os.path.exists(f'{out}-{p}.mp4')]
        if cover is not None and os.path.exists(f'{out}-cover.png'):
            taken.append(f'{out}-cover.png')
        if taken:
            print('! these already exist and may be what Uzo posted:', *taken, sep='\n  ')
            print('render to a new name (e.g. add -v2), or pass --overwrite if Uzo said to replace them'); sys.exit(1)
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

    if cover is not None and not preview:  # a preview never writes over the real cover
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
