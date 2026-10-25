#!/bin/sh
# Runs at container start (nginx:alpine executes /docker-entrypoint.d/*.sh). Writes env.js from environment variables
# so the same image works with or without the Phase 2 API. API_URL example: https://api.example.com
cat > /usr/share/nginx/html/env.js <<JS
window.KIDS_CONFIG = { apiUrl: "${API_URL:-}" };
JS
