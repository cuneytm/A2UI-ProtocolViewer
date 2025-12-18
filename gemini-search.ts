// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node

import { GoogleGenAI } from '@google/genai';

async function main() {
    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable must be set');
    }

    const ai = new GoogleGenAI({ apiKey });
    const tools = [
        {
            googleSearch: {}
        },
    ];
    const config = {
        tools,
    };
    const model = 'gemini-2.5-flash';
    const contents = `INSERT_INPUT_HERE`;

    const response = await ai.models.generateContentStream({
        model,
        contents,
        config,
    });

    for await (const chunk of response) {
        console.log(chunk.text);
    }
}

main();
