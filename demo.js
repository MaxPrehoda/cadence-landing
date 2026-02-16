// High-fidelity macOS desktop simulation cycling through Cadence demos
(function() {
    const demoContainer = document.getElementById('macos-demo');
    const demoDescription = document.getElementById('demo-description');

    if (!demoContainer) return;

    let currentDemo = 0;

    // Utility functions
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function typeText(element, text, speed = 50) {
        for (const char of text) {
            if (char === '\n') {
                element.appendChild(document.createElement('br'));
            } else {
                element.insertAdjacentText('beforeend', char);
            }
            await sleep(speed);
        }
    }

    async function deleteText(element, count, speed = 25) {
        for (let i = 0; i < count; i++) {
            const lastNode = element.lastChild;
            if (lastNode) {
                if (lastNode.nodeType === Node.TEXT_NODE && lastNode.textContent.length > 0) {
                    lastNode.textContent = lastNode.textContent.slice(0, -1);
                } else {
                    lastNode.remove();
                }
            }
            await sleep(speed);
        }
    }

    function getCurrentTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
    }

    // Demo 1: Dictation in Slack
    async function runSlackDemo() {
        demoDescription.textContent = 'Demo 1: Voice dictation in Slack — Press hotkey, speak naturally, release. Text appears instantly.';

        const time = getCurrentTime();

        demoContainer.innerHTML = `
            <!-- macOS Menu Bar -->
            <div class="macos-menubar">
                <div class="macos-menubar-left">
                    <div class="macos-menu-item"></div>
                    <div class="macos-menu-item">Slack</div>
                    <div class="macos-menu-item">File</div>
                    <div class="macos-menu-item">Edit</div>
                    <div class="macos-menu-item">View</div>
                </div>
                <div class="macos-menubar-right">
                    <span>🔋</span>
                    <span>📶</span>
                    <span>${time}</span>
                </div>
            </div>

            <!-- Voice Transcript Bubble -->
            <div class="voice-transcript" id="voice-transcript"></div>

            <!-- Cadence Recording Indicator -->
            <div class="cadence-indicator" id="cadence-indicator">
                <div class="cadence-mic-icon">🎤</div>
                <div class="cadence-waveform">
                    <div class="cadence-bar"></div>
                    <div class="cadence-bar"></div>
                    <div class="cadence-bar"></div>
                    <div class="cadence-bar"></div>
                    <div class="cadence-bar"></div>
                </div>
                <span class="cadence-status-text" id="cadence-status-text">Listening...</span>
            </div>

            <!-- Slack Window -->
            <div class="macos-window" style="left: 40px; top: 60px; width: calc(100% - 80px); height: calc(100% - 140px);">
                <div class="macos-titlebar">
                    <div class="macos-traffic-lights">
                        <div class="macos-traffic-light close"></div>
                        <div class="macos-traffic-light minimize"></div>
                        <div class="macos-traffic-light maximize"></div>
                    </div>
                    <div class="macos-window-title">Slack</div>
                </div>
                <div class="macos-window-content" style="display: flex; height: calc(100% - 52px);">
                    <div class="slack-sidebar">
                        <div class="slack-workspace">Acme Corp</div>
                        <div class="slack-channel"># general</div>
                        <div class="slack-channel active"># engineering</div>
                        <div class="slack-channel"># design</div>
                        <div class="slack-channel"># random</div>
                    </div>
                    <div class="slack-main">
                        <div class="slack-header"># engineering</div>
                        <div class="slack-messages" id="slack-messages">
                            <div class="slack-message">
                                <div>
                                    <span class="slack-author">Sarah Chen</span>
                                    <span class="slack-time">12:34 PM</span>
                                </div>
                                <div class="slack-text">Anyone know the status of the API migration?</div>
                            </div>
                            <div class="slack-message">
                                <div>
                                    <span class="slack-author">You</span>
                                    <span class="slack-time">12:35 PM</span>
                                </div>
                                <div class="slack-text" id="slack-text"></div>
                            </div>
                        </div>
                        <div class="slack-input-wrapper">
                            <div class="slack-input" style="opacity: 0.3;">Message #engineering</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- macOS Dock -->
            <div class="macos-dock">
                <div class="dock-icon" style="background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);">🧭</div>
                <div class="dock-icon" style="background: linear-gradient(135deg, #FF3B30 0%, #C41E3A 100%);">✉️</div>
                <div class="dock-icon" style="background: linear-gradient(135deg, #34C759 0%, #248A3D 100%);">💬</div>
                <div class="dock-icon" style="background: linear-gradient(135deg, #611f69 0%, #4a154b 100%);">
                    <div class="dock-indicator"></div>
                    #
                </div>
                <div class="dock-icon" style="background: linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%);">
                    <div class="dock-indicator"></div>
                    🎤
                </div>
            </div>
        `;

        const textContainer = document.getElementById('slack-text');
        const indicator = document.getElementById('cadence-indicator');
        const statusText = document.getElementById('cadence-status-text');
        const voiceTranscript = document.getElementById('voice-transcript');

        await sleep(1500);

        // Show Cadence recording indicator - user presses hotkey
        indicator.classList.add('active');
        statusText.textContent = 'Listening...';

        await sleep(800);

        // User is speaking - show what they're saying
        statusText.textContent = 'Speaking...';
        voiceTranscript.textContent = '"Just finished testing. Migration is complete..."';
        voiceTranscript.classList.add('active');

        await sleep(2200);

        // Hide transcript, process
        voiceTranscript.classList.remove('active');
        statusText.textContent = 'Transcribing...';

        await sleep(600);

        // Hide indicator
        indicator.classList.remove('active');

        await sleep(400);

        // Type the message (text injection appears)
        const message = "Just finished testing. Migration is complete and running stable in staging. Ready for prod deploy tomorrow morning.";
        await typeText(textContainer, message, 30);
        textContainer.innerHTML += '<span class="typing-cursor"></span>';

        await sleep(3500);
    }

    // Demo 2: AI Command in Mail
    async function runMailDemo() {
        demoDescription.textContent = 'Demo 2: AI-powered rewrite — Say "Claude, make this more professional" to transform rough drafts instantly.';

        const time = getCurrentTime();

        demoContainer.innerHTML = `
            <!-- macOS Menu Bar -->
            <div class="macos-menubar">
                <div class="macos-menubar-left">
                    <div class="macos-menu-item"></div>
                    <div class="macos-menu-item">Mail</div>
                    <div class="macos-menu-item">File</div>
                    <div class="macos-menu-item">Edit</div>
                    <div class="macos-menu-item">View</div>
                </div>
                <div class="macos-menubar-right">
                    <span>🔋</span>
                    <span>📶</span>
                    <span>${time}</span>
                </div>
            </div>

            <!-- Voice Transcript Bubble -->
            <div class="voice-transcript" id="voice-transcript"></div>

            <!-- Cadence Processing Indicator -->
            <div class="cadence-indicator" id="cadence-indicator">
                <div class="cadence-mic-icon">🎤</div>
                <div class="cadence-waveform">
                    <div class="cadence-bar"></div>
                    <div class="cadence-bar"></div>
                    <div class="cadence-bar"></div>
                    <div class="cadence-bar"></div>
                    <div class="cadence-bar"></div>
                </div>
                <span class="cadence-status-text" id="cadence-status">Listening...</span>
            </div>

            <!-- Mail Window -->
            <div class="macos-window" style="left: 40px; top: 60px; width: calc(100% - 80px); height: calc(100% - 140px);">
                <div class="macos-titlebar">
                    <div class="macos-traffic-lights">
                        <div class="macos-traffic-light close"></div>
                        <div class="macos-traffic-light minimize"></div>
                        <div class="macos-traffic-light maximize"></div>
                    </div>
                    <div class="macos-window-title">New Message</div>
                </div>
                <div class="macos-window-content">
                    <div class="mail-toolbar">
                        <button class="mail-button">Send</button>
                        <button class="mail-button">Attach</button>
                    </div>
                    <div class="mail-compose">
                        <div class="mail-field">
                            <div class="mail-label">To:</div>
                            <div class="mail-value">team@company.com</div>
                        </div>
                        <div class="mail-field">
                            <div class="mail-label">Subject:</div>
                            <div class="mail-value">Server downtime tonight</div>
                        </div>
                        <div class="mail-body" id="mail-body"></div>
                    </div>
                </div>
            </div>

            <!-- macOS Dock -->
            <div class="macos-dock">
                <div class="dock-icon" style="background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);">🧭</div>
                <div class="dock-icon" style="background: linear-gradient(135deg, #FF3B30 0%, #C41E3A 100%);">
                    <div class="dock-indicator"></div>
                    ✉️
                </div>
                <div class="dock-icon" style="background: linear-gradient(135deg, #34C759 0%, #248A3D 100%);">💬</div>
                <div class="dock-icon" style="background: linear-gradient(135deg, #611f69 0%, #4a154b 100%);">#</div>
                <div class="dock-icon" style="background: linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%);">
                    <div class="dock-indicator"></div>
                    🎤
                </div>
            </div>
        `;

        const textContainer = document.getElementById('mail-body');
        const indicator = document.getElementById('cadence-indicator');
        const status = document.getElementById('cadence-status');
        const voiceTranscript = document.getElementById('voice-transcript');

        await sleep(1000);

        // Type original rough message
        const original = "hey everyone we need to do server maintenance tonight so the site will be down for a bit probably around 2am to 4am just fyi";
        await typeText(textContainer, original, 35);
        textContainer.innerHTML += '<span class="typing-cursor"></span>';

        await sleep(2000);

        // User says "Claude, make this more professional"
        indicator.classList.add('active');
        status.textContent = 'Listening...';

        await sleep(600);

        // Show the actual command being spoken
        status.textContent = 'Speaking...';
        voiceTranscript.textContent = '"Claude, make this more professional"';
        voiceTranscript.classList.add('active');

        await sleep(2200);

        // Hide transcript, start processing
        voiceTranscript.classList.remove('active');
        status.textContent = 'Processing with Claude...';

        await sleep(1500);

        // Delete old text
        const cursor = textContainer.querySelector('.typing-cursor');
        if (cursor) cursor.remove();

        await deleteText(textContainer, original.length, 15);

        await sleep(400);

        // Type improved professional version
        const improved = "Team,\n\nWe have scheduled server maintenance tonight from 2:00 AM to 4:00 AM PST. During this window, the site will be temporarily unavailable.\n\nThank you for your patience.";
        await typeText(textContainer, improved, 30);
        textContainer.innerHTML += '<span class="typing-cursor"></span>';

        await sleep(800);

        // Hide indicator
        indicator.classList.remove('active');

        await sleep(4000);
    }

    // Cycle between demos
    async function runDemos() {
        while (true) {
            if (currentDemo === 0) {
                await runSlackDemo();
            } else {
                await runMailDemo();
            }

            currentDemo = (currentDemo + 1) % 2;
            await sleep(1000); // Pause between demos
        }
    }

    runDemos();
})();
