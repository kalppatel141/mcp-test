#!/bin/sh
# ─────────────────────────────────────────────────────────────
# Start both the MCP server (backend) and the Auth proxy (frontend)
# The MCP binary listens on port 3001 (internal only).
# The Express proxy listens on $PORT (Railway sets this automatically).
# ─────────────────────────────────────────────────────────────

set -e

echo "🔧 Starting MongoDB MCP Server on internal port 3001..."
mongodb-mcp-server \
  --transport http \
  --httpPort 3001 \
  --httpHost 127.0.0.1 &

MCP_PID=$!

# Give the MCP server a moment to start
sleep 2

# Verify MCP server is running
if ! kill -0 $MCP_PID 2>/dev/null; then
  echo "❌ MCP server failed to start"
  exit 1
fi

echo "✅ MCP server running (PID: $MCP_PID)"
echo "🔒 Starting Auth0 proxy on port ${PORT:-3000}..."

# Start the auth proxy in the foreground
# If it exits, the container stops (which is what we want)
node /app/src/proxy.js

# If the proxy exits, clean up the MCP server
kill $MCP_PID 2>/dev/null
