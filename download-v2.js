// Dynamically populate download section from GitHub Releases API
async function loadDownloadLinks() {
    const REPO = 'MaxPrehoda/cadence-landing';

    try {
        const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
        if (!response.ok) throw new Error('Release not found');

        const data = await response.json();
        const version = data.tag_name;
        const releaseDate = new Date(data.published_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const releaseUrl = data.html_url;
        const assets = data.assets;

        // Find assets by architecture
        const arm64Asset = assets.find(a =>
            (a.name.includes('aarch64') || a.name.includes('arm64')) && a.name.endsWith('.dmg')
        );
        const x64Asset = assets.find(a =>
            (a.name.includes('x64') || a.name.includes('x86_64')) && a.name.endsWith('.dmg')
        );

        // Header version badge
        const headerVersion = document.getElementById('header-version');
        if (headerVersion) headerVersion.textContent = version;

        // Populate Apple Silicon card
        if (arm64Asset) {
            populateCard('arm64', arm64Asset, version, releaseDate, releaseUrl);
        }

        // Populate Intel card
        if (x64Asset) {
            populateCard('x64', x64Asset, version, releaseDate, releaseUrl);
        }

    } catch (error) {
        console.error('Failed to load release:', error);
        // Cards keep their placeholder state — download buttons point to releases page
    }
}

function populateCard(arch, asset, version, releaseDate, releaseUrl) {
    const title = document.getElementById(`${arch}-title`);
    const file = document.getElementById(`${arch}-file`);
    const size = document.getElementById(`${arch}-size`);
    const date = document.getElementById(`${arch}-date`);
    const downloadBtn = document.getElementById(`download-${arch}`);
    const notesBtn = document.getElementById(`release-notes-${arch}`);

    const label = arch === 'arm64' ? 'Apple Silicon' : 'Intel';
    const sizeInMB = (asset.size / (1024 * 1024)).toFixed(1);

    if (title) title.textContent = `Cadence ${version} — ${label}`;
    if (file) file.textContent = asset.name;
    if (size) size.textContent = `${sizeInMB} MB`;
    if (date) date.textContent = releaseDate;
    if (downloadBtn) downloadBtn.href = asset.browser_download_url;
    if (notesBtn) notesBtn.href = releaseUrl;
}

loadDownloadLinks();
