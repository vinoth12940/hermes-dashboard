#!/bin/bash
set -e
cd /opt/hermes-dashboard/.next/standalone

# Load env vars from .env.local
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  # Trim whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  export "$key=$value"
done < .env.local

export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_ENV=production

echo "Starting Hermes Dashboard..."
echo "AUTH_USERNAME=$AUTH_USERNAME"
echo "AUTH_PASSWORD_HASH=${AUTH_PASSWORD_HASH:0:10}..."

exec node server.js
