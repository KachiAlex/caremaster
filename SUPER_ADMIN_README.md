# 🔐 ElderX Super Admin System

## 📋 Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [System Architecture](#system-architecture)
4. [Access Flow](#access-flow)
5. [Features](#features)
6. [Setup Instructions](#setup-instructions)
7. [Security](#security)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Super Admin system is the highest level of access in ElderX, designed for platform administrators who manage multiple healthcare institutions. Super Admins have complete control over:

- **Institution Management**: Create, configure, and manage healthcare institutions
- **License Management**: Issue, renew, and suspend institutional licenses  
- **Administrator Assignment**: Assign and manage institution-level administrators
- **System Configuration**: Configure platform-wide settings and features
- **Monitoring & Analytics**: View system-wide statistics and activity

---

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- Firebase Admin SDK credentials
- Access to Firebase Console

### Create Your First Super Admin (2 minutes)

1. **Get Firebase Service Account Key**
   ```bash
   # Download from Firebase Console:
   # Project Settings → Service Accounts → Generate New Private Key
   # Save as: firebase-service-account.json
   ```

2. **Run the Setup Script**
   ```bash
   node create-super-admin.js
   ```

3. **Enter Details When Prompted**
   ```
   Email: superadmin@yourcompany.com
   Display Name: Your Name
   Password: SecurePassword123!
   ```

4. **Login**
   - URL: `https://elderx-f5c2b.web.app/super-admin/login`
   - Use the credentials you just created
   - You'll be redirected to the Super Admin Dashboard

**That's it!** You now have full super admin access.

---

## 🏗️ System Architecture

### Access Hierarchy
```
┌─────────────────────────────────────────────────────────┐
│                    SUPER ADMIN                          │
│  • Platform-wide access                                 │
│  • Manage all institutions                              │
│  • Create/suspend licenses                              │
│  • Assign institution admins                            │
│  • System configuration                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              INSTITUTION ADMIN                          │
│  • Single institution access                            │
│  • Manage caregivers & patients                         │
│  • View institution reports                             │
│  • Configure institution settings                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 CAREGIVERS & DOCTORS                    │
│  • Patient care access                                  │
│  • Assigned patients only                               │
│  • Care documentation                                   │
└─────────────────────────────────────────────────────────┘
```

### Authentication Stack

```
┌──────────────────────────────────────┐
│    Firebase Authentication           │
│    (Email/Password)                  │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│    Custom Claims Check                │
│    token.superAdmin === true         │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│    Firestore Profile Check            │
│    isSuperAdmin === true             │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│    SuperAdminGuard Component         │
│    Route Protection                  │
└──────────────────────────────────────┘
```

---

## 🔐 Access Flow

### Login Process
1. User enters credentials at `/super-admin/login`
2. Firebase Auth validates email/password
3. System checks for `superAdmin` custom claim
4. If valid → Redirect to `/super-admin/dashboard`
5. If invalid → Logout user and show error

### Route Protection
All super admin routes are protected by `SuperAdminGuard`:

```javascript
// Protected routes in App.js
<Route 
  path="/super-admin/dashboard" 
  element={<SuperAdminGuard><SuperAdminDashboard /></SuperAdminGuard>} 
/>
```

### Security Rules
Firestore security rules enforce super admin access:

```javascript
function isSuperAdmin() {
  return request.auth != null && 
         request.auth.token.superAdmin == true;
}

match /institutions/{institutionId} {
  allow read: if true;
  allow write: if isSuperAdmin();
}
```

---

## ✨ Features

### 1. Dashboard (`/super-admin/dashboard`)
- **Overview Cards**: Key metrics at a glance
- **Active Institutions**: Count and status
- **License Tracking**: Active, expiring, expired
- **User Statistics**: Total and active users
- **Revenue Analytics**: Monthly revenue projections
- **Recent Activity**: Audit log timeline
- **System Alerts**: Warnings and notifications
- **Quick Actions**: One-click access to common tasks

### 2. Licensing Console (`/super-admin/licensing`)
- **Institution Management**
  - Create new institutions
  - Edit institution details
  - Generate access links
  - Activate/deactivate institutions
  - Delete institutions (with confirmation)

- **License Management**
  - Create licenses (Basic, Standard, Enterprise)
  - Set seat limits
  - Configure expiration dates
  - Suspend/activate licenses
  - Track license usage

- **Administrator Management**
  - Assign institution admins
  - Create admin accounts
  - View admin list per institution
  - Remove admin access

### 3. Settings (`/super-admin/settings`)
- **Security Settings**
  - MFA requirements
  - Session timeout
  - Login attempt limits

- **Notifications**
  - Email alerts
  - License expiry warnings
  - System notifications

- **System Configuration**
  - Maintenance mode
  - New institution creation
  - Auto-renewal options

- **Audit & Logging**
  - Log retention periods
  - Detailed logging options

---

## 📝 Setup Instructions

### Detailed Setup Process

#### 1. Firebase Configuration

**Get Service Account Key:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to: Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save as `firebase-service-account.json` in project root

**Configure Security Rules:**
The necessary Firestore security rules are already in place in `firestore.rules`:
```javascript
function isSuperAdmin() {
  return request.auth != null && 
         request.auth.token.superAdmin == true;
}
```

#### 2. Create Super Admin Account

**Option A: Using the Script (Recommended)**
```bash
# Make sure you have firebase-service-account.json
node create-super-admin.js

# Follow the prompts
Email: admin@yourcompany.com
Display Name: Super Administrator
Password: YourSecurePassword123!
```

**Option B: Batch Creation**
Edit the script for multiple admins:
```bash
node create-super-admin.js --batch
```

Edit the `admins` array in the script:
```javascript
const admins = [
  {
    email: 'admin1@company.com',
    password: 'SecurePass1!',
    displayName: 'Admin One'
  },
  {
    email: 'admin2@company.com',
    password: 'SecurePass2!',
    displayName: 'Admin Two'
  }
];
```

#### 3. Verify Setup

**Check Firebase Auth:**
1. Go to Firebase Console → Authentication → Users
2. Verify user exists with correct email

**Check Firestore:**
1. Go to Firebase Console → Firestore Database
2. Navigate to `users/{uid}`
3. Verify fields:
   ```json
   {
     "userType": "admin",
     "type": "admin",
     "role": "super-admin",
     "isSuperAdmin": true,
     "isAdmin": true,
     "permissions": ["all"]
   }
   ```

**Check Custom Claims:**
Use Firebase Admin SDK or the script to verify:
```javascript
const user = await admin.auth().getUser(uid);
const claims = user.customClaims;
console.log(claims); // Should show { superAdmin: true, admin: true }
```

#### 4. First Login

1. Navigate to: `https://elderx-f5c2b.web.app/super-admin/login`
2. Enter your credentials
3. You should be redirected to the dashboard
4. If not, check browser console for errors

---

## 🛡️ Security

### Best Practices

1. **Strong Passwords**
   - Minimum 12 characters
   - Mix of letters, numbers, symbols
   - No dictionary words

2. **Multi-Factor Authentication**
   - Enable MFA in production
   - Use authenticator apps (Google Authenticator, Authy)

3. **Access Logging**
   - All super admin actions are logged
   - Review audit logs regularly
   - Set up alerts for suspicious activity

4. **Principle of Least Privilege**
   - Only create super admin accounts when necessary
   - Use institution admins for day-to-day operations
   - Regular access reviews

5. **Secure Credentials**
   - Store `firebase-service-account.json` securely
   - Never commit to version control
   - Use environment variables in production

6. **Regular Audits**
   - Weekly review of super admin list
   - Monthly security audits
   - Quarterly access reviews

### Security Checklist

- [ ] Firebase service account key secured
- [ ] Strong passwords enforced
- [ ] MFA enabled (production)
- [ ] Audit logging active
- [ ] Security rules deployed
- [ ] Regular access reviews scheduled
- [ ] Incident response plan documented
- [ ] Backup super admin accounts created

---

## 🔧 Troubleshooting

### Common Issues

#### Can't Login
**Symptoms**: Login fails or redirects back to login page

**Solutions**:
1. Check custom claims:
   ```bash
   # Run script again to set claims
   node create-super-admin.js
   ```

2. Clear browser cache and cookies

3. Try incognito/private mode

4. Check browser console for errors

5. Verify user exists in Firebase Auth

#### Access Denied After Login
**Symptoms**: Login succeeds but shows "Access Denied"

**Solutions**:
1. Verify Firestore profile has `isSuperAdmin: true`
2. Log out completely and log back in (refresh token)
3. Check custom claims are set correctly
4. Verify security rules allow super admin access

#### Dashboard Not Loading
**Symptoms**: Blank page or loading spinner forever

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify Firebase config is correct
3. Check network tab for failed API calls
4. Try clearing cache and hard refresh (Ctrl+Shift+R)

#### Can't Create Institutions
**Symptoms**: Create button doesn't work or shows error

**Solutions**:
1. Verify you're logged in as super admin
2. Check browser console for errors
3. Verify Cloud Functions are deployed
4. Check Firestore security rules

### Debug Mode

Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('debug', 'elderx:*');
location.reload();
```

### Getting Help

1. Check browser console for errors
2. Review `SUPER_ADMIN_SETUP.md` for detailed instructions
3. Check Firebase Console for authentication/database issues
4. Review audit logs for clues
5. Check Cloud Functions logs in Firebase Console

---

## 📊 Usage Examples

### Create an Institution
```javascript
// In Licensing Console
1. Click "New Institution"
2. Enter: name = "Springfield General Hospital"
3. Enter: domain = "springfield.hospital"
4. Click "Create"
5. Copy the generated access link
6. Share with institution admin
```

### Issue a License
```javascript
// In Licensing Console
1. Click "New License" or click "License" button on institution
2. Select plan: "Enterprise"
3. Set seats: "100"
4. Set end date: "2025-12-31"
5. Click "Create"
```

### Assign Institution Admin
```javascript
// In Licensing Console
1. Find institution in table
2. Click "Admins" button
3. Enter email: "admin@springfield.hospital"
4. Enter name: "Dr. Julius Hibbert"
5. Enter password: "SecurePass123!"
6. Click "Add Admin"
```

---

## 📚 Related Documentation

- **Quick Start Guide**: `SUPER_ADMIN_QUICK_START.md`
- **Detailed Setup**: `SUPER_ADMIN_SETUP.md`
- **Institution Flow**: `INSTITUTION_CAREGIVER_FLOW.md`
- **Security Guide**: `SECURITY.md`
- **System Overview**: `SYSTEM_OVERVIEW.md`

---

## 📞 Support

For issues or questions:
1. Review this documentation
2. Check troubleshooting section
3. Review browser console errors
4. Check Firebase Console logs
5. Review audit logs for access issues

---

**Version**: 2.0  
**Last Updated**: October 2025  
**Status**: Production Ready

