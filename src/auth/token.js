// ─────────────────────────────────────────────────────────────
// Auth0 JWT Validation Middleware
// Uses express-oauth2-jwt-bearer to validate access tokens
// against your Auth0 tenant's JWKS endpoint automatically.
// ─────────────────────────────────────────────────────────────

const { auth } = require('express-oauth2-jwt-bearer');

// Required env vars — fail fast if missing
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('❌ Missing required env vars: AUTH0_DOMAIN, AUTH0_AUDIENCE');
  process.exit(1);
}

// Handle trailing slash variations automatically so we don't get mismatch errors
const audiences = [
  AUTH0_AUDIENCE,
  AUTH0_AUDIENCE.endsWith('/') ? AUTH0_AUDIENCE.slice(0, -1) : `${AUTH0_AUDIENCE}/`
];
/**
 * Express middleware that validates the Authorization: Bearer <token> header.
 * - Fetches JWKS from Auth0 automatically
 * - Validates issuer, audience, expiry, and signature
 * - On success: populates req.auth with decoded token payload
 * - On failure: returns 401 Unauthorized
 */
const checkJwt = auth({
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  audience: audiences,
});

/**
 * Extract user info from a validated JWT (available after checkJwt runs).
 * @param {import('express').Request} req
 * @returns {{ sub: string, email?: string, scope?: string }}
 */
function getUserInfo(req) {
  if (!req.auth || !req.auth.payload) return null;
  const { sub, email, scope } = req.auth.payload;
  return { sub, email, scope };
}

module.exports = { checkJwt, getUserInfo, AUTH0_DOMAIN, AUTH0_AUDIENCE };
