#!/bin/bash

# Simple test runner script that ensures environment variables are passed
# Usage: ./run-test.sh [test_number]

# Check if API key is set
if [ -z "$GEMINI_API_KEY" ] && [ -z "$GOOGLE_API_KEY" ]; then
    echo "Error: Neither GEMINI_API_KEY nor GOOGLE_API_KEY environment variable is set!"
    echo "Please run: export GEMINI_API_KEY=\"your-api-key-here\""
    exit 1
fi

# Run the test
if [ -n "$1" ]; then
    # Run specific test
    npx tsx test-gemini.ts "$1"
else
    # Run all tests
    npx tsx test-gemini.ts
fi
