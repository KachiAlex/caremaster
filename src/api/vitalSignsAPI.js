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
} from 'backend/database';
import { db } from '../backend/config';

const VITAL_SIGNS_COLLECTION = 'vital_signs';

// ─── Type/value/unit ↔ structured DB columns transformation ───
// The DB table stores vitals as structured columns (temperature, heart_rate,
// blood_pressure_systolic, etc.) but the frontend uses a denormalized
// { type, value, unit } format. These functions convert between the two.

const VITAL_FIELD_MAP = {
  'Blood Pressure': { fields: ['bloodPressureSystolic', 'bloodPressureDiastolic'], unit: 'mmHg', join: '/' },
  'Heart Rate':     { fields: ['heartRate'], unit: 'bpm' },
  'Temperature':    { fields: ['temperature'], unit: '°C' },
  'Oxygen Saturation': { fields: ['oxygenSaturation'], unit: '%' },
  'Respiratory Rate': { fields: ['respiratoryRate'], unit: 'breaths/min' },
  'Blood Sugar':    { fields: ['bloodGlucose'], unit: 'mg/dL' },
  'Weight':         { fields: ['weight'], unit: 'kg' },
  'Height':         { fields: ['height'], unit: 'cm' },
  'Pain Level':     { fields: ['painLevel'], unit: '/10' },
};

// Convert frontend { type, value, unit } → structured DB columns for POST
function toStructuredFields(data) {
  const result = { ...data };
  if (data.type && data.value !== undefined) {
    const mapping = VITAL_FIELD_MAP[data.type];
    if (mapping) {
      if (mapping.join) {
        // Blood Pressure: "120/80" → systolic=120, diastolic=80
        const parts = String(data.value).split(mapping.join).map(p => p.trim());
        mapping.fields.forEach((field, i) => {
          if (parts[i] !== undefined && parts[i] !== '') result[field] = parts[i];
        });
      } else {
        result[mapping.fields[0]] = data.value;
      }
      // Clean up the denormalized fields — DB doesn't have these columns
      delete result.type;
      delete result.value;
      delete result.unit;
    }
  }
  return result;
}

// Convert structured DB record → array of { type, value, unit } for display
function fromStructuredFields(record) {
  const vitals = [];
  for (const [type, mapping] of Object.entries(VITAL_FIELD_MAP)) {
    const values = mapping.fields.map(f => record[f]);
    // Skip if all values are null/undefined/empty
    if (values.every(v => v === null || v === undefined || v === '')) continue;

    let displayValue;
    if (mapping.join) {
      displayValue = values.join(mapping.join);
    } else {
      displayValue = values[0];
    }

    vitals.push({
      ...record,
      type,
      value: displayValue,
      unit: record.unit || mapping.unit,
    });
  }
  return vitals;
}

// Normalize a single doc snapshot into a record with converted dates
function normalizeVitalDoc(doc) {
  const vitalData = doc.data();
  return {
    id: doc.id,
    ...vitalData,
    recordedAt: vitalData.recordedAt?.toDate?.() || vitalData.recordedAt,
    createdAt: vitalData.createdAt?.toDate?.() || vitalData.createdAt,
    updatedAt: vitalData.updatedAt?.toDate?.() || vitalData.updatedAt,
  };
}

// Expand an array of normalized records: if a record has a `type` field
// (old Firestore format), keep as-is. Otherwise, expand structured DB
// columns into multiple { type, value, unit } display records.
function expandVitalRecords(records) {
  const result = [];
  for (const record of records) {
    if (record.type) {
      result.push(record);
    } else {
      result.push(...fromStructuredFields(record));
    }
  }
  return result;
}


// Get all vital signs for a Client
export const getVitalSignsByClient = async (clientId, institutionId = null) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    let q = query(
      vitalSignsRef, 
      where('clientId', '==', clientId),
      orderBy('recordedAt', 'desc')
    );
    
    // Add institution filtering if provided
    if (institutionId) {
      q = query(
        vitalSignsRef, 
        where('clientId', '==', clientId),
        where('institutionId', '==', institutionId),
        orderBy('recordedAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);

    const records = [];
    querySnapshot.forEach((doc) => records.push(normalizeVitalDoc(doc)));

    return expandVitalRecords(records);
  } catch (error) {
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
      console.warn('Index missing, using fallback query:', error.message);
      const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
      const fallbackQuery = query(
        vitalSignsRef,
        where('clientId', '==', clientId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const results = [];
      fallbackSnapshot.forEach((doc) => results.push(normalizeVitalDoc(doc)));
      // Filter by institutionId in memory if provided
      const filtered = institutionId ? results.filter(v => v.institutionId === institutionId) : results;
      filtered.sort((a, b) => {
        const av = a.recordedAt?.getTime ? a.recordedAt.getTime() : new Date(a.recordedAt).getTime();
        const bv = b.recordedAt?.getTime ? b.recordedAt.getTime() : new Date(b.recordedAt).getTime();
        return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
      });
      return expandVitalRecords(filtered);
    }
    console.error('Error fetching vital signs:', error);
    throw error;
  }
};

// Get latest vital signs for a Client
export const getLatestVitalSigns = async (clientId) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    // Simplified query without composite index requirement
    const q = query(
      vitalSignsRef, 
      where('clientId', '==', clientId),
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

      const latestRecord = normalizeVitalDoc(sortedDocs[0]);
      // Expand structured fields and return the first vital type found
      const expanded = expandVitalRecords([latestRecord]);
      return expanded.length > 0 ? expanded[0] : latestRecord;
    }

    return null;
  } catch (error) {
    console.error('Error fetching latest vital signs:', error);
    throw error;
  }
};

// Get vital signs by type for a Client
export const getVitalSignsByType = async (clientId, vitalType) => {
  try {
    // The DB stores vitals as structured columns (not a `type` field), so we
    // fetch all vitals for the client and filter by type after expansion.
    const allVitals = await getVitalSignsByClient(clientId);
    return allVitals.filter(v => v.type === vitalType);
  } catch (error) {
    console.error('Error fetching vital signs by type:', error);
    throw error;
  }
};

// Create new vital sign record
export const createVitalSign = async (vitalSignData, institutionId = null) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    const newVitalSign = {
      ...toStructuredFields(vitalSignData),
      institutionId: institutionId || vitalSignData.institutionId,
      recordedAt: vitalSignData.recordedAt || serverTimestamp(),
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
export const getVitalSignsByDateRange = async (clientId, startDate, endDate) => {
  try {
    const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
    const q = query(
      vitalSignsRef, 
      where('clientId', '==', clientId),
      where('recordedAt', '>=', Timestamp.fromDate(startDate)),
      where('recordedAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('recordedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const records = [];
    querySnapshot.forEach((doc) => records.push(normalizeVitalDoc(doc)));

    return expandVitalRecords(records);
  } catch (error) {
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
      console.warn('Index missing, using fallback query:', error.message);
      const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
      const fallbackQuery = query(
        vitalSignsRef,
        where('clientId', '==', clientId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const startMs = startDate.getTime();
      const endMs = endDate.getTime();
      const results = [];
      fallbackSnapshot.forEach((doc) => {
        const record = normalizeVitalDoc(doc);
        const recordedMs = record.recordedAt?.getTime ? record.recordedAt.getTime() : new Date(record.recordedAt).getTime();
        if (recordedMs < startMs || recordedMs > endMs) return;
        results.push(record);
      });
      results.sort((a, b) => {
        const av = a.recordedAt?.getTime ? a.recordedAt.getTime() : new Date(a.recordedAt).getTime();
        const bv = b.recordedAt?.getTime ? b.recordedAt.getTime() : new Date(b.recordedAt).getTime();
        return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
      });
      return expandVitalRecords(results);
    }
    console.error('Error fetching vital signs by date range:', error);
    throw error;
  }
};

// Get vital signs trends (last 7 days)
export const getVitalSignsTrends = async (clientId, vitalType) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const vitalSigns = await getVitalSignsByDateRange(clientId, startDate, endDate);
    
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
      const record = {
        id: vitalSignSnap.id,
        ...vitalSignSnap.data(),
        recordedAt: vitalSignSnap.data().recordedAt?.toDate?.() || vitalSignSnap.data().recordedAt,
        createdAt: vitalSignSnap.data().createdAt?.toDate?.() || vitalSignSnap.data().createdAt,
        updatedAt: vitalSignSnap.data().updatedAt?.toDate?.() || vitalSignSnap.data().updatedAt,
      };
      // Expand structured fields if no `type` field (DB format)
      if (record.type) return record;
      const expanded = expandVitalRecords([record]);
      return expanded.length > 0 ? expanded[0] : record;
    } else {
      throw new Error('Vital sign not found');
    }
  } catch (error) {
    console.error('Error fetching vital sign:', error);
    throw error;
  }
};

// Real-time listener for vital signs
export const subscribeToVitalSigns = (callback, clientId) => {
  let unsubscribeFallback = null;
  const vitalSignsRef = collection(db, VITAL_SIGNS_COLLECTION);
  const q = query(
    vitalSignsRef, 
    where('clientId', '==', clientId),
    orderBy('recordedAt', 'desc')
  );
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const records = [];
    querySnapshot.forEach((doc) => records.push(normalizeVitalDoc(doc)));
    callback(expandVitalRecords(records));
  }, (error) => {
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
      console.warn('Index missing, using fallback subscription:', error.message);
      const fallbackQuery = query(
        vitalSignsRef,
        where('clientId', '==', clientId)
      );
      unsubscribeFallback = onSnapshot(fallbackQuery, (querySnapshot) => {
        const records = [];
        querySnapshot.forEach((doc) => records.push(normalizeVitalDoc(doc)));
        records.sort((a, b) => {
          const av = a.recordedAt?.getTime ? a.recordedAt.getTime() : new Date(a.recordedAt).getTime();
          const bv = b.recordedAt?.getTime ? b.recordedAt.getTime() : new Date(b.recordedAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
        });
        callback(expandVitalRecords(records));
      });
    } else {
      console.error('Error in vital signs subscription:', error);
    }
  });

  return () => {
    unsubscribe();
    if (unsubscribeFallback) unsubscribeFallback();
  };
};

// Get vital signs statistics
export const getVitalSignsStats = async (clientId) => {
  try {
    const vitalSigns = await getVitalSignsByClient(clientId);
    
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

