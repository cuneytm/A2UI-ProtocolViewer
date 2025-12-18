// Test script for Gemini API with Google Search
import { executeGeminiSearch, executeGeminiSearchComplete } from './gemini-search-lib';

// ANSI color codes for better output
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

interface TestCase {
    name: string;
    input: string;
    description: string;
    streamOutput?: boolean;
}

// Define test cases
const testCases: TestCase[] = [
    {
        name: 'Current Events Search',
        input: 'What are the latest developments in AI technology this week?',
        description: 'Tests Google Search integration for recent information',
        streamOutput: true,
    },
    {
        name: 'Factual Query',
        input: 'What is the current population of Tokyo and what are the main attractions?',
        description: 'Tests factual information retrieval with Google Search',
        streamOutput: false,
    },
    {
        name: 'Complex Reasoning',
        input: 'Compare the advantages and disadvantages of electric vehicles vs hydrogen fuel cell vehicles for long-distance transportation',
        description: 'Tests complex reasoning with Google Search',
        streamOutput: true,
    },
    {
        name: 'Technical Query',
        input: 'Explain the differences between REST and GraphQL APIs with real-world examples',
        description: 'Tests technical knowledge retrieval',
        streamOutput: false,
    },
    {
        name: 'Multi-step Problem',
        input: 'If I want to start a small online business selling handmade crafts, what are the key steps I need to take and what are the estimated costs?',
        description: 'Tests multi-step reasoning and planning',
        streamOutput: true,
    },
];

// Utility functions
function printHeader(text: string) {
    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

function printTestInfo(testCase: TestCase, index: number, total: number) {
    console.log(`${colors.bright}${colors.blue}Test ${index + 1}/${total}: ${testCase.name}${colors.reset}`);
    console.log(`${colors.yellow}Description: ${testCase.description}${colors.reset}`);
    console.log(`${colors.magenta}Input: "${testCase.input}"${colors.reset}`);
    console.log(`${colors.cyan}Stream Mode: ${testCase.streamOutput ? 'ON' : 'OFF'}${colors.reset}\n`);
}

function printSuccess(message: string) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function printError(message: string) {
    console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function printResponse(text: string) {
    console.log(`${colors.bright}Response:${colors.reset}`);
    console.log(`${text}\n`);
}

// Main test execution
async function runTests() {
    printHeader('GEMINI API TEST SUITE - Google Search & Thinking Mode');

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        printError('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set!');
        console.log(`\n${colors.yellow}Please set your API key:${colors.reset}`);
        console.log(`export GEMINI_API_KEY="your-api-key-here"`);
        console.log(`or`);
        console.log(`export GOOGLE_API_KEY="your-api-key-here"\n`);
        process.exit(1);
    }

    printSuccess('API key detected');
    console.log(`${colors.cyan}Model: gemini-2.5-flash${colors.reset}`);
    console.log(`${colors.cyan}Features: Google Search Grounding${colors.reset}\n`);

    const results = {
        passed: 0,
        failed: 0,
        total: testCases.length,
    };

    // Allow running a specific test via command line
    const testFilter = process.argv[2];
    let testsToRun = testCases;

    if (testFilter) {
        const testIndex = parseInt(testFilter) - 1;
        if (!isNaN(testIndex) && testIndex >= 0 && testIndex < testCases.length) {
            testsToRun = [testCases[testIndex]];
            console.log(`${colors.yellow}Running only test #${testFilter}${colors.reset}\n`);
        } else {
            printError(`Invalid test number. Please use 1-${testCases.length}`);
            process.exit(1);
        }
    }

    // Run each test
    for (let i = 0; i < testsToRun.length; i++) {
        const testCase = testsToRun[i];
        const actualIndex = testCases.indexOf(testCase);

        printTestInfo(testCase, actualIndex, testCases.length);

        const startTime = Date.now();

        try {
            if (testCase.streamOutput) {
                // Stream output in real-time
                console.log(`${colors.bright}Streaming response...${colors.reset}\n`);
                let responseText = '';

                for await (const chunk of executeGeminiSearch(testCase.input)) {
                    if (chunk.text) {
                        process.stdout.write(chunk.text);
                        responseText += chunk.text;
                    }
                }

                console.log('\n');

                if (responseText.length > 0) {
                    printSuccess(`Test completed successfully (${responseText.length} chars)`);
                    results.passed++;
                } else {
                    printError('Test failed: Empty response');
                    results.failed++;
                }
            } else {
                // Get complete response
                console.log(`${colors.bright}Fetching complete response...${colors.reset}\n`);

                const response = await executeGeminiSearchComplete(testCase.input);

                if (response.length > 0) {
                    printResponse(response);
                    printSuccess(`Test completed successfully (${response.length} chars)`);
                    results.passed++;
                } else {
                    printError('Test failed: Empty response');
                    results.failed++;
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`${colors.cyan}Duration: ${duration}s${colors.reset}\n`);
        } catch (error) {
            printError(`Test failed with error: ${error instanceof Error ? error.message : String(error)}`);
            results.failed++;

            if (error instanceof Error && error.stack) {
                console.log(`${colors.red}${error.stack}${colors.reset}\n`);
            }
        }

        // Add separator between tests
        if (i < testsToRun.length - 1) {
            console.log(`${colors.cyan}${'-'.repeat(80)}${colors.reset}\n`);
        }
    }

    // Print summary
    printHeader('TEST SUMMARY');
    console.log(`${colors.bright}Total Tests: ${results.total}${colors.reset}`);
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);

    const successRate = ((results.passed / results.total) * 100).toFixed(1);
    console.log(`${colors.cyan}Success Rate: ${successRate}%${colors.reset}\n`);

    if (results.failed === 0) {
        printSuccess('All tests passed! 🎉');
    } else {
        printError(`${results.failed} test(s) failed`);
        process.exit(1);
    }
}

// Run tests
runTests().catch((error) => {
    printError(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
        console.log(error.stack);
    }
    process.exit(1);
});
