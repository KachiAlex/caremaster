/**
 * Client Logger Utility
 * 
 * Comprehensive logging system for all Client interactions
 * Every log includes:
 * - Date and time
 * - Clinician name
 * - Clinician role
 * - Action performed
 * - Details
 * 
 * All logs are stored in the Client's database
 */

import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';

const PATIENT_LOGS_COLLECTION = 'patientLogs';

/**
 * Log a Client interaction
 * @param {Object} logData - Log data
 * @param {string} logData.clientId - Client ID
 * @param {string} logData.clinicianId - Clinician user ID
 * @param {string} logData.clinicianName - Clinician full name
 * @param {string} logData.clinicianRole - Clinician role (doctor, nurse, caregiver, etc.)
 * @param {string} logData.action - Action performed (e.g., "vital_signs_recorded", "medication_administered")
 * @param {string} logData.category - Category (e.g., "vital_signs", "medication", "consultation", "care_plan")
 * @param {string} logData.description - Human-readable description
 * @param {Object} logData.details - Additional details (optional)
 * @param {string} logData.institutionId - Institution ID (optional)
 * @returns {Promise<string>} - Log entry ID
 */
export async function logPatientInteraction(logData) {
  try {
    const {
      clientId,
      clinicianId,
      clinicianName,
      clinicianRole,
      action,
      category,
      description,
      details = {},
      institutionId = null
    } = logData;

    // Validate required fields
    if (!clientId || !clinicianId || !clinicianName || !clinicianRole || !action) {
      throw new Error('Missing required log fields: clientId, clinicianId, clinicianName, clinicianRole, action');
    }

    const now = new Date();
    
    const logEntry = {
      // Client reference
      clientId,
      
      // Clinician information (required for all logs)
      clinicianId,
      clinicianName,
      clinicianRole,
      clinicianEmail: logData.clinicianEmail || null,
      
      // Action details
      action,
      category: category || 'general',
      description: description || action,
      details,
      
      // Timestamp information (multiple formats for flexibility)
      timestamp: serverTimestamp(),
      date: now.toISOString().split('T')[0], // YYYY-MM-DD
      time: now.toTimeString().split(' ')[0], // HH:MM:SS
      dateTime: now.toISOString(), // Full ISO string
      unixTimestamp: now.getTime(),
      
      // Additional metadata
      institutionId,
      logType: 'patient_interaction',
      severity: logData.severity || 'info', // info, warning, critical
      
      // System metadata
      createdAt: serverTimestamp(),
      createdBy: clinicianId,
      source: logData.source || 'web_app'
    };

    // Add log to Client logs collection
    const logsRef = collection(db, PATIENT_LOGS_COLLECTION);
    const docRef = await addDoc(logsRef, logEntry);
    
    console.log(`✅ Client log created: ${action} by ${clinicianName} (${clinicianRole}) for Client ${clientId}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error logging Client interaction:', error);
    throw error;
  }
}

/**
 * Log vital signs recording
 */
export async function logVitalSigns(clientId, clinicianInfo, vitalSignsData) {
  // Build description with actual values
  const type = vitalSignsData.type || 'Vital signs';
  const value = vitalSignsData.value || '';
  const unit = vitalSignsData.unit || '';
  const status = vitalSignsData.status || '';
  
  let description = `${type}`;
  if (value) {
    description += `: ${value}`;
    if (unit) {
      description += ` ${unit}`;
    }
  }
  if (status) {
    description += ` (${status})`;
  }
  
  return await logPatientInteraction({
    clientId,
    clinicianId: clinicianInfo.id || clinicianInfo.uid,
    clinicianName: clinicianInfo.name || clinicianInfo.displayName,
    clinicianRole: clinicianInfo.role || clinicianInfo.userType,
    clinicianEmail: clinicianInfo.email,
    action: 'vital_signs_recorded',
    category: 'vital_signs',
    description: description || 'Vital signs recorded',
    details: vitalSignsData,
    institutionId: clinicianInfo.institutionId
  });
}

/**
 * Log medication administration
 */
export async function logMedicationAdministered(clientId, clinicianInfo, medicationData) {
  return await logPatientInteraction({
    clientId,
    clinicianId: clinicianInfo.id || clinicianInfo.uid,
    clinicianName: clinicianInfo.name || clinicianInfo.displayName,
    clinicianRole: clinicianInfo.role || clinicianInfo.userType,
    clinicianEmail: clinicianInfo.email,
    action: 'medication_administered',
    category: 'medication',
    description: `Medication administered: ${medicationData.medicationName || 'Unknown'}`,
    details: medicationData,
    institutionId: clinicianInfo.institutionId
  });
}

/**
 * Log consultation
 */
export async function logConsultation(clientId, clinicianInfo, consultationData) {
  // Build description with consultation details
  const consultationType = consultationData.consultationType || consultationData.type || 'General consultation';
  let description = `Consultation: ${consultationType}`;
  
  if (consultationData.chiefComplaint) {
    description += ` - ${consultationData.chiefComplaint}`;
  }
  
  return await logPatientInteraction({
    clientId,
    clinicianId: clinicianInfo.id || clinicianInfo.uid,
    clinicianName: clinicianInfo.name || clinicianInfo.displayName,
    clinicianRole: clinicianInfo.role || clinicianInfo.userType,
    clinicianEmail: clinicianInfo.email,
    action: 'consultation_conducted',
    category: 'consultation',
    description: description,
    details: consultationData,
    institutionId: clinicianInfo.institutionId
  });
}

/**
 * Log care plan update
 */
export async function logCarePlanUpdate(clientId, clinicianInfo, carePlanData) {
  // Build description based on action and plan details
  const action = carePlanData.action || 'updated';
  const planName = carePlanData.planName || carePlanData.diagnosis || 'Care plan';
  
  let description = `Care plan ${action}: ${planName}`;
  
  if (carePlanData.changes) {
    description += ` (${carePlanData.changes})`;
  }
  
  return await logPatientInteraction({
    clientId,
    clinicianId: clinicianInfo.id || clinicianInfo.uid,
    clinicianName: clinicianInfo.name || clinicianInfo.displayName,
    clinicianRole: clinicianInfo.role || clinicianInfo.userType,
    clinicianEmail: clinicianInfo.email,
    action: 'care_plan_updated',
    category: 'care_plan',
    description: description,
    details: carePlanData,
    institutionId: clinicianInfo.institutionId
  });
}

/**
 * Log Client registration
 */
export async function logPatientRegistration(clientId, registeredBy, clientData) {
  return await logPatientInteraction({
    clientId,
    clinicianId: registeredBy.id || registeredBy.uid,
    clinicianName: registeredBy.name || registeredBy.displayName || 'System',
    clinicianRole: registeredBy.role || registeredBy.userType || 'admin',
    clinicianEmail: registeredBy.email,
    action: 'patient_registered',
    category: 'registration',
    description: `Client registered: ${clientData.name || clientId}`,
    details: {
      clientName: clientData.name,
      registrationMethod: clientData.registrationMethod || 'hospital_registration',
      initialData: clientData
    },
    institutionId: registeredBy.institutionId || clientData.institutionId
  });
}

/**
 * Log Client profile update
 */
export async function logPatientProfileUpdate(clientId, clinicianInfo, updatedFields) {
  return await logPatientInteraction({
    clientId,
    clinicianId: clinicianInfo.id || clinicianInfo.uid,
    clinicianName: clinicianInfo.name || clinicianInfo.displayName,
    clinicianRole: clinicianInfo.role || clinicianInfo.userType,
    clinicianEmail: clinicianInfo.email,
    action: 'profile_updated',
    category: 'profile',
    description: `Profile updated: ${Object.keys(updatedFields).join(', ')}`,
    details: {
      updatedFields: Object.keys(updatedFields),
      changes: updatedFields
    },
    institutionId: clinicianInfo.institutionId
  });
}

/**
 * Get all logs for a Client
 */
export async function getPatientLogs(clientId, limitCount = 100) {
  try {
    const logsRef = collection(db, PATIENT_LOGS_COLLECTION);
    const q = query(
      logsRef,
      where('clientId', '==', clientId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      const logData = doc.data();
      logs.push({
        id: doc.id,
        ...logData,
        timestamp: logData.timestamp?.toDate?.() || new Date(logData.dateTime || logData.createdAt),
        date: logData.date,
        time: logData.time
      });
    });
    
    return logs;
  } catch (error) {
    console.error('Error fetching Client logs:', error);
    throw error;
  }
}

/**
 * Get logs by clinician
 */
export async function getLogsByClinician(clinicianId, limitCount = 100) {
  try {
    const logsRef = collection(db, PATIENT_LOGS_COLLECTION);
    const q = query(
      logsRef,
      where('clinicianId', '==', clinicianId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      const logData = doc.data();
      logs.push({
        id: doc.id,
        ...logData,
        timestamp: logData.timestamp?.toDate?.() || new Date(logData.dateTime || logData.createdAt)
      });
    });
    
    return logs;
  } catch (error) {
    console.error('Error fetching clinician logs:', error);
    throw error;
  }
}

/**
 * Get logs by category
 */
export async function getLogsByCategory(clientId, category, limitCount = 50) {
  try {
    const logsRef = collection(db, PATIENT_LOGS_COLLECTION);
    const q = query(
      logsRef,
      where('clientId', '==', clientId),
      where('category', '==', category),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      const logData = doc.data();
      logs.push({
        id: doc.id,
        ...logData,
        timestamp: logData.timestamp?.toDate?.() || new Date(logData.dateTime || logData.createdAt)
      });
    });
    
    return logs;
  } catch (error) {
    console.error('Error fetching logs by category:', error);
    throw error;
  }
}

export default {
  logPatientInteraction,
  logVitalSigns,
  logMedicationAdministered,
  logConsultation,
  logCarePlanUpdate,
  logPatientRegistration,
  logPatientProfileUpdate,
  getPatientLogs,
  getLogsByClinician,
  getLogsByCategory
};

