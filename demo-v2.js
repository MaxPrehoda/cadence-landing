// Redesigned high-fidelity macOS desktop simulation
(function() {
    const demoContainer = document.getElementById('macos-demo');
    const demoDescription = document.getElementById('demo-description');

    if (!demoContainer) return;

    let currentDemo = 0;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function typeText(element, text, speed = 40) {
        for (const char of text) {
            if (char === '\n') {
                element.appendChild(document.createElement('br'));
            } else {
                element.insertAdjacentText('beforeend', char);
            }
            await sleep(speed);
        }
    }

    async function deleteText(element, count, speed = 20) {
        // Get all text content
        let text = element.textContent;

        for (let i = 0; i < count && text.length > 0; i++) {
            text = text.slice(0, -1);
            element.textContent = text;
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

    // Demo 1: Quick dictation in Slack
    async function runSlackDemo() {
        demoDescription.innerHTML = '<span class="demo-step">Demo 1:</span> Voice dictation in Slack';

        const time = getCurrentTime();

        demoContainer.innerHTML = `
            <!-- Ambient background blur for depth -->
            <div class="demo-backdrop"></div>

            <!-- Slack Window - centered and elevated -->
            <div class="app-window slack-window">
                <div class="window-titlebar">
                    <div class="traffic-lights">
                        <span class="traffic-light red"></span>
                        <span class="traffic-light yellow"></span>
                        <span class="traffic-light green"></span>
                    </div>
                    <div class="window-title">engineering</div>
                    <div class="window-controls"></div>
                </div>
                <div class="window-body">
                    <div class="slack-layout">
                        <aside class="slack-sidebar">
                            <div class="workspace-name">Design Co</div>
                            <div class="channels">
                                <div class="channel"># general</div>
                                <div class="channel active"># engineering</div>
                                <div class="channel"># design</div>
                            </div>
                        </aside>
                        <main class="slack-content">
                            <div class="channel-header">
                                <h2># engineering</h2>
                                <div class="channel-meta">12 members</div>
                            </div>
                            <div class="messages-area">
                                <div class="message">
                                    <div class="message-avatar">SC</div>
                                    <div class="message-content">
                                        <div class="message-header">
                                            <span class="author">Sarah Chen</span>
                                            <span class="timestamp">2:34 PM</span>
                                        </div>
                                        <div class="message-text">Status update on the API migration?</div>
                                    </div>
                                </div>
                                <div class="message typing-message" id="user-message">
                                    <div class="message-avatar">You</div>
                                    <div class="message-content">
                                        <div class="message-header">
                                            <span class="author">You</span>
                                            <span class="timestamp">${time}</span>
                                        </div>
                                        <div class="message-text" id="message-text"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="message-input-area">
                                <div class="message-input">
                                    <span class="input-placeholder">Message #engineering</span>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>

            <!-- Cadence Indicator - top right, out of the way -->
            <div class="cadence-pill" id="cadence-pill">
                <div class="pill-icon"></div>
                <div class="pill-waveform">
                    <span></span><span></span><span></span><span></span>
                </div>
                <div class="pill-label" id="pill-label">Listening</div>
            </div>

            <!-- Voice transcript callout -->
            <div class="voice-callout" id="voice-callout">
                <div class="callout-arrow"></div>
                <div class="callout-text" id="callout-text"></div>
            </div>

            <!-- Progress indicator -->
            <div class="demo-progress">
                <div class="progress-step active" id="step1">
                    <div class="step-dot"></div>
                    <div class="step-label">Press hotkey</div>
                </div>
                <div class="progress-step" id="step2">
                    <div class="step-dot"></div>
                    <div class="step-label">Speak</div>
                </div>
                <div class="progress-step" id="step3">
                    <div class="step-dot"></div>
                    <div class="step-label">Text appears</div>
                </div>
            </div>
        `;

        const pill = document.getElementById('cadence-pill');
        const pillLabel = document.getElementById('pill-label');
        const callout = document.getElementById('voice-callout');
        const calloutText = document.getElementById('callout-text');
        const messageText = document.getElementById('message-text');
        const userMessage = document.getElementById('user-message');
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const step3 = document.getElementById('step3');

        await sleep(1200);

        // Step 1: User presses hotkey
        pill.classList.add('active');
        userMessage.style.opacity = '0.4';
        await sleep(800);

        // Step 2: User speaks
        step1.classList.remove('active');
        step2.classList.add('active');
        pillLabel.textContent = 'Recording';
        callout.classList.add('active');
        await sleep(300);
        await typeText(calloutText, 'Just finished testing. Migration complete and stable in staging.', 35);
        await sleep(1800);

        // Step 3: Processing
        callout.classList.remove('active');
        pillLabel.textContent = 'Processing';
        await sleep(600);

        // Step 4: Text injection
        step2.classList.remove('active');
        step3.classList.add('active');
        pill.classList.remove('active');
        userMessage.style.opacity = '1';
        await sleep(400);

        const message = "Just finished testing. Migration complete and stable in staging. Ready for prod deploy tomorrow morning.";
        await typeText(messageText, message, 25);

        await sleep(3000);
    }

    // Demo 2: AI rewrite in Notes
    async function runNotesDemo() {
        demoDescription.innerHTML = '<span class="demo-step">Demo 2:</span> AI-powered text refinement';

        demoContainer.innerHTML = `
            <div class="demo-backdrop"></div>

            <!-- Notes Window -->
            <div class="app-window notes-window">
                <div class="window-titlebar">
                    <div class="traffic-lights">
                        <span class="traffic-light red"></span>
                        <span class="traffic-light yellow"></span>
                        <span class="traffic-light green"></span>
                    </div>
                    <div class="window-title">Weekly Update</div>
                    <div class="window-controls"></div>
                </div>
                <div class="window-body">
                    <div class="notes-layout">
                        <div class="notes-sidebar">
                            <div class="note-item">Project Ideas</div>
                            <div class="note-item active">Weekly Update</div>
                            <div class="note-item">Meeting Notes</div>
                        </div>
                        <div class="notes-editor">
                            <div class="note-title">Weekly Update</div>
                            <div class="note-body" id="note-body"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cadence Indicator -->
            <div class="cadence-pill" id="cadence-pill">
                <div class="pill-icon"></div>
                <div class="pill-waveform">
                    <span></span><span></span><span></span><span></span>
                </div>
                <div class="pill-label" id="pill-label">Listening</div>
            </div>

            <!-- Voice transcript callout -->
            <div class="voice-callout" id="voice-callout">
                <div class="callout-arrow"></div>
                <div class="callout-text" id="callout-text"></div>
            </div>

            <!-- Progress indicator -->
            <div class="demo-progress">
                <div class="progress-step active" id="step1">
                    <div class="step-dot"></div>
                    <div class="step-label">Write draft</div>
                </div>
                <div class="progress-step" id="step2">
                    <div class="step-dot"></div>
                    <div class="step-label">Say command</div>
                </div>
                <div class="progress-step" id="step3">
                    <div class="step-dot"></div>
                    <div class="step-label">AI refines</div>
                </div>
            </div>
        `;

        const pill = document.getElementById('cadence-pill');
        const pillLabel = document.getElementById('pill-label');
        const callout = document.getElementById('voice-callout');
        const calloutText = document.getElementById('callout-text');
        const noteBody = document.getElementById('note-body');
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const step3 = document.getElementById('step3');

        await sleep(1000);

        // Type rough draft
        const rough = "got a lot done this week, shipped the new dashboard feature and fixed like 10 bugs. team is doing good, everyone hitting their goals. next week focusing on performance stuff";
        await typeText(noteBody, rough, 30);
        await sleep(1500);

        // Step 2: User invokes AI command
        step1.classList.remove('active');
        step2.classList.add('active');
        pill.classList.add('active');
        await sleep(600);

        pillLabel.textContent = 'Recording';
        callout.classList.add('active');
        await sleep(200);
        await typeText(calloutText, 'Claude, make this professional', 40);
        await sleep(1600);

        // Step 3: AI processing
        step2.classList.remove('active');
        step3.classList.add('active');
        callout.classList.remove('active');
        pillLabel.textContent = 'Processing with AI';
        await sleep(1200);

        // Clear the text completely and quickly
        noteBody.style.opacity = '0.3';
        await sleep(200);
        noteBody.textContent = '';
        await sleep(400);
        noteBody.style.opacity = '1';

        pill.classList.remove('active');
        await sleep(200);

        // Type refined version
        const refined = "Key accomplishments this week:\n\n• Launched new dashboard feature to production\n• Resolved 10 critical bugs across the platform\n• Team performance strong—all objectives on track\n\nNext week's focus: Performance optimization and technical debt reduction.";
        await typeText(noteBody, refined, 25);

        await sleep(3500);
    }

    // Cycle between demos
    async function runDemos() {
        while (true) {
            if (currentDemo === 0) {
                await runSlackDemo();
            } else {
                await runNotesDemo();
            }

            currentDemo = (currentDemo + 1) % 2;
            await sleep(800);
        }
    }

    runDemos();
})();
