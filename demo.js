// Interactive demos showing Cadence in action
(function() {
    const dictationDemo = document.getElementById('demo-dictation');
    const aiDemo = document.getElementById('demo-ai');

    if (!dictationDemo || !aiDemo) return;

    // Utility to type text character by character
    async function typeText(element, text, speed = 50) {
        for (const char of text) {
            element.insertAdjacentHTML('beforeend', char === '\n' ? '<br>' : char);
            await sleep(speed);
        }
    }

    // Utility to delete text character by character
    async function deleteText(element, count, speed = 30) {
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

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Demo 1: Simple dictation in Slack
    async function runDictationDemo() {
        dictationDemo.innerHTML = `
            <div class="demo-titlebar">
                <div class="demo-traffic-lights">
                    <div class="demo-traffic-light red"></div>
                    <div class="demo-traffic-light yellow"></div>
                    <div class="demo-traffic-light green"></div>
                </div>
                <div class="demo-title">Slack — #engineering</div>
            </div>
            <div class="demo-content">
                <div class="demo-cadence-indicator" id="dictation-indicator">
                    <div class="demo-pulse"></div>
                    <span>Recording</span>
                </div>
                <div style="color: #888; margin-bottom: 16px;">Sarah Chen  12:34 PM</div>
                <div style="color: #d4d4d4; margin-bottom: 24px;">Anyone know the status of the API migration?</div>
                <div style="color: #888; margin-bottom: 8px;">You  12:35 PM</div>
                <div id="dictation-text"></div>
            </div>
        `;

        const textContainer = document.getElementById('dictation-text');
        const indicator = document.getElementById('dictation-indicator');

        await sleep(1500);

        // Show recording indicator
        indicator.classList.add('active');
        await sleep(800);

        // User speaks (simulated with typing)
        const message = "Just finished testing. Migration is complete and running stable in staging. Ready for prod deploy tomorrow morning.";

        await typeText(textContainer, message, 45);

        // Add cursor
        textContainer.insertAdjacentHTML('beforeend', '<span class="demo-cursor"></span>');

        await sleep(1200);

        // Hide indicator
        indicator.classList.remove('active');

        await sleep(3000);

        // Loop
        runDictationDemo();
    }

    // Demo 2: AI command to rewrite email
    async function runAIDemo() {
        aiDemo.innerHTML = `
            <div class="demo-titlebar">
                <div class="demo-traffic-lights">
                    <div class="demo-traffic-light red"></div>
                    <div class="demo-traffic-light yellow"></div>
                    <div class="demo-traffic-light green"></div>
                </div>
                <div class="demo-title">Mail — New Message</div>
            </div>
            <div class="demo-content">
                <div class="demo-cadence-indicator" id="ai-indicator">
                    <div class="demo-pulse"></div>
                    <span>Processing</span>
                </div>
                <div style="color: #888; font-size: 12px; margin-bottom: 16px;">
                    <div>To: <span style="color: #d4d4d4;">team@company.com</span></div>
                    <div style="margin-top: 4px;">Subject: <span style="color: #d4d4d4;">Server downtime tonight</span></div>
                </div>
                <div style="height: 1px; background: #333; margin-bottom: 16px;"></div>
                <div id="ai-text"></div>
            </div>
        `;

        const textContainer = document.getElementById('ai-text');
        const indicator = document.getElementById('ai-indicator');

        await sleep(1000);

        // Original rough draft
        const original = "hey everyone we need to do server maintenance tonight so the site will be down for a bit probably around 2am to 4am just fyi";

        await typeText(textContainer, original, 40);
        textContainer.insertAdjacentHTML('beforeend', '<span class="demo-cursor"></span>');

        await sleep(1500);

        // User says "Claude, make this more professional"
        indicator.querySelector('span').textContent = 'Listening';
        indicator.classList.add('active');

        await sleep(800);

        indicator.querySelector('span').textContent = 'Processing';

        await sleep(1200);

        // Delete original text
        const cursor = textContainer.querySelector('.demo-cursor');
        cursor.remove();

        await deleteText(textContainer, original.length, 20);

        await sleep(400);

        // Type improved version
        const improved = "Team,\n\nWe have scheduled server maintenance tonight from 2:00 AM to 4:00 AM PST. During this window, the site will be temporarily unavailable.\n\nThank you for your patience.";

        await typeText(textContainer, improved, 35);
        textContainer.insertAdjacentHTML('beforeend', '<span class="demo-cursor"></span>');

        // Hide indicator
        indicator.classList.remove('active');

        await sleep(3500);

        // Loop
        runAIDemo();
    }

    // Start demos with slight offset so they don't sync
    runDictationDemo();
    setTimeout(runAIDemo, 500);
})();
