# User Creation Fields Standardization - Complete Fix

## Summary
All user creation paths have been updated to ensure that every user (pharmacist, caregiver, doctor, nurse) is created with all required fields for proper filtering and display in their respective tabs.

## Required Fields for All Users

Every user created must have these fields set:

### Role Fields (at least one required, but all three are set for compatibility)
- `userType`: The primary role (e.g., 'pharmacist', 'caregiver', 'doctor', 'nurse')
- `type`: Same as userType (for legacy support)
- `role`: Same as userType (for legacy support)
- `roles`: Array containing the role(s) (e.g., `['pharmacist']`, `['doctor', 'caregiver']`)

### Active Status Fields (all must be set correctly)
- `status`: Must NOT be `'deleted'` (can be `'active'`, `'pending'`, `'inactive'`, `'suspended'`, or undefined)
- `isActive`: Must be `true` or undefined (must NOT be `false`)
- `active`: Must be `true` or undefined (must NOT be `false`)

### Institution Field
- `institutionId`: Must match the institution ID where the user belongs

## Files Updated

### 1. `elderx/src/pages/InstitutionAdminDashboard.js`
- **handleAddPharmacist**: Now sets `roles: ['pharmacist']`, `isActive: true`, `active: true`
- **handleAddCaregiver**: Now sets `roles: ['caregiver']`, `isActive: true`, `active: true`

### 2. `elderx/src/utils/userCreationHelper.js`
- **createStandardizedUserData**: Now sets `active: true` in addition to `isActive: true`
- This helper is used by `AddCaregiverModal` and fallback creation paths

### 3. `elderx/functions/src/caregiverManagement.ts`
- **createCaregiverWithAuth**: Now sets all required fields:
  - Role fields: `userType`, `type`, `role`, `roles` array
  - Active fields: `status: 'pending'`, `isActive: true`, `active: true`
  - Institution field: `institutionId`
  - Properly determines roles array based on userType (doctor, nurse, pharmacist, caregiver)

### 4. `elderx/functions/src/institutionUserManagement.ts`
- **createInstitutionUser**: Already had most fields, now explicitly sets `active: true`
  - This function is used by `InstitutionUserCreationModal` for creating all user types

## Role-Specific Field Mappings

### Pharmacist
```javascript
{
  userType: 'pharmacist',
  type: 'pharmacist',
  role: 'pharmacist',
  roles: ['pharmacist'],
  status: 'active',
  isActive: true,
  active: true
}
```

### Caregiver
```javascript
{
  userType: 'caregiver',
  type: 'caregiver',
  role: 'caregiver',
  roles: ['caregiver'],
  status: 'pending' or 'active',
  isActive: true,
  active: true
}
```

### Doctor
```javascript
{
  userType: 'doctor',
  type: 'doctor',
  role: 'doctor',
  roles: ['doctor', 'caregiver'], // Doctors can also be caregivers
  status: 'active',
  isActive: true,
  active: true
}
```

### Nurse
```javascript
{
  userType: 'nurse',
  type: 'nurse',
  role: 'nurse',
  roles: ['nurse', 'caregiver'], // Nurses can also be caregivers
  status: 'active',
  isActive: true,
  active: true
}
```

## Creation Paths Covered

1. ✅ **InstitutionUserCreationModal** → `createInstitutionUserFunction` (cloud function)
   - Creates: caregivers, nurses, doctors, pharmacists
   - All fields now properly set

2. ✅ **handleAddPharmacist** (direct Firestore creation)
   - Creates: pharmacists
   - All fields now properly set

3. ✅ **handleAddCaregiver** → `createCaregiverWithAuthFunction` (cloud function)
   - Creates: caregivers
   - All fields now properly set

4. ✅ **AddCaregiverModal** → `createCompleteUserAccount` (helper)
   - Creates: caregivers, nurses, doctors, pharmacists
   - All fields now properly set via helper

## Testing Checklist

After deployment, verify:
- [ ] New pharmacists appear in Pharmacist tab
- [ ] New caregivers appear in Caregivers tab
- [ ] New doctors appear in Doctors tab (if applicable)
- [ ] New nurses appear in Nurses tab (if applicable)
- [ ] All users have correct `roles` array in Firestore
- [ ] All users have `isActive: true` and `active: true` in Firestore
- [ ] All users have correct `institutionId` in Firestore

## Migration Note

Existing users that were created before this fix may need to be updated manually in Firestore if they're not appearing in their respective tabs. Use the field mappings above to update them.

