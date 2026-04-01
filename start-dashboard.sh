#!/bin/bash
set -e

echo "=== Starting Hermes Dashboard (localhost only) ==="

cd /opt/hermes-dashboard/.next/standalone

while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  export "$key=$value"
done < .env.local

# IMPORTANT: localhost only - no open ports to internet
export HOSTNAME=127.0.0.1
export PORT=3000
export NODE_ENV=production

echo "Dashboard binding to 127.0.0.1:3000 (SSH tunnel required for external access)"
echo "Access via: ssh -L 3000:localhost:3000 user@server"
exec node server.js
