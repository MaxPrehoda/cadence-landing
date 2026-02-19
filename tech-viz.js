// Interactive tech visualization - flowing data particles
(function() {
    const canvas = document.getElementById('tech-viz');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];
    const mousePos = { x: 0, y: 0 };
    let animationId;
    let isVisible = false;

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        width = rect.width;
        height = rect.height;

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        ctx.scale(dpr, dpr);
    }

    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * height;
        }

        reset() {
            this.x = -20;
            this.y = Math.random() * height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = Math.random() * 0.5 + 0.2;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.3;
            this.color = Math.random() > 0.7 ? '#2dd4bf' : '#5eead4';
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Mouse interaction
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 100) {
                const angle = Math.atan2(dy, dx);
                const force = (100 - dist) / 100;
                this.x -= Math.cos(angle) * force * 0.5;
                this.y -= Math.sin(angle) * force * 0.5;
            }

            // Wrap around
            if (this.x > width + 20) this.reset();
            if (this.y < -20 || this.y > height + 20) {
                this.y = Math.random() * height;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
        }
    }

    function init() {
        resize();

        // Create particles
        const particleCount = Math.floor((width * height) / 15000);
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Draw connections
        ctx.globalAlpha = 0.15;
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#2dd4bf';
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.globalAlpha = (1 - dist / 120) * 0.2;
                    ctx.stroke();
                }
            });
        });

        ctx.globalAlpha = 1;
        if (isVisible) {
            animationId = requestAnimationFrame(animate);
        }
    }

    // Mouse tracking
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        mousePos.x = -1000;
        mousePos.y = -1000;
    });

    function startLoop() {
        if (!animationId && isVisible) {
            animationId = requestAnimationFrame(animate);
        }
    }

    function stopLoop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    const observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
            startLoop();
        } else {
            stopLoop();
        }
    }, { threshold: 0 });

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            stopLoop();
            particles.length = 0;
            init();
            if (isVisible) startLoop();
        }, 250);
    });

    // Start
    init();
    observer.observe(canvas);
})();
