import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const NURSE_REPORTS_COLLECTION = 'nurseReports';

export const getNurseReportsByPatient = async (patientId) => {
  try {
    const reportsRef = collection(db, NURSE_REPORTS_COLLECTION);
    const q = query(
      reportsRef,
      where('patientId', '==', patientId),
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

export const createNurseReport = async ({
  patientId,
  nurseId,
  nurseName,
  bloodPressure,
  heartRate,
  temperature,
  weight,
  height,
  oxygenSaturation,
  painLevel,
  notes,
  status
}) => {
  try {
    const reportsRef = collection(db, NURSE_REPORTS_COLLECTION);
    const payload = {
      patientId,
      nurseId,
      nurseName,
      bloodPressure,
      heartRate,
      temperature,
      weight,
      height,
      oxygenSaturation,
      painLevel,
      notes,
      status: status || 'stable',
      createdAt: serverTimestamp()
    };
    await addDoc(reportsRef, payload);
    return payload;
  } catch (error) {
    console.error('Error creating nurse report:', error);
    throw error;
  }
};


