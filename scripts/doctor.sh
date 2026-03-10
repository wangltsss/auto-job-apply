#!/usr/bin/env bash
set -euo pipefail

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

status_ok=true
issues=()

check_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    status_ok=false
    issues+=("missing_command:$cmd")
  fi
}

check_cmd node
check_cmd npm
check_cmd npx

if [ "$status_ok" = true ]; then
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
  if [ "$NODE_MAJOR" -lt 20 ]; then
    status_ok=false
    issues+=("node_version_too_low:$(node -v)")
  fi
fi

if [ ! -d node_modules ]; then
  status_ok=false
  issues+=("missing_node_modules")
fi

if [ ! -f package-lock.json ]; then
  status_ok=false
  issues+=("missing_package_lock")
fi

if ! node -e "import fs from 'node:fs'; import { chromium } from 'playwright'; const p = chromium.executablePath(); if (!fs.existsSync(p)) process.exit(1);" >/dev/null 2>&1; then
  status_ok=false
  issues+=("playwright_chromium_missing")
fi

if ! command -v openclaw >/dev/null 2>&1; then
  issues+=("openclaw_not_found_optional")
fi

for dir in artifacts/forms artifacts/answer-plans artifacts/execution-results artifacts/pipeline-runs; do
  mkdir -p "$dir"
done

if [ "$status_ok" = true ]; then
  printf '{"ok":true,"node":"%s","npm":"%s","issues":[]}\n' "$(json_escape "$(node -v)")" "$(json_escape "$(npm -v)")"
  exit 0
fi

printf '{"ok":false,"node":"%s","npm":"%s","issues":[' "$(json_escape "$(node -v 2>/dev/null || echo unknown)")" "$(json_escape "$(npm -v 2>/dev/null || echo unknown)")"
for i in "${!issues[@]}"; do
  if [ "$i" -gt 0 ]; then
    printf ','
  fi
  printf '"%s"' "$(json_escape "${issues[$i]}")"
done
printf ']}\n'
exit 1
