#!/usr/bin/env bash
# Push packages/gh-templates/default/ to the prez-lite-template-default repo via git subtree.
# Usage: ./scripts/sync-template-push.sh [branch]
set -euo pipefail

BRANCH="${1:-main}"
PREFIX="packages/gh-templates/default"
REMOTE="template-default"

if ! git remote get-url "$REMOTE" &>/dev/null; then
  echo "Remote '$REMOTE' not found. Adding it..."
  git remote add "$REMOTE" git@github.com:Kurrawong/prez-lite-template-default.git
fi

echo "Pushing $PREFIX -> $REMOTE/$BRANCH"
git subtree push --prefix "$PREFIX" "$REMOTE" "$BRANCH"
