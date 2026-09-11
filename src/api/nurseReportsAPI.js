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

    // Build structured summaries from flat vitals/care fields when callers send
    // them (e.g. ServiceProviderDashboard, MedicalHistoryForm).
    const vitals = {};
    const care = {};
    const metadata = {};

    for (const [key, value] of Object.entries(reportData)) {
      // Skip undefined/null/empty for cleaner records, but keep 0/false
      if (value === undefined) continue;

      if (['bloodPressure', 'heartRate', 'temperature', 'weight', 'height', 'oxygenSaturation', 'painLevel', 'respiratoryRate'].includes(key)) {
        vitals[key] = value;
      } else if (['careActivities', 'medicationsGiven', 'treatmentsProvided'].includes(key)) {
        care[key] = value;
      } else if (!CORE_NURSE_COLUMNS.has(key)) {
        metadata[key] = value;
      }
    }

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
      handoverNotes: reportData.observations || reportData.handoverNotes || reportData.notes || '',
      createdAt: serverTimestamp()
    };

    // Add explicit summaries if provided, otherwise synthesize from flat fields.
    // Wrap plain text vital summaries in an object because the database jsonb
    // column rejects unquoted strings.
    const vitalInput = reportData.vitalSignsSummary;
    if (vitalInput && typeof vitalInput === 'object' && !Array.isArray(vitalInput)) {
      payload.vitalSignsSummary = vitalInput;
    } else if (typeof vitalInput === 'string' && vitalInput.trim()) {
      payload.vitalSignsSummary = { summary: vitalInput };
    } else if (Object.keys(vitals).length) {
      payload.vitalSignsSummary = vitals;
    } else {
      payload.vitalSignsSummary = null;
    }

    const careInput = reportData.careLogsSummary;
    if (careInput && typeof careInput === 'object' && !Array.isArray(careInput)) {
      payload.careLogsSummary = careInput;
    } else if (Object.keys(care).length) {
      payload.careLogsSummary = care;
    } else {
      payload.careLogsSummary = null;
    }

    // Always include rich metadata so no caller data is silently dropped.  If the
    // caller already passed a metadata object, merge it with the derived one.
    const callerMetadata = typeof reportData.metadata === 'object' ? reportData.metadata : {};
    payload.metadata = { ...metadata, ...callerMetadata };

    const docRef = await addDoc(reportsRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Error creating nurse report:', error);
    throw error;
  }
};
