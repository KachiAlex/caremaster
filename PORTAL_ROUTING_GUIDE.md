# ElderX Portal Routing Guide

## 🏠 Landing Page Routes

### Main Landing Page
- **URL**: `/` or `https://elderx-f5c2b.web.app`
- **Button**: "Institution Portal"
- **Destination**: `/institution` (Institution Landing Page)

### Institution Landing Page
- **URL**: `/institution` or `/onboard`
- **Purpose**: Role selection for institution staff
- **Options**:
  - Admin Portal → `/institution/login?institution={ID}&role=admin`
  - Caregiver Portal → `/institution/login?institution={ID}&role=caregiver`
  - Pharmacist Portal → `/institution/login?institution={ID}&role=pharmacist`

---

## 🔐 Login Routes

### Institution Login
- **URL Pattern**: `/institution/login?institution={ID}&role={ROLE}`
- **Roles**: `admin`, `caregiver`, `doctor`, `nurse`, `pharmacist`
- **After Login**: Auto-redirects to appropriate dashboard

---

## 📊 Dashboard Routes

### Admin Dashboard
- **URL**: `/institution-admin/dashboard?institution={ID}`
- **Who**: Institution administrators
- **Access**: Users with `userType: 'admin'` or `role: 'admin'`

### Caregiver Dashboard
- **URL**: `/institution-caregiver/dashboard?institution={ID}`
- **Who**: Caregivers, Doctors, Nurses
- **Access**: Users with `userType: 'caregiver'`, `'doctor'`, or `'nurse'`

### Pharmacy Dashboard
- **URL**: `/institution-pharmacy/dashboard?institution={ID}`
- **Who**: Pharmacists
- **Access**: Users with `userType: 'pharmacist'`

---

## 🔄 Auto-Redirects

### After Login
- **Admin** → `/institution-admin/dashboard?institution={ID}`
- **Caregiver/Doctor/Nurse** → `/institution-caregiver/dashboard?institution={ID}`
- **Pharmacist** → `/institution-pharmacy/dashboard?institution={ID}`

### Legacy Redirects
- `/dashboard` → `/institution-admin/dashboard`
- `/institution-caregiver` → `/institution-caregiver/dashboard`

---

## 🛡️ Multi-Tab Session Management

### How It Works
Each browser tab maintains its own session using `sessionStorage`:
- Stores expected role, user ID, and institution ID
- Validates on every page load
- Detects conflicts when Firebase auth changes in another tab

### Conflict Detection
1. **Same user, different role**: Auto-redirects to new role's dashboard
2. **Different user**: Logs out and redirects to login
3. **No conflict**: Dashboard loads normally

### Examples

**Scenario 1: Different Roles, Same User**
```
Tab 1: Admin logged in
Tab 2: Login as Caregiver (same email)
Result: Tab 1 shows warning, redirects to caregiver dashboard
```

**Scenario 2: Different Users**
```
Tab 1: User A (Admin) logged in
Tab 2: Login as User B (Admin)
Result: Tab 1 logs out, shows error, redirects to login
```

---

## 🎯 Correct Navigation Flow

### From Main Website
1. User visits `https://elderx-f5c2b.web.app`
2. Clicks "Institution Portal" button
3. Goes to `/institution` (Institution Landing)
4. Selects role (Admin/Caregiver/Pharmacist)
5. Goes to `/institution/login?institution={ID}&role={ROLE}`
6. Logs in
7. Redirected to role-specific dashboard

### Direct Access
- Users can bookmark dashboard URLs
- Each tab validates session independently
- Conflicts auto-detected and resolved

---

## 📝 Notes

- All institution staff use `/institution` as entry point
- Role selection happens on Institution Landing page
- Each role has its own dedicated dashboard
- Multi-tab conflicts are automatically handled
- Session is tab-specific (not global)

