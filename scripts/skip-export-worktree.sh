#!/usr/bin/env bash
# Mark all tracked files under web/public/export/ as skip-worktree so local
# changes are not committed. The folder stays in the repo and is updated by
# the Process Data GitHub Action; run this after clone (and after pull if you
# want to keep ignoring local export changes).
set -e
cd "$(git rev-parse --show-toplevel)"
count=0
while IFS= read -r path; do
  git update-index --skip-worktree "$path"
  count=$((count + 1))
done < <(git ls-files web/public/export/)
echo "Set skip-worktree for $count file(s) under web/public/export/"
