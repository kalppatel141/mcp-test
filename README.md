# MongoDB MCP Server — Railway Deployment

Deploy the **official MongoDB MCP Server** on Railway and connect it to **claude.ai** as a custom connector.

---

## How It Works

```
claude.ai  ──HTTPS──▶  Railway (auto HTTPS domain)
                            │
                       Docker Container
                       mongodb/mongodb-mcp-server
                       (HTTP transport, port auto)
                            │
                       MongoDB Atlas / Self-Hosted
```

Railway provides automatic HTTPS — no Nginx, no SSL certificates to manage.

---

## Prerequisites

- [Railway account](https://railway.app) (free tier works)
- [GitHub account](https://github.com) (to push this repo)
- MongoDB Atlas cluster **or** self-hosted MongoDB with a connection string
- Claude **Pro, Max, Team, or Enterprise** plan (required for custom connectors)

---

## Step 1 — Push This Repo to GitHub

```bash
git init
git add .
git commit -m "feat: MongoDB MCP Server for Railway"
git remote add origin https://github.com/YOUR_USERNAME/mongodb-mcp-railway.git
git push -u origin main
```

---

## Step 2 — Deploy on Railway

1. Go to [railway.app](https://railway.app) → **New Project**
2. Click **Deploy from GitHub repo** → select your repo
3. Railway detects the `Dockerfile` automatically and starts building

---

## Step 3 — Set Environment Variables

In your Railway project → **Variables** tab, add:

| Variable | Value | Required |
|---|---|---|
| `MDB_MCP_CONNECTION_STRING` | `mongodb+srv://user:pass@cluster.mongodb.net/db` | ✅ Yes |
| `MDB_MCP_READ_ONLY` | `false` (or `true` for read-only) | Recommended |
| `MDB_MCP_TELEMETRY` | `disabled` | Recommended |

> **Never** put the connection string in code or the Dockerfile — Railway env vars are encrypted at rest.

---

## Step 4 — Get Your Public URL

1. In Railway → **Settings** → **Networking** → click **Generate Domain**
2. You'll get something like: `https://mongodb-mcp-xxxx.railway.app`
3. Your MCP endpoint is: `https://mongodb-mcp-xxxx.railway.app/mcp`

---

## Step 5 — Test the Endpoint

```bash
curl -X POST https://mongodb-mcp-xxxx.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0" }
    }
  }'
```

Expected response contains `"serverInfo"` with `"name": "MCP Server"` — that confirms it's live. ✅

---

## Step 6 — Connect to claude.ai

1. Open **claude.ai** → click your profile → **Settings**
2. Go to **Connectors** → **Add custom connector**
3. Enter your URL: `https://mongodb-mcp-xxxx.railway.app/mcp`
4. Click **Save** and **enable** the connector

---

## Step 7 — Test in Claude Chat

Try these prompts in any claude.ai conversation:

```
List all databases in my MongoDB
Show me the collections in the users database
Find 5 documents from the orders collection
What is the schema of the products collection?
How many documents are in the sessions collection?
```

---

## Local Testing with Docker

```bash
# Copy env file
cp .env.example .env
# Edit .env and add your real connection string

# Build and run locally
docker build -t mongodb-mcp .
docker run --rm -p 3000:3000 --env-file .env mongodb-mcp

# Test it
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

---

## Security Notes

- ✅ `MDB_MCP_READ_ONLY=true` — prevents Claude from modifying your data
- ✅ Use a **dedicated MongoDB user** with minimum permissions (e.g., `readAnyDatabase` role)
- ✅ Use **MongoDB Atlas IP Access List** — whitelist Railway's IPs or use `0.0.0.0/0` temporarily
- ✅ Never commit `.env` to Git (already in `.gitignore`)
- ✅ To disable write tools specifically: set `MDB_MCP_DISABLED_TOOLS=create,update,delete`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Container crashes on start | Check that `MDB_MCP_CONNECTION_STRING` is set in Railway Variables |
| `curl` returns connection refused | Wait 30s after deploy; check Railway logs |
| Claude connector says "unreachable" | Ensure the domain is generated in Railway Networking settings |
| Atlas refuses connection | Add `0.0.0.0/0` to Atlas → Network Access → IP Access List |
