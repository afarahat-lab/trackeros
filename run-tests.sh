#!/bin/sh
# Run TypeScript type checking and unit tests
# Requires Node.js and npm to be installed.
# Run this script with: sh run-tests.sh
if ! command -v node > /dev/null 2>&1; then
    echo "node not found. Please install Node.js."
    exit 1
fi
if ! command -v npm > /dev/null 2>&1; then
    echo "npm not found. Please install Node.js and npm."
    exit 1
fi
# Use npm exec as a fallback if npx is not available
if command -v npx > /dev/null 2>&1; then
    npx tsc --noEmit && npx jest tests/unit/shared/ --passWithNoTests
else
    echo "npx not found, using npm exec instead."
    npm exec -- tsc --noEmit && npm exec -- jest tests/unit/shared/ --passWithNoTests
fi
