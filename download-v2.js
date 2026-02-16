// Enhanced download functionality with clear version display
async function loadDownloadLinks() {
    const primaryButtons = document.getElementById('download-buttons-primary');
    const sizeEl = document.getElementById('download-size');
    const dateEl = document.getElementById('download-date');

    try {
        const response = await fetch('https://api.github.com/repos/MaxPrehoda/cadence-landing/releases/latest');

        if (!response.ok) {
            throw new Error('Release not found');
        }

        const data = await response.json();
        const assets = data.assets;

        // Find Apple Silicon DMG
        const appleSilicon = assets.find(a =>
            (a.name.includes('aarch64') || a.name.includes('arm64')) && a.name.endsWith('.dmg')
        );

        if (appleSilicon && primaryButtons) {
            const sizeInMB = (appleSilicon.size / (1024 * 1024)).toFixed(1);

            // Update size
            if (sizeEl) {
                sizeEl.textContent = `${sizeInMB} MB`;
            }

            // Update date
            if (dateEl) {
                const releaseDate = new Date(data.published_at);
                const options = { year: 'numeric', month: 'short' };
                dateEl.textContent = releaseDate.toLocaleDateString('en-US', options);
            }

            // Create download button
            primaryButtons.innerHTML = `
                <a href="${appleSilicon.browser_download_url}"
                   class="download-button"
                   style="text-decoration: none;">
                    <span>↓</span>
                    <span>Download ${data.tag_name}</span>
                </a>
                <a href="https://github.com/MaxPrehoda/cadence-landing/releases"
                   class="download-button download-button-secondary"
                   target="_blank"
                   rel="noopener noreferrer"
                   style="text-decoration: none;">
                    View All Releases
                </a>
            `;
        }

    } catch (error) {
        console.error('Failed to load release:', error);

        // Show fallback state
        if (primaryButtons) {
            primaryButtons.innerHTML = `
                <a href="https://github.com/MaxPrehoda/cadence-landing/releases"
                   class="download-button"
                   target="_blank"
                   rel="noopener noreferrer"
                   style="text-decoration: none;">
                    <span>→</span>
                    <span>View Releases on GitHub</span>
                </a>
                <a href="https://github.com/MaxPrehoda/voice-flow"
                   class="download-button download-button-secondary"
                   target="_blank"
                   rel="noopener noreferrer"
                   style="text-decoration: none;">
                    Build from Source
                </a>
            `;
        }
    }
}

loadDownloadLinks();
