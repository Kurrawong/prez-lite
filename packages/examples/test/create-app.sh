#!/usr/bin/env bash
# Create a test app from a template + raw example data.
#
# Usage:
#   ./create-app.sh <app-name> [template-name]
#
# Examples:
#   ./create-app.sh gswa            # uses "default" template
#   ./create-app.sh suncorp default
#
# What it does:
#   1. Copies the template into test/<app-name>/
#   2. Removes the template's data/ and public/export/ (we don't want template data)
#   3. Copies everything from raw/<app-name>/ into the test app (data, styles, content, etc.)
#   4. Installs dependencies and processes vocabularies
#   5. Starts the dev server
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXAMPLES_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$EXAMPLES_DIR/../gh-templates"

APP_NAME="${1:?Usage: $0 <app-name> [template-name]}"
TEMPLATE="${2:-default}"

RAW_DIR="$EXAMPLES_DIR/raw/$APP_NAME"
TEMPLATE_DIR="$TEMPLATES_DIR/$TEMPLATE"
APP_DIR="$SCRIPT_DIR/$APP_NAME"

# Validate inputs
if [ ! -d "$RAW_DIR" ]; then
  echo "Error: raw example '$APP_NAME' not found at $RAW_DIR"
  echo "Available examples:"
  ls "$EXAMPLES_DIR/raw/"
  exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: template '$TEMPLATE' not found at $TEMPLATE_DIR"
  echo "Available templates:"
  ls "$TEMPLATES_DIR/"
  exit 1
fi

# Clean previous test app if it exists
if [ -d "$APP_DIR" ]; then
  echo "Removing previous test app at $APP_DIR"
  rm -rf "$APP_DIR"
fi

# Step 1: Copy template
echo "Copying template '$TEMPLATE' -> test/$APP_NAME/"
cp -R "$TEMPLATE_DIR" "$APP_DIR"

# Step 2: Remove template-specific data, keep generic config/manifest
# Raw example overlays on top — anything it provides wins
rm -rf "$APP_DIR/data/vocabs" "$APP_DIR/data/background" "$APP_DIR/public/export"

# Also remove template-specific artifacts that shouldn't carry over
rm -rf "$APP_DIR/node_modules" "$APP_DIR/.nuxt" "$APP_DIR/.data" "$APP_DIR/.output" "$APP_DIR/.prez-lite-cache"

# Step 3: Copy raw example data (data, styles, content, validators — everything)
echo "Copying raw example data from $APP_NAME/"
cp -R "$RAW_DIR"/* "$APP_DIR/"

# Step 4: Install and process
echo ""
echo "Installing dependencies..."
cd "$APP_DIR"
pnpm install --ignore-scripts

echo ""
echo "Processing vocabularies..."
pnpm process

# Step 5: Start dev server
echo ""
echo "Starting dev server..."
pnpm dev
