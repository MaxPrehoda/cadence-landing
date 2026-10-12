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
    const NAMES = ['sky', 'wisps', 'bank', 'scene', 'tree', 'fg0', 'fg1', 'fg2', 'fg3', 'dissolve'];
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

        // Toolbar story on the monitor (16 s loop): a question arrives,
        // gets answered, work finishes, the next one needs you.
        const STORY = [
            [0, ['blue', 'amber', 'blue', 'green', 'blue']],
            [4, ['blue', 'blue', 'blue', 'green', 'blue']],
            [7, ['blue', 'blue', 'blue', 'green', 'amber']],
            [10, ['blue', 'blue', 'green', 'green', 'amber']],
            [13, ['blue', 'blue', 'green', 'idle', 'blue']],
        ];
        const LOOP = 16;
        const dotsAt = t => { let s = STORY[0][1]; for (const [at, st] of STORY) if (t % LOOP >= at) s = st; return s; };

        const rnd = (a => () => (a = (a * 1664525 + 1013904223) % 4294967296) / 4294967296)(7);
        let steam = [];
        let birds = [];
        let nextBirds = 3;
        const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };

        function frame(t) {
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

            // monitor: toolbar dots
            const st = dotsAt(t);
            meta.dots.forEach(([x, y], i) => {
                let c = C[st[i]];
                if (st[i] === 'amber' && Math.floor(t * 2) % 2) c = AMBER_DIM;
                if (st[i] === 'blue' && Math.floor(t * 1.5 + i * 0.7) % 3 === 0) c = BLUE_LIT;
                ctx.fillStyle = c; ctx.fillRect(x, y, 2, 2);
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

            ctx.drawImage(L.tree, 0, 0);

            // a butterfly drifting over the meadow
            const bx = 150 + Math.sin(t * 0.23) * 110 + Math.sin(t * 1.3) * 8;
            const by = 214 + Math.sin(t * 0.7) * 10 + Math.sin(t * 2.9) * 3;
            const open = Math.sin(t * 16) > 0;
            const wing = '#ffffff', body = '#3b3550';
            px(bx, by, body);
            if (open) { px(bx - 1, by - 1, wing); px(bx - 2, by - 1, wing); px(bx + 1, by - 1, wing); px(bx + 2, by - 1, wing); px(bx - 1, by, wing); px(bx + 1, by, wing); }
            else { px(bx - 1, by - 1, wing); px(bx + 1, by - 1, wing); }

            // foreground sway: gentle, with an occasional stronger gust
            const gust = Math.sin(t * 0.35) > 0.6;
            const seq = gust ? [0, 1, 2, 3, 2, 1] : [0, 1, 2, 1];
            const f = seq[Math.floor(t * (gust ? 5 : 2.5)) % seq.length];
            ctx.drawImage(L['fg' + f], 0, 0);
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
