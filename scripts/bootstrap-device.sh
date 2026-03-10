#!/usr/bin/env bash
set -euo pipefail

WITH_DEPS=false
for arg in "$@"; do
  case "$arg" in
    --with-deps) WITH_DEPS=true ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: bash scripts/bootstrap-device.sh [--with-deps]" >&2
      exit 1
      ;;
  esac
done

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

require_cmd node
require_cmd npm
require_cmd npx

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js >= 20 is required. Found: $(node -v)" >&2
  exit 1
fi

echo "[1/4] Installing npm dependencies"
npm ci

echo "[2/4] Installing Playwright browser binaries"
if [ "$WITH_DEPS" = true ]; then
  npx playwright install --with-deps chromium
else
  npx playwright install chromium
fi

echo "[3/4] Creating runtime directories"
mkdir -p \
  artifacts/forms \
  artifacts/answer-plans \
  artifacts/execution-results \
  artifacts/pipeline-runs \
  artifacts/screenshots \
  artifacts/traces \
  artifacts/runtime \
  state

echo "[4/4] Verifying toolchain"
npm run typecheck

cat <<'EOF'
Bootstrap complete.

Next checks:
  npm run doctor

Useful commands:
  npm run tool:scrape -- --url "<job_url>"
  npm run tool:pipeline -- --url "<job_url>" --mode full --dry-run --mock-response examples/fixtures/valid-openclaw-response.json
EOF
