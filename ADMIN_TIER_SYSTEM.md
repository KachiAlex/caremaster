# Admin Tier System

## Overview
Implemented a tiered administrator system with Primary and Secondary admins to provide better access control and security for production deployment.

## Problem
In production, clients need multiple administrators for redundancy and delegation, but we need to ensure:
- At least one admin account cannot be accidentally deleted
- Lower-tier admins can manage day-to-day operations
- Security is maintained with role-based restrictions

## Solution

### Admin Tiers

#### 1. **Primary Administrator** 🔒
- **Highest level** of administrative access
- **Cannot be deleted** by any user (including other primary admins)
- **Cannot be suspended**
- Full access to all features
- Intended for institution owner or main administrator
- Visual indicator: Red "🔒 PRIMARY" badge

**User Document Fields:**
```javascript
{
  userType: 'admin',
  type: 'admin',
  role: 'admin',
  roles: ['admin', 'primary-admin'],
  adminTier: 'primary',
  isPrimaryAdmin: true,
  cannotBeDeleted: true
}
```

#### 2. **Secondary Administrator** 👤
- **Full administrative access**
- Can perform all admin functions EXCEPT:
  - Cannot delete primary administrators
  - Cannot suspend primary administrators
- Can be deleted or suspended by primary admins
- Intended for delegated administrators
- Visual indicator: Yellow "👤 SECONDARY" badge

**User Document Fields:**
```javascript
{
  userType: 'admin',
  type: 'admin',
  role: 'admin',
  roles: ['admin', 'secondary-admin'],
  adminTier: 'secondary'
}
```

## Features

### 1. Protection Mechanisms

#### Delete Protection
```javascript
// In handleDeleteUser()
if (user?.isPrimaryAdmin || user?.adminTier === 'primary' || 
    user?.roles?.includes('primary-admin') || user?.cannotBeDeleted) {
  toast.error('❌ Primary administrators cannot be deleted for security reasons');
  return;
}
```

#### Suspension Protection
```javascript
// In handleToggleStatus()
if (user.isPrimaryAdmin || user.adminTier === 'primary' || 
    user.roles?.includes('primary-admin')) {
  toast.error('❌ Primary administrators cannot be suspended');
  return;
}
```

### 2. Visual Indicators

#### User Management Table
- **Primary Admin**: 🔒 PRIMARY badge (red, bordered)
- **Secondary Admin**: 👤 SECONDARY badge (yellow, bordered)
- **Disabled buttons**: Grayed out delete/suspend buttons for primary admins
- **Tooltips**: Clear explanation when hovering over disabled buttons

#### User Creation Modal
- **Different info boxes** for primary vs secondary admins
- **Warning message** for primary admin creation
- **Clear role descriptions** in dropdown

### 3. UI/UX Enhancements

#### Button States
```javascript
// Delete button for primary admin
<button
  disabled={isPrimaryAdmin}
  className="text-gray-300 cursor-not-allowed"
  title="🔒 Primary admin cannot be deleted"
>
  <Trash2 className="h-4 w-4" />
</button>
```

#### Role Badges
```javascript
{user.adminTier === 'primary' && (
  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-300">
    🔒 PRIMARY
  </span>
)}
```

## Usage Guide

### Creating Primary Admin (Institution Owner)
1. Navigate to User Management
2. Click "Invite User"
3. Select "Administrator (Primary)"
4. Fill in details
5. Click "Create User"

**Result:** Admin account with full protection - cannot be deleted or suspended

### Creating Secondary Admin (Delegated Admin)
1. Navigate to User Management
2. Click "Invite User"
3. Select "Administrator (Secondary)"
4. Fill in details
5. Click "Create User"

**Result:** Admin account with full access but can be managed by primary admin

## Best Practices

### Recommended Setup
1. **One Primary Admin**: The institution owner/main contact
2. **Multiple Secondary Admins**: For daily operations, different departments, or backup

### Security Considerations
- ✅ Always create at least one primary admin first
- ✅ Use secondary admins for delegated access
- ✅ Primary admin credentials should be securely stored
- ✅ Regular audit of admin accounts
- ⚠️ Don't create too many primary admins (defeats the purpose)

## Implementation Details

### Files Modified

1. **`src/utils/userCreationHelper.js`**
   - Added `primary-admin` and `secondary-admin` to USER_TYPE_MAPPINGS
   - Set `cannotBeDeleted: true` for primary admins
   - Added adminTier field to user documents

2. **`src/components/InstitutionUserCreationModal.js`**
   - Updated user types dropdown with admin tiers
   - Added conditional warning messages
   - Color-coded info boxes (red for primary, blue for secondary)

3. **`src/components/UserManagement.js`**
   - Added protection in `handleDeleteUser()`
   - Added protection in `handleToggleStatus()`
   - Visual tier badges in role column
   - Disabled delete/suspend buttons for primary admins

4. **`src/pages/InstitutionUserManagement.js`**
   - Same protections as UserManagement.js
   - Visual tier badges
   - Disabled buttons with tooltips
   - Added all user types to filter dropdown

## Testing Checklist

- [ ] Create a primary admin
  - Verify `adminTier: 'primary'` in Firestore
  - Verify `cannotBeDeleted: true`
  - Verify `roles: ['admin', 'primary-admin']`

- [ ] Try to delete primary admin
  - Verify error message appears
  - Verify deletion is blocked
  - Verify button is disabled/grayed out

- [ ] Try to suspend primary admin
  - Verify error message appears
  - Verify suspension is blocked

- [ ] Create a secondary admin
  - Verify `adminTier: 'secondary'` in Firestore
  - Verify `roles: ['admin', 'secondary-admin']`
  - Can be deleted/suspended

- [ ] Visual indicators
  - Primary admin shows 🔒 PRIMARY badge
  - Secondary admin shows 👤 SECONDARY badge
  - Delete button is disabled for primary admin
  - Tooltips explain restrictions

## Example Scenarios

### Scenario 1: Initial Setup
```
Step 1: Owner creates their account as Primary Admin
  → Protected from deletion
  
Step 2: Owner creates Secondary Admin for HR manager
  → Can manage users but not delete owner

Step 3: Owner creates Secondary Admin for nursing supervisor
  → Can manage nursing staff

Step 4: HR manager tries to delete owner account
  → Blocked with error message
```

### Scenario 2: Admin Transition
```
Step 1: Current primary admin wants to transfer ownership
  → Can create new primary admin
  → Institution now has 2 primary admins

Step 2: Old admin can be deleted ONLY if not last primary admin
  → System prevents deleting last admin
```

## API Functions

### Creating Admin Users
```javascript
import { createCompleteUserAccount } from '../utils/userCreationHelper';

// Create primary admin
const result = await createCompleteUserAccount({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@hospital.com',
  userType: 'primary-admin' // Important!
}, {
  institutionId: 'inst_123',
  createdBy: 'current_admin_uid'
});

// Creates user with:
// - userType: 'admin'
// - adminTier: 'primary'
// - isPrimaryAdmin: true
// - cannotBeDeleted: true
// - roles: ['admin', 'primary-admin']
```

## Security Features

✅ **Deletion Protection** - Primary admins cannot be deleted  
✅ **Suspension Protection** - Primary admins cannot be suspended  
✅ **Visual Indicators** - Clear badges show admin tiers  
✅ **Disabled Actions** - Buttons are disabled with explanatory tooltips  
✅ **Multiple Checks** - Checks isPrimaryAdmin, adminTier, roles array, cannotBeDeleted  
✅ **Error Messages** - Clear feedback when restricted actions are attempted  

## Conclusion

The tiered admin system provides:
- **Production Safety**: Primary admin account cannot be accidentally deleted
- **Delegation**: Secondary admins can handle day-to-day operations
- **Flexibility**: Multiple admins possible while maintaining security
- **Clear Hierarchy**: Visual indicators show who has what level of access
- **User-Friendly**: Disabled buttons and tooltips explain restrictions

**Your client can now safely delegate admin access without risking account lockouts!** 🎉

