import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Create a new care log
export const createCareLog = async (careLogData) => {
  try {
    console.log('📝 Creating care log:', careLogData.clientId);
    
    const careLog = {
      ...careLogData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active'
    };

    const docRef = await addDoc(collection(db, 'careLogs'), careLog);
    console.log('✅ Care log created with ID:', docRef.id);
    
    return { id: docRef.id, ...careLog };
  } catch (error) {
    console.error('❌ Error creating care log:', error);
    throw error;
  }
};

// Get care logs for a specific client
export const getCareLogsByClient = async (clientId, limitCount = 50) => {
  try {
    console.log('📋 Fetching care logs for client:', clientId);
    
    const careLogsRef = collection(db, 'careLogs');
    const q = query(
      careLogsRef,
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const careLogs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${careLogs.length} care logs for client`);
    return careLogs;
  } catch (error) {
    console.error('❌ Error fetching care logs:', error);
    throw error;
  }
};

// Get care logs for a specific caregiver
export const getCareLogsByCaregiver = async (caregiverId, limitCount = 50) => {
  try {
    console.log('📋 Fetching care logs for caregiver:', caregiverId);
    
    const careLogsRef = collection(db, 'careLogs');
    const q = query(
      careLogsRef,
      where('caregiverId', '==', caregiverId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const careLogs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${careLogs.length} care logs for caregiver`);
    return careLogs;
  } catch (error) {
    console.error('❌ Error fetching care logs:', error);
    throw error;
  }
};

// Get care logs for a specific institution
export const getCareLogsByInstitution = async (institutionId, limitCount = 100) => {
  try {
    console.log('📋 Fetching care logs for institution:', institutionId);
    
    const careLogsRef = collection(db, 'careLogs');
    const q = query(
      careLogsRef,
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const careLogs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${careLogs.length} care logs for institution`);
    return careLogs;
  } catch (error) {
    console.error('❌ Error fetching care logs:', error);
    throw error;
  }
};

// Get a specific care log by ID
export const getCareLogById = async (careLogId) => {
  try {
    console.log('📋 Fetching care log:', careLogId);
    
    const careLogRef = doc(db, 'careLogs', careLogId);
    const careLogSnap = await getDoc(careLogRef);
    
    if (careLogSnap.exists()) {
      const careLog = {
        id: careLogSnap.id,
        ...careLogSnap.data()
      };
      console.log('✅ Care log found');
      return careLog;
    } else {
      console.log('❌ Care log not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching care log:', error);
    throw error;
  }
};

// Update a care log
export const updateCareLog = async (careLogId, updateData) => {
  try {
    console.log('📝 Updating care log:', careLogId);
    
    const careLogRef = doc(db, 'careLogs', careLogId);
    await updateDoc(careLogRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Care log updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating care log:', error);
    throw error;
  }
};

// Delete a care log
export const deleteCareLog = async (careLogId) => {
  try {
    console.log('🗑️ Deleting care log:', careLogId);
    
    const careLogRef = doc(db, 'careLogs', careLogId);
    await deleteDoc(careLogRef);
    
    console.log('✅ Care log deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting care log:', error);
    throw error;
  }
};

// Get care logs with date range
export const getCareLogsByDateRange = async (clientId, startDate, endDate) => {
  try {
    console.log('📅 Fetching care logs by date range:', { clientId, startDate, endDate });
    
    const careLogsRef = collection(db, 'careLogs');
    const q = query(
      careLogsRef,
      where('clientId', '==', clientId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const careLogs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${careLogs.length} care logs in date range`);
    return careLogs;
  } catch (error) {
    console.error('❌ Error fetching care logs by date range:', error);
    throw error;
  }
};

// Get recent care logs (last 7 days)
export const getRecentCareLogs = async (clientId, days = 7) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await getCareLogsByDateRange(
      clientId, 
      startDate.toISOString().split('T')[0], 
      endDate.toISOString().split('T')[0]
    );
  } catch (error) {
    console.error('❌ Error fetching recent care logs:', error);
    throw error;
  }
};

// Get care log statistics for a client
export const getCareLogStats = async (clientId) => {
  try {
    console.log('📊 Fetching care log statistics for client:', clientId);
    
    const recentLogs = await getRecentCareLogs(clientId, 30);
    
    const stats = {
      totalLogs: recentLogs.length,
      lastWeekLogs: recentLogs.filter(log => {
        const logDate = new Date(log.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logDate >= weekAgo;
      }).length,
      averageVitals: {},
      commonIssues: [],
      medicationCompliance: 0
    };
    
    // Calculate average vitals if available
    const vitalsLogs = recentLogs.filter(log => log.vitalSigns);
    if (vitalsLogs.length > 0) {
      const totalBP = vitalsLogs.reduce((sum, log) => {
        const bp = log.vitalSigns.bloodPressure;
        if (bp && bp.includes('/')) {
          const [systolic] = bp.split('/').map(Number);
          return sum + (isNaN(systolic) ? 0 : systolic);
        }
        return sum;
      }, 0);
      
      const totalTemp = vitalsLogs.reduce((sum, log) => {
        const temp = parseFloat(log.vitalSigns.temperature);
        return sum + (isNaN(temp) ? 0 : temp);
      }, 0);
      
      const totalHR = vitalsLogs.reduce((sum, log) => {
        const hr = parseInt(log.vitalSigns.heartRate);
        return sum + (isNaN(hr) ? 0 : hr);
      }, 0);
      
      stats.averageVitals = {
        bloodPressure: vitalsLogs.length > 0 ? Math.round(totalBP / vitalsLogs.length) : 0,
        temperature: vitalsLogs.length > 0 ? (totalTemp / vitalsLogs.length).toFixed(1) : 0,
        heartRate: vitalsLogs.length > 0 ? Math.round(totalHR / vitalsLogs.length) : 0
      };
    }
    
    // Count medication compliance
    const medicationLogs = recentLogs.filter(log => log.medications && log.medications.length > 0);
    if (medicationLogs.length > 0) {
      const totalMedications = medicationLogs.reduce((sum, log) => sum + log.medications.length, 0);
      const givenMedications = medicationLogs.reduce((sum, log) => 
        sum + log.medications.filter(med => med.given).length, 0
      );
      stats.medicationCompliance = totalMedications > 0 ? Math.round((givenMedications / totalMedications) * 100) : 0;
    }
    
    console.log('✅ Care log statistics calculated');
    return stats;
  } catch (error) {
    console.error('❌ Error calculating care log statistics:', error);
    throw error;
  }
};

// Export all functions as a default object
export const careLogsAPI = {
  createCareLog,
  getCareLogsByClient,
  getCareLogsByCaregiver,
  getCareLogsByInstitution,
  getCareLogById,
  updateCareLog,
  deleteCareLog,
  getCareLogsByDateRange,
  getRecentCareLogs,
  getCareLogStats
};