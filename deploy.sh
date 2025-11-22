#!/bin/bash

# Deployment script for self-hosted server
# Usage: ./deploy.sh [server-user] [server-ip] [deploy-path]

set -e

SERVER_USER=${1:-"root"}
SERVER_IP=${2:-"your-server-ip"}
DEPLOY_PATH=${3:-"/var/www/elderx"}

echo "🚀 Starting deployment to $SERVER_USER@$SERVER_IP:$DEPLOY_PATH"

# Build the application
echo "📦 Building application..."
npm run build

if [ ! -d "build" ]; then
    echo "❌ Build failed! No build directory found."
    exit 1
fi

# Create backup on server
echo "💾 Creating backup on server..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $DEPLOY_PATH/backups && cp -r $DEPLOY_PATH/build $DEPLOY_PATH/backups/build-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true"

# Copy files to server
echo "📤 Copying files to server..."
scp -r build/ $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/

# Restart service (adjust based on your setup)
echo "🔄 Restarting service..."
ssh $SERVER_USER@$SERVER_IP "sudo systemctl restart nginx || pm2 restart elderx || true"

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at http://$SERVER_IP"

