import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import logger from '../utils/logger';

const carePlansAPI = {
  // Create a new care plan
  createCarePlan: async (planData) => {
    try {
      logger.debug('Creating care plan', { planData });
      
      const carePlanData = {
        ...planData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'carePlans'), carePlanData);
      logger.info('Care plan created successfully', { id: docRef.id });
      
      return docRef.id;
    } catch (error) {
      logger.error('Error creating care plan', { error });
      throw error;
    }
  },

  // Get care plans for a specific patient
  getCarePlansByPatient: async (patientId) => {
    try {
      logger.debug('Fetching care plans for patient', { patientId });
      
      const q = query(
        collection(db, 'carePlans'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const carePlans = [];
      
      querySnapshot.forEach((doc) => {
        carePlans.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        });
      });
      
      logger.info('Fetched care plans', { count: carePlans.length, patientId });
      return carePlans;
    } catch (error) {
      logger.error('Error fetching care plans', { error, patientId });
      throw error;
    }
  },

  // Get care plans created by a specific doctor/caregiver
  getCarePlansByCreator: async (creatorId) => {
    try {
      logger.debug('Fetching care plans by creator', { creatorId });
      
      const q = query(
        collection(db, 'carePlans'),
        where('createdBy', '==', creatorId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const carePlans = [];
      
      querySnapshot.forEach((doc) => {
        carePlans.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        });
      });
      
      logger.info('Fetched care plans by creator', { count: carePlans.length, creatorId });
      return carePlans;
    } catch (error) {
      logger.error('Error fetching care plans by creator', { error, creatorId });
      throw error;
    }
  },

  // Update a care plan
  updateCarePlan: async (planId, updates) => {
    try {
      logger.debug('Updating care plan', { planId, updates });
      
      const planRef = doc(db, 'carePlans', planId);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(planRef, updateData);
      logger.info('Care plan updated successfully', { planId });
      
      return true;
    } catch (error) {
      logger.error('Error updating care plan', { error, planId });
      throw error;
    }
  },

  // Delete a care plan
  deleteCarePlan: async (planId) => {
    try {
      logger.debug('Deleting care plan', { planId });
      
      const planRef = doc(db, 'carePlans', planId);
      await deleteDoc(planRef);
      
      logger.info('Care plan deleted successfully', { planId });
      return true;
    } catch (error) {
      logger.error('Error deleting care plan', { error, planId });
      throw error;
    }
  },

  // Get all care plans (for admin view)
  getAllCarePlans: async () => {
    try {
      logger.debug('Fetching all care plans');
      
      const q = query(
        collection(db, 'carePlans'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const carePlans = [];
      
      querySnapshot.forEach((doc) => {
        carePlans.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        });
      });
      
      logger.info('Fetched all care plans', { count: carePlans.length });
      return carePlans;
    } catch (error) {
      logger.error('Error fetching all care plans', { error });
      throw error;
    }
  }
};

export { carePlansAPI };