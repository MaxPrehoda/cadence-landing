// Simplified CPU-based particle system matching Cadence's fire effect
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

let width, height;
const particles = [];
const particleCount = 100;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = height + 20;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -Math.random() * 2 - 1;
        this.life = 1.0;
        this.decay = Math.random() * 0.005 + 0.002;
        this.size = Math.random() * 3 + 1;

        // Fire colors: orange to yellow
        const hue = Math.random() * 40 + 10; // 10-50 (red-orange-yellow)
        this.hue = hue;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vy *= 0.98; // Slow down vertically

        if (this.life <= 0 || this.y < -20) {
            this.reset();
        }
    }

    draw() {
        const alpha = this.life * 0.6;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);

        gradient.addColorStop(0, `hsla(${this.hue}, 100%, 60%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${this.hue}, 100%, 40%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function init() {
    resize();
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    animate();
}

function animate() {
    ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
init();
