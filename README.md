# MongoDB MCP Server — Railway Deployment (Auth0 Secured)

Deploy the **official MongoDB MCP Server** on Railway with **Auth0 authentication** and connect it to **claude.ai** as a custom connector.

---

## How It Works

```
claude.ai  ──HTTPS + OAuth2──▶  Railway (auto HTTPS domain)
                                      │
                               Express Auth Proxy (port $PORT)
                                 ├─ /.well-known/oauth-protected-resource
                                 ├─ 401 challenge → triggers OAuth flow
                                 └─ validates JWT → proxies to MCP
                                      │
                               mongodb-mcp-server (port 3001, internal)
                                      │
                               MongoDB Atlas / Self-Hosted
```

1. Claude discovers the Auth0 authorization server via the `.well-known` endpoint
2. User authenticates through Auth0's login page
3. Claude receives an access token and sends it with every MCP request
4. The Express proxy validates the JWT and forwards to the MCP binary

---

## Prerequisites

- [Railway account](https://railway.app) (free tier works)
- [GitHub account](https://github.com) (to push this repo)
- [Auth0 account](https://auth0.com) (free tier works)
- MongoDB Atlas cluster **or** self-hosted MongoDB with a connection string
- Claude **Pro, Max, Team, or Enterprise** plan (required for custom connectors)

---

## Step 1 — Set Up Auth0

### 1a. Create an API

1. Go to [Auth0 Dashboard](https://manage.auth0.com) → **Applications** → **APIs**
2. Click **Create API**
3. Set:
   - **Name:** `MongoDB MCP Server`
   - **Identifier (Audience):** `https://your-app.up.railway.app` (your Railway URL)
   - **Signing Algorithm:** RS256
4. Click **Create**

### 1b. Create an Application

1. Go to **Applications** → **Applications** → **Create Application**
2. Choose **Regular Web Application** → **Create**
3. In the **Settings** tab:
   - Note the **Client ID** and **Client Secret**
   - **Allowed Callback URLs:** `https://claude.ai/oauth/callback`
   - **Allowed Logout URLs:** `https://claude.ai`
   - **Allowed Web Origins:** `https://claude.ai`
4. In the **Advanced Settings** → **Grant Types**, ensure these are enabled:
   - ✅ Authorization Code
   - ✅ Refresh Token
5. Click **Save Changes**

---

## Step 2 — Push This Repo to GitHub

```bash
git init
git add .
git commit -m "feat: MongoDB MCP Server with Auth0 auth"
git remote add origin https://github.com/YOUR_USERNAME/mongodb-mcp-railway.git
git push -u origin main
```

---

## Step 3 — Deploy on Railway

1. Go to [railway.app](https://railway.app) → **New Project**
2. Click **Deploy from GitHub repo** → select your repo
3. Railway detects the `Dockerfile` automatically and starts building

---

## Step 4 — Set Environment Variables

In your Railway project → **Variables** tab, add:

| Variable | Value | Required |
|---|---|---|
| `MDB_MCP_CONNECTION_STRING` | `mongodb+srv://user:pass@cluster.mongodb.net/db` | ✅ Yes |
| `AUTH0_DOMAIN` | `dev-xxxx.us.auth0.com` | ✅ Yes |
| `AUTH0_AUDIENCE` | `https://your-app.up.railway.app` | ✅ Yes |
| `AUTH0_CLIENT_ID` | Your Auth0 application Client ID | ✅ Yes |
| `AUTH0_CLIENT_SECRET` | Your Auth0 application Client Secret | ✅ Yes |
| `MDB_MCP_READ_ONLY` | `true` (recommended for safety) | Recommended |
| `MDB_MCP_TELEMETRY` | `disabled` | Recommended |

> **Never** put secrets in code or the Dockerfile — Railway env vars are encrypted at rest.

---

## Step 5 — Get Your Public URL

1. In Railway → **Settings** → **Networking** → click **Generate Domain**
2. You'll get something like: `https://mcp-test-production-xxxx.up.railway.app`
3. Your MCP endpoint is: `https://mcp-test-production-xxxx.up.railway.app/mcp`

> **Important:** Make sure the `AUTH0_AUDIENCE` env var matches this URL exactly.

---

## Step 6 — Test the Endpoint

```bash
# Test discovery endpoint (should return JSON with authorization_servers)
curl https://your-app.up.railway.app/.well-known/oauth-protected-resource

# Test auth challenge (should return 401 with WWW-Authenticate header)
curl -v https://your-app.up.railway.app/mcp

# Test health check
curl https://your-app.up.railway.app/health
```

---

## Step 7 — Connect to claude.ai

1. Open **claude.ai** → click your profile → **Settings**
2. Go to **Connectors** → **Add custom connector**
3. Enter your URL: `https://your-app.up.railway.app/mcp`
4. In **Advanced Settings**:
   - **Client ID:** Your Auth0 Client ID
   - **Client Secret:** Your Auth0 Client Secret
   - **Authorization URL:** `https://YOUR_AUTH0_DOMAIN/authorize`
   - **Token URL:** `https://YOUR_AUTH0_DOMAIN/oauth/token`
5. Click **Save** and **enable** the connector
6. You'll be redirected to Auth0's login page — authenticate to complete setup

---

## Step 8 — Test in Claude Chat

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
# Build and run locally
docker build -t mongodb-mcp-auth .
docker run --rm -p 3000:3000 --env-file .env mongodb-mcp-auth

# Test discovery
curl http://localhost:3000/.well-known/oauth-protected-resource

# Test auth challenge (should return 401)
curl -v http://localhost:3000/mcp

# Test health
curl http://localhost:3000/health
```

---

## Security Notes

- ✅ All MCP requests require a valid Auth0 JWT — no anonymous access
- ✅ `MDB_MCP_READ_ONLY=true` — prevents Claude from modifying your data
- ✅ Use a **dedicated MongoDB user** with minimum permissions (e.g., `readAnyDatabase` role)
- ✅ Use **MongoDB Atlas IP Access List** — whitelist Railway's IPs or use `0.0.0.0/0` temporarily
- ✅ Never commit `.env` to Git (already in `.gitignore`)
- ✅ To disable write tools specifically: set `MDB_MCP_DISABLED_TOOLS=create,update,delete`
- ✅ JWTs are validated against Auth0's JWKS endpoint (signature, issuer, audience, expiry)

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Container crashes on start | Check that `MDB_MCP_CONNECTION_STRING` is set in Railway Variables |
| Proxy starts but MCP backend unreachable | Check Railway logs — MCP binary may need more startup time |
| `curl /mcp` doesn't return 401 | Ensure `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` env vars are set |
| Claude OAuth flow fails | Verify `Allowed Callback URLs` in Auth0 includes `https://claude.ai/oauth/callback` |
| "invalid_token" after login | Ensure `AUTH0_AUDIENCE` matches the API identifier in Auth0 Dashboard |
| Atlas refuses connection | Add `0.0.0.0/0` to Atlas → Network Access → IP Access List |
