# ─────────────────────────────────────────────────────────────
# Official MongoDB MCP Server — Railway Deployment
# Transport: Streamable HTTP (built-in, no wrapper needed)
# ─────────────────────────────────────────────────────────────
FROM mongodb/mongodb-mcp-server:latest

# Railway injects PORT automatically. The MCP server reads
# MDB_MCP_HTTP_PORT from env. We map both so it works locally
# (port 3000) and on Railway (whatever PORT Railway assigns).
ENV MDB_MCP_HTTP_HOST=0.0.0.0

# Required — set this in Railway's Variables tab, NOT here.
# ENV MDB_MCP_CONNECTION_STRING=<set in Railway>

# Optional but recommended for safety
ENV MDB_MCP_READ_ONLY=false
ENV MDB_MCP_TELEMETRY=disabled

EXPOSE 3000

# The official image entrypoint already starts the MCP binary.
# We override CMD to pass --transport http and let Railway's PORT
# env var control the port.
CMD ["sh", "-c", \
  "node /app/dist/index.js \
   --transport http \
   --httpPort ${PORT:-3000} \
   --httpHost 0.0.0.0"]
