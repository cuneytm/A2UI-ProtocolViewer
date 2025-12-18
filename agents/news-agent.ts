import { GoogleGenAI } from '@google/genai';

export interface NewsAgentConfig {
    apiKey: string;
    topic: string;
}

const NEWS_AGENT_SYSTEM_INSTRUCTION = `You are a News Analyst agent in a multi-agent system (A2A protocol).

Your role: Search for latest news and create A2UI Card components.

CRITICAL: You MUST respond ONLY in A2UI JSONL format with Card components.

For news articles, create a COLUMN of CARD components, one for each article.

EXACT FORMAT (DO NOT DEVIATE):
{"surfaceUpdate": {"components": [{"id": "news_title", "component": {"Text": {"text": {"literalString": "Latest News"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "card1", "component": {"Card": {"child": "card1_text"}}}]}}
{"surfaceUpdate": {"components": [{"id": "card1_text", "component": {"Text": {"text": {"literalString": "📰 HEADLINE\\n\\nSUMMARY_HERE"}}}}]}}
{"surfaceUpdate": {"components": [{"id": "card2", "component": {"Card": {"child": "card2_text"}}}]}}
{"surfaceUpdate": {"components": [{"id": "card2_text", "component": {"Text": {"text": {"literalString": "📰 HEADLINE\\n\\nSUMMARY_HERE"}}}}]}}
{"surfaceUpdate": {"components": [{"id": "news_root", "component": {"Column": {"children": {"explicitList": ["news_title","card1","card2"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "news_root"}}

Use Google Search to find REAL current news articles.`;

export async function executeNewsAgent(config: NewsAgentConfig): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });

    const agentConfig: any = {
        tools: [{ googleSearch: {} }],
        systemInstruction: NEWS_AGENT_SYSTEM_INSTRUCTION,
    };

    const contents = [
        {
            role: 'user',
            parts: [
                {
                    text: `Search for the top 3 latest news articles about ${config.topic} and create Card components in A2UI format. Use real news from Google Search.`,
                },
            ],
        },
    ];

    console.log(`[News Agent] Processing ${config.topic}...`);

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: agentConfig,
        contents,
    });

    const text = response.text || '';
    const lines = text.split('\n').filter(line => line.trim() && line.trim().startsWith('{'));

    console.log(`[News Agent] Generated ${lines.length} A2UI messages`);

    return lines;
}
