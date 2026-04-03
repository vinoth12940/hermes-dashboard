#!/bin/bash
set -e

echo "=== Starting Hermes Dashboard (Cloudflare Tunnel) ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STANDALONE="$SCRIPT_DIR/.next/standalone"

# 1. Bind dashboard to localhost only (no open ports)
cd "$STANDALONE"

if [ -f .env.local ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    export "$key=$value"
  done < .env.local
fi

export HOSTNAME=127.0.0.1
export PORT=3000
export NODE_ENV=production

echo "Dashboard binding to 127.0.0.1:3000"

# 2. Start Cloudflare Tunnel if configured
CF_DOMAIN="${DASHBOARD_DOMAIN:-}"
if [ -n "$CF_DOMAIN" ] && [ -n "$CF_TUNNEL_NAME" ]; then
  if ! pgrep -f "cloudflared tunnel run" > /dev/null 2>&1; then
    nohup cloudflared tunnel run "$CF_TUNNEL_NAME" > ~/cloudflared.log 2>&1 &
    echo "Cloudflare Tunnel started (PID: $!)"
  else
    echo "Cloudflare Tunnel already running"
  fi
  echo ""
  echo "=== Access ==="
  echo "URL: https://$CF_DOMAIN"
  echo "Security: Zero open ports to internet"
fi

echo ""

exec node server.js
