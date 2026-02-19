// Simplified dot grid matching Cadence's DotGrid component aesthetic
const canvas = document.getElementById('dot-grid');
const ctx = canvas.getContext('2d');

let width, height;
const dots = [];
const spacing = 32;
let isVisible = false;
let rafId = null;
const baseColor = { r: 87, g: 83, b: 78 }; // --text-ghost
const accentColor = { r: 45, g: 212, b: 191 }; // --accent-primary

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createDots();
}

function createDots() {
    dots.length = 0;
    const cols = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            dots.push({
                x: x * spacing + (spacing / 2),
                y: y * spacing + (spacing / 2),
                baseAlpha: Math.random() * 0.15 + 0.05,
                pulseOffset: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.0008 + 0.0004
            });
        }
    }
}

function draw(time) {
    ctx.clearRect(0, 0, width, height);

    dots.forEach(dot => {
        // Gentle pulse based on time
        const pulse = Math.sin(time * dot.pulseSpeed + dot.pulseOffset);
        const alpha = dot.baseAlpha * (0.7 + pulse * 0.3);

        // Draw dot
        ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });

    if (isVisible) {
        rafId = requestAnimationFrame(draw);
    }
}

function startLoop() {
    if (!rafId && isVisible) {
        rafId = requestAnimationFrame(draw);
    }
}

function stopLoop() {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

const dotGridObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) {
        startLoop();
    } else {
        stopLoop();
    }
}, { threshold: 0 });

window.addEventListener('resize', resize);
resize();
dotGridObserver.observe(canvas);
