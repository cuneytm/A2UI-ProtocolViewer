// Test script for Gemini API with A2UI responses
import { executeGeminiA2UI, executeGeminiA2UIComplete, formatA2UIMessages, A2UIMessage } from './gemini-a2ui-lib';

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

// Define test cases for A2UI
const testCases: TestCase[] = [
    {
        name: 'Restaurant Card',
        input: 'Create a restaurant card UI for "Pizza Palace" located at "123 Main St" with a rating of 4.5 stars and price level of $$',
        description: 'Tests basic A2UI card generation',
        streamOutput: true,
    },
    {
        name: 'Product List',
        input: 'Create a product list UI showing 3 tech products: iPhone 15 Pro ($999), MacBook Air M3 ($1199), and AirPods Pro ($249)',
        description: 'Tests A2UI list rendering with multiple items',
        streamOutput: false,
    },
    {
        name: 'User Profile',
        input: 'Create a user profile UI for John Doe, software engineer at Tech Corp, with bio "Passionate about AI and web development", email john@example.com',
        description: 'Tests complex A2UI component composition',
        streamOutput: true,
    },
    {
        name: 'Weather Dashboard',
        input: 'Create a weather dashboard showing current temperature 72°F, condition Sunny, humidity 65%, wind 10 mph for San Francisco',
        description: 'Tests data-rich A2UI interface',
        streamOutput: false,
    },
    {
        name: 'Task List',
        input: 'Create a task list UI with tasks: "Review pull requests" (high priority), "Update documentation" (medium), "Team meeting at 3pm" (low)',
        description: 'Tests A2UI with different item states',
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

function printA2UIMessage(msg: A2UIMessage, index: number) {
    console.log(`${colors.cyan}[Message ${index + 1}]${colors.reset}`);

    if (msg.surfaceUpdate) {
        console.log(`${colors.yellow}  surfaceUpdate:${colors.reset}`);
        msg.surfaceUpdate.components?.forEach(comp => {
            const componentType = Object.keys(comp.component)[0];
            console.log(`    - ${comp.id}: ${componentType}`);
        });
    }

    if (msg.dataModelUpdate) {
        console.log(`${colors.yellow}  dataModelUpdate${colors.reset}`);
    }

    if (msg.beginRendering) {
        console.log(`${colors.green}  beginRendering: root="${msg.beginRendering.root}"${colors.reset}`);
    }

    if (msg.deleteSurface) {
        console.log(`${colors.red}  deleteSurface: id="${msg.deleteSurface.surfaceId}"${colors.reset}`);
    }
}

// Main test execution
async function runTests() {
    printHeader('GEMINI A2UI TEST SUITE');

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
    console.log(`${colors.cyan}Response Format: A2UI JSONL${colors.reset}\n`);

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
                console.log(`${colors.bright}Streaming A2UI messages...${colors.reset}\n`);
                const messages: A2UIMessage[] = [];

                for await (const message of executeGeminiA2UI(testCase.input)) {
                    messages.push(message);
                    printA2UIMessage(message, messages.length - 1);
                }

                console.log('\n');

                if (messages.length > 0) {
                    printSuccess(`Test completed successfully (${messages.length} A2UI messages)`);
                    results.passed++;
                } else {
                    printError('Test failed: No A2UI messages received');
                    results.failed++;
                }
            } else {
                // Get complete response
                console.log(`${colors.bright}Fetching complete A2UI response...${colors.reset}\n`);

                const messages = await executeGeminiA2UIComplete(testCase.input);

                if (messages.length > 0) {
                    console.log(formatA2UIMessages(messages));
                    printSuccess(`Test completed successfully (${messages.length} A2UI messages)`);
                    results.passed++;
                } else {
                    printError('Test failed: No A2UI messages received');
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
