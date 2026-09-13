import { collection, addDoc, getDocs, getDoc, updateDoc, query, where, orderBy, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';

const REFERRALS_COLLECTION = 'referrals';

/**
 * Create a new referral
 */
export const createReferral = async (referralData) => {
  try {
    const referralsRef = collection(db, REFERRALS_COLLECTION);
    const payload = {
      ...referralData,
      status: 'sent',
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(referralsRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Error creating referral:', error);
    throw error;
  }
};

/**
 * Get referrals sent by an institution
 */
export const getSentReferrals = async (institutionId) => {
  try {
    const q = query(
      collection(db, REFERRALS_COLLECTION),
      where('referredByInstitutionId', '==', institutionId),
      orderBy('sentAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching sent referrals:', error);
    throw error;
  }
};

/**
 * Get referrals for a specific patient
 */
export const getPatientReferrals = async (patientId) => {
  try {
    const q = query(
      collection(db, REFERRALS_COLLECTION),
      where('patientId', '==', patientId),
      orderBy('sentAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching patient referrals:', error);
    throw error;
  }
};

/**
 * Update referral status (e.g. received, responded)
 */
export const updateReferralStatus = async (referralId, updateData) => {
  try {
    const referralRef = doc(db, REFERRALS_COLLECTION, referralId);
    const payload = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    if (updateData.status === 'received') payload.receivedAt = serverTimestamp();
    if (updateData.status === 'responded') payload.respondedAt = serverTimestamp();
    
    await updateDoc(referralRef, payload);
    return true;
  } catch (error) {
    console.error('Error updating referral:', error);
    throw error;
  }
};

export default {
  createReferral,
  getSentReferrals,
  getPatientReferrals,
  updateReferralStatus
};
