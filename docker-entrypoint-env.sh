#!/bin/sh
# Runs at container start (nginx:alpine executes /docker-entrypoint.d/*.sh). Writes env.js from environment variables
# so the same image works with or without the Phase 2 API. API_URL example: https://api.example.com
# Quotes, backslashes and angle brackets are stripped so the value can never break out of the JS string.
SAFE_API_URL=$(printf '%s' "${API_URL:-}" | tr -d '"\\<>\n\r')
cat > /usr/share/nginx/html/env.js <<JS
window.KIDS_CONFIG = { apiUrl: "${SAFE_API_URL}" };
JS
