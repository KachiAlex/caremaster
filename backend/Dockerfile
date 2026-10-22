# CareMaster backend API — production image
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production deps only. bcryptjs/pg are pure-JS so no build tools needed.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# App source (migrations + SQL assets are needed at runtime for migrate jobs)
COPY . .

# Winston writes to logs/ — ensure the dir exists and is writable by node
RUN mkdir -p logs && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health >/dev/null 2>&1 || exit 1

# Optional migration step on boot (idempotent knex migrations), then start.
# Set RUN_MIGRATIONS=true in the environment to enable.
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then npx knex migrate:latest --env production || exit 1; fi; exec node server.js"]
