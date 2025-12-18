# Chart Rendering Demo

## How Chart Rendering Works in A2UI

### The Complete Flow:

1. **User Request**: "Create a pie chart showing sales data"

2. **Gemini Generates A2UI Messages**:
```jsonl
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title", "chart1"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "Monthly Sales"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "chart1", "component": {"Chart": {"type": "pie", "data": {"labels": ["Jan", "Feb", "Mar"], "datasets": [{"data": [1200, 1500, 1800], "backgroundColor": ["#6366f1", "#8b5cf6", "#10b981"]}]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}
```

3. **Frontend Processes Messages**:
   - `app.js` receives each message via SSE
   - Calls `renderer.processMessage()` for each one
   - `surfaceUpdate` messages store components in a Map
   - `beginRendering` triggers the render

4. **Renderer Builds DOM**:
   - `render()` starts from root component
   - `renderComponent("root")` → creates `<div class="a2ui-column">`
   - Walks children: renders "title" and "chart1"
   - `renderChart()` for chart1:
     - Creates `<canvas>` element
     - Uses Chart.js to draw the chart
     - Returns the DOM element

5. **Result**: Live,interactive chart in the browser!

## Chart Types Supported:

### Pie Chart
```json
{
  "type": "pie",
  "data": {
    "labels": ["Red", "Blue", "Yellow"],
    "datasets": [{
      "data": [300, 50, 100],
      "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
    }]
  }
}
```

### Bar Chart
```json
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [{
      "label": "Revenue",
      "data": [50000, 65000, 72000, 85000],
      "backgroundColor": "#6366f1"
    }]
  }
}
```

### Line Graph
```json
{
  "type": "line",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
    "datasets": [{
      "label": "Growth",
      "data": [10, 25, 35, 50, 70],
      "borderColor": "#10b981",
      "fill": false
    }]
  }
}
```

## Try It Now!

1. Go to http://localhost:3000
2. Click the "📊 Pie Chart" or "📈 Bar Chart" example
3. Click "Generate UI"
4. Watch as Gemini generates the A2UI messages
5. See the chart render live!

## How It Differs from Simple Components:

**Text/Card Components**: Simple DOM elements
```
Text → <p class="a2ui-text">Hello</p>
Card → <div class="a2ui-card">...</div>
```

**Chart Components**: Uses Chart.js library
```
Chart → <canvas> + Chart.js rendering
```

The renderer creates a canvas, then uses `requestAnimationFrame` to let Chart.js draw the visualization AFTER the DOM is ready.
