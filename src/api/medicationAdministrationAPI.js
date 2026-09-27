import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'backend/database';
import { db } from '../backend/config';

// Maps to the medication_logs table via COLLECTION_TO_TABLE in
// backend/routes/data.js. Writable columns: patient_id, caregiver_id,
// institution_id, medication_id, medication_name, recorded_by, source,
// status, scheduled_time, taken_time, dosage, notes, metadata,
// created_at, updated_at. The backend auto-sets recorded_by + source
// from the authenticated user (HEALTH_RECORD_TABLES).
const COLLECTION = 'medicationLogs';

export const ADMINISTRATION_STATUSES = [
  { value: 'administered', label: 'Administered' },
  { value: 'held', label: 'Held' },
  { value: 'refused', label: 'Refused by Client' },
  { value: 'missed', label: 'Missed / Not Given' },
  { value: 'not_available', label: 'Not Available' },
];

const parseJsonField = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const toIso = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// medication_logs id columns are uuid-typed; a non-uuid value (or empty
// string) would fail the insert with an invalid-input-syntax error.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuidOrNull = (value) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);

/**
 * Record a medication administration / charting event (MAR entry).
 *
 * @param {object} params
 * @param {string} params.clientId        - client record id (stored in patient_id)
 * @param {string} params.nurseId         - charting nurse/caregiver user id
 * @param {string} params.institutionId
 * @param {string} [params.medicationId]  - prescriptions row uuid, or null
 * @param {string} params.medicationName
 * @param {string} [params.dose]          - dose administered (e.g. "10mg")
 * @param {string} [params.status]        - administered|held|refused|missed|not_available
 * @param {string|Date} [params.administeredAt] - charted time (taken_time)
 * @param {string|Date} [params.scheduledTime]  - scheduled dose time, if any
 * @param {string} [params.notes]
 * @param {object} [params.metadata]      - route, patientResponse, sideEffects,
 *                                          reason, medSource, prescribedBy...
 */
export const recordMedicationAdministration = async (params) => {
  const {
    clientId,
    nurseId,
    institutionId,
    medicationId = null,
    medicationName,
    dose,
    status = 'administered',
    administeredAt,
    scheduledTime = null,
    notes = '',
    metadata = {},
  } = params || {};

  if (!clientId) throw new Error('clientId is required');
  if (!medicationName) throw new Error('medicationName is required');
  if (!ADMINISTRATION_STATUSES.some(s => s.value === status)) {
    throw new Error(`Invalid administration status: ${status}`);
  }

  const record = await addDoc(collection(db, COLLECTION), {
    patient_id: asUuidOrNull(clientId) || clientId,
    caregiver_id: asUuidOrNull(nurseId),
    institution_id: asUuidOrNull(institutionId),
    medication_id: asUuidOrNull(medicationId),
    medication_name: medicationName,
    dosage: dose || null,
    status,
    scheduled_time: toIso(scheduledTime),
    taken_time: toIso(administeredAt) || new Date().toISOString(),
    notes,
    metadata,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return record;
};

/**
 * Fetch administration history for a client (most recent first).
 */
export const getAdministrationsByClient = async (clientId) => {
  if (!clientId) return [];

  const q = query(
    collection(db, COLLECTION),
    where('patientId', '==', clientId)
  );

  const snap = await getDocs(q);
  const records = [];
  snap.forEach((docu) => {
    const data = docu.data();
    const metadata = parseJsonField(data.metadata, {});
    records.push({
      id: docu.id,
      clientId: data.patientId,
      caregiverId: data.caregiverId,
      institutionId: data.institutionId,
      medicationId: data.medicationId,
      medicationName: data.medicationName,
      dosage: data.dosage,
      status: data.status,
      scheduledTime: data.scheduledTime,
      administeredAt: data.takenTime,
      notes: data.notes,
      recordedBy: data.recordedBy,
      source: data.source,
      metadata,
      route: metadata.route,
      patientResponse: metadata.patientResponse,
      sideEffects: metadata.sideEffects,
      reason: metadata.reason,
      medSource: metadata.medSource,
      administeredByName: metadata.administeredByName,
      createdAt: data.createdAt,
    });
  });

  records.sort((a, b) => {
    const at = a.administeredAt ? new Date(a.administeredAt).getTime() : 0;
    const bt = b.administeredAt ? new Date(b.administeredAt).getTime() : 0;
    return bt - at;
  });

  return records;
};

export default {
  recordMedicationAdministration,
  getAdministrationsByClient,
  ADMINISTRATION_STATUSES,
};
