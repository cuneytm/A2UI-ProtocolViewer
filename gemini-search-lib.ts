// Library module for Gemini API with Google Search
import { GoogleGenAI } from '@google/genai';

export interface GeminiSearchOptions {
    model?: string;
    enableGoogleSearch?: boolean;
}

export interface StreamChunk {
    text?: string;
    [key: string]: any;
}

/**
 * Execute a Gemini query with Google Search
 * @param input - The user input/query
 * @param options - Configuration options
 * @returns AsyncGenerator of response chunks
 */
export async function* executeGeminiSearch(
    input: string,
    options: GeminiSearchOptions = {}
): AsyncGenerator<StreamChunk, void, unknown> {
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

    const config = {
        tools,
    };

    const response = await ai.models.generateContentStream({
        model,
        contents: input,
        config,
    });

    for await (const chunk of response) {
        yield chunk;
    }
}

/**
 * Execute a Gemini query and return the full response as a string
 * @param input - The user input/query
 * @param options - Configuration options
 * @returns Full response text
 */
export async function executeGeminiSearchComplete(
    input: string,
    options: GeminiSearchOptions = {}
): Promise<string> {
    let fullResponse = '';

    for await (const chunk of executeGeminiSearch(input, options)) {
        if (chunk.text) {
            fullResponse += chunk.text;
        }
    }

    return fullResponse;
}
