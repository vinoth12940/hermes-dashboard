#!/bin/bash
# Install git hooks for the Hermes Dashboard project
# Run once after cloning: bash scripts/install-hooks.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK_DIR="$(git rev-parse --git-dir)/hooks"

cp "$SCRIPT_DIR/pre-commit.sh" "$HOOK_DIR/pre-commit"
chmod +x "$HOOK_DIR/pre-commit"

echo "✅ Pre-commit hook installed!"
echo "   Commits will be scanned for sensitive information (passwords, API keys, paths, etc.)"
