/* The animated hero.
   The meadow is a 3D scene sculpted for ink-studio (art/ink/meadow.js) and rendered as two seamless 12-second loops:
   a wide framing (art/hero/wide.webp) and a portrait one for phones and upright tablets (art/hero/tall.webp). Each is
   a lossless animated picture at its own pixel size, with a .json beside it saying how big it is and where the
   monitor's glass sits.

   This script shows the right loop in the hero's image and draws the live parts on a transparent canvas laid over it at
   the same pixel size: the terminal on the monitor, the toolbar dots that follow the status chips, the typing, steam
   from the mug, birds, butterflies and falling leaves.

   It also lays the hero out. Wide screens crop the picture to cover. Tall screens get the portrait loop, whole device
   pixels per art pixel, the status chips stacked between the copy and the monitor, and a hero as tall as that needs.

   The overlay runs at about 30 fps and pauses off screen and in background tabs. With reduced motion the still picture
   (art/hero.png, art/hero-tall.png) stays, with the terminal drawn on it. */
(() => {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const BASE = '/art/hero/';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FPS = 30;
    const hero = canvas.parentElement;
    const still = hero.querySelector('img.hero-art');
    const copy = hero.querySelector('.hero-copy');
    const chipsEl = hero.querySelector('.chips');
    const C = { blue: '#3b82f6', amber: '#f2a20c', green: '#22b357', idle: '#6b6a78' };
    const AMBER_DIM = '#a86f08', BLUE_LIT = '#6aa5ff';

    // ---- the story: one 24 s clock for the monitor's toolbar dots and the status chips -------------------------
    // Questions arrive and get answered, work finishes, finished work is cleared and new work starts. Each phase is
    // the five dots (B working, A needs you, G done, I idle) and the three chips shown: [agent slot, detail].
    const SLOTS = ['Password reset', 'Contact form', 'Slow homepage', 'Typo sweep', 'Welcome email'];
    const PHASES = [
        [0, 'BABGB', [[1, 'Where do messages go?'], [0, 'Editing login.js'], [3, '12 typos fixed']]],
        [4, 'BBBGB', [[1, 'Answered: email them to me'], [0, 'Editing login.js'], [3, '12 typos fixed']]],
        [7.5, 'GBBGB', [[0, '38 tests pass'], [1, 'Hooking up the email'], [3, '12 typos fixed']]],
        [11, 'GBBIA', [[4, 'Warmer, or shorter?'], [0, '38 tests pass'], [1, 'Hooking up the email']]],
        [14, 'GBGIA', [[4, 'Warmer, or shorter?'], [2, 'Loads in under a second'], [0, '38 tests pass']]],
        [17, 'IBGIB', [[4, 'Answered: warmer'], [2, 'Loads in under a second'], [1, 'Hooking up the email']]],
        [20.5, 'BBIGB', [[3, '12 typos fixed'], [4, 'Rewriting the email'], [1, 'Form tests running']]],
    ];
    const LOOP = 24;
    const CODE = { B: 'blue', A: 'amber', G: 'green', I: 'idle' };
    const LABEL = { blue: 'Working', amber: 'Needs you', green: 'Done' };
    const phaseAt = t => { let k = 0; PHASES.forEach(([at], i) => { if (t % LOOP >= at) k = i; }); return k; };
    const dotsAt = t => [...PHASES[phaseAt(t)][1]].map(c => CODE[c]);

    // Chips: rebuilt on each phase change. Kept chips glide to their new row (FLIP), new ones rise out of the
    // monitor, cleared ones fade.
    let shownPhase = 0, hover = -1, t = 0, timer = 0;
    const flash = {};
    const hoverOn = (el, slot) => {
        el.addEventListener('mouseenter', () => { hover = slot; if (!timer) frame(t, 0); });
        el.addEventListener('mouseleave', () => { hover = -1; if (!timer) frame(t, 0); });
    };
    function renderChips(k, animate) {
        if (!chipsEl) return;
        const [, dots, rows] = PHASES[k];
        const live = [...chipsEl.querySelectorAll('.chip:not(.leave)')];
        const before = new Map(live.map(el => [el.dataset.slot, el.getBoundingClientRect()]));
        const old = new Map(live.map(el => [el.dataset.slot, el]));
        const keep = new Set(rows.map(([s]) => String(s)));
        for (const [slot, el] of old) {
            if (keep.has(slot)) continue;
            if (!animate) { el.remove(); continue; }
            Object.assign(el.style, { position: 'absolute', top: el.offsetTop + 'px', left: el.offsetLeft + 'px', width: el.offsetWidth + 'px' });
            el.classList.add('leave');
            setTimeout(() => el.remove(), 320);
        }
        rows.forEach(([slot, detail]) => {
            const st = CODE[dots[slot]];
            let el = old.get(String(slot));
            const fresh = !el;
            if (fresh) {
                el = document.createElement('div');
                el.className = 'chip';
                el.dataset.slot = slot;
                el.innerHTML = '<i></i><span class="lbl"></span> <b></b><span class="sub"></span>';
                hoverOn(el, slot);
            }
            const changed = !fresh && !el.classList.contains(st);
            el.classList.remove('blue', 'amber', 'green');
            el.classList.add(st);
            el.querySelector('.lbl').textContent = LABEL[st];
            el.querySelector('b').textContent = SLOTS[slot];
            el.querySelector('.sub').textContent = detail;
            if (animate && fresh) el.classList.add('enter');
            if (animate && changed) {
                const dot = el.querySelector('i');
                dot.classList.remove('ping'); void dot.offsetWidth; dot.classList.add('ping');
            }
            chipsEl.appendChild(el);
        });
        if (!animate) return;
        for (const el of chipsEl.querySelectorAll('.chip:not(.leave)')) {
            const b = before.get(el.dataset.slot);
            if (!b || el.classList.contains('enter')) continue;
            const dy = b.top - el.getBoundingClientRect().top;
            if (!dy) continue;
            el.style.transition = 'none';
            el.style.transform = `translateY(${dy}px)`;
            void el.offsetWidth;
            el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)';
            el.style.transform = '';
        }
        setTimeout(() => chipsEl.querySelectorAll('.chip.enter').forEach(el => el.classList.remove('enter')), 600);
    }
    // adopt the server-rendered chips (phase 0) so hover works before the first change
    if (chipsEl) chipsEl.querySelectorAll('.chip').forEach(el => hoverOn(el, Number(el.dataset.slot)));

    // ---- the terminal on the monitor: a 3x5 pixel font, drawn at 1x on the wide picture and 2x on the tall one ---
    const FONT = {
        a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111',
        f: '111100110100100', g: '011100101101011', h: '101101111101101', i: '111010010010111', j: '001001001101010',
        k: '101101110101101', l: '100100100100111', m: '101111111101101', n: '110101101101101', o: '010101101101010',
        p: '110101110100100', q: '010101101110011', r: '110101110101101', s: '011100010001110', t: '111010010010010',
        u: '101101101101111', v: '101101101101010', w: '101101111111101', x: '101101010101101', y: '101101010010010',
        z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
        4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
        9: '111101111001110', '.': '000000000000010', ',': '000000000010100', '-': '000000111000000',
        '+': '000010111010000', '/': '001001010100100', '>': '100010001010100', '?': '110001010000010',
        '~': '000001111100000', '*': '000101010101000', ' ': '000000000000000',
    };
    const text = (g, x, y, s, color, k) => {
        g.fillStyle = color;
        for (const ch of s) {
            const bits = FONT[ch] || FONT['?'];
            for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(x + (i % 3) * k, y + Math.floor(i / 3) * k, k, k);
            x += 4 * k;
        }
        return x;
    };
    const LINES = [
        [['~/bakery', '#6aa5ff'], [' main', '#8b8996']],
        [['> ', '#f2a20c'], ['add contact form', '#e8e6ee']],
        [['* ', '#3b82f6'], ['read index.html', '#b9b6c4']],
        [['* ', '#3b82f6'], ['edit form.js ', '#b9b6c4'], ['+38', '#22b357'], ['-6', '#ff6b5e']],
        [['* ', '#3b82f6'], ['run tests', '#b9b6c4']],
        [['  38 passed', '#22b357']],
        [['? ', '#f2a20c'], ['messages go to', '#f2c14a']],
        [['  1 email  2 sheet', '#8b8996']],
    ];
    const TYPED = 'email them to me';
    // the static part of the screen, drawn once per picture; returns where the live parts go
    function buildScreen(meta) {
        const [sx, sy, sw, sh] = meta.screen;
        const k = Math.max(1, Math.round(sw / 98));
        const off = document.createElement('canvas');
        off.width = sw; off.height = sh;
        const g = off.getContext('2d');
        g.fillStyle = '#1d1c25'; g.fillRect(0, 0, sw, sh);
        g.fillStyle = '#34333f'; g.fillRect(0, 0, sw, 8 * k);
        g.fillStyle = '#121116'; g.fillRect(0, 8 * k, sw, k);
        ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.fillRect((3 + i * 4) * k, 3 * k, 2 * k, 2 * k); });
        text(g, Math.round(sw / 2) - 12 * k, 2 * k, 'bakery', '#8b8996', k);
        // the Cadence toolbar docked on the right edge
        const tbw = 9 * k, tbx = sw - tbw;
        g.fillStyle = '#0f0e13'; g.fillRect(tbx, 9 * k, tbw, sh - 9 * k);
        g.fillStyle = '#2c2a33'; g.fillRect(tbx, 9 * k, k, sh - 9 * k);
        const gap = Math.floor((sh - 14 * k) / 5);
        const dots = [];
        for (let i = 0; i < 5; i++) {
            const dy = 13 * k + i * gap;
            g.fillStyle = '#1b1a21'; g.fillRect(tbx + 2 * k, dy - 2 * k, 6 * k, 7 * k);
            dots.push([sx + tbx + 3 * k, sy + dy]);
        }
        const pitch = Math.max(6 * k, Math.floor((sh - 12 * k) / (LINES.length + 1)));
        LINES.forEach((segs, i) => { let x = 3 * k; for (const [s, c] of segs) x = text(g, x, 12 * k + i * pitch, s, c, k); });
        const ty = 12 * k + LINES.length * pitch;
        text(g, 3 * k, ty, '> ', '#f2a20c', k);
        const typed = document.createElement('canvas');
        typed.width = TYPED.length * 4 * k; typed.height = 5 * k;
        text(typed.getContext('2d'), 0, 0, TYPED, '#e8e6ee', k);
        // a faint glare across the upper right of the glass
        g.fillStyle = 'rgba(255,255,255,.035)';
        for (let y = 9 * k; y < sh; y++) { const x0 = Math.round(sw * 0.72 - (y - 9 * k) * 0.9); g.fillRect(x0, y, 10 * k, 1); }
        // whatever stands in front of the glass (the mug, the books): the runs of each row that are not glass, cleared after drawing
        const holes = [];
        (meta.glass || []).forEach((runs, y) => {
            let x = 0;
            for (const [a, b] of runs) { if (a > x) holes.push([sx + x, sy + y, a - x]); x = b + 1; }
            if (x < sw) holes.push([sx + x, sy + y, sw - x]);
        });
        return { k, off, typed, dots, holes, type: [sx + 11 * k, sy + ty] };
    }

    // ---- sources: the two loops -------------------------------------------------------------------------------
    const sources = {};
    const stillSrc = name => (name === 'tall' ? '/art/hero-tall.png' : '/art/hero.png');
    function source(name) {
        if (sources[name]) return sources[name];
        const src = sources[name] = { name, meta: null, screen: null, ready: false, loop: null };
        fetch(BASE + name + '.json').then(r => r.json()).then(meta => {
            src.meta = meta;
            src.screen = buildScreen(meta);
            src.ready = true;
            if (cur === src) { layout(); frame(t, 0); canvas.classList.add('ready'); }
            if (reduce) return;
            // fetch the loop, then swap it in for the still picture
            const img = new Image();
            img.onload = () => { src.loop = img.src; if (cur === src && still) still.src = src.loop; };
            img.src = BASE + name + '.webp';
        }).catch(() => {});
        return src;
    }
    let cur = null, visible = true;

    // ---- layout -----------------------------------------------------------------------------------------------
    const place = (el, left, top, w, h) => Object.assign(el.style, { inset: 'auto', left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px', objectFit: 'fill', objectPosition: '0 0' });
    function layout() {
        hero.style.minHeight = '';
        if (chipsEl) { chipsEl.classList.remove('anchored', 'tight', 'stacked'); chipsEl.style.cssText = ''; }
        const cw = hero.clientWidth;
        let ch = hero.clientHeight;
        const tall = cw / ch < 1.15 && cw < 1100;
        hero.classList.toggle('tall', tall);
        const want = source(tall ? 'tall' : 'wide');
        if (want !== cur) {
            cur = want;
            if (still) { const to = cur.loop || stillSrc(cur.name); if (!still.src.endsWith(to)) still.src = to; }
        }
        if (!cur.meta) return;
        const [W, H] = cur.meta.size, [SX, SY, SW] = cur.meta.screen;
        const MX = SX - 4, MY = SY - 4, MW = SW + 8;
        let s, ox, oy;
        if (tall) {
            // Whole device pixels per art pixel, wide enough to cover. The chips stack between the copy and the
            // monitor, and the hero grows until the monitor clears them. Above the picture the sky is the page's own.
            const dpr = window.devicePixelRatio || 1;
            const copyEnd = copy.offsetTop + copy.offsetHeight;
            if (chipsEl) chipsEl.classList.add('anchored', 'stacked');
            const top = copyEnd + 22 + (chipsEl ? 3 * 38 + 2 * 8 : 0) + 12;
            s = Math.max(cw / W, (ch - top) / (H - MY));
            s = Math.ceil(s * dpr - 0.01) / dpr;
            if (s > (cw / W) * 1.9) s = Math.ceil((cw / W) * 1.9 * dpr) / dpr;        // never crop the desk away on wide tablets
            const need = Math.ceil(top + (H - MY) * s);
            if (need > ch) { hero.style.minHeight = need + 'px'; ch = hero.clientHeight; }
            ox = Math.round((cw - W * s) / 2);
            oy = ch - H * s;
        } else {
            s = Math.max(cw / W, ch / H);
            ox = (cw - W * s) * 0.6; oy = ch - H * s;
        }
        place(canvas, ox, oy, W * s, H * s);
        if (still) place(still, ox, oy, W * s, H * s);
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

        // chips sit right on top of the monitor, wherever it landed
        if (!chipsEl) return;
        const left = ox + MX * s, right = ox + (MX + MW) * s, top = oy + MY * s;
        if (tall) {
            const w = Math.min(cw - 24, Math.max(right - left + 56, 344));
            chipsEl.style.left = Math.round(Math.max(12, Math.min(cw - 12 - w, (left + right) / 2 - w / 2))) + 'px';
            chipsEl.style.width = Math.round(w) + 'px';
            chipsEl.style.right = 'auto';
            chipsEl.style.bottom = Math.round(ch - top + 10) + 'px';
            return;
        }
        if (cw <= 960 || left < 0 || right > cw) return;
        chipsEl.classList.add('anchored');
        chipsEl.style.right = Math.round(cw - right) + 'px';
        chipsEl.style.bottom = Math.round(ch - top + 10) + 'px';
        // where the headline's text and buttons actually are (block boxes run the full column width)
        const ink = [];
        for (const e of copy.children) {
            if (!e.offsetParent) continue;
            if (e.classList.contains('row')) { for (const k of e.children) ink.push(k.getBoundingClientRect()); continue; }
            const rg = document.createRange();
            rg.selectNodeContents(e);
            ink.push(...rg.getClientRects());
        }
        const clear = () => {
            const c = chipsEl.getBoundingClientRect();
            return ink.every(r => c.left > r.right + 16 || c.top > r.bottom + 8 || c.bottom < r.top - 8);
        };
        if (clear()) return;
        chipsEl.classList.add('tight');
        if (clear()) return;
        chipsEl.classList.remove('anchored', 'tight');
        chipsEl.style.cssText = '';
    }
    let relayout = 0;
    const queueLayout = () => { cancelAnimationFrame(relayout); relayout = requestAnimationFrame(() => { layout(); if (!timer) frame(t, 0); }); };
    addEventListener('resize', queueLayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueLayout);

    // ---- the live parts ---------------------------------------------------------------------------------------
    const rnd = (a => () => (a = (a * 1664525 + 1013904223) % 4294967296) / 4294967296)(7);
    const px = (x, y, c, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    let steam = [], birds = [], leaves = [], nextBirds = 2.5, nextLeaf = 2;
    const LEAF = [['#a3cf4f', '#4f9a3c'], ['#73b53f', '#25663f'], ['#e3d36a', '#a8963a']];
    const WING = [[-1, -1, -2, -2], [-1, 0, -2, -1], [-1, 0, -2, 0], [-1, 1, -2, 1]];

    function frame(t, dt) {
        const src = cur;
        if (!src || !src.ready) return;
        const [W, H] = src.meta.size, scr = src.screen, k = scr.k;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, W, H);

        // birds, far off: a loose flock crossing now and then
        if (!reduce && t > nextBirds) {
            const y = H * (0.08 + rnd() * 0.14), n = 3 + Math.floor(rnd() * 4), sp = W * (0.035 + rnd() * 0.012);
            for (let i = 0; i < n; i++) birds.push({ x: -8 - i * (7 + rnd() * 6), y: y + (i % 2 ? 1 : -1) * i * 3 + rnd() * 4, v: sp, ph: rnd() * 6 });
            nextBirds = t + 13 + rnd() * 14;
        }
        birds = birds.filter(b => b.x < W + 8);
        for (const b of birds) {
            b.x += b.v * dt;
            const f = Math.sin(t * 0.9 + b.ph) > 0.55 ? 1 : Math.floor(t * 8 + b.ph) % 4;
            const bx = Math.round(b.x), by = Math.round(b.y + Math.sin(t * 1.3 + b.ph) * 2), wg = WING[f], col = '#1d3f6e';
            px(bx, by, col, 2, 1);
            px(bx + wg[0], by + wg[1], col); px(bx + wg[2], by + wg[3], col);
            px(bx + 1 - wg[0], by + wg[1], col); px(bx + 1 - wg[2], by + wg[3], col);
        }

        // the monitor: terminal, toolbar dots that follow the story, and the chips with them
        const [sx, sy] = src.meta.screen;
        ctx.drawImage(scr.off, sx, sy);
        const ph = phaseAt(t);
        if (ph !== shownPhase) {
            const prev = PHASES[shownPhase][1], next = PHASES[ph][1];
            for (let i = 0; i < SLOTS.length; i++) if (prev[i] !== next[i]) flash[i] = t + 0.8;
            shownPhase = ph;
            renderChips(ph, true);
        }
        const st = dotsAt(t), dim = Math.floor(t * 2) % 2 === 1;
        if (chipsEl) chipsEl.classList.toggle('dim', dim);
        scr.dots.forEach(([x, y], i) => {
            let c = C[st[i]];
            if (st[i] === 'amber' && dim) c = AMBER_DIM;
            if (st[i] === 'blue' && Math.floor(t * 1.5 + i * 0.7) % 3 === 0) c = BLUE_LIT;
            px(x, y, c, 3 * k, 3 * k);
            // a ring on the dot whose chip just changed, or is hovered
            if (hover === i || (t < (flash[i] ?? -1) && Math.floor(t * 8) % 2 === 0)) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x - k, y - k, 5 * k, k); ctx.fillRect(x - k, y + 3 * k, 5 * k, k);
                ctx.fillRect(x - k, y, k, 3 * k); ctx.fillRect(x + 3 * k, y, k, 3 * k);
            }
        });
        const cyc = t % 8, n = reduce ? TYPED.length : cyc < 3.4 ? Math.floor(TYPED.length * cyc / 3.4) : cyc < 7 ? TYPED.length : 0;
        if (n) ctx.drawImage(scr.typed, 0, 0, n * 4 * k, 5 * k, scr.type[0], scr.type[1], n * 4 * k, 5 * k);
        if (Math.floor(t * 2.5) % 2 === 0 || (cyc < 3.4 && n)) px(scr.type[0] + n * 4 * k, scr.type[1], '#e8e6ee', 3 * k, 5 * k);
        for (const [hx, hy, hw] of scr.holes) ctx.clearRect(hx, hy, hw, 1);
        if (reduce) return;

        // steam from the mug
        if (src.meta.steam) {
            if (rnd() < 9 * dt) steam.push({ x: src.meta.steam[0] + (rnd() * 4 - 2) * k, y: src.meta.steam[1], life: 0, ph: rnd() * 6 });
            steam = steam.filter(s => s.life < 1);
            for (const s of steam) {
                s.life += dt / 2.4;
                s.y -= 5 * k * dt;
                ctx.globalAlpha = 0.6 * (1 - s.life);
                px(s.x + Math.sin(s.life * 7 + s.ph) * 1.6 * k - s.life * 2 * k, s.y, '#ffffff', s.life < 0.5 ? k : 1, s.life < 0.4 ? k : 1);
                ctx.globalAlpha = 1;
            }
        }
        // leaves let go of the big tree and tumble downwind (the wide picture, where the tree is)
        if (src.name === 'wide') {
            if (t > nextLeaf) {
                const c = rnd() < 0.2 ? LEAF[2] : LEAF[rnd() < 0.5 ? 0 : 1];
                leaves.push({ x: W * (0.7 + rnd() * 0.26), y: H * (0.1 + rnd() * 0.3), vx: 5 + rnd() * 8, vy: 9 + rnd() * 6, ph: rnd() * 6.28, c, end: H * (0.72 + rnd() * 0.2) });
                nextLeaf = t + 0.8 + rnd() * 2.4;
            }
            leaves = leaves.filter(l => l.y < l.end && l.x > -4);
            for (const l of leaves) {
                l.x -= l.vx * dt - Math.sin(t * 2.2 + l.ph) * 0.4;
                l.y += l.vy * dt * (0.7 + 0.5 * Math.sin(t * 3 + l.ph));
                const f = Math.floor(t * 6 + l.ph) % 3;
                if (f === 0) { px(l.x, l.y, l.c[0], 2, 1); } else if (f === 1) { px(l.x, l.y, l.c[0]); px(l.x, l.y + 1, l.c[1]); } else px(l.x, l.y, l.c[1], 2, 1);
            }
        }
        // butterflies wandering over the flowers in front of the desk
        const gx = sx + src.meta.screen[2] / 2, gy = Math.min(H - 8 * k, sy + src.meta.screen[3] * 2.25);
        [[-0.9, 0.21, 0, '#ffffff'], [0.7, 0.17, 2.4, '#ffd257']].forEach(([side, sp, p0, col]) => {
            const bx = Math.round(gx + side * 50 * k + Math.sin(t * sp + p0) * 46 * k + Math.sin(t * 1.3 + p0) * 5 * k);
            const by = Math.round(gy + Math.sin(t * sp * 2.9 + p0) * 9 * k + Math.sin(t * 2.9 + p0) * 3 * k);
            px(bx, by, '#3b3550', 1, 2);
            if (Math.sin(t * 15 + p0) > 0) { px(bx - 2, by - 1, col, 2, 2); px(bx + 1, by - 1, col, 2, 2); } else { px(bx - 1, by - 1, col, 1, 2); px(bx + 1, by - 1, col, 1, 2); }
        });
    }

    let last = 0;
    const loop = now => {
        timer = requestAnimationFrame(loop);
        if (now - last < 1000 / FPS - 2) return;
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / FPS;
        last = now;
        t += dt;
        frame(t, dt);
    };
    const run = () => { if (timer || reduce || !visible || document.hidden) return; last = 0; timer = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(timer); timer = 0; };
    layout();
    new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? run() : stop(); }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
    run();
})();
