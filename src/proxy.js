// ─────────────────────────────────────────────────────────────
// Auth0-Secured Reverse Proxy for MongoDB MCP Server
//
// Sits in front of the mongodb-mcp-server binary and:
//  1. Serves MCP Protected Resource Metadata (RFC 9728)
//  2. Returns 401 + WWW-Authenticate for unauthenticated requests
//  3. Validates Auth0 JWTs on authenticated requests
//  4. Proxies valid requests to the MCP binary (localhost:3001)
// ─────────────────────────────────────────────────────────────

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { checkJwt, AUTH0_DOMAIN, AUTH0_AUDIENCE } = require('./auth/token.js');

const app = express();
const PORT = process.env.PORT || 3000;
const MCP_BACKEND = process.env.MCP_BACKEND_URL || 'http://127.0.0.1:3001';

// The public URL of this server (used in metadata responses)
const PUBLIC_URL = process.env.PUBLIC_URL || AUTH0_AUDIENCE;

// ─── Health check (unauthenticated) ─────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', auth: 'auth0', timestamp: new Date().toISOString() });
});

// ─── MCP Protected Resource Metadata (RFC 9728) ────────────
// Claude (and other MCP clients) fetches this to discover
// which authorization server to use for the OAuth flow.
app.get('/.well-known/oauth-protected-resource', (_req, res) => {
  res.json({
    resource: PUBLIC_URL,
    authorization_servers: [`https://${AUTH0_DOMAIN}/`],
    scopes_supported: ['openid', 'profile', 'email'],
    bearer_methods_supported: ['header'],
  });
});

// ─── Proxy middleware (reusable) ────────────────────────────
const mcpProxy = createProxyMiddleware({
  target: MCP_BACKEND,
  changeOrigin: true,
  // Stream SSE responses properly
  onProxyRes(proxyRes) {
    // Ensure SSE headers pass through
    if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
      proxyRes.headers['cache-control'] = 'no-cache';
      proxyRes.headers['connection'] = 'keep-alive';
    }
  },
  // Log proxy errors but don't crash
  on: {
    error(err, _req, res) {
      console.error('⚠️  Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'mcp_backend_unavailable',
          message: 'The MCP server is not ready yet. Try again in a few seconds.',
        });
      }
    },
  },
});

// ─── MCP endpoint: require Auth0 JWT ────────────────────────
// Handle all methods on /mcp (POST for tool calls, GET for SSE, DELETE for session cleanup)
app.all('/mcp', (req, res, next) => {
  // Check if an Authorization header is present
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token → return 401 with WWW-Authenticate pointing to our metadata
    // This is what triggers the OAuth flow in Claude and other MCP clients
    const resourceMetadataUrl = `${PUBLIC_URL}/.well-known/oauth-protected-resource`;
    res.set('WWW-Authenticate', `Bearer resource_metadata="${resourceMetadataUrl}"`);
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required. Use OAuth2 to obtain an access token.',
    });
  }

  // Token present → validate it with Auth0
  checkJwt(req, res, (err) => {
    if (err) {
      // Token invalid/expired
      console.error('🔒 JWT validation failed:', err.message);
      return res.status(401).json({
        error: 'invalid_token',
        message: 'The access token is invalid or expired.',
      });
    }

    // Token valid → proxy to MCP backend
    console.log(`✅ Authenticated request: ${req.method} /mcp | sub=${req.auth?.payload?.sub}`);
    mcpProxy(req, res, next);
  });
});

// ─── Catch-all for unknown routes ───────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Use /mcp for MCP requests' });
});

// ─── Start ──────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Auth proxy listening on port ${PORT}`);
  console.log(`🔗 MCP backend: ${MCP_BACKEND}`);
  console.log(`🔒 Auth0 domain: ${AUTH0_DOMAIN}`);
  console.log(`📋 Auth0 audience: ${AUTH0_AUDIENCE}`);
});
