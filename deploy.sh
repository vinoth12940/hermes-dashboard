#!/bin/bash
# Post-build deployment script for Hermes Dashboard standalone
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STANDALONE="$SCRIPT_DIR/.next/standalone"

echo "=== Deploying standalone build ==="

# Copy static assets (CSS, JS, images)
echo "Copying static assets..."
cp -r "$SCRIPT_DIR/.next/static" "$STANDALONE/.next/static"

# Copy public dir
echo "Copying public dir..."
cp -r "$SCRIPT_DIR/public" "$STANDALONE/public"

# Copy .env.local if exists
if [ -f "$SCRIPT_DIR/.env.local" ]; then
  echo "Copying .env.local..."
  cp "$SCRIPT_DIR/.env.local" "$STANDALONE/.env.local"
else
  echo "⚠️  No .env.local found in project root"
fi

# Create auth.json from .env.local (fixes bcrypt $ mangling by dotenv)
if [ -f "$STANDALONE/.env.local" ]; then
  echo "Creating auth.json..."
  node -e "
const fs = require('fs');
const lines = fs.readFileSync('$STANDALONE/.env.local', 'utf8').split('\n').filter(x => x && !x.startsWith('#'));
const env = Object.fromEntries(lines.map(x => { const i = x.indexOf('='); return [x.slice(0,i).trim(), x.slice(i+1).trim()] }));
fs.writeFileSync('$STANDALONE/auth.json', JSON.stringify({
  username: env.AUTH_USERNAME || 'admin',
  passwordHash: env.AUTH_PASSWORD_HASH || '',
  jwtSecret: env.JWT_SECRET || 'fallback-secret-change-me'
}, null, 2));
console.log('  username: ' + (env.AUTH_USERNAME || 'admin'));
console.log('  hash length: ' + (env.AUTH_PASSWORD_HASH || '').length);
"
fi

# Verify
echo ""
echo "=== Verification ==="
for f in "server.js" ".next/static" "public"; do
  if [ -e "$STANDALONE/$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ $f MISSING"
    exit 1
  fi
done

[ -f "$STANDALONE/auth.json" ] && echo "  ✅ auth.json" || echo "  ⚠️  auth.json (create manually or set AUTH_* env vars)"
[ -f "$STANDALONE/.env.local" ] && echo "  ✅ .env.local" || echo "  ⚠️  .env.local"

CSS_COUNT=$(find "$STANDALONE/.next/static/chunks" -name "*.css" 2>/dev/null | wc -l)
echo "  ✅ CSS files: $CSS_COUNT"

echo ""
echo "=== Deployment complete ==="
echo "Start with: cd $STANDALONE && nohup node server.js > /tmp/dashboard.log 2>&1 &"
