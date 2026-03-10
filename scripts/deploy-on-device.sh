#!/usr/bin/env bash
set -euo pipefail

REPO_URL=""
TARGET_DIR="$HOME/auto-apply"
BRANCH="main"
WITH_DEPS=false

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)
      REPO_URL="${2:-}"
      shift 2
      ;;
    --dir)
      TARGET_DIR="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    --with-deps)
      WITH_DEPS=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: bash scripts/deploy-on-device.sh --repo <git_url> [--dir <path>] [--branch <branch>] [--with-deps]" >&2
      exit 1
      ;;
  esac
done

if [ -z "$REPO_URL" ]; then
  echo "Missing required --repo <git_url>" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Missing required command: git" >&2
  exit 1
fi

if [ -d "$TARGET_DIR/.git" ]; then
  echo "Updating existing checkout at $TARGET_DIR"
  git -C "$TARGET_DIR" fetch origin "$BRANCH"
  git -C "$TARGET_DIR" checkout "$BRANCH"
  git -C "$TARGET_DIR" pull --ff-only origin "$BRANCH"
else
  echo "Cloning $REPO_URL into $TARGET_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"
fi

cd "$TARGET_DIR"

if [ "$WITH_DEPS" = true ]; then
  bash scripts/bootstrap-device.sh --with-deps
else
  bash scripts/bootstrap-device.sh
fi

echo "Deployment complete at $TARGET_DIR"
