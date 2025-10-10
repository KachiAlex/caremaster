# How to Create the Missing User

## 🔍 **Problem**
The user `chinyere@bulah.com` doesn't exist in your Firestore database.

**Evidence:**
```
📊 Found 0 user(s) with this email
Firebase: Error (auth/invalid-credential)
```

---

## ✅ **Solution: 3 Ways to Create the User**

### **Method 1: Via Firebase Console** (Easiest)

#### **Step 1: Create Firebase Auth User**
1. Go to [Firebase Authentication](https://console.firebase.google.com/project/elderx-f5c2b/authentication/users)
2. Click "Add User"
3. Enter:
   - **Email:** `chinyere@bulah.com`
   - **Password:** Choose a strong password (e.g., `BulahCare2024!`)
4. Click "Add User"
5. **Copy the UID** (you'll need it)

#### **Step 2: Create Firestore User Document**
1. Go to [Firestore Database](https://console.firebase.google.com/project/elderx-f5c2b/firestore/data)
2. Navigate to `users` collection
3. Click "Add Document"
4. **Document ID:** Use the UID from Step 1
5. Add these fields:

```json
{
  "uid": "PASTE_UID_HERE",
  "email": "chinyere@bulah.com",
  "name": "Chinyere Bulah",
  "displayName": "Chinyere Bulah",
  "userType": "nurse",
  "type": "nurse",
  "role": "nurse",
  "institutionId": "YOUR_INSTITUTION_ID",
  "status": "active",
  "onboardingComplete": false,
  "onboardingStep": 0,
  "password": "BulahCare2024!",
  "createdAt": "Current timestamp",
  "updatedAt": "Current timestamp"
}
```

6. Click "Save"

#### **Step 3: Test Login**
```
URL: https://elderx-f5c2b.web.app/institution/login?institution=YOUR_INSTITUTION_ID&role=caregiver
Email: chinyere@bulah.com
Password: BulahCare2024!
```

---

### **Method 2: Using Node.js Script** (Automated)

I've created a script for you: `create-institution-user.js`

#### **Setup:**
1. You need Firebase Admin SDK credentials:
   - Go to [Firebase Console > Project Settings > Service Accounts](https://console.firebase.google.com/project/elderx-f5c2b/settings/serviceaccounts/adminsdk)
   - Click "Generate New Private Key"
   - Save as `elderx-f5c2b-firebase-adminsdk.json` in project root

2. Edit the script with your details:
   ```javascript
   const USER_EMAIL = 'chinyere@bulah.com';
   const USER_PASSWORD = 'BulahCare2024!'; // Change this!
   const INSTITUTION_ID = 'bulah'; // Your institution ID
   ```

3. Run:
   ```bash
   node create-institution-user.js
   ```

---

### **Method 3: Via Institution Admin Dashboard** (Best for Production)

If you have an institution admin account:

1. **Login as Institution Admin**
   ```
   https://elderx-f5c2b.web.app/institution/login?institution=YOUR_INSTITUTION_ID&role=admin
   ```

2. **Navigate to Admin Dashboard**

3. **Click "Add Caregiver"**

4. **Fill in the form:**
   - Name: Chinyere Bulah
   - Email: chinyere@bulah.com
   - Password: BulahCare2024!
   - Phone: +234...
   - Role: Nurse
   - Specialization: General Care

5. **Click "Create Caregiver"**

6. **User can now login!**

---

## 🔍 **Check What Users Exist**

To see what users are currently in your database, I've created: `check-institution-users.js`

**Run:**
```bash
node check-institution-users.js
```

This will show:
- All users in your database
- Their roles and institutions
- Whether `chinyere@bulah.com` exists

---

## 🎯 **What You Need to Know**

### **Institution ID**
Your institution needs an ID. Common options:
- `bulah` (if it's Bulah Care institution)
- Check your institutions collection in Firestore
- Or check the URL when you access the institution landing page

### **Login URL Format**
```
https://elderx-f5c2b.web.app/institution/login?institution=INSTITUTION_ID&role=caregiver
```

Replace `INSTITUTION_ID` with your actual institution ID.

---

## 📝 **Quick Test User Creation (Manual)**

If you just want to test quickly:

1. **Go to Firebase Console:** [Authentication](https://console.firebase.google.com/project/elderx-f5c2b/authentication/users)
2. **Add User:**
   - Email: `test@bulah.com`
   - Password: `Test123!`
3. **Go to Firestore:** [Database](https://console.firebase.google.com/project/elderx-f5c2b/firestore/data)
4. **Add to users collection:**
   ```json
   {
     "email": "test@bulah.com",
     "name": "Test User",
     "userType": "nurse",
     "institutionId": "bulah",
     "status": "active",
     "password": "Test123!",
     "onboardingComplete": false
   }
   ```
5. **Test login with:** `test@bulah.com` / `Test123!`

---

## ⚠️ **Important Notes**

1. **Password in Firestore:** We store the password in Firestore for the custom auth flow. This is needed because institution admins create users with specific passwords.

2. **Onboarding:** New users will go through the 3-step onboarding process first.

3. **Institution ID:** Make sure you use the correct institution ID - it must match between:
   - User document (`institutionId` field)
   - Login URL (`?institution=` parameter)
   - Institution document in Firestore

---

## 🆘 **Still Having Issues?**

If you're still having trouble:

1. **Check Institution Exists:**
   - Go to Firestore
   - Look for `institutions` collection
   - Find your institution document
   - Note the institution ID

2. **Verify User Email:**
   - Make sure there are no typos
   - Check if user exists with different email

3. **Check Console Logs:**
   - Open browser developer tools
   - Check for any error messages
   - Look for the institution ID being used

---

**Need help?** Let me know:
- What institution ID are you using?
- Do you have an institution admin account?
- Should I help you create a test user?

