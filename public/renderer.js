// A2UI Renderer - Converts A2UI messages to DOM elements

class A2UIRenderer {
    constructor() {
        this.components = new Map();
        this.rootId = null;
    }

    // Clear all components
    clear() {
        this.components.clear();
        this.rootId = null;
    }

    // Process an A2UI message
    processMessage(message) {
        if (message.surfaceUpdate) {
            this.handleSurfaceUpdate(message.surfaceUpdate);
        } else if (message.dataModelUpdate) {
            this.handleDataModelUpdate(message.dataModelUpdate);
        } else if (message.beginRendering) {
            this.handleBeginRendering(message.beginRendering);
        }
    }

    // Handle surfaceUpdate message
    handleSurfaceUpdate(update) {
        if (!update.components) return;

        update.components.forEach(comp => {
            this.components.set(comp.id, comp.component);
        });
    }

    // Handle dataModelUpdate message
    handleDataModelUpdate(update) {
        // For now, we don't handle data binding
        // This is where you'd handle reactive data
    }

    // Handle beginRendering message
    handleBeginRendering(rendering) {
        this.rootId = rendering.root;
    }

    // Render the complete UI
    render(container) {
        if (!this.rootId) {
            console.warn('No root component specified');
            return;
        }

        container.innerHTML = '';
        const rootElement = this.renderComponent(this.rootId);
        if (rootElement) {
            container.appendChild(rootElement);
        }
    }

    // Render a single component
    renderComponent(id) {
        const component = this.components.get(id);
        if (!component) {
            console.warn(`Component not found: ${id}`);
            return null;
        }

        const type = Object.keys(component)[0];
        const props = component[type];

        switch (type) {
            case 'Column':
                return this.renderColumn(props);
            case 'Row':
                return this.renderRow(props);
            case 'Card':
                return this.renderCard(props);
            case 'Text':
                return this.renderText(props);
            case 'Image':
                return this.renderImage(props);
            case 'Button':
                return this.renderButton(props);
            case 'Chart':
                return this.renderChart(props);
            default:
                console.warn(`Unknown component type: ${type}`);
                return this.renderUnknown(type, props);
        }
    }

    // Render Chart component (NEW!)
    renderChart(props) {
        const container = document.createElement('div');
        container.className = 'a2ui-chart-container';

        const canvas = document.createElement('canvas');
        canvas.className = 'a2ui-chart';
        const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;
        canvas.id = chartId;

        container.appendChild(canvas);

        // Render chart after DOM insertion
        if (typeof Chart !== 'undefined' && props.type && props.data) {
            requestAnimationFrame(() => {
                try {
                    new Chart(canvas, {
                        type: props.type,  // 'pie', 'bar', 'line', 'doughnut'
                        data: props.data,
                        options: props.options || {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        color: '#cbd5e1',  // Light text for dark theme
                                        font: { size: 12 }
                                    }
                                }
                            },
                            scales: props.type !== 'pie' && props.type !== 'doughnut' ? {
                                y: {
                                    ticks: { color: '#cbd5e1' },
                                    grid: { color: '#334155' }
                                },
                                x: {
                                    ticks: { color: '#cbd5e1' },
                                    grid: { color: '#334155' }
                                }
                            } : undefined
                        }
                    });
                    console.log(`✅ Chart rendered: ${chartId}`);
                } catch (error) {
                    console.error('Failed to render chart:', error);
                    container.innerHTML = `<div class="chart-error">Failed to render chart: ${error.message}</div>`;
                }
            });
        } else {
            container.innerHTML = '<div class="chart-error">Chart.js not loaded or invalid chart data</div>';
        }

        return container;
    }

    // Render Column component
    renderColumn(props) {
        const div = document.createElement('div');
        div.className = 'a2ui-column';

        if (props.children && props.children.explicitList) {
            props.children.explicitList.forEach(childId => {
                const child = this.renderComponent(childId);
                if (child) div.appendChild(child);
            });
        }

        return div;
    }

    // Render Row component
    renderRow(props) {
        const div = document.createElement('div');
        div.className = 'a2ui-row';

        if (props.alignment) {
            div.style.justifyContent = props.alignment;
        }

        if (props.children && props.children.explicitList) {
            props.children.explicitList.forEach(childId => {
                const child = this.renderComponent(childId);
                if (child) div.appendChild(child);
            });
        }

        return div;
    }

    // Render Card component
    renderCard(props) {
        const div = document.createElement('div');
        div.className = 'a2ui-card';

        // Card can have a single child or a Column of children
        if (props.child) {
            if (typeof props.child === 'string') {
                const child = this.renderComponent(props.child);
                if (child) div.appendChild(child);
            } else if (props.child.Column) {
                // Inline Column definition
                const column = this.renderColumn(props.child.Column);
                if (column) div.appendChild(column);
            }
        }

        return div;
    }

    // Render Text component
    renderText(props) {
        const p = document.createElement('p');
        p.className = 'a2ui-text';

        // Handle text content
        if (props.text) {
            if (props.text.literalString) {
                p.textContent = props.text.literalString;
            } else if (typeof props.text === 'string') {
                p.textContent = props.text;
            }
        }

        // Handle usage hint (h1, h2, h3, etc.)
        if (props.usageHint) {
            p.classList.add(props.usageHint.toLowerCase());
        }

        return p;
    }

    // Render Image component
    renderImage(props) {
        const img = document.createElement('img');
        img.className = 'a2ui-image';

        if (props.url) {
            if (props.url.literalString) {
                img.src = props.url.literalString;
            } else if (typeof props.url === 'string') {
                img.src = props.url;
            }
        }

        if (props.alt) {
            img.alt = props.alt.literalString || props.alt;
        }

        return img;
    }

    // Render Button component
    renderButton(props) {
        const button = document.createElement('button');
        button.className = 'a2ui-button';

        if (props.text) {
            if (props.text.literalString) {
                button.textContent = props.text.literalString;
            } else if (typeof props.text === 'string') {
                button.textContent = props.text;
            }
        }

        if (props.onClick) {
            button.onclick = () => {
                console.log('Button clicked:', props.onClick);
                // Here you would emit a userAction message
            };
        }

        return button;
    }

    // Render unknown component type
    renderUnknown(type, props) {
        const div = document.createElement('div');
        div.className = 'a2ui-unknown';
        div.style.padding = '1rem';
        div.style.background = 'rgba(239, 68, 68, 0.1)';
        div.style.border = '1px dashed var(--error)';
        div.style.borderRadius = 'var(--radius)';
        div.style.color = 'var(--error)';
        div.textContent = `Unknown component type: ${type}`;
        return div;
    }

    // Get stats about the current UI
    getStats() {
        return {
            componentCount: this.components.size,
            rootId: this.rootId,
            types: this.getComponentTypes()
        };
    }

    // Get component types used
    getComponentTypes() {
        const types = new Set();
        this.components.forEach(component => {
            const type = Object.keys(component)[0];
            types.add(type);
        });
        return Array.from(types);
    }
}

// Export for use in app.js
window.A2UIRenderer = A2UIRenderer;
