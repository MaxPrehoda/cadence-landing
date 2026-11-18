// Cadence harbour band: sailboats at sunset, sails in the three status colours. Sculpted for ink-studio.
module.exports = ({ makeBuilder, makeSculpt, KIT: K }) => ({
  id: 'cadence-harbour',
  name: 'Harbour at sunset',
  seed: 5,
  build(seed) {
    const pal = [
      0x27489f, // 0 top of the sky
      0x27489f, 0x3a5cb3, 0x5368be, 0x7a75c4, 0xa684c2, 0xd095b6, 0xeba6a5, 0xf6bc96, 0xfbd08f, // 1-9 dusk sky, top to horizon
      0x16306f, 0x1f3f86, 0x27509a, 0x3263ab, 0x4277bb, 0x5b8fcb, // 10-15 sea
      0x8b6aa9, 0xc08ab8, 0xe2a2b2, 0xf5c0b4, 0xffdccb, 0xfff0e2, // 16-21 clouds
      0xffe7a8, 0xfff1c4, 0xfffbe6, // 22-24 sun
      0x35336a, 0x4b4579, 0x6a6095, 0x8b7cae, // 25-28 far land
      0x1c2340, 0x2c3558, 0x3c4873, // 29-31 hull
      0xcfc6b3, 0xf1ebdd, 0xfffaf0, // 32-34 cream
      0x2a1d12, 0x8a5634, 0xc4874f, // 35-37 wood
      0x2a5fc0, 0x3b82f6, 0x8fb8ff, // 38-40 blue sail
      0xb97905, 0xf2a20c, 0xffd277, // 41-43 amber sail
      0x178041, 0x22b357, 0x8be0a8, // 44-46 green sail
      0x1d4d3c, 0x2a6640, 0x3d8240, 0x579e3f, 0x77b843, 0x9bcf52, // 47-52 grass
      0xff6b5e, 0xc79bf2, 0xf7d34a, 0xff9ec4, 0xffffff, // 53-57 flowers
      0xffd98a, 0xf6bc96, // 58-59 glitter
      0xc9544c // 60 lighthouse band
    ];
    const B = makeBuilder(seed, pal);
    const { rr } = B;
    const S = K.sculpt(makeSculpt(B));
    const Q = +process.env.INK_Q || 1, rs = v => v / Q;
    S.res = 0.1 / Q;
    S.sun = B.norm([0.5, 0.35, -0.8]);                     // low, ahead and to the right: the boats are lit from behind
    S.amb = 0.3; S.sky = 0.34; S.sunK = 0.6;
    S.focus = { p: [0, 0, 2], near: 9, far: 26, coarse: 2.4 };
    const SUNX = 9.5;

    // sky backdrop: banded from deep blue overhead to peach at the horizon, warmer round the sun
    S.box([0, 12, -70], [120, 30, 0.2], {
      r: [1], em: true, noLine: true,
      tex: (x, y) => {
        const warm = Math.max(0, 1 - Math.hypot(x - SUNX * 5.2, (y - 1) * 1.6) / 34);
        return 1 + Math.max(0, Math.min(8, Math.floor((1 - (y - 0.5) / 20.5) * 9 + warm * 1.6 + (B.fbm(x * 0.06, y * 0.3, 2.1, 2) - 0.5) * 1.3)));
      }
    }, { res: rs(0.8) });
    // the sun, half set
    S.ball([SUNX * 5.2, 1.4, -68], [3.9, 3.9, 0.3], { r: [22], em: true, noLine: true }, { res: rs(0.3) });
    S.ball([SUNX * 5.2, 1.4, -67.6], [3.0, 3.0, 0.3], { r: [23], em: true, noLine: true }, { res: rs(0.3) });
    S.ball([SUNX * 5.2, 1.4, -67.2], [2.1, 2.1, 0.3], { r: [24], em: true, noLine: true }, { res: rs(0.3) });
    // far land in two ranges, and a lighthouse on the left headland
    const FARL = { r: [27, 27, 28], em: true, noLine: true }, NEARL = { r: [25, 25, 26], em: true, noLine: true };
    for (let x = -80; x < 80; x += rr(5, 9)) S.rock([x, 0.2, -64], [rr(5, 9), rr(1.2, 2.6), 1], FARL, { res: rs(0.5) });
    for (let x = -70; x < 70; x += rr(6, 11)) if (Math.abs(x - 44) > 12) S.rock([x, 0, -58], [rr(5, 9), rr(0.8, 1.8) + 2.2 * Math.exp(-(((x + 46) / 9) ** 2)), 1], NEARL, { res: rs(0.5) });
    S.box([-46, 3.6, -57], [0.28, 1.0, 0.3], { r: [33], em: true }, { res: rs(0.18) });
    S.box([-46, 3.8, -56.9], [0.3, 0.2, 0.3], { r: [60], em: true }, { res: rs(0.18) });
    S.box([-46, 4.7, -57], [0.38, 0.14, 0.3], { r: [29], em: true }, { res: rs(0.18) });
    S.box([-46, 5.0, -56.8], [0.18, 0.18, 0.3], { r: [24], em: true, fl: { k: 4, ph: 0, sp: 2.1, rg: 0, em: true } }, { res: rs(0.18) });

    // clouds
    const CLOUD = { r: [16, 17, 18, 19, 20, 21], noLine: true };
    const skies = [[-22, 13, -50, 4.2], [-6, 17.5, -52, 2.6], [20, 12.5, -50, 4.6], [6, 19, -54, 2.2], [-1, 8.6, -55, 2.6], [34, 17, -54, 2.6]];
    for (const [cx, cy, cz, s] of skies) {
      const g = S.grp(1.0);
      for (let k = 0; k < 7; k++)
        S.ball([cx + (k - 3) * s * 0.62 + rr(-0.4, 0.4), cy + rr(0, 0.5) * s * (1 - Math.abs(k - 3) / 4), cz], [s * rr(0.5, 0.82), s * rr(0.38, 0.6) * (1 - Math.abs(k - 3) / 5), s * 0.5], CLOUD, Object.assign({ res: rs(0.2) }, g));   // (dense enough that no sky shows between dabs)
    }

    // boats: blue working, amber needs you, green done
    const boats = [[-9.5, -3.5, 3.4, 38], [-4.2, -12, 2.6, 41], [0.8, -1.2, 4.2, 38], [8.6, -8, 3.0, 44], [14.5, -19, 2.4, 38]];
    const HULL = { r: [30, 31, 31, 32] }, CREAM = { r: [32, 33, 33, 34] }, WOOD = { r: [35, 36, 37] };
    const tri = (a, b, c) => [[a, b, c]];
    boats.forEach(([x, z, L, c]) => {
      const g = S.grp(0.05);
      S.ball([x, 0.1, z], [L / 2, 0.36, L * 0.15], HULL, Object.assign({ res: rs(0.06) }, g));
      S.box([x - L * 0.02, 0.36, z], [L * 0.46, 0.05, L * 0.13], CREAM, { res: rs(0.06) });
      S.box([x - L * 0.14, 0.56, z], [L * 0.16, 0.16, L * 0.09], CREAM, { res: rs(0.055) });
      for (const wx of [-0.22, -0.14, -0.06]) S.box([x + wx * L, 0.58, z + L * 0.092], [L * 0.022, 0.06, 0.006], { r: [29], em: true }, { res: rs(0.04) });
      const mx = x + L * 0.06, H = L * 1.05;
      S.tube([[mx, 0.4, z], [mx, 0.5 + H, z]], 0.035, 0.025, WOOD, { res: rs(0.05) });
      S.tube([[mx - L * 0.44, 0.78, z], [mx, 0.78, z]], 0.025, 0.025, WOOD, { res: rs(0.05) });
      // mainsail aft of the mast in the status colour, jib forward in cream
      S.extrude(tri([0, 0], [-L * 0.43, 0], [0, H * 0.9]), [mx - 0.05, 0.84, z], 0.05, { r: [c, c + 1, c + 1, c + 2] }, { res: rs(0.055) });
      S.extrude(tri([0, 0], [L * 0.36, 0], [0, H * 0.82]), [mx + 0.07, 0.62, z], 0.05, CREAM, { res: rs(0.055) });
      S.box([mx - 0.12, 0.52 + H, z], [0.12, 0.05, 0.01], { r: [53], em: true }, { res: rs(0.04) });
    });

    // the grassy bank in front
    const hb = (x, z) => 0.55 + 0.22 * B.fbm(x * 0.2 + 1, z * 0.3, 1.5, 2) - Math.max(0, 6.6 - z) * 0.9;
    S.ground({ r: [47, 48, 49, 50, 51, 52], blade: { h: 0.16, w: 0.035 } }, { rad: 30, res: rs(0.11), h: hb, edge: 0.02, keep: (x, z) => z > 5.4 && z < 11.5 && Math.abs(x) < 15 + (11 - z) });
    for (let k = 0; k < 150; k++) {
      const x = rr(-14, 14), z = rr(6.8, 10.2), y = hb(x, z), h = rr(0.22, 0.4), c = [53, 54, 55, 56, 57][Math.floor(rr(0, 5))];
      S.tube([[x, y, z], [x + 0.02, y + h, z]], 0.012, 0.009, { r: [49, 50] }, { res: rs(0.05) });
      if (c === 54) for (let q = 0; q < 4; q++) S.ball([x + 0.02, y + h - 0.02 + q * 0.045, z], 0.03 - q * 0.004, { r: [c], em: true }, { res: rs(0.03) });
      else {
        const pr = rr(0.026, 0.034), spin = rr(0, 6.28);
        for (let q = 0; q < 5; q++) S.ball([x + 0.02 + Math.cos(spin + q * 1.2566) * pr * 1.25, y + h + Math.sin(spin + q * 1.2566) * pr * 1.1, z + 0.01], pr, { r: [c], em: true }, { res: rs(0.03) });
        S.ball([x + 0.02, y + h, z + 0.03], pr * 0.7, { r: [c === 55 ? 57 : 55], em: true }, { res: rs(0.03) });
      }
    }
    S.bake();

    // the sea: a mirror for the boats and the sky, banded darker toward the viewer; then the sun's path of sparks on it
    const mirror = K.reflection.plane({ id: 'sea', at: [0, 0, 0] });
    const water = K.reflection.material(
      { r: [10, 11, 12, 13, 14, 15], a: 0.9, noLine: true, tex: (x, y, z) => 11 + Math.max(0, Math.min(4, Math.floor((-z + 6) / 62 * 4.6 + 0.3 + (B.fbm(x * 0.25, z * 0.9, 3.3, 2) - 0.5) * 1.2))) },
      'sea', { f0: 0.22, distortion: 6, blur: 0.9, color: '#f2b79d' });
    S.ball([0, -0.03, -26], [90, 0.03, 34], water, { res: 0.13, ghost: true });   // (a flat sheet: finer sampling adds nothing)
    S.bake();
    const sparks = [];
    for (let k = 0; k < 520; k++) {
      const d = Math.pow(rr(0, 1), 0.8), z = -55 + d * 59, w = 0.8 + d * 3.2;
      const x = SUNX * 5.2 * ((-z + 12) / 80) * 0.0 + (SUNX * 5.2) * (1 - d) * 0.86 + (rr(-1, 1) + rr(-1, 1)) * w + SUNX * d * 0.55;
      sparks.push([x, z]);
      S.box([x, 0.012, z], [rr(0.1, 0.3) * (0.5 + d), 0.006, 0.02 + d * 0.03], { r: [k % 3 ? 58 : k % 2 ? 23 : 59], em: true, noLine: true }, { res: rs(0.09) });
    }
    for (let k = 0; k < 420; k++) {
      const z = -52 + Math.pow(rr(0, 1), 0.7) * 56, x = rr(-60, 60) * (0.35 + (-z + 6) / 70);
      S.box([x, 0.012, z], [rr(0.12, 0.5), 0.006, 0.02], { r: [k % 4 ? 15 : 11], em: true, noLine: true }, { res: rs(0.1) });
    }
    S.bake();

    const W = B.finish({
      cam: { target: [0, 3.1, -6], dist: 21, pitch: 0.035, yaw: 0 },
      detail: 16 * (+process.env.INK_D || 1),
      dither: 0.25,
      radius: 60,
      reflections: [mirror],
      palName: 'Cadence harbour'
    });
    // for loop.js: the boats bob and roll a little, each in its own time; sparks and wave glints sink under the surface and come back
    W.marks = {
      cloudZ: -45, clouds: skies, still: (x, y, z) => z < -56.8,   // (behind the deepest cloud dab, in front of the far land)
      sway: [53, 54, 55, 56, 57], swayBelow: 2,
      bob: (x, y, z) => {
        if (y > -0.05 && y < 0.03 && z < 5) return { amp: 0.03, ph: (Math.sin(x * 12.9 + z * 78.2) * 43758.5 % 1) * 6.283, turns: 4 + (Math.abs(Math.round(x * 7 + z * 3)) % 5), sink: true };
        for (let i = 0; i < boats.length; i++) {
          const [bx, bz, L] = boats[i];
          if (Math.abs(x - bx) < L * 0.62 && Math.abs(z - bz) < L * 0.22 && y > 0.031) return { amp: 0.05 + L * 0.012, ph: i * 1.9, turns: 3, roll: 0.012, y0: 0 };
        }
      }
    };
    return W;
  }
});
