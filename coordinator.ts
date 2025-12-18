import { executeMarketDataAgent } from './agents/market-data-agent';
import { executeNewsAgent } from './agents/news-agent';

export interface A2ACoordinatorConfig {
    apiKey: string;
    scenario: 'crypto_analysis' | 'stock_analysis';
    symbol: string;
}

/**
 * A2A Coordinator - Orchestrates multiple agents to build a comprehensive UI
 * 
 * This demonstrates Agent-to-Agent (A2A) protocol where:
 * 1. Coordinator receives user request
 * 2. Delegates tasks to specialized agents (A2A communication)
 * 3. Each agent generates A2UI components
 * 4. Coordinator combines A2UI messages into unified response
 */
export async function coordinateMultiAgentAnalysis(
    config: A2ACoordinatorConfig
): Promise<AsyncIterable<string>> {
    console.log('\n' + '='.repeat(80));
    console.log('🤖 A2A COORDINATOR ACTIVATED');
    console.log('='.repeat(80));
    console.log(`Scenario: ${config.scenario}`);
    console.log(`Symbol: ${config.symbol}`);
    console.log('Delegating to specialized agents...\n');

    async function* generateCombinedA2UI() {
        try {
            // 1. Create root layout (EARLY YIELD)
            const mainRoot = {
                surfaceUpdate: {
                    components: [{
                        id: 'main_root',
                        component: {
                            Column: {
                                children: {
                                    explicitList: ['header', 'market_root', 'divider', 'news_root']
                                }
                            }
                        }
                    }]
                }
            };
            yield JSON.stringify(mainRoot);

            // 2. Add header (EARLY YIELD)
            yield JSON.stringify({
                surfaceUpdate: {
                    components: [{
                        id: 'header',
                        component: {
                            Text: {
                                text: { literalString: `${config.symbol} Analysis Dashboard` },
                                usageHint: 'H1'
                            }
                        }
                    },
                    {
                        id: 'divider',
                        component: {
                            Text: {
                                text: { literalString: '─'.repeat(40) },
                                usageHint: 'Body'
                            }
                        }
                    },
                    // Skeleton placeholders to prevent renderer warnings
                    {
                        id: 'market_root',
                        component: { Column: { children: { explicitList: [] } } }
                    },
                    {
                        id: 'news_root',
                        component: { Column: { children: { explicitList: [] } } }
                    }]
                }
            });

            // 3. Early Status Events for Visualizer
            await new Promise(resolve => setTimeout(resolve, 800));
            yield JSON.stringify({ _meta: 'A2A_STATUS', status: 'COORDINATOR_ACTIVE' });

            // 4. Detailed Metadata for Debugging
            yield JSON.stringify({
                _meta: 'COORDINATOR_CONTEXT',
                context: {
                    symbol: config.symbol,
                    agents: ['Market Data Agent', 'News Agent'],
                    scenario: config.scenario,
                    protocol: 'A2A v0.8 (Alpha)'
                }
            });

            await new Promise(resolve => setTimeout(resolve, 500));
            yield JSON.stringify({ _meta: 'A2A_STATUS', status: 'DELEGATING_TO_AGENTS' });

            // 5. Initial Render (Show shell immediately)
            yield JSON.stringify({ beginRendering: { root: 'main_root' } });

            // Execute agents in parallel (A2A protocol)
            const [marketDataMessages, newsMessages] = await Promise.all([
                executeMarketDataAgent({
                    apiKey: config.apiKey,
                    symbol: config.symbol
                }),
                executeNewsAgent({
                    apiKey: config.apiKey,
                    topic: `${config.symbol} cryptocurrency`
                }),
            ]);

            console.log('\n✅ All agents completed');
            console.log(`  Market Data Agent: ${marketDataMessages.length} messages`);
            console.log(`  News Agent: ${newsMessages.length} messages\n`);

            // 5. Yield Market Data Agent's A2UI
            console.log('📊 Streaming Market Data components...');
            for (const message of marketDataMessages) {
                yield message;
            }

            // 6. Yield News Agent's A2UI
            console.log('📰 Streaming News components...');
            for (const message of newsMessages) {
                yield message;
            }

            // 7. Final messages (Trigger full re-render)
            yield JSON.stringify({ dataModelUpdate: { contents: {} } });
            yield JSON.stringify({ beginRendering: { root: 'main_root' } });

            console.log('✨ Multi-agent A2UI stream complete\n');
            console.log('='.repeat(80));

        } catch (error: any) {
            console.error('❌ Coordinator error:', error.message);

            // Yield error message as A2UI
            yield JSON.stringify({
                surfaceUpdate: {
                    components: [{
                        id: 'error_root',
                        component: {
                            Text: {
                                text: { literalString: `Error: ${error.message}` }
                            }
                        }
                    }]
                }
            });
            yield JSON.stringify({ beginRendering: { root: 'error_root' } });
        }
    }

    return generateCombinedA2UI();
}
