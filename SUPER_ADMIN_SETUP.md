# 🔐 Care Master Super Admin Setup Guide

## Overview

The Super Admin role is the highest level of access in the Care Master platform. Super Admins have complete control over:
- **Institution Management**: Create, edit, and delete healthcare institutions
- **License Management**: Issue, suspend, and manage licenses for institutions
- **Admin Assignment**: Assign institution administrators
- **System Monitoring**: Full access to all system features and data

---

## 🚀 Quick Start - Creating Your First Super Admin

### Method 1: Using the Automated Script (Recommended)

1. **Ensure you have Firebase service account credentials**
   ```bash
   # Place your Firebase service account JSON in the project root
   # Name it: firebase-service-account.json
   ```

2. **Run the super admin creation script**
   ```bash
   node create-super-admin.js
   ```

3. **Follow the prompts**
   - Enter email address
   - Enter display name (if creating new user)
   - Enter password (if creating new user)

4. **Access the Super Admin Dashboard**
   - URL: `https://elderx-f5c2b.web.app/super-admin/login`
   - Or: `http://localhost:3000/super-admin/login` (development)

### Method 2: Using Firebase Console (Manual)

#### Step 1: Create User in Firebase Auth
1. Go to [Firebase Console](https://console.firebase.google.com/project/elderx-f5c2b/authentication/users)
2. Click **"Add User"**
3. Create account with:
   - **Email**: `superadmin@Care Master.com`
   - **Password**: `SuperAdmin2024!` (change after first login)

#### Step 2: Set User Type in Firestore
1. Go to [Firestore Database](https://console.firebase.google.com/project/elderx-f5c2b/firestore/data)
2. Navigate to **`users`** collection
3. Find the user document with the super admin email
4. Update the document with:
   ```json
   {
     "userType": "admin",
     "type": "admin",
     "role": "super-admin",
     "isSuperAdmin": true,
     "isAdmin": true,
     "displayName": "Care Master Super Administrator",
     "permissions": ["all"],
     "active": true
   }
   ```

#### Step 3: Set Custom Claims
Since custom claims can only be set programmatically, you have two options:

**Option A: Use the Cloud Function**
1. First login as any admin user
2. Call the `setSuperAdminClaimFunction` with the user's UID
3. The user will need to log out and back in

**Option B: Use Firebase Admin SDK (Node.js)**
```javascript
const admin = require('firebase-admin');
admin.initializeApp();

admin.auth().setCustomUserClaims('USER_UID_HERE', {
  superAdmin: true,
  admin: true
}).then(() => {
  console.log('Super admin claims set successfully');
});
```

---

## 🔐 Super Admin Access Flow

```
1. User Login (Email/Password)
   ↓
2. SuperAdminGuard checks custom claims
   ↓
3. Verifies: token.claims.superAdmin === true
   ↓
4. If valid → Super Admin Dashboard
   If invalid → Logout & redirect to login
```

---

## 📊 Super Admin Dashboard Features

### 1. Institution Management
- Create new healthcare institutions
- Edit institution details (name, domain, notes)
- Generate unique access links for institutions
- Activate/deactivate institutions
- Delete institutions (with cascading license deletion)

### 2. License Management
- Create licenses for institutions
- Configure license plans (Basic, Standard, Enterprise)
- Set seat limits per license
- Set license expiration dates
- Suspend/activate licenses
- Monitor license status and usage

### 3. Administrator Management
- Assign institution administrators
- Create admin accounts with credentials
- View all admins per institution
- Remove admin access
- Monitor admin activity

### 4. System Monitoring
- View total institutions count
- Track active vs inactive licenses
- Search and filter institutions
- Audit log access (coming soon)

---

## 🛡️ Security Features

### Authentication & Authorization
- **Multi-layer Security**: Firebase Auth + Custom Claims + Firestore Rules
- **Automatic Logout**: Non-super-admins are immediately logged out if they access the portal
- **Session Validation**: Every page load verifies super admin status
- **Audit Logging**: All super admin actions are logged

### Firestore Security Rules
```javascript
function isSuperAdmin() {
  return request.auth != null && 
         request.auth.token.superAdmin == true;
}

// Institutions: Public read, super-admin write
match /institutions/{institutionId} {
  allow read: if true;
  allow write: if isSuperAdmin();
}

// Licenses: Public read, super-admin write
match /licenses/{licenseId} {
  allow read: if true;
  allow write: if isSuperAdmin();
}
```

---

## 🔧 Development & Testing

### Local Development
```bash
# Start the development server
npm start

# Access super admin login
http://localhost:3000/super-admin/login
```

### Test Accounts (For Development Only)
```
Email: superadmin@Care Master.com
Password: SuperAdmin2024!
```

⚠️ **IMPORTANT**: Change default passwords in production!

---

## 🚨 Troubleshooting

### Issue: "Access Denied" after login
**Solution**: The user might not have super admin custom claims set.
```bash
# Run the script to promote the user
node create-super-admin.js

# Or check Firebase Console → Authentication → User → Custom Claims
```

### Issue: User can't see super admin features
**Solution**: User needs to log out and log back in for custom claims to take effect.
```javascript
// Custom claims are cached in the user's token
// Force token refresh or require re-login
```

### Issue: "User must be an admin" error
**Solution**: The user profile must have `userType: 'admin'` in Firestore first.
```bash
# Ensure Firestore document exists with correct userType
# Then run setSuperAdminClaim function
```

---

## 📋 Super Admin Checklist

- [ ] Firebase service account credentials configured
- [ ] Super admin account created
- [ ] Custom claims set (`superAdmin: true`)
- [ ] User can login at `/super-admin/login`
- [ ] User can access dashboard at `/super-admin`
- [ ] Institution creation tested
- [ ] License creation tested
- [ ] Admin assignment tested
- [ ] Audit logs reviewed

---

## 🔄 Promoting Existing Users to Super Admin

### Using the Script
```bash
node create-super-admin.js
# Enter the existing user's email when prompted
# The script will promote them to super admin
```

### Using Cloud Function (If logged in as super admin)
```javascript
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

const functions = getFunctions();
const setSuperAdmin = httpsCallable(functions, 'setSuperAdminClaimFunction');

// Call the function
await setSuperAdmin({ userId: 'TARGET_USER_UID' });
```

---

## 🌐 Production Deployment

### Pre-deployment Checklist
1. [ ] Change all default passwords
2. [ ] Review and update Firestore security rules
3. [ ] Enable audit logging
4. [ ] Set up monitoring and alerts
5. [ ] Document all super admin accounts
6. [ ] Implement MFA (if required)
7. [ ] Test access controls in production

### Environment Variables
```bash
# Add to your .env file
REACT_APP_SUPER_ADMIN_EMAIL=your-email@company.com
```

---

## 📞 Support

For issues or questions about super admin access:
1. Check the troubleshooting section above
2. Review Firebase console for authentication/claim issues
3. Check browser console for detailed error messages
4. Review audit logs for access attempts

---

## 🔒 Best Practices

1. **Limit Super Admin Accounts**: Only create super admin accounts for trusted personnel
2. **Use Strong Passwords**: Enforce strong password policies
3. **Enable MFA**: Consider multi-factor authentication for production
4. **Regular Audits**: Review super admin activity logs regularly
5. **Principle of Least Privilege**: Use institution admins for day-to-day operations
6. **Secure Service Accounts**: Keep Firebase service account credentials secure
7. **Monitor Access**: Set up alerts for super admin logins

---

## 📖 Related Documentation

- [Institution Admin Setup](./INSTITUTION_CAREGIVER_FLOW.md)
- [User Creation Guide](./USER_CREATION_GUIDE.md)
- [Security Documentation](./SECURITY.md)
- [System Overview](./SYSTEM_OVERVIEW.md)

---

**Last Updated**: October 2025  
**Version**: 2.0

