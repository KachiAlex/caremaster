/**
 * Patient Logger Utility
 * 
 * Comprehensive logging system for all patient interactions
 * Every log includes:
 * - Date and time
 * - Clinician name
 * - Clinician role
 * - Action performed
 * - Details
 * 
 * All logs are stored in the patient's database
 */

import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const PATIENT_LOGS_COLLECTION = 'patientLogs';

/**
 * Log a patient interaction
 * @param {Object} logData - Log data
 * @param {string} logData.patientId - Patient ID
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
      patientId,
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
    if (!patientId || !clinicianId || !clinicianName || !clinicianRole || !action) {
      throw new Error('Missing required log fields: patientId, clinicianId, clinicianName, clinicianRole, action');
    }

    const now = new Date();
    
    const logEntry = {
      // Patient reference
      patientId,
      
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

    // Add log to patient logs collection
    const logsRef = collection(db, PATIENT_LOGS_COLLECTION);
    const docRef = await addDoc(logsRef, logEntry);
    
    console.log(`✅ Patient log created: ${action} by ${clinicianName} (${clinicianRole}) for patient ${patientId}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error logging patient interaction:', error);
    throw error;
  }
}

/**
 * Log vital signs recording
 */
export async function logVitalSigns(patientId, clinicianInfo, vitalSignsData) {
  return await logPatientInteraction({
    patientId,
    clinicianId: clinicianInfo.id || clinicianInfo.uid,
    clinicianName: clinicianInfo.name || clinicianInfo.displayName,
    clinicianRole: clinicianInfo.role || clinicianInfo.userType,
    clinicianEmail: clinicianInfo.email,
    action: 'vital_signs_recorded',
    category: 'vital_signs',
    description: `Vital signs recorded: ${Object.keys(vitalSignsData).join(', ')}`,
    details: vitalSignsData,
    institutionId: clinicianInfo.institutionId
  });
}

/**
 * Log medication administration
 */
export async function logMedicationAdministered(patientId, clinicianInfo, medicationData) {
  return await logPatientInteraction({
    patientId,
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
export async function logConsultation(patientId, clinicianInfo, consultationData) {
  return await logPatientInteraction({
    patientId,
    clinicianId: clinicianInfo.id || clinicianInfo.uid,
    clinicianName: clinicianInfo.name || clinicianInfo.displayName,
    clinicianRole: clinicianInfo.role || clinicianInfo.userType,
    clinicianEmail: clinicianInfo.email,
    action: 'consultation_conducted',
    category: 'consultation',
    description: `Consultation: ${consultationData.type || 'General consultation'}`,
    details: consultationData,
    institutionId: clinicianInfo.institutionId
  });
}

/**
 * Log care plan update
 */
export async function logCarePlanUpdate(patientId, clinicianInfo, carePlanData) {
  return await logPatientInteraction({
    patientId,
    clinicianId: clinicianInfo.id || clinicianInfo.uid,
    clinicianName: clinicianInfo.name || clinicianInfo.displayName,
    clinicianRole: clinicianInfo.role || clinicianInfo.userType,
    clinicianEmail: clinicianInfo.email,
    action: 'care_plan_updated',
    category: 'care_plan',
    description: `Care plan updated: ${carePlanData.changes || 'Changes made'}`,
    details: carePlanData,
    institutionId: clinicianInfo.institutionId
  });
}

/**
 * Log patient registration
 */
export async function logPatientRegistration(patientId, registeredBy, patientData) {
  return await logPatientInteraction({
    patientId,
    clinicianId: registeredBy.id || registeredBy.uid,
    clinicianName: registeredBy.name || registeredBy.displayName || 'System',
    clinicianRole: registeredBy.role || registeredBy.userType || 'admin',
    clinicianEmail: registeredBy.email,
    action: 'patient_registered',
    category: 'registration',
    description: `Patient registered: ${patientData.name || patientId}`,
    details: {
      patientName: patientData.name,
      registrationMethod: patientData.registrationMethod || 'hospital_registration',
      initialData: patientData
    },
    institutionId: registeredBy.institutionId || patientData.institutionId
  });
}

/**
 * Log patient profile update
 */
export async function logPatientProfileUpdate(patientId, clinicianInfo, updatedFields) {
  return await logPatientInteraction({
    patientId,
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
 * Get all logs for a patient
 */
export async function getPatientLogs(patientId, limitCount = 100) {
  try {
    const logsRef = collection(db, PATIENT_LOGS_COLLECTION);
    const q = query(
      logsRef,
      where('patientId', '==', patientId),
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
    console.error('Error fetching patient logs:', error);
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
export async function getLogsByCategory(patientId, category, limitCount = 50) {
  try {
    const logsRef = collection(db, PATIENT_LOGS_COLLECTION);
    const q = query(
      logsRef,
      where('patientId', '==', patientId),
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

