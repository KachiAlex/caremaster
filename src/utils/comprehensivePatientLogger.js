/**
 * Comprehensive Patient Activity Logger
 * 
 * Centralized logging system for ALL patient activities across all staff types:
 * - Physicians (Doctors)
 * - Registered Nurses (RN)
 * - Licensed Practical Nurses (LPN)
 * - Caregivers
 * - Pharmacists
 * - Laboratory Technicians
 * - Administrators
 * 
 * All activities are logged to the patient's database with:
 * - Activity description
 * - Staff member (with proper medical terminology)
 * - Date and time
 * - Activity details
 */

import { logPatientActivity } from './patientActivityLogger';
import { getPatientById, getPatientByPatientId } from '../api/patientsAPI';

/**
 * Get patient document ID from registration number or document ID
 */
async function getPatientDocInfo(patientIdentifier) {
  try {
    // Try to get by registration number first
    const patient = await getPatientByPatientId(patientIdentifier);
    return {
      docId: patient.id,
      registrationNumber: patient.patientId || patientIdentifier
    };
  } catch (error) {
    // If not found, assume patientIdentifier is already the doc ID
    try {
      const patient = await getPatientById(patientIdentifier);
      return {
        docId: patientIdentifier,
        registrationNumber: patient.patientId || patientIdentifier
      };
    } catch (err) {
      // Fallback: use identifier as both
      return {
        docId: patientIdentifier,
        registrationNumber: patientIdentifier
      };
    }
  }
}

/**
 * Get standardized staff role terminology
 */
function getStandardizedRole(userType, role, medicalQualification) {
  const roleLower = (role || userType || '').toLowerCase();
  const qualLower = (medicalQualification || '').toLowerCase();
  
  // Medical professionals
  if (roleLower.includes('doctor') || qualLower.includes('doctor') || qualLower.includes('md') || qualLower.includes('mbbs')) {
    return 'Physician';
  }
  if (roleLower.includes('nurse') || qualLower.includes('nurse') || qualLower.includes('rn') || qualLower.includes('lpn')) {
    if (qualLower.includes('lpn') || qualLower.includes('licensed practical')) {
      return 'Licensed Practical Nurse (LPN)';
    }
    return 'Registered Nurse (RN)';
  }
  if (roleLower.includes('pharmacist') || qualLower.includes('pharmacist') || qualLower.includes('pharmd')) {
    return 'Pharmacist';
  }
  if (roleLower.includes('lab') || qualLower.includes('laboratory') || qualLower.includes('technician')) {
    return 'Laboratory Technician';
  }
  if (roleLower.includes('admin') || roleLower.includes('administrator')) {
    return 'Administrator';
  }
  if (roleLower.includes('caregiver')) {
    return 'Caregiver';
  }
  
  // Default
  return role || userType || 'Staff Member';
}

/**
 * Prepare staff member info for logging
 */
function prepareStaffMember(staffMember) {
  return {
    id: staffMember.id || staffMember.uid,
    name: staffMember.name || staffMember.displayName || 'Unknown Staff',
    role: getStandardizedRole(
      staffMember.userType || staffMember.type,
      staffMember.role,
      staffMember.medicalQualification
    ),
    email: staffMember.email || null,
    phone: staffMember.phone || staffMember.phoneNumber || null,
    medicalQualification: staffMember.medicalQualification || null,
    institutionId: staffMember.institutionId || null
  };
}

/**
 * Comprehensive Patient Activity Logger
 */
export const ComprehensivePatientLogger = {
  /**
   * Log vital signs recording (Nurse/Doctor)
   */
  async logVitalSigns(patientIdentifier, vitalSignsData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'vital_signs_recorded',
        activityDescription: `Vital signs recorded: ${Object.keys(vitalSignsData).filter(k => vitalSignsData[k]).join(', ')}`,
        activityDetails: vitalSignsData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'medical',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging vital signs:', error);
      throw error;
    }
  },

  /**
   * Log medication administration (Nurse/Pharmacist)
   */
  async logMedicationAdministered(patientIdentifier, medicationData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'medication_administered',
        activityDescription: `Medication administered: ${medicationData.medicationName || medicationData.name || 'Unknown medication'}`,
        activityDetails: medicationData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'medical',
        severity: medicationData.severity || 'info'
      });
    } catch (error) {
      console.error('Error logging medication administration:', error);
      throw error;
    }
  },

  /**
   * Log medication prescription (Physician)
   */
  async logMedicationPrescribed(patientIdentifier, prescriptionData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'medication_prescribed',
        activityDescription: `Medication prescribed: ${prescriptionData.medicationName || prescriptionData.name || 'Unknown medication'}`,
        activityDetails: prescriptionData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'medical',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging medication prescription:', error);
      throw error;
    }
  },

  /**
   * Log laboratory test ordered (Physician)
   */
  async logLabTestOrdered(patientIdentifier, labTestData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'laboratory_test_ordered',
        activityDescription: `Laboratory test ordered: ${labTestData.testName || labTestData.name || 'Unknown test'}`,
        activityDetails: labTestData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'medical',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging lab test order:', error);
      throw error;
    }
  },

  /**
   * Log laboratory test results (Laboratory Technician)
   */
  async logLabTestResults(patientIdentifier, labResultsData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      const severity = labResultsData.abnormal ? 'warning' : 'info';
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'laboratory_test_results',
        activityDescription: `Laboratory test results: ${labResultsData.testName || labResultsData.name || 'Unknown test'} ${labResultsData.abnormal ? '(Abnormal)' : '(Normal)'}`,
        activityDetails: labResultsData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'medical',
        severity: severity
      });
    } catch (error) {
      console.error('Error logging lab test results:', error);
      throw error;
    }
  },

  /**
   * Log consultation/assessment (Physician)
   */
  async logConsultation(patientIdentifier, consultationData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'consultation_conducted',
        activityDescription: `Consultation: ${consultationData.type || consultationData.diagnosis || 'General consultation'}`,
        activityDetails: consultationData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'care',
        severity: consultationData.severity || 'info'
      });
    } catch (error) {
      console.error('Error logging consultation:', error);
      throw error;
    }
  },

  /**
   * Log medical report (Physician)
   */
  async logMedicalReport(patientIdentifier, reportData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'medical_report_created',
        activityDescription: `Medical report created: ${reportData.diagnosis || reportData.title || 'Medical assessment'}`,
        activityDetails: reportData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'medical',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging medical report:', error);
      throw error;
    }
  },

  /**
   * Log nurse report (Registered Nurse)
   */
  async logNurseReport(patientIdentifier, reportData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'nurse_report_created',
        activityDescription: `Nurse report created: ${reportData.assessment || reportData.title || 'Nursing assessment'}`,
        activityDetails: reportData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'care',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging nurse report:', error);
      throw error;
    }
  },

  /**
   * Log care plan creation/update (Physician/Nurse)
   */
  async logCarePlan(patientIdentifier, carePlanData, staffMember, activityType = 'care_plan_created') {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: activityType,
        activityDescription: `Care plan ${activityType === 'care_plan_created' ? 'created' : 'updated'}: ${carePlanData.title || 'Care plan'}`,
        activityDetails: carePlanData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'care',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging care plan:', error);
      throw error;
    }
  },

  /**
   * Log care plan activity execution (Caregiver/Nurse)
   */
  async logCarePlanActivity(patientIdentifier, activityData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'care_plan_activity_executed',
        activityDescription: `Care plan activity executed: ${activityData.activityName || activityData.description || 'Activity'}`,
        activityDetails: {
          carePlanId: activityData.carePlanId,
          activityName: activityData.activityName,
          activityType: activityData.activityType,
          scheduledTime: activityData.scheduledTime,
          completedTime: activityData.completedTime,
          adherence: activityData.adherence || 'completed',
          notes: activityData.notes
        },
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'care',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging care plan activity:', error);
      throw error;
    }
  },

  /**
   * Log care plan adherence/compliance (System/Admin)
   */
  async logCarePlanAdherence(patientIdentifier, adherenceData, staffMember = null) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = staffMember ? prepareStaffMember(staffMember) : {
        id: 'system',
        name: 'System',
        role: 'System',
        email: null,
        phone: null,
        institutionId: adherenceData.institutionId
      };
      
      const adherencePercentage = adherenceData.adherencePercentage || 0;
      const severity = adherencePercentage < 50 ? 'warning' : adherencePercentage < 80 ? 'info' : 'info';
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'care_plan_adherence_report',
        activityDescription: `Care plan adherence: ${adherencePercentage}% (${adherenceData.totalActivities || 0} activities)`,
        activityDetails: {
          carePlanId: adherenceData.carePlanId,
          adherencePercentage: adherencePercentage,
          totalActivities: adherenceData.totalActivities || 0,
          completedActivities: adherenceData.completedActivities || 0,
          missedActivities: adherenceData.missedActivities || 0,
          period: adherenceData.period,
          reportDate: adherenceData.reportDate
        },
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'care',
        severity: severity
      });
    } catch (error) {
      console.error('Error logging care plan adherence:', error);
      throw error;
    }
  },

  /**
   * Log care task completion (Caregiver/Nurse)
   */
  async logCareTask(patientIdentifier, taskData, staffMember, activityType = 'care_task_completed') {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: activityType,
        activityDescription: `Care task ${activityType === 'care_task_completed' ? 'completed' : 'assigned'}: ${taskData.taskName || taskData.description || 'Task'}`,
        activityDetails: taskData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'care',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging care task:', error);
      throw error;
    }
  },

  /**
   * Log care log entry (Caregiver/Nurse)
   */
  async logCareLog(patientIdentifier, careLogData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'care_log_created',
        activityDescription: `Care log entry: ${careLogData.activity || careLogData.type || 'Care activity'}`,
        activityDetails: careLogData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'care',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging care log:', error);
      throw error;
    }
  },

  /**
   * Log prescription dispensed (Pharmacist)
   */
  async logPrescriptionDispensed(patientIdentifier, prescriptionData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'prescription_dispensed',
        activityDescription: `Prescription dispensed: ${prescriptionData.medicationName || prescriptionData.name || 'Unknown medication'}`,
        activityDetails: prescriptionData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'medical',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging prescription dispensed:', error);
      throw error;
    }
  },

  /**
   * Log document upload (Any staff)
   */
  async logDocumentUpload(patientIdentifier, documentData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'document_uploaded',
        activityDescription: `Document uploaded: ${documentData.documentName || documentData.fileName || 'Document'}`,
        activityDetails: documentData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'documents',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging document upload:', error);
      throw error;
    }
  },

  /**
   * Log profile update (Any staff)
   */
  async logProfileUpdate(patientIdentifier, updateData, staffMember) {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: 'profile_updated',
        activityDescription: `Profile updated: ${Object.keys(updateData).join(', ')}`,
        activityDetails: { updatedFields: Object.keys(updateData), changes: updateData },
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'profile',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging profile update:', error);
      throw error;
    }
  },

  /**
   * Log assignment (Administrator)
   */
  async logAssignment(patientIdentifier, assignmentData, staffMember, activityType = 'staff_assigned') {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType: activityType,
        activityDescription: `${assignmentData.role || 'Staff'} ${activityType.includes('assigned') ? 'assigned' : 'unassigned'}: ${assignmentData.staffName || 'Staff member'}`,
        activityDetails: assignmentData,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category: 'assignment',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error logging assignment:', error);
      throw error;
    }
  },

  /**
   * Log any custom activity
   */
  async logCustomActivity(patientIdentifier, activityType, activityDescription, activityDetails, staffMember, category = 'general', severity = 'info') {
    try {
      const { docId, registrationNumber } = await getPatientDocInfo(patientIdentifier);
      const preparedStaff = prepareStaffMember(staffMember);
      
      return await logPatientActivity({
        patientId: registrationNumber,
        patientDocId: docId,
        activityType,
        activityDescription,
        activityDetails,
        staffMember: preparedStaff,
        institutionId: preparedStaff.institutionId,
        category,
        severity
      });
    } catch (error) {
      console.error('Error logging custom activity:', error);
      throw error;
    }
  }
};

export default ComprehensivePatientLogger;

