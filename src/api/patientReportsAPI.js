import { db } from '../firebase/config';
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
} from 'firebase/firestore';

const REPORTS_COLLECTION = 'patientReports';
const CARE_LOGS_COLLECTION = 'patientCareLogs';

// Get all reports for a patient
export const getPatientReports = async (patientId) => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION);
    const q = query(
      reportsRef,
      where('patientId', '==', patientId),
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
    console.error('Error fetching patient reports:', error);
    return [];
  }
};

// Create a new patient report
export const createPatientReport = async (patientId, reportData) => {
  try {
    const reportsRef = collection(db, REPORTS_COLLECTION);
    const newReport = {
      patientId,
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(reportsRef, newReport);
    return docRef.id;
  } catch (error) {
    console.error('Error creating patient report:', error);
    throw error;
  }
};

// Update a patient report
export const updatePatientReport = async (reportId, updates) => {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    await updateDoc(reportRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating patient report:', error);
    throw error;
  }
};

// Delete a patient report
export const deletePatientReport = async (reportId) => {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    await deleteDoc(reportRef);
  } catch (error) {
    console.error('Error deleting patient report:', error);
    throw error;
  }
};

// Get all care logs for a patient
export const getPatientCareLogs = async (patientId) => {
  try {
    const careLogsRef = collection(db, CARE_LOGS_COLLECTION);
    const q = query(
      careLogsRef,
      where('patientId', '==', patientId),
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
    console.error('Error fetching patient care logs:', error);
    return [];
  }
};

// Create a new care log
export const createPatientCareLog = async (patientId, logData) => {
  try {
    const careLogsRef = collection(db, CARE_LOGS_COLLECTION);
    const newLog = {
      patientId,
      ...logData,
      timestamp: logData.timestamp || new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(careLogsRef, newLog);
    return docRef.id;
  } catch (error) {
    console.error('Error creating patient care log:', error);
    throw error;
  }
};

// Update a care log
export const updatePatientCareLog = async (logId, updates) => {
  try {
    const logRef = doc(db, CARE_LOGS_COLLECTION, logId);
    await updateDoc(logRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating patient care log:', error);
    throw error;
  }
};

// Delete a care log
export const deletePatientCareLog = async (logId) => {
  try {
    const logRef = doc(db, CARE_LOGS_COLLECTION, logId);
    await deleteDoc(logRef);
  } catch (error) {
    console.error('Error deleting patient care log:', error);
    throw error;
  }
};

