# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# UniChat Web: React SPA build + Nginx gateway (build context = repo root).
# -----------------------------------------------------------------------------
FROM node:24.18.0-alpine AS builder
WORKDIR /workspace

# Root lockfile drives the npm workspace; mobile manifest keeps it consistent.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY mobile/package.json ./mobile/
RUN npm ci --workspace=frontend --include-workspace-root --no-audit --no-fund

COPY frontend/ ./frontend/

# Empty = same-origin requests through the Nginx gateway below.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build --workspace=frontend

# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

RUN rm -rf /etc/nginx/conf.d/*
COPY infra/proxy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
