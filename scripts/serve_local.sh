#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PORT=${1:-8000}
PYTHON_BIN=${PYTHON_BIN:-}

if [ -z "$PYTHON_BIN" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN=$(command -v python3)
  elif [ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" ]; then
    PYTHON_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
  else
    printf 'Missing required command: python3\n' >&2
    exit 1
  fi
fi

cd "$ROOT"
printf 'Serving NZ 2026 Policy Tracker at http://127.0.0.1:%s/\n' "$PORT"
printf 'Press Ctrl-C to stop.\n'
"$PYTHON_BIN" -m http.server "$PORT"
