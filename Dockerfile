# ---- build stage: assemble the static site (no server code, no docs) and stamp the cache version ----
FROM node:22-alpine AS build
WORKDIR /src
COPY . .
RUN node tools/build-site.mjs dist

# ---- runtime stage: nginx on alpine (multi-arch: amd64 + arm64) ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY docker-entrypoint-env.sh /docker-entrypoint.d/40-env.sh
RUN chmod +x /docker-entrypoint.d/40-env.sh
COPY --from=build /src/dist/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
