/**
 * Discharge & Follow-up API
 * 
 * Phase 2 Implementation - Complete patient discharge workflow:
 * - Discharge planning
 * - Discharge summary generation
 * - Follow-up appointment scheduling
 * - Post-discharge care plans
 * - Discharge medication reconciliation
 * - Patient discharge checklist
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { notificationsAPI } from './notificationsAPI';
import { createAppointment } from './appointmentsAPI';

const DISCHARGES_COLLECTION = 'discharges';
const DISCHARGE_SUMMARIES_COLLECTION = 'dischargeSummaries';
const FOLLOW_UP_APPOINTMENTS_COLLECTION = 'followUpAppointments';

// Discharge status
export const DISCHARGE_STATUS = {
  PLANNING: 'planning',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Discharge type
export const DISCHARGE_TYPE = {
  ROUTINE: 'routine',
  AGAINST_MEDICAL_ADVICE: 'ama',
  TRANSFER: 'transfer',
  DECEASED: 'deceased',
  ELOPEMENT: 'elopement'
};

/**
 * Create discharge plan
 */
export const createDischargePlan = async (planData) => {
  try {
    const {
      patientId,
      patientName,
      institutionId,
      admissionId,
      doctorId,
      doctorName,
      dischargeType = DISCHARGE_TYPE.ROUTINE,
      plannedDischargeDate,
      dischargeDestination,
      dischargeInstructions = [],
      medications = [],
      followUpRequired = false,
      followUpDate = null,
      notes = ''
    } = planData;

    if (!patientId || !institutionId || !doctorId) {
      throw new Error('Missing required fields: patientId, institutionId, doctorId');
    }

    const dischargePlan = {
      patientId,
      patientName,
      institutionId,
      admissionId,
      doctorId,
      doctorName,
      dischargeType,
      status: DISCHARGE_STATUS.PLANNING,
      plannedDischargeDate: plannedDischargeDate || null,
      dischargeDestination: dischargeDestination || 'Home',
      dischargeInstructions,
      medications,
      followUpRequired,
      followUpDate: followUpDate || null,
      notes,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const planRef = await addDoc(collection(db, DISCHARGES_COLLECTION), dischargePlan);

    // Send notification to nursing staff
    try {
      await notificationsAPI.createNotification({
        userId: 'nursing-staff', // Would be sent to all nursing staff
        type: 'discharge_planning',
        title: 'New Discharge Plan',
        message: `Discharge plan created for ${patientName}`,
        priority: 'medium',
        data: {
          planId: planRef.id,
          patientId,
          plannedDischargeDate
        },
        institutionId
      });
    } catch (notifError) {
      console.warn('Failed to send discharge plan notification:', notifError);
    }

    return {
      id: planRef.id,
      ...dischargePlan
    };
  } catch (error) {
    console.error('Error creating discharge plan:', error);
    throw error;
  }
};

/**
 * Generate discharge summary
 */
export const generateDischargeSummary = async (dischargeId, summaryData) => {
  try {
    const {
      chiefComplaint,
      admissionDiagnosis,
      dischargeDiagnosis,
      proceduresPerformed = [],
      medicationsOnDischarge = [],
      vitalSignsAtDischarge = {},
      conditionAtDischarge,
      activityRestrictions = [],
      dietInstructions = '',
      woundCareInstructions = '',
      followUpInstructions = '',
      emergencyContactInstructions = ''
    } = summaryData;

    // Get discharge plan
    const dischargeRef = doc(db, DISCHARGES_COLLECTION, dischargeId);
    const dischargeSnap = await getDoc(dischargeRef);
    
    if (!dischargeSnap.exists()) {
      throw new Error('Discharge plan not found');
    }

    const discharge = dischargeSnap.data();

    // Create discharge summary
    const summary = {
      dischargeId,
      patientId: discharge.patientId,
      patientName: discharge.patientName,
      institutionId: discharge.institutionId,
      admissionId: discharge.admissionId,
      doctorId: discharge.doctorId,
      doctorName: discharge.doctorName,
      dischargeDate: serverTimestamp(),
      chiefComplaint,
      admissionDiagnosis,
      dischargeDiagnosis,
      proceduresPerformed,
      medicationsOnDischarge,
      vitalSignsAtDischarge,
      conditionAtDischarge,
      activityRestrictions,
      dietInstructions,
      woundCareInstructions,
      followUpInstructions,
      emergencyContactInstructions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const summaryRef = await addDoc(collection(db, DISCHARGE_SUMMARIES_COLLECTION), summary);

    // Update discharge plan
    await updateDoc(dischargeRef, {
      status: DISCHARGE_STATUS.COMPLETED,
      summaryId: summaryRef.id,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create follow-up appointment if required
    if (discharge.followUpRequired && discharge.followUpDate) {
      try {
        await createAppointment({
          patientId: discharge.patientId,
          patientName: discharge.patientName,
          doctorId: discharge.doctorId,
          doctorName: discharge.doctorName,
          institutionId: discharge.institutionId,
          appointmentDate: discharge.followUpDate,
          appointmentType: 'follow-up',
          reason: 'Post-discharge follow-up',
          notes: 'Follow-up appointment after discharge'
        });
      } catch (apptError) {
        console.warn('Failed to create follow-up appointment:', apptError);
      }
    }

    // Send notification to patient/caregiver
    try {
      await notificationsAPI.createNotification({
        userId: discharge.patientId,
        type: 'discharge_completed',
        title: 'Discharge Summary Ready',
        message: `Your discharge summary is ready. Please collect it from the hospital.`,
        priority: 'medium',
        data: {
          dischargeId,
          summaryId: summaryRef.id
        },
        institutionId: discharge.institutionId
      });
    } catch (notifError) {
      console.warn('Failed to send discharge notification:', notifError);
    }

    return {
      id: summaryRef.id,
      ...summary
    };
  } catch (error) {
    console.error('Error generating discharge summary:', error);
    throw error;
  }
};

/**
 * Get discharge plans
 */
export const getDischargePlans = async (institutionId, options = {}) => {
  try {
    const { status, patientId, limitCount = 100 } = options;
    
    let plansQuery = query(
      collection(db, DISCHARGES_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      plansQuery = query(plansQuery, where('status', '==', status));
    }

    if (patientId) {
      plansQuery = query(plansQuery, where('patientId', '==', patientId));
    }

    if (limitCount) {
      plansQuery = query(plansQuery, limit(limitCount));
    }

    const querySnapshot = await getDocs(plansQuery);
    const plans = [];

    querySnapshot.forEach((doc) => {
      const planData = doc.data();
      plans.push({
        id: doc.id,
        ...planData,
        createdAt: planData.createdAt?.toDate?.() || planData.createdAt,
        updatedAt: planData.updatedAt?.toDate?.() || planData.updatedAt,
        plannedDischargeDate: planData.plannedDischargeDate ? new Date(planData.plannedDischargeDate) : null,
        followUpDate: planData.followUpDate ? new Date(planData.followUpDate) : null,
        completedAt: planData.completedAt?.toDate?.() || planData.completedAt
      });
    });

    return plans;
  } catch (error) {
    console.error('Error fetching discharge plans:', error);
    throw error;
  }
};

/**
 * Get discharge summary by discharge ID
 */
export const getDischargeSummary = async (dischargeId) => {
  try {
    const summariesQuery = query(
      collection(db, DISCHARGE_SUMMARIES_COLLECTION),
      where('dischargeId', '==', dischargeId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(summariesQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const summaryData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...summaryData,
      createdAt: summaryData.createdAt?.toDate?.() || summaryData.createdAt,
      updatedAt: summaryData.updatedAt?.toDate?.() || summaryData.updatedAt,
      dischargeDate: summaryData.dischargeDate?.toDate?.() || summaryData.dischargeDate
    };
  } catch (error) {
    console.error('Error fetching discharge summary:', error);
    throw error;
  }
};

/**
 * Update discharge plan
 */
export const updateDischargePlan = async (dischargeId, updates) => {
  try {
    const dischargeRef = doc(db, DISCHARGES_COLLECTION, dischargeId);
    await updateDoc(dischargeRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true, dischargeId };
  } catch (error) {
    console.error('Error updating discharge plan:', error);
    throw error;
  }
};

/**
 * Get patient discharge history
 */
export const getPatientDischargeHistory = async (patientId, institutionId) => {
  try {
    const plans = await getDischargePlans(institutionId, { patientId });
    
    // Get summaries for completed discharges
    const history = await Promise.all(
      plans.map(async (plan) => {
        if (plan.status === DISCHARGE_STATUS.COMPLETED && plan.summaryId) {
          const summary = await getDischargeSummary(plan.id);
          return { ...plan, summary };
        }
        return plan;
      })
    );

    return history;
  } catch (error) {
    console.error('Error fetching patient discharge history:', error);
    throw error;
  }
};

/**
 * Create follow-up appointment
 */
export const createFollowUpAppointment = async (dischargeId, appointmentData) => {
  try {
    // Get discharge plan
    const dischargeRef = doc(db, DISCHARGES_COLLECTION, dischargeId);
    const dischargeSnap = await getDoc(dischargeRef);
    
    if (!dischargeSnap.exists()) {
      throw new Error('Discharge plan not found');
    }

    const discharge = dischargeSnap.data();

    // Create appointment
    const appointment = await createAppointment({
      patientId: discharge.patientId,
      patientName: discharge.patientName,
      doctorId: appointmentData.doctorId || discharge.doctorId,
      doctorName: appointmentData.doctorName || discharge.doctorName,
      institutionId: discharge.institutionId,
      appointmentDate: appointmentData.appointmentDate,
      appointmentType: 'follow-up',
      reason: appointmentData.reason || 'Post-discharge follow-up',
      notes: appointmentData.notes || `Follow-up after discharge on ${new Date().toLocaleDateString()}`,
      relatedDischargeId: dischargeId
    });

    // Update discharge plan
    await updateDoc(dischargeRef, {
      followUpRequired: true,
      followUpDate: appointmentData.appointmentDate,
      followUpAppointmentId: appointment.id,
      updatedAt: serverTimestamp()
    });

    return appointment;
  } catch (error) {
    console.error('Error creating follow-up appointment:', error);
    throw error;
  }
};

/**
 * Get discharge statistics
 */
export const getDischargeStats = async (institutionId, startDate = null, endDate = null) => {
  try {
    const plans = await getDischargePlans(institutionId);
    
    let filteredPlans = plans;
    if (startDate || endDate) {
      filteredPlans = plans.filter(plan => {
        const planDate = plan.createdAt instanceof Date 
          ? plan.createdAt 
          : new Date(plan.createdAt);
        if (startDate && planDate < new Date(startDate)) return false;
        if (endDate && planDate > new Date(endDate)) return false;
        return true;
      });
    }

    const stats = {
      total: filteredPlans.length,
      planning: filteredPlans.filter(p => p.status === DISCHARGE_STATUS.PLANNING).length,
      ready: filteredPlans.filter(p => p.status === DISCHARGE_STATUS.READY).length,
      completed: filteredPlans.filter(p => p.status === DISCHARGE_STATUS.COMPLETED).length,
      withFollowUp: filteredPlans.filter(p => p.followUpRequired).length,
      byType: {
        routine: filteredPlans.filter(p => p.dischargeType === DISCHARGE_TYPE.ROUTINE).length,
        ama: filteredPlans.filter(p => p.dischargeType === DISCHARGE_TYPE.AGAINST_MEDICAL_ADVICE).length,
        transfer: filteredPlans.filter(p => p.dischargeType === DISCHARGE_TYPE.TRANSFER).length
      }
    };

    return stats;
  } catch (error) {
    console.error('Error calculating discharge stats:', error);
    throw error;
  }
};

