# Multi-stage build for the CareMaster web frontend.
# Stage 1 builds the React app; stage 2 serves it with Nginx and proxies
# /api to the `api` service (see docker-compose.yml).

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps

COPY . .

# REACT_APP_* vars are inlined at build time. The compose build passes
# REACT_APP_API_URL=/api so the frontend calls the same origin and the
# built-in Nginx proxy forwards it to the backend container.
ARG REACT_APP_API_URL=/api
ARG REACT_APP_API_BASE_URL=/api
ARG REACT_APP_ENVIRONMENT=production
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL \
    REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT

RUN npm run build

# Stage 2: Production image with Nginx
FROM nginx:alpine

# Web config: static hosting + SPA fallback + /api proxy to the `api` service.
# Production deployments mount docker/web.prod.conf over this file to add TLS.
COPY docker/web.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
