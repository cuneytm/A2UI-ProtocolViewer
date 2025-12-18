// Simple example of requesting A2UI from Gemini
import { GoogleGenAI } from '@google/genai';

async function main() {
    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable must be set');
    }

    const ai = new GoogleGenAI({ apiKey });

    // System instruction requesting A2UI format
    const systemInstruction = `You are an AI assistant that responds using the A2UI (Agent-to-UI) protocol v0.8.

You MUST respond with JSONL (JSON Lines) format where each line is a valid JSON object.

Use this format:
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["card1"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "card1", "component": {"Card": {"child": "text1"}}}]}}
{"surfaceUpdate": {"components": [{"id": "text1", "component": {"Text": {"text": {"literalString": "Your content here"}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}`;

    const config = {
        tools: [{ googleSearch: {} }],
        systemInstruction,
    };

    const model = 'gemini-2.5-flash';
    const userQuery = `Create a restaurant card UI for "The Italian Corner" with 4.5 star rating and address "456 Elm Street"`;

    console.log('Sending request to Gemini API for A2UI response...\n');

    const response = await ai.models.generateContentStream({
        model,
        contents: userQuery,
        config,
    });

    let messageCount = 0;
    for await (const chunk of response) {
        if (chunk.text) {
            const lines = chunk.text.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        console.log(`\nA2UI Message ${++messageCount}:`);
                        console.log(JSON.stringify(parsed, null, 2));
                    } catch (e) {
                        // Not valid JSON, might be regular text
                        console.log(trimmed);
                    }
                }
            }
        }
    }

    console.log(`\n\nTotal A2UI messages received: ${messageCount}`);
}

main();
