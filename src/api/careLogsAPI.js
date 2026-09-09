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
import { db } from '../backend/config';

const CARE_LOGS_COLLECTION = 'careLogs';

/**
 * Safely convert a logDate value from any storage format to a Date.
 * Handles: Firestore Timestamp (with toDate()), {seconds, nanoseconds}
 * plain objects, ISO strings, Date objects, and null/invalid values.
 */
function safeToDate(value) {
  if (!value) return null;

  // Firestore Timestamp object with toDate() method
  if (typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
  }

  // Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // { seconds, nanoseconds } object (Firestore Timestamp after JSON round-trip)
  if (typeof value === 'object' && value !== null) {
    if (value.seconds != null && !isNaN(value.seconds)) {
      const d = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
      return isNaN(d.getTime()) ? null : d;
    }
    // Unknown object shape — try string conversion
    try {
      const d = new Date(String(value));
      return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
  }

  // String or number
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Map a Firestore doc snapshot to a care log object with safe date conversion.
 */
function mapCareLog(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeToDate(data.createdAt),
    updatedAt: safeToDate(data.updatedAt),
    logDate: safeToDate(data.logDate) || new Date(0), // fallback to epoch if corrupt
  };
}

/**
 * Sort care logs by logDate desc, then logTime desc.
 */
function sortCareLogs(logs) {
  return logs.sort((a, b) => {
    const av = a.logDate?.getTime?.() || 0;
    const bv = b.logDate?.getTime?.() || 0;
    if (bv !== av) return bv - av;
    return (b.logTime || '').localeCompare(a.logTime || '');
  });
}

// Create a new care log entry (All roles)
export const createCareLog = async (careLogData, institutionId = null) => {
  try {
    // Normalize logDate — handle Date objects, strings, and undefined values.
    // CareLogFormModal passes logDate as a Date object; NurseCareLogs omits
    // it entirely.  Previously, concatenating a Date object with 'T00:00:00'
    // produced an invalid date string, corrupting the stored logDate.
    const rawDate = careLogData.logDate || careLogData.activityDate;
    let normalizedDate;
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      normalizedDate = rawDate;
    } else if (typeof rawDate === 'string' && rawDate.trim()) {
      // Handle "YYYY-MM-DD" or full ISO strings
      normalizedDate = rawDate.includes('T')
        ? new Date(rawDate)
        : new Date(rawDate + 'T00:00:00');
    } else {
      // Fallback to today
      const today = new Date().toISOString().split('T')[0];
      normalizedDate = new Date(today + 'T00:00:00');
    }

    const normalizedData = {
      ...careLogData,
      // Persist institutionId if provided (NurseCareLogs passes it as the
      // second argument; CareLogFormModal includes it in the payload)
      institutionId: institutionId || careLogData.institutionId || null,
      logDate: Timestamp.fromDate(normalizedDate),
      logTime: careLogData.logTime || careLogData.activityTime || new Date().toTimeString().split(' ')[0],
    };

    const docRef = await addDoc(collection(db, CARE_LOGS_COLLECTION), {
      ...normalizedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Care log created:', docRef.id);
    return { id: docRef.id, ...normalizedData, logDate: normalizedData.logDate?.toDate ? normalizedData.logDate.toDate() : normalizedData.logDate };
  } catch (error) {
    console.error('❌ Error creating care log:', error);
    throw error;
  }
};

// Get care logs for a specific client
export const getCareLogsByClient = async (clientId, limitCount = 50) => {
  try {
    // Use a simple query with only where + limit to avoid composite index
    // requirements. Sort client-side to handle both logDate and logTime.
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('clientId', '==', clientId),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const logs = sortCareLogs(snapshot.docs.map(mapCareLog));
    
    console.log(`✅ Loaded ${logs.length} care logs for client ${clientId}`);
    return logs;
  } catch (error) {
    console.error('❌ Error fetching care logs:', error);
    // If the query fails entirely, try an even simpler fallback
    try {
      const fallbackQuery = query(
        collection(db, CARE_LOGS_COLLECTION),
        where('clientId', '==', clientId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const results = sortCareLogs(fallbackSnapshot.docs.map(mapCareLog)).slice(0, limitCount);
      console.log(`✅ Loaded ${results.length} care logs for client ${clientId} (fallback)`);
      return results;
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// Get care logs by caregiver
export const getCareLogsByCaregiver = async (caregiverId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('caregiverId', '==', caregiverId),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const logs = sortCareLogs(snapshot.docs.map(mapCareLog));
    
    console.log(`✅ Loaded ${logs.length} care logs by caregiver ${caregiverId}`);
    return logs;
  } catch (error) {
    console.error('❌ Error fetching caregiver care logs:', error);
    try {
      const fallbackQuery = query(
        collection(db, CARE_LOGS_COLLECTION),
        where('caregiverId', '==', caregiverId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const results = sortCareLogs(fallbackSnapshot.docs.map(mapCareLog)).slice(0, limitCount);
      console.log(`✅ Loaded ${results.length} care logs by caregiver ${caregiverId} (fallback)`);
      return results;
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// Get care logs for specific date
export const getCareLogsByDate = async (clientId, date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const startMs = startOfDay.getTime();
    const endMs = endOfDay.getTime();

    // Query by clientId only, filter by date range in memory to avoid
    // composite index requirements and corrupt logDate issues.
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('clientId', '==', clientId)
    );
    
    const snapshot = await getDocs(q);
    const allLogs = snapshot.docs.map(mapCareLog);
    const results = allLogs.filter((log) => {
      const logMs = log.logDate?.getTime?.() || 0;
      return logMs >= startMs && logMs <= endMs;
    });
    const sorted = sortCareLogs(results);
    
    console.log(`✅ Loaded ${sorted.length} care logs for ${date}`);
    return sorted;
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
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const logs = sortCareLogs(snapshot.docs.map(mapCareLog));
    
    console.log(`✅ Loaded ${logs.length} ${roleType} care logs for client ${clientId}`);
    return logs;
  } catch (error) {
    console.error('❌ Error fetching care logs by role:', error);
    try {
      const fallbackQuery = query(
        collection(db, CARE_LOGS_COLLECTION),
        where('clientId', '==', clientId),
        where('roleType', '==', roleType)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const results = sortCareLogs(fallbackSnapshot.docs.map(mapCareLog)).slice(0, limitCount);
      console.log(`✅ Loaded ${results.length} ${roleType} care logs for client ${clientId} (fallback)`);
      return results;
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// Get a single care log
export const getCareLog = async (logId) => {
  try {
    const docRef = doc(db, CARE_LOGS_COLLECTION, logId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return mapCareLog(docSnap);
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
    // Use a simple query with only where + limit to avoid composite index
    // requirements. Sort client-side. This ensures logs are always returned
    // regardless of logDate format or index availability.
    const q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('clientId', '==', clientId),
      limit(limitCount)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = sortCareLogs(snapshot.docs.map(mapCareLog));
      console.log(`🔄 Real-time update: ${logs.length} care logs for client ${clientId}`);
      callback(logs);
    }, (error) => {
      console.error('❌ Error in care logs subscription:', error);
      // On error, don't replace the existing logs with empty results.
      // The next successful poll will update the list.
    });
    
    return () => {
      unsubscribe();
    };
  } catch (error) {
    console.error('❌ Error setting up care logs subscription:', error);
    // Don't throw — return a no-op unsubscribe so the caller doesn't crash
    return () => {};
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
