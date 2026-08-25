# Care Master Environment Configuration Setup

## 🔧 Required Environment Variables

To fix the **encryption key warning** and improve security, you need to create or update your `.env.local` file in the root directory.

### **Step 1: Create `.env.local` File**

Create a file named `.env.local` in your project root (`c:\Care Master\.env.local`) with the following content:

```env
# Care Master Environment Configuration
# Generated: October 9, 2025

# Firebase Configuration (Production)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=elderx-f5c2b.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=elderx-f5c2b
REACT_APP_FIREBASE_STORAGE_BUCKET=elderx-f5c2b.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=987610993096
REACT_APP_FIREBASE_APP_ID=1:987610993096:web:97c82732772d1223d3f0fd

# Security Configuration
# Strong encryption key (32+ characters with uppercase, lowercase, numbers, special chars)
REACT_APP_ENCRYPTION_KEY=Care Master2024!SecureKey#Healthcare$HIPAA%Compliant&2025

# JWT Secret for token generation
REACT_APP_JWT_SECRET=Care Master_JWT_Secret_2024!Healthcare#Secure$Token%Generation

# Session Configuration
REACT_APP_SESSION_TIMEOUT=3600
REACT_APP_MAX_LOGIN_ATTEMPTS=5
REACT_APP_LOCKOUT_DURATION=900

# Feature Flags
REACT_APP_ENABLE_2FA=true
REACT_APP_ENABLE_BIOMETRIC=false
REACT_APP_ENABLE_ENCRYPTION=true
REACT_APP_ENABLE_AUDIT_LOG=true
REACT_APP_ENABLE_RATE_LIMITING=true

# Development Settings
REACT_APP_USE_EMULATORS=false
NODE_ENV=production
```

### **Step 2: Security Requirements**

The encryption key MUST meet these requirements:
- ✅ **Minimum 32 characters**
- ✅ **At least one uppercase letter (A-Z)**
- ✅ **At least one lowercase letter (a-z)**
- ✅ **At least one number (0-9)**
- ✅ **At least one special character (!@#$%^&*...)**

The provided key meets all these requirements: `Care Master2024!SecureKey#Healthcare$HIPAA%Compliant&2025`

### **Step 3: Restart Development Server**

After creating the `.env.local` file:

```bash
# Stop current dev server (Ctrl+C)
# Restart with new environment variables
npm start
```

### **Step 4: Rebuild for Production**

If deploying to production:

```bash
npm run build
```

---

## 🔐 Security Best Practices

### **For Production Deployment:**

1. **Never commit `.env.local` to git** - It's already in `.gitignore`
2. **Use different keys for development and production**
3. **Rotate encryption keys regularly (every 90 days)**
4. **Store production keys in Firebase hosting environment**

### **For Firebase Hosting:**

Set environment variables in Firebase:

```bash
firebase functions:config:set encryption.key="YOUR_PRODUCTION_KEY"
firebase functions:config:set jwt.secret="YOUR_JWT_SECRET"
```

---

## ✅ Verification

After setup, you should NO LONGER see this warning:
```
[WARN] Encryption key may be weak; consider rotating to a stronger key.
```

---

## 📝 Additional Notes

- **Development**: `.env.local` is used
- **Production Build**: Environment variables are embedded at build time
- **Firebase Functions**: Use `firebase functions:config:set`
- **Hosting**: Set in Firebase Console under Hosting settings


