"""Procedural pixel art for the Cadence site.

    python3 art/generate.py

Writes the static images (hero.png, harbour.png, lighthouse.png) and the
layers the animated hero composites in the browser (art/hero/*.png +
meta.json). Deterministic: the same code always draws the same pictures.

Technique, roughly how a pixel artist shades by hand:
  * every material has a hue-shifted ramp (shadows lean blue/teal,
    highlights lean yellow/warm), never just lighter/darker of one colour;
  * round forms (clouds, leaf clumps, rocks) are clusters of spheres lit
    from the upper right, quantised to the ramp, with a checker dither only
    on the boundary between two tones;
  * distance fades colours toward the horizon (aerial perspective);
  * skies are clean bands with a narrow dithered seam between them.
"""
import json
import os

import numpy as np
from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
PAGE = (245, 245, 242)
CHECK = np.array([[0.0, 0.5], [0.75, 0.25]])
LIGHT = np.array([0.55, -0.62, 0.56])
LIGHT = LIGHT / np.linalg.norm(LIGHT)


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)


def ramp(*cols):
    return np.stack([hexc(c) for c in cols])


def mix(a, b, t):
    return (np.asarray(a, float) * (1 - t) + np.asarray(b, float) * t).astype(np.uint8)


def value_noise(w, h, cell, rng):
    gw, gh = w // cell + 2, h // cell + 2
    g = rng.random((gh, gw))
    ys, xs = np.mgrid[0:h, 0:w]
    fx, fy = xs / cell, ys / cell
    x0, y0 = fx.astype(int), fy.astype(int)
    tx, ty = fx - x0, fy - y0
    tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    a, b = g[y0, x0], g[y0, x0 + 1]
    c, d = g[y0 + 1, x0], g[y0 + 1, x0 + 1]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty


def fbm1d(w, cell, rng, octaves=4):
    out, amp, tot = np.zeros(w), 1.0, 0.0
    for _ in range(octaves):
        out += amp * value_noise(w, 1, max(1, cell), rng)[0]
        tot += amp
        amp *= 0.5
        cell //= 2
    return out / tot


# Ramps ---------------------------------------------------------------
SKY = ramp('#1a78d8', '#1f86e2', '#2793ea', '#33a0ef', '#45aef2', '#5bbbf4', '#74c7f5', '#90d3f6')
CLOUD = ramp('#6aa6dc', '#86b9e6', '#a3cbee', '#bfdcf4', '#d8eaf8', '#ecf6fc', '#ffffff')
LEAF = ramp('#123a35', '#1b4f40', '#25663f', '#357f3f', '#4f9a3c', '#73b53f', '#a3cf4f')
LEAF_FAR = ramp('#3f7d6b', '#4f8f6c', '#64a26c', '#7fb66f', '#9ccb78')
GRASS = ramp('#1d4d3c', '#2a6640', '#3d8240', '#579e3f', '#77b843', '#9bcf52', '#c3e26a')
BARK = ramp('#2e2121', '#46302a', '#5f4334', '#7a5a42', '#977552', '#b39266')
PATH = ramp('#8a6a4c', '#a8835c', '#c29d72', '#d6b88c')
WOOD = ramp('#4a2c1c', '#6b4127', '#8a5634', '#a86c40', '#c4874f')
STEEL = ramp('#121116', '#1c1b22', '#26252e', '#34333e', '#4a4956', '#6b6a78')
ROCK = ramp('#2b2836', '#3d3949', '#55505f', '#706a7a', '#8d8796', '#aaa4b1')
TERRA = ramp('#6b2f1f', '#8f3f26', '#b2552f', '#cc7044')
STATUS = {'blue': '#3b82f6', 'amber': '#f2a20c', 'green': '#22b357', 'idle': '#6b6a78'}


class Layer:
    """An RGBA pixel buffer."""

    def __init__(self, w, h, seed, opaque=False):
        self.w, self.h = w, h
        self.rgb = np.zeros((h, w, 3), np.uint8)
        self.a = np.full((h, w), 255 if opaque else 0, np.uint8)
        self.rng = np.random.default_rng(seed)
        self.ys, self.xs = np.mgrid[0:h, 0:w]

    def put(self, mask, color):
        c = hexc(color) if isinstance(color, str) else color
        self.rgb[mask] = c
        self.a[mask] = 255

    def put_px(self, mask, rgb):
        self.rgb[mask] = rgb[mask]
        self.a[mask] = 255

    def rect(self, x, y, w, h, color):
        x0, y0 = max(0, int(x)), max(0, int(y))
        x1, y1 = min(self.w, int(x + w)), min(self.h, int(y + h))
        if x1 > x0 and y1 > y0:
            self.rgb[y0:y1, x0:x1] = hexc(color) if isinstance(color, str) else color
            self.a[y0:y1, x0:x1] = 255

    def px(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.rgb[int(y), int(x)] = hexc(color) if isinstance(color, str) else color
            self.a[int(y), int(x)] = 255

    def over(self, other):
        m = other.a > 0
        self.rgb[m] = other.rgb[m]
        self.a[m] = 255

    def image(self, scale=1, alpha=True):
        arr = np.dstack([self.rgb, self.a]) if alpha else self.rgb
        img = Image.fromarray(arr, 'RGBA' if alpha else 'RGB')
        if scale != 1:
            img = img.resize((self.w * scale, self.h * scale), Image.NEAREST)
        return img

    def save(self, name, scale=1, alpha=True):
        path = os.path.join(OUT, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.image(scale, alpha).save(path, optimize=True)
        return path


def quantise(lum, n, ys, xs, dither=0.55):
    """Map 0..1 light to a ramp index with a checker seam between tones."""
    v = np.clip(lum, 0, 0.999) * n
    return np.clip(np.floor(v + (CHECK[ys % 2, xs % 2] - 0.375) * dither), 0, n - 1).astype(int)


def box_blur(a, r):
    for axis in (0, 1):
        c = np.cumsum(np.pad(a, [(r + 1, r) if i == axis else (0, 0) for i in (0, 1)], mode='edge'), axis=axis)
        a = (np.take(c, range(2 * r + 1, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - 2 * r - 1), axis=axis)) / (2 * r + 1)
    return a


def spheres(layer, balls, jag=0.0, flat_base=None, ao=0.35, ambient=0.28, z_bias=None, smooth=0):
    """Light a cluster of spheres. Returns (mask, lum) over the layer."""
    h, w = layer.h, layer.w
    Z = np.full((h, w), -1e9)
    N = np.zeros((h, w, 3))
    rng = layer.rng
    for i, (cx, cy, r) in enumerate(balls):
        x0, x1 = int(max(0, cx - r * 1.3)), int(min(w, cx + r * 1.3 + 1))
        y0, y1 = int(max(0, cy - r * 1.3)), int(min(h, cy + r * 1.3 + 1))
        if x1 <= x0 or y1 <= y0:
            continue
        ys, xs = np.mgrid[y0:y1, x0:x1]
        dx, dy = xs - cx, ys - cy
        rr = np.full(dx.shape, float(r))
        if jag:
            ang = np.arctan2(dy, dx)
            ph = rng.random() * 6.28
            k = rng.integers(5, 9)
            rr = r * (1 + jag * (0.55 * np.sin(ang * k + ph) + 0.45 * (rng.random(dx.shape) - 0.5)))
        d2 = dx * dx + dy * dy
        inside = d2 < rr * rr
        z = np.sqrt(np.clip(rr * rr - d2, 0, None)) + (z_bias(i, cx, cy, r) if z_bias else r * 0.15)
        sub = Z[y0:y1, x0:x1]
        win = inside & (z > sub)
        sub[win] = z[win]
        n = np.dstack([dx / rr, dy / rr, np.sqrt(np.clip(1 - d2 / (rr * rr), 0, 1))])
        N[y0:y1, x0:x1][win] = n[win]
    mask = Z > -1e8
    if flat_base is not None:
        mask &= layer.ys <= flat_base
    if smooth:
        Hf = np.where(mask, Z, 0.0)
        for _ in range(2):
            Hf = box_blur(Hf, smooth)
        gy, gx = np.gradient(Hf)
        n = np.dstack([-gx, -gy, np.full(gx.shape, 0.9)])
        N = n / np.linalg.norm(n, axis=2, keepdims=True)
        # flatten the light near the silhouette so edges stay bright on top
    lum = ambient + (1 - ambient) * np.clip(N @ LIGHT, 0, 1)
    if mask.any():
        top, bot = layer.ys[mask].min(), layer.ys[mask].max()
        rel = (layer.ys - top) / max(1, bot - top)
        lum = lum - ao * np.clip(rel, 0, 1) ** 1.6
    return mask, lum


def shade(layer, mask, lum, rmp, dither=0.55, rim=None):
    idx = quantise(lum, len(rmp), layer.ys, layer.xs, dither)
    rgb = rmp[idx]
    layer.put_px(mask, rgb)
    if rim is not None:
        edge = mask & ~np.roll(mask, 1, 0) & (lum > 0.72)
        layer.put(edge, rim)


def sky(layer, rmp, y0, y1, glow=None):
    t = (layer.ys - y0) / max(1, y1 - y0)
    lum = np.clip(t, 0, 1)
    if glow is not None:
        gx, gy, gr, ga = glow
        d = np.sqrt((layer.xs - gx) ** 2 + ((layer.ys - gy) * 1.4) ** 2) / gr
        lum = lum + ga * np.clip(1 - d, 0, 1) ** 2
    idx = quantise(lum, len(rmp), layer.ys, layer.xs, dither=0.45)
    m = layer.ys < y1
    layer.put_px(m, rmp[idx])


def cloud(layer, cx, base, width, height, rmp=CLOUD, puffs=None, seed=0):
    rng = np.random.default_rng(seed)
    balls = []
    n = puffs or max(4, int(width / (height * 0.55)))
    for i in range(n):
        t = i / (n - 1)
        r = height * (0.38 + 0.62 * np.sin(np.pi * (0.1 + 0.8 * t))) * (0.75 + 0.35 * rng.random())
        x = cx - width / 2 + t * width + (rng.random() - 0.5) * height * 0.3
        balls.append((x, base - r * 0.7 + rng.random() * 2, r))
    # a second row of smaller puffs on top for lumpy silhouettes
    for i in range(n):
        t = 0.12 + 0.76 * rng.random()
        r = height * (0.2 + 0.22 * rng.random())
        balls.append((cx - width / 2 + t * width, base - height * (0.75 + 0.3 * rng.random()), r))
    mask, lum = spheres(layer, balls, flat_base=base, ao=0.38, ambient=0.45, smooth=max(2, int(height / 9)))
    shade(layer, mask, lum, rmp, dither=0.6)
    return mask


def foliage(layer, balls, rmp=LEAF, jag=0.22, ao=0.4, ambient=0.18, gaps=0.04):
    mask, lum = spheres(layer, balls, jag=jag, ao=ao, ambient=ambient)
    shade(layer, mask, lum, rmp, dither=0.7)
    # sparse dark leaf gaps inside the lit areas
    g = mask & (layer.rng.random(mask.shape) < gaps) & (lum > 0.45) & (lum < 0.8)
    layer.put(g, rmp[1])
    # shadow-side edge pixels go darkest (selective outline)
    edge = mask & ~(np.roll(mask, 1, 0) & np.roll(mask, -1, 0) & np.roll(mask, 1, 1) & np.roll(mask, -1, 1))
    layer.put(edge & (lum < 0.5), rmp[0])
    return mask


def canopy(cx, cy, rx, ry, n, rmin, rmax, rng):
    """Random clump spheres filling an ellipse, larger ones toward the middle."""
    out = []
    for _ in range(n):
        a = rng.random() * 6.283
        d = np.sqrt(rng.random())
        x = cx + np.cos(a) * rx * d
        y = cy + np.sin(a) * ry * d
        r = rmin + (rmax - rmin) * (1 - d * 0.7) * (0.7 + 0.3 * rng.random())
        out.append((x, y, r))
    return out


def trunk(layer, x, top, bottom, w0, w1, rmp=BARK, lean=0.0):
    """Tapered trunk with cylinder shading and vertical bark streaks."""
    for y in range(int(top), int(bottom)):
        t = (y - top) / max(1, bottom - top)
        hw = (w0 + (w1 - w0) * t ** 1.8) / 2
        cx = x + lean * (1 - t) * 6
        for xx in range(int(cx - hw), int(cx + hw) + 1):
            u = (xx - (cx - hw)) / max(1, 2 * hw)          # 0 left .. 1 right
            lum = 0.25 + 0.7 * np.sin(np.pi * np.clip(u * 0.85 + 0.15, 0, 1))
            lum *= 0.75 + 0.25 * u                          # light from the right
            streak = np.sin(xx * 1.7 + np.sin(y * 0.09 + xx) * 1.3)
            lum += 0.12 * streak
            i = int(np.clip(lum * len(rmp) + (CHECK[y % 2, xx % 2] - 0.375) * 0.6, 0, len(rmp) - 1))
            layer.px(xx, y, rmp[i])


def hill(layer, base, amp, cell, rmp, haze=0.0, haze_to='#90d3f6', tex=0.0, bands=None):
    line = base + amp * (fbm1d(layer.w, cell, layer.rng) - 0.5) * 2
    slope = np.gradient(line)
    m = layer.ys >= line[None, :]
    depth = np.clip((layer.ys - line[None, :]) / 30, 0, 1)
    lum = 0.75 - 0.4 * depth - 0.6 * np.clip(slope, -1, 1)[None, :] * 0.4
    if bands:
        lum = lum + bands * np.sin(layer.xs * 0.05 + layer.ys * 0.21)
    idx = quantise(lum, len(rmp), layer.ys, layer.xs, 0.7)
    cols = rmp[idx].astype(float)
    if haze:
        cols = cols * (1 - haze) + hexc(haze_to) * haze
    layer.put_px(m, cols.astype(np.uint8))
    top = m & ~np.roll(m, 1, 0)
    layer.put(top, mix(rmp[-1], hexc(haze_to), haze))
    if tex:
        speck = m & (layer.rng.random(m.shape) < tex)
        layer.put_px(speck, np.clip(cols * 0.86, 0, 255).astype(np.uint8))
    return line


def blades(layer, y0, y1, density, rmp, hmin, hmax, sway=0.0, seed=1, flowers=0, lean_bias=0.3):
    """Grass blades: short strokes, lighter tips; sway shifts the tip."""
    rng = np.random.default_rng(seed)
    n = int(layer.w * (y1 - y0) * density)
    for _ in range(n):
        x = rng.integers(-2, layer.w + 2)
        y = rng.integers(y0, y1)
        depth = (y - y0) / max(1, y1 - y0)
        hgt = int(hmin + (hmax - hmin) * depth * (0.6 + 0.4 * rng.random()))
        lean = (rng.random() - lean_bias) * 1.6
        tone = rng.random()
        base_i = int(np.clip(1 + depth * 2 + tone * 2.5, 0, len(rmp) - 2))
        ph = rng.random() * 6.283
        for k in range(hgt):
            f = k / max(1, hgt - 1)
            dx = lean * f + sway * np.sin(ph) * f * f
            c = rmp[min(len(rmp) - 1, base_i + (1 if f > 0.55 else 0) + (1 if f > 0.85 and tone > 0.5 else 0))]
            layer.px(round(x + dx), y - k, c)
    rng2 = np.random.default_rng(seed + 99)
    for _ in range(flowers):
        x = rng2.integers(4, layer.w - 4)
        y = rng2.integers(y0 + 4, y1)
        depth = (y - y0) / max(1, y1 - y0)
        stem = int(3 + depth * 6)
        ph = rng2.random() * 6.283
        col = ['#ffffff', '#f7d34a', '#c79bf2', '#ff8a8a', '#ffffff'][rng2.integers(0, 5)]
        tip = round(x + sway * 0.8 * np.sin(ph))
        for k in range(stem):
            f = k / max(1, stem)
            layer.px(round(x + sway * 0.8 * np.sin(ph) * f * f), y - k, rmp[2])
        top = y - stem
        big = depth > 0.5
        if big:
            for ddx, ddy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                layer.px(tip + ddx, top + ddy, col)
            layer.px(tip, top, '#f2b33a' if col == '#ffffff' else '#ffffff')
        else:
            layer.px(tip, top, col)


def clover(layer, y0, y1, n, rmp, seed=5):
    """Three-leaf clover clumps for the dark foreground band."""
    rng = np.random.default_rng(seed)
    leaf = [(0, 0), (1, 0), (0, 1), (1, 1), (-1, 0), (0, -1)]
    for _ in range(n):
        x, y = rng.integers(0, layer.w), rng.integers(y0, y1)
        depth = (y - y0) / max(1, y1 - y0)
        s = 1 + int(depth * 3.2)
        lit = rng.random()
        for (ox, oy) in [(-1.6, 0.3), (1.6, 0.3), (0, -1.5)]:
            for (lx, ly) in leaf:
                px_, py_ = x + ox * s + lx * (s / 2), y + oy * s + ly * (s / 2)
                tone = 3 + (1 if (lx + ly) <= 0 else 0) + (1 if lit > 0.6 else 0)
                layer.px(round(px_), round(py_), rmp[min(len(rmp) - 1, tone)])
        layer.px(x, y + 1, rmp[1])


def path(layer, pts, w0, w1, rmp=PATH):
    """A dirt path through (x,y) control points, widening toward the viewer."""
    pts = np.array(pts, float)
    ys = np.arange(int(pts[0, 1]), int(pts[-1, 1]) + 1)
    xs = np.interp(ys, pts[:, 1], pts[:, 0])
    for y, cx in zip(ys, xs):
        t = (y - ys[0]) / max(1, ys[-1] - ys[0])
        hw = (w0 + (w1 - w0) * t ** 1.6) / 2
        for x in range(int(cx - hw), int(cx + hw) + 1):
            u = abs(x - cx) / max(1, hw)
            i = 2 if u < 0.55 else 1
            if u > 0.88:
                i = 0
            if (x * 7 + y * 13) % 23 == 0:
                i = 3
            layer.px(x, y, rmp[i])


def dissolve_mask(w, h, rows, seed, edge='bottom'):
    """Page-coloured pixels that eat the image edge, as in Cofounder's art."""
    L = Layer(w, h, seed)
    rng = L.rng
    for i in range(rows):
        p = ((i + 1) / rows) ** 1.7
        y = h - rows + i if edge == 'bottom' else rows - 1 - i
        m = rng.random(w) < p
        L.rgb[y, m] = PAGE
        L.a[y, m] = 255
    return L


def stray_mask(L, rows, seed):
    """A few loose image pixels below the edge are drawn by the page side."""
    return L


# Scenes ----------------------------------------------------------------
W, H = 480, 270


def hero():
    """The meadow desk. Returns layers for the animated hero + a static frame."""
    sky_l = Layer(W, H, 1, opaque=True)
    sky(sky_l, SKY, 0, 196, glow=(470, -10, 260, 0.35))

    # High wisps: tileable horizontally so the browser can scroll them forever.
    wisps = Layer(W, H, 2)
    for cx, y, w_, h_ in [(60, 30, 70, 6), (210, 22, 46, 4), (330, 34, 80, 7), (440, 26, 40, 4)]:
        for shift in (-W, 0, W):
            cloud(wisps, cx + shift, y, w_, h_, rmp=ramp('#4fa3e8', '#62b0ec', '#77bcef', '#8cc7f2'), seed=cx)

    # Cloud bank (right), kept off the headline area on the left.
    bank = Layer(W, H, 3)
    for cx, base, w_, h_, s in [(395, 120, 120, 64, 11), (300, 150, 120, 40, 12), (480, 132, 80, 58, 13),
                                (240, 184, 120, 22, 14)]:
        cloud(bank, cx, base, w_, h_, seed=s)

    scene = Layer(W, H, 4)
    # far hills with tree line, hazed toward the sky
    hill(scene, 176, 5, 120, LEAF_FAR, haze=0.45, haze_to='#90d3f6')
    rng = scene.rng
    far_trees = [(x, 176 + rng.random() * 4 - 2, 3 + rng.random() * 3) for x in range(0, W, 7)]
    m, lum = spheres(scene, far_trees, jag=0.25, ao=0.2, ambient=0.3)
    idx = quantise(lum, len(LEAF_FAR), scene.ys, scene.xs, 0.6)
    scene.put_px(m, mix(LEAF_FAR[idx], hexc('#90d3f6'), 0.35))
    hill(scene, 188, 4, 90, GRASS[2:], haze=0.18, haze_to='#90d3f6', tex=0.05)
    # mid meadow, bright and yellow-green
    hill(scene, 197, 3, 140, GRASS[3:], tex=0.08, bands=0.08)
    blades(scene, 199, 240, 0.07, GRASS[1:], 1, 3, seed=61, flowers=46)
    path(scene, [(150, 198), (168, 205), (150, 214), (100, 230), (40, 250), (-20, 272)], 5, 120)
    # left tree + bushes
    trunk(scene, 70, 166, 200, 4, 8)
    foliage(scene, canopy(70, 168, 30, 17, 26, 6, 11, np.random.default_rng(21)))
    foliage(scene, canopy(150, 200, 14, 6, 9, 4, 6, np.random.default_rng(22)))
    foliage(scene, canopy(15, 202, 18, 7, 10, 4, 7, np.random.default_rng(23)))

    # desk setup
    gy = 232
    sh = (((scene.xs - 318) / 74) ** 2 + ((scene.ys - (gy + 1)) / 5) ** 2) < 1
    scene.put(sh, GRASS[1])
    sh2 = (((scene.xs - 318) / 64) ** 2 + ((scene.ys - (gy + 1)) / 3.5) ** 2) < 1
    scene.put(sh2 & ((scene.xs + scene.ys) % 2 == 0), GRASS[0])
    dx0, dw, dtop = 254, 128, gy - 30
    scene.rect(dx0, dtop, dw, 2, WOOD[4])
    scene.rect(dx0, dtop + 2, dw, 3, WOOD[3])
    scene.rect(dx0, dtop + 5, dw, 1, WOOD[1])
    for lx in (dx0 + 5, dx0 + dw - 9):
        scene.rect(lx, dtop + 6, 4, gy - dtop - 6, WOOD[2])
        scene.rect(lx + 3, dtop + 6, 1, gy - dtop - 6, WOOD[1])
        scene.rect(lx, dtop + 6, 1, gy - dtop - 6, WOOD[3])
    scene.rect(dx0 + 9, dtop + 9, dw - 18, 2, WOOD[1])
    # monitor
    mx, my, mw, mh = 280, dtop - 62, 82, 52
    scene.rect(mx, my, mw, mh, STEEL[1])
    scene.rect(mx + 1, my + 1, mw - 2, 1, STEEL[4])
    scene.rect(mx + mw - 2, my + 1, 1, mh - 2, STEEL[3])
    scene.rect(mx + 1, my + mh - 2, mw - 2, 1, STEEL[0])
    sx, sy, sw, shh = mx + 3, my + 3, mw - 6, mh - 7
    for y in range(shh):
        c = mix(hexc('#2a2933'), hexc('#1f1e27'), y / shh)
        scene.rect(sx, sy + y, sw, 1, c)
    scene.rect(sx, sy, sw, 1, '#3a3946')
    # terminal text rows (static part; the browser types the last one)
    rows = [(0, 22, '#8b8996'), (1, 46, '#c9c6d2'), (2, 38, '#c9c6d2'), (3, 30, '#f2a20c'), (4, 18, '#22b357')]
    for i, wd, col in rows:
        scene.rect(sx + 4, sy + 4 + i * 6, wd, 2, col)
    tb_x, tb_y, tb_h = sx + sw - 9, sy + 3, shh - 6
    scene.rect(tb_x, tb_y, 6, tb_h, '#111014')
    scene.rect(tb_x + 1, tb_y + 1, 4, 3, '#2c2a33')
    dots = [(tb_x + 2, tb_y + 7 + i * 6) for i in range(5)]
    # stand, keyboard, mug, plant, notebook
    scene.rect(mx + mw // 2 - 4, my + mh, 8, 6, STEEL[2])
    scene.rect(mx + mw // 2 - 3, my + mh, 2, 6, STEEL[3])
    scene.rect(mx + mw // 2 - 13, dtop - 2, 26, 2, STEEL[2])
    scene.rect(mx + mw // 2 - 13, dtop - 2, 26, 1, STEEL[4])
    scene.rect(300, dtop - 2, 1, 1, STEEL[4])
    kx = mx + mw // 2 + 16
    scene.rect(kx, dtop - 2, 22, 2, '#cfcad2')
    scene.rect(kx, dtop - 2, 22, 1, '#eeeaf0')
    for k in range(0, 22, 3):
        scene.px(kx + k + 1, dtop - 1, '#a9a4b0')
    scene.rect(262, dtop - 7, 7, 7, '#efe9de')
    scene.rect(262, dtop - 7, 7, 1, '#ffffff')
    scene.rect(267, dtop - 6, 2, 5, '#d8d0c2')
    scene.rect(269, dtop - 5, 2, 1, '#efe9de'); scene.rect(270, dtop - 5, 1, 3, '#efe9de'); scene.rect(269, dtop - 3, 2, 1, '#efe9de')
    scene.rect(263, dtop - 6, 5, 1, '#5a3a24')
    mug_steam = (265, dtop - 9)
    px0 = 364
    scene.rect(px0, dtop - 9, 10, 9, TERRA[2])
    scene.rect(px0, dtop - 9, 10, 1, TERRA[3])
    scene.rect(px0 + 7, dtop - 8, 3, 8, TERRA[1])
    scene.rect(px0 + 1, dtop - 1, 8, 1, TERRA[0])
    foliage(scene, canopy(px0 + 5, dtop - 16, 7, 6, 9, 2.5, 4, np.random.default_rng(31)), jag=0.35)
    scene.rect(258, dtop - 1, 1, 1, WOOD[3])

    # big tree on the right
    trunk(scene, 446, 40, 238, 12, 28, lean=0.6)
    for (bx, by, ex, ey) in [(442, 120, 404, 92), (452, 100, 478, 74), (440, 80, 418, 50)]:
        for k in range(40):
            t = k / 39
            x, y = bx + (ex - bx) * t, by + (ey - by) * t
            wdt = 4 - 3 * t
            for o in range(int(wdt) + 1):
                scene.px(x + o, y, BARK[2 if o < wdt * 0.5 else 3])
    tree_rng = np.random.default_rng(41)
    crown = canopy(430, 52, 74, 58, 70, 9, 17, tree_rng) + canopy(470, 120, 30, 30, 18, 7, 11, tree_rng)
    tree = Layer(W, H, 42)
    foliage(tree, crown)
    # roots/grass around the trunk
    foliage(scene, canopy(446, 236, 22, 5, 12, 3, 6, np.random.default_rng(43)), rmp=GRASS)

    # foreground: dark leafy band with lit clover clumps (animated sway frames)
    crng = np.random.default_rng(52)
    clover_balls = []
    for _ in range(150):
        x, y = crng.integers(-6, W + 6), crng.integers(246, 276)
        depth = (y - 246) / 30
        r = 2.2 + depth * 3.6 + crng.random() * 1.2
        for ox, oy in [(-0.95, 0.25), (0.95, 0.25), (0, -0.85)]:
            clover_balls.append((x + ox * r * 1.15, y + oy * r * 1.15, r))
    edge_line = 241 + 5 * (fbm1d(W, 40, np.random.default_rng(51)) - 0.5) * 2
    fg_frames = []
    for f in range(4):
        fg = Layer(W, H, 50)
        band = fg.ys >= edge_line[None, :]
        lum = 0.5 - 0.45 * np.clip((fg.ys - 241) / 30, 0, 1)
        idx = quantise(lum, 4, fg.ys, fg.xs, 0.8)
        fg.put_px(band, GRASS[:4][idx])
        sway = [0, 1.0, 1.8, 1.0][f]
        # tufts breaking the band's top edge
        blades(fg, 238, 247, 0.16, GRASS[:5], 2, 5, sway=sway * 0.5, seed=53, flowers=0, lean_bias=0.5)
        m, lum = spheres(fg, clover_balls, jag=0.12, ao=0.0, ambient=0.15)
        lum = lum * (0.7 + 0.3 * np.clip((fg.ys - 246) / 30, 0, 1))
        shade(fg, m, lum, GRASS[1:], dither=0.7)
        blades(fg, 252, 274, 0.025, GRASS, 5, 12, sway=sway, seed=54, flowers=22)
        fg_frames.append(fg)

    meadow = Layer(W, H, 60)

    dis = dissolve_mask(W, H, 18, 70)

    meta = {
        'size': [W, H], 'scale': 4,
        'dots': dots, 'steam': mug_steam,
        'type': {'x': sx + 4, 'y': sy + 4 + 5 * 6, 'max': 34, 'color': '#c9c6d2'},
        'cursor': {'x': sx + 4, 'y': sy + 4 + 5 * 6},
        'colors': STATUS,
    }
    layers = {'sky': sky_l, 'wisps': wisps, 'bank': bank, 'scene': scene, 'meadow': meadow, 'tree': tree,
              'fg0': fg_frames[0], 'fg1': fg_frames[1], 'fg2': fg_frames[2], 'fg3': fg_frames[3], 'dissolve': dis}
    for k, L in layers.items():
        L.save(f'hero/{k}.png')
    with open(os.path.join(OUT, 'hero', 'meta.json'), 'w') as f:
        json.dump(meta, f)

    # static frame (fallback, OG card, no-JS)
    frame = Layer(W, H, 0, opaque=True)
    for k in ['sky', 'wisps', 'bank', 'scene', 'meadow', 'tree', 'fg0']:
        frame.over(layers[k])
    for (x, y), c in zip(dots, ['blue', 'amber', 'blue', 'green', 'blue']):
        frame.rect(x, y, 2, 2, STATUS[c])
    frame.rect(sx + 4, sy + 34, 26, 2, '#c9c6d2')
    frame.over(dis)
    frame.save('hero.png', 4, alpha=False)


def harbour():
    w, h = 480, 200
    L = Layer(w, h, 80, opaque=True)
    dusk = ramp('#2c4fa8', '#3a5cb3', '#5368be', '#7a75c4', '#a684c2', '#d095b6', '#eba6a5', '#f6bc96', '#fbd08f')
    sky(L, dusk, 0, 120, glow=(330, 118, 140, 0.25))
    pink = ramp('#9c79b4', '#c08ab8', '#e2a2b2', '#f5c0b4', '#ffdccb', '#fff0e2')
    for cx, base, ww, hh, s in [(70, 62, 100, 26, 81), (150, 40, 50, 12, 82), (400, 58, 110, 28, 83), (300, 28, 40, 9, 84)]:
        cloud(L, cx, base, ww, hh, rmp=pink, seed=s)
    sun = ((L.xs - 330) ** 2 + ((L.ys - 114) * 1.05) ** 2 < 19 ** 2) & (L.ys < 118)
    L.put(sun, '#ffe29a')
    L.put(sun & ((L.xs - 330) ** 2 + (L.ys - 114) ** 2 < 13 ** 2), '#fff1c4')
    hill(L, 112, 5, 90, ramp('#3e3a6e', '#4b4579', '#5a5287', '#6a6095'), haze=0.25, haze_to='#eba6a5')
    # sea: banded ramp with horizontal glints, brightest under the sun
    sea = ramp('#1f3f86', '#27509a', '#3263ab', '#4277bb', '#5b8fcb', '#86b0dc')
    for y in range(118, h):
        t = (y - 118) / (h - 118)
        for x in range(w):
            base = 3 - int(t * 3)
            near_sun = max(0, 1 - abs(x - 330) / (22 + t * 20))
            r = L.rng.random()
            i = base
            if r < 0.015 + 0.02 * t:
                i = min(5, base + 1)
            elif r < 0.03 + 0.03 * t:
                i = max(0, base - 1)
            col = sea[i]
            if near_sun > 0 and r < near_sun * 0.55:
                col = hexc('#ffd98a') if r < near_sun * 0.3 else hexc('#f6bc96')
            L.rgb[y, x] = col
    # streaks: horizontal runs read as waves
    for _ in range(520):
        x, y = L.rng.integers(0, w), L.rng.integers(120, h)
        ln = L.rng.integers(2, 4 + (y - 118) // 10)
        L.rect(x, y, ln, 1, sea[4] if L.rng.random() < 0.6 else sea[0])
    # boats: blue working, amber needs you, green done
    for x, y, s, col in [(70, 156, 1.0, '#3b82f6'), (152, 140, 0.7, '#f2a20c'), (232, 168, 1.25, '#3b82f6'),
                         (398, 150, 0.9, '#22b357'), (452, 134, 0.6, '#3b82f6')]:
        hw = int(17 * s)
        for i in range(int(5 * s) + 1):
            L.rect(x - hw + i, y + i, (hw - i) * 2, 1, WOOD[2] if i == 0 else WOOD[1])
        L.rect(x - hw, y, hw * 2, 1, WOOD[3])
        mh = int(30 * s)
        L.rect(x, y - mh, 1, mh, '#2a1d12')
        for i in range(mh - 3):
            wd = int((i / mh) * 13 * s)
            L.rect(x + 1, y - mh + i, wd, 1, col)
            if wd > 2:
                L.rect(x + 1, y - mh + i, 1, 1, mix(hexc(col), hexc('#ffffff'), 0.35))
        for i in range(mh - 4):
            wd = int((i / mh) * 8 * s)
            L.rect(x - wd, y - mh + 3 + i, wd, 1, '#f3efe6')
            if wd > 1:
                L.rect(x - wd, y - mh + 3 + i, 1, 1, '#d8d0c2')
        for k in range(hw * 2 + 6):
            if (k + y) % 3:
                L.px(x - hw - 3 + k, y + int(5 * s) + 2, sea[1])
        for k in range(0, hw * 2, 3):
            L.px(x - hw + k, y + int(5 * s) + 3, sea[4])
    # grassy bank
    hill(L, 186, 5, 60, GRASS[2:], tex=0.1)
    blades(L, 186, 200, 0.12, GRASS, 2, 5, seed=85, flowers=30)
    top = dissolve_mask(w, h, 14, 86, edge='top')
    bot = dissolve_mask(w, h, 10, 87)
    L.over(top)
    L.over(bot)
    L.save('harbour.png', 4, alpha=False)


def lighthouse():
    w, h = 160, 220
    L = Layer(w, h, 90, opaque=True)
    night = ramp('#141d48', '#1b275a', '#24336c', '#33437e', '#4a5590', '#6c68a0', '#9a7fae', '#cc93a8', '#eaa797')
    sky(L, night, 0, 160)
    stars = (L.rng.random((h, w)) < 0.01) & (L.ys < 90)
    L.put(stars, '#f3efe6')
    big = (L.rng.random((h, w)) < 0.0018) & (L.ys < 80)
    for y, x in zip(*np.nonzero(big)):
        for ddx, ddy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            L.px(x + ddx, y + ddy, '#9aa6d8')
        L.px(x, y, '#ffffff')
    dusk_cloud = ramp('#6a5a92', '#8c6e9f', '#b382a6', '#d99aa8', '#f2b8ae')
    cloud(L, 36, 132, 70, 18, rmp=dusk_cloud, seed=91)
    cloud(L, 150, 116, 46, 12, rmp=dusk_cloud, seed=92)
    # beam: a soft wedge, two tones
    for y in range(36, 76):
        for x in range(0, 100):
            d = abs((y - 57) + (x - 100) * 0.13)
            spread = (100 - x) * 0.14 + 1.5
            if d < spread:
                L.px(x, y, mix(L.rgb[y, x], hexc('#ffd77a'), 0.62 if d < spread * 0.45 else 0.34))
    # sea
    sea = ramp('#152a63', '#1d3672', '#284684', '#365996', '#4b70ad')
    L.rect(0, 158, w, h - 158, sea[2])
    for _ in range(260):
        x, y = L.rng.integers(0, w), L.rng.integers(159, h)
        L.rect(x, y, L.rng.integers(2, 6), 1, sea[4] if L.rng.random() < 0.5 else sea[0])
    for x in range(0, 100):
        if L.rng.random() < 0.4:
            L.px(x, 159 + L.rng.integers(0, 6), '#ffd98a')
    # rocks: lit sphere cluster
    rocks = [(108, 196, 30), (78, 210, 20), (138, 206, 22), (100, 178, 18), (124, 186, 18), (60, 222, 16)]
    m, lum = spheres(L, rocks, jag=0.08, ao=0.3, ambient=0.25)
    shade(L, m, lum, ROCK, dither=0.7)
    # foam where rock meets sea
    foam = m & ~np.roll(m, 1, 1) & (L.ys > 166) & ((L.ys % 3) != 0)
    L.put(foam, '#9fb3dc')
    # tower: cylinder shading per column, red bands
    for y in range(70, 176):
        t = (y - 70) / 106
        hw = 7 + t * 6
        for x in range(int(108 - hw), int(108 + hw) + 1):
            u = (x - (108 - hw)) / (2 * hw)
            lum_ = 0.3 + 0.75 * np.sin(np.pi * np.clip(u * 0.9 + 0.1, 0, 1)) * (0.6 + 0.4 * u)
            red = (y // 13) % 2 == 1
            rr = ramp('#5e1714', '#8a221d', '#b02e26', '#d2463a') if red else ramp('#8d8697', '#b7b0bd', '#dcd6dc', '#f6f2ec')
            i = int(np.clip(lum_ * 4 + (CHECK[y % 2, x % 2] - 0.375) * 0.6, 0, 3))
            L.px(x, y, rr[i])
    L.rect(98, 66, 20, 4, '#1a1814')
    L.rect(98, 66, 20, 1, '#3a3640')
    L.rect(101, 52, 14, 14, '#2a2630')
    L.rect(103, 54, 10, 10, '#f2a20c')
    L.rect(104, 55, 8, 8, '#ffd98a')
    L.rect(105, 56, 3, 3, '#fff6d8')
    L.rect(99, 48, 18, 4, '#1a1814')
    L.rect(105, 44, 6, 4, '#1a1814')
    L.rect(107, 41, 2, 3, '#1a1814')
    # window
    L.rect(106, 110, 4, 6, '#ffd98a')
    L.save('lighthouse.png', 4, alpha=False)


if __name__ == '__main__':
    hero()
    harbour()
    lighthouse()
    print('ok')
