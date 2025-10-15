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
import { logClientActivity } from './clientActivitiesAPI';
import { notificationsAPI } from './notificationsAPI';

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
    
    // Log activity to client's activity log
    try {
      await logClientActivity({
        clientId: consultationData.clientId,
        activityType: 'consultation',
        performedBy: consultationData.doctorId,
        performerName: consultationData.doctorName,
        performerRole: 'doctor',
        description: `${consultationData.consultationType} consultation - ${consultationData.chiefComplaint}`,
        details: {
          consultationId: docRef.id,
          consultationType: consultationData.consultationType,
          chiefComplaint: consultationData.chiefComplaint,
          assessment: consultationData.assessment
        },
        institutionId: consultationData.institutionId
      });
    } catch (activityError) {
      console.error('Error logging consultation activity:', activityError);
      // Don't throw - consultation was created successfully
    }
    
    // Send notification to admin
    try {
      await sendAdminNotification({
        type: 'doctor_consultation',
        title: 'New Consultation Recorded',
        message: `Dr. ${consultationData.doctorName} completed a ${consultationData.consultationType} consultation for ${consultationData.clientName}`,
        priority: consultationData.consultationType === CONSULTATION_TYPES.EMERGENCY ? 'high' : 'medium',
        data: {
          clientId: consultationData.clientId,
          clientName: consultationData.clientName,
          consultationId: docRef.id,
          doctorId: consultationData.doctorId,
          doctorName: consultationData.doctorName,
          consultationType: consultationData.consultationType,
          chiefComplaint: consultationData.chiefComplaint,
          institutionId: consultationData.institutionId
        },
        institutionId: consultationData.institutionId
      });
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
      // Don't throw - consultation was created successfully
    }
    
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

// Helper function to send admin notifications
const sendAdminNotification = async (notificationData) => {
  try {
    // Get all admins for the institution
    const adminsQuery = query(
      collection(db, 'users'),
      where('userType', '==', 'admin'),
      where('institutionId', '==', notificationData.institutionId || null)
    );
    
    const adminsSnapshot = await getDocs(adminsQuery);
    
    // Send notification to each admin
    const notificationPromises = adminsSnapshot.docs.map(async (adminDoc) => {
      const adminId = adminDoc.id;
      const adminData = adminDoc.data();
      
      return await notificationsAPI.createNotification({
        userId: adminId,
        userEmail: adminData.email,
        userType: 'admin',
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'medium',
        data: notificationData.data || {},
        source: 'consultation_system'
      });
    });

    await Promise.all(notificationPromises);
    console.log('✅ Admin notifications sent:', adminsSnapshot.size, 'admins notified');
  } catch (error) {
    console.error('❌ Error sending admin notifications:', error);
    // Don't throw error to avoid breaking the main operation
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

