/**
 * Enhanced Client Activity Logger
 * 
 * Comprehensive logging system that stores ALL Client activities
 * directly in the Client's database/document with:
 * - Time and date
 * - Staff member details (name, role, ID)
 * - Activity description
 * - Activity details
 * 
 * This connects the entire Client database through the registration number.
 */

import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

const PATIENT_ACTIVITIES_COLLECTION = 'patientActivities';

/**
 * Log a Client activity
 * Stores activity in both:
 * 1. Client document's activities array (for quick access)
 * 2. Separate patientActivities collection (for querying and analytics)
 * 
 * @param {Object} activityData
 * @param {string} activityData.clientId - Client registration number (e.g., UC-2025-0001)
 * @param {string} activityData.patientDocId - Client Firestore document ID
 * @param {string} activityData.activityType - Type of activity (e.g., 'profile_updated', 'medication_administered')
 * @param {string} activityData.activityDescription - Human-readable description
 * @param {Object} activityData.activityDetails - Additional details about the activity
 * @param {Object} activityData.staffMember - Staff member who performed the activity
 * @param {string} activityData.staffMember.id - Staff member ID
 * @param {string} activityData.staffMember.name - Staff member name
 * @param {string} activityData.staffMember.role - Staff member role (admin, doctor, nurse, caregiver, pharmacist)
 * @param {string} activityData.staffMember.email - Staff member email (optional)
 * @param {string} activityData.institutionId - Institution ID (optional)
 * @returns {Promise<string>} - Activity log ID
 */
export async function logPatientActivity(activityData) {
  try {
    const {
      clientId,
      patientDocId,
      activityType,
      activityDescription,
      activityDetails = {},
      staffMember,
      institutionId = null
    } = activityData;

    // Validate required fields
    if (!clientId || !patientDocId || !activityType || !staffMember) {
      throw new Error('Missing required fields: clientId, patientDocId, activityType, staffMember');
    }

    const now = new Date();
    
    // Create comprehensive activity log entry
    const activityLog = {
      // Client identification
      clientId, // Registration number (e.g., UC-2025-0001)
      patientDocId, // Firestore document ID
      
      // Activity information
      activityType,
      activityDescription: activityDescription || activityType,
      activityDetails,
      category: activityData.category || getCategoryFromActivityType(activityType),
      
      // Staff member information (complete attribution)
      staffMember: {
        id: staffMember.id || staffMember.uid,
        name: staffMember.name || staffMember.displayName || 'Unknown Staff',
        role: staffMember.role || staffMember.userType || staffMember.type || 'staff',
        email: staffMember.email || null,
        phone: staffMember.phone || null
      },
      
      // Timestamp information (multiple formats for flexibility)
      timestamp: serverTimestamp(),
      date: now.toISOString().split('T')[0], // YYYY-MM-DD
      time: now.toTimeString().split(' ')[0], // HH:MM:SS
      dateTime: now.toISOString(), // Full ISO string
      unixTimestamp: now.getTime(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      
      // Additional metadata
      institutionId,
      severity: activityData.severity || 'info', // info, warning, critical
      source: activityData.source || 'web_app',
      
      // System metadata
      createdAt: serverTimestamp(),
      createdBy: staffMember.id || staffMember.uid
    };

    // 1. Add to patientActivities collection (for querying and analytics)
    const activitiesRef = collection(db, PATIENT_ACTIVITIES_COLLECTION);
    const docRef = await addDoc(activitiesRef, activityLog);
    const activityLogId = docRef.id;

    // 2. Add to Client document's activities array (for quick access)
    try {
      const patientRef = doc(db, 'clients', patientDocId);
      const patientDoc = await getDoc(patientRef);
      
      if (patientDoc.exists()) {
        // Add activity to Client's activities array (keep last 100 for performance)
        const currentActivities = patientDoc.data().activities || [];
        const updatedActivities = [
          {
            ...activityLog,
            id: activityLogId,
            timestamp: now.toISOString() // Use ISO string for array storage
          },
          ...currentActivities.slice(0, 99) // Keep last 100 activities
        ];
        
        await updateDoc(patientRef, {
          activities: updatedActivities,
          lastActivityAt: serverTimestamp(),
          lastActivityBy: staffMember.name || staffMember.displayName,
          lastActivityType: activityType,
          updatedAt: serverTimestamp()
        });
      }
    } catch (patientUpdateError) {
      console.warn('Could not update Client document activities array:', patientUpdateError);
      // Continue even if Client document update fails
    }

    console.log(`✅ Client activity logged: ${activityType} by ${staffMember.name} (${staffMember.role}) for Client ${clientId}`);
    
    return activityLogId;
  } catch (error) {
    console.error('❌ Error logging Client activity:', error);
    throw error;
  }
}

/**
 * Get category from activity type
 */
function getCategoryFromActivityType(activityType) {
  const categoryMap = {
    // Registration
    'patient_registered': 'registration',
    'patient_created': 'registration',
    
    // Profile
    'profile_updated': 'profile',
    'profile_viewed': 'profile',
    'contact_updated': 'profile',
    'address_updated': 'profile',
    
    // Medical
    'vital_signs_recorded': 'medical',
    'vital_signs_viewed': 'medical',
    'medication_administered': 'medical',
    'medication_prescribed': 'medical',
    'medication_updated': 'medical',
    'allergy_added': 'medical',
    'allergy_updated': 'medical',
    'condition_added': 'medical',
    'condition_updated': 'medical',
    
    // Care
    'care_plan_created': 'care',
    'care_plan_updated': 'care',
    'care_task_completed': 'care',
    'care_task_assigned': 'care',
    'consultation_conducted': 'care',
    'appointment_scheduled': 'care',
    'appointment_completed': 'care',
    
    // Documents
    'document_uploaded': 'documents',
    'document_viewed': 'documents',
    'document_deleted': 'documents',
    'prescription_created': 'documents',
    'prescription_viewed': 'documents',
    
    // Billing
    'invoice_created': 'billing',
    'payment_recorded': 'billing',
    'insurance_updated': 'billing',
    
    // Assignment
    'caregiver_assigned': 'assignment',
    'caregiver_unassigned': 'assignment',
    'doctor_assigned': 'assignment',
    'doctor_unassigned': 'assignment',
    
    // General
    'note_added': 'notes',
    'note_updated': 'notes',
    'note_deleted': 'notes'
  };
  
  return categoryMap[activityType] || 'general';
}

/**
 * Log Client registration
 */
export async function logPatientRegistration(clientId, patientDocId, registeredBy, clientData) {
  return await logPatientActivity({
    clientId,
    patientDocId,
    activityType: 'patient_registered',
    activityDescription: `Client ${clientData.name || clientId} registered in system`,
    activityDetails: {
      clientName: clientData.name || clientData.fullName,
      registrationMethod: clientData.registrationMethod || 'admin_created',
      initialData: {
        email: clientData.email,
        phone: clientData.phone,
        careLevel: clientData.careLevel,
        medicalConditions: clientData.medicalConditions?.length || 0,
        medications: clientData.medications?.length || 0,
        allergies: clientData.allergies?.length || 0
      }
    },
    staffMember: registeredBy,
    institutionId: registeredBy.institutionId || clientData.institutionId,
    category: 'registration',
    severity: 'info'
  });
}

/**
 * Log Client profile update
 */
export async function logPatientProfileUpdate(clientId, patientDocId, updatedFields, staffMember) {
  return await logPatientActivity({
    clientId,
    patientDocId,
    activityType: 'profile_updated',
    activityDescription: `Client profile updated: ${Object.keys(updatedFields).join(', ')}`,
    activityDetails: {
      updatedFields: Object.keys(updatedFields),
      changes: updatedFields
    },
    staffMember,
    institutionId: staffMember.institutionId,
    category: 'profile',
    severity: 'info'
  });
}

/**
 * Log medication administration
 */
export async function logMedicationActivity(clientId, patientDocId, medicationData, staffMember, activityType = 'medication_administered') {
  return await logPatientActivity({
    clientId,
    patientDocId,
    activityType,
    activityDescription: `${activityType === 'medication_administered' ? 'Medication administered' : 'Medication prescribed'}: ${medicationData.medicationName || 'Unknown'}`,
    activityDetails: medicationData,
    staffMember,
    institutionId: staffMember.institutionId,
    category: 'medical',
    severity: medicationData.severity || 'info'
  });
}

/**
 * Log vital signs recording
 */
export async function logVitalSignsActivity(clientId, patientDocId, vitalSignsData, staffMember) {
  return await logPatientActivity({
    clientId,
    patientDocId,
    activityType: 'vital_signs_recorded',
    activityDescription: `Vital signs recorded: ${Object.keys(vitalSignsData).join(', ')}`,
    activityDetails: vitalSignsData,
    staffMember,
    institutionId: staffMember.institutionId,
    category: 'medical',
    severity: 'info'
  });
}

/**
 * Log care task completion
 */
export async function logCareTaskActivity(clientId, patientDocId, taskData, staffMember, activityType = 'care_task_completed') {
  return await logPatientActivity({
    clientId,
    patientDocId,
    activityType,
    activityDescription: `Care task ${activityType === 'care_task_completed' ? 'completed' : 'assigned'}: ${taskData.taskName || taskData.description || 'Task'}`,
    activityDetails: taskData,
    staffMember,
    institutionId: staffMember.institutionId,
    category: 'care',
    severity: 'info'
  });
}

/**
 * Log document activity
 */
export async function logDocumentActivity(clientId, patientDocId, documentData, staffMember, activityType = 'document_uploaded') {
  return await logPatientActivity({
    clientId,
    patientDocId,
    activityType,
    activityDescription: `Document ${activityType === 'document_uploaded' ? 'uploaded' : activityType === 'document_viewed' ? 'viewed' : 'deleted'}: ${documentData.documentName || documentData.fileName || 'Document'}`,
    activityDetails: documentData,
    staffMember,
    institutionId: staffMember.institutionId,
    category: 'documents',
    severity: 'info'
  });
}

/**
 * Log assignment activity
 */
export async function logAssignmentActivity(clientId, patientDocId, assignmentData, staffMember, activityType = 'caregiver_assigned') {
  return await logPatientActivity({
    clientId,
    patientDocId,
    activityType,
    activityDescription: `${assignmentData.role || 'Staff'} ${activityType.includes('assigned') ? 'assigned' : 'unassigned'}: ${assignmentData.staffName || 'Staff member'}`,
    activityDetails: assignmentData,
    staffMember,
    institutionId: staffMember.institutionId,
    category: 'assignment',
    severity: 'info'
  });
}

/**
 * Get all activities for a Client
 */
export async function getPatientActivities(clientId, options = {}) {
  try {
    const {
      limitCount = 100,
      category = null,
      activityType = null,
      startDate = null,
      endDate = null
    } = options;

    const activitiesRef = collection(db, PATIENT_ACTIVITIES_COLLECTION);
    let q = query(
      activitiesRef,
      where('clientId', '==', clientId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    // Add category filter if provided
    if (category) {
      q = query(
        activitiesRef,
        where('clientId', '==', clientId),
        where('category', '==', category),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }

    // Add activity type filter if provided
    if (activityType) {
      q = query(
        activitiesRef,
        where('clientId', '==', clientId),
        where('activityType', '==', activityType),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const activities = [];

    querySnapshot.forEach((doc) => {
      const activityData = doc.data();
      activities.push({
        id: doc.id,
        ...activityData,
        timestamp: activityData.timestamp?.toDate?.() || new Date(activityData.dateTime || activityData.createdAt)
      });
    });

    // Filter by date range if provided
    let filteredActivities = activities;
    if (startDate) {
      filteredActivities = filteredActivities.filter(a => {
        const activityDate = a.timestamp || new Date(a.dateTime);
        return activityDate >= new Date(startDate);
      });
    }
    if (endDate) {
      filteredActivities = filteredActivities.filter(a => {
        const activityDate = a.timestamp || new Date(a.dateTime);
        return activityDate <= new Date(endDate);
      });
    }

    return filteredActivities;
  } catch (error) {
    console.error('Error fetching Client activities:', error);
    throw error;
  }
}

/**
 * Get activities by staff member
 */
export async function getActivitiesByStaff(staffId, options = {}) {
  try {
    const { limitCount = 100, clientId = null } = options;
    
    const activitiesRef = collection(db, PATIENT_ACTIVITIES_COLLECTION);
    let q;
    
    if (clientId) {
      q = query(
        activitiesRef,
        where('clientId', '==', clientId),
        where('staffMember.id', '==', staffId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        activitiesRef,
        where('staffMember.id', '==', staffId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const activities = [];
    
    querySnapshot.forEach((doc) => {
      const activityData = doc.data();
      activities.push({
        id: doc.id,
        ...activityData,
        timestamp: activityData.timestamp?.toDate?.() || new Date(activityData.dateTime || activityData.createdAt)
      });
    });
    
    return activities;
  } catch (error) {
    console.error('Error fetching activities by staff:', error);
    throw error;
  }
}

export default {
  logPatientActivity,
  logPatientRegistration,
  logPatientProfileUpdate,
  logMedicationActivity,
  logVitalSignsActivity,
  logCareTaskActivity,
  logDocumentActivity,
  logAssignmentActivity,
  getPatientActivities,
  getActivitiesByStaff
};

