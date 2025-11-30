# Required Firestore Fields for Pharmacist Display

For a user to appear in the **Pharmacist Tab** in the Institution Admin Dashboard, the user document in the `users` collection must have the following fields:

## Required Fields for Role Detection

The system checks for pharmacist role using the `hasRole()` function, which looks for:

1. **`userType`** field: Must be `'pharmacist'`
   - OR
2. **`type`** field: Must be `'pharmacist'`
   - OR
3. **`roles`** array: Must include `'pharmacist'`

**At least ONE of these must be set correctly.**

## Required Fields for Active Status

The system checks if user is active using the `isUserActive()` function, which requires:

1. **`status`** field: Must NOT be `'deleted'`
   - Can be: `'active'`, `'pending'`, `'inactive'`, `'suspended'`, or undefined/null
   - Must NOT be: `'deleted'`

2. **`active`** field: Must NOT be `false`
   - Can be: `true` or undefined/null (defaults to active)
   - Must NOT be: `false`

3. **`isActive`** field: Must NOT be `false`
   - Can be: `true` or undefined/null (defaults to active)
   - Must NOT be: `false`

## Required Field for Institution Filtering

4. **`institutionId`** field: Must match the current institution ID
   - This ensures the pharmacist only appears for the correct institution

## Complete Example Document Structure

Here's a complete example of a pharmacist document in Firestore:

```javascript
{
  // Identity fields
  id: "user-uid-here",
  uid: "user-uid-here",
  email: "pharmacist@example.com",
  name: "John Pharmacist",
  displayName: "John Pharmacist",
  firstName: "John",
  lastName: "Pharmacist",
  
  // REQUIRED: Role fields (at least one must be set)
  userType: "pharmacist",        // ✅ Required
  type: "pharmacist",            // ✅ Required (for legacy support)
  role: "pharmacist",            // Optional (for legacy support)
  roles: ["pharmacist"],         // ✅ Required (array format)
  
  // REQUIRED: Active status fields
  status: "active",              // ✅ Required (must not be 'deleted')
  isActive: true,                // ✅ Required (must not be false)
  active: true,                  // Optional (must not be false if present)
  
  // REQUIRED: Institution field
  institutionId: "ng2Scy0MNbwidmJGItYo",  // ✅ Required (must match current institution)
  
  // Optional but recommended fields
  phone: "+1234567890",
  licenseNumber: "PH123456",
  specialization: "General Pharmacy",
  medicalQualification: "Pharmacist",
  accountType: "institution_created",
  onboardingComplete: false,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "admin-uid"
}
```

## Quick Fix for Existing Pharmacist

If you have a pharmacist that's not showing up, update their document in Firestore with:

```javascript
{
  userType: "pharmacist",
  type: "pharmacist",
  roles: ["pharmacist"],
  status: "active",
  isActive: true,
  institutionId: "your-institution-id-here"
}
```

## Field Priority

The system checks in this order:
1. `userType === 'pharmacist'` → ✅ Match
2. `type === 'pharmacist'` → ✅ Match
3. `roles.includes('pharmacist')` → ✅ Match

If any of these match AND the user is active (not deleted, active/isActive not false), they will appear in the pharmacist tab.

## Common Issues

1. **Missing `roles` array**: If only `userType` or `type` is set, it should work, but having `roles: ['pharmacist']` ensures compatibility.

2. **Wrong `institutionId`**: The pharmacist must have the same `institutionId` as the admin viewing the dashboard.

3. **`status: 'deleted'`**: Even if all role fields are correct, a deleted status will hide the pharmacist.

4. **`active: false` or `isActive: false`**: These will prevent the pharmacist from appearing even if role fields are correct.

