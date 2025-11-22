# Migration Guide: Firebase to Self-Hosted Server

## Overview
This guide covers migrating the ElderX application from Firebase Hosting to a self-hosted server while maintaining Firebase backend services (Firestore, Functions, Auth).

## Migration Options

### Option 1: Full Self-Hosting (Complete Migration)
- **Frontend**: Self-hosted server
- **Database**: Migrate from Firestore to PostgreSQL/MySQL/MongoDB
- **Authentication**: Replace Firebase Auth with custom auth (JWT, OAuth)
- **Functions**: Replace Cloud Functions with Node.js/Express API
- **Storage**: Replace Firebase Storage with AWS S3 or local storage
- **Complexity**: ⭐⭐⭐⭐⭐ (Very High)
- **Time**: 2-4 weeks

### Option 2: Hybrid Approach (Recommended)
- **Frontend**: Self-hosted server
- **Backend Services**: Keep using Firebase (Firestore, Auth, Functions)
- **Complexity**: ⭐⭐ (Low-Medium)
- **Time**: 1-2 days
- **Best for**: Most clients who want control over hosting but keep Firebase benefits

### Option 3: Docker Container
- **Frontend**: Dockerized React app
- **Backend**: Keep Firebase or migrate to containerized services
- **Complexity**: ⭐⭐⭐ (Medium)
- **Time**: 2-3 days
- **Best for**: Clients with Docker infrastructure

## Recommended Approach: Hybrid (Option 2)

This keeps Firebase backend services while hosting the frontend on your server.

---

## Step-by-Step Migration Guide

### Prerequisites
- Server with Node.js 18+ installed
- Web server (Nginx or Apache)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

---

## Part 1: Prepare the Application

### 1.1 Update Firebase Configuration
The app already uses Firebase, but ensure configuration is environment-based:

**Create `.env.production` file:**
```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 1.2 Build for Production
```bash
npm run build
```
This creates a `build/` folder with static files ready for deployment.

---

## Part 2: Server Setup Options

### Option A: Node.js with Express (Simple)

#### 2.1 Install Dependencies
```bash
npm install express serve-static compression
```

#### 2.2 Create Server File (`server.js`)
```javascript
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable compression
app.use(compression());

// Serve static files from React app
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing - return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

#### 2.3 Update package.json
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "react-scripts build"
  }
}
```

#### 2.4 Deploy
```bash
# Copy build folder and server.js to server
scp -r build/ server.js package.json user@your-server:/var/www/elderx/

# On server
cd /var/www/elderx
npm install --production
npm start
```

---

### Option B: Nginx (Recommended for Production)

#### 2.1 Install Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

#### 2.2 Configure Nginx
Create `/etc/nginx/sites-available/elderx`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory
    root /var/www/elderx/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Serve static files
    location /static {
        alias /var/www/elderx/build/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if needed)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 2.3 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/elderx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 2.4 Setup SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

### Option C: Docker (Containerized)

#### 2.1 Create Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 2.2 Create nginx.conf
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### 2.3 Build and Run
```bash
docker build -t elderx-app .
docker run -d -p 80:80 --name elderx elderx-app
```

---

## Part 3: Configuration Changes

### 3.1 Update Firebase Config for CORS
If hosting on a different domain, update Firebase Console:
1. Go to Firebase Console → Authentication → Settings
2. Add your domain to "Authorized domains"
3. Add your domain to Firestore security rules if needed

### 3.2 Environment Variables
Create production environment file on server:
```bash
# On server
cd /var/www/elderx
nano .env.production
```

Add all Firebase configuration variables.

### 3.3 Update API Endpoints (if needed)
If you're using custom API endpoints, update them in:
- `src/firebase/config.js`
- Any hardcoded URLs in the codebase

---

## Part 4: Deployment Process

### 4.1 Initial Deployment
```bash
# 1. Build locally
npm run build

# 2. Transfer to server
scp -r build/ user@server:/var/www/elderx/

# 3. On server, restart service
sudo systemctl restart nginx  # For Nginx
# OR
pm2 restart elderx  # For PM2 with Node.js
```

### 4.2 Automated Deployment (CI/CD)

#### Using GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Server

on:
  push:
    branches: [ master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          REACT_APP_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          # ... other env vars
      
      - name: Deploy to server
        uses: easingthemes/ssh-deploy@main
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          SOURCE: "build/"
          TARGET: "/var/www/elderx/build"
```

---

## Part 5: Post-Migration Checklist

### 5.1 Testing
- [ ] Test user authentication
- [ ] Test Firestore database operations
- [ ] Test file uploads (Firebase Storage)
- [ ] Test Cloud Functions calls
- [ ] Test all major features
- [ ] Test on different browsers
- [ ] Test mobile responsiveness

### 5.2 Performance
- [ ] Enable gzip compression
- [ ] Setup CDN (Cloudflare, AWS CloudFront)
- [ ] Optimize images
- [ ] Enable browser caching
- [ ] Monitor server resources

### 5.3 Security
- [ ] Setup SSL certificate
- [ ] Configure firewall
- [ ] Update Firebase security rules
- [ ] Review CORS settings
- [ ] Setup rate limiting
- [ ] Regular security updates

### 5.4 Monitoring
- [ ] Setup error logging (Sentry, LogRocket)
- [ ] Monitor server uptime
- [ ] Setup backup procedures
- [ ] Monitor Firebase usage/quota

---

## Part 6: Full Migration (If Needed)

If client wants to completely remove Firebase dependency:

### 6.1 Database Migration
**From Firestore to PostgreSQL:**
1. Export Firestore data
2. Transform data structure
3. Import to PostgreSQL
4. Update all database queries in codebase

### 6.2 Authentication Migration
**From Firebase Auth to Custom JWT:**
1. Setup JWT authentication server
2. Migrate user accounts
3. Update authentication code
4. Implement password reset, email verification

### 6.3 Storage Migration
**From Firebase Storage to AWS S3:**
1. Export all files from Firebase Storage
2. Upload to S3
3. Update file upload/download code
4. Update file URLs in database

### 6.4 Functions Migration
**From Cloud Functions to Express API:**
1. Convert Cloud Functions to Express routes
2. Setup API server
3. Update frontend API calls
4. Handle authentication/authorization

---

## Part 7: Server Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Bandwidth**: 100GB/month
- **OS**: Ubuntu 20.04 LTS or CentOS 8

### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Bandwidth**: 500GB/month
- **OS**: Ubuntu 22.04 LTS

---

## Part 8: Maintenance

### 8.1 Regular Updates
```bash
# Update dependencies
npm update

# Rebuild and redeploy
npm run build
# Deploy to server
```

### 8.2 Backup Strategy
- Daily database backups (Firestore export)
- Weekly full server backups
- Version control (Git) for code

### 8.3 Monitoring Tools
- **Uptime**: UptimeRobot, Pingdom
- **Errors**: Sentry, LogRocket
- **Performance**: Google Analytics, New Relic
- **Server**: htop, netdata

---

## Part 9: Cost Comparison

### Firebase Hosting (Current)
- Hosting: Free tier (10GB storage, 360MB/day transfer)
- Firestore: Pay-as-you-go
- Functions: Pay-as-you-go
- Storage: Pay-as-you-go
- **Estimated**: $50-200/month (depending on usage)

### Self-Hosted (Hybrid)
- Server: $20-100/month (DigitalOcean, AWS, etc.)
- Firebase Services: Same as above
- **Estimated**: $70-300/month

### Fully Self-Hosted
- Server: $50-200/month
- Database: Included or $20-50/month
- Storage: $10-50/month (S3)
- **Estimated**: $80-300/month

---

## Part 10: Support & Documentation

### For Your Client
1. Provide server access documentation
2. Create deployment runbook
3. Document environment variables
4. Provide troubleshooting guide
5. Setup monitoring dashboard

### Recommended Next Steps
1. **Start with Hybrid Approach** (easiest, fastest)
2. Test thoroughly on staging server
3. Gradually migrate if full self-hosting needed
4. Keep Firebase as backup during transition

---

## Quick Start Commands

### For Nginx Setup
```bash
# 1. Install Nginx
sudo apt install nginx

# 2. Copy build files
sudo cp -r build/* /var/www/elderx/

# 3. Setup Nginx config (see above)
sudo nano /etc/nginx/sites-available/elderx

# 4. Enable site
sudo ln -s /etc/nginx/sites-available/elderx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 5. Setup SSL
sudo certbot --nginx -d your-domain.com
```

### For Node.js/Express Setup
```bash
# 1. Install PM2 (process manager)
npm install -g pm2

# 2. Start application
pm2 start server.js --name elderx

# 3. Setup auto-start
pm2 startup
pm2 save
```

---

## Need Help?

If you need assistance with:
- Server setup
- Database migration
- Authentication migration
- Docker configuration
- CI/CD pipeline

Let me know and I can help implement specific parts of the migration!

