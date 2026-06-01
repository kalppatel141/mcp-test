# ─────────────────────────────────────────────────────────────
# Official MongoDB MCP Server — Railway Deployment
# Fixes "Invalid command line argument '-c'" error
# ─────────────────────────────────────────────────────────────
FROM mongodb/mongodb-mcp-server:latest

USER root

# Write a startup script — avoids passing "sh -c" as MCP args
COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV MDB_MCP_READ_ONLY=false
ENV MDB_MCP_TELEMETRY=disabled
# MDB_MCP_CONNECTION_STRING must be set in Railway Variables tab

EXPOSE 3000

# Clear the original entrypoint (which is the node MCP binary)
# and use our shell wrapper instead
ENTRYPOINT ["/bin/sh", "/start.sh"]
