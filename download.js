// Fetch latest release from GitHub
async function loadDownloadLinks() {
    const container = document.getElementById('download-buttons');

    try {
        // TODO: Replace with your actual repo URL
        const response = await fetch('https://api.github.com/repos/yourusername/cadence/releases/latest');

        if (!response.ok) {
            throw new Error('Release not found');
        }

        const data = await response.json();
        const assets = data.assets;

        // Find .dmg files
        const appleSilicon = assets.find(a => a.name.includes('aarch64') || a.name.includes('arm64'));
        const intel = assets.find(a => a.name.includes('x64') || a.name.includes('x86_64'));
        const universal = assets.find(a => a.name.includes('universal'));

        let html = `<div style="display: flex; gap: 12px; flex-wrap: wrap;">`;

        if (universal) {
            html += `
                <a href="${universal.browser_download_url}" class="btn-primary"
                   style="padding: 14px 28px; border-radius: 6px; text-decoration: none;
                          font-size: 14px; display: inline-block; font-weight: 600;">
                    Download ${data.tag_name} (Universal)
                </a>
            `;
        } else {
            if (appleSilicon) {
                html += `
                    <a href="${appleSilicon.browser_download_url}" class="btn-primary"
                       style="padding: 14px 28px; border-radius: 6px; text-decoration: none;
                              font-size: 14px; display: inline-block; font-weight: 600;">
                        Apple Silicon ${data.tag_name}
                    </a>
                `;
            }
            if (intel) {
                html += `
                    <a href="${intel.browser_download_url}" class="btn-secondary"
                       style="padding: 14px 28px; border-radius: 6px; text-decoration: none;
                              font-size: 14px; display: inline-block; font-weight: 500;">
                        Intel ${data.tag_name}
                    </a>
                `;
            }
        }

        html += `</div>`;
        html += `<p class="mono" style="font-size: 11px; color: var(--text-ghost); margin-top: 16px;">
                    Released ${new Date(data.published_at).toLocaleDateString()}
                 </p>`;

        container.innerHTML = html;

    } catch (error) {
        console.error('Failed to load releases:', error);
        container.innerHTML = `
            <div style="display: flex; gap: 12px; flex-direction: column; align-items: flex-start;">
                <p style="font-size: 13px; color: var(--text-dim);">No releases yet. Build from source:</p>
                <a href="https://github.com/yourusername/cadence" class="btn-secondary"
                   style="padding: 14px 28px; border-radius: 6px; text-decoration: none;
                          font-size: 14px; display: inline-block; font-weight: 500;">
                    View on GitHub
                </a>
            </div>
        `;
    }
}

loadDownloadLinks();
