# ElderX Role Standardization & Migration Guide

## 📋 Overview

This guide explains how to standardize user roles across the ElderX platform and migrate existing users to the new role system.

## 🎯 Goals

1. **Standardize role detection** - Use a single `role` field for all users
2. **Maintain backward compatibility** - Continue supporting legacy fields (`userType`, `type`, `medicalQualification`)
3. **Simplify role checks** - Use centralized helper functions
4. **Ensure security** - Update Firestore rules to support all role fields

## 📁 New Files Created

### 1. `src/constants/roles.js`
**Purpose:** Centralized role constants and helper functions

**Key Exports:**
- `ROLES` - Object containing all standard role constants
- `hasRole(userProfile, role)` - Check if user has a specific role
- `hasAnyRole(userProfile, roles)` - Check if user has any of the specified roles
- `getPrimaryRole(userProfile)` - Get the user's primary role
- `isMedicalProfessional(userProfile)` - Check if user is a doctor or nurse
- `getRoleDisplayName(role)` - Get user-friendly role name

**Usage Example:**
```javascript
import { ROLES, hasRole } from '../constants/roles';

// Check if user is a doctor
if (hasRole(userProfile, ROLES.DOCTOR)) {
  // Show doctor-specific UI
}

// Check if user is any medical professional
if (hasAnyRole(userProfile, [ROLES.DOCTOR, ROLES.NURSE])) {
  // Show medical actions
}
```

### 2. `src/utils/migrateUserRoles.js`
**Purpose:** Programmatic migration utilities

**Key Functions:**
- `migrateUser(userId, userData)` - Migrate a single user
- `migrateAllUsers(options)` - Migrate all users in batches
- `getMigrationStatus()` - Check migration progress
- `inferRole(userData)` - Infer role from existing data

**Usage Example:**
```javascript
import { migrateAllUsers, getMigrationStatus } from '../utils/migrateUserRoles';

// Run dry run first to preview changes
const results = await migrateAllUsers({ dryRun: true });

// Then run actual migration
const results = await migrateAllUsers({ dryRun: false, batchSize: 50 });

// Check status
const status = await getMigrationStatus();
console.log(`${status.migrated}/${status.total} users migrated`);
```

### 3. `public/migrate-roles.html`
**Purpose:** Standalone web-based migration tool

**Features:**
- Visual migration status dashboard
- Dry run mode (preview changes)
- Batch migration with progress tracking
- Real-time logging
- No code deployment required

**Access:**
```
https://elderx-f5c2b.web.app/migrate-roles.html
```

## 🚀 Migration Steps

### Option A: Using the Web Tool (Recommended for Non-Developers)

1. **Navigate to the migration tool:**
   ```
   https://elderx-f5c2b.web.app/migrate-roles.html
   ```

2. **Check current status:**
   - Click "🔍 Check Status" to see how many users need migration

3. **Run dry run:**
   - Click "🧪 Dry Run (Preview)" to see what changes will be made
   - Review the log output carefully

4. **Run migration:**
   - Click "▶️ Run Migration"
   - Confirm the action
   - Wait for completion (usually 1-5 minutes)

5. **Verify:**
   - Check status again to confirm all users are migrated
   - Test login with different user types

### Option B: Using Code (For Developers)

1. **Import in a React component:**
   ```javascript
   import { migrateAllUsers } from '../utils/migrateUserRoles';
   ```

2. **Add a migration button:**
   ```javascript
   const handleMigration = async () => {
     try {
       const results = await migrateAllUsers({ dryRun: false });
       console.log('Migration complete:', results);
     } catch (error) {
       console.error('Migration failed:', error);
     }
   };
   ```

3. **Call from console (quick test):**
   ```javascript
   // In browser console on any page
   const { migrateAllUsers } = await import('/src/utils/migrateUserRoles.js');
   await migrateAllUsers({ dryRun: true });
   ```

## 📊 Role Inference Logic

The migration script uses the following priority order to determine a user's role:

1. **`role` field** (if already set)
2. **`userType` field**
3. **`type` field**
4. **`medicalQualification` field** (inferred):
   - Contains "Doctor" or "MD" → `doctor`
   - Contains "Nurse", "RN", or "LPN" → `nurse`
   - Contains "Pharmacist" → `pharmacist`
   - Contains "Physio" → `physiotherapist`
   - Contains "Psycho" → `psychologist`
   - Contains "Lab" → `lab-technician`
5. **Default:** `caregiver`

## 🔧 What Gets Updated

For each user, the migration adds/updates:

```javascript
{
  role: 'doctor',                           // ✨ NEW: Standardized role
  roleMigrated: true,                       // ✨ NEW: Migration flag
  roleMigratedAt: '2025-10-14T12:00:00Z',  // ✨ NEW: Migration timestamp
  updatedAt: '2025-10-14T12:00:00Z',       // Updated timestamp
  
  // Legacy fields (kept for backward compatibility)
  userType: 'caregiver',                   // Unchanged
  type: 'caregiver',                       // Unchanged
  medicalQualification: 'Doctor (MD)'      // Unchanged
}
```

## ✅ Updated Components

### 1. InstitutionCaregiverDashboard.js
**Changes:**
- Role detection now checks `role`, `userType`, `type`, and `medicalQualification`
- Works with both migrated and non-migrated users

**Updated Code:**
```javascript
const isDoctor = (userProfile?.medicalQualification || '').includes('Doctor') || 
                  userProfile?.role === 'doctor' || 
                  userProfile?.userType === 'doctor' || 
                  userProfile?.type === 'doctor';
```

### 2. firestore.rules
**Changes:**
- `isDoctor()` helper now checks `role` field
- `isCaregiver()` helper now checks `role` field
- Backward compatible with legacy fields

**Updated Code:**
```javascript
function isDoctor() {
  return request.auth != null && (
    request.auth.token.doctor == true ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'doctor' ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.type == 'doctor' ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'doctor' // ✨ NEW
  );
}
```

## 🎨 Best Practices for New User Creation

When creating new users, always set the `role` field:

```javascript
import { ROLES } from '../constants/roles';

await setDoc(doc(db, 'users', userId), {
  email: email,
  name: name,
  role: ROLES.DOCTOR,                    // ✅ Primary field
  userType: 'caregiver',                  // Keep for backward compatibility
  type: 'caregiver',                      // Keep for backward compatibility
  medicalQualification: 'Doctor (MD)',   // Additional details
  // ... other fields
});
```

## 🧪 Testing

### Test Cases:

1. **Migrated Doctor (role='doctor'):**
   - ✅ Should see "New Medical Report" button
   - ✅ Should be able to create medical reports
   - ✅ Should see doctor-specific UI

2. **Legacy Doctor (medicalQualification='Doctor (MD)', no role field):**
   - ✅ Should work exactly the same as migrated doctor
   - ✅ Backward compatibility maintained

3. **Pharmacist (role='pharmacist'):**
   - ✅ Should land on prescriptions tab
   - ✅ Should see medication availability controls

4. **Nurse (role='nurse'):**
   - ✅ Should see vital signs and medication management
   - ✅ Should not see prescription writing

### Testing Commands:

```javascript
// Check a specific user's role
import { getPrimaryRole } from '../constants/roles';
console.log('User role:', getPrimaryRole(userProfile));

// Check migration status
import { getMigrationStatus } from '../utils/migrateUserRoles';
const status = await getMigrationStatus();
console.log(status);
```

## 🚨 Troubleshooting

### Issue: User can't access doctor features after migration

**Solution:**
1. Check user's Firestore document - verify `role` field is set
2. Hard refresh browser (Ctrl+Shift+R) to clear cache
3. Log out and log back in
4. Check browser console for errors

### Issue: Migration shows 0 users

**Solution:**
- Verify Firebase connection
- Check browser console for errors
- Ensure you're logged in with proper permissions

### Issue: Some users weren't migrated

**Solution:**
- Re-run migration (already-migrated users will be skipped)
- Check error logs in the migration tool
- Manually update specific users if needed

## 📝 Rollback Plan

If you need to rollback:

```javascript
// Remove migration flags (keeps role field)
const usersRef = collection(db, 'users');
const usersSnapshot = await getDocs(usersRef);

const batch = writeBatch(db);
usersSnapshot.forEach(doc => {
  batch.update(doc.ref, {
    roleMigrated: false,
    roleMigratedAt: null
  });
});
await batch.commit();
```

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review Firestore user documents
3. Test with a single user first
4. Contact development team if needed

## 🎉 Success Criteria

Migration is successful when:
- ✅ All users have `role` field set
- ✅ `roleMigrated: true` for all users
- ✅ chinyere@bulah.com can create medical reports
- ✅ All pharmacists can manage medications
- ✅ No login or permission errors
- ✅ Dashboard shows correct role-specific UI

---

**Last Updated:** October 14, 2025
**Version:** 1.0.0

