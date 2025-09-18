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

const VITAL_SIGNS_COLLECTION = 'vitalSigns';

// Get all vital signs for a patient
export const getVitalSignsByPatient = async (patientId) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    const q = query(
      vitalSignsRef, 
      where('patientId', '==', patientId),
      orderBy('recordedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const vitalSigns = [];
    querySnapshot.forEach((doc) => {
      const vitalData = doc.data();
      vitalSigns.push({
        id: doc.id,
        ...vitalData,
        recordedAt: vitalData.recordedAt?.toDate?.() || vitalData.recordedAt,
        createdAt: vitalData.createdAt?.toDate?.() || vitalData.createdAt,
        updatedAt: vitalData.updatedAt?.toDate?.() || vitalData.updatedAt,
      });
    });
    
    return vitalSigns;
  } catch (error) {
    console.error('Error fetching vital signs:', error);
    throw error;
  }
};

// Get latest vital signs for a patient
export const getLatestVitalSigns = async (patientId) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    // Simplified query without composite index requirement
    const q = query(
      vitalSignsRef, 
      where('patientId', '==', patientId),
      limit(10) // Get more records and sort client-side
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Sort client-side by recordedAt desc and get the latest
      const sortedDocs = querySnapshot.docs.sort((a, b) => {
        const aTime = a.data().recordedAt?.toDate?.() || new Date(a.data().recordedAt);
        const bTime = b.data().recordedAt?.toDate?.() || new Date(b.data().recordedAt);
        return bTime - aTime;
      });
      
      const doc = sortedDocs[0];
      const vitalData = doc.data();
      return {
        id: doc.id,
        ...vitalData,
        recordedAt: vitalData.recordedAt?.toDate?.() || vitalData.recordedAt,
        createdAt: vitalData.createdAt?.toDate?.() || vitalData.createdAt,
        updatedAt: vitalData.updatedAt?.toDate?.() || vitalData.updatedAt,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching latest vital signs:', error);
    throw error;
  }
};

// Get vital signs by type for a patient
export const getVitalSignsByType = async (patientId, vitalType) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    const q = query(
      vitalSignsRef, 
      where('patientId', '==', patientId),
      where('type', '==', vitalType),
      orderBy('recordedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const vitalSigns = [];
    querySnapshot.forEach((doc) => {
      const vitalData = doc.data();
      vitalSigns.push({
        id: doc.id,
        ...vitalData,
        recordedAt: vitalData.recordedAt?.toDate?.() || vitalData.recordedAt,
        createdAt: vitalData.createdAt?.toDate?.() || vitalData.createdAt,
        updatedAt: vitalData.updatedAt?.toDate?.() || vitalData.updatedAt,
      });
    });
    
    return vitalSigns;
  } catch (error) {
    console.error('Error fetching vital signs by type:', error);
    throw error;
  }
};

// Create new vital sign record
export const createVitalSign = async (vitalSignData) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    const newVitalSign = {
      ...vitalSignData,
      recordedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(vitalSignsRef, newVitalSign);
    return docRef.id;
  } catch (error) {
    console.error('Error creating vital sign:', error);
    throw error;
  }
};

// Update vital sign record
export const updateVitalSign = async (vitalSignId, updateData) => {
  try {
    const vitalSignRef = doc(db, VITAL_SIGNS_COLLECTION, vitalSignId);
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(vitalSignRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating vital sign:', error);
    throw error;
  }
};

// Delete vital sign record
export const deleteVitalSign = async (vitalSignId) => {
  try {
    const vitalSignRef = doc(db, VITAL_SIGNS_COLLECTION, vitalSignId);
    await deleteDoc(vitalSignRef);
    return true;
  } catch (error) {
    console.error('Error deleting vital sign:', error);
    throw error;
  }
};

// Get vital signs within date range
export const getVitalSignsByDateRange = async (patientId, startDate, endDate) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    const q = query(
      vitalSignsRef, 
      where('patientId', '==', patientId),
      where('recordedAt', '>=', Timestamp.fromDate(startDate)),
      where('recordedAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('recordedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const vitalSigns = [];
    querySnapshot.forEach((doc) => {
      const vitalData = doc.data();
      vitalSigns.push({
        id: doc.id,
        ...vitalData,
        recordedAt: vitalData.recordedAt?.toDate?.() || vitalData.recordedAt,
        createdAt: vitalData.createdAt?.toDate?.() || vitalData.createdAt,
        updatedAt: vitalData.updatedAt?.toDate?.() || vitalData.updatedAt,
      });
    });
    
    return vitalSigns;
  } catch (error) {
    console.error('Error fetching vital signs by date range:', error);
    throw error;
  }
};

// Get vital signs trends (last 7 days)
export const getVitalSignsTrends = async (patientId, vitalType) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const vitalSigns = await getVitalSignsByDateRange(patientId, startDate, endDate);
    
    // Filter by type if specified
    const filteredSigns = vitalType ? 
      vitalSigns.filter(vital => vital.type === vitalType) : 
      vitalSigns;
    
    // Group by type and calculate trends
    const trends = {};
    filteredSigns.forEach(vital => {
      if (!trends[vital.type]) {
        trends[vital.type] = [];
      }
      trends[vital.type].push({
        value: vital.value,
        unit: vital.unit,
        recordedAt: vital.recordedAt,
        status: vital.status
      });
    });
    
    // Calculate trend direction for each type
    Object.keys(trends).forEach(type => {
      const values = trends[type];
      if (values.length >= 2) {
        const latest = parseFloat(values[0].value);
        const previous = parseFloat(values[1].value);
        
        if (latest > previous) {
          trends[type].trend = 'increasing';
        } else if (latest < previous) {
          trends[type].trend = 'decreasing';
        } else {
          trends[type].trend = 'stable';
        }
        
        // Calculate average
        const sum = values.reduce((acc, val) => acc + parseFloat(val.value), 0);
        trends[type].average = (sum / values.length).toFixed(1);
      }
    });
    
    return trends;
  } catch (error) {
    console.error('Error fetching vital signs trends:', error);
    throw error;
  }
};

// Get vital sign by ID
export const getVitalSignById = async (vitalSignId) => {
  try {
    const vitalSignRef = doc(db, VITAL_SIGNS_COLLECTION, vitalSignId);
    const vitalSignSnap = await getDoc(vitalSignRef);
    
    if (vitalSignSnap.exists()) {
      const vitalData = vitalSignSnap.data();
      return {
        id: vitalSignSnap.id,
        ...vitalData,
        recordedAt: vitalData.recordedAt?.toDate?.() || vitalData.recordedAt,
        createdAt: vitalData.createdAt?.toDate?.() || vitalData.createdAt,
        updatedAt: vitalData.updatedAt?.toDate?.() || vitalData.updatedAt,
      };
    } else {
      throw new Error('Vital sign not found');
    }
  } catch (error) {
    console.error('Error fetching vital sign:', error);
    throw error;
  }
};

// Real-time listener for vital signs
export const subscribeToVitalSigns = (callback, patientId) => {
  const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
  const q = query(
    vitalSignsRef, 
    where('patientId', '==', patientId),
    orderBy('recordedAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const vitalSigns = [];
    querySnapshot.forEach((doc) => {
      const vitalData = doc.data();
      vitalSigns.push({
        id: doc.id,
        ...vitalData,
        recordedAt: vitalData.recordedAt?.toDate?.() || vitalData.recordedAt,
        createdAt: vitalData.createdAt?.toDate?.() || vitalData.createdAt,
        updatedAt: vitalData.updatedAt?.toDate?.() || vitalData.updatedAt,
      });
    });
    callback(vitalSigns);
  });
};

// Get vital signs statistics
export const getVitalSignsStats = async (patientId) => {
  try {
    const vitalSigns = await getVitalSignsByPatient(patientId);
    
    const stats = {
      total: vitalSigns.length,
      byType: {},
      lastWeek: 0,
      averagePerDay: 0
    };
    
    // Count by type
    vitalSigns.forEach(vital => {
      if (!stats.byType[vital.type]) {
        stats.byType[vital.type] = 0;
      }
      stats.byType[vital.type]++;
    });
    
    // Count last week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    stats.lastWeek = vitalSigns.filter(vital => 
      new Date(vital.recordedAt) >= weekAgo
    ).length;
    
    // Calculate average per day
    if (vitalSigns.length > 0) {
      const firstRecord = new Date(vitalSigns[vitalSigns.length - 1].recordedAt);
      const daysDiff = Math.ceil((new Date() - firstRecord) / (1000 * 60 * 60 * 24));
      stats.averagePerDay = daysDiff > 0 ? (vitalSigns.length / daysDiff).toFixed(1) : 0;
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting vital signs stats:', error);
    throw error;
  }
};
