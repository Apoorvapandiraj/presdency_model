# ── Build stage: build BOTH workspaces (server tsc → client vite) ──────────────
FROM node:22-alpine AS build
WORKDIR /app
# Copy manifest files first so the workspace dependency graph is cached.
COPY package.json package-lock.json* ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime stage: production deps only; serve client/dist/public ─────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
EXPOSE 8787
USER node
CMD ["node", "server/dist/server.js"]