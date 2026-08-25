import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'backend/database';
import { db } from '../backend/config';

const MEDICAL_REPORTS_COLLECTION = 'medicalReports';

// Create a new medical report (Doctor only)
export const createMedicalReport = async (reportData) => {
  try {
    const docRef = await addDoc(collection(db, MEDICAL_REPORTS_COLLECTION), {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Medical report created:', docRef.id);
    return { id: docRef.id, ...reportData };
  } catch (error) {
    console.error('❌ Error creating medical report:', error);
    throw error;
  }
};

// Get medical reports for a specific client
export const getMedicalReportsByClient = async (clientId) => {
  try {
    const q = query(
      collection(db, MEDICAL_REPORTS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('reportDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      reportDate: doc.data().reportDate?.toDate ? doc.data().reportDate.toDate() : new Date(doc.data().reportDate)
    }));
    
    console.log(`✅ Loaded ${reports.length} medical reports for client ${clientId}`);
    return reports;
  } catch (error) {
    console.error('❌ Error fetching medical reports:', error);
    throw error;
  }
};

// Get all medical reports by a specific doctor
export const getMedicalReportsByDoctor = async (doctorId) => {
  try {
    const q = query(
      collection(db, MEDICAL_REPORTS_COLLECTION),
      where('doctorId', '==', doctorId),
      orderBy('reportDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      reportDate: doc.data().reportDate?.toDate ? doc.data().reportDate.toDate() : new Date(doc.data().reportDate)
    }));
    
    console.log(`✅ Loaded ${reports.length} medical reports by doctor ${doctorId}`);
    return reports;
  } catch (error) {
    console.error('❌ Error fetching doctor medical reports:', error);
    throw error;
  }
};

// Get a single medical report
export const getMedicalReport = async (reportId) => {
  try {
    const docRef = doc(db, MEDICAL_REPORTS_COLLECTION, reportId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        reportDate: data.reportDate?.toDate ? data.reportDate.toDate() : new Date(data.reportDate)
      };
    } else {
      throw new Error('Medical report not found');
    }
  } catch (error) {
    console.error('❌ Error fetching medical report:', error);
    throw error;
  }
};

// Update a medical report
export const updateMedicalReport = async (reportId, updateData) => {
  try {
    const docRef = doc(db, MEDICAL_REPORTS_COLLECTION, reportId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Medical report updated:', reportId);
    return { id: reportId, ...updateData };
  } catch (error) {
    console.error('❌ Error updating medical report:', error);
    throw error;
  }
};

// Delete a medical report
export const deleteMedicalReport = async (reportId) => {
  try {
    const docRef = doc(db, MEDICAL_REPORTS_COLLECTION, reportId);
    await deleteDoc(docRef);
    
    console.log('✅ Medical report deleted:', reportId);
    return reportId;
  } catch (error) {
    console.error('❌ Error deleting medical report:', error);
    throw error;
  }
};

// Real-time subscription to medical reports for a client
export const subscribeToMedicalReportsByClient = (clientId, callback) => {
  try {
    const q = query(
      collection(db, MEDICAL_REPORTS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('reportDate', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        reportDate: doc.data().reportDate?.toDate ? doc.data().reportDate.toDate() : new Date(doc.data().reportDate)
      }));
      
      console.log(`🔄 Real-time update: ${reports.length} medical reports for client ${clientId}`);
      callback(reports);
    }, (error) => {
      console.error('❌ Error in medical reports subscription:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up medical reports subscription:', error);
    throw error;
  }
};

const medicalReportsAPI = {
  createMedicalReport,
  getMedicalReportsByClient,
  getMedicalReportsByDoctor,
  getMedicalReport,
  updateMedicalReport,
  deleteMedicalReport,
  subscribeToMedicalReportsByClient
};

export { medicalReportsAPI };
export default medicalReportsAPI;

