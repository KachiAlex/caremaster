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

// Normalized core columns in the nurse_reports table
const CORE_NURSE_COLUMNS = new Set([
  'clientId', 'clientName', 'nurseId', 'nurseName', 'institutionId',
  'reportType', 'status', 'shiftStart', 'shiftEnd', 'handoverNotes',
  'situation', 'background', 'assessment', 'recommendation',
  'codedObservations', 'priorityCode',
  'patientCondition', 'mentalStatus', 'mobilityStatus', 'nutritionStatus',
  'generalAppearance', 'skinCondition', 'painLevel', 'painLocation', 'painDescription',
  'careActivities', 'medicationsGiven', 'treatmentsProvided',
  'vitalSignsSummary', 'careLogsSummary', 'metadata', 'createdAt', 'updatedAt'
]);

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
      // Restore metadata back to top-level for the UI
      let metadata = data.metadata || {};
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
      }

      // Merge structured summaries into the top-level report so display
      // components can access bloodPressure, careActivities, etc. directly.
      const vitals = typeof data.vitalSignsSummary === 'object' && data.vitalSignsSummary !== null ? data.vitalSignsSummary : {};
      const care = typeof data.careLogsSummary === 'object' && data.careLogsSummary !== null ? data.careLogsSummary : {};

      reports.push({
        id: docu.id,
        ...data,
        ...vitals,
        ...care,
        ...metadata,
        handoverNotes: data.handoverNotes || '',
        observations: data.handoverNotes || metadata.observations || '',
        notes: data.handoverNotes || metadata.notes || '',
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
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
    
    // Add server timestamp
    const payload = {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(reportsRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Error creating nurse report:', error);
    throw error;
  }
};

export const acknowledgeNurseReport = async (reportId, doctorId, doctorName, notes = '') => {
  try {
    const { updateDoc, doc } = await import('backend/database');
    const reportRef = doc(db, NURSE_REPORTS_COLLECTION, reportId);
    
    await updateDoc(reportRef, {
      acknowledgedAt: serverTimestamp(),
      acknowledgedBy: doctorName,
      acknowledgedById: doctorId,
      doctorNotes: notes,
      feedbackStatus: 'acknowledged',
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error acknowledging nurse report:', error);
    throw error;
  }
};
