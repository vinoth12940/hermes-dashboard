#!/bin/bash
set -e

echo "=== Starting Hermes Dashboard + Caddy HTTPS ==="

# Start Caddy reverse proxy (HTTPS on port 8443)
if ! pgrep -f "caddy run" > /dev/null 2>&1; then
  nohup /opt/hermes run --config /opt/hermes > /opt/hermes 2>&1 &
  echo "Caddy started on port 8443 (PID: $!)"
  sleep 2
else
  echo "Caddy already running"
fi

# Start Next.js dashboard
cd /opt/hermes-dashboard/.next/standalone

while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  export "$key=$value"
done < .env.local

export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production

echo "Starting Next.js on port 3000..."
exec node server.js
