#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="auto-apply"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCLAW_HOME_DEFAULT="${OPENCLAW_HOME:-$HOME/.openclaw}"
SKILLS_DIR="$OPENCLAW_HOME_DEFAULT/skills"
WORKSPACE_DIR=""
LINK_MODE=true
FORCE=false

usage() {
  cat <<EOF
Usage: bash scripts/install-openclaw-skill.sh [--name <skill_name>] [--skills-dir <path> | --workspace-dir <path>] [--copy] [--force]

Installs this repository as an OpenClaw skill by placing it in the target skills directory.

Defaults:
  skill name: $SKILL_NAME
  skills dir: $SKILLS_DIR

Options:
  --name <skill_name>   Override the installed skill directory name.
  --skills-dir <path>   Override the OpenClaw skills directory.
  --workspace-dir <path>
                        Install into <workspace>/skills for a specific OpenClaw workspace.
  --copy                Copy the repository instead of creating a symlink.
  --force               Replace an existing installed skill at the target path.
  --help                Show this help text.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --name)
      SKILL_NAME="${2:-}"
      shift 2
      ;;
    --skills-dir)
      SKILLS_DIR="${2:-}"
      shift 2
      ;;
    --workspace-dir)
      WORKSPACE_DIR="${2:-}"
      shift 2
      ;;
    --copy)
      LINK_MODE=false
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ -n "$WORKSPACE_DIR" ]; then
  SKILLS_DIR="$WORKSPACE_DIR/skills"
fi

if [ -z "$SKILL_NAME" ]; then
  echo "Skill name must not be empty" >&2
  exit 1
fi

if [ ! -f "$REPO_DIR/SKILL.md" ]; then
  echo "Missing $REPO_DIR/SKILL.md" >&2
  exit 1
fi

TARGET_PATH="$SKILLS_DIR/$SKILL_NAME"

mkdir -p "$SKILLS_DIR"

if [ -e "$TARGET_PATH" ] || [ -L "$TARGET_PATH" ]; then
  if [ "$FORCE" = false ]; then
    echo "Target already exists: $TARGET_PATH" >&2
    echo "Re-run with --force to replace it." >&2
    exit 1
  fi

  rm -rf "$TARGET_PATH"
fi

if [ "$LINK_MODE" = true ]; then
  ln -s "$REPO_DIR" "$TARGET_PATH"
  INSTALL_MODE="symlink"
else
  cp -R "$REPO_DIR" "$TARGET_PATH"
  INSTALL_MODE="copy"
fi

cat <<EOF
OpenClaw skill install complete.

Repository: $REPO_DIR
Installed as: $TARGET_PATH
Mode: $INSTALL_MODE

Next checks:
  ls "$TARGET_PATH"
  cat "$TARGET_PATH/SKILL.md"
  npm run tool:skill -- describe
EOF
