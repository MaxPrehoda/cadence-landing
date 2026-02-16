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

        let html = `<div class="space-y-3">`;

        if (universal) {
            html += `
                <a href="${universal.browser_download_url}"
                   class="download-btn px-8 py-4 rounded-lg text-white font-semibold inline-block">
                    Download Cadence ${data.tag_name} (Universal)
                </a>
            `;
        } else {
            if (appleSilicon) {
                html += `
                    <a href="${appleSilicon.browser_download_url}"
                       class="download-btn px-8 py-4 rounded-lg text-white font-semibold inline-block">
                        Download for Apple Silicon ${data.tag_name}
                    </a>
                `;
            }
            if (intel) {
                html += `
                    <a href="${intel.browser_download_url}"
                       class="px-6 py-3 rounded-lg border border-gray-600 hover:border-gray-400
                              transition-all text-gray-300 hover:text-white font-semibold inline-block">
                        Download for Intel ${data.tag_name}
                    </a>
                `;
            }
        }

        html += `</div>`;
        html += `<p class="text-sm text-gray-500 mt-4">Released ${new Date(data.published_at).toLocaleDateString()}</p>`;

        container.innerHTML = html;

    } catch (error) {
        console.error('Failed to load releases:', error);
        container.innerHTML = `
            <div class="text-gray-400">
                <p class="mb-4">Releases coming soon!</p>
                <a href="https://github.com/yourusername/cadence"
                   class="px-8 py-4 rounded-lg border border-gray-600 hover:border-gray-400
                          transition-all text-gray-300 hover:text-white font-semibold inline-block">
                    Build from Source
                </a>
            </div>
        `;
    }
}

loadDownloadLinks();
