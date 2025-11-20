# Hospital Operations and Management Flow - Implementation

## Overview

The Hospital Operations and Management flow coordinates hospital operations from patient registration through their entire care journey. Every patient receives a simple, memorable patient ID, and all clinician interactions are comprehensively logged in the patient's database.

## Key Features

### 1. Simple, Memorable Patient IDs

**Format:** `UC-YYYY-NNNN` (e.g., `UC-2025-0001`)
- **UC**: UltimateCare prefix
- **YYYY**: Year of registration
- **NNNN**: Sequential number (4 digits, zero-padded)

**Institution-Specific Format:** `UC-XXXX-YYYY-NNNN` (e.g., `UC-HOSP-2025-0001`)
- For hospitals that want institution-specific numbering

**Benefits:**
- Easy to remember and communicate
- Sequential numbering for easy tracking
- Year-based organization
- Institution-specific prefixes available

### 2. Comprehensive Patient Logging System

Every interaction with a patient is logged with complete details:

**Required Information:**
- **Date and Time**: Multiple formats (ISO string, date, time, Unix timestamp)
- **Clinician Name**: Full name of the clinician
- **Clinician Role**: Doctor, Nurse, Caregiver, etc.
- **Clinician ID**: Unique identifier
- **Action**: What was performed (e.g., "vital_signs_recorded", "medication_administered")
- **Category**: Type of interaction (vital_signs, medication, consultation, care_plan, etc.)
- **Description**: Human-readable description
- **Details**: Additional structured data

**Log Storage:**
- All logs stored in `patientLogs` collection
- Linked to patient via `patientId`
- Queryable by patient, clinician, category, date range

### 3. Patient Database Structure

**Collection:** `patients`

**Key Fields:**
```javascript
{
  // Simple, memorable patient ID
  patientId: "UC-2025-0001",
  
  // Patient Information
  name: "John Doe",
  fullName: "John Doe",
  dateOfBirth: Timestamp,
  gender: "male",
  phone: "+1234567890",
  email: "john.doe@example.com",
  address: "123 Main St",
  
  // Medical Information
  medicalConditions: [],
  medications: [],
  allergies: [],
  bloodType: "O+",
  
  // Assignment
  assignedDoctor: "doctor_uid",
  assignedCaregiver: "caregiver_uid",
  assignedNurse: "nurse_uid",
  
  // Institution
  institutionId: "institution_uid",
  
  // Status
  status: "active", // active, inactive, discharged
  
  // Timestamps
  registrationDate: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastVisit: Timestamp,
  
  // Tracking
  registeredBy: "admin_uid",
  updatedBy: "clinician_uid"
}
```

## Implementation Details

### Patient Registration Flow

1. **Admin/Receptionist initiates registration**
   - Collects patient information
   - Selects institution (if applicable)

2. **System generates patient ID**
   - Calls `generatePatientId(institutionId)`
   - Returns format: `UC-YYYY-NNNN` or `UC-XXXX-YYYY-NNNN`

3. **Patient record created**
   - Creates document in `patients` collection
   - Stores both `patientId` (simple ID) and Firestore document ID
   - Sets registration date and timestamps

4. **Registration logged**
   - Automatically logs registration event
   - Captures who registered the patient
   - Stores registration method and initial data

### Clinician Logging

All clinician actions automatically log to patient's database:

**Vital Signs Recording:**
```javascript
import { logVitalSigns } from '../utils/patientLogger';

await logVitalSigns(patientId, clinicianInfo, {
  bloodPressure: "120/80",
  heartRate: 72,
  temperature: 98.6,
  weight: 180,
  notes: "Patient stable"
});
```

**Medication Administration:**
```javascript
import { logMedicationAdministered } from '../utils/patientLogger';

await logMedicationAdministered(patientId, clinicianInfo, {
  medicationName: "Aspirin",
  dosage: "100mg",
  route: "oral",
  time: new Date(),
  notes: "Given as prescribed"
});
```

**Consultation:**
```javascript
import { logConsultation } from '../utils/patientLogger';

await logConsultation(patientId, clinicianInfo, {
  type: "follow_up",
  diagnosis: "Hypertension",
  treatment: "Continue medication",
  notes: "Patient responding well"
});
```

**Care Plan Update:**
```javascript
import { logCarePlanUpdate } from '../utils/patientLogger';

await logCarePlanUpdate(patientId, clinicianInfo, {
  changes: "Updated medication schedule",
  previousPlan: {...},
  newPlan: {...}
});
```

**Profile Update:**
```javascript
import { logPatientProfileUpdate } from '../utils/patientLogger';

await logPatientProfileUpdate(patientId, clinicianInfo, {
  phone: "+1234567890",
  address: "New Address"
});
```

### Retrieving Patient Logs

**Get all logs for a patient:**
```javascript
import { getPatientLogs } from '../utils/patientLogger';

const logs = await getPatientLogs(patientId, 100); // Last 100 logs
```

**Get logs by category:**
```javascript
import { getLogsByCategory } from '../utils/patientLogger';

const vitalSignsLogs = await getLogsByCategory(patientId, 'vital_signs', 50);
const medicationLogs = await getLogsByCategory(patientId, 'medication', 50);
```

**Get logs by clinician:**
```javascript
import { getLogsByClinician } from '../utils/patientLogger';

const clinicianLogs = await getLogsByClinician(clinicianId, 100);
```

## API Functions

### Patient Management

**Create Patient:**
```javascript
import { createPatient } from '../api/patientsAPI';

const result = await createPatient(patientData, registeredBy);
// Returns: { id: "firestore_doc_id", patientId: "UC-2025-0001" }
```

**Get All Patients:**
```javascript
import { getAllPatients } from '../api/patientsAPI';

const patients = await getAllPatients(institutionId);
```

**Get Patient by Simple ID:**
```javascript
import { getPatientByPatientId } from '../api/patientsAPI';

const patient = await getPatientByPatientId("UC-2025-0001");
```

**Get Patient by Firestore ID:**
```javascript
import { getPatientById } from '../api/patientsAPI';

const patient = await getPatientById("firestore_doc_id");
```

**Update Patient:**
```javascript
import { updatePatient } from '../api/patientsAPI';

await updatePatient(patientId, updateData, updatedBy);
// Automatically logs the update
```

## Patient Log Structure

Each log entry contains:

```javascript
{
  id: "log_entry_id",
  
  // Patient reference
  patientId: "UC-2025-0001",
  
  // Clinician information (REQUIRED)
  clinicianId: "clinician_uid",
  clinicianName: "Dr. Jane Smith",
  clinicianRole: "doctor",
  clinicianEmail: "jane.smith@hospital.com",
  
  // Action details
  action: "vital_signs_recorded",
  category: "vital_signs",
  description: "Vital signs recorded: bloodPressure, heartRate, temperature",
  details: {
    bloodPressure: "120/80",
    heartRate: 72,
    temperature: 98.6
  },
  
  // Timestamp information (multiple formats)
  timestamp: Timestamp,
  date: "2025-01-15",
  time: "14:30:00",
  dateTime: "2025-01-15T14:30:00.000Z",
  unixTimestamp: 1736947800000,
  
  // Additional metadata
  institutionId: "institution_uid",
  logType: "patient_interaction",
  severity: "info", // info, warning, critical
  
  // System metadata
  createdAt: Timestamp,
  createdBy: "clinician_uid",
  source: "web_app"
}
```

## Benefits

1. **Complete Audit Trail**: Every action is logged with full context
2. **Accountability**: Clear attribution of all actions to specific clinicians
3. **Compliance**: Meets healthcare documentation requirements
4. **Traceability**: Easy to track patient history and clinician activities
5. **Simple IDs**: Easy-to-remember patient IDs improve workflow
6. **Comprehensive History**: All patient interactions in one place

## Migration Notes

- Legacy `clients` collection functions still available for backward compatibility
- New registrations use `patients` collection with simple patient IDs
- All new logging uses the comprehensive patient logger
- Existing client data can be migrated to patients collection with generated IDs

## Next Steps

1. Update UI components to use "patients" terminology
2. Integrate patient logger into all clinician action flows
3. Create patient registration UI with simple ID display
4. Build patient log viewer component
5. Add patient search by simple ID
6. Create reports based on patient logs

