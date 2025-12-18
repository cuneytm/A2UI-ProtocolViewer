// Main Application Logic

const app = {
    renderer: null,
    messages: [],
    isGenerating: false,
    debugLogs: [],
    requestData: null,
    responseChunks: [],
    activeAgents: [],
    animationTimeouts: [],

    // Initialize the app
    init() {
        this.renderer = new A2UIRenderer();
        this.setupEventListeners();
        this.setupDebugPanel();
        this.log('✅ A2UI App initialized');
    },

    // Setup debug panel
    setupDebugPanel() {
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchDebugTab(tabName);
            });
        });
    },

    // Switch debug tabs
    switchDebugTab(tabName) {
        document.querySelectorAll('.debug-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            }
        });

        document.querySelectorAll('.debug-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`debug${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
    },

    // Log to debug console
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        let formattedMessage = message;

        // Auto-stringify objects for the log
        if (typeof message === 'object') {
            formattedMessage = JSON.stringify(message, null, 2);
        }

        const logEntry = `[${timestamp}] ${formattedMessage}`;
        this.debugLogs.push(logEntry);

        const consoleEl = document.getElementById('consoleData');
        if (consoleEl) {
            consoleEl.textContent = this.debugLogs.join('\n');
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
        console.log(message);
    },

    // Setup event listeners
    setupEventListeners() {
        document.getElementById('promptForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGenerate();
        });

        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                document.getElementById('promptInput').value = prompt;
            });
        });
    },

    // Handle generate button click
    async handleGenerate() {
        if (this.isGenerating) return;

        const input = document.getElementById('promptInput').value.trim();
        if (!input) return;

        this.isGenerating = true;
        this.clearUI();

        try {
            await this.generateUI(input);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.isGenerating = false;
            this.updateButtonState(false);
        }
    },

    // Generate UI from prompt
    async generateUI(prompt) {
        try {
            this.log(`🚀 Generating UI for: "${prompt}"`);

            this.requestData = {
                url: '/api/generate',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { prompt }
            };

            // Update debug panel
            const requestEl = document.getElementById('requestData');
            if (requestEl) requestEl.textContent = JSON.stringify(this.requestData, null, 2);

            this.responseChunks = [];
            const responseEl = document.getElementById('responseData');
            if (responseEl) responseEl.textContent = 'Waiting for response...';

            // VISUALIZER: State 1 - User Request
            if (window.visualizer) {
                window.visualizer.resetAll();
                window.visualizer.visualizePacket('user', 'server', '#6366f1', '1s');
                window.visualizer.setProcessing('server', true);
            }

            this.updateButtonState(true, '📡 Contacting Server...');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(this.requestData.url, {
                method: this.requestData.method,
                headers: this.requestData.headers,
                body: JSON.stringify(this.requestData.body),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // Determine active agents
            this.activeAgents = [];
            const p = prompt.toLowerCase();
            if (p.includes('news') && !p.includes('analyze')) {
                this.activeAgents.push('agent2');
            } else if ((p.includes('price') || p.includes('chart')) && !p.includes('analyze')) {
                this.activeAgents.push('agent1');
            } else {
                this.activeAgents.push('agent1', 'agent2');
            }

            this.log('⏳ Starting SSE stream processing...');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let chunkNumber = 0;
            let isFirstChunk = true;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                chunkNumber++;

                // Track and display raw response chunks
                this.responseChunks.push(chunk);
                const responseEl = document.getElementById('responseData');
                if (responseEl) {
                    responseEl.textContent = this.responseChunks.join('');
                    responseEl.scrollTop = responseEl.scrollHeight;
                }

                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') {
                        this.log('✅ Received [DONE] signal from server');
                        this.finishGeneration();
                        return;
                    }

                    try {
                        const message = JSON.parse(data);

                        // Handle Architectural Status (NEW)
                        if (message._meta === 'A2A_STATUS') {
                            this.handleVisualizerStatus(message.status);
                            continue;
                        }

                        if (isFirstChunk && !message._meta) {
                            isFirstChunk = false;
                            this.updateButtonState(true, '🎨 Streaming UI...');
                            if (window.visualizer) {
                                this.animationTimeouts.forEach(clearTimeout);
                                window.visualizer.resetAll();
                                this.activeAgents.forEach(agentId => {
                                    window.visualizer.visualizePacket('gemini', agentId, '#10b981', '0.3s');
                                });
                            }
                        }

                        // Visualize streaming packets
                        if (window.visualizer && chunkNumber > 1 && !message._meta) {
                            const source = this.activeAgents[chunkNumber % this.activeAgents.length];
                            window.visualizer.visualizePacket(source, 'renderer', '#6366f1', '0.5s');
                            setTimeout(() => window.visualizer.pulseNode('renderer'), 500);
                        }

                        this.handleA2UIMessage(message);
                    } catch (e) {
                        console.warn('Failed to parse SSE:', data);
                    }
                }
            }
        } catch (error) {
            this.showError(error.message);
            if (window.visualizer) window.visualizer.resetAll();
        } finally {
            this.isGenerating = false;
            this.updateButtonState(false);
            if (window.visualizer) window.visualizer.resetAll();
        }
    },

    // Handle Architectural Events from Server
    handleVisualizerStatus(status) {
        if (!window.visualizer) return;
        this.log(`🔄 Architecture Transition: ${status}`);

        switch (status) {
            case 'COORDINATOR_ACTIVE':
                this.updateButtonState(true, '🧠 Coordinator Thinking...');
                window.visualizer.setProcessing('server', false);
                window.visualizer.visualizePacket('server', 'coordinator', '#6366f1', '0.5s');
                setTimeout(() => window.visualizer.setProcessing('coordinator', true), 500);
                break;
            case 'DELEGATING_TO_AGENTS':
                this.updateButtonState(true, '✨ Delegating to Agents...');
                window.visualizer.setProcessing('coordinator', false);
                this.activeAgents.forEach(agentId => {
                    window.visualizer.visualizePacket('coordinator', agentId, '#ec4899', '0.5s');
                });
                setTimeout(() => {
                    this.activeAgents.forEach(agentId => {
                        window.visualizer.setProcessing(agentId, true);
                        window.visualizer.visualizePacket(agentId, 'gemini', '#10b981', '0.5s');
                    });
                    setTimeout(() => window.visualizer.setProcessing('gemini', true), 500);
                }, 500);
                break;
        }
    },

    handleA2UIMessage(message) {
        // Handle Gemini Context (Detailed metadata)
        if (message._meta === 'GEMINI_REQUEST' || message._meta === 'COORDINATOR_CONTEXT') {
            const contextType = message._meta === 'GEMINI_REQUEST' ? 'Gemini API' : 'A2A Coordinator';
            this.log(`📋 [CONTEXT] Received ${contextType} metadata`);

            // Update the Request tab with this "internal" info
            const requestEl = document.getElementById('requestData');
            if (requestEl) {
                const currentRequest = JSON.parse(requestEl.textContent || '{}');
                requestEl.textContent = JSON.stringify({
                    initialRequest: currentRequest.initialRequest || currentRequest,
                    internalContext: message.context || message
                }, null, 2);
            }
            return;
        }
        this.log(`📥 Received A2UI Message: ${JSON.stringify(message, null, 2)}`);
        this.messages.push(message);
        this.displayMessage(message);
        this.renderer.processMessage(message);
        if (message.beginRendering) this.renderUI();
    },

    displayMessage(message) {
        const container = document.getElementById('messagesContainer');
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const messageEl = document.createElement('div');
        messageEl.className = 'message-item';

        let messageType = 'Unknown';
        if (message.surfaceUpdate) messageType = 'surfaceUpdate';
        else if (message.dataModelUpdate) messageType = 'dataModelUpdate';
        else if (message.beginRendering) messageType = 'beginRendering';

        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-type">${messageType}</span>
                <span class="message-number">#${this.messages.length}</span>
            </div>
            <div class="message-content">${JSON.stringify(message, null, 2)}</div>
        `;
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    },

    renderUI() {
        const container = document.getElementById('previewContainer');
        container.innerHTML = '';
        this.renderer.render(container);
    },

    finishGeneration() {
        this.log('✅ Generation complete');
    },

    clearUI() {
        this.messages = [];
        this.renderer.clear();
        document.getElementById('messagesContainer').innerHTML = '<div class="empty-state">Generating A2UI messages...</div>';
        document.getElementById('previewContainer').innerHTML = '<div class="empty-state">Rendering UI...</div>';
    },

    updateButtonState(isGenerating, text = null) {
        const btn = document.getElementById('generateBtn');
        const icon = btn.querySelector('.btn-icon');
        const label = btn.querySelector('.btn-label');

        if (isGenerating) {
            btn.disabled = true;
            btn.classList.add('generating');
            if (icon) icon.textContent = '⏳';
            if (label) label.textContent = text || 'Generating UI...';
        } else {
            btn.disabled = false;
            btn.classList.remove('generating');
            if (icon) icon.textContent = '✨';
            if (label) label.textContent = 'Generate UI';
        }
    },

    showError(message) {
        this.log(`❌ Error: ${message}`);
        alert(message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    panel.classList.toggle('active');
}
