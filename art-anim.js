/* The harbour and lighthouse loops.
   Both are 3D scenes sculpted for ink-studio (art/ink/harbour.js, art/ink/lighthouse.js) and rendered as seamless
   12-second loops: lossless animated pictures at their own pixel size. Each <img data-loop="..."> starts as a still;
   when it is about to scroll into view this swaps in the loop. With reduced motion the still stays. */
(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (!e.isIntersecting) continue;
            io.unobserve(e.target);
            const img = e.target, loop = new Image();
            loop.onload = () => { img.src = loop.src; };
            loop.src = img.dataset.loop;
        }
    }, { rootMargin: '700px' });
    document.querySelectorAll('img[data-loop]').forEach(img => io.observe(img));
})();
