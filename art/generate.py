"""Procedural pixel art for the Cadence landing page.

Renders small canvases with a limited palette, then upscales with
nearest-neighbour so every art pixel stays crisp. Deterministic (seeded),
so re-running produces the same images.

    python3 art/generate.py
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
PAGE = (245, 245, 242)  # page background, used for pixel dissolves

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


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


def fbm(w, h, cell, rng, octaves=4):
    out, amp, tot = np.zeros((h, w)), 1.0, 0.0
    for _ in range(octaves):
        out += amp * value_noise(w, h, max(cell, 1), rng)
        tot += amp
        amp *= 0.5
        cell = max(1, cell // 2)
    return out / tot


def noise1d(w, cell, rng, octaves=4):
    return fbm(w, 1, cell, rng, octaves)[0]


class Canvas:
    def __init__(self, w, h, seed):
        self.w, self.h = w, h
        self.px = np.zeros((h, w, 3), dtype=np.uint8)
        self.rng = np.random.default_rng(seed)

    def gradient(self, stops, y0=0, y1=None):
        """Vertical banded gradient with ordered dithering between stops."""
        y1 = self.h if y1 is None else y1
        cols = [np.array(hexc(c)) for c in stops]
        n = len(cols) - 1
        for y in range(y0, y1):
            t = (y - y0) / max(1, (y1 - y0 - 1)) * n
            i = min(int(t), n - 1)
            f = t - i
            for x in range(self.w):
                self.px[y, x] = cols[i + 1] if f > BAYER[y % 4, x % 4] else cols[i]

    def fill(self, mask, color):
        self.px[mask] = hexc(color)

    def speckle(self, mask, color, p):
        m = mask & (self.rng.random((self.h, self.w)) < p)
        self.px[m] = hexc(color)

    def rect(self, x, y, w, h, color):
        self.px[max(0, y):y + h, max(0, x):x + w] = hexc(color)

    def clouds(self, y0, y1, cover, light, shade, cell=24, seed_shift=0):
        n = fbm(self.w, self.h, cell, self.rng, 5)
        ys = np.arange(self.h)[:, None]
        band = np.clip(1 - np.abs((ys - (y0 + y1) / 2) / ((y1 - y0) / 2)), 0, 1)
        v = n * (0.55 + 0.6 * band)
        body = v > cover
        self.px[body] = hexc(shade)
        top = body & (np.roll(v, 3, axis=0) > cover + 0.02)
        self.px[top] = hexc(light)
        edge = body & ~np.roll(body, 1, axis=0)
        self.px[edge] = hexc(light)

    def cumulus(self, cx, base, width, height, light, mid, shade, rim=None):
        """Puffy cloud built from stacked circles with a flat base and banded shading."""
        ys, xs = np.mgrid[0:self.h, 0:self.w]
        mask = np.zeros((self.h, self.w), bool)
        n = max(3, int(width / (height * 0.9)))
        for i in range(n):
            t = i / (n - 1)
            x = cx - width / 2 + t * width
            r = height * (0.45 + 0.55 * np.sin(np.pi * t)) * (0.8 + 0.4 * self.rng.random())
            y = base - r * 0.55
            mask |= (xs - x) ** 2 + (ys - y) ** 2 < r * r
        mask &= ys <= base
        jag = self.rng.random((self.h, self.w)) < 0.18
        edge = mask & ~(np.roll(mask, 1, 0) & np.roll(mask, -1, 0) & np.roll(mask, 1, 1) & np.roll(mask, -1, 1))
        mask &= ~(edge & jag)
        rel = (base - ys) / max(1, height)
        self.px[mask] = hexc(mid)
        self.px[mask & (rel > 0.42 + 0.08 * (BAYER[ys % 4, xs % 4] - 0.5))] = hexc(light)
        self.px[mask & (rel < 0.16 + 0.1 * (BAYER[ys % 4, xs % 4] - 0.5))] = hexc(shade)
        if rim:
            top = mask & ~np.roll(mask, 1, 0)
            self.px[top] = hexc(rim)

    def water(self, y0, y1, base, light, dark, density=0.05):
        self.rect(0, y0, self.w, y1 - y0, base)
        for y in range(y0 + 1, y1):
            d = density * (0.4 + (y - y0) / max(1, y1 - y0))
            for x in np.nonzero(self.rng.random(self.w) < d)[0]:
                ln = int(self.rng.integers(2, 4 + (y - y0) // 8))
                col = light if self.rng.random() < 0.6 else dark
                self.px[y, x:x + ln] = hexc(col)

    def hill(self, base, amp, cell, color, dark=None, light=None, tex=0.0):
        line = base + amp * (noise1d(self.w, cell, self.rng) - 0.5) * 2
        ys = np.arange(self.h)[:, None]
        mask = ys >= line[None, :]
        self.fill(mask, color)
        if dark:
            self.speckle(mask, dark, tex)
        if light:
            ridge = mask & (ys < line[None, :] + 2)
            self.fill(ridge, light)
        return line

    def blob(self, cx, cy, r, base, dark, light, rough=0.35):
        ys, xs = np.mgrid[0:self.h, 0:self.w]
        n = fbm(self.w, self.h, 6, self.rng, 3)
        d = np.sqrt((xs - cx) ** 2 + ((ys - cy) * 1.1) ** 2) / r
        mask = d + (n - 0.5) * rough * 2 < 1
        self.fill(mask, base)
        lit = mask & (((xs - cx) + (ys - cy)) / r + (n - 0.5) * 0.9 < -0.35)
        self.fill(lit, light)
        shd = mask & (((xs - cx) * 0.4 + (ys - cy)) / r + (n - 0.5) * 0.9 > 0.45)
        self.fill(shd, dark)
        return mask

    def tree(self, x, ground, h, r, leaf=('#2f7a3b', '#1f5a2c', '#5fae4a'), trunk=('#6b4a2e', '#4a311e')):
        self.rect(x - 3, ground - h, 7, h, trunk[0])
        self.rect(x + 1, ground - h, 3, h, trunk[1])
        for dx, dy, rr in [(0, -h - r * 0.3, r), (-r * 0.7, -h + r * 0.2, r * 0.75), (r * 0.7, -h + r * 0.15, r * 0.8)]:
            self.blob(x + dx, ground + dy, rr, *leaf)

    def flowers(self, y0, y1, colors, n):
        for _ in range(n):
            x = int(self.rng.integers(0, self.w))
            y = int(self.rng.integers(y0, y1))
            c = colors[int(self.rng.integers(0, len(colors)))]
            self.px[y, x] = hexc(c)
            if self.rng.random() < 0.5 and y + 1 < self.h:
                self.px[y + 1, x] = hexc('#3d7a35')

    def dissolve(self, rows, edge='bottom'):
        """Pixel-dissolve the canvas edge into the page colour."""
        for i in range(rows):
            p = (i + 1) / rows
            p = p ** 1.6
            y = self.h - rows + i if edge == 'bottom' else rows - 1 - i
            m = self.rng.random(self.w) < p
            self.px[y, m] = PAGE
            if edge == 'bottom' and i > rows * 0.4:
                stray = (self.rng.random(self.w) < 0.04) & m
                if y - 3 >= 0:
                    self.px[y - 3, stray] = PAGE

    def save(self, name, scale):
        img = Image.fromarray(self.px).resize((self.w * scale, self.h * scale), Image.NEAREST)
        path = os.path.join(OUT, name)
        img.save(path, optimize=True)
        print(path, img.size, os.path.getsize(path) // 1024, 'KB')


def outline_rect(c, x, y, w, h, fill, line):
    c.rect(x, y, w, h, line)
    c.rect(x + 1, y + 1, w - 2, h - 2, fill)


def hero():
    c = Canvas(480, 270, seed=7)
    c.gradient(['#3e7fd9', '#4d91e3', '#64a6ea', '#86bdf0', '#a9d3f5'], 0, 200)
    # Clouds stay right of centre and low on the left, so the sky behind the
    # hero headline (top-left) is clear.
    for cx, base, w, h in [(330, 120, 100, 44), (440, 104, 90, 40), (390, 166, 160, 26),
                           (250, 172, 110, 20), (300, 52, 46, 12)]:
        c.cumulus(cx, base, w, h, '#ffffff', '#e8f3fd', '#b9d7f3', rim='#ffffff')
    c.hill(176, 10, 96, '#7fae8f', '#73a283', '#94c0a2', tex=0.08)
    c.hill(192, 9, 64, '#5f9a52', '#558c49', '#79b467', tex=0.12)
    line = c.hill(214, 7, 48, '#4f9a3c', '#3f8331', '#6cbc4f', tex=0.2)
    c.speckle(np.arange(c.h)[:, None] > 228 + np.zeros((1, c.w)), '#3a7a2c', 0.18)
    c.speckle(np.arange(c.h)[:, None] > 228 + np.zeros((1, c.w)), '#78c25a', 0.08)
    # big tree on the right, small tree left
    c.tree(430, 222, 70, 46)
    c.tree(52, 206, 22, 18, leaf=('#3f8a3f', '#2b6630', '#69b456'))
    # desk
    g = 236
    c.rect(250, g - 30, 120, 5, '#8a5a34')
    c.rect(250, g - 26, 120, 2, '#6b4426')
    c.rect(256, g - 25, 4, 27, '#6b4426')
    c.rect(360, g - 25, 4, 27, '#6b4426')
    # monitor
    outline_rect(c, 268, g - 92, 84, 56, '#22212a', '#141318')
    c.gradient  # noqa (kept simple below)
    c.rect(271, g - 89, 78, 50, '#2e2d38')
    # terminal lines on screen
    for i, (wd, col) in enumerate([(30, '#8b8996'), (52, '#c9c6d2'), (44, '#c9c6d2'), (38, '#f2a20c'), (26, '#22b357')]):
        c.rect(275, g - 84 + i * 7, wd, 2, col)
    # cadence toolbar on screen edge with status dots
    c.rect(341, g - 87, 6, 46, '#111014')
    for i, col in enumerate(['#3b82f6', '#f2a20c', '#3b82f6', '#22b357', '#3b82f6']):
        c.rect(343, g - 84 + i * 8, 2, 2, col)
    c.rect(305, g - 36, 10, 6, '#141318')
    c.rect(296, g - 31, 28, 2, '#141318')
    # mug + plant on desk
    c.rect(256, g - 38, 7, 8, '#f3efe6'); c.rect(263, g - 36, 2, 4, '#f3efe6'); c.rect(256, g - 38, 7, 1, '#c9c2b4')
    c.rect(358, g - 40, 8, 10, '#b85c38')
    c.blob(362, g - 45, 7, '#3f8a3f', '#2b6630', '#69b456', rough=0.5)
    # ladybug + flowers
    c.flowers(222, 262, ['#f6d24a', '#ffffff', '#e2574c', '#c79bf2'], 160)
    c.rect(150, 248, 5, 4, '#c8312b'); c.px[248, 152] = hexc('#1a1814'); c.px[250, 150] = hexc('#1a1814')
    c.dissolve(22)
    c.save('hero.png', 4)


def harbour():
    """Boats at sea under a dusk sky: a band behind the 'many agents' section."""
    c = Canvas(480, 200, seed=11)
    c.gradient(['#2f5fb8', '#5a7fcf', '#9a8fd0', '#e7a7a0', '#f6c58e'], 0, 120)
    for cx, base, w, h in [(60, 64, 80, 20), (125, 40, 40, 10), (420, 58, 80, 20), (360, 34, 36, 9)]:
        c.cumulus(cx, base, w, h, '#ffe9d6', '#f6c9b8', '#d99aa6')
    # sun
    ys, xs = np.mgrid[0:c.h, 0:c.w]
    sun = (xs - 330) ** 2 + (ys - 112) ** 2 < 20 ** 2
    c.fill(sun & (ys < 120), '#ffd98a')
    # distant headland
    c.hill(108, 6, 80, '#6a5a8f', tex=0)
    # sea
    sea = ys >= 118
    c.water(118, 200, '#3b6fb3', '#5b8fd0', '#2f5c9a', density=0.05)
    glint = sea & (np.abs(xs - 330) < 18 - (ys - 118) * 0.1) & (c.rng.random((c.h, c.w)) < 0.25)
    c.fill(glint, '#ffd98a')
    # boats (agents) with coloured sails: blue working, amber needs you, green done
    for x, y, s, col in [(70, 150, 1.0, '#3b82f6'), (150, 138, 0.7, '#f2a20c'), (225, 160, 1.2, '#3b82f6'),
                         (395, 145, 0.9, '#22b357'), (450, 132, 0.6, '#3b82f6')]:
        hw = int(16 * s)
        for i in range(int(4 * s) + 1):
            c.rect(x - hw + i, y + i, (hw - i) * 2, 1, '#4a311e')
        mh = int(26 * s)
        c.rect(x, y - mh, 1, mh, '#2a1d12')
        for i in range(mh - 3):
            wdt = int((i / mh) * 12 * s)
            c.rect(x + 1, y - mh + i, wdt, 1, col)
        for i in range(mh - 3):
            wdt = int((i / mh) * 7 * s)
            c.rect(x - wdt, y - mh + 3 + i, wdt, 1, '#f3efe6')
        c.rect(x - hw - 2, y + int(4 * s) + 2, hw * 2 + 4, 1, '#2f5f9e')
    # foreground grass bank
    c.hill(186, 6, 60, '#4f9a3c', '#3f8331', '#6cbc4f', tex=0.25)
    c.flowers(186, 200, ['#f6d24a', '#ffffff'], 60)
    c.dissolve(12, edge='top')
    c.dissolve(10)
    c.save('harbour.png', 4)


def lighthouse():
    """Tall card art for the footer: a lighthouse whose lamp is amber."""
    c = Canvas(160, 220, seed=23)
    c.gradient(['#1d2a5c', '#2c3f7c', '#4a5fa0', '#8b7fb8', '#e5a38f'], 0, 160)
    stars = (c.rng.random((c.h, c.w)) < 0.012) & (np.arange(c.h)[:, None] < 90)
    c.px[stars] = hexc('#f3efe6')
    c.cumulus(40, 128, 70, 18, '#f6c3b0', '#d79aa8', '#a77fa3')
    c.cumulus(150, 112, 50, 12, '#f6c3b0', '#d79aa8', '#a77fa3')
    ys, xs = np.mgrid[0:c.h, 0:c.w]
    c.water(158, 220, '#2b4a86', '#3d63a8', '#203a6e', density=0.07)
    # beam
    beam = (ys < 70) & (ys > 40) & (xs < 98) & (np.abs((ys - 56) - (xs - 98) * -0.12) < (98 - xs) * 0.12 + 1)
    c.px[beam & (c.rng.random((c.h, c.w)) < 0.55)] = hexc('#ffd98a')
    # rocks
    # stepped rock island
    for y in range(166, 220):
        t = (y - 166) / 54
        hw = int(24 + t * 36 + c.rng.integers(0, 3))
        c.rect(108 - hw, y, hw * 2, 1, '#5a5462')
        c.rect(108 - hw, y, max(2, hw // 2), 1, '#7a7484')
        c.rect(108 + hw // 2, y, hw // 2, 1, '#3d3846')
    c.rect(84, 166, 48, 2, '#8a8494')
    # tower
    for y in range(70, 172):
        t = (y - 70) / 102
        hw = int(7 + t * 6)
        c.rect(108 - hw, y, hw * 2, 1, '#f3efe6')
        c.rect(108, y, hw, 1, '#d8d0c2')
        if (y // 14) % 2 == 1:
            c.rect(108 - hw, y, hw * 2, 1, '#c8312b')
            c.rect(108, y, hw, 1, '#9e2420')
    c.rect(99, 66, 18, 3, '#1a1814')
    c.rect(102, 54, 12, 12, '#f2a20c')
    c.rect(104, 56, 8, 8, '#ffd98a')
    c.rect(100, 50, 16, 4, '#1a1814')
    c.rect(106, 46, 4, 4, '#1a1814')
    c.save('lighthouse.png', 4)


if __name__ == '__main__':
    hero()
    harbour()
    lighthouse()
