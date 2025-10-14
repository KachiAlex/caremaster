import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CONSULTATIONS_COLLECTION = 'consultations';

// Consultation types
export const CONSULTATION_TYPES = {
  TELEMEDICINE: 'telemedicine',
  IN_PERSON: 'in-person',
  FOLLOW_UP: 'follow-up',
  REVIEW: 'review',
  EMERGENCY: 'emergency'
};

// Create a new consultation
export const createConsultation = async (consultationData) => {
  try {
    if (!consultationData.clientId || !consultationData.doctorId) {
      throw new Error('Client ID and Doctor ID are required');
    }

    const consultationsRef = collection(db, CONSULTATIONS_COLLECTION);
    const newConsultation = {
      clientId: consultationData.clientId,
      clientName: consultationData.clientName || '',
      doctorId: consultationData.doctorId,
      doctorName: consultationData.doctorName || '',
      institutionId: consultationData.institutionId || '',
      
      // Consultation details
      consultationType: consultationData.consultationType || CONSULTATION_TYPES.REVIEW,
      consultationDate: consultationData.consultationDate || new Date().toISOString(),
      chiefComplaint: consultationData.chiefComplaint || '',
      
      // Clinical findings
      subjective: consultationData.subjective || '', // Patient's description
      objective: consultationData.objective || '', // Doctor's observations
      assessment: consultationData.assessment || '', // Diagnosis/Assessment
      plan: consultationData.plan || '', // Treatment plan
      
      // Vital signs (if recorded during consultation)
      vitalSigns: consultationData.vitalSigns || null,
      
      // Related documents
      relatedMedicalReports: consultationData.relatedMedicalReports || [],
      relatedCareLogs: consultationData.relatedCareLogs || [],
      relatedPrescriptions: consultationData.relatedPrescriptions || [],
      
      // Follow-up
      followUpRequired: consultationData.followUpRequired || false,
      followUpDate: consultationData.followUpDate || null,
      followUpNotes: consultationData.followUpNotes || '',
      
      // Additional notes
      notes: consultationData.notes || '',
      privateNotes: consultationData.privateNotes || '', // Doctor's private notes
      
      // Status
      status: 'completed', // completed, scheduled, cancelled
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(consultationsRef, newConsultation);
    console.log('✅ Consultation created with ID:', docRef.id);
    
    return { id: docRef.id, ...newConsultation };
  } catch (error) {
    console.error('Error creating consultation:', error);
    throw error;
  }
};

// Get consultations by client
export const getConsultationsByClient = async (clientId, limitCount = 50) => {
  try {
    const consultationsRef = collection(db, CONSULTATIONS_COLLECTION);
    const q = query(
      consultationsRef,
      where('clientId', '==', clientId),
      orderBy('consultationDate', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const consultations = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      consultations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        consultationDate: data.consultationDate || data.createdAt
      });
    });

    return consultations;
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return [];
  }
};

// Get consultations by doctor
export const getConsultationsByDoctor = async (doctorId, limitCount = 50) => {
  try {
    const consultationsRef = collection(db, CONSULTATIONS_COLLECTION);
    const q = query(
      consultationsRef,
      where('doctorId', '==', doctorId),
      orderBy('consultationDate', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const consultations = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      consultations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      });
    });

    return consultations;
  } catch (error) {
    console.error('Error fetching consultations by doctor:', error);
    return [];
  }
};

// Get recent consultations for institution
export const getRecentConsultations = async (institutionId, limitCount = 20) => {
  try {
    const consultationsRef = collection(db, CONSULTATIONS_COLLECTION);
    const q = query(
      consultationsRef,
      where('institutionId', '==', institutionId),
      orderBy('consultationDate', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const consultations = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      consultations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      });
    });

    return consultations;
  } catch (error) {
    console.error('Error fetching recent consultations:', error);
    return [];
  }
};

// Get a single consultation
export const getConsultation = async (consultationId) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    const consultationDoc = await getDoc(consultationRef);
    
    if (consultationDoc.exists()) {
      return {
        id: consultationDoc.id,
        ...consultationDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching consultation:', error);
    throw error;
  }
};

// Update consultation
export const updateConsultation = async (consultationId, updates) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await updateDoc(consultationRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating consultation:', error);
    throw error;
  }
};

// Delete consultation
export const deleteConsultation = async (consultationId) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await deleteDoc(consultationRef);
    return true;
  } catch (error) {
    console.error('Error deleting consultation:', error);
    throw error;
  }
};

// Get consultation statistics for a doctor
export const getConsultationStats = async (doctorId, startDate, endDate) => {
  try {
    const allConsultations = await getConsultationsByDoctor(doctorId, 500);
    
    let consultations = allConsultations;
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      
      consultations = allConsultations.filter(c => {
        const consultTime = new Date(c.consultationDate).getTime();
        return consultTime >= start && consultTime <= end;
      });
    }

    const stats = {
      totalConsultations: consultations.length,
      byType: {},
      uniqueClients: new Set(consultations.map(c => c.clientId)).size,
      followUpRequired: consultations.filter(c => c.followUpRequired).length,
      averageConsultationsPerDay: 0
    };

    // Group by consultation type
    Object.values(CONSULTATION_TYPES).forEach(type => {
      stats.byType[type] = consultations.filter(c => c.consultationType === type).length;
    });

    // Calculate average per day
    if (startDate && endDate) {
      const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      stats.averageConsultationsPerDay = days > 0 ? (consultations.length / days).toFixed(1) : 0;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching consultation stats:', error);
    return {
      totalConsultations: 0,
      byType: {},
      uniqueClients: 0,
      followUpRequired: 0,
      averageConsultationsPerDay: 0
    };
  }
};

export default {
  createConsultation,
  getConsultationsByClient,
  getConsultationsByDoctor,
  getRecentConsultations,
  getConsultation,
  updateConsultation,
  deleteConsultation,
  getConsultationStats,
  CONSULTATION_TYPES
};

