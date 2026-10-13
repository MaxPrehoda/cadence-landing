/* Animated pixel-art hero.
   Composites the layers drawn by art/generate.py (art/hero/*.png) into a
   480x270 canvas that CSS scales up with nearest-neighbour sampling.
   Runs at 12 fps, pauses when off screen or in a background tab, and draws
   a single still frame for people who prefer reduced motion. The static
   art/hero.png stays underneath until the first frame is ready. */
(() => {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const BASE = 'art/hero/';
    const WIND = 8;
    const NAMES = ['sky', 'wisps', 'bank', 'scene', ...Array.from({ length: WIND }, (_, i) => 'tree' + i),
        'rays0', 'rays1', 'fg0', 'fg1', 'fg2', 'fg3', 'cshadow', 'dissolve'];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FPS = 12;

    const load = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

    Promise.all([fetch(BASE + 'meta.json').then(r => r.json()), ...NAMES.map(n => load(BASE + n + '.png'))])
        .then(([meta, ...imgs]) => start(meta, Object.fromEntries(NAMES.map((n, i) => [n, imgs[i]]))))
        .catch(() => {});

    function start(meta, L) {
        const [W, H] = meta.size;
        const C = meta.colors;
        const AMBER_DIM = '#a86f08', BLUE_LIT = '#6aa5ff';

        // One story, one clock (24 s loop) for the monitor's toolbar dots and
        // the status chips over the hero: questions arrive and get answered,
        // work finishes, finished work is cleared and new work starts. Each
        // phase is the five dots (B working, A needs you, G done, I idle) and
        // the three chips shown: [agent slot, detail].
        const SLOTS = ['Auth refactor', 'Billing webhooks', 'Flaky CI tests', 'Docs site upgrade', 'Onboarding copy'];
        const PHASES = [
            [0, 'BABGB', [[1, 'Duplicate Stripe retries?'], [0, 'Editing session.ts'], [3, 'Build green']]],
            [4, 'BBBGB', [[1, 'Answered: idempotency key'], [0, 'Editing session.ts'], [3, 'Build green']]],
            [7.5, 'GBBGB', [[0, '38 tests pass'], [1, 'Writing the retry path'], [3, 'Build green']]],
            [11, 'GBBIA', [[4, 'Warmer, or shorter?'], [0, '38 tests pass'], [1, 'Writing the retry path']]],
            [14, 'GBGIA', [[4, 'Warmer, or shorter?'], [2, '20 of 20 runs green'], [0, '38 tests pass']]],
            [17, 'IBGIB', [[4, 'Answered: warmer'], [2, '20 of 20 runs green'], [1, 'Writing the retry path']]],
            [20.5, 'BBIGB', [[3, 'Build green'], [4, 'Rewriting 4 emails'], [1, 'Retry tests running']]],
        ];
        const LOOP = 24;
        const CODE = { B: 'blue', A: 'amber', G: 'green', I: 'idle' };
        const LABEL = { blue: 'Working', amber: 'Needs you', green: 'Done' };
        const phaseAt = t => { let k = 0; PHASES.forEach(([at], i) => { if (t % LOOP >= at) k = i; }); return k; };
        const dotsAt = t => [...PHASES[phaseAt(t)][1]].map(c => CODE[c]);

        // Chips: rebuilt on each phase change. Kept chips glide to their new
        // row (FLIP), new ones rise out of the monitor, cleared ones fade.
        const chipsEl = document.querySelector('.hero .chips');
        let shownPhase = 0, hover = -1;
        const flash = {};
        function renderChips(k, animate) {
            if (!chipsEl) return;
            const [, dots, rows] = PHASES[k];
            const before = new Map([...chipsEl.querySelectorAll('.chip:not(.leave)')].map(el => [el.dataset.slot, el.getBoundingClientRect()]));
            const old = new Map([...chipsEl.querySelectorAll('.chip:not(.leave)')].map(el => [el.dataset.slot, el]));
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
                    el.addEventListener('mouseenter', () => { hover = slot; if (reduce) frame(t); });
                    el.addEventListener('mouseleave', () => { hover = -1; if (reduce) frame(t); });
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
        if (chipsEl) {
            // Adopt the server-rendered chips (phase 0) so hover works before
            // the first change, then let the story take over.
            chipsEl.querySelectorAll('.chip').forEach(el => {
                const slot = Number(el.dataset.slot);
                el.addEventListener('mouseenter', () => { hover = slot; if (reduce) frame(t); });
                el.addEventListener('mouseleave', () => { hover = -1; if (reduce) frame(t); });
            });
        }

        // Sit the chips right on top of the monitor, wherever the cover crop
        // puts it; fall back to the stylesheet's spot when it is off screen
        // or would run into the headline.
        const hero = canvas.parentElement;
        const copy = hero.querySelector('.hero-copy');
        function placeChips() {
            if (!chipsEl) return;
            chipsEl.classList.remove('anchored', 'tight');
            chipsEl.style.cssText = '';
            const cw = hero.clientWidth, ch = hero.clientHeight;
            if (cw <= 960 || !meta.monitor) return;
            const s = Math.max(cw / W, ch / H);
            const ox = (cw - W * s) * 0.6, oy = ch - H * s;
            const [mx, my, mw] = meta.monitor;
            const left = ox + mx * s, right = ox + (mx + mw) * s, top = oy + my * s;
            if (left < 0 || right > cw) return;
            chipsEl.classList.add('anchored');
            chipsEl.style.right = Math.round(cw - right + s) + 'px';
            chipsEl.style.bottom = Math.round(ch - top + 10) + 'px';
            // where the headline's text and buttons actually are (block boxes
            // run the full column width)
            const ink = [];
            for (const e of copy.children) {
                if (e.classList.contains('row')) { for (const k of e.children) ink.push(k.getBoundingClientRect()); continue; }
                const rg = document.createRange();
                rg.selectNodeContents(e);
                ink.push(...rg.getClientRects());
            }
            const clear = () => {
                const c = chipsEl.getBoundingClientRect();
                return ink.every(r => c.left > r.right + 16 || c.top > r.bottom + 8 || c.bottom < r.top - 8);
            };
            if (!copy || clear()) return;
            chipsEl.classList.add('tight');
            if (clear()) return;
            chipsEl.classList.remove('anchored', 'tight');
            chipsEl.style.cssText = '';
        }
        placeChips();
        addEventListener('resize', placeChips);

        const rnd = (a => () => (a = (a * 1664525 + 1013904223) % 4294967296) / 4294967296)(7);
        let steam = [];
        let birds = [];
        let nextBirds = 3;
        // wind: the trees step through their sway frames faster in a gust,
        // and a gust shakes a few more leaves loose
        let windPh = 0, lastT = 0, leaves = [], nextLeaf = 2;
        const LEAF = [['#a3cf4f', '#4f9a3c'], ['#73b53f', '#357f3f'], ['#e3d36a', '#a8963a']];
        const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };

        function frame(t) {
            const gust = Math.sin(t * 0.35) > 0.6;
            windPh += Math.max(0, t - lastT) * (gust ? 5 : 2.4);
            lastT = t;
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(L.sky, 0, 0);
            const wx = -((t * 1.6) % W);
            ctx.drawImage(L.wisps, Math.round(wx), 0);
            ctx.drawImage(L.wisps, Math.round(wx) + W, 0);
            ctx.drawImage(L.bank, Math.round(Math.sin(t * Math.PI * 2 / 48) * 4), 0);

            // birds, behind the trees
            if (!reduce && t > nextBirds) {
                const y = 26 + rnd() * 40;
                birds.push({ x: -10, y, v: 9 + rnd() * 4, ph: 0 }, { x: -18, y: y + 5, v: 9 + rnd() * 4, ph: 1.7 });
                nextBirds = t + 14 + rnd() * 12;
            }
            birds = birds.filter(b => b.x < W + 10);
            for (const b of birds) {
                b.x += b.v / FPS;
                const up = Math.sin(t * 9 + b.ph) > 0;
                const col = '#1d3f6e';
                px(b.x, b.y, col);
                if (up) { px(b.x - 1, b.y - 1, col); px(b.x + 1, b.y - 1, col); px(b.x - 2, b.y - 2, col); px(b.x + 2, b.y - 2, col); }
                else { px(b.x - 1, b.y, col); px(b.x + 1, b.y, col); px(b.x - 2, b.y + 1, col); px(b.x + 2, b.y + 1, col); }
            }

            ctx.drawImage(L.scene, 0, 0);

            // monitor: toolbar dots, and the chips that follow them
            const k = phaseAt(t);
            if (k !== shownPhase) {
                const prev = PHASES[shownPhase][1], next = PHASES[k][1];
                for (let i = 0; i < SLOTS.length; i++) if (prev[i] !== next[i]) flash[i] = t + 0.8;
                shownPhase = k;
                renderChips(k, true);
            }
            const st = dotsAt(t);
            const dim = Math.floor(t * 2) % 2 === 1;
            if (chipsEl) chipsEl.classList.toggle('dim', dim);
            meta.dots.forEach(([x, y], i) => {
                let c = C[st[i]];
                if (st[i] === 'amber' && dim) c = AMBER_DIM;
                if (st[i] === 'blue' && Math.floor(t * 1.5 + i * 0.7) % 3 === 0) c = BLUE_LIT;
                ctx.fillStyle = c; ctx.fillRect(x, y, 2, 2);
                // a ring on the dot whose chip just changed, or is hovered
                if (hover === i || (t < (flash[i] ?? -1) && Math.floor(t * 8) % 2 === 0)) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x - 1, y - 1, 4, 1); ctx.fillRect(x - 1, y + 2, 4, 1);
                    ctx.fillRect(x - 1, y, 1, 2); ctx.fillRect(x + 2, y, 1, 2);
                }
            });
            // monitor: a terminal line being typed, with a blinking cursor
            const ty = meta.type;
            const cyc = t % 6;
            const len = cyc < 3.2 ? Math.floor(ty.max * cyc / 3.2) : cyc < 5.4 ? ty.max : 0;
            if (len) { ctx.fillStyle = ty.color; ctx.fillRect(ty.x, ty.y, len, 2); }
            if (Math.floor(t * 2.5) % 2 === 0) { ctx.fillStyle = '#e8e6ee'; ctx.fillRect(ty.x + len + 1, ty.y - 1, 2, 3); }

            // steam from the mug
            if (!reduce && rnd() < 0.18) steam.push({ x: meta.steam[0] + rnd() * 3, y: meta.steam[1], life: 0 });
            steam = steam.filter(s => s.life < 1);
            for (const s of steam) {
                s.life += 1 / (FPS * 2.4);
                s.y -= 4 / FPS;
                const x = s.x + Math.sin(s.life * 7 + s.x) * 1.2;
                ctx.globalAlpha = 0.55 * (1 - s.life);
                px(x, s.y, '#ffffff');
                ctx.globalAlpha = 1;
            }

            // sun rays: two slightly different sets crossfading, breathing
            const rk = (Math.sin(t * 0.3) + 1) / 2, breath = 0.82 + 0.18 * Math.sin(t * 0.8 + 1);
            ctx.globalAlpha = breath * (1 - rk); ctx.drawImage(L.rays0, 0, 0);
            ctx.globalAlpha = breath * rk; ctx.drawImage(L.rays1, 0, 0);
            ctx.globalAlpha = 1;

            // the trees and bushes in the wind, with sun flecks in their shade
            ctx.drawImage(L['tree' + (Math.floor(windPh) % WIND)], 0, 0);

            // leaves let go of the big tree now and then and tumble down
            if (!reduce && t > nextLeaf) {
                const [x0, y0, x1, y1] = meta.leafbox;
                const c = rnd() < 0.18 ? LEAF[2] : LEAF[rnd() < 0.5 ? 0 : 1];
                leaves.push({ x: x0 + rnd() * (x1 - x0), y: y0 + rnd() * (y1 - y0), vx: 3 + rnd() * 5, vy: 6 + rnd() * 4, ph: rnd() * 6.28, c });
                nextLeaf = t + (gust ? 0.5 : 1.3) + rnd() * 2.4;
            }
            leaves = leaves.filter(l => l.y < meta.ground + 4 && l.x > -4);
            for (const l of leaves) {
                l.x -= (l.vx + (gust ? 5 : 0)) / FPS - Math.sin(t * 2.2 + l.ph) * 0.3;
                l.y += l.vy / FPS;
                if (Math.floor(t * 6 + l.ph) % 2) { px(l.x, l.y, l.c[0]); px(l.x + 1, l.y, l.c[1]); }
                else { px(l.x, l.y, l.c[0]); px(l.x, l.y + 1, l.c[1]); }
            }

            // a butterfly drifting over the meadow
            const bx = 150 + Math.sin(t * 0.23) * 110 + Math.sin(t * 1.3) * 8;
            const by = 214 + Math.sin(t * 0.7) * 10 + Math.sin(t * 2.9) * 3;
            const open = Math.sin(t * 16) > 0;
            const wing = '#ffffff', body = '#3b3550';
            px(bx, by, body);
            if (open) { px(bx - 1, by - 1, wing); px(bx - 2, by - 1, wing); px(bx + 1, by - 1, wing); px(bx + 2, by - 1, wing); px(bx - 1, by, wing); px(bx + 1, by, wing); }
            else { px(bx - 1, by - 1, wing); px(bx + 1, by - 1, wing); }

            // foreground sway: gentle, with an occasional stronger gust
            const seq = gust ? [0, 1, 2, 3, 2, 1] : [0, 1, 2, 1];
            const f = seq[Math.floor(t * (gust ? 5 : 2.5)) % seq.length];
            ctx.drawImage(L['fg' + f], 0, 0);
            // cloud shadows drifting across the field with the wind
            const cs = -Math.round((t * 4) % W);
            ctx.drawImage(L.cshadow, cs, 0);
            ctx.drawImage(L.cshadow, cs + W, 0);
            ctx.drawImage(L.dissolve, 0, 0);
        }

        canvas.width = W; canvas.height = H;
        let t = 0, timer = null, visible = true;
        const tick = () => { frame(t); t += 1 / FPS; };
        const run = () => {
            if (timer || reduce || !visible || document.hidden) return;
            timer = setInterval(() => requestAnimationFrame(tick), 1000 / FPS);
        };
        const stop = () => { clearInterval(timer); timer = null; };
        tick();
        canvas.classList.add('ready');
        if (reduce) return;
        new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? run() : stop(); }).observe(canvas);
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
        run();
    }
})();
