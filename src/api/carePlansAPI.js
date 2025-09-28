import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CARE_PLANS_COLLECTION = 'carePlans';

export const getCarePlansByPatient = async (patientId) => {
  try {
    const plansRef = collection(db, CARE_PLANS_COLLECTION);
    const q = query(plansRef, where('patientId', '==', patientId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const plans = [];
    snap.forEach((docu) => {
      const data = docu.data();
      plans.push({ id: docu.id, ...data, createdAt: data.createdAt?.toDate?.() || data.createdAt });
    });
    return plans;
  } catch (error) {
    console.error('Error fetching care plans:', error);
    throw error;
  }
};

export const createCarePlan = async ({
  patientId,
  doctorId,
  doctorName,
  diagnosis,
  treatmentPlan,
  medications,
  followUpDate,
  specialInstructions,
  priority
}) => {
  try {
    const plansRef = collection(db, CARE_PLANS_COLLECTION);
    const payload = {
      patientId,
      doctorId,
      doctorName,
      diagnosis,
      treatmentPlan,
      medications,
      followUpDate,
      specialInstructions,
      priority: priority || 'medium',
      createdAt: serverTimestamp()
    };
    await addDoc(plansRef, payload);
    return payload;
  } catch (error) {
    console.error('Error creating care plan:', error);
    throw error;
  }
};


