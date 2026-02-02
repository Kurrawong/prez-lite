#!/usr/bin/env bash
set -euo pipefail

# Clone reference repositories into resources/ for local searching and reference
# These are NOT committed to the repo (see .gitignore)

RESOURCES_DIR="resources"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "📦 Cloning reference repositories into $RESOURCES_DIR/"
echo ""

# Create resources directory if it doesn't exist
mkdir -p "$RESOURCES_DIR"
cd "$RESOURCES_DIR"

# Function to clone or update a repo
clone_or_update() {
  local url=$1
  local name=$2
  local shallow=${3:-"--depth=1"}  # shallow by default
  
  if [ -d "$name/.git" ]; then
    echo "⟳ Updating $name..."
    cd "$name"
    git fetch origin
    git reset --hard origin/HEAD
    cd ..
  else
    echo "↓ Cloning $name..."
    if [ "$shallow" = "--depth=1" ]; then
      git clone --depth=1 "$url" "$name"
    else
      git clone "$url" "$name"
    fi
  fi
  echo ""
}

# Clone required repos
clone_or_update "https://github.com/Kurrawong/prezmanifest.git" "prezmanifest"
clone_or_update "https://github.com/RDFLib/prez-ui.git" "prez-ui"
clone_or_update "https://github.com/RDFLib/prez.git" "prez"
clone_or_update "https://github.com/AGLDWG/vocpub-profile.git" "vocpub-profile"

# Example vocab repo (useful reference)
clone_or_update "https://github.com/Kurrawong/gswa-vocabularies" "gswa-vocabularies"

# Optional: oxigraph (very large; comment out if not needed)
# Uncomment next line if you want to search the oxigraph codebase
# clone_or_update "https://github.com/oxigraph/oxigraph.git" "oxigraph" "--depth=1"

cd "$ROOT_DIR"

echo "✓ Done! Reference repos are in $RESOURCES_DIR/"
echo "  Use Cursor's search to explore them."
echo ""
echo "Note: These repos are .gitignored and won't be committed."
