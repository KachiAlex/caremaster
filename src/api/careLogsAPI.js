import { db } from '../backend/config';
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
  limit,
  onSnapshot
} from 'backend/database';

const CARE_LOGS_COLLECTION = 'careLogs';

// Create a new care log entry (All roles)
export const createCareLog = async (careLogData) => {
  try {
    const docRef = await addDoc(collection(db, CARE_LOGS_COLLECTION), {
      ...careLogData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Care log created:', docRef.id);
    return { id: docRef.id, ...careLogData };
  } catch (error) {
    console.error('❌ Error creating care log:', error);
    throw error;
  }
};

// Get care logs for a specific client
export const getCareLogsByClient = async (clientId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('logDate', 'desc'),
      orderBy('logTime', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      logDate: doc.data().logDate?.toDate ? doc.data().logDate.toDate() : new Date(doc.data().logDate)
    }));
    
    console.log(`✅ Loaded ${logs.length} care logs for client ${clientId}`);
    return logs;
  } catch (error) {
    console.error('❌ Error fetching care logs:', error);
    throw error;
  }
};

// Get care logs by caregiver
export const getCareLogsByCaregiver = async (caregiverId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('caregiverId', '==', caregiverId),
      orderBy('logDate', 'desc'),
      orderBy('logTime', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      logDate: doc.data().logDate?.toDate ? doc.data().logDate.toDate() : new Date(doc.data().logDate)
    }));
    
    console.log(`✅ Loaded ${logs.length} care logs by caregiver ${caregiverId}`);
    return logs;
  } catch (error) {
    console.error('❌ Error fetching caregiver care logs:', error);
    throw error;
  }
};

// Get care logs for specific date
export const getCareLogsByDate = async (clientId, date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('clientId', '==', clientId),
      where('logDate', '>=', Timestamp.fromDate(startOfDay)),
      where('logDate', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('logDate', 'desc'),
      orderBy('logTime', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      logDate: doc.data().logDate?.toDate ? doc.data().logDate.toDate() : new Date(doc.data().logDate)
    }));
    
    console.log(`✅ Loaded ${logs.length} care logs for ${date}`);
    return logs;
  } catch (error) {
    console.error('❌ Error fetching care logs by date:', error);
    throw error;
  }
};

// Get care logs by role type
export const getCareLogsByRole = async (clientId, roleType, limitCount = 50) => {
  try {
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('clientId', '==', clientId),
      where('roleType', '==', roleType),
      orderBy('logDate', 'desc'),
      orderBy('logTime', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      logDate: doc.data().logDate?.toDate ? doc.data().logDate.toDate() : new Date(doc.data().logDate)
    }));
    
    console.log(`✅ Loaded ${logs.length} ${roleType} care logs for client ${clientId}`);
    return logs;
  } catch (error) {
    console.error('❌ Error fetching care logs by role:', error);
    throw error;
  }
};

// Get a single care log
export const getCareLog = async (logId) => {
  try {
    const docRef = doc(db, CARE_LOGS_COLLECTION, logId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        logDate: data.logDate?.toDate ? data.logDate.toDate() : new Date(data.logDate)
      };
    } else {
      throw new Error('Care log not found');
    }
  } catch (error) {
    console.error('❌ Error fetching care log:', error);
    throw error;
  }
};

// Update a care log
export const updateCareLog = async (logId, updateData) => {
  try {
    const docRef = doc(db, CARE_LOGS_COLLECTION, logId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Care log updated:', logId);
    return { id: logId, ...updateData };
  } catch (error) {
    console.error('❌ Error updating care log:', error);
    throw error;
  }
};

// Delete a care log
export const deleteCareLog = async (logId) => {
  try {
    const docRef = doc(db, CARE_LOGS_COLLECTION, logId);
    await deleteDoc(docRef);
    
    console.log('✅ Care log deleted:', logId);
    return logId;
  } catch (error) {
    console.error('❌ Error deleting care log:', error);
    throw error;
  }
};

// Real-time subscription to care logs for a client
export const subscribeToCareLogsByClient = (clientId, limitCount = 50, callback) => {
  try {
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('logDate', 'desc'),
      orderBy('logTime', 'desc'),
      limit(limitCount)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        logDate: doc.data().logDate?.toDate ? doc.data().logDate.toDate() : new Date(doc.data().logDate)
      }));
      
      console.log(`🔄 Real-time update: ${logs.length} care logs for client ${clientId}`);
      callback(logs);
    }, (error) => {
      console.error('❌ Error in care logs subscription:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up care logs subscription:', error);
    throw error;
  }
};

const careLogsAPI = {
  createCareLog,
  getCareLogsByClient,
  getCareLogsByCaregiver,
  getCareLogsByDate,
  getCareLogsByRole,
  getCareLog,
  updateCareLog,
  deleteCareLog,
  subscribeToCareLogsByClient
};

export { careLogsAPI };
export default careLogsAPI;
