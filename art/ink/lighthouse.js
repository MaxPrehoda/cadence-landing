// Cadence lighthouse: a striped tower on a rock at dusk, its beam turning. Sculpted for ink-studio.
module.exports = ({ makeBuilder, makeSculpt, KIT: K }) => ({
  id: 'cadence-lighthouse',
  name: 'Lighthouse at dusk',
  seed: 9,
  build(seed) {
    const pal = [
      0x0f173f, // 0 top of the sky
      0x0f173f, 0x141d48, 0x1b275a, 0x24336c, 0x33437e, 0x4a5590, 0x6c68a0, 0x9a7fae, 0xcc93a8, 0xeaa797, // 1-10 night sky to dusk
      0x101f52, 0x152a63, 0x1d3672, 0x284684, 0x365996, // 11-15 sea
      0x2b2836, 0x3d3949, 0x55505f, 0x706a7a, 0x8d8796, 0xaaa4b1, // 16-21 rock
      0x4a1210, 0x6e1b17, 0x96261f, 0xb9352b, 0xd4503f, // 22-26 red
      0x6f6885, 0x928aa4, 0xb9b1c2, 0xdcd6dc, 0xf6f2ec, // 27-31 white
      0x12101c, 0x1e1b2a, 0x2c2940, 0x55506f, // 32-35 iron
      0xf2a20c, 0xffd98a, 0xfff6d8, // 36-38 lamp
      0x5a4d86, 0x8c6e9f, 0xb382a6, 0xd99aa8, 0xf2b8ae, // 39-43 clouds
      0xf4f1e4, 0xcfd6f6, 0x2a2a5c, 0x5f4334, // 44 moon, 45 star, 46 far shore, 47 door
      0x4d4654, 0x7d6c50, 0xb39552, 0xe2c26c // 48-51 the beam through night air (only the renderer's blending lands on these)
    ];
    const B = makeBuilder(seed, pal);
    const { rr } = B;
    const S = K.sculpt(makeSculpt(B));
    const Q = +process.env.INK_Q || 1, rs = v => v / Q;
    S.res = 0.1 / Q;
    S.sun = B.norm([0.6, 0.45, 0.5]);                      // the last of the light, low from the right
    S.amb = 0.22; S.sky = 0.3; S.sunK = 0.62;

    // sky backdrop, banded from night overhead to a dusk glow on the horizon
    S.box([0, 12, -60], [60, 30, 0.2], {
      r: [1], em: true, noLine: true,
      tex: (x, y) => 1 + Math.max(0, Math.min(9, Math.floor(Math.max(0, 1 - (y - 0.4) / 17) ** 1.25 * 10 + (B.fbm(x * 0.07, y * 0.3, 2.1, 2) - 0.5) * 1.2)))
    }, { res: rs(0.7) });
    // stars, thicker toward the top; each twinkles in its own time
    for (let k = 0; k < 190; k++) {
      const y = 9 + Math.pow(rr(0, 1), 0.7) * 20, x = rr(-26, 26), big = rr(0, 1) < 0.14;
      S.box([x, y, -59], [big ? 0.14 : 0.07, big ? 0.14 : 0.07, 0.05], { r: [big ? 31 : 45], em: true, noLine: true, fl: { k: 4, ph: rr(0, 6.28), sp: rr(1.5, 4), rg: 0, em: true, nd: true } }, { res: rs(0.2) });
    }
    // a crescent moon: a pale disc with a disc of sky laid over one side
    S.ball([-9, 21, -58.5], [1.5, 1.5, 0.1], { r: [44], em: true, noLine: true }, { res: rs(0.2) });
    S.ball([-8.3, 21.4, -58.2], [1.35, 1.35, 0.1], { r: [3], em: true, noLine: true }, { res: rs(0.2) });
    // far shore with a few lit windows
    for (let x = -30; x < -4; x += rr(3, 6)) S.rock([x, 0.2, -52], [rr(3, 6), rr(0.5, 1.1), 1], { r: [46], em: true, noLine: true }, { res: rs(0.4) });
    for (const x of [-24, -21.5, -17, -13.2, -9.5]) S.box([x, 0.55, -50], [0.09, 0.09, 0.05], { r: [37], em: true, noLine: true, fl: { k: 4, ph: x, sp: 2.5, rg: 0, em: true, nd: true } }, { res: rs(0.2) });
    // dusk clouds low on the horizon
    const CLOUD = { r: [39, 40, 41, 42, 43], noLine: true };
    const skies = [[-9, 6.2, -44, 3.0], [9.5, 8.6, -46, 2.2], [1, 3.4, -48, 2.0]];
    for (const [cx, cy, cz, s] of skies) {
      const g = S.grp(0.9);
      for (let k = 0; k < 7; k++)
        S.ball([cx + (k - 3) * s * 0.6 + rr(-0.3, 0.3), cy + rr(0, 0.5) * s * (1 - Math.abs(k - 3) / 4), cz], [s * rr(0.5, 0.8), s * rr(0.36, 0.56) * (1 - Math.abs(k - 3) / 5), s * 0.5], CLOUD, Object.assign({ res: rs(0.2) }, g));   // (dense enough that no sky shows between dabs)
    }

    // the rock
    const ROCK = { r: [16, 17, 18, 19, 20, 21] };
    for (const [x, y, z, r] of [[0, 0.2, 0, 2.4], [-1.9, -0.2, 0.7, 1.5], [2.0, -0.1, 0.5, 1.6], [-0.6, 0.3, 1.4, 1.4], [1.0, 0.2, 1.5, 1.3], [-3.0, -0.5, 1.2, 1.0], [3.1, -0.5, 1.3, 1.0], [0.3, -0.3, 2.4, 1.1], [-1.6, -0.5, 2.3, 0.9], [2.1, -0.6, 2.4, 0.8]])
      S.rock([x, y, z], [r, r * 0.8, r * 0.9], ROCK, { res: rs(0.085) });
    // the tower: a tapered shaft in red and white bands, a gallery, the lantern and its roof
    const base = 1.6, TH = 6.6;
    S.lathe([0, base, 0], TH, [0.95, 0.62], {
      r: [27, 28, 29, 30, 31],
      tex: (x, y, z, ny, t) => (Math.floor((y - base) / (TH / 7)) % 2 === 1 ? S.pick([22, 23, 24, 25, 26], t) : undefined)
    }, { res: rs(0.055) });
    const IRON = { r: [32, 33, 34, 35] };
    const top = base + TH;
    S.lathe([0, top, 0], 0.16, [0.95, 0.95], IRON, { res: rs(0.05) });
    for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.283; S.tube([[Math.cos(a) * 0.9, top + 0.16, Math.sin(a) * 0.9], [Math.cos(a) * 0.9, top + 0.62, Math.sin(a) * 0.9]], 0.022, 0.022, IRON, { res: rs(0.04) }); }
    S.torus([0, top + 0.62, 0], 0.9, 0.028, IRON, { res: rs(0.04) });
    S.lathe([0, top + 0.16, 0], 1.0, [0.5, 0.5], { r: [36, 37, 38], em: true }, { res: rs(0.045) });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283 + 0.5; S.tube([[Math.cos(a) * 0.51, top + 0.16, Math.sin(a) * 0.51], [Math.cos(a) * 0.51, top + 1.16, Math.sin(a) * 0.51]], 0.03, 0.03, IRON, { res: rs(0.04) }); }
    S.lathe([0, top + 1.16, 0], 0.12, [0.68, 0.68], IRON, { res: rs(0.045) });
    S.lathe([0, top + 1.28, 0], 0.6, [0.62, 0.04], IRON, { res: rs(0.045) });
    S.tube([[0, top + 1.85, 0], [0, top + 2.3, 0]], 0.03, 0.02, IRON, { res: rs(0.04) });
    // windows (one lit) and the door, on the side that faces us
    S.box([0.1, base + 4.3, 0.74], [0.13, 0.2, 0.03], { r: [37], em: true }, { res: rs(0.04) });
    S.box([-0.05, base + 2.5, 0.83], [0.13, 0.2, 0.03], { r: [32], em: true }, { res: rs(0.04) });
    S.box([0.0, base + 0.42, 0.93], [0.2, 0.4, 0.04], { r: [47], em: true }, { res: rs(0.04) });
    S.bake();

    // the sea, a mirror for the rock and the dusk
    const mirror = K.reflection.plane({ id: 'sea', at: [0, 0, 0] });
    const water = K.reflection.material(
      { r: [11, 12, 13, 14, 15], a: 0.92, noLine: true, tex: (x, y, z) => 11 + Math.max(0, Math.min(4, Math.floor((-z + 8) / 56 * 4.4 + 0.2 + (B.fbm(x * 0.3, z * 0.9, 3.3, 2) - 0.5) * 1.3))) },
      'sea', { f0: 0.3, distortion: 7, blur: 0.8, color: '#eaa797' });
    S.ball([0, -0.03, -20], [70, 0.03, 34], water, { res: 0.13, ghost: true });   // (a flat sheet: finer sampling adds nothing)
    S.bake();
    for (let k = 0; k < 360; k++) {
      const z = -46 + Math.pow(rr(0, 1), 0.7) * 54, x = rr(-30, 30) * (0.3 + (-z + 8) / 60);
      if (Math.hypot(x, z - 0.8) < 3.6) continue;
      S.box([x, 0.012, z], [rr(0.1, 0.4), 0.006, 0.02], { r: [k % 3 ? 15 : 11], em: true, noLine: true }, { res: rs(0.1) });
    }
    // surf round the foot of the rock
    for (let k = 0; k < 90; k++) { const a = rr(0, 3.14), r = 3.3 + rr(-0.3, 0.5); S.box([Math.cos(a) * r * 1.05, 0.012, 0.9 + Math.sin(a) * r * 0.78], [rr(0.08, 0.22), 0.006, 0.025], { r: [k % 2 ? 29 : 45], em: true, noLine: true }, { res: rs(0.08) }); }
    S.bake();

    const lamp = [0, top + 0.66, 0];
    const beam = K.atmosphere.shaft({ from: lamp, to: [-30, lamp[1] - 0.6, 6], radius: 0.5, density: 0.62, color: '#ffc85a' });
    const glow = K.atmosphere.sphere({ at: lamp, radius: 0.9, density: 0.25, color: '#ffc85a' });
    const W = B.finish({
      cam: { target: [0, 5.6, 0], dist: 22, pitch: 0.03, yaw: 0 },
      detail: 16 * (+process.env.INK_D || 1),
      dither: 0.25,
      radius: 50,
      reflections: [mirror],
      atmosphere: [beam, glow],
      palName: 'Cadence lighthouse'
    });
    // for loop.js: clouds drift, wave glints sink and return, and the beam makes one full turn per loop
    W.marks = {
      cloudZ: -40, clouds: skies, still: (x, y, z) => z < -49.6,   // (behind the deepest cloud dab, in front of the far shore)
      cycle: { 4: 1 },
      bob: (x, y, z) => (y > -0.05 && y < 0.03 && z < 7 ? { amp: 0.03, ph: (Math.sin(x * 12.9 + z * 78.2) * 43758.5 % 1) * 6.283, turns: 4 + (Math.abs(Math.round(x * 7 + z * 3)) % 5) } : null),
      frame: (world, u) => {
        const a = u + 2.6;
        world.atmosphere[0] = K.atmosphere.shaft({ from: lamp, to: [lamp[0] + Math.cos(a) * 34, lamp[1] - 0.5, lamp[2] + Math.sin(a) * 34], radius: 0.5, density: 0.62, color: '#ffc85a' });
        world.atmosphere[1] = K.atmosphere.sphere({ at: lamp, radius: 0.8 + 1.5 * Math.max(0, Math.sin(a)) ** 4, density: 0.2 + 0.4 * Math.max(0, Math.sin(a)) ** 4, color: '#ffc85a' });
      }
    };
    return W;
  }
});
