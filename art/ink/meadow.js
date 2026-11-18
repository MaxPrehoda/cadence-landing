// Cadence hero: a desk in a sunny meadow, sculpted for ink-studio.
module.exports = ({ makeBuilder, makeSculpt, KIT: K }) => ({
  id: 'cadence-meadow',
  name: 'Desk in a meadow',
  seed: 11,
  build(seed) {
    const pal = [
      0x1a78d8, // 0 the top of the sky (the page paints this colour above the picture)
      0x1d4d3c, 0x2a6640, 0x3d8240, 0x579e3f, 0x77b843, 0x9bcf52, // 1-6 grass
      0x123a35, 0x25663f, 0x4f9a3c, 0xa3cf4f, // 7-10 leaf
      0x2e2121, 0x5f4334, 0x977552, // 11-13 bark
      0x4a2c1c, 0x8a5634, 0xc4874f, 0xe6b577, // 14-17 wood
      0x121116, 0x26252e, 0x4a4956, // 18-20 steel
      0x191820, 0x2b2a35, // 21-22 screen
      0xb9af9d, 0xefe9de, 0xffffff, // 23-25 cream
      0x6b2f1f, 0xb2552f, 0xcc7044, // 26-28 terracotta
      0x3b82f6, 0xf2a20c, 0x22b357, // 29-31 status
      0x8a6a4c, 0xc29d72, 0xd6b88c, // 32-34 path
      0x8fc0ea, 0xd6e9f9, 0xffffff, // 35-37 cloud
      0xff6b5e, 0xc79bf2, 0xf7d34a, 0xff9ec4, // 38-41 flowers
      0x3d3949, 0x706a7a, 0xaaa4b1, // 42-44 rock
      0xb9b6c4, // 45 text
      0x3f7d6b, 0x4f8f6c, 0x64a26c, 0x7fb66f, // 46-49 far woods
      0x1a78d8, 0x2189e3, 0x2d98ea, 0x45aaf0, 0x63bcf4, 0x86cdf6 // 50-55 sky, top to horizon
    ];
    const TALL = process.env.INK_CAM === 'tall';             // the portrait framing for phones
    const B = makeBuilder(seed, pal);
    const marks = {};
    const { rr } = B;
    const S = K.sculpt(makeSculpt(B));
    S.sun = B.norm([0.55, 0.75, 0.45]);
    const Q = +process.env.INK_Q || 1;                     // 1 = draft; higher = finer dabs for a finer pixel grid
    S.res = 0.1 / Q;
    const rs = v => v / Q;
    S.focus = { p: [0, 1, 1], near: 7, far: 16, coarse: 2.2 };
    S.amb = 0.2;
    S.sky = 0.3;

    const flat = (x, z) => Math.min(1, Math.hypot(x, z - 0.2) / 5);
    const hf = (x, z) => (0.5 * B.fbm(x * 0.1 + 3, z * 0.1, 1.5, 2) - 0.25) * flat(x, z) + Math.max(0, -z - 7) * 0.05;
    const pathX = z => (TALL ? -1.75 : -3.2) - 1.4 * Math.sin(z * 0.35) + z * 0.25;
    const onPath = (x, z) => Math.abs(x - pathX(z)) < 0.42 + 0.03 * z && z > -9;
    const GRASS = { r: [1, 2, 3, 4, 5, 6], blade: { h: 0.11, w: 0.03 } };
    S.ground(
      Object.assign({ tex: (x, y, z, ny, t) => (onPath(x, z) ? S.pick([32, 33, 33, 34], t) : undefined) }, GRASS),
      { rad: 22, res: rs(0.12), h: hf, edge: 0.03, keep: (x, z) => z < 9 && Math.abs(x + 0.6) < (TALL ? 3 : 4.2) + (9 - z) * (TALL ? 0.4 : 0.62) }
    );

    const BARK = { r: [11, 11, 12, 13] };
    const LEAF = { r: [7, 8, 9, 9, 10], leaf: {} };
    S.tree(TALL ? 3.9 : 3.3, hf(3.3, -1.2) - 0.1, TALL ? -2.2 : -1.2, { h: 6.2, r: 0.3, lean: [0.08, 0.02], nb: 6, spread: 3.0, cr: 1.25, cl: 4, bark: BARK, leaf: LEAF, lres: rs(0.13), ls: 0.55, leaves: 6200 });   // (many small leaves: the crown stays crisp at this pixel size)
    S.tree(TALL ? -2.9 : -6.2, hf(-6.2, -4) - 0.1, TALL ? -6 : -4, { h: 3.4, r: 0.16, lean: [-0.05, 0], nb: 5, spread: 1.7, cr: 0.95, cl: 3, bark: BARK, leaf: LEAF, roots: 0, lres: rs(0.13), ls: 0.34, leaves: 5000 });
    for (const [x, z, r] of [[-3.9, -2.6, 0.6], [-8.4, -1.6, 0.8], [6.9, -4.6, 0.7]])
      S.rock([x, hf(x, z) + r * 0.45, z], [r * 1.3, r, r * 1.1], LEAF, { res: rs(0.075) });
    // a line of woods along the horizon, hazier with distance
    const FAR = { r: [46, 47, 48, 49], leaf: {} };
    for (let x = -24; x < 24; x += rr(1.2, 2.6)) {
      const z = -17 + rr(-1.5, 1.5), r = rr(1.1, 2.0);
      S.rock([x, hf(x, z) + r * 0.7, z], [r, r * rr(0.9, 1.5), r], FAR, { res: rs(0.14) });
    }
    for (const [x, z, r] of [[-2.2, 1.6, 0.22], [-4.6, 3.2, 0.3], [5.4, 2.2, 0.26]])
      S.rock([x, hf(x, z) + r * 0.4, z], r, { r: [42, 43, 44] }, { res: rs(0.07) });

    // the desk
    const gy = hf(0, 0.2);
    const WOOD = { r: [14, 15, 16, 17] };
    const top = gy + 1.0;
    S.box([0, top, 0.2], [1.7, 0.06, 0.62], WOOD, { res: rs(0.06) });
    S.box([0, top - 0.16, 0.2], [1.55, 0.08, 0.5], { r: [14, 15, 15, 16] }, { res: rs(0.07) });
    for (const sx of [-1.5, 1.5]) for (const sz of [-0.28, 0.68])
      S.box([sx, gy + 0.46, sz], [0.07, 0.5, 0.07], WOOD, { res: rs(0.06) });
    S.box([0, gy + 0.3, -0.28], [1.5, 0.04, 0.04], { r: [14, 15, 16] }, { res: rs(0.06) });

    // monitor
    const STEEL = { r: [18, 19, 19, 20] };
    // (its bottom edge is kept well above the mug and the books, so nothing on the desk stands in front of the glass)
    const my = top + 1.34;
    S.box([0, my, 0.05], [1.34, 0.82, 0.05], STEEL, { res: rs(0.05) });
    S.box([0, my + 0.04, 0.105], [1.26, 0.7, 0.012], { r: [21], em: true }, { res: rs(0.04) });
    S.box([0, top + 0.3, 0.0], [0.07, 0.28, 0.04], STEEL, { res: rs(0.05) });
    S.box([0, top + 0.075, 0.08], [0.36, 0.015, 0.2], STEEL, { res: rs(0.05) });
    // the glass is left dark: hero-anim.js draws the terminal, the toolbar dots and the typing on it

    // things on the desk
    const dy = top + 0.06;
    const CREAM = { r: [23, 24, 24, 25] };
    // mug, with a blue band
    S.tube([[-0.86, dy, 0.6], [-0.86, dy + 0.27, 0.6]], 0.115, 0.115, CREAM, { res: rs(0.04) });
    S.torus([-0.72, dy + 0.14, 0.6], 0.075, 0.024, CREAM, { res: rs(0.035), ax: S.AZ });
    S.tube([[-0.86, dy + 0.1, 0.6], [-0.86, dy + 0.17, 0.6]], 0.119, 0.119, { r: [29] }, { res: rs(0.035) });
    marks.steam = [-0.86, dy + 0.3, 0.6];
    // three books, spines in the status colours
    [[31, 0, 0.5, 0.0], [30, 1, 0.44, 0.03], [29, 2, 0.47, -0.02]].forEach(([c, k, w, off]) => {
      S.box([-1.33 + off, dy + 0.045 + k * 0.09, 0.3], [w / 2, 0.042, 0.19], { r: [c] }, { res: rs(0.04) });
      S.box([-1.33 + off, dy + 0.045 + k * 0.09, 0.492], [w / 2 - 0.02, 0.026, 0.004], { r: [24] }, { res: rs(0.035) });
    });
    // keyboard and mouse
    S.box([0.5, dy + 0.02, 0.6], [0.44, 0.022, 0.13], CREAM, { res: rs(0.04) });
    S.ball([1.1, dy + 0.03, 0.6], [0.06, 0.035, 0.09], { r: [24, 25] }, { res: rs(0.035) });
    // a small plant in a terracotta pot
    S.tube([[1.45, dy, 0.25], [1.45, dy + 0.2, 0.25]], 0.09, 0.125, { r: [26, 27, 28] }, { res: rs(0.04) });
    {
      for (const [ox, oy, oz, r] of [[0, 0.36, 0, 0.15], [-0.13, 0.3, 0.04, 0.11], [0.13, 0.32, -0.02, 0.11], [0.02, 0.52, 0, 0.1]])
        S.ball([1.45 + ox, dy + oy, 0.25 + oz], r, { r: [7, 8, 9, 9, 10] }, { res: rs(0.035) });
    }

    // wildflowers in drifts
    const drifts = [[-1.8, 2.4, 1.3, 38], [1.2, 2.8, 1.2, 39], [-5.2, 1.4, 1.5, 41], [4.6, 3.4, 1.2, 40], [0.4, 4.6, 1.6, 25], [-3, 5, 1.2, 40], [6.5, 0.5, 1.2, 38], [-0.5, -3.5, 1.6, 39], [3, 5.6, 1.4, 41]];
    for (const [cx, cz, r, c] of drifts)
      for (let k = 0; k < 26; k++) {
        const a = rr(0, 6.28), d = Math.sqrt(rr(0, 1)) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (onPath(x, z) || (Math.abs(x) < 1.8 && Math.abs(z - 0.2) < 0.8)) continue;
        const y = hf(x, z), h = rr(0.24, 0.42);
        S.tube([[x, y, z], [x + 0.02, y + h, z]], 0.012, 0.009, { r: [3, 4] }, { res: rs(0.05) });
        if (c === 39) {
          // lavender: a short spike
          for (let q = 0; q < 4; q++) S.ball([x + 0.02, y + h - 0.02 + q * 0.045, z], 0.03 - q * 0.004, { r: [c], em: true }, { res: rs(0.03) });
        } else {
          const pr = rr(0.026, 0.034), tilt = rr(0.3, 0.7), spin = rr(0, 6.28);
          for (let q = 0; q < 5; q++) {
            const a2 = spin + (q / 5) * 6.283;
            S.ball([x + 0.02 + Math.cos(a2) * pr * 1.25, y + h + Math.sin(a2) * pr * 1.25 * Math.cos(tilt), z + Math.sin(a2) * pr * 1.25 * Math.sin(tilt) + 0.01], pr, { r: [c], em: true }, { res: rs(0.03) });
          }
          S.ball([x + 0.02, y + h, z + 0.03], pr * 0.7, { r: [c === 40 ? 25 : 40], em: true }, { res: rs(0.03) });
        }
      }


    // the sky: a lit backdrop far behind everything, deep blue overhead and pale at the horizon, in ragged bands
    const skyTop = TALL ? 15 : 19;
    S.box([0, 14, -44], [80, 34, 0.2], {
      r: [50], em: true, noLine: true,
      tex: (x, y) => 50 + Math.max(0, Math.min(5, Math.floor((1 - (y - 2.5) / (skyTop - 2.5)) * 6 + (B.fbm(x * 0.09, y * 0.35, 2.1, 2) - 0.5) * 1.5)))
    }, { res: rs(0.7) });

    // clouds, far behind
    const CLOUD = { r: [35, 36, 37, 37], noLine: true };
    const skies = TALL
      ? []                                                 // (the copy sits over the portrait sky, so it stays clear)
      : [[7, 9.6, -22, 3.0], [14, 7.2, -24, 2.3], [3.5, 6.1, -26, 1.7], [12.5, 12, -26, 1.8]];   // kept to the right, away from the headline
    for (const [cx, cy, cz, s] of skies) {
      const g = S.grp(0.8);
      for (let k = 0; k < 7; k++)
        S.ball([cx + (k - 3) * s * 0.55 + rr(-0.3, 0.3), cy + rr(0, 0.5) * s * (1 - Math.abs(k - 3) / 4), cz], [s * rr(0.5, 0.8), s * rr(0.4, 0.62) * (1 - Math.abs(k - 3) / 5), s * 0.5], CLOUD, Object.assign({ res: rs(0.2) }, g));
    }
    S.bake();

    const W = B.finish({
      cam: TALL ? { target: [0, 4.15, 0], dist: 12.5, pitch: 0.05, yaw: 0.0 } : { target: [-1.7, 2.75, 0], dist: 11.5, pitch: 0.07, yaw: 0.0 },
      detail: 16 * (+process.env.INK_D || 1),
      dither: 0.25,
      radius: 30,
      palName: 'Cadence meadow'
    });
    // for loop.js: what to move itself (clouds by depth, flower heads by colour) and what to locate in the picture
    W.marks = { steam: marks.steam, screen: 21, screenWorld: [2.52, 1.4, my + 0.04], cloudZ: -20, clouds: skies, still: (x, y, z) => z < -35, sway: [38, 39, 40, 41], swayBelow: gy + 0.8 };
    return W;
  }
});
