#!/bin/bash
# Hermes Dashboard startup script
# Runs Next.js standalone server on port 3000
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
node standalone/server.js
