import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  getDoc,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'backend/database';
import { db } from '../backend/config';

/**
 * Prescription Refills API
 * Manages medication refill requests and scheduling
 */

export const prescriptionRefillsAPI = {
  
  /**
   * Create a refill request
   */
  createRefillRequest: async (refillData) => {
    try {
      const refillRequest = {
        medicationId: refillData.medicationId,
        medicationName: refillData.medicationName,
        clientId: refillData.clientId,
        clientName: refillData.clientName,
        doctorId: refillData.doctorId || null,
        doctorName: refillData.doctorName || null,
        institutionId: refillData.institutionId,
        
        // Refill details
        currentPrescriptionId: refillData.currentPrescriptionId,
        dosage: refillData.dosage,
        frequency: refillData.frequency,
        quantity: refillData.quantity,
        daysSupply: refillData.daysSupply || 30,
        
        // Status tracking
        status: 'pending', // pending, doctor_approval_needed, approved, filled, cancelled, rejected
        requiresDoctorApproval: refillData.requiresDoctorApproval || false,
        
        // Dates
        requestedDate: serverTimestamp(),
        lastFillDate: refillData.lastFillDate || null,
        nextRefillDate: refillData.nextRefillDate || null,
        
        // Notes
        patientNotes: refillData.patientNotes || '',
        pharmacistNotes: '',
        doctorNotes: '',
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'prescriptionRefills'), refillRequest);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating refill request:', error);
      throw error;
    }
  },

  /**
   * Get refill requests for a Client
   */
  getRefillsByPatient: async (clientId, filters = {}) => {
    try {
      let refillsQuery = query(
        collection(db, 'prescriptionRefills'),
        where('clientId', '==', clientId),
        orderBy('requestedDate', 'desc')
      );

      if (filters.status) {
        refillsQuery = query(refillsQuery, where('status', '==', filters.status));
      }

      if (filters.limit) {
        refillsQuery = query(refillsQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(refillsQuery);
      const refills = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        refills.push({
          id: doc.id,
          ...data,
          requestedDate: data.requestedDate?.toDate(),
          lastFillDate: data.lastFillDate?.toDate(),
          nextRefillDate: data.nextRefillDate?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        });
      });

      return refills;
    } catch (error) {
      console.error('Error fetching Client refills:', error);
      throw error;
    }
  },

  /**
   * Get pending refill requests for pharmacy
   */
  getPendingRefills: async (institutionId) => {
    try {
      const refillsQuery = query(
        collection(db, 'prescriptionRefills'),
        where('institutionId', '==', institutionId),
        where('status', 'in', ['pending', 'approved']),
        orderBy('requestedDate', 'asc')
      );

      const snapshot = await getDocs(refillsQuery);
      const refills = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        refills.push({
          id: doc.id,
          ...data,
          requestedDate: data.requestedDate?.toDate(),
          lastFillDate: data.lastFillDate?.toDate(),
          nextRefillDate: data.nextRefillDate?.toDate()
        });
      });

      return refills;
    } catch (error) {
      console.error('Error fetching pending refills:', error);
      throw error;
    }
  },

  /**
   * Get refills needing doctor approval
   */
  getRefillsNeedingApproval: async (doctorId) => {
    try {
      const refillsQuery = query(
        collection(db, 'prescriptionRefills'),
        where('doctorId', '==', doctorId),
        where('status', '==', 'doctor_approval_needed'),
        orderBy('requestedDate', 'asc')
      );

      const snapshot = await getDocs(refillsQuery);
      const refills = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        refills.push({
          id: doc.id,
          ...data,
          requestedDate: data.requestedDate?.toDate()
        });
      });

      return refills;
    } catch (error) {
      console.error('Error fetching refills for approval:', error);
      throw error;
    }
  },

  /**
   * Approve refill request (by doctor)
   */
  approveRefill: async (refillId, doctorNotes = '') => {
    try {
      const refillRef = doc(db, 'prescriptionRefills', refillId);
      
      await updateDoc(refillRef, {
        status: 'approved',
        doctorNotes,
        approvedDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving refill:', error);
      throw error;
    }
  },

  /**
   * Reject refill request
   */
  rejectRefill: async (refillId, reason) => {
    try {
      const refillRef = doc(db, 'prescriptionRefills', refillId);
      
      await updateDoc(refillRef, {
        status: 'rejected',
        rejectionReason: reason,
        rejectedDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting refill:', error);
      throw error;
    }
  },

  /**
   * Fill refill request (by pharmacist)
   */
  fillRefill: async (refillId, pharmacistData) => {
    try {
      const refillRef = doc(db, 'prescriptionRefills', refillId);
      
      // Calculate next refill date
      const daysSupply = pharmacistData.daysSupply || 30;
      const nextRefillDate = new Date();
      nextRefillDate.setDate(nextRefillDate.getDate() + daysSupply - 7); // 7 days before running out

      await updateDoc(refillRef, {
        status: 'filled',
        pharmacistId: pharmacistData.pharmacistId,
        pharmacistName: pharmacistData.pharmacistName,
        pharmacistNotes: pharmacistData.notes || '',
        filledDate: serverTimestamp(),
        lastFillDate: serverTimestamp(),
        nextRefillDate: Timestamp.fromDate(nextRefillDate),
        updatedAt: serverTimestamp()
      });

      return { success: true, nextRefillDate };
    } catch (error) {
      console.error('Error filling refill:', error);
      throw error;
    }
  },

  /**
   * Get medications due for refill
   */
  getMedicationsDueForRefill: async (clientId, daysThreshold = 7) => {
    try {
      const today = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(today.getDate() + daysThreshold);

      const refillsQuery = query(
        collection(db, 'prescriptionRefills'),
        where('clientId', '==', clientId),
        where('status', '==', 'filled'),
        where('nextRefillDate', '<=', Timestamp.fromDate(thresholdDate))
      );

      const snapshot = await getDocs(refillsQuery);
      const dueRefills = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const nextRefillDate = data.nextRefillDate?.toDate();
        const daysUntilDue = Math.ceil((nextRefillDate - today) / (1000 * 60 * 60 * 24));
        
        dueRefills.push({
          id: doc.id,
          ...data,
          nextRefillDate,
          daysUntilDue,
          isOverdue: daysUntilDue < 0
        });
      });

      // Sort by days until due (overdue first)
      dueRefills.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      return dueRefills;
    } catch (error) {
      console.error('Error fetching medications due for refill:', error);
      throw error;
    }
  },

  /**
   * Get refill history for a medication
   */
  getRefillHistory: async (medicationId) => {
    try {
      const historyQuery = query(
        collection(db, 'prescriptionRefills'),
        where('medicationId', '==', medicationId),
        orderBy('requestedDate', 'desc')
      );

      const snapshot = await getDocs(historyQuery);
      const history = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          ...data,
          requestedDate: data.requestedDate?.toDate(),
          filledDate: data.filledDate?.toDate()
        });
      });

      return history;
    } catch (error) {
      console.error('Error fetching refill history:', error);
      throw error;
    }
  },

  /**
   * Calculate refill compliance rate
   */
  calculateComplianceRate: async (clientId, months = 6) => {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const refillsQuery = query(
        collection(db, 'prescriptionRefills'),
        where('clientId', '==', clientId),
        where('requestedDate', '>=', Timestamp.fromDate(startDate))
      );

      const snapshot = await getDocs(refillsQuery);
      let totalRefills = 0;
      let onTimeRefills = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalRefills++;
        
        if (data.status === 'filled') {
          const requestedDate = data.requestedDate?.toDate();
          const filledDate = data.filledDate?.toDate();
          const daysDifference = Math.ceil((filledDate - requestedDate) / (1000 * 60 * 60 * 24));
          
          // Consider on-time if filled within 3 days of request
          if (daysDifference <= 3) {
            onTimeRefills++;
          }
        }
      });

      const complianceRate = totalRefills > 0 ? (onTimeRefills / totalRefills) * 100 : 0;

      return {
        complianceRate: Math.round(complianceRate),
        totalRefills,
        onTimeRefills,
        lateRefills: totalRefills - onTimeRefills
      };
    } catch (error) {
      console.error('Error calculating compliance rate:', error);
      throw error;
    }
  },

  /**
   * Subscribe to refill updates
   */
  subscribeToRefills: (clientId, callback) => {
    const refillsQuery = query(
      collection(db, 'prescriptionRefills'),
      where('clientId', '==', clientId),
      orderBy('requestedDate', 'desc')
    );

    return onSnapshot(refillsQuery, (snapshot) => {
      const refills = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        refills.push({
          id: doc.id,
          ...data,
          requestedDate: data.requestedDate?.toDate(),
          nextRefillDate: data.nextRefillDate?.toDate()
        });
      });
      callback(refills);
    });
  }
};

export default prescriptionRefillsAPI;

