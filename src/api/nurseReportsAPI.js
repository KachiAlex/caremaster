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
      // Restore metadata back to top-level for the UI
      let metadata = data.metadata || {};
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
      }
      reports.push({
        id: docu.id,
        ...data,
        ...metadata,
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

    // Core fields that map directly to nurse_reports table columns
    const payload = {
      clientId: reportData.clientId,
      nurseId: reportData.nurseId,
      nurseName: reportData.nurseName,
      institutionId: reportData.institutionId || null,
      reportType: reportData.reportType || 'Routine Assessment',
      status: reportData.status || 'active',
      shiftStart: reportData.shiftStart || reportData.shift || null,
      shiftEnd: reportData.shiftEnd || null,
      handoverNotes: reportData.observations || reportData.handoverNotes || '',
      createdAt: serverTimestamp()
    };

    // Pack the rich structured assessment data into metadata so it is not
    // stripped by the backend whitelist and is still returned on read.
    const metadata = {
      clientName: reportData.clientName,
      patientCondition: reportData.patientCondition,
      mentalStatus: reportData.mentalStatus,
      mobilityStatus: reportData.mobilityStatus,
      nutritionStatus: reportData.nutritionStatus,
      generalAppearance: reportData.generalAppearance,
      skinCondition: reportData.skinCondition,
      painLevel: reportData.painLevel,
      painLocation: reportData.painLocation,
      painDescription: reportData.painDescription,
      vitalSignsSummary: reportData.vitalSignsSummary,
      vitalSignsConcerns: reportData.vitalSignsConcerns,
      careActivities: reportData.careActivities || [],
      medicationsGiven: reportData.medicationsGiven || [],
      treatmentsProvided: reportData.treatmentsProvided || [],
      observations: reportData.observations,
      concerns: reportData.concerns,
      improvements: reportData.improvements,
      recommendations: reportData.recommendations,
      followUpRequired: reportData.followUpRequired,
      followUpNotes: reportData.followUpNotes,
      priority: reportData.priority,
      shift: reportData.shift,
      additionalNotes: reportData.additionalNotes,
      recentVitals: reportData.recentVitals || [],
      recentCareLogs: reportData.recentCareLogs || []
    };

    // store the structured activity/treatment lists under care_logs_summary
    // and vital readings under vital_signs_summary so the table columns
    // are also populated where possible.
    payload.vitalSignsSummary = { summary: reportData.vitalSignsSummary };
    payload.careLogsSummary = {
      careActivities: reportData.careActivities || [],
      treatmentsProvided: reportData.treatmentsProvided || [],
      medicationsGiven: reportData.medicationsGiven || []
    };
    payload.metadata = metadata;

    const docRef = await addDoc(reportsRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Error creating nurse report:', error);
    throw error;
  }
};
