#!/bin/sh
# Railway sets PORT automatically; fall back to 3000 locally
exec node /app/dist/index.js \
  --transport http \
  --httpPort "${PORT:-3000}" \
  --httpHost 0.0.0.0
