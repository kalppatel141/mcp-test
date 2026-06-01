# ─────────────────────────────────────────────────────────────
# Official MongoDB MCP Server — Railway Deployment
# ENTRYPOINT is "mongodb-mcp-server" (global npm binary)
# We pass args directly — no shell wrapper needed
# ─────────────────────────────────────────────────────────────
FROM mongodb/mongodb-mcp-server:latest

# MDB_MCP_CONNECTION_STRING → set this in Railway Variables tab
ENV MDB_MCP_READ_ONLY=false
ENV MDB_MCP_TELEMETRY=disabled
ENV MDB_MCP_LOGGERS=stderr,mcp

EXPOSE 3000

# Pass --transport http args directly to the mongodb-mcp-server binary.
# Railway sets PORT automatically; we use a shell to expand the variable.
# We override ENTRYPOINT to use sh so we can expand ${PORT:-3000}.
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["mongodb-mcp-server --transport http --httpPort ${PORT:-3000} --httpHost 0.0.0.0"]
