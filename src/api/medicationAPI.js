import { db, functions } from '../firebase/config';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import dataConnectService from '../services/dataConnectService';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';

// Firebase Functions
const createMedicationReminder = httpsCallable(functions, 'createMedicationReminder');
const logMedicationDose = httpsCallable(functions, 'logMedicationDose');
const getMedicationAnalytics = httpsCallable(functions, 'getMedicationAnalytics');

export const medicationAPI = {
  // Get all medications with filtering (using Data Connect)
  getMedications: async (filters = {}) => {
    try {
      logger.debug('Fetching medications', { filters });
      
      // Try Data Connect first
      try {
        if (filters.patientId) {
          const result = await dataConnectService.getMedications(filters.patientId);
          return result.data || [];
        } else {
          const result = await dataConnectService.getCurrentUserMedications();
          return result.data || [];
        }
      } catch (dataConnectError) {
        logger.warn('Data Connect failed, falling back to Firestore', { error: dataConnectError });
      }
      
      // Fallback to Firestore with simplified query to avoid index requirements
      let medicationsQuery;
      
      if (filters.patientId) {
        // Primary filter by patientId only, sort client-side
        medicationsQuery = query(
          collection(db, 'medications'),
          where('patientId', '==', filters.patientId)
        );
      } else {
        // If no patientId filter, get recent medications
        medicationsQuery = query(
          collection(db, 'medications'),
          orderBy('startDate', 'desc'),
          limit(50)
        );
      }
      
      if (filters.limit) {
        medicationsQuery = query(medicationsQuery, limit(filters.limit));
      }

      const medicationsSnapshot = await getDocs(medicationsQuery);
      let medications = [];

      medicationsSnapshot.forEach((doc) => {
        medications.push({
          id: doc.id,
          ...doc.data(),
          startDate: doc.data().startDate?.toDate(),
          endDate: doc.data().endDate?.toDate(),
          lastTaken: doc.data().lastTaken?.toDate(),
          nextDose: doc.data().nextDose?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      // Apply client-side filtering for status if needed
      if (filters.status) {
        medications = medications.filter(med => med.status === filters.status);
      }

      // Apply client-side sorting if patientId filter was used
      if (filters.patientId) {
        medications.sort((a, b) => {
          const aDate = a.startDate || new Date(0);
          const bDate = b.startDate || new Date(0);
          return bDate - aDate;
        });
      }

      return medications;
    } catch (error) {
      console.error('Error fetching medications:', error);
      throw error;
    }
  },

  // Get medication by ID
  getMedicationById: async (medicationId) => {
    try {
      const medicationRef = doc(db, 'medications', medicationId);
      const medicationDoc = await getDoc(medicationRef);
      
      if (medicationDoc.exists()) {
        return {
          id: medicationDoc.id,
          ...medicationDoc.data(),
          startDate: medicationDoc.data().startDate?.toDate(),
          endDate: medicationDoc.data().endDate?.toDate(),
          lastTaken: medicationDoc.data().lastTaken?.toDate(),
          nextDose: medicationDoc.data().nextDose?.toDate(),
          createdAt: medicationDoc.data().createdAt?.toDate(),
          updatedAt: medicationDoc.data().updatedAt?.toDate()
        };
      }
      
      throw new Error('Medication not found');
    } catch (error) {
      console.error('Error fetching medication:', error);
      throw error;
    }
  },

  // Create new medication
  createMedication: async (medicationData) => {
    try {
      const medicationRef = await addDoc(collection(db, 'medications'), {
        ...medicationData,
        status: 'active',
        complianceRate: 0,
        totalDoses: 0,
        takenDoses: 0,
        missedDoses: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: medicationRef.id, success: true };
    } catch (error) {
      console.error('Error creating medication:', error);
      throw error;
    }
  },

  // Update medication
  updateMedication: async (medicationId, updates) => {
    try {
      const medicationRef = doc(db, 'medications', medicationId);
      await updateDoc(medicationRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  },

  // Delete medication
  deleteMedication: async (medicationId) => {
    try {
      const medicationRef = doc(db, 'medications', medicationId);
      await deleteDoc(medicationRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  },

  // Record medication dose taken
  recordDoseTaken: async (medicationId, doseData) => {
    try {
      const medicationRef = doc(db, 'medications', medicationId);
      const medicationDoc = await getDoc(medicationRef);
      
      if (medicationDoc.exists()) {
        const currentData = medicationDoc.data();
        const newTakenDoses = currentData.takenDoses + 1;
        const newTotalDoses = currentData.totalDoses + 1;
        const newComplianceRate = Math.round((newTakenDoses / newTotalDoses) * 100);
        
        // Calculate next dose time
        const nextDoseTime = calculateNextDoseTime(
          doseData.takenAt,
          currentData.frequency,
          currentData.reminders?.times || []
        );

        await updateDoc(medicationRef, {
          takenDoses: newTakenDoses,
          totalDoses: newTotalDoses,
          complianceRate: newComplianceRate,
          lastTaken: doseData.takenAt,
          nextDose: nextDoseTime,
          updatedAt: serverTimestamp()
        });

        // Log dose taken
        await medicationAPI.logDoseEvent(medicationId, {
          type: 'taken',
          timestamp: doseData.takenAt,
          notes: doseData.notes || '',
          recordedBy: doseData.recordedBy || 'Patient'
        });

        return { success: true, complianceRate: newComplianceRate };
      }
      
      throw new Error('Medication not found');
    } catch (error) {
      console.error('Error recording dose taken:', error);
      throw error;
    }
  },

  // Record missed dose
  recordMissedDose: async (medicationId, missedDoseData) => {
    try {
      const medicationRef = doc(db, 'medications', medicationId);
      const medicationDoc = await getDoc(medicationRef);
      
      if (medicationDoc.exists()) {
        const currentData = medicationDoc.data();
        const newMissedDoses = currentData.missedDoses + 1;
        const newTotalDoses = currentData.totalDoses + 1;
        const newComplianceRate = Math.round((currentData.takenDoses / newTotalDoses) * 100);
        
        // Calculate next dose time
        const nextDoseTime = calculateNextDoseTime(
          missedDoseData.missedAt,
          currentData.frequency,
          currentData.reminders?.times || []
        );

        await updateDoc(medicationRef, {
          missedDoses: newMissedDoses,
          totalDoses: newTotalDoses,
          complianceRate: newComplianceRate,
          nextDose: nextDoseTime,
          updatedAt: serverTimestamp()
        });

        // Log missed dose
        await medicationAPI.logDoseEvent(medicationId, {
          type: 'missed',
          timestamp: missedDoseData.missedAt,
          notes: missedDoseData.notes || '',
          recordedBy: missedDoseData.recordedBy || 'System'
        });

        return { success: true, complianceRate: newComplianceRate };
      }
      
      throw new Error('Medication not found');
    } catch (error) {
      console.error('Error recording missed dose:', error);
      throw error;
    }
  },

  // Log dose events (taken/missed)
  logDoseEvent: async (medicationId, eventData) => {
    try {
      const doseLogRef = await addDoc(collection(db, 'doseLogs'), {
        medicationId,
        ...eventData,
        timestamp: serverTimestamp()
      });
      return { id: doseLogRef.id, success: true };
    } catch (error) {
      console.error('Error logging dose event:', error);
      throw error;
    }
  },

  // Get dose logs for a medication
  getDoseLogs: async (medicationId, filters = {}) => {
    try {
      let doseLogsQuery = query(
        collection(db, 'doseLogs'),
        where('medicationId', '==', medicationId),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.type) {
        doseLogsQuery = query(doseLogsQuery, where('type', '==', filters.type));
      }
      
      if (filters.limit) {
        doseLogsQuery = query(doseLogsQuery, limit(filters.limit));
      }

      const doseLogsSnapshot = await getDocs(doseLogsQuery);
      const doseLogs = [];

      doseLogsSnapshot.forEach((doc) => {
        doseLogs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        });
      });

      return doseLogs;
    } catch (error) {
      console.error('Error fetching dose logs:', error);
      throw error;
    }
  },

  // Get medication compliance analytics
  getComplianceAnalytics: async (filters = {}) => {
    try {
      const medicationsQuery = query(collection(db, 'medications'));
      const medicationsSnapshot = await getDocs(medicationsQuery);
      
      const analytics = {
        totalMedications: 0,
        activeMedications: 0,
        averageCompliance: 0,
        complianceDistribution: {
          excellent: 0, // 90-100%
          good: 0,      // 80-89%
          fair: 0,      // 70-79%
          poor: 0       // <70%
        },
        medicationStats: [],
        patientCompliance: [],
        sideEffectReports: [],
        drugInteractions: []
      };

      let totalCompliance = 0;
      let activeCount = 0;

      medicationsSnapshot.forEach((doc) => {
        const medication = doc.data();
        analytics.totalMedications++;
        
        if (medication.status === 'active') {
          activeCount++;
          totalCompliance += medication.complianceRate || 0;
          
          // Compliance distribution
          if (medication.complianceRate >= 90) analytics.complianceDistribution.excellent++;
          else if (medication.complianceRate >= 80) analytics.complianceDistribution.good++;
          else if (medication.complianceRate >= 70) analytics.complianceDistribution.fair++;
          else analytics.complianceDistribution.poor++;
        }
      });

      analytics.activeMedications = activeCount;
      analytics.averageCompliance = activeCount > 0 ? Math.round(totalCompliance / activeCount) : 0;

      return analytics;
    } catch (error) {
      console.error('Error fetching compliance analytics:', error);
      throw error;
    }
  },

  // Get overdue medications
  getOverdueMedications: async () => {
    try {
      const now = new Date();
      const medicationsQuery = query(
        collection(db, 'medications'),
        where('status', '==', 'active'),
        where('nextDose', '<=', now)
      );
      
      const medicationsSnapshot = await getDocs(medicationsQuery);
      const overdueMedications = [];

      medicationsSnapshot.forEach((doc) => {
        overdueMedications.push({
          id: doc.id,
          ...doc.data(),
          startDate: doc.data().startDate?.toDate(),
          endDate: doc.data().endDate?.toDate(),
          lastTaken: doc.data().lastTaken?.toDate(),
          nextDose: doc.data().nextDose?.toDate()
        });
      });

      return overdueMedications;
    } catch (error) {
      console.error('Error fetching overdue medications:', error);
      throw error;
    }
  },

  // Update medication reminders
  updateReminders: async (medicationId, reminderSettings) => {
    try {
      const medicationRef = doc(db, 'medications', medicationId);
      await updateDoc(medicationRef, {
        reminders: reminderSettings,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating reminders:', error);
      throw error;
    }
  },

  // Get medication side effects
  getSideEffects: async (medicationId) => {
    try {
      const sideEffectsQuery = query(
        collection(db, 'sideEffects'),
        where('medicationId', '==', medicationId),
        orderBy('reportedAt', 'desc')
      );
      
      const sideEffectsSnapshot = await getDocs(sideEffectsQuery);
      const sideEffects = [];

      sideEffectsSnapshot.forEach((doc) => {
        sideEffects.push({
          id: doc.id,
          ...doc.data(),
          reportedAt: doc.data().reportedAt?.toDate()
        });
      });

      return sideEffects;
    } catch (error) {
      console.error('Error fetching side effects:', error);
      throw error;
    }
  },

  // Report side effect
  reportSideEffect: async (medicationId, sideEffectData) => {
    try {
      const sideEffectRef = await addDoc(collection(db, 'sideEffects'), {
        medicationId,
        ...sideEffectData,
        reportedAt: serverTimestamp()
      });
      return { id: sideEffectRef.id, success: true };
    } catch (error) {
      console.error('Error reporting side effect:', error);
      throw error;
    }
  },

  // Get drug interactions
  checkDrugInteractions: async (medicationIds) => {
    try {
      // This would typically integrate with a drug interaction database
      // For now, we'll return mock data
      const interactions = [
        {
          medication1: 'Warfarin',
          medication2: 'Aspirin',
          severity: 'High',
          description: 'Increased bleeding risk',
          recommendation: 'Monitor INR closely'
        }
      ];

      return interactions;
    } catch (error) {
      console.error('Error checking drug interactions:', error);
      throw error;
    }
  },

  // Subscribe to medication updates
  subscribeToMedications: (callback) => {
    const medicationsQuery = query(
      collection(db, 'medications'),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(medicationsQuery, (snapshot) => {
      const medications = [];
      snapshot.forEach((doc) => {
        medications.push({
          id: doc.id,
          ...doc.data(),
          startDate: doc.data().startDate?.toDate(),
          endDate: doc.data().endDate?.toDate(),
          lastTaken: doc.data().lastTaken?.toDate(),
          nextDose: doc.data().nextDose?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(medications);
    });
  },

  // Create medication reminder (using Firebase Functions)
  createReminder: async (medicationId, reminderData) => {
    try {
      logger.debug('Creating medication reminder', { medicationId, reminderData });
      
      const result = await createMedicationReminder({
        medicationId,
        ...reminderData
      });
      
      logger.info('Medication reminder created successfully', { reminderId: result.data.id });
      return result.data;
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'create_medication_reminder', 
        medicationId, 
        reminderData 
      });
      throw error;
    }
  },

  // Log medication dose (using Firebase Functions)
  logDose: async (medicationId, doseData) => {
    try {
      logger.debug('Logging medication dose', { medicationId, doseData });
      
      const result = await logMedicationDose({
        medicationId,
        ...doseData
      });
      
      logger.info('Medication dose logged successfully', { logId: result.data.id });
      return result.data;
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'log_medication_dose', 
        medicationId, 
        doseData 
      });
      throw error;
    }
  },

  // Get medication analytics (using Firebase Functions)
  getAnalytics: async (patientId, dateRange = {}) => {
    try {
      logger.debug('Getting medication analytics', { patientId, dateRange });
      
      const result = await getMedicationAnalytics({
        patientId,
        dateRange
      });
      
      logger.info('Medication analytics retrieved successfully');
      return result.data;
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'medication_analytics', 
        patientId, 
        dateRange 
      });
      throw error;
    }
  }
};

// Helper function to calculate next dose time
const calculateNextDoseTime = (currentTime, frequency, reminderTimes) => {
  const now = new Date(currentTime);
  let nextDose = new Date(now);

  switch (frequency.toLowerCase()) {
    case 'once daily':
      nextDose.setDate(now.getDate() + 1);
      break;
    case 'twice daily':
      // Find next reminder time
      if (reminderTimes.length >= 2) {
        const currentHour = now.getHours();
        const morningTime = parseInt(reminderTimes[0].split(':')[0]);
        const eveningTime = parseInt(reminderTimes[1].split(':')[0]);
        
        if (currentHour < morningTime) {
          nextDose.setHours(morningTime, parseInt(reminderTimes[0].split(':')[1]), 0, 0);
        } else if (currentHour < eveningTime) {
          nextDose.setHours(eveningTime, parseInt(reminderTimes[1].split(':')[1]), 0, 0);
        } else {
          nextDose.setDate(now.getDate() + 1);
          nextDose.setHours(morningTime, parseInt(reminderTimes[0].split(':')[1]), 0, 0);
        }
      } else {
        nextDose.setHours(now.getHours() + 12);
      }
      break;
    case 'three times daily':
      nextDose.setHours(now.getHours() + 8);
      break;
    case 'four times daily':
      nextDose.setHours(now.getHours() + 6);
      break;
    case 'as needed':
      // For PRN medications, set next dose to 24 hours later
      nextDose.setDate(now.getDate() + 1);
      break;
    default:
      nextDose.setDate(now.getDate() + 1);
  }

  return nextDose;
};
