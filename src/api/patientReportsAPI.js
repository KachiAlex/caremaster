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
  serverTimestamp
} from 'backend/database';
import { db } from '../backend/config';

const REPORTS_COLLECTION = 'clientReports';
const CARE_LOGS_COLLECTION = 'clientCareLogs';

// Get all reports for a client
export const getClientReports = async (clientId) => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION);
    try {
      const q = query(
        reportsRef,
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const reports = [];
      
      querySnapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
          timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
        });
      });
      
      return reports;
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const q = query(reportsRef, where('clientId', '==', clientId));
        const querySnapshot = await getDocs(q);
        const reports = [];
        
        querySnapshot.forEach((doc) => {
          reports.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
            timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
          });
        });
        reports.sort((a, b) => {
          const av = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
          const bv = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av);
        });
        return reports;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching client reports:', error);
    return [];
  }
};

// Create a new client report
export const createClientReport = async (clientId, reportData) => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION);
    const newReport = {
      clientId,
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(reportsRef, newReport);
    return docRef.id;
  } catch (error) {
    console.error('Error creating client report:', error);
    throw error;
  }
};

// Update a client report
export const updateClientReport = async (reportId, updates) => {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    await updateDoc(reportRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating client report:', error);
    throw error;
  }
};

// Delete a client report
export const deleteClientReport = async (reportId) => {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    await deleteDoc(reportRef);
  } catch (error) {
    console.error('Error deleting client report:', error);
    throw error;
  }
};

// Get all care logs for a client
export const getClientCareLogs = async (clientId) => {
  try {
    const careLogsRef = collection(db, CARE_LOGS_COLLECTION);
    try {
      const q = query(
        careLogsRef,
        where('clientId', '==', clientId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const careLogs = [];
      
      querySnapshot.forEach((doc) => {
        careLogs.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
          timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
        });
      });
      
      return careLogs;
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const q = query(careLogsRef, where('clientId', '==', clientId));
        const querySnapshot = await getDocs(q);
        const careLogs = [];
        
        querySnapshot.forEach((doc) => {
          careLogs.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
            timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
          });
        });
        careLogs.sort((a, b) => {
          const av = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
          const bv = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av);
        });
        return careLogs;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching client care logs:', error);
    return [];
  }
};

// Create a new care log
export const createClientCareLog = async (clientId, logData) => {
  try {
    const careLogsRef = collection(db, CARE_LOGS_COLLECTION);
    const newLog = {
      clientId,
      ...logData,
      timestamp: logData.timestamp || serverTimestamp(),
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(careLogsRef, newLog);
    return docRef.id;
  } catch (error) {
    console.error('Error creating client care log:', error);
    throw error;
  }
};

// Update a care log
export const updateClientCareLog = async (logId, updates) => {
  try {
    const logRef = doc(db, CARE_LOGS_COLLECTION, logId);
    await updateDoc(logRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating client care log:', error);
    throw error;
  }
};

// Delete a care log
export const deleteClientCareLog = async (logId) => {
  try {
    const logRef = doc(db, CARE_LOGS_COLLECTION, logId);
    await deleteDoc(logRef);
  } catch (error) {
    console.error('Error deleting client care log:', error);
    throw error;
  }
};

