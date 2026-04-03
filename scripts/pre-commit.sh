#!/bin/bash
# Pre-commit hook: blocks commits containing sensitive information
# Install: bash scripts/install-hooks.sh
# Bypass (not recommended): git commit --no-verify

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|sh|md|json|yaml|yml|env|py|txt|cfg|ini|toml|conf)$' | grep -v 'scripts/pre-commit')
if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

echo "🔍 Scanning staged files for sensitive information..."

FAILED=0

# Patterns to block (regex) — only checked against non-hook files
PATTERNS=(
    # Personal info
    'REDACTED_EMAIL_PREFIX'
    'example\.uk'
    'REDACTED_TUNNEL_ID'
    '37\.27\.190\.184'
    'REDACTED_CHAT_ID'
    # Hardcoded paths
    '/opt/hermes
    # API keys/tokens
    'sk-[a-zA-Z0-9]{20,}'
    'ghp_[a-zA-Z0-9]{30,}'
    'gho_[a-zA-Z0-9]{30,}'
    'ghs_[a-zA-Z0-9]{30,}'
    'xox[bp]-[a-zA-Z0-9-]{10,}'
    '[0-9]{8,10}:[a-zA-Z0-9_-]{30,}'
    # Real bcrypt hashes (not placeholder with ...)
    '\$2b\$\d+\$[A-Za-z0-9./]{20,}'
    # Known passwords
    'REDACTED_PASSWORD'
)

for FILE in $STAGED_FILES; do
    if [ ! -f "$FILE" ]; then
        continue
    fi
    
    for PATTERN in "${PATTERNS[@]}"; do
        MATCHES=$(grep -nE "$PATTERN" "$FILE" 2>/dev/null || true)
        if [ -n "$MATCHES" ]; then
            echo ""
            echo "❌ BLOCKED: $FILE contains sensitive pattern '$PATTERN'"
            echo "$MATCHES" | head -3 | while read -r line; do
                echo "   $line"
            done
            FAILED=1
        fi
    done
done

if [ $FAILED -ne 0 ]; then
    echo ""
    echo "⛔ Commit blocked — remove sensitive information before committing."
    echo "   To bypass (not recommended): git commit --no-verify"
    exit 1
fi

echo "✅ No sensitive information found."
exit 0
