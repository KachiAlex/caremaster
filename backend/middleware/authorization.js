/**
 * Row-Level Authorization Middleware
 *
 * Scopes all data queries based on the authenticated user's role:
 *   - patient/client/elderly → only their own records (patient_id = their user id)
 *   - caregiver/nurse → only records for clients assigned to them
 *   - doctor → only records for their patients
 *   - admin/institution-admin → only records for their institution
 *   - super-admin → all records (with audit logging)
 *
 * Also restricts which tables each role can access.
 */

const db = require('../utils/database');
const { logger } = require('../utils/logger');

// ─── Role constants ───
const PATIENT_ROLES = ['client', 'patient', 'elderly', 'Client'];
const CAREGIVER_ROLES = ['caregiver', 'nurse'];
const DOCTOR_ROLES = ['doctor'];
const ADMIN_ROLES = ['admin', 'institution-admin', 'InstitutionAdmin'];
const SUPER_ADMIN_ROLES = ['super-admin', 'superadmin'];

// ─── Tables that contain patient-specific health data ───
// These tables have a patient_id (or client_id) column and must be scoped.
const PATIENT_DATA_TABLES = [
  'vital_signs',
  'prescriptions',
  'emergency_alerts',
  'care_logs',
  'care_plans',
  'patient_reports',
  'diagnostics',
  'medication_logs',
  'appointments',
  'consultations',
  'invoices',
  'elderly_profiles',
  'clients',
  'patients',
  'telemedicine_appointments',
  'telemedicine_calls',
  'telemedicine_recordings',
];

// ─── Tables that only admins/super-admins should access via the generic data API ───
// These are removed from ALLOWED_TABLES and must be accessed via dedicated admin routes.
// NOTE: 'users' is NOT here — it's in ALLOWED_TABLES but scoped so non-admins
// can only see their own record.
const ADMIN_ONLY_TABLES = [
  'login_attempts',
  'user_sessions',
  'two_factor_auth',
  'security_audit_logs',
  'audit_logs',
  'wallets',
  'transactions',
  'receipts',
];

// ─── Tables accessible to all authenticated users (non-sensitive) ───
const PUBLIC_TABLES = [
  'medications', // drug catalog — no patient data
  'institutions',
  'billing_plans',
  'billing_settings',
  'inventory',
  'notifications',
  'conversations',
  'messages',
  'calls',
  'assignments',
  'care_tasks',
  'schedules',
  'attendance',
  'caregiver_profiles',
  'caregivers',
  'licenses',
];

// ─── Column that identifies the patient/owner on each table ───
const OWNER_COLUMN = {
  // users table: a user's own row is identified by id
  users: 'id',
  vital_signs: 'patient_id',
  prescriptions: 'patient_id',
  emergency_alerts: 'patient_id',
  care_logs: 'patient_id',
  care_plans: 'patient_id',
  patient_reports: 'patient_id',
  diagnostics: 'patient_id',
  medication_logs: 'patient_id',
  appointments: 'patient_id',
  consultations: 'client_id',
  invoices: 'patient_id',
  elderly_profiles: 'patient_id',
  clients: 'id', // the client's own record
  patients: 'id',
  telemedicine_appointments: 'client_id',
  telemedicine_calls: 'client_id',
  telemedicine_recordings: 'appointment_id', // no direct patient column
  // For caregiver/doctor tables, scope by their user id
  assignments: 'patient_id', // has both patient_id and caregiver_id
  care_tasks: 'patient_id', // has both patient_id and caregiver_id
  schedules: 'client_id', // has both client_id and caregiver_id
  attendance: 'user_id',
  caregiver_profiles: 'user_id',
  caregivers: 'user_id',
  notifications: 'user_id',
  conversations: 'id', // handled specially (participants array)
  messages: 'conversation_id', // handled specially
};

/**
 * Get the list of assigned patient IDs for a caregiver/doctor.
 * Returns an array of patient user IDs.
 */
async function getAssignedPatientIds(caregiverUserId) {
  try {
    const assignments = await db('assignments')
      .where({ caregiver_id: caregiverUserId })
      .select('patient_id', 'client_id');
    // Collect both patient_id and client_id (some rows may use one or the other)
    const ids = new Set();
    for (const a of assignments) {
      if (a.patient_id) ids.add(a.patient_id);
      if (a.client_id) ids.add(a.client_id);
    }
    return Array.from(ids);
  } catch (err) {
    logger.error('Failed to fetch assigned patient IDs:', err);
    return [];
  }
}

/**
 * Determine if a user can access a given table.
 * Returns { allowed: boolean, reason?: string }
 */
function canAccessTable(userType, tableName) {
  if (SUPER_ADMIN_ROLES.includes(userType)) {
    return { allowed: true };
  }

  if (ADMIN_ONLY_TABLES.includes(tableName)) {
    if (ADMIN_ROLES.includes(userType)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Admin access required for this table' };
  }

  // All authenticated users can access public and patient-data tables
  return { allowed: true };
}

/**
 * Apply row-level scoping to a Knex query.
 * Modifies the query in-place to restrict rows based on user role.
 *
 * @param {object} query - Knex query builder
 * @param {object} user - req.user (full users row)
 * @param {string} tableName - the actual DB table name
 * @returns {object} the scoped query (same reference, modified in-place)
 */
async function scopeQuery(query, user, tableName) {
  const userType = user.user_type;

  // Super-admin: no scoping
  if (SUPER_ADMIN_ROLES.includes(userType)) {
    return query;
  }

  // Admin: scope by institution_id if the table has it
  if (ADMIN_ROLES.includes(userType)) {
    const hasInstitutionId = await tableHasColumn(tableName, 'institution_id');
    if (hasInstitutionId) {
      query.where(`${tableName}.institution_id`, user.institution_id);
    }
    return query;
  }

  // Patient/client/elderly: scope to their own records
  if (PATIENT_ROLES.includes(userType)) {
    const ownerCol = OWNER_COLUMN[tableName];
    if (ownerCol) {
      if (ownerCol === 'id') {
        // For clients/patients table, the patient's own row
        query.where(`${tableName}.id`, user.id);
      } else {
        query.where(`${tableName}.${ownerCol}`, user.id);
      }
    }
    // If no owner column, return unscoped (e.g., medications catalog)
    return query;
  }

  // Caregiver/nurse: scope to assigned clients
  if (CAREGIVER_ROLES.includes(userType)) {
    // Special case: users table — caregiver can only see their own record
    // plus the records of clients assigned to them
    if (tableName === 'users') {
      const patientIds = await getAssignedPatientIds(user.id);
      const allowedIds = [user.id, ...patientIds];
      query.whereIn(`${tableName}.id`, allowedIds);
      return query;
    }

    const ownerCol = OWNER_COLUMN[tableName];

    // Tables that have both a caregiver_id column and a patient/client column:
    // caregiver sees records where caregiver_id = their id OR patient is assigned to them
    const DUAL_OWNER_TABLES = ['assignments', 'care_tasks', 'schedules', 'care_logs', 'medication_logs'];
    if (DUAL_OWNER_TABLES.includes(tableName)) {
      const patientIds = await getAssignedPatientIds(user.id);
      const patientCol = ownerCol || 'patient_id';
      if (patientIds.length === 0) {
        // No assignments — only see records where they are the caregiver
        query.where(`${tableName}.caregiver_id`, user.id);
      } else {
        query.where(`${tableName}.caregiver_id`, user.id)
          .orWhereIn(`${tableName}.${patientCol}`, patientIds);
      }
      return query;
    }

    if (ownerCol === 'caregiver_id' || ownerCol === 'user_id') {
      // Tables owned by the caregiver themselves
      query.where(`${tableName}.${ownerCol}`, user.id);
    } else if (PATIENT_DATA_TABLES.includes(tableName)) {
      // Patient data tables: scope to assigned patients
      const patientIds = await getAssignedPatientIds(user.id);
      if (patientIds.length === 0) {
        // No assignments — return nothing
        query.whereRaw('1=0');
      } else {
        const col = ownerCol || 'patient_id';
        query.whereIn(`${tableName}.${col}`, patientIds);
      }
    }
    return query;
  }

  // Doctor: scope to their patients (via prescriptions or appointments)
  if (DOCTOR_ROLES.includes(userType)) {
    // Special case: users table — doctor can only see their own record
    // plus the records of their patients
    if (tableName === 'users') {
      const patientIds = await getDoctorPatientIds(user.id);
      const allowedIds = [user.id, ...patientIds];
      query.whereIn(`${tableName}.id`, allowedIds);
      return query;
    }

    // Tables that have a doctor_id column: doctor sees records where they
    // are the doctor OR where the patient is one of their patients
    const DOCTOR_OWNER_TABLES = ['telemedicine_appointments', 'telemedicine_calls', 'consultations', 'prescriptions', 'diagnostics', 'appointments'];
    if (DOCTOR_OWNER_TABLES.includes(tableName)) {
      const patientIds = await getDoctorPatientIds(user.id);
      const patientCol = OWNER_COLUMN[tableName] || 'patient_id';
      // doctor_id = their id OR patient/client is in their patient list
      query.where(`${tableName}.doctor_id`, user.id);
      if (patientIds.length > 0) {
        query.orWhereIn(`${tableName}.${patientCol}`, patientIds);
      }
      return query;
    }

    const ownerCol = OWNER_COLUMN[tableName];

    if (ownerCol === 'doctor_id' || ownerCol === 'user_id') {
      query.where(`${tableName}.${ownerCol}`, user.id);
    } else if (PATIENT_DATA_TABLES.includes(tableName)) {
      // Doctors see records for patients they have prescriptions or appointments with
      const patientIds = await getDoctorPatientIds(user.id);
      if (patientIds.length === 0) {
        query.whereRaw('1=0');
      } else {
        const col = ownerCol || 'patient_id';
        query.whereIn(`${tableName}.${col}`, patientIds);
      }
    }
    return query;
  }

  // Default: no access
  query.whereRaw('1=0');
  return query;
}

/**
 * Get patient IDs for a doctor (via prescriptions, appointments, consultations).
 */
async function getDoctorPatientIds(doctorUserId) {
  try {
    const [prescriptions, appointments, consultations, teleAppts] = await Promise.all([
      db('prescriptions').where({ doctor_id: doctorUserId }).select('patient_id'),
      db('appointments').where({ doctor_id: doctorUserId }).select('patient_id'),
      db('consultations').where({ doctor_id: doctorUserId }).select('client_id'),
      db('telemedicine_appointments').where({ doctor_id: doctorUserId }).select('client_id'),
    ]);

    const ids = new Set();
    prescriptions.forEach(r => { if (r.patient_id) ids.add(r.patient_id); });
    appointments.forEach(r => { if (r.patient_id) ids.add(r.patient_id); });
    consultations.forEach(r => { if (r.client_id) ids.add(r.client_id); });
    teleAppts.forEach(r => { if (r.client_id) ids.add(r.client_id); });
    return Array.from(ids);
  } catch (err) {
    logger.error('Failed to fetch doctor patient IDs:', err);
    return [];
  }
}

/**
 * Check if a specific record belongs to the user (for PUT/DELETE authorization).
 * Returns true if the user is allowed to modify/delete the record.
 */
async function canModifyRecord(user, tableName, record) {
  const userType = user.user_type;

  // Super-admin: always yes
  if (SUPER_ADMIN_ROLES.includes(userType)) return true;

  // Admin: check institution
  if (ADMIN_ROLES.includes(userType)) {
    if (record.institution_id && record.institution_id === user.institution_id) return true;
    // If no institution_id on the record, allow (some tables don't have it)
    if (!record.institution_id) return true;
    return false;
  }

  // Patient: check ownership
  if (PATIENT_ROLES.includes(userType)) {
    const ownerCol = OWNER_COLUMN[tableName];
    if (!ownerCol) return true; // Non-patient table, allow
    if (ownerCol === 'id') return record.id === user.id;
    const recordOwnerId = record[ownerCol];
    return recordOwnerId === user.id;
  }

  // Caregiver: check assignment
  if (CAREGIVER_ROLES.includes(userType)) {
    // Special case: users table — caregiver can only modify their own record
    if (tableName === 'users') {
      return record.id === user.id;
    }
    // Dual-owner tables: caregiver can modify if they are the caregiver on the
    // record OR the patient is assigned to them
    const DUAL_OWNER_TABLES = ['assignments', 'care_tasks', 'schedules', 'care_logs', 'medication_logs'];
    if (DUAL_OWNER_TABLES.includes(tableName)) {
      if (record.caregiver_id === user.id) return true;
      const patientIds = await getAssignedPatientIds(user.id);
      const col = OWNER_COLUMN[tableName] || 'patient_id';
      return patientIds.includes(record[col]);
    }
    const ownerCol = OWNER_COLUMN[tableName];
    if (ownerCol === 'caregiver_id' || ownerCol === 'user_id') {
      return record[ownerCol] === user.id;
    }
    if (PATIENT_DATA_TABLES.includes(tableName)) {
      const patientIds = await getAssignedPatientIds(user.id);
      const col = ownerCol || 'patient_id';
      return patientIds.includes(record[col]);
    }
    return true; // Non-patient table
  }

  // Doctor: check patient relationship
  if (DOCTOR_ROLES.includes(userType)) {
    // Special case: users table — doctor can only modify their own record
    if (tableName === 'users') {
      return record.id === user.id;
    }
    // Tables with a doctor_id column: doctor can modify if they are the
    // doctor on the record OR the patient is one of their patients
    const DOCTOR_OWNER_TABLES = ['telemedicine_appointments', 'telemedicine_calls', 'consultations', 'prescriptions', 'diagnostics', 'appointments'];
    if (DOCTOR_OWNER_TABLES.includes(tableName)) {
      if (record.doctor_id === user.id) return true;
      const patientIds = await getDoctorPatientIds(user.id);
      const col = OWNER_COLUMN[tableName] || 'patient_id';
      return patientIds.includes(record[col]);
    }
    const ownerCol = OWNER_COLUMN[tableName];
    if (ownerCol === 'doctor_id' || ownerCol === 'user_id') {
      return record[ownerCol] === user.id;
    }
    if (PATIENT_DATA_TABLES.includes(tableName)) {
      const patientIds = await getDoctorPatientIds(user.id);
      const col = ownerCol || 'patient_id';
      return patientIds.includes(record[col]);
    }
    return true;
  }

  return false;
}

// Simple cache for column existence checks
const columnCache = new Map();
async function tableHasColumn(tableName, columnName) {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnCache.has(cacheKey)) return columnCache.get(cacheKey);

  try {
    const result = await db.raw(
      `SELECT column_name FROM information_schema.columns WHERE table_name = ? AND column_name = ?`,
      [tableName, columnName]
    );
    const has = result.rows && result.rows.length > 0;
    columnCache.set(cacheKey, has);
    return has;
  } catch {
    columnCache.set(cacheKey, false);
    return false;
  }
}

module.exports = {
  scopeQuery,
  canAccessTable,
  canModifyRecord,
  PATIENT_DATA_TABLES,
  ADMIN_ONLY_TABLES,
  PUBLIC_TABLES,
  PATIENT_ROLES,
  CAREGIVER_ROLES,
  DOCTOR_ROLES,
  ADMIN_ROLES,
  SUPER_ADMIN_ROLES,
};
