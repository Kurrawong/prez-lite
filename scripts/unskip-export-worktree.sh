#!/usr/bin/env bash
# Clear skip-worktree for all tracked files under web/public/export/ so you can
# commit or pull updates (e.g. from the Process Data GitHub Action).
set -e
cd "$(git rev-parse --show-toplevel)"
count=0
while IFS= read -r path; do
  git update-index --no-skip-worktree "$path"
  count=$((count + 1))
done < <(git ls-files web/public/export/)
echo "Cleared skip-worktree for $count file(s) under web/public/export/"
