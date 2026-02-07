#!/bin/bash
# Test script for iterating on install issues
set -e

cd "$(dirname "$0")/.."

echo "🧹 Cleaning..."
rm -rf node_modules .nuxt .data

echo "📦 Installing..."
pnpm install

echo "✅ Done!"
