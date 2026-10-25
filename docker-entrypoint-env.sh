#!/bin/sh
# Runs at container start (nginx:alpine executes /docker-entrypoint.d/*.sh before nginx starts).
# 1. Writes env.js from API_URL so the same image works with or without the Phase 2 API.
#    API_URL example: https://api.example.com
# 2. Puts the API's origin into the Content-Security-Policy (connect-src), so the browser lets the
#    page call that API and no other server.
# Quotes, backslashes, spaces and angle brackets are stripped so the value can never break out of the JS string.
SAFE_API_URL=$(printf '%s' "${API_URL:-}" | tr -d '"\\<>\n\r ')
# scheme://host[:port] only; anything that does not look like an http(s) URL is ignored (guest mode)
API_ORIGIN=$(printf '%s' "$SAFE_API_URL" | sed -nE 's#^(https?://[A-Za-z0-9.-]+(:[0-9]+)?).*$#\1#p')
HEADERS=/etc/nginx/security-headers.conf

if [ -n "$API_ORIGIN" ]; then
  sed -i "s#__API_ORIGIN__#${API_ORIGIN}#" "$HEADERS"
  echo "40-env.sh: API_URL=${SAFE_API_URL} (connect-src allows ${API_ORIGIN})"
else
  [ -n "$SAFE_API_URL" ] && echo "40-env.sh: WARNING API_URL '${SAFE_API_URL}' is not a valid http(s) URL, ignored"
  SAFE_API_URL=""
  sed -i "s# __API_ORIGIN__##" "$HEADERS"
  echo "40-env.sh: no API_URL, guest mode only"
fi

cat > /usr/share/nginx/html/env.js <<JS
window.KIDS_CONFIG = { apiUrl: "${SAFE_API_URL}" };
JS
