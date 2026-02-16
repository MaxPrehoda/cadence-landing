// TouchDesigner-style audio visualization with reactive dot grid
const canvas = document.getElementById('audio-viz');
const ctx = canvas.getContext('2d');

let width, height;
let time = 0;
const cols = 24;
const rows = 32;
const dots = [];

// Colors from Cadence design system
const accentColor = { r: 45, g: 212, b: 191 }; // --accent-primary
const accentSoft = { r: 94, g: 234, b: 212 }; // --accent-primary-soft
const dimColor = { r: 120, g: 113, b: 108 }; // --text-dim

function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    width = rect.width;
    height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);

    createDots();
}

function createDots() {
    dots.length = 0;

    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            dots.push({
                x: x * cellWidth + cellWidth / 2,
                y: y * cellHeight + cellHeight / 2,
                baseRadius: 2,
                col: x,
                row: y,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
}

// Generate pseudo-audio spectrum (since we don't have real audio input)
function getSpectrum(t) {
    const spectrum = [];
    for (let i = 0; i < cols; i++) {
        // Multiple frequency bands with different speeds
        const freq1 = Math.sin(t * 0.3 + i * 0.2) * 0.5 + 0.5;
        const freq2 = Math.sin(t * 0.5 + i * 0.15) * 0.3 + 0.3;
        const freq3 = Math.sin(t * 0.7 + i * 0.1) * 0.2 + 0.2;

        // Combine frequencies for a spectrogram-like effect
        const amplitude = (freq1 + freq2 + freq3) / 3;

        // Low frequencies are stronger (left side)
        const lowBoost = 1 - (i / cols) * 0.3;

        spectrum.push(amplitude * lowBoost);
    }
    return spectrum;
}

function draw(timestamp) {
    time = timestamp * 0.001;

    ctx.clearRect(0, 0, width, height);

    const spectrum = getSpectrum(time);

    dots.forEach(dot => {
        const spectrumValue = spectrum[dot.col] || 0;

        // Height-based intensity (spectrogram style: bottom = high, top = low)
        const normalizedY = 1 - (dot.row / rows);
        const isActive = normalizedY < spectrumValue;

        // Compute radius based on activity
        let radius = dot.baseRadius;
        let alpha = 0.15;
        let color = dimColor;

        if (isActive) {
            // Active dots glow and pulse
            const intensity = (spectrumValue - normalizedY) / spectrumValue;
            const pulse = Math.sin(time * 4 + dot.phase) * 0.3 + 0.7;

            radius = dot.baseRadius * (1 + intensity * 2 * pulse);
            alpha = 0.4 + intensity * 0.6;

            // Gradient from accent to soft accent based on intensity
            const r = Math.floor(accentColor.r + (accentSoft.r - accentColor.r) * intensity);
            const g = Math.floor(accentColor.g + (accentSoft.g - accentColor.g) * intensity);
            const b = Math.floor(accentColor.b + (accentSoft.b - accentColor.b) * intensity);
            color = { r, g, b };

            // Add glow for intense dots
            if (intensity > 0.5) {
                ctx.shadowBlur = 10 * intensity;
                ctx.shadowColor = `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${alpha})`;
            }
        }

        // Draw dot
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
    });

    requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(draw);
