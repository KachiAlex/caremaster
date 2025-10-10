# Quick User Creation for chinyere@bulah.com

## 🎯 **Easiest Method: Firebase Console** (5 minutes)

Since you have institution admin access, use Firebase Console directly:

---

### **Step 1: Create Firebase Auth User**

1. **Open:** [Firebase Authentication - Add User](https://console.firebase.google.com/project/elderx-f5c2b/authentication/users)

2. **Click:** "Add User" button

3. **Enter Details:**
   - **Email:** `chinyere@bulah.com`
   - **Password:** `BulahCare2024!`
   - **Auto-generate password:** Uncheck this
   
4. **Click:** "Add User"

5. **IMPORTANT:** Copy the **User UID** (you'll see it in the users list)

---

### **Step 2: Create Firestore User Document**

1. **Open:** [Firestore Database](https://console.firebase.google.com/project/elderx-f5c2b/firestore/data)

2. **Navigate to:** `users` collection (or create it if it doesn't exist)

3. **Click:** "Add Document"

4. **Document ID:** Paste the UID from Step 1

5. **Add these fields:** (Click "Add field" for each)

| Field | Type | Value |
|-------|------|-------|
| `uid` | string | `PASTE_THE_UID_HERE` |
| `email` | string | `chinyere@bulah.com` |
| `name` | string | `Chinyere Bulah` |
| `displayName` | string | `Chinyere Bulah` |
| `userType` | string | `nurse` |
| `type` | string | `nurse` |
| `role` | string | `nurse` |
| `institutionId` | string | `bulah-health-care-YlRg0VHM` |
| `status` | string | `active` |
| `onboardingComplete` | boolean | `false` |
| `onboardingStep` | number | `0` |
| `password` | string | `BulahCare2024!` |
| `createdAt` | timestamp | Click "Insert timestamp" |
| `updatedAt` | timestamp | Click "Insert timestamp" |

6. **Click:** "Save"

---

### **Step 3: (Optional) Create Caregiver Document**

1. **Still in Firestore**

2. **Navigate to:** `caregivers` collection

3. **Click:** "Add Document"

4. **Document ID:** Same UID as above

5. **Add these fields:**

| Field | Type | Value |
|-------|------|-------|
| `id` | string | `PASTE_THE_UID_HERE` |
| `uid` | string | `PASTE_THE_UID_HERE` |
| `name` | string | `Chinyere Bulah` |
| `email` | string | `chinyere@bulah.com` |
| `userType` | string | `nurse` |
| `institutionId` | string | `bulah-health-care-YlRg0VHM` |
| `status` | string | `active` |
| `specialization` | string | `General Care` |
| `createdAt` | timestamp | Click "Insert timestamp" |
| `updatedAt` | timestamp | Click "Insert timestamp" |

6. **Click:** "Save"

---

## ✅ **Done! Now Test Login**

### **Login URL:**
```
https://elderx-f5c2b.web.app/institution/login?institution=bulah-health-care-YlRg0VHM&role=caregiver
```

### **Credentials:**
- **Email:** `chinyere@bulah.com`
- **Password:** `BulahCare2024!`

### **Expected Flow:**
1. ✅ Login succeeds
2. ✅ Redirected to onboarding (3 steps)
3. ✅ Complete onboarding
4. ✅ Access full dashboard

---

## 🚀 **Alternative: Use Your Admin Dashboard**

If you prefer, you can also:

1. **Login to your Institution Admin account**

2. **Go to Institution Admin Dashboard:**
   ```
   https://elderx-f5c2b.web.app/institution-admin/dashboard?institution=bulah-health-care-YlRg0VHM
   ```

3. **Click "Add Caregiver"** (or "Add User" button)

4. **Fill in the form:**
   - Name: `Chinyere Bulah`
   - Email: `chinyere@bulah.com`
   - Password: `BulahCare2024!`
   - Phone: `+234 XXX XXXX`
   - Role: `Nurse`
   - Specialization: `General Care`

5. **Click "Create Caregiver"**

6. **Done!** The user is created automatically.

---

## 🎯 **Summary**

**Institution ID:** `bulah-health-care-YlRg0VHM`

**User Details:**
- Email: `chinyere@bulah.com`
- Password: `BulahCare2024!`
- Role: Nurse
- Status: Active, needs onboarding

**Login URL:**
```
https://elderx-f5c2b.web.app/institution/login?institution=bulah-health-care-YlRg0VHM&role=caregiver
```

**Next Steps:**
1. Create user via Firebase Console (Method above)
2. Test login
3. Complete 3-step onboarding
4. Access dashboard

---

## 📸 **Visual Guide**

### Firebase Authentication Screenshot:
```
[Add User Button] → Email: chinyere@bulah.com → Password: BulahCare2024! → [Add User]
```

### Firestore Document Structure:
```
users (collection)
  └── {UID} (document)
       ├── email: "chinyere@bulah.com"
       ├── name: "Chinyere Bulah"
       ├── userType: "nurse"
       ├── institutionId: "bulah-health-care-YlRg0VHM"
       └── ... (other fields)
```

---

Need help? Let me know if you encounter any issues!

