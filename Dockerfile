# ─────────────────────────────────────────────────────────────
# MongoDB MCP Server + Auth0 Proxy — Railway Deployment
#
# Two processes run inside this container:
#   1. mongodb-mcp-server (internal, port 3001)
#   2. Express auth proxy  (public, port $PORT)
# ─────────────────────────────────────────────────────────────
FROM node:20-slim

# Install the official MongoDB MCP Server globally
RUN npm install -g mongodb-mcp-server@latest

# Set up the auth proxy app
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# Copy source files
COPY src/ ./src/
COPY start-with-auth.sh ./start-with-auth.sh
RUN chmod +x ./start-with-auth.sh

# MCP server defaults (overridable via Railway Variables)
ENV MDB_MCP_READ_ONLY=true
ENV MDB_MCP_TELEMETRY=disabled

EXPOSE 3000

# Start both processes via the shell script
CMD ["./start-with-auth.sh"]
