#!/usr/bin/env sh
set -u

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT" || exit 1

fail=0
NODE_BIN=${NODE_BIN:-}
PYTHON_BIN=${PYTHON_BIN:-}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    fail=1
  fi
}

find_executable() {
  name=$1
  fallback=$2

  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi

  if [ -n "$fallback" ] && [ -x "$fallback" ]; then
    printf '%s\n' "$fallback"
    return 0
  fi

  return 1
}

run() {
  printf '\n==> %s\n' "$*"
  if ! "$@"; then
    fail=1
  fi
}

run_quiet_json_check() {
  file=$1
  printf '\n==> %s -m json.tool %s\n' "$PYTHON_BIN" "$file"
  if ! "$PYTHON_BIN" -m json.tool "$file" >/dev/null; then
    fail=1
  fi
}

printf 'NZ 2026 Policy Tracker setup verification\n'
printf 'Repository: %s\n' "$ROOT"

require_command git

if [ -z "$NODE_BIN" ]; then
  NODE_BIN=$(find_executable node "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node") || {
    printf 'Missing required command: node\n' >&2
    fail=1
  }
fi

if [ -z "$PYTHON_BIN" ]; then
  PYTHON_BIN=$(find_executable python3 "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3") || {
    printf 'Missing required command: python3\n' >&2
    fail=1
  }
fi

if [ "$fail" -ne 0 ]; then
  exit "$fail"
fi

run "$NODE_BIN" --check app.js
run_quiet_json_check data/policies.json
run_quiet_json_check data/source-watch.json
run git diff --check
run git diff --cached --check

printf '\n==> data integrity check\n'
if ! "$NODE_BIN" - <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("data/policies.json", "utf8"));
const topics = new Set(data.topics || []);
const parties = new Set((data.parties || []).map((party) => party.id));
const allowedStatuses = new Set(data.statuses || []);
const errors = [];

for (const policy of data.policies || []) {
  if (!parties.has(policy.partyId)) errors.push(`${policy.id}: unknown partyId ${policy.partyId}`);
  if (!topics.has(policy.topic)) errors.push(`${policy.id}: unknown topic ${policy.topic}`);
  if (!allowedStatuses.has(policy.status)) errors.push(`${policy.id}: unknown status ${policy.status}`);
  if (!policy.officialSource || !policy.officialSource.url) errors.push(`${policy.id}: missing officialSource.url`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`${data.policies.length} policies across ${data.topics.length} topics look structurally valid.`);
NODE
then
  fail=1
fi

printf '\n==> git status --short\n'
git status --short

printf '\nLocal preview:\n'
printf '  ./scripts/serve_local.sh 8000\n'
printf '  http://127.0.0.1:8000/\n'

if [ "$fail" -eq 0 ]; then
  printf '\nSetup verification passed.\n'
else
  printf '\nSetup verification failed.\n' >&2
fi

exit "$fail"
