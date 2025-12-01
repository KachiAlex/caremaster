# GoDaddy Migration Checklist

Use this checklist to track your migration progress.

## Pre-Migration

- [ ] GoDaddy hosting account set up
- [ ] Domain name configured
- [ ] SSH access (VPS) or cPanel access (shared hosting) confirmed
- [ ] Firebase project credentials documented
- [ ] Backup of current Firebase hosting created

## Local Preparation

- [ ] `npm install` completed successfully
- [ ] `npm run build` completed successfully
- [ ] `build/` folder verified (contains index.html and static files)
- [ ] Firebase config verified in code
- [ ] Environment variables documented (if any)

## Deployment - Shared Hosting (cPanel)

- [ ] Logged into cPanel
- [ ] File Manager accessed
- [ ] Backup of existing files created (if any)
- [ ] Build files uploaded to `public_html`
- [ ] `.htaccess` file created/updated
- [ ] File permissions verified (644 for files, 755 for directories)

## Deployment - VPS/Dedicated Server

- [ ] SSH connection established
- [ ] Node.js installed and verified
- [ ] Nginx installed and running
- [ ] Application directory created (`/var/www/elderx`)
- [ ] Build files uploaded to server
- [ ] Nginx configuration created
- [ ] Nginx site enabled
- [ ] Nginx configuration tested (`sudo nginx -t`)
- [ ] Nginx restarted
- [ ] SSL certificate installed (Let's Encrypt)

## Firebase Configuration

- [ ] Logged into Firebase Console
- [ ] Project selected: `elderx-f5c2b`
- [ ] New domain added to Authorized domains
- [ ] Server IP added to Authorized domains (if needed)
- [ ] Firestore security rules reviewed/updated
- [ ] Storage rules reviewed/updated

## Testing

- [ ] App loads at domain URL
- [ ] No console errors in browser
- [ ] All CSS/styles loading correctly
- [ ] All JavaScript loading correctly
- [ ] Images and assets loading correctly
- [ ] User login works
- [ ] User registration works
- [ ] Database operations work
- [ ] File uploads work (if applicable)
- [ ] React Router works (direct URL access)
- [ ] Browser back/forward buttons work
- [ ] HTTPS/SSL working (if configured)

## Post-Migration

- [ ] DNS propagation verified
- [ ] Monitoring set up (optional)
- [ ] Backup strategy documented
- [ ] Update process documented
- [ ] Team notified of new URL
- [ ] Old Firebase hosting disabled (optional)

## Troubleshooting Notes

_Use this space to note any issues encountered and their solutions:_

```
Issue:
Solution:

Issue:
Solution:
```

## Quick Reference

**Build command:**
```bash
npm run build
```

**Upload to shared hosting:**
- Use cPanel File Manager

**Upload to VPS:**
```bash
scp -r build/* user@server:/var/www/elderx/
```

**Restart Nginx:**
```bash
sudo systemctl restart nginx
```

**Check Nginx status:**
```bash
sudo systemctl status nginx
```

**Firebase Console:**
https://console.firebase.google.com/project/elderx-f5c2b

---

**Migration Date:** _______________
**Completed By:** _______________
**Domain:** _______________

