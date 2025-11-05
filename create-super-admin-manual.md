# Create Super Admin Account - Manual Method

## Step-by-Step Instructions (5 minutes)

### Step 1: Create User in Firebase Authentication
1. Go to: https://console.firebase.google.com/project/elderx-f5c2b/authentication/users
2. Click **"Add User"** button
3. Enter:
   - **Email**: `superadmin@Care Master.com` (or your preferred email)
   - **Password**: `SuperAdmin2024!` (change this after first login)
4. Click **"Add User"**
5. **COPY THE USER ID (UID)** - You'll need this for the next steps

### Step 2: Create User Profile in Firestore
1. Go to: https://console.firebase.google.com/project/elderx-f5c2b/firestore/data
2. Click on **"users"** collection
3. Click **"Add Document"**
4. For Document ID: Paste the **User ID (UID)** you copied from Step 1
5. Add the following fields:

| Field | Type | Value |
|-------|------|-------|
| `id` | string | (paste the UID again) |
| `email` | string | `superadmin@Care Master.com` |
| `displayName` | string | `Super Administrator` |
| `userType` | string | `admin` |
| `type` | string | `admin` |
| `role` | string | `super-admin` |
| `isSuperAdmin` | boolean | `true` |
| `isAdmin` | boolean | `true` |
| `active` | boolean | `true` |
| `createdAt` | timestamp | (click "Insert timestamp") |
| `updatedAt` | timestamp | (click "Insert timestamp") |
| `permissions` | array | Add one string item: `all` |

6. Click **"Save"**

### Step 3: Set Custom Claims (IMPORTANT!)

**You need to run this code to set custom claims. Choose one method:**

#### Method A: Use Firebase Console (Cloud Functions)
1. Go to: https://console.firebase.google.com/project/elderx-f5c2b/functions
2. Find the function: `setSuperAdminClaimFunction`
3. Click on it → "Testing" tab
4. Enter this JSON (replace USER_UID with your actual UID):
```json
{
  "data": {
    "userId": "YOUR_USER_UID_HERE"
  }
}
```
5. Click "Run Test"

#### Method B: Use Browser Console (After logging in as any admin)
1. Login to the app as ANY admin user first
2. Open browser console (F12)
3. Paste and run this code (replace USER_UID):
```javascript
const functions = firebase.functions();
const setSuperAdmin = functions.httpsCallable('setSuperAdminClaimFunction');
setSuperAdmin({ userId: 'YOUR_USER_UID_HERE' })
  .then(result => console.log('Success!', result))
  .catch(error => console.error('Error:', error));
```

#### Method C: Use the Node.js Script (If you have firebase-service-account.json)
```bash
node create-super-admin.js
# Enter the email you created in Step 1
```

### Step 4: Login and Test
1. Go to: https://elderx-f5c2b.web.app/super-admin/login
2. Login with:
   - Email: `superadmin@Care Master.com`
   - Password: `SuperAdmin2024!`
3. You should be redirected to `/super-admin/dashboard`
4. ✅ Success!

---

## Quick Reference

**Login URL**: `https://elderx-f5c2b.web.app/super-admin/login`

**Default Credentials** (if you followed the example above):
- Email: `superadmin@Care Master.com`
- Password: `SuperAdmin2024!`

**⚠️ IMPORTANT**: Change your password after first login!

---

## Troubleshooting

### "Access Denied" after login?
- You need to set custom claims (Step 3)
- Log out completely and log back in
- Custom claims are cached, so you must re-authenticate

### Can't see dashboard?
- Check browser console for errors
- Verify custom claims are set: Open Firebase Console → Authentication → Users → Click on your user → Custom Claims tab
- Should show: `{ "superAdmin": true, "admin": true }`

### Still having issues?
1. Delete the user and start over
2. Make sure ALL fields in Step 2 are entered correctly
3. Make sure custom claims are set in Step 3

