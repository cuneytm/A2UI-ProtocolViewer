# A2UI Rendering Flow - How It Works

## 📊 Understanding the Rendering Process

### Step-by-Step Flow

```
1. User enters prompt → 
2. Browser sends to backend → 
3. Backend sends to Gemini with A2UI system instruction → 
4. Gemini generates A2UI JSONL stream → 
5. Backend forwards via SSE → 
6. Frontend parses messages → 
7. Renderer builds component tree → 
8. DOM elements created → 
9. UI appears on screen
```

## 🎨 Current Rendering Process

### 1. **Message Processing** (`processMessage`)
When an A2UI message arrives:
```javascript
processMessage(message) {
    if (message.surfaceUpdate) {
        // Store component definitions
        this.handleSurfaceUpdate(message.surfaceUpdate);
    } else if (message.dataModelUpdate) {
        // Handle data binding (currently unused)
        this.handleDataModelUpdate(message.dataModelUpdate);
    } else if (message.beginRendering) {
        // Set root and trigger render
        this.handleBeginRendering(message.beginRendering);
    }
}
```

### 2. **Component Storage**
Components are stored in a Map by ID:
```javascript
// Example stored components:
{
  "root": { "Column": { "children": { "explicitList": ["card1"] } } },
  "card1": { "Card": { "child": "text1" } },
  "text1": { "Text": { "text": { "literalString": "Hello" } } }
}
```

### 3. **Recursive Rendering** (`renderComponent`)
The renderer walks the component tree:
```javascript
renderComponent(id) {
    const component = this.components.get(id);
    const type = Object.keys(component)[0];  // e.g., "Column", "Card"
    const props = component[type];           // Component properties
    
    switch (type) {
        case 'Column': return this.renderColumn(props);
        case 'Card': return this.renderCard(props);
        // ... etc
    }
}
```

### 4. **DOM Element Creation**
Each component type creates specific HTML:
```javascript
renderCard(props) {
    const div = document.createElement('div');
    div.className = 'a2ui-card';
    
    // Recursively render child
    if (props.child) {
        const child = this.renderComponent(props.child);
        div.appendChild(child);
    }
    
    return div;  // Returns actual DOM element
}
```

## 📈 Adding Chart/Graph Support

Currently, A2UI protocol doesn't have built-in Chart components, but you have **3 options**:

### Option 1: Use Image Component (Simplest)
Gemini generates a chart URL and displays it as an image:

**A2UI Message:**
```jsonl
{"surfaceUpdate": {"components": [{"id": "chart1", "component": {"Image": {"url": {"literalString": "https://quickchart.io/chart?c={type:'pie',data:{labels:['Red','Blue'],datasets:[{data:[12,19]}]}}"}}}}]}}
```

**Pros:** No code changes needed  
**Cons:** Static images only, no interactivity

### Option 2: Extend with Custom Components (Recommended)
Add a Chart component type to the renderer:

**Step 1:** Add Chart renderer:
```javascript
// In renderer.js, add to switch statement:
case 'Chart':
    return this.renderChart(props);

// Add new method:
renderChart(props) {
    const canvas = document.createElement('canvas');
    canvas.className = 'a2ui-chart';
    canvas.id = `chart-${Math.random().toString(36).substr(2, 9)}`;
    
    // Use Chart.js to render
    if (props.type && props.data) {
        requestAnimationFrame(() => {
            new Chart(canvas, {
                type: props.type,  // 'pie', 'bar', 'line'
                data: props.data,
                options: props.options || {}
            });
        });
    }
    
    return canvas;
}
```

**Step 2:** Update system instruction to include Chart component:
```
Components available: Column, Row, Card, Text, Image, Button, Chart

Chart format:
{
  "Chart": {
    "type": "pie",  // or "bar", "line", "doughnut"
    "data": {
      "labels": ["Red", "Blue", "Yellow"],
      "datasets": [{
        "data": [300, 50, 100],
        "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
      }]
    }
  }
}
```

**Step 3:** Expected A2UI from Gemini:
```jsonl
{"surfaceUpdate": {"components": [{"id": "sales_chart", "component": {"Chart": {"type": "pie", "data": {"labels": ["Q1", "Q2", "Q3", "Q4"], "datasets": [{"data": [25, 30, 35, 40], "backgroundColor": ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b"]}]}}}}]}}
```

### Option 3: Use HTML Canvas with Custom Rendering
For complex visualizations, use a generic Canvas component:

```javascript
renderCanvas(props) {
    const canvas = document.createElement('canvas');
    canvas.width = props.width || 400;
    canvas.height = props.height || 300;
    
    // Custom drawing code
    if (props.drawFunction) {
        const ctx = canvas.getContext('2d');
        // Execute drawing instructions
    }
    
    return canvas;
}
```

## 🎯 Practical Example: Adding Chart.js Support

Let me create a working example with Chart.js integration...
