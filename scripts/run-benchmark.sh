#!/bin/bash

# Memory Benchmark Runner Script

echo "🔧 Compiling TypeScript..."
npx tsc scripts/benchmark-memory.ts --outDir dist/scripts --esModuleInterop --resolveJsonModule --skipLibCheck --module commonjs --target es2020

if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo "✅ Compilation successful"
echo ""
echo "🚀 Starting benchmark..."
echo ""

node dist/scripts/benchmark-memory.js

echo ""
echo "✅ Benchmark complete"