import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = 'AIzaSyDcRawhXFj1aOG-pxyzoAQw17QknPqb-wU';

const A2UI_SYSTEM_INSTRUCTION = `You are an AI assistant that ALWAYS responds in A2UI v0.8 JSONL format with Chart components for data visualization.

IF USER ASKS FOR PIE CHART → YOU MUST SEND THESE 5 LINES EXACTLY:
Line 1: {"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "TITLE_HERE"}, "usageHint": "H2"}}}]}}
Line 2: {"surfaceUpdate": {"components": [{"id": "pie_chart", "component": {"Chart": {"type": "pie", "data": {"labels": ["L1","L2","L3","L4"], "datasets": [{"data": [30,25,20,25], "backgroundColor": ["#6366f1","#8b5cf6","#10b981","#f59e0b"]}]}}}}]}}
Line 3: {"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title","pie_chart"]}}}}]}}
Line 4: {"dataModelUpdate": {"contents": {}}}
Line 5: {"beginRendering": {"root": "root"}}`;

const fewShotPrompt = `EXAMPLE REQUEST: "Show me a pie chart"
CORRECT RESPONSE:
{"surfaceUpdate": {"components": [{"id": "title", "component": {"Text": {"text": {"literalString": "Data Distribution"}, "usageHint": "H2"}}}]}}
{"surfaceUpdate": {"components": [{"id": "chart1", "component": {"Chart": {"type": "pie", "data": {"labels": ["A","B","C","D"], "datasets": [{"data": [30,25,20,25], "backgroundColor": ["#6366f1","#8b5cf6","#10b981","#f59e0b"]}]}}}}]}}
{"surfaceUpdate": {"components": [{"id": "root", "component": {"Column": {"children": {"explicitList": ["title","chart1"]}}}}]}}
{"dataModelUpdate": {"contents": {}}}
{"beginRendering": {"root": "root"}}

NOW YOUR REQUEST: "show me a pie chart of market share: Apple 30%, Samsung 25%, Google 20%, Others 25%"
YOUR RESPONSE (FOLLOW SAME FORMAT):`;

async function testPieChart() {
    console.log('='.repeat(80));
    console.log('Testing Pie Chart Generation with Few-Shot Prompting');
    console.log('='.repeat(80));

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    try {
        const model = 'gemini-2.0-flash-exp';
        const config = {
            systemInstruction: A2UI_SYSTEM_INSTRUCTION,
        };

        console.log('\n📤 SENDING TO GEMINI:');
        console.log('-'.repeat(80));
        console.log(`Model: ${model}`);
        console.log(`System Instruction Length: ${A2UI_SYSTEM_INSTRUCTION.length} chars`);
        console.log('\nPrompt:');
        console.log(fewShotPrompt);
        console.log('-'.repeat(80));

        const response = await ai.models.generateContent({
            model,
            contents: fewShotPrompt,
            config,
        });

        const text = response.text || '';

        console.log('\n📥 RECEIVED FROM GEMINI:');
        console.log('-'.repeat(80));
        console.log(text);
        console.log('-'.repeat(80));

        // Try to parse each line
        console.log('\n🔍 PARSING LINES:');
        const lines = text.split('\n');
        let hasChartComponent = false;
        let chartDetails = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && (line.startsWith('{') || line.startsWith('['))) {
                try {
                    const parsed = JSON.parse(line);
                    console.log(`\nLine ${i + 1}: ✅ Valid JSON`);
                    console.log(`  Keys: ${Object.keys(parsed).join(', ')}`);

                    if (parsed.surfaceUpdate?.components?.[0]?.component?.Chart) {
                        console.log(`  🎯 CHART COMPONENT FOUND!`);
                        chartDetails = parsed.surfaceUpdate.components[0].component.Chart;
                        console.log(`     Type: ${chartDetails.type}`);
                        console.log(`     Labels: ${chartDetails.data?.labels?.join(', ')}`);
                        console.log(`     Data: ${chartDetails.data?.datasets?.[0]?.data?.join(', ')}`);
                        hasChartComponent = true;
                    } else if (parsed.surfaceUpdate?.components?.[0]?.id) {
                        console.log(`     Component ID: ${parsed.surfaceUpdate.components[0].id}`);
                    }
                } catch (e) {
                    console.log(`\nLine ${i + 1}: ❌ Invalid JSON`);
                    console.log(`   ${line.substring(0, 60)}...`);
                }
            }
        }

        console.log('\n' + '='.repeat(80));
        if (hasChartComponent) {
            console.log('✅ SUCCESS: Chart component was generated!');
        } else {
            console.log('❌ FAILURE: Chart component was NOT generated!');
            console.log('This means Gemini is ignoring the instructions and examples.');
        }
        console.log('='.repeat(80));

    } catch (error: any) {
        console.error('\n❌ ERROR calling Gemini API:');
        console.error(error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
    }
}

testPieChart();
