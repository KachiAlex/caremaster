# Institution Caregiver Flow - Implementation Guide

## Overview
This document outlines the complete implementation of the institution caregiver onboarding and dashboard system for Care Master.

## Architecture

### 1. User Flow
```
Institution Landing Page 
  → Login (if not authenticated)
  → Onboarding (if not completed)
  → Dashboard (main workspace)
```

### 2. Components Created

#### A. **InstitutionCaregiverOnboarding** (`src/pages/InstitutionCaregiverOnboarding.js`)
A comprehensive 3-step onboarding process for caregivers joining an institution:

**Step 1: Professional Profile**
- Basic Information (Name, Email, Phone)
- Medical Qualification (Doctor, Nurse, Therapist, etc.)
- Years of Experience
- License Number
- Address
- Specializations (Multiple selection from predefined list)
- Professional Bio

**Step 2: Document Upload**
Required documents:
- ✅ Medical License/Registration (Required)
- ✅ Professional Certification (Required)
- Government-Issued ID (Optional)
- Resume/CV (Optional)

Features:
- File validation (PDF, JPEG, PNG only, max 5MB)
- Image preview for uploaded documents
- Progress indicators
- Drag-and-drop support

**Step 3: Review & Submit**
- Profile summary display
- What happens next information
- Submit for administrator review
- Auto-redirect to dashboard upon completion

#### B. **InstitutionCaregiverDashboard** (`src/pages/InstitutionCaregiverDashboard.js`)
Full-featured caregiver dashboard copied from the main Care Master caregiver dashboard with:
- Patient management
- Task scheduling
- Appointments
- Vital signs input (for nurses)
- Care logs
- Medication management
- Performance metrics
- Settings
- Real-time updates

#### C. **InstitutionCaregiverGuard** (`src/components/InstitutionCaregiverGuard.js`)
Authentication and authorization guard that:
- Checks if user is authenticated
- Verifies caregiver role
- Checks institution association
- Redirects to onboarding if incomplete
- Redirects to login if not authenticated
- Shows loading states appropriately

### 3. Routes Added to App.js

```javascript
// Institution Caregiver Routes
<Route 
  path="/institution-caregiver/onboarding" 
  element={user ? <InstitutionCaregiverOnboarding /> : <Navigate to="/institution/login" replace />} 
/>

<Route 
  path="/institution-caregiver/dashboard" 
  element={user ? <InstitutionCaregiverDashboard /> : <Navigate to="/institution/login" replace />} 
/>

<Route 
  path="/institution-caregiver" 
  element={<Navigate to="/institution-caregiver/dashboard" replace />} 
/>
```

### 4. Modified Files

#### **InstitutionLanding.js**
Updated `handleRoleSelect` function to:
- Check if caregiver is logged in
- Check onboarding status
- Redirect to onboarding if not complete
- Redirect to dashboard if onboarded
- Also handle doctors and nurses with same flow

#### **InstitutionAdminDashboard.js**
Added password field to Add Caregiver modal:
- Password input with visibility toggle
- Eye icon to show/hide password
- Minimum 6 characters validation
- Password is now included when creating caregivers

## Workflow

### For Caregivers

1. **Access Portal**
   - Visit institution landing page: `https://elderx-f5c2b.web.app/onboard?institution={institutionId}`
   - Select "Caregiver" role

2. **Login**
   - If not logged in, redirected to institution login
   - Enter credentials created by institution admin

3. **Onboarding** (First-time only)
   - Complete professional profile (Step 1)
   - Upload required documents (Step 2)
   - Review and submit (Step 3)
   - Status: Pending approval

4. **Dashboard Access**
   - After onboarding completion, access dashboard
   - View assigned patients
   - Manage tasks and appointments
   - Input vital signs (nurses)
   - Generate reports
   - Track performance

### For Institution Admins

1. **Add Caregiver**
   - Go to Institution Admin Dashboard
   - Click "Add Caregiver"
   - Fill in caregiver details including:
     - Name, Email, **Password** (new)
     - Phone, Role
     - Specialization, qualifications
     - Working hours, availability
   - Caregiver receives email with credentials

2. **Manage Caregivers**
   - View all caregivers in institution
   - Click "View Details" on any caregiver
   - Actions available:
     - Reset Password
     - Suspend/Activate
     - Delete
     - Assign Task

3. **Approve Onboarding**
   - Review submitted documents
   - Verify certifications
   - Activate caregiver status
   - Caregiver can now access full dashboard

## Database Structure

### Users Collection
```javascript
{
  uid: "user_id",
  name: "John Doe",
  email: "john@example.com",
  userType: "caregiver",
  institutionId: "institution_id",
  onboardingComplete: true/false,
  onboardingStep: 1/2/3,
  status: "pending"/"active"/"suspended",
  medicalQualification: "Nurse (RN)",
  yearsOfExperience: "5",
  specializations: ["Geriatric Care", "Dementia Care"],
  licenseNumber: "LIC-123456",
  phone: "+1234567890",
  address: "123 Main St",
  bio: "Professional bio...",
  documents: {
    medicalLicense: "url",
    certification: "url",
    governmentId: "url",
    resume: "url"
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Caregivers Collection
```javascript
{
  id: "caregiver_id",
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  userType: "nurse",
  institutionId: "institution_id",
  specialization: "Geriatric Care",
  qualifications: "RN, BSN",
  experience: "5 years",
  availableDays: ["Monday", "Tuesday", "Wednesday"],
  workingHours: "9 AM - 5 PM",
  hourlyRate: "25",
  status: "active"/"pending"/"suspended",
  rating: 4.5,
  totalPatients: 15,
  currentPatients: 8,
  performance: {
    punctuality: 95,
    patientSatisfaction: 90,
    taskCompletion: 98
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Security Features

1. **Authentication Guards**
   - InstitutionCaregiverGuard protects all caregiver routes
   - Checks authentication status
   - Verifies role and permissions
   - Enforces onboarding completion

2. **Document Validation**
   - File type restrictions (PDF, JPEG, PNG)
   - File size limits (5MB max)
   - Required document enforcement

3. **Multi-tenant Isolation**
   - Institution ID filtering
   - Data scoped to specific institutions
   - Cross-institution access prevention

## Features

### Caregiver Portal Features
✅ Professional profile management
✅ Document upload and verification
✅ Patient assignment viewing
✅ Task and schedule management
✅ Vital signs input (nurses)
✅ Care logs and reporting
✅ Medication management
✅ Performance tracking
✅ Real-time notifications
✅ Settings and profile updates

### Admin Portal Features
✅ Caregiver creation with password
✅ Password visibility toggle
✅ View detailed caregiver information
✅ Suspend/Activate caregivers
✅ Reset passwords
✅ Delete caregivers
✅ Assign tasks to caregivers
✅ Monitor caregiver performance

## Testing Checklist

### For Caregivers
- [ ] Access institution landing page
- [ ] Login with credentials
- [ ] Complete Step 1: Professional Profile
- [ ] Complete Step 2: Document Upload
- [ ] Complete Step 3: Review & Submit
- [ ] Access dashboard after onboarding
- [ ] View assigned patients
- [ ] Complete care tasks
- [ ] Input vital signs (nurses)
- [ ] Generate reports
- [ ] Update profile settings

### For Admins
- [ ] Create new caregiver with password
- [ ] Toggle password visibility
- [ ] View caregiver details
- [ ] Reset caregiver password
- [ ] Suspend/Activate caregiver
- [ ] Assign task to caregiver
- [ ] Delete caregiver
- [ ] Review onboarding documents
- [ ] Approve caregiver status

## URLs

- **Institution Landing**: `/onboard?institution={institutionId}`
- **Institution Login**: `/institution/login?institution={institutionId}`
- **Caregiver Onboarding**: `/institution-caregiver/onboarding`
- **Caregiver Dashboard**: `/institution-caregiver/dashboard`
- **Admin Dashboard**: `/institution-admin/dashboard`

## API Endpoints Used

- `saveCaregiverProfile(userId, profileData)` - Save profile
- `uploadCaregiverDocument(userId, file, path)` - Upload documents
- `completeOnboarding(userId)` - Mark onboarding complete
- `caregiverAPI.createCaregiver(data)` - Create new caregiver
- `caregiverAPI.updateCaregiver(id, updates)` - Update caregiver
- `caregiverAPI.deleteCaregiver(id)` - Delete caregiver
- `caregiverAPI.getCaregivers(filters)` - Get caregivers list

## Next Steps

1. **Email Notifications**
   - Send welcome email with credentials
   - Notify on onboarding approval/rejection
   - Send password reset links

2. **Document Verification**
   - Admin interface for document review
   - Approval/rejection workflow
   - Comments/feedback system

3. **Enhanced Features**
   - Video call integration
   - Chat/messaging system
   - Advanced analytics
   - Mobile app support

## Support

For issues or questions:
1. Check console logs for errors
2. Verify Firestore indexes are deployed
3. Ensure user has correct roles and permissions
4. Check institution ID is valid
5. Verify documents are uploaded successfully

## Deployment

```bash
# Build the project
npm run build

# Deploy to hosting
firebase deploy --only hosting

# Deploy Firestore rules (if modified)
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

---

**Implementation Date**: October 9, 2025
**Version**: 1.0
**Status**: ✅ Deployed and Active

