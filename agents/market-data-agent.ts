import { GoogleGenAI } from '@google/genai';

export interface MarketDataAgentConfig {
    apiKey: string;
    symbol: string;
}

const MARKET_DATA_SYSTEM_INSTRUCTION = `You are a Market Data Specialist agent in a multi-agent system (A2A protocol).

Your role: Analyze cryptocurrency price trends and create A2UI Chart components.

CRITICAL: You MUST respond ONLY in A2UI JSONL format with Chart components.

For crypto price analysis, generate a LINE CHART showing price trends.

EXACT FORMAT (DO NOT DEVIATE):
{"surfaceUpdate": {"components": [{"id": "market_title", "component": {"Text": {"text": {"literalString": "TITLE_HERE"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "price_chart", "component": {"Chart": {"type": "line", "data": {"labels": ["DATE1","DATE2","DATE3","DATE4","DATE5"], "datasets": [{"label": "Price (USD)", "data": [PRICE1,PRICE2,PRICE3,PRICE4,PRICE5], "borderColor": "#6366f1", "fill": false}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "market_root", "component": {"Column": {"children": {"explicitList": ["market_title","price_chart"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "market_root"}}

Use Google Search to find REAL current prices.`;

export async function executeMarketDataAgent(config: MarketDataAgentConfig): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });

    const agentConfig: any = {
        tools: [{ googleSearch: {} }],
        systemInstruction: MARKET_DATA_SYSTEM_INSTRUCTION,
    };

    const contents = [
        {
            role: 'user',
            parts: [
                {
                    text: `Search for current ${config.symbol} price data for the last 5 days and create a line chart in A2UI format. Use real data from Google Search.`,
                },
            ],
        },
    ];

    console.log(`[Market Data Agent] Processing ${config.symbol}...`);

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: agentConfig,
        contents,
    });

    const text = response.text || '';
    const lines = text.split('\n').filter(line => line.trim() && line.trim().startsWith('{'));

    console.log(`[Market Data Agent] Generated ${lines.length} A2UI messages`);

    return lines;
}
