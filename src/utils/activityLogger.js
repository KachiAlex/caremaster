/**
 * Activity Logger Utility
 * 
 * Centralized logging for all client activities
 * Automatically tracks actions performed by admin, doctors, nurses, caregivers
 */

import { clientActivitiesAPI } from '../api/clientActivitiesAPI';

export const ActivityLogger = {
  /**
   * Log client profile update
   */
  logClientUpdate: async (clientId, clientName, updatedFields, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'client_update',
        description: `Client profile updated: ${Object.keys(updatedFields).join(', ')}`,
        notes: JSON.stringify(updatedFields),
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed',
        details: {
          updatedFields: Object.keys(updatedFields),
          changes: updatedFields
        }
      });
      console.log('✅ Client update logged');
    } catch (error) {
      console.error('Error logging client update:', error);
    }
  },

  /**
   * Log client creation
   */
  logClientCreation: async (clientId, clientName, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'client_created',
        description: `New client ${clientName} added to system`,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed'
      });
      console.log('✅ Client creation logged');
    } catch (error) {
      console.error('Error logging client creation:', error);
    }
  },

  /**
   * Log client deletion/archival
   */
  logClientArchive: async (clientId, clientName, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'client_archived',
        description: `Client ${clientName} archived`,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed'
      });
      console.log('✅ Client archive logged');
    } catch (error) {
      console.error('Error logging client archive:', error);
    }
  },

  /**
   * Log assignment creation
   */
  logAssignmentCreated: async (clientId, clientName, assignmentTitle, assignedTo, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'assignment_created',
        description: `New assignment: ${assignmentTitle}`,
        notes: `Assigned to: ${assignedTo}`,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'assigned',
        details: {
          assignmentTitle,
          assignedTo
        }
      });
      console.log('✅ Assignment creation logged');
    } catch (error) {
      console.error('Error logging assignment creation:', error);
    }
  },

  /**
   * Log medical report creation
   */
  logMedicalReport: async (clientId, clientName, reportType, reportContent, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'medical_report',
        description: `${reportType} report created`,
        notes: reportContent,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed',
        details: {
          reportType
        }
      });
      console.log('✅ Medical report logged');
    } catch (error) {
      console.error('Error logging medical report:', error);
    }
  },

  /**
   * Log prescription/medication change
   */
  logPrescription: async (clientId, clientName, prescriptionDetails, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'prescription',
        description: `Prescription updated`,
        notes: prescriptionDetails,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed'
      });
      console.log('✅ Prescription logged');
    } catch (error) {
      console.error('Error logging prescription:', error);
    }
  },

  /**
   * Log caregiver assignment
   */
  logCaregiverAssignment: async (clientId, clientName, caregiverName, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'caregiver_assigned',
        description: `Caregiver ${caregiverName} assigned to client`,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed',
        details: {
          caregiverName
        }
      });
      console.log('✅ Caregiver assignment logged');
    } catch (error) {
      console.error('Error logging caregiver assignment:', error);
    }
  },

  /**
   * Log pharmacist assignment
   */
  logPharmacistAssignment: async (clientId, clientName, pharmacistName, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'pharmacist_assigned',
        description: `Pharmacist ${pharmacistName} assigned to client`,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed',
        details: {
          pharmacistName
        }
      });
      console.log('✅ Pharmacist assignment logged');
    } catch (error) {
      console.error('Error logging pharmacist assignment:', error);
    }
  },

  /**
   * Log general note/comment
   */
  logNote: async (clientId, clientName, noteContent, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'note',
        description: 'Note added',
        notes: noteContent,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed'
      });
      console.log('✅ Note logged');
    } catch (error) {
      console.error('Error logging note:', error);
    }
  },

  /**
   * Log document upload
   */
  logDocumentUpload: async (clientId, clientName, documentName, documentType, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'document_uploaded',
        description: `Document uploaded: ${documentName}`,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed',
        details: {
          documentName,
          documentType
        }
      });
      console.log('✅ Document upload logged');
    } catch (error) {
      console.error('Error logging document upload:', error);
    }
  },

  /**
   * Log phone call
   */
  logPhoneCall: async (clientId, clientName, callDuration, callType, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'phone_call',
        description: `${callType} call - Duration: ${callDuration}`,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'completed',
        details: {
          callDuration,
          callType
        }
      });
      console.log('✅ Phone call logged');
    } catch (error) {
      console.error('Error logging phone call:', error);
    }
  },

  /**
   * Log emergency alert
   */
  logEmergencyAlert: async (clientId, clientName, alertType, alertDetails, performedBy, performerName, performerRole, institutionId) => {
    try {
      await clientActivitiesAPI.logActivity({
        clientId,
        clientName,
        activityType: 'emergency_alert',
        description: `Emergency: ${alertType}`,
        notes: alertDetails,
        performedBy,
        performerName,
        performerRole,
        institutionId,
        status: 'urgent',
        details: {
          alertType
        }
      });
      console.log('✅ Emergency alert logged');
    } catch (error) {
      console.error('Error logging emergency alert:', error);
    }
  }
};

export default ActivityLogger;

