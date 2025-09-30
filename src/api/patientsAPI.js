import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const PATIENTS_COLLECTION = 'patients';

// Get all patients (admin only)
export const getAllPatients = async () => {
  try {
    const patientsRef = collection(db, PATIENTS_COLLECTION);
    const q = query(patientsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const patients = [];
    querySnapshot.forEach((doc) => {
      const patientData = doc.data();
      patients.push({
        id: doc.id,
        ...patientData,
        dateOfBirth: patientData.dateOfBirth?.toDate?.() || patientData.dateOfBirth,
        createdAt: patientData.createdAt?.toDate?.() || patientData.createdAt,
        updatedAt: patientData.updatedAt?.toDate?.() || patientData.updatedAt,
        lastVisit: patientData.lastVisit?.toDate?.() || patientData.lastVisit,
      });
    });
    
    return patients;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
};

// Get patient by ID
export const getPatientById = async (patientId) => {
  try {
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    const patientSnap = await getDoc(patientRef);
    
    if (patientSnap.exists()) {
      const patientData = patientSnap.data();
      return {
        id: patientSnap.id,
        ...patientData,
        dateOfBirth: patientData.dateOfBirth?.toDate?.() || patientData.dateOfBirth,
        createdAt: patientData.createdAt?.toDate?.() || patientData.createdAt,
        updatedAt: patientData.updatedAt?.toDate?.() || patientData.updatedAt,
        lastVisit: patientData.lastVisit?.toDate?.() || patientData.lastVisit,
      };
    } else {
      throw new Error('Patient not found');
    }
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw error;
  }
};

// Get patients assigned to a caregiver
export const getPatientsByCaregiver = async (caregiverId) => {
  try {
    // First try to get patients directly assigned to caregiver
    const patientsRef = collection(db, PATIENTS_COLLECTION);
    const directQuery = query(patientsRef, where('assignedCaregiver', '==', caregiverId));
    const directSnapshot = await getDocs(directQuery);
    
    const directPatients = [];
    directSnapshot.forEach((doc) => {
      const patientData = doc.data();
      directPatients.push({
        id: doc.id,
        ...patientData,
        dateOfBirth: patientData.dateOfBirth?.toDate?.() || patientData.dateOfBirth,
        createdAt: patientData.createdAt?.toDate?.() || patientData.createdAt,
        updatedAt: patientData.updatedAt?.toDate?.() || patientData.updatedAt,
        lastVisit: patientData.lastVisit?.toDate?.() || patientData.lastVisit,
      });
    });

    // Also get patients from tasks assigned to this caregiver
    const tasksRef = collection(db, 'careTasks');
    const tasksQuery = query(tasksRef, where('caregiverId', '==', caregiverId));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const patientIds = new Set();
    tasksSnapshot.forEach((doc) => {
      const taskData = doc.data();
      if (taskData.patientId) {
        patientIds.add(taskData.patientId);
      }
    });

    // Also get patients from explicit patientAssignments collection
    const assignmentsRef = collection(db, 'patientAssignments');
    const assignmentsQuery = query(assignmentsRef, where('caregiverId', '==', caregiverId));
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    assignmentsSnapshot.forEach((doc) => {
      const assignmentData = doc.data();
      if (assignmentData.patientId && (assignmentData.status ?? 'active') === 'active') {
        patientIds.add(assignmentData.patientId);
      }
    });

    // Get patient details for task-assigned and explicitly assigned patients
    const taskPatients = [];
    for (const patientId of patientIds) {
      try {
        const patientDoc = await getDoc(doc(db, PATIENTS_COLLECTION, patientId));
        if (patientDoc.exists()) {
          const patientData = patientDoc.data();
          taskPatients.push({
            id: patientDoc.id,
            ...patientData,
            dateOfBirth: patientData.dateOfBirth?.toDate?.() || patientData.dateOfBirth,
            createdAt: patientData.createdAt?.toDate?.() || patientData.createdAt,
            updatedAt: patientData.updatedAt?.toDate?.() || patientData.updatedAt,
            lastVisit: patientData.lastVisit?.toDate?.() || patientData.lastVisit,
          });
        }
      } catch (error) {
        console.log('Could not fetch patient from task:', error);
      }
    }

          // Combine and deduplicate patients
          const allPatients = [...directPatients, ...taskPatients];
          const uniquePatients = allPatients.filter((patient, index, self) => 
            index === self.findIndex(p => p.id === patient.id)
          );
          
          // Sort by createdAt in memory (newest first)
          return uniquePatients.sort((a, b) => {
            const aTime = a.createdAt?.getTime?.() || 0;
            const bTime = b.createdAt?.getTime?.() || 0;
            return bTime - aTime;
          });
  } catch (error) {
    console.error('Error fetching patients by caregiver:', error);
    throw error;
  }
};

// Get patients assigned to a doctor
export const getPatientsByDoctor = async (doctorId) => {
  try {
    const patientsRef = collection(db, PATIENTS_COLLECTION);
    // Remove orderBy to avoid index requirement - we'll sort in memory
    const q = query(patientsRef, where('assignedDoctor', '==', doctorId));
    const querySnapshot = await getDocs(q);
    
    const patients = [];
    querySnapshot.forEach((doc) => {
      const patientData = doc.data();
      patients.push({
        id: doc.id,
        ...patientData,
        dateOfBirth: patientData.dateOfBirth?.toDate?.() || patientData.dateOfBirth,
        createdAt: patientData.createdAt?.toDate?.() || patientData.createdAt,
        updatedAt: patientData.updatedAt?.toDate?.() || patientData.updatedAt,
        lastVisit: patientData.lastVisit?.toDate?.() || patientData.lastVisit,
      });
    });
    
    // Sort by createdAt in memory (newest first)
    return patients.sort((a, b) => {
      const aTime = a.createdAt?.getTime?.() || 0;
      const bTime = b.createdAt?.getTime?.() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching patients by doctor:', error);
    throw error;
  }
};

// Create new patient
export const createPatient = async (patientData) => {
  try {
    const patientsRef = collection(db, PATIENTS_COLLECTION);
    const newPatient = {
      ...patientData,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastVisit: serverTimestamp(),
    };
    
    const docRef = await addDoc(patientsRef, newPatient);
    return docRef.id;
  } catch (error) {
    console.error('Error creating patient:', error);
    throw error;
  }
};

// Update patient
export const updatePatient = async (patientId, updateData) => {
  try {
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(patientRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating patient:', error);
    throw error;
  }
};

// Assign patient to caregiver
export const assignPatientToCaregiver = async (patientId, caregiverId) => {
  try {
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    await updateDoc(patientRef, {
      assignedCaregiver: caregiverId,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error assigning patient to caregiver:', error);
    throw error;
  }
};

// Assign patient to doctor
export const assignPatientToDoctor = async (patientId, doctorId) => {
  try {
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    await updateDoc(patientRef, {
      assignedDoctor: doctorId,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error assigning patient to doctor:', error);
    throw error;
  }
};

// Get patient's medical history
export const getPatientMedicalHistory = async (patientId) => {
  try {
    const medicalHistoryRef = collection(db, 'medicalHistory');
    const q = query(medicalHistoryRef, where('patientId', '==', patientId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const history = [];
    querySnapshot.forEach((doc) => {
      const historyData = doc.data();
      history.push({
        id: doc.id,
        ...historyData,
        date: historyData.date?.toDate?.() || historyData.date,
        createdAt: historyData.createdAt?.toDate?.() || historyData.createdAt,
      });
    });
    
    return history;
  } catch (error) {
    console.error('Error fetching patient medical history:', error);
    throw error;
  }
};

// Add medical record to patient
export const addMedicalRecord = async (patientId, recordData) => {
  try {
    const medicalHistoryRef = collection(db, 'medicalHistory');
    const newRecord = {
      ...recordData,
      patientId,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(medicalHistoryRef, newRecord);
    
    // Update patient's last visit
    await updatePatient(patientId, { lastVisit: serverTimestamp() });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding medical record:', error);
    throw error;
  }
};

// Get patient statistics
export const getPatientStats = async () => {
  try {
    const patients = await getAllPatients();
    
    const stats = {
      total: patients.length,
      active: patients.filter(patient => patient.status === 'active').length,
      inactive: patients.filter(patient => patient.status === 'inactive').length,
      withCaregiver: patients.filter(patient => patient.assignedCaregiver).length,
      withDoctor: patients.filter(patient => patient.assignedDoctor).length,
      averageAge: patients.reduce((sum, patient) => {
        if (patient.dateOfBirth) {
          const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
          return sum + age;
        }
        return sum;
      }, 0) / patients.length || 0,
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting patient stats:', error);
    throw error;
  }
};

// Real-time listener for patients
export const subscribeToPatients = (callback) => {
  const patientsRef = collection(db, PATIENTS_COLLECTION);
  const q = query(patientsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const patients = [];
    querySnapshot.forEach((doc) => {
      const patientData = doc.data();
      patients.push({
        id: doc.id,
        ...patientData,
        dateOfBirth: patientData.dateOfBirth?.toDate?.() || patientData.dateOfBirth,
        createdAt: patientData.createdAt?.toDate?.() || patientData.createdAt,
        updatedAt: patientData.updatedAt?.toDate?.() || patientData.updatedAt,
        lastVisit: patientData.lastVisit?.toDate?.() || patientData.lastVisit,
      });
    });
    callback(patients);
  });
};
