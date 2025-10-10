# 🚀 Super Admin Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Run the Setup Script
```bash
node create-super-admin.js
```

Enter when prompted:
- **Email**: `superadmin@yourcompany.com`
- **Display Name**: `Your Name`
- **Password**: `YourSecurePassword123!`

### Step 2: Login
Go to: **https://elderx-f5c2b.web.app/super-admin/login**

Enter the credentials you just created.

### Step 3: You're In!
You now have access to:
- 📊 **Dashboard**: System overview and analytics
- 🏢 **Licensing Console**: Manage institutions and licenses
- ⚙️ **Settings**: Configure system preferences

---

## 🎯 Common Tasks

### Create a New Institution
1. Go to **Licensing Console**
2. Click **"New Institution"**
3. Enter institution name
4. Copy the generated access link
5. Share link with institution admin

### Issue a License
1. Go to **Licensing Console**
2. Click **"New License"**
3. Select institution
4. Choose plan (Basic/Standard/Enterprise)
5. Set seats and expiration date
6. Click **"Create"**

### Assign Institution Admin
1. Go to **Licensing Console**
2. Find the institution
3. Click **"Admins"** button
4. Enter admin email and password
5. Click **"Add Admin"**

---

## 🔐 Access Levels

```
┌─────────────────────────────────────────┐
│         SUPER ADMIN (You)               │
│  • Full system access                   │
│  • Manage all institutions              │
│  • Issue/suspend licenses               │
│  • Assign institution admins            │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│     INSTITUTION ADMIN                   │
│  • Manage their institution only        │
│  • Add caregivers and patients          │
│  • View reports                         │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│     CAREGIVERS & STAFF                  │
│  • Access assigned patients only        │
│  • Record care activities               │
└─────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### Can't Login?
- Verify you have `superAdmin: true` custom claim
- Check Firestore: `users/{uid}` should have `isSuperAdmin: true`
- Try logging out and back in

### Don't See Dashboard?
- Clear browser cache
- Try incognito/private mode
- Check browser console for errors

### Lost Access?
Run the script again with your email to restore super admin privileges:
```bash
node create-super-admin.js
```

---

## 📞 Quick Links

- **Dashboard**: `/super-admin/dashboard`
- **Licensing**: `/super-admin/licensing`
- **Settings**: `/super-admin/settings`
- **Login**: `/super-admin/login`

---

## 💡 Pro Tips

1. **Use Strong Passwords**: Enable MFA in production
2. **Regular Audits**: Check audit logs weekly
3. **License Monitoring**: Set up alerts for expiring licenses
4. **Backup Admins**: Create at least 2 super admin accounts
5. **Document Everything**: Keep track of institutions and their admins

---

## 📋 Checklist for New Super Admin

- [ ] Created super admin account
- [ ] Logged into dashboard successfully
- [ ] Created first test institution
- [ ] Issued first test license
- [ ] Assigned first institution admin
- [ ] Reviewed settings
- [ ] Set up email notifications
- [ ] Documented login credentials securely

---

**Need help?** Check the full documentation in `SUPER_ADMIN_SETUP.md`

