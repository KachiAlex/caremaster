# Pharmacist Role Protection - Ensuring Pharmacists Never Get 'Elderly' Role

## Problem
Pharmacists were being assigned the 'elderly' role, which should only be for clients. This was happening because:
1. Firebase Auth trigger (`createUserProfile`) defaults all new users to 'elderly'
2. Race condition between Auth trigger and our creation code
3. Role detection logic was prioritizing 'elderly' when both roles were present

## Solution - Multiple Safeguards

### 1. Firebase Auth Trigger Protection (`functions/src/userManagement.ts`)
The `createUserProfile` function now:
- **Checks for existing profile** before creating default 'elderly' profile
- **Never overwrites staff roles**: If user has `userType` of 'pharmacist', 'caregiver', 'doctor', 'nurse', or 'admin', it skips profile creation
- **Checks roles array**: If roles array contains any staff role, it skips profile creation
- **Checks institutionId**: If user has `institutionId`, they're institution staff - skips 'elderly' default
- **Only creates 'elderly' profile** for standalone client signups (no institutionId, no staff roles)

### 2. Creation Path Protection
All pharmacist creation paths explicitly set role fields:
- `handleAddPharmacist` in `InstitutionAdminDashboard.js`: Sets `userType: 'pharmacist'`, `type: 'pharmacist'`, `role: 'pharmacist'`, `roles: ['pharmacist']`
- `createInstitutionUser` cloud function: Sets all role fields correctly
- `createCaregiverWithAuth` cloud function: Sets all role fields correctly
- `userCreationHelper.js`: Uses `USER_TYPE_MAPPINGS` which has pharmacist mapped correctly

### 3. UserContext Auto-Fix (`src/contexts/UserContext.js`)
When a pharmacist logs in, the system:
- **Detects pharmacist role** from multiple fields (`userType`, `type`, `role`, `roles` array)
- **Prioritizes pharmacist** over 'elderly' in roles array
- **Removes 'elderly'** from roles array if present
- **Auto-fixes Firestore** if pharmacist has 'elderly' in any role field
- **Checks for 'elderly' contamination**: Detects if `userType`, `type`, or `roles` contains 'elderly' and fixes it

### 4. Role Priority Sorting
When a user has multiple roles (e.g., `['elderly', 'pharmacist']`):
- System prioritizes roles: `admin > pharmacist > doctor > nurse > caregiver > elderly/client`
- Pharmacist is always prioritized over 'elderly'
- Roles array is reordered to put pharmacist first

## Protection Layers

```
Layer 1: Creation Time
├── All creation paths explicitly set pharmacist role
├── Firebase Auth trigger checks for staff roles before defaulting
└── setDoc (not merge) ensures we overwrite any defaults

Layer 2: Login Time
├── Role detection prioritizes pharmacist
├── Auto-fix removes 'elderly' from roles array
└── Firestore is updated if 'elderly' is detected

Layer 3: Runtime
├── Role priority sorting ensures pharmacist is primary
└── Safeguards check for 'elderly' contamination
```

## Who Gets 'Elderly' Role?

**ONLY** standalone clients who:
- Sign up directly (not through institution)
- Have NO `institutionId`
- Have NO staff roles in their profile
- Are NOT created through admin/institution creation flows

**NEVER** gets 'elderly' role:
- Pharmacists (always 'pharmacist')
- Caregivers (always 'caregiver')
- Doctors (always 'doctor')
- Nurses (always 'nurse')
- Admins (always 'admin')
- Any user with `institutionId`

## Testing Checklist

When creating a new pharmacist, verify:
- [ ] `userType: 'pharmacist'` (not 'elderly')
- [ ] `type: 'pharmacist'` (not 'elderly')
- [ ] `role: 'pharmacist'` (not 'elderly')
- [ ] `roles: ['pharmacist']` (does NOT include 'elderly')
- [ ] `institutionId` is set
- [ ] `isActive: true` and `active: true`
- [ ] Pharmacist appears in Pharmacist tab
- [ ] Pharmacist can log in and access pharmacy dashboard

## Migration Note

Existing pharmacists that have 'elderly' in their roles will be auto-fixed on their next login. The system will:
1. Detect pharmacist role
2. Remove 'elderly' from roles array
3. Update Firestore with correct role fields
4. Set pharmacist as primary role

