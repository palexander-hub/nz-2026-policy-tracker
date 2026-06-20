#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
KEY=${NZ_POLICY_TRACKER_SSH_KEY:-"$HOME/.ssh/nz_2026_policy_tracker_ed25519"}
REMOTE=${1:-origin}
TARGET=${2:-HEAD:main}

cd "$ROOT"

if [ ! -f "$KEY" ]; then
  printf 'SSH key not found: %s\n' "$KEY" >&2
  printf 'Set NZ_POLICY_TRACKER_SSH_KEY=/path/to/key or install the repo key at the default path.\n' >&2
  exit 1
fi

GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" git push "$REMOTE" "$TARGET"
