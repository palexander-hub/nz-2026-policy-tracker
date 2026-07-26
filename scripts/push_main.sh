#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
KEY=${NZ_POLICY_TRACKER_SSH_KEY:-}
REPO_KEY="$HOME/.ssh/nz_2026_policy_tracker_ed25519"
REMOTE=${1:-origin}
TARGET=${2:-HEAD:main}

cd "$ROOT"

if [ -n "$KEY" ] && [ ! -f "$KEY" ]; then
  printf 'SSH key not found: %s\n' "$KEY" >&2
  exit 1
fi

if [ -n "$KEY" ]; then
  GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" git push "$REMOTE" "$TARGET"
elif [ -f "$REPO_KEY" ]; then
  GIT_SSH_COMMAND="ssh -i $REPO_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" git push "$REMOTE" "$TARGET"
else
  git push "$REMOTE" "$TARGET"
fi
