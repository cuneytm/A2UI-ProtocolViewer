// Library module for Gemini API with A2UI response format
import { GoogleGenAI } from '@google/genai';

export interface GeminiA2UIOptions {
    model?: string;
    enableGoogleSearch?: boolean;
}

export interface A2UIMessage {
    surfaceUpdate?: {
        components?: Array<{
            id: string;
            component: any;
        }>;
    };
    dataModelUpdate?: {
        contents: any;
    };
    beginRendering?: {
        root: string;
        surfaceId?: string;
    };
    deleteSurface?: {
        surfaceId: string;
    };
}

/**
 * Execute a Gemini query requesting A2UI format response
 * @param input - The user input/query
 * @param options - Configuration options
 * @returns AsyncGenerator of A2UI messages
 */
export async function* executeGeminiA2UI(
    input: string,
    options: GeminiA2UIOptions = {}
): AsyncGenerator<A2UIMessage, void, unknown> {
    const {
        model = 'gemini-2.5-flash',
        enableGoogleSearch = true,
    } = options;

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable must be set');
    }

    // Initialize with API key explicitly
    const ai = new GoogleGenAI({ apiKey });

    const tools = enableGoogleSearch ? [{ googleSearch: {} }] : [];

    // System instruction to request A2UI format
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

Example A2UI response for a restaurant card:
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["card1"]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "card1", "component": {"Card": {"child": "content1"}}}]}}
{"surfaceUpdate": {"components": [{"id": "content1", "component": {"Text": {"text": {"literalString": "Restaurant Name"}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

Now respond to the user query using A2UI format.`;

    const config = {
        tools,
        systemInstruction,
    };

    const fullPrompt = `${input}

REMEMBER: Respond in A2UI JSONL format. Each line must be a valid JSON object.`;

    const response = await ai.models.generateContentStream({
        model,
        contents: fullPrompt,
        config,
    });

    let buffer = '';

    for await (const chunk of response) {
        if (chunk.text) {
            buffer += chunk.text;

            // Process complete lines (JSONL format)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
                    try {
                        // Try to parse as JSON
                        const parsed = JSON.parse(trimmed);
                        yield parsed as A2UIMessage;
                    } catch (e) {
                        // If not valid JSON, it might be a text response - wrap it
                        console.warn('Non-JSON line in response:', trimmed);
                    }
                }
            }
        }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
        try {
            const parsed = JSON.parse(buffer.trim());
            yield parsed as A2UIMessage;
        } catch (e) {
            console.warn('Failed to parse remaining buffer:', buffer);
        }
    }
}

/**
 * Execute a Gemini query and return all A2UI messages
 * @param input - The user input/query
 * @param options - Configuration options
 * @returns Array of all A2UI messages
 */
export async function executeGeminiA2UIComplete(
    input: string,
    options: GeminiA2UIOptions = {}
): Promise<A2UIMessage[]> {
    const messages: A2UIMessage[] = [];

    for await (const message of executeGeminiA2UI(input, options)) {
        messages.push(message);
    }

    return messages;
}

/**
 * Format A2UI messages as readable text for display
 */
export function formatA2UIMessages(messages: A2UIMessage[]): string {
    let output = 'A2UI Messages:\n';
    output += '='.repeat(80) + '\n\n';

    messages.forEach((msg, index) => {
        output += `Message ${index + 1}:\n`;
        output += JSON.stringify(msg, null, 2);
        output += '\n\n';
    });

    return output;
}
