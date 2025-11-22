# Quick Start: Deploy to Your Server

## Option 1: Nginx (Recommended - 5 minutes)

### Step 1: Build the App
```bash
npm run build
```

### Step 2: Copy to Server
```bash
# Replace with your server details
scp -r build/ user@your-server-ip:/var/www/elderx/
```

### Step 3: On Your Server
```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create directory
sudo mkdir -p /var/www/elderx
sudo chown -R $USER:$USER /var/www/elderx

# Copy files (if not done via SCP)
# sudo cp -r build/* /var/www/elderx/

# Create Nginx config
sudo nano /etc/nginx/sites-available/elderx
```

### Step 4: Nginx Configuration
Paste this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/elderx;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 5: Enable and Start
```bash
sudo ln -s /etc/nginx/sites-available/elderx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Setup SSL (Optional but Recommended)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

**Done!** Your app is now accessible at `http://your-server-ip` or `https://your-domain.com`

---

## Option 2: Docker (3 minutes)

### Step 1: Build Docker Image
```bash
docker build -t elderx-app .
```

### Step 2: Run Container
```bash
docker run -d -p 80:80 --name elderx --restart unless-stopped elderx-app
```

**Done!** Your app is now accessible at `http://your-server-ip`

---

## Option 3: Node.js/Express (2 minutes)

### Step 1: Install Dependencies
```bash
npm install express compression express-sslify
```

### Step 2: Build
```bash
npm run build
```

### Step 3: Start Server
```bash
node server.js
```

### Step 4: Use PM2 for Production
```bash
npm install -g pm2
pm2 start server.js --name elderx
pm2 startup
pm2 save
```

**Done!** Your app is now accessible at `http://your-server-ip:3000`

---

## Important Notes

1. **Firebase Configuration**: Make sure your Firebase project allows requests from your server's domain/IP
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add your domain/IP

2. **Environment Variables**: If using custom env vars, create `.env.production` file

3. **Firewall**: Open necessary ports
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp  # SSH
   ```

4. **Domain Setup**: Point your domain to your server's IP
   - A record: `@` → `your-server-ip`
   - A record: `www` → `your-server-ip`

---

## Troubleshooting

### App not loading?
- Check Nginx/Node.js is running: `sudo systemctl status nginx`
- Check logs: `sudo tail -f /var/log/nginx/error.log`
- Verify files are in correct location: `ls -la /var/www/elderx/`

### Firebase errors?
- Check Firebase console for authorized domains
- Verify environment variables are set
- Check browser console for specific errors

### SSL issues?
- Verify domain points to server: `nslookup your-domain.com`
- Check certificate: `sudo certbot certificates`
- Renew if needed: `sudo certbot renew`

---

## Next Steps

1. Setup monitoring (UptimeRobot, Pingdom)
2. Configure backups
3. Setup CI/CD for automated deployments
4. Review security settings

