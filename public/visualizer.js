class FlowVisualizer {
    constructor() {
        this.svg = document.getElementById('connectionsSvg');
        this.nodes = {
            user: document.getElementById('node-user'),
            server: document.getElementById('node-server'),
            gemini: document.getElementById('node-gemini'),
            coordinator: document.getElementById('node-coordinator'),
            agent1: document.getElementById('node-agent1'),
            agent2: document.getElementById('node-agent2'),
            renderer: document.getElementById('node-renderer')
        };

        // Wait for layout to settle
        setTimeout(() => this.init(), 100);
        window.addEventListener('resize', () => this.drawConnections());
    }

    init() {
        this.drawConnections();
    }

    getCenter(element) {
        if (!element) return { x: 0, y: 0 };
        const rect = element.getBoundingClientRect();
        const containerRect = document.getElementById('flowCanvas').getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top
        };
    }

    drawConnections() {
        this.svg.innerHTML = '';
        // New Topology: User->Server->Coordinator->Agents
        // Agents <-> Gemini
        const paths = [
            ['user', 'server'],
            ['server', 'coordinator'],

            // Coordinator delegates to Agents
            ['coordinator', 'agent1'],
            ['coordinator', 'agent2'],

            // Agents call Gemini (Upward flow)
            ['agent1', 'gemini'],
            ['agent2', 'gemini'],

            // Streaming to Renderer
            ['agent1', 'renderer'],
            ['agent2', 'renderer']
        ];

        paths.forEach(([start, end]) => {
            if (!this.nodes[start] || !this.nodes[end]) return;
            this.createPath(start, end);
        });
    }

    createPath(startId, endId) {
        const start = this.getCenter(this.nodes[startId]);
        const end = this.getCenter(this.nodes[endId]);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        const diffX = end.x - start.x;
        const diffY = end.y - start.y;

        let d = '';

        // Check if connection is predominantly vertical (e.g. Agents <-> Gemini)
        const isVertical = Math.abs(diffY) > Math.abs(diffX);

        if (isVertical) {
            // Vertical Curving (S-shape on Y axis)
            const controlY = diffY * 0.5;
            d = `M ${start.x} ${start.y} C ${start.x} ${start.y + controlY}, ${end.x} ${end.y - controlY}, ${end.x} ${end.y}`;
        } else {
            // Horizontal Curving (Standard)
            const controlX = diffX * 0.5;
            d = `M ${start.x} ${start.y} C ${start.x + controlX} ${start.y}, ${end.x - controlX} ${end.y}, ${end.x} ${end.y}`;
        }

        path.setAttribute('d', d);
        path.classList.add('connection-line');
        path.id = `path-${startId}-${endId}`;
        this.svg.appendChild(path);
    }

    // --- STATE MANAGEMENT ---

    highlightNode(nodeId) {
        const node = this.nodes[nodeId];
        if (node) {
            node.classList.add('active');
            setTimeout(() => node.classList.remove('active'), 500);
        }
    }

    highlightPath(from, to, active = true) {
        const pathId = `path-${from}-${to}`;
        const path = document.getElementById(pathId);
        if (path) {
            if (active) path.classList.add('active');
            else path.classList.remove('active');
        }
    }

    pulseNode(nodeId) {
        const node = this.nodes[nodeId];
        if (node) {
            node.classList.remove('pulse-once');
            void node.offsetWidth;
            node.classList.add('pulse-once');
            setTimeout(() => node.classList.remove('pulse-once'), 300);
        }
    }

    setProcessing(nodeId, isProcessing) {
        const node = this.nodes[nodeId];
        if (!node) return;
        if (isProcessing) node.classList.add('processing');
        else node.classList.remove('processing');
    }

    resetAll() {
        Object.values(this.nodes).forEach(n => n && n.classList.remove('processing', 'active'));
        this.svg.querySelectorAll('.connection-line').forEach(l => l.classList.remove('active'));
    }

    // --- ANIMATION V2: Cyber Trail ---

    visualizePacket(from, to, color = '#6366f1', duration = '0.8s') {
        const pathId = `path-${from}-${to}`;
        let sourcePath = document.getElementById(pathId);
        let tempPath = null;

        if (!sourcePath) {
            // Check reverse or create custom
            const startNode = this.nodes[from];
            const endNode = this.nodes[to];
            if (!startNode || !endNode) return;

            tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const start = this.getCenter(startNode);
            const end = this.getCenter(endNode);
            const diffX = end.x - start.x;
            const diffY = end.y - start.y;
            const isVertical = Math.abs(diffY) > Math.abs(diffX);
            let d = '';
            if (isVertical) {
                const controlY = diffY * 0.5;
                d = `M ${start.x} ${start.y} C ${start.x} ${start.y + controlY}, ${end.x} ${end.y - controlY}, ${end.x} ${end.y}`;
            } else {
                const controlX = diffX * 0.5;
                d = `M ${start.x} ${start.y} C ${start.x + controlX} ${start.y}, ${end.x - controlX} ${end.y}, ${end.x} ${end.y}`;
            }
            tempPath.setAttribute('d', d);
            tempPath.setAttribute('fill', 'none');
            tempPath.setAttribute('stroke', 'none');
            this.svg.appendChild(tempPath);
            sourcePath = tempPath;
        }

        // Highlight the main path momentarily
        this.highlightPath(from, to, true);
        setTimeout(() => this.highlightPath(from, to, false), 1000);

        // Create the trail (the visible zipping light)
        const trail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        trail.setAttribute('d', sourcePath.getAttribute('d'));
        trail.classList.add('path-trail');
        if (color) trail.style.stroke = color;
        if (color) trail.style.filter = `drop-shadow(0 0 8px ${color})`;

        // CSS Animation for dashoffset
        const length = sourcePath.getTotalLength();
        trail.style.strokeDasharray = `${length / 3} ${length}`;
        trail.style.strokeDashoffset = length;

        const anim = trail.animate([
            { strokeDashoffset: length },
            { strokeDashoffset: -length / 3 }
        ], {
            duration: parseFloat(duration) * 1000,
            easing: 'ease-in-out'
        });

        this.svg.appendChild(trail);

        anim.onfinish = () => {
            if (this.svg.contains(trail)) this.svg.removeChild(trail);
            if (tempPath && this.svg.contains(tempPath)) this.svg.removeChild(tempPath);
            this.pulseNode(to);
        };
    }
}

// Initialize
window.visualizer = new FlowVisualizer();
