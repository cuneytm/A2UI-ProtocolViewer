// Debug script to see all messages sent and received
import { GoogleGenAI } from '@google/genai';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

function printSection(title: string, color: string = colors.cyan) {
    console.log(`\n${colors.bright}${color}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${color}${title}${colors.reset}`);
    console.log(`${colors.bright}${color}${'='.repeat(80)}${colors.reset}\n`);
}

async function debugA2UI() {
    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error(`${colors.red}ERROR: GEMINI_API_KEY or GOOGLE_API_KEY not set!${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.green}✓ API Key detected (length: ${apiKey.length})${colors.reset}\n`);

    const ai = new GoogleGenAI({ apiKey });

    // System instruction for A2UI
    const systemInstruction = `You are an AI assistant that responds using the A2UI (Agent-to-UI) protocol v0.8.

IMPORTANT: You MUST respond with JSONL (JSON Lines) format where each line is a valid JSON object containing one of these message types:
- surfaceUpdate: Define UI components
- dataModelUpdate: Update data bindings
- beginRendering: Signal when ready to render

A2UI Message Format Rules:
1. Each message is a single line of JSON (JSONL format)
2. Components have unique IDs and reference each other by ID
3. Use components like: Column, Row, Card, Text, Image, Button
4. Text content uses {"literalString": "your text"}
5. Children use {"explicitList": ["id1", "id2"]}
6. Always end with dataModelUpdate and beginRendering messages

Example A2UI response:
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["card1"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "card1", "component": {"Card": {"child": "content1"}}}]}}
{"surfaceUpdate": {"components": [{"id": "content1", "component": {"Text": {"text": {"literalString": "Content"}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}`;

    const userQuery = 'Create a simple book card UI for "The Great Gatsby" by F. Scott Fitzgerald, published in 1925';

    const model = 'gemini-2.5-flash';
    const tools = [{ googleSearch: {} }];

    // Display request details
    printSection('📤 REQUEST CONFIGURATION', colors.blue);

    console.log(`${colors.cyan}Model:${colors.reset} ${model}`);
    console.log(`${colors.cyan}Tools:${colors.reset} ${JSON.stringify(tools, null, 2)}`);
    console.log(`\n${colors.cyan}System Instruction (first 200 chars):${colors.reset}`);
    console.log(`${colors.yellow}${systemInstruction.substring(0, 200)}...${colors.reset}`);
    console.log(`\n${colors.cyan}User Query:${colors.reset}`);
    console.log(`${colors.green}${userQuery}${colors.reset}`);

    printSection('📥 STREAMING RESPONSE (Raw Chunks)', colors.magenta);

    const config = {
        tools,
        systemInstruction,
    };

    const fullPrompt = `${userQuery}

REMEMBER: Respond in A2UI JSONL format. Each line must be a valid JSON object.`;

    console.log(`${colors.cyan}Sending request to Gemini API...${colors.reset}\n`);

    const response = await ai.models.generateContentStream({
        model,
        contents: fullPrompt,
        config,
    });

    let chunkNumber = 0;
    let buffer = '';
    let totalChars = 0;
    const allMessages: any[] = [];

    for await (const chunk of response) {
        chunkNumber++;

        if (chunk.text) {
            const chunkText = chunk.text;
            totalChars += chunkText.length;

            console.log(`${colors.yellow}--- Chunk #${chunkNumber} (${chunkText.length} chars) ---${colors.reset}`);
            console.log(`${colors.bright}${chunkText}${colors.reset}`);
            console.log('');

            // Process the chunk for A2UI parsing
            buffer += chunkText;

            // Process complete lines (JSONL format)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        allMessages.push(parsed);
                    } catch (e) {
                        // Skip non-JSON lines
                    }
                }
            }
        }
    }

    // Process remaining buffer
    if (buffer.trim()) {
        try {
            const parsed = JSON.parse(buffer.trim());
            allMessages.push(parsed);
        } catch (e) {
            // Ignore parse errors in remaining buffer
        }
    }

    printSection('📊 RESPONSE STATISTICS', colors.cyan);

    console.log(`${colors.green}Total Chunks Received:${colors.reset} ${chunkNumber}`);
    console.log(`${colors.green}Total Characters:${colors.reset} ${totalChars}`);
    console.log(`${colors.green}A2UI Messages Parsed:${colors.reset} ${allMessages.length}\n`);

    printSection('🔍 PARSED A2UI MESSAGES', colors.green);

    allMessages.forEach((msg, index) => {
        console.log(`${colors.bright}${colors.cyan}Message ${index + 1}/${allMessages.length}:${colors.reset}`);
        console.log(JSON.stringify(msg, null, 2));

        // Show message type summary
        if (msg.surfaceUpdate) {
            const components = msg.surfaceUpdate.components || [];
            console.log(`${colors.yellow}  → Type: surfaceUpdate (${components.length} component(s))${colors.reset}`);
            components.forEach((comp: any) => {
                const compType = Object.keys(comp.component)[0];
                console.log(`${colors.yellow}    • ${comp.id}: ${compType}${colors.reset}`);
            });
        } else if (msg.dataModelUpdate) {
            console.log(`${colors.yellow}  → Type: dataModelUpdate${colors.reset}`);
        } else if (msg.beginRendering) {
            console.log(`${colors.yellow}  → Type: beginRendering (root: ${msg.beginRendering.root})${colors.reset}`);
        } else if (msg.deleteSurface) {
            console.log(`${colors.yellow}  → Type: deleteSurface${colors.reset}`);
        }

        console.log('');
    });

    printSection('✅ COMPLETE', colors.green);
    console.log(`${colors.bright}Debug session complete!${colors.reset}\n`);
}

// Run the debug
console.clear();
debugA2UI().catch((error) => {
    console.error(`${colors.red}${colors.bright}ERROR:${colors.reset}`, error);
    if (error instanceof Error && error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});
