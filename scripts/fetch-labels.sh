#!/bin/bash
#
# Fetch background labels for prez-lite vocabularies using prezmanifest
#
# This script:
# 1. Uses prezmanifest to find IRIs missing labels
# 2. Fetches labels from a SPARQL endpoint (the authoritative source)
# 3. Stores them in web/public/data/background/
#
# Usage: ./scripts/fetch-labels.sh [--endpoint URL]
#   --endpoint URL: SPARQL endpoint to fetch labels from (default: http://demo.dev.kurrawong.ai/sparql)
#
# Requirements:
#   - Python with uvx installed
#   - Network access to the SPARQL endpoint

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$ROOT_DIR/web/public/data"
BACKGROUND_DIR="$DATA_DIR/background"
MANIFEST="$DATA_DIR/manifest.ttl"

# Default SPARQL endpoint (Kurrawong's demo endpoint with semantic background data)
SPARQL_ENDPOINT="http://demo.dev.kurrawong.ai/sparql"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --endpoint)
            SPARQL_ENDPOINT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--endpoint URL]"
            echo ""
            echo "Fetch background labels for vocabularies using prezmanifest."
            echo ""
            echo "Options:"
            echo "  --endpoint URL   SPARQL endpoint to fetch labels from"
            echo "                   (default: http://demo.dev.kurrawong.ai/sparql)"
            exit 0
            ;;
        --)
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate SPARQL endpoint URL to prevent command injection
if [[ ! "$SPARQL_ENDPOINT" =~ ^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/[^[:space:]]*)?$ ]]; then
    echo "❌ Error: Invalid SPARQL endpoint URL format"
    echo "   Expected: http(s)://domain:port/path"
    echo "   Received: $SPARQL_ENDPOINT"
    exit 1
fi

# Check for suspicious characters that could indicate command injection
if [[ "$SPARQL_ENDPOINT" =~ [\;\|\&\`\$\(\)] ]]; then
    echo "❌ Error: Suspicious characters detected in endpoint URL"
    echo "   URL contains characters that are not allowed for security reasons"
    exit 1
fi

echo "🏷️  prez-lite label fetcher (using prezmanifest)"
echo ""
echo "Manifest: $MANIFEST"
echo "Endpoint: $SPARQL_ENDPOINT"
echo ""

# Check if manifest exists
if [[ ! -f "$MANIFEST" ]]; then
    echo "❌ Manifest not found at $MANIFEST"
    echo ""
    echo "Create a manifest.ttl file that describes your vocabulary resources."
    echo "See: https://kurrawong.github.io/prezmanifest/"
    exit 1
fi

# Create background directory if needed
mkdir -p "$BACKGROUND_DIR"

# Step 1: Find missing IRIs
echo "🔍 Finding IRIs without labels..."
cd "$DATA_DIR"

MISSING_IRIS=$(uvx --from prezmanifest pm label iris manifest.ttl 2>/dev/null || true)
MISSING_COUNT=$(echo "$MISSING_IRIS" | grep -c "^http" || true)

echo "   Found $MISSING_COUNT IRIs without labels"

if [[ "$MISSING_COUNT" -eq 0 ]]; then
    echo ""
    echo "✅ All IRIs have labels"
    exit 0
fi

# Show domains of missing IRIs
echo ""
echo "📊 Missing labels by domain:"
echo "$MISSING_IRIS" | grep "^http" | sed 's|https\?://\([^/]*\)/.*|\1|' | sort | uniq -c | sort -rn | head -10

# Step 2: Fetch labels from SPARQL endpoint
echo ""
echo "📥 Fetching labels from $SPARQL_ENDPOINT..."

OUTPUT_FILE="$BACKGROUND_DIR/fetched-labels.ttl"

if uvx --from prezmanifest pm label rdf manifest.ttl "$SPARQL_ENDPOINT" > "$OUTPUT_FILE" 2>/dev/null; then
    LABEL_COUNT=$(grep -c "rdfs:label\|skos:prefLabel" "$OUTPUT_FILE" 2>/dev/null || echo "0")
    echo "   ✓ Fetched $LABEL_COUNT labels to fetched-labels.ttl"
else
    echo "   ⚠️  Could not fetch labels from endpoint (might be offline or CORS blocked)"
    rm -f "$OUTPUT_FILE"
fi

# Step 3: Check remaining missing IRIs
echo ""
echo "🔍 Checking remaining missing labels..."

REMAINING_IRIS=$(uvx --from prezmanifest pm label iris manifest.ttl 2>/dev/null || true)
REMAINING_COUNT=$(echo "$REMAINING_IRIS" | grep -c "^http" || true)

if [[ "$REMAINING_COUNT" -gt 0 ]]; then
    echo "   $REMAINING_COUNT IRIs still missing labels"
    echo ""
    echo "   These may need manual addition or a different label source."
    echo "$REMAINING_IRIS" | grep "^http" > "$BACKGROUND_DIR/missing-iris.txt"
    echo "   Full list saved to background/missing-iris.txt"
else
    echo "   ✅ All IRIs now have labels"
fi

echo ""
echo "✅ Done!"
echo ""
echo "Next steps:"
echo "  1. Review fetched-labels.ttl for correctness"
echo "  2. Run: pnpm build:labels"
echo "  3. Run: pnpm build:all-export"
