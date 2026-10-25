# Phase 2 API. node:alpine is multi-arch (amd64 + arm64). bcryptjs/pg are pure JavaScript: no native build step.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY migrations ./migrations
COPY src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "src/index.js"]
