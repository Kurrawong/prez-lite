#!/bin/bash
#
# Fetch background labels for prez-lite vocabularies
#
# This script:
# 1. Uses prezmanifest to find IRIs missing labels
# 2. Fetches labels from configured sources
# 3. Stores them in data/background/
#
# Usage: ./scripts/fetch-labels.sh [--refresh]
#   --refresh: Re-fetch labels even if cached files exist

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$ROOT_DIR/data"
BACKGROUND_DIR="$DATA_DIR/background"
MANIFEST="$DATA_DIR/manifest.ttl"

# Label sources - add more as needed
# These are TTL files that contain rdfs:label or skos:prefLabel for external IRIs
declare -a LABEL_SOURCES=(
    # GSWA background labels (if available in resources)
    "$ROOT_DIR/resources/gswa-vocabularies/background/labels.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/alteration.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/alterationtype.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/BoreholePurpose.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/BoreholePurposeValue.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/BoreholeStatus.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/boreholedrillingmethod.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/borehole-status-gsq.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/depth-reference.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/geofeatures.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/GeologySampleType.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/LithologyValue.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/simplelithology.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/agents.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/data-roles.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/reg-statuses.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/qaqc.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/sample-location-status.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/timescale.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/anzsrc-2020-for-20210429.ttl"
    "$ROOT_DIR/resources/gswa-vocabularies/background/earth-science-data-category.ttl"
)

REFRESH=false
if [[ "$1" == "--refresh" ]]; then
    REFRESH=true
    echo "🔄 Refresh mode: will re-fetch all labels"
fi

echo "📦 prez-lite label fetcher"
echo ""

# Check if manifest exists
if [[ ! -f "$MANIFEST" ]]; then
    echo "❌ Manifest not found at $MANIFEST"
    exit 1
fi

# Create background directory if needed
mkdir -p "$BACKGROUND_DIR"

# Step 1: Find missing IRIs using prezmanifest
echo "🔍 Finding missing labels..."
cd "$DATA_DIR"

MISSING_IRIS=$(uvx --from prezmanifest pm label iris manifest.ttl 2>/dev/null || true)
MISSING_COUNT=$(echo "$MISSING_IRIS" | grep -c "^http" || echo "0")

echo "   Found $MISSING_COUNT IRIs without labels"

if [[ "$MISSING_COUNT" -eq 0 ]]; then
    echo "✅ All IRIs have labels"
    exit 0
fi

# Step 2: Copy available label sources to background
echo ""
echo "📥 Copying label sources to background..."

COPIED=0
for SOURCE in "${LABEL_SOURCES[@]}"; do
    if [[ -f "$SOURCE" ]]; then
        FILENAME=$(basename "$SOURCE")
        DEST="$BACKGROUND_DIR/$FILENAME"

        if [[ "$REFRESH" == "true" ]] || [[ ! -f "$DEST" ]]; then
            cp "$SOURCE" "$DEST"
            echo "   ✓ $FILENAME"
            ((COPIED++)) || true
        fi
    fi
done

echo "   Copied $COPIED label files"

# Step 3: Check remaining missing IRIs
echo ""
echo "🔍 Checking remaining missing labels..."

REMAINING_IRIS=$(uvx --from prezmanifest pm label iris manifest.ttl 2>/dev/null || true)
REMAINING_COUNT=$(echo "$REMAINING_IRIS" | grep -c "^http" || echo "0")

echo "   $REMAINING_COUNT IRIs still missing labels"

if [[ "$REMAINING_COUNT" -gt 0 ]]; then
    # Group by domain
    echo ""
    echo "📊 Missing labels by domain:"
    echo "$REMAINING_IRIS" | grep "^http" | sed 's|https\?://\([^/]*\)/.*|\1|' | sort | uniq -c | sort -rn | head -10

    # Save missing IRIs for reference
    echo "$REMAINING_IRIS" | grep "^http" > "$BACKGROUND_DIR/missing-iris.txt"
    echo ""
    echo "   Full list saved to data/background/missing-iris.txt"
fi

echo ""
echo "✅ Done!"
echo ""
echo "Now run: node scripts/build-data.js"
