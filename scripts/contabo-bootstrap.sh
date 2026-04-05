#!/usr/bin/env bash
set -euo pipefail

# ElderX Contabo VPS bootstrap script
# Usage:
#   sudo bash contabo-bootstrap.sh
# Optional env overrides:
#   REPO_URL=https://github.com/KachiAlex/elderx.git
#   BRANCH=master
#   DEPLOY_METHOD=docker   # docker|node|auto
#   APP_DIR=/opt/elderx
#   API_PORT=5000
#   DOMAIN_OR_IP=207.180.246.9
#   DB_NAME=elderxdb
#   DB_USER=elderxuser
#   DB_PASSWORD=<set-if-you-want-fixed-password>

REPO_URL="${REPO_URL:-https://github.com/KachiAlex/elderx.git}"
BRANCH="${BRANCH:-master}"
DEPLOY_METHOD="${DEPLOY_METHOD:-auto}"
APP_DIR="${APP_DIR:-/opt/elderx}"
API_PORT="${API_PORT:-5000}"
DOMAIN_OR_IP="${DOMAIN_OR_IP:-207.180.246.9}"
DB_NAME="${DB_NAME:-elderxdb}"
DB_USER="${DB_USER:-elderxuser}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

log() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*"; }

log "Updating OS packages..."
apt update
DEBIAN_FRONTEND=noninteractive apt upgrade -y

log "Installing core packages..."
DEBIAN_FRONTEND=noninteractive apt install -y \
  git curl ufw fail2ban nginx certbot python3-certbot-nginx \
  docker.io postgresql postgresql-contrib ca-certificates gnupg lsb-release

log "Enabling services..."
systemctl enable --now docker
systemctl enable --now fail2ban
systemctl enable --now nginx
systemctl enable --now postgresql

log "Installing docker-compose binary..."
if [[ ! -x /usr/local/bin/docker-compose ]]; then
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

log "Installing Node.js 18..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  DEBIAN_FRONTEND=noninteractive apt install -y nodejs build-essential
fi

log "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

if [[ -z "${DB_PASSWORD}" ]]; then
  DB_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"
fi

log "Creating PostgreSQL database and user..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

log "Cloning/updating repository..."
mkdir -p /opt
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch --all
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only
else
  rm -rf "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

# Attempt to place server env file in common backend locations
log "Writing environment file templates..."
ENV_TARGET=""
if [[ -d "${APP_DIR}/backend" ]]; then
  ENV_TARGET="${APP_DIR}/backend/.env"
elif [[ -f "${APP_DIR}/server.js" ]]; then
  ENV_TARGET="${APP_DIR}/.env"
fi

if [[ -n "${ENV_TARGET}" ]]; then
  cat > "${ENV_TARGET}" <<EOF
NODE_ENV=production
PORT=${API_PORT}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=$(openssl rand -hex 32)
EOF
  chmod 600 "${ENV_TARGET}"
  log "Wrote ${ENV_TARGET}"
else
  warn "Could not detect backend env file target automatically."
fi

# Create a deployment summary with sensitive values
cat > /root/elderx-deploy-secrets.txt <<EOF
ElderX deployment secrets
Generated: $(date -u)

DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
API_PORT=${API_PORT}
DOMAIN_OR_IP=${DOMAIN_OR_IP}
APP_DIR=${APP_DIR}
REPO_URL=${REPO_URL}
BRANCH=${BRANCH}
EOF
chmod 600 /root/elderx-deploy-secrets.txt

# Build/start app
if [[ "${DEPLOY_METHOD}" == "auto" ]]; then
  if [[ -f "${APP_DIR}/docker-compose.yml" ]]; then
    DEPLOY_METHOD="docker"
  else
    DEPLOY_METHOD="node"
  fi
fi

if [[ "${DEPLOY_METHOD}" == "docker" ]]; then
  log "Starting with Docker Compose..."
  /usr/local/bin/docker-compose up -d --build
elif [[ "${DEPLOY_METHOD}" == "node" ]]; then
  log "Starting with Node.js + PM2..."
  npm install --omit=dev || npm install
  npm install -g pm2

  if npm run | grep -q " build"; then
    npm run build || true
  fi

  if [[ -f "${APP_DIR}/server.js" ]]; then
    pm2 start "${APP_DIR}/server.js" --name elderx || pm2 restart elderx
  elif [[ -f "${APP_DIR}/index.js" ]]; then
    pm2 start "${APP_DIR}/index.js" --name elderx || pm2 restart elderx
  else
    warn "Could not find server.js or index.js in ${APP_DIR}. Start command may need customization."
  fi

  pm2 save
  pm2 startup systemd -u root --hp /root >/tmp/pm2-startup.txt 2>&1 || true
fi

log "Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/elderx <<EOF
server {
    listen 80;
    server_name ${DOMAIN_OR_IP};

    root ${APP_DIR}/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    access_log /var/log/nginx/elderx.access.log;
    error_log /var/log/nginx/elderx.error.log;
}
EOF

ln -sf /etc/nginx/sites-available/elderx /etc/nginx/sites-enabled/elderx
nginx -t
systemctl reload nginx

log "Deployment complete. Quick checks:"
echo "- Docker containers: sudo docker ps"
echo "- Compose logs: sudo /usr/local/bin/docker-compose logs --tail=200"
echo "- PM2 status: pm2 status"
echo "- Nginx status: sudo systemctl status nginx --no-pager"
echo "- Postgres DB list: sudo -u postgres psql -c '\\l'"
echo "- Secrets file: /root/elderx-deploy-secrets.txt"

if [[ "${DOMAIN_OR_IP}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  warn "You used an IP as DOMAIN_OR_IP, skipping SSL setup. Configure domain DNS first, then run:"
  echo "sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
fi
