/**
 * HMO Plan Management API
 * 
 * Manages HMO (Health Maintenance Organization) plans:
 * - Plan creation and management
 * - Client plan assignment
 * - Plan-based pricing and discounts
 * - Co-pay configuration
 */

import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, limit } from 'backend/database';;
import { db } from '../backend/config';

const HMO_PLANS_COLLECTION = 'hmoPlans';
const PATIENT_HMO_ASSIGNMENTS_COLLECTION = 'patientHMOAssignments';

/**
 * Create HMO plan
 */
export const createHMOPlan = async (planData) => {
  try {
    const {
      name,
      planNumber,
      institutionId,
      discountPercent = 0,
      coPayPercent = 0,
      coPayAmount = null,
      coverageTypes = [],
      isActive = true,
      description = '',
      contactInfo = {}
    } = planData;

    if (!name || !institutionId) {
      throw new Error('Name and institutionId are required');
    }

    const plan = {
      name,
      planNumber: planNumber || `HMO-${Date.now()}`,
      institutionId,
      discountPercent,
      coPayPercent,
      coPayAmount,
      coverageTypes, // ['consultation', 'lab', 'pharmacy', 'imaging', 'procedure']
      isActive,
      description,
      contactInfo: {
        phone: contactInfo.phone || '',
        email: contactInfo.email || '',
        address: contactInfo.address || ''
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const planRef = await addDoc(collection(db, HMO_PLANS_COLLECTION), plan);

    return {
      id: planRef.id,
      ...plan
    };
  } catch (error) {
    console.error('Error creating HMO plan:', error);
    throw error;
  }
};

/**
 * Get all HMO plans for an institution
 */
export const getHMOPlans = async (institutionId) => {
  try {
    const plansRef = collection(db, HMO_PLANS_COLLECTION);
    const q = query(
      plansRef,
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const plans = [];

    querySnapshot.forEach((doc) => {
      const planData = doc.data();
      plans.push({
        id: doc.id,
        ...planData,
        createdAt: planData.createdAt?.toDate?.() || planData.createdAt,
        updatedAt: planData.updatedAt?.toDate?.() || planData.updatedAt
      });
    });

    return plans;
  } catch (error) {
    console.error('Error fetching HMO plans:', error);
    throw error;
  }
};

/**
 * Get a single HMO plan
 */
export const getHMOPlan = async (planId) => {
  try {
    const planRef = doc(db, HMO_PLANS_COLLECTION, planId);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) {
      throw new Error('HMO plan not found');
    }

    return {
      id: planSnap.id,
      ...planSnap.data(),
      createdAt: planSnap.data().createdAt?.toDate?.() || planSnap.data().createdAt,
      updatedAt: planSnap.data().updatedAt?.toDate?.() || planSnap.data().updatedAt
    };
  } catch (error) {
    console.error('Error fetching HMO plan:', error);
    throw error;
  }
};

/**
 * Update HMO plan
 */
export const updateHMOPlan = async (planId, updateData) => {
  try {
    const planRef = doc(db, HMO_PLANS_COLLECTION, planId);
    await updateDoc(planRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });

    return { success: true, planId };
  } catch (error) {
    console.error('Error updating HMO plan:', error);
    throw error;
  }
};

/**
 * Delete HMO plan (soft delete by setting isActive to false)
 */
export const deleteHMOPlan = async (planId) => {
  try {
    return await updateHMOPlan(planId, { isActive: false });
  } catch (error) {
    console.error('Error deleting HMO plan:', error);
    throw error;
  }
};

/**
 * Assign HMO plan to Client
 */
export const assignHMOPlanToPatient = async (clientId, planId, assignmentData = {}) => {
  try {
    const {
      planNumber = null,
      effectiveDate = new Date().toISOString(),
      expiryDate = null,
      isActive = true
    } = assignmentData;

    // Get plan details
    const plan = await getHMOPlan(planId);

    // Check for existing assignment
    const existingQuery = query(
      collection(db, PATIENT_HMO_ASSIGNMENTS_COLLECTION),
      where('clientId', '==', clientId),
      where('isActive', '==', true)
    );
    const existingSnap = await getDocs(existingQuery);

    // Deactivate existing assignments
    if (!existingSnap.empty) {
      const batch = [];
      existingSnap.forEach((doc) => {
        batch.push(updateDoc(doc.ref, {
          isActive: false,
          deactivatedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      });
      await Promise.all(batch);
    }

    // Create new assignment
    const assignment = {
      clientId,
      hmoPlanId: planId,
      hmoPlanName: plan.name,
      planNumber: planNumber || plan.planNumber,
      effectiveDate,
      expiryDate,
      isActive,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const assignmentRef = await addDoc(
      collection(db, PATIENT_HMO_ASSIGNMENTS_COLLECTION),
      assignment
    );

    // Update Client record
    const patientRef = doc(db, 'clients', clientId);
    await updateDoc(patientRef, {
      hmoPlanId: planId,
      hmoPlanName: plan.name,
      hmoPlanNumber: planNumber || plan.planNumber,
      updatedAt: serverTimestamp()
    });

    return {
      id: assignmentRef.id,
      ...assignment
    };
  } catch (error) {
    console.error('Error assigning HMO plan to Client:', error);
    throw error;
  }
};

/**
 * Get Client's active HMO plan
 */
export const getPatientHMOPlan = async (clientId) => {
  try {
    const assignmentQuery = query(
      collection(db, PATIENT_HMO_ASSIGNMENTS_COLLECTION),
      where('clientId', '==', clientId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const assignmentSnap = await getDocs(assignmentQuery);

    if (assignmentSnap.empty) {
      return null;
    }

    const assignment = assignmentSnap.docs[0].data();
    const plan = await getHMOPlan(assignment.hmoPlanId);

    return {
      assignment: {
        id: assignmentSnap.docs[0].id,
        ...assignment,
        effectiveDate: assignment.effectiveDate ? new Date(assignment.effectiveDate) : null,
        expiryDate: assignment.expiryDate ? new Date(assignment.expiryDate) : null
      },
      plan
    };
  } catch (error) {
    console.error('Error fetching Client HMO plan:', error);
    throw error;
  }
};

/**
 * Remove HMO plan from Client
 */
export const removeHMOPlanFromPatient = async (clientId) => {
  try {
    const assignmentQuery = query(
      collection(db, PATIENT_HMO_ASSIGNMENTS_COLLECTION),
      where('clientId', '==', clientId),
      where('isActive', '==', true)
    );

    const assignmentSnap = await getDocs(assignmentQuery);

    if (assignmentSnap.empty) {
      return { success: true, message: 'No active HMO plan found' };
    }

    const batch = [];
    assignmentSnap.forEach((doc) => {
      batch.push(updateDoc(doc.ref, {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
    });

    await Promise.all(batch);

    // Update Client record
    const patientRef = doc(db, 'clients', clientId);
    await updateDoc(patientRef, {
      hmoPlanId: null,
      hmoPlanName: null,
      hmoPlanNumber: null,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing HMO plan from Client:', error);
    throw error;
  }
};

/**
 * Get all clients with a specific HMO plan
 */
export const getPatientsByHMOPlan = async (planId) => {
  try {
    const assignmentQuery = query(
      collection(db, PATIENT_HMO_ASSIGNMENTS_COLLECTION),
      where('hmoPlanId', '==', planId),
      where('isActive', '==', true)
    );

    const assignmentSnap = await getDocs(assignmentQuery);
    const clients = [];

    assignmentSnap.forEach((doc) => {
      const assignment = doc.data();
      clients.push({
        assignmentId: doc.id,
        clientId: assignment.clientId,
        planNumber: assignment.planNumber,
        effectiveDate: assignment.effectiveDate ? new Date(assignment.effectiveDate) : null,
        expiryDate: assignment.expiryDate ? new Date(assignment.expiryDate) : null
      });
    });

    return clients;
  } catch (error) {
    console.error('Error fetching clients by HMO plan:', error);
    throw error;
  }
};

