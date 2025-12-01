# API Documentation

**Status:** ✅ **COMPREHENSIVE**  
**Last Updated:** 12/1/2025

---

## Overview

This document provides comprehensive documentation for all API endpoints in the ElderX healthcare platform, including request/response formats, error handling, and usage examples.

---

## API Architecture

### Error Handling

All APIs use the centralized `apiErrorHandler` utility for consistent error handling:

**Error Response Format:**
```json
{
  "error": true,
  "message": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "details": {},
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

**Success Response Format:**
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

### Request Validation

All APIs validate request parameters using the `validateAPIRequest` function:

```javascript
validateAPIRequest(params, {
  fieldName: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100
  }
});
```

---

## API Modules

### 1. Patients API (`src/api/patientsAPI.js`)

**Purpose:** Patient CRUD operations and search

**Endpoints:**

#### `createClient(patientData, registeredBy)`
- **Description:** Create a new patient record
- **Parameters:**
  - `patientData` (object): Patient information
    - `name` (string, required): Patient full name
    - `email` (string, optional): Email address
    - `phone` (string, required): Phone number
    - `dateOfBirth` (date, required): Date of birth
    - `gender` (string, required): Gender
    - `address` (string, optional): Address
    - `institutionId` (string, optional): Institution ID
  - `registeredBy` (object, optional): User who registered the patient
- **Returns:** `{ id: string, clientId: string }`
- **Errors:**
  - `VALIDATION_ERROR`: Missing required fields
  - `ALREADY_EXISTS`: Patient already exists
  - `PERMISSION_DENIED`: Insufficient permissions

#### `getClientById(clientId)`
- **Description:** Get patient by Firestore document ID
- **Parameters:**
  - `clientId` (string, required): Firestore document ID
- **Returns:** Patient object with decrypted sensitive data
- **Errors:**
  - `NOT_FOUND`: Patient not found
  - `PERMISSION_DENIED`: Insufficient permissions

#### `getPatientByPatientId(patientId)`
- **Description:** Get patient by patient ID (UC-YYYY-NNNN format)
- **Parameters:**
  - `patientId` (string, required): Patient ID (e.g., "UC-2025-0001")
- **Returns:** Patient object
- **Errors:**
  - `NOT_FOUND`: Patient not found

#### `updateClient(clientId, updateData)`
- **Description:** Update patient information
- **Parameters:**
  - `clientId` (string, required): Firestore document ID
  - `updateData` (object): Fields to update (encrypted automatically)
- **Returns:** `true` on success
- **Errors:**
  - `NOT_FOUND`: Patient not found
  - `PERMISSION_DENIED`: Insufficient permissions
  - `VALIDATION_ERROR`: Invalid update data

#### `searchPatients(searchTerm)`
- **Description:** Search patients by name, email, phone, or patient ID
- **Parameters:**
  - `searchTerm` (string, required): Search query
- **Returns:** Array of matching patients
- **Errors:**
  - `VALIDATION_ERROR`: Invalid search term
  - `PERMISSION_DENIED`: Insufficient permissions

#### `deletePatient(patientId)`
- **Description:** Delete patient record
- **Parameters:**
  - `patientId` (string, required): Firestore document ID
- **Returns:** `true` on success
- **Errors:**
  - `NOT_FOUND`: Patient not found
  - `PERMISSION_DENIED`: Insufficient permissions

**Security Features:**
- ✅ Automatic encryption of sensitive fields
- ✅ Automatic decryption on read
- ✅ Input validation and sanitization
- ✅ Query security audit

---

### 2. Consultations API (`src/api/consultationsAPI.js`)

**Purpose:** Medical consultation management

**Endpoints:**

#### `createConsultation(consultationData)`
- **Description:** Create a new consultation record
- **Parameters:**
  - `consultationData` (object, required):
    - `clientId` (string, required): Patient ID
    - `doctorId` (string, required): Doctor ID
    - `consultationType` (string, optional): Type of consultation
    - `chiefComplaint` (string, optional): Chief complaint
    - `subjective` (string, optional): Subjective findings
    - `objective` (string, optional): Objective findings
    - `assessment` (string, optional): Assessment/diagnosis
    - `plan` (string, optional): Treatment plan
    - `institutionId` (string, optional): Institution ID
- **Returns:** Consultation object with ID
- **Errors:**
  - `VALIDATION_ERROR`: Missing required fields
  - `NOT_FOUND`: Patient or doctor not found
  - `PERMISSION_DENIED`: Insufficient permissions

#### `getConsultationsByClient(clientId, limitCount)`
- **Description:** Get all consultations for a patient
- **Parameters:**
  - `clientId` (string, required): Patient ID
  - `limitCount` (number, optional): Maximum results (default: 50, max: 100)
- **Returns:** Array of consultations
- **Errors:**
  - `VALIDATION_ERROR`: Invalid parameters
  - `NOT_FOUND`: Patient not found
  - `PERMISSION_DENIED`: Insufficient permissions

#### `getConsultationById(consultationId)`
- **Description:** Get consultation by ID
- **Parameters:**
  - `consultationId` (string, required): Consultation ID
- **Returns:** Consultation object
- **Errors:**
  - `NOT_FOUND`: Consultation not found
  - `PERMISSION_DENIED`: Insufficient permissions

#### `updateConsultation(consultationId, updateData)`
- **Description:** Update consultation record
- **Parameters:**
  - `consultationId` (string, required): Consultation ID
  - `updateData` (object): Fields to update
- **Returns:** `true` on success
- **Errors:**
  - `NOT_FOUND`: Consultation not found
  - `PERMISSION_DENIED`: Insufficient permissions

**Security Features:**
- ✅ Request parameter validation
- ✅ Comprehensive error handling
- ✅ Automatic activity logging
- ✅ Notification integration

---

### 3. Authentication API

**Purpose:** User authentication and authorization

**Endpoints:** See `AUTHENTICATION_FLOW_DOCUMENTATION.md`

**Security Features:**
- ✅ Rate limiting
- ✅ Account lockout
- ✅ Secure password hashing
- ✅ Session management

---

## Error Codes

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `TIMEOUT` | 504 | Request timed out |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `NETWORK_ERROR` | 503 | Network connection error |

### Firebase Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `permission-denied` | 403 | Firestore permission denied |
| `not-found` | 404 | Document not found |
| `already-exists` | 409 | Document already exists |
| `unavailable` | 503 | Service unavailable |
| `deadline-exceeded` | 504 | Request timeout |
| `resource-exhausted` | 503 | Resource exhausted |
| `failed-precondition` | 400 | Failed precondition |
| `invalid-argument` | 400 | Invalid argument |

---

## Usage Examples

### Creating a Patient

```javascript
import { createClient } from '../api/patientsAPI';

try {
  const patient = await createClient({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    dateOfBirth: '1980-01-01',
    gender: 'male',
    address: '123 Main St',
    institutionId: 'institution-123'
  }, {
    id: 'admin-123',
    name: 'Admin User'
  });
  
  console.log('Patient created:', patient.id);
} catch (error) {
  console.error('Error:', error.message);
  // Error is automatically handled and logged
}
```

### Creating a Consultation

```javascript
import { createConsultation } from '../api/consultationsAPI';

try {
  const consultation = await createConsultation({
    clientId: 'patient-123',
    doctorId: 'doctor-456',
    consultationType: 'in-person',
    chiefComplaint: 'Headache',
    assessment: 'Migraine',
    plan: 'Prescribed pain medication'
  });
  
  console.log('Consultation created:', consultation.id);
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.error('Validation failed:', error.details.errors);
  } else {
    console.error('Error:', error.message);
  }
}
```

### Searching Patients

```javascript
import { searchPatients } from '../api/patientsAPI';

try {
  const results = await searchPatients('John');
  console.log('Found patients:', results.length);
} catch (error) {
  console.error('Search failed:', error.message);
}
```

---

## Best Practices

### For Developers

1. **Always use try-catch** when calling API functions
2. **Check error codes** to handle errors appropriately
3. **Validate input** before calling APIs
4. **Handle network errors** gracefully
5. **Use retry logic** for transient errors

### Error Handling

```javascript
import { handleAPIError, retryAPICall } from '../utils/apiErrorHandler';

try {
  const result = await retryAPICall(
    () => createClient(patientData),
    3, // max retries
    1000 // initial delay
  );
} catch (error) {
  // Error is automatically handled and logged
  // Show user-friendly message
  toast.error(error.message);
}
```

### Request Validation

```javascript
import { validateAPIRequest } from '../utils/apiErrorHandler';

// Validate before API call
validateAPIRequest(data, {
  name: { required: true, type: 'string', minLength: 1 },
  email: { required: false, type: 'string' },
  age: { required: false, type: 'number', min: 0, max: 150 }
});
```

---

## API Response Caching

**Status:** Not yet implemented

**Future Enhancement:**
- Cache frequently accessed data
- Invalidate cache on updates
- Configurable cache TTL

---

## Rate Limiting

**Status:** Implemented for authentication endpoints

**Future Enhancement:**
- Rate limiting for all API endpoints
- Per-user rate limits
- Per-endpoint rate limits

---

## Testing

### Unit Tests
- ✅ API error handling tests
- ✅ Request validation tests
- ✅ Response formatting tests

### Integration Tests
- ✅ Patient API integration tests
- ✅ Consultation API integration tests
- ✅ Authentication API integration tests

---

## Files Reference

- `src/api/patientsAPI.js` - Patient management API
- `src/api/consultationsAPI.js` - Consultation management API
- `src/utils/apiErrorHandler.js` - Centralized error handling
- `src/__tests__/integration/patientsAPI.integration.test.js` - Patient API tests
- `src/__tests__/integration/authAPI.integration.test.js` - Auth API tests

---

## Summary

✅ **Comprehensive API documentation**
- All major API endpoints documented
- Error handling standardized
- Request validation implemented
- Usage examples provided
- Best practices documented

**Security Features:**
- 🔒 Input validation
- 🔒 Error handling
- 🔒 Data encryption (for sensitive APIs)
- 🔒 Permission checks
- 🔒 Comprehensive logging

---

**Last Updated:** 12/1/2025

