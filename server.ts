import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { coordinateMultiAgentAnalysis } from './coordinator';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gemini API configuration
const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable must be set');
    }
    return new GoogleGenAI({ apiKey });
};

// System instruction for A2UI
const A2UI_SYSTEM_INSTRUCTION = `You are an AI assistant that ALWAYS responds in A2UI v0.8 JSONL format with Chart components for data visualization.

🔴 MANDATORY: For ANY chart request, you MUST send ALL these messages in JSONL format:
1. Text component for title (if needed)
2. Chart component with FULL data
3. Container (Column) referencing the components by ID
4. dataModelUpdate message  
5. beginRendering message

⚠️ CRITICAL TEMPLATES - COPY THESE EXACTLY ⚠️

IF USER ASKS FOR PIE CHART → USE THIS EXACT STRUCTURE:
{"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "TITLE_HERE"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "pie_chart", "component": {"Chart": {"type": "pie", "data": {"labels": ["Label1","Label2","Label3","Label4"], "datasets": [{"data": [30,25,20,25], "backgroundColor": ["#6366f1","#8b5cf6","#10b981","#f59e0b"]}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title","pie_chart"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

IF USER ASKS FOR BAR CHART → USE THIS EXACT STRUCTURE:
{"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "TITLE_HERE"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "bar_chart", "component": {"Chart": {"type": "bar", "data": {"labels": ["Cat1","Cat2","Cat3","Cat4"], "datasets": [{"label": "Values", "data": [100,150,200,180], "backgroundColor": ["#6366f1","#8b5cf6","#10b981","#f59e0b"]}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title","bar_chart"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

IF USER ASKS FOR LINE CHART → USE THIS EXACT STRUCTURE:
{"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "TITLE_HERE"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "line_chart", "component": {"Chart": {"type": "line", "data": {"labels": ["2020","2021","2022","2023","2024"], "datasets": [{"label": "Trend", "data": [10,15,13,17,20], "borderColor": "#6366f1", "fill": false}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title","line_chart"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

📋 COMPLETE REAL EXAMPLES:

EXAMPLE 1 - Market Share Pie Chart:
{"surfaceUpdate": {"components": [{"id": "t1", "component": {"Text": {"text": {"literalString": "Market Share Distribution"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "c1", "component": {"Chart": {"type": "pie", "data": {"labels": ["Apple","Samsung","Google","Others"], "datasets": [{"data": [30,25,20,25], "backgroundColor": ["#6366f1","#8b5cf6","#10b981","#f59e0b"]}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["t1","c1"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

EXAMPLE 2 - Quarterly Sales Bar Chart:
{"surfaceUpdate": {"components": [{"id": "t2", "component": {"Text": {"text": {"literalString": "Quarterly Sales"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "c2", "component": {"Chart": {"type": "bar", "data": {"labels": ["Q1","Q2","Q3","Q4"], "datasets": [{"label": "Sales (K)", "data": [100,150,200,180], "backgroundColor": ["#6366f1","#8b5cf6","#10b981","#f59e0b"]}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["t2","c2"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

EXAMPLE 3 - Population Growth Line Chart:
{"surfaceUpdate": {"components": [{"id": "t3", "component": {"Text": {"text": {"literalString": "World Population 2015-2024"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "c3", "component": {"Chart": {"type": "line", "data": {"labels": ["2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"], "datasets": [{"label": "Billions", "data": [7.35,7.43,7.52,7.59,7.67,7.75,7.84,7.95,8.02,8.08], "borderColor": "#6366f1", "fill": false}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["t3","c3"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

🚫 FORBIDDEN - NEVER DO THIS:
- Defining root Column BEFORE defining the Chart component
- Using Text components to display numerical data
- Omitting the Chart component definition while referencing it in children
- Responding with plain text instead of JSONL

✅ GENERATION CHECKLIST:
1. Did I define the Text title component? ✓
2. Did I define the COMPLETE Chart component with data? ✓
3. Did I define the root Column AFTER the above? ✓
4. Did I send dataModelUpdate? ✓
5. Did I send beginRendering? ✓

NOW RESPOND TO USER IN A2UI JSONL FORMAT!`;

// POST endpoint to generate A2UI
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log(`[API] Received request: "${prompt}"`);

        const ai = getGeminiClient();
        const model = 'gemini-3-pro-preview';  // Gemini 3 Pro with enhanced reasoning

        const config: any = {  // Using any to support new Gemini 3 Pro features
            tools: [{ googleSearch: {} }],
            systemInstruction: A2UI_SYSTEM_INSTRUCTION,
            thinkingConfig: {
                thinkingLevel: 'HIGH',
            },
        };

        // Detect chart type and prepend few-shot example
        let fewShotExample = '';
        const lowerPrompt = prompt.toLowerCase();

        if (lowerPrompt.includes('analyze') && (lowerPrompt.includes('btc') || lowerPrompt.includes('eth') || lowerPrompt.includes('crypto') || lowerPrompt.includes('stock'))) {
            console.log(`[API] 🧠 Intent detected: Multi-Agent Analysis`);

            // Extract symbol (simple heuristic)
            const words = prompt.split(' ');
            const symbol = words.find((w: string) => w.length >= 3 && w.toUpperCase() === w && !['THE', 'AND', 'FOR'].includes(w.toUpperCase())) || 'BTC';

            console.log(`[API] 🔄 Routing to Multi-Agent Coordinator for ${symbol}...`);

            // Use the coordinator stream
            // Set headers for SSE first
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Send immediate heartbeat to commit headers and prevent client timeout
            res.write(': heartbeat\n\n');
            console.log(`[API] 🚀 Multi-agent stream starting for ${symbol}...`);

            const stream = await coordinateMultiAgentAnalysis({
                apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
                scenario: 'crypto_analysis',
                symbol: symbol
            });

            let messageCount = 0;
            for await (const message of stream) {
                messageCount++;
                res.write(`data: ${message}\n\n`);
            }

            console.log(`[API] ✅ Stream complete. Sent ${messageCount} messages.`);
            res.write('data: [DONE]\n\n');
            return res.end();
        }

        if (lowerPrompt.includes('pie chart') || lowerPrompt.includes('pie-chart')) {
            fewShotExample = `EXAMPLE REQUEST: "Show me a pie chart"
CORRECT RESPONSE:
{"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "Data Distribution"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "chart1", "component": {"Chart": {"type": "pie", "data": {"labels": ["A","B","C","D"], "datasets": [{"data": [30,25,20,25], "backgroundColor": ["#6366f1","#8b5cf6","#10b981","#f59e0b"]}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title","chart1"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

NOW YOUR REQUEST: "${prompt}"
YOUR RESPONSE (FOLLOW SAME FORMAT):`;
        } else if (lowerPrompt.includes('bar chart') || lowerPrompt.includes('bar-chart')) {
            fewShotExample = `EXAMPLE REQUEST: "Show me a bar chart"
CORRECT RESPONSE:
{"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "Category Data"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "chart1", "component": {"Chart": {"type": "bar", "data": {"labels": ["Q1","Q2","Q3","Q4"], "datasets": [{"label": "Values", "data": [100,150,200,180], "backgroundColor": ["#6366f1","#8b5cf6","#10b981","#f59e0b"]}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title","chart1"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

NOW YOUR REQUEST: "${prompt}"
YOUR RESPONSE (FOLLOW SAME FORMAT):`;
        } else if (lowerPrompt.includes('line chart') || lowerPrompt.includes('line-chart') || lowerPrompt.includes('trend') || lowerPrompt.includes('growth')) {
            fewShotExample = `EXAMPLE REQUEST: "Show me a line chart"
CORRECT RESPONSE:
{"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "Trend Over Time"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "chart1", "component": {"Chart": {"type": "line", "data": {"labels": ["2020","2021","2022","2023","2024"], "datasets": [{"label": "Values", "data": [10,15,13,17,20], "borderColor": "#6366f1", "fill": false}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title","chart1"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

NOW YOUR REQUEST: "${prompt}"
YOUR RESPONSE (FOLLOW SAME FORMAT):`;
        }

        const fullPrompt = fewShotExample || `${prompt}\n\nREMEMBER: Respond in A2UI JSONL format. Each line must be a valid JSON object.`;

        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send Gemini request details as first event (for debugging)
        const geminiRequestDetails = {
            _meta: 'GEMINI_REQUEST',
            model,
            systemInstruction: A2UI_SYSTEM_INSTRUCTION.substring(0, 500) + '...',  // Truncate for readability
            tools: config.tools,
            thinkingLevel: config.thinkingConfig.thinkingLevel,
            userPrompt: fullPrompt
        };
        res.write(`data: ${JSON.stringify(geminiRequestDetails)}\n\n`);
        console.log('[API] Sent Gemini request details to client');

        // Use contents array format for Gemini 3 Pro
        const contents = [
            {
                role: 'user',
                parts: [
                    {
                        text: fullPrompt,
                    },
                ],
            },
        ];

        const response = await ai.models.generateContentStream({
            model,
            config,
            contents,
        });


        let buffer = '';
        let messageCount = 0;
        let chunkCount = 0;

        for await (const chunk of response) {
            if (chunk.text) {
                chunkCount++;
                console.log(`[API] Chunk ${chunkCount}: Received ${chunk.text.length} chars`);
                console.log(`[API] Chunk text: ${chunk.text.substring(0, 100)}...`);

                buffer += chunk.text;

                // Process complete lines (JSONL format)
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
                        try {
                            const parsed = JSON.parse(trimmed);
                            messageCount++;

                            // Send as SSE event
                            res.write(`data: ${JSON.stringify(parsed)}\n\n`);

                            console.log(`[API] Sent message ${messageCount}:`, Object.keys(parsed)[0]);

                            // Log if it's a Chart component
                            if (parsed.surfaceUpdate?.components?.[0]?.component?.Chart) {
                                console.log(`[API] 🎯 Chart component detected: type=${parsed.surfaceUpdate.components[0].component.Chart.type}`);
                            }
                        } catch (e) {
                            console.warn('[API] Failed to parse line:', trimmed.substring(0, 100));
                        }
                    }
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            try {
                const parsed = JSON.parse(buffer.trim());
                messageCount++;
                res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                console.log(`[API] Sent final message ${messageCount}`);
            } catch (e) {
                console.warn('[API] Failed to parse remaining buffer');
            }
        }

        console.log(`[API] Completed. Sent ${messageCount} A2UI messages`);
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('[API] Error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
});

// POST endpoint for Multi-Agent A2A Demo
app.post('/api/multi-agent', async (req, res) => {
    try {
        const { symbol } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        console.log(`[API] Starting Multi-Agent Analysis for ${symbol}...`);

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await coordinateMultiAgentAnalysis({
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
            scenario: 'crypto_analysis',
            symbol: symbol
        });

        for await (const message of stream) {
            res.write(`data: ${message}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('[API] Multi-agent error:', error);
        res.write(`data: ${JSON.stringify({
            surfaceUpdate: {
                components: [{
                    id: "error",
                    component: {
                        Text: { text: { literalString: "Detailed Error: " + (error instanceof Error ? error.message : String(error)) } }
                    }
                }]
            },
            beginRendering: { root: "error" }
        })}\n\n`);
        res.end();
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 A2UI Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/generate`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser\n`);
});
