import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'backend/database';
import { db } from '../backend/config';

const NURSE_REPORTS_COLLECTION = 'nurseReports';

export const getNurseReportsByPatient = async (clientId) => {
  try {
    const reportsRef = collection(db, NURSE_REPORTS_COLLECTION);
    const q = query(
      reportsRef,
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const reports = [];
    snap.forEach((docu) => {
      const data = docu.data();
      reports.push({ id: docu.id, ...data, createdAt: data.createdAt?.toDate?.() || data.createdAt });
    });
    return reports;
  } catch (error) {
    console.error('Error fetching nurse reports:', error);
    throw error;
  }
};

export const createNurseReport = async (reportData) => {
  try {
    const reportsRef = collection(db, NURSE_REPORTS_COLLECTION);
    const payload = {
      ...reportData,
      status: reportData.status || 'stable',
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(reportsRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Error creating nurse report:', error);
    throw error;
  }
};


