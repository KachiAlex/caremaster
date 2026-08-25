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
        ...doc.data()
      });
    });
    
    return reports;
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
        ...doc.data()
      });
    });
    
    return careLogs;
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
      timestamp: logData.timestamp || new Date().toISOString(),
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

