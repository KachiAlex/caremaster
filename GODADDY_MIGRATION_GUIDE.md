# GoDaddy Server Migration Guide

This guide will walk you through moving your ElderX React application from Firebase Hosting to a GoDaddy server.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ GoDaddy hosting account (cPanel or VPS access)
- ✅ Domain name pointing to your GoDaddy server
- ✅ SSH access (for VPS) or File Manager access (for shared hosting)
- ✅ Firebase project credentials (we'll keep using Firebase for backend)
- ✅ Your current app codebase

---

## 🎯 Migration Strategy: Hybrid Approach (Recommended)

**What stays on Firebase:**
- Database (Firestore)
- User Authentication
- Cloud Functions
- File Storage

**What moves to GoDaddy:**
- React frontend application (static files)
- HTML, CSS, JavaScript bundles

This approach is fastest and maintains all Firebase features while giving you control over hosting.

---

## Step 1: Prepare Your Application Locally

### 1.1 Build the Production Version

On your local machine, navigate to your project directory and build:

```bash
cd elderx
npm install
npm run build
```

This creates a `build/` folder with all optimized static files.

### 1.2 Verify Build Output

Check that the `build/` folder contains:
- `index.html`
- `static/` folder with CSS and JS files
- All other assets

---

## Step 2: Choose Your GoDaddy Hosting Type

GoDaddy offers different hosting options. Choose based on your plan:

### Option A: GoDaddy Shared Hosting (cPanel) - Easiest
**Best for:** Simple deployments, no server management needed
**Requirements:** cPanel access, File Manager

### Option B: GoDaddy VPS/Dedicated Server - More Control
**Best for:** Full control, custom configurations
**Requirements:** SSH access, root/sudo privileges

---

## Step 3A: Deploy to GoDaddy Shared Hosting (cPanel)

### 3A.1 Access cPanel

1. Log into your GoDaddy account
2. Go to "My Products" → Your hosting plan
3. Click "Manage" → "cPanel Admin"

### 3A.2 Upload Files via File Manager

1. In cPanel, open **File Manager**
2. Navigate to `public_html` (or your domain's root folder)
3. **Create a backup** of existing files (if any):
   - Select all files → Compress → Download
4. **Delete old files** (if deploying fresh)
5. **Upload your build folder contents:**
   - Click "Upload" button
   - Select all files from your local `build/` folder
   - Wait for upload to complete

### 3A.3 Configure .htaccess for React Router

Create or edit `.htaccess` file in `public_html`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
</IfModule>
```

### 3A.4 Test Your Deployment

Visit your domain: `https://yourdomain.com`

**Troubleshooting:**
- If you see a blank page, check browser console for errors
- Verify all files uploaded correctly
- Check `.htaccess` syntax
- Ensure `index.html` is in the root directory

---

## Step 3B: Deploy to GoDaddy VPS/Dedicated Server

### 3B.1 Connect via SSH

```bash
ssh username@your-server-ip
# Or if using a domain:
ssh username@yourdomain.com
```

### 3B.2 Install Required Software

#### Install Node.js (if not already installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install Nginx (Recommended)

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3B.3 Create Application Directory

```bash
# Create directory for your app
sudo mkdir -p /var/www/elderx
sudo chown -R $USER:$USER /var/www/elderx
```

### 3B.4 Upload Build Files

**Option 1: Using SCP (from your local machine)**

```bash
# From your local machine
scp -r build/* username@your-server-ip:/var/www/elderx/
```

**Option 2: Using Git (if you have a repository)**

```bash
# On server
cd /var/www/elderx
git clone your-repo-url .
npm install
npm run build
# Move build contents to parent directory
mv build/* .
```

**Option 3: Using FileZilla or similar FTP client**

Connect via SFTP and upload `build/` folder contents to `/var/www/elderx/`

### 3B.5 Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/elderx
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    root /var/www/elderx;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Handle React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/elderx /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 3B.6 Setup SSL Certificate (Let's Encrypt - Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

---

## Step 4: Configure Firebase for New Domain

### 4.1 Add Authorized Domain in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `elderx-f5c2b`
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your GoDaddy domain: `yourdomain.com`
6. Add your server IP if needed (for testing)

### 4.2 Update Firestore Security Rules (if needed)

If your Firestore rules restrict by domain, update them:

```javascript
// In Firebase Console → Firestore → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow if request comes from your domain
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4.3 Verify Firebase Configuration

Your app should already have Firebase config in `src/firebase/config.js`. Verify it's using environment variables or has the correct values.

---

## Step 5: Environment Variables (If Needed)

If you need to override Firebase config for production:

### For Shared Hosting (cPanel):
1. Create `.env` file in `public_html`
2. Add your Firebase config (though it's already in the build)

**Note:** React apps bundle environment variables at build time, so you'll need to rebuild if changing env vars.

### For VPS:
Create `.env.production` before building:

```bash
cd /var/www/elderx
nano .env.production
```

Add:
```env
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_ENVIRONMENT=production
```

Then rebuild:
```bash
npm run build
```

---

## Step 6: Test Everything

### 6.1 Basic Functionality
- ✅ App loads at your domain
- ✅ No console errors
- ✅ All assets load (CSS, images, etc.)

### 6.2 Firebase Integration
- ✅ User login works
- ✅ User registration works
- ✅ Database operations work
- ✅ File uploads work (if using Firebase Storage)

### 6.3 Routing
- ✅ Direct URL access works (e.g., `/dashboard`)
- ✅ Browser back/forward buttons work
- ✅ No 404 errors on routes

---

## Step 7: Ongoing Maintenance

### 7.1 Updating Your App

**For Shared Hosting:**
1. Build locally: `npm run build`
2. Upload new `build/` contents via File Manager
3. Replace old files

**For VPS:**
```bash
# Option 1: Manual
cd /var/www/elderx
git pull  # or upload new files
npm install
npm run build
sudo systemctl restart nginx

# Option 2: Automated script
./deploy.sh
```

### 7.2 Monitoring

- Check GoDaddy hosting dashboard for resource usage
- Monitor Firebase Console for backend usage
- Set up uptime monitoring (UptimeRobot, Pingdom, etc.)

---

## Troubleshooting

### Issue: Blank Page After Deployment

**Solutions:**
1. Check browser console for errors
2. Verify `index.html` exists in root directory
3. Check file permissions (should be 644 for files, 755 for directories)
4. Verify `.htaccess` (shared hosting) or Nginx config (VPS)

### Issue: Firebase Authentication Not Working

**Solutions:**
1. Verify domain is added to Firebase Authorized domains
2. Check Firebase config in browser console
3. Ensure HTTPS is enabled (Firebase requires HTTPS in production)
4. Check CORS settings in Firebase Console

### Issue: Routes Return 404

**Solutions:**
1. Verify `.htaccess` rewrite rules (shared hosting)
2. Check Nginx `try_files` directive (VPS)
3. Ensure all requests route to `index.html`

### Issue: Assets Not Loading

**Solutions:**
1. Check file paths in `index.html` (should be relative)
2. Verify all files uploaded correctly
3. Check file permissions
4. Clear browser cache

### Issue: Slow Loading Times

**Solutions:**
1. Enable Gzip compression (see Nginx config above)
2. Enable browser caching (see configs above)
3. Consider using a CDN (Cloudflare, etc.)
4. Optimize images before building

---

## GoDaddy-Specific Considerations

### Shared Hosting Limitations:
- ⚠️ No SSH access (use File Manager)
- ⚠️ Limited Node.js support (may need to use static hosting only)
- ⚠️ PHP may be available, but React apps are static
- ✅ Easy to use, no server management

### VPS Advantages:
- ✅ Full control
- ✅ SSH access
- ✅ Can run Node.js, Nginx, etc.
- ✅ Better performance
- ⚠️ Requires more technical knowledge

### DNS Configuration:
1. In GoDaddy, go to **DNS Management**
2. Ensure A record points to your server IP
3. Add CNAME for www subdomain if needed
4. Wait for DNS propagation (can take 24-48 hours)

---

## Security Checklist

- [ ] SSL certificate installed (HTTPS enabled)
- [ ] Firebase domain authorized
- [ ] File permissions set correctly (644/755)
- [ ] `.htaccess` or Nginx security headers configured
- [ ] Environment variables not exposed in client code
- [ ] Firestore security rules reviewed
- [ ] Regular backups configured

---

## Cost Comparison

**Current (Firebase Hosting):**
- Hosting: Free tier
- Backend services: Pay-as-you-go
- **Total:** ~$50-200/month

**After Migration (GoDaddy + Firebase):**
- GoDaddy Hosting: $5-20/month (shared) or $20-100/month (VPS)
- Firebase services: Same as current
- **Total:** ~$55-300/month

---

## Need Help?

If you encounter issues:
1. Check GoDaddy hosting documentation
2. Review Firebase Console for backend errors
3. Check browser console for frontend errors
4. Verify all steps were completed correctly

---

## Quick Reference Commands

### Build locally:
```bash
npm run build
```

### Upload to shared hosting:
- Use cPanel File Manager

### Upload to VPS:
```bash
scp -r build/* user@server:/var/www/elderx/
```

### Restart Nginx (VPS):
```bash
sudo systemctl restart nginx
```

### Check Nginx status:
```bash
sudo systemctl status nginx
```

### Test Nginx config:
```bash
sudo nginx -t
```

---

**Migration Complete!** 🎉

Your app should now be running on your GoDaddy server while still using Firebase for backend services.

