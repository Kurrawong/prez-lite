#!/usr/bin/env bash
# Pull changes from prez-lite-template-default repo into packages/gh-templates/default/.
# Usage: ./scripts/sync-template-pull.sh [branch]
set -euo pipefail

BRANCH="${1:-main}"
PREFIX="packages/gh-templates/default"
REMOTE="template-default"

if ! git remote get-url "$REMOTE" &>/dev/null; then
  echo "Remote '$REMOTE' not found. Adding it..."
  git remote add "$REMOTE" git@github.com:hjohns/prez-lite-template-default.git
fi

echo "Pulling $REMOTE/$BRANCH -> $PREFIX"
git subtree pull --prefix "$PREFIX" "$REMOTE" "$BRANCH" --squash
