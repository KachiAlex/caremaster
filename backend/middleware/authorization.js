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
// Institution staff who need tenant-scoped (not patient-scoped) reads
const INSTITUTION_STAFF_ROLES = ['pharmacist', 'lab_technician'];

// ─── Operational / tenant data tables ───
// These hold institution business data, not patient records and have no
// per-row owner column. Patients/caregivers/doctors must never blanket-read
// or modify them; institution staff read them scoped to their tenant.
const RESTRICTED_TABLES = [
  'licenses',
  'subscriptions',
  'client_subscriptions',
  'billing_settings',
  'inventory',
  'suppliers',
  'purchase_orders',
  'goods_received',
  'stock_audit',
  'analytics_events',
  'wages',
  'reports',
  'campaigns',
  'bills',
];

// Platform-owned tables. A row with no institution_id belongs to the
// platform / super-admin — tenant admins and below must never modify it.
const PLATFORM_MANAGED_TABLES = [
  'users',
  'institutions',
  'licenses',
  'subscriptions',
  'client_subscriptions',
  'billing_plans',
  'billing_settings',
];

// Operational tables institution staff (pharmacy/lab) may modify within
// their own tenant.
const STAFF_WRITABLE_TABLES = [
  'inventory',
  'suppliers',
  'purchase_orders',
  'goods_received',
  'stock_audit',
  'prescriptions',
  'diagnostics',
];

// Columns that can denote "this row belongs to a staff user" on tables
// without a dedicated owner column.
const STAFF_OWNERSHIP_COLUMNS = [
  'caregiver_id', 'nurse_id', 'doctor_id', 'user_id',
  'recorded_by', 'created_by', 'performed_by', 'assigned_by',
];

function isStaffOwnedRecord(record, userId) {
  return STAFF_OWNERSHIP_COLUMNS.some(
    (col) => record[col] && String(record[col]) === String(userId)
  );
}

// ─── Tables that contain patient-specific health data ───
// These tables have a patient_id (or client_id) column and must be scoped.
const PATIENT_DATA_TABLES = [
  'vital_signs',
  'prescriptions',
  'emergency_alerts',
  'care_logs',
  'care_plans',
  'patient_reports',
  'nurse_reports',
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
  'adl_logs',
  'client_activities',
  'referrals',
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
  'registration_drafts',
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
  nurse_reports: 'patient_id',
  diagnostics: 'patient_id',
  medication_logs: 'patient_id',
  appointments: 'patient_id',
  consultations: 'client_id',
  invoices: 'patient_id',
  elderly_profiles: 'patient_id',
  clients: 'user_id', // the client record is linked to the authenticated user
  patients: 'id',
  telemedicine_appointments: 'client_id',
  telemedicine_calls: 'client_id',
  telemedicine_recordings: 'appointment_id', // no direct patient column
  // For caregiver/doctor tables, scope by their user id
  adl_logs: 'client_id',
  client_activities: 'patient_id',
  referrals: 'patient_id',
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

// ─── Collaboration tables scoped by membership rather than an owner column ───
// conversations/messages/calls/call_notifications/signaling are only visible
// to participants (and same-institution admins). Handled before role branches.
const PARTICIPANT_TABLES = [
  'conversations',
  'messages',
  'calls',
  'call_notifications',
  'signaling',
];

/**
 * All identifier forms that may refer to this user inside denormalized
 * columns like conversations.participants: canonical users.id, legacy
 * firebase_uid, and their clients row id (some rows store clients.id).
 */
async function getUserIdentityIds(userId) {
  const ids = new Set([String(userId)]);
  try {
    const [userRow, clientRows] = await Promise.all([
      db('users').where({ id: userId }).select('firebase_uid').first(),
      db('clients').where({ user_id: userId }).select('id'),
    ]);
    if (userRow && userRow.firebase_uid) ids.add(String(userRow.firebase_uid));
    clientRows.forEach(r => { if (r.id) ids.add(String(r.id)); });
  } catch (err) {
    logger.error('Failed to resolve user identity ids:', err);
  }
  return Array.from(ids);
}

/**
 * Scope a participant-table query so non-admin users only see rows for
 * conversations/calls they belong to.
 */
function scopeParticipantTable(query, tableName, identityIds) {
  const participantClause = (alias) => function() {
    for (const id of identityIds) {
      this.orWhereRaw(`${alias}.participants @> ?::jsonb`, [JSON.stringify([id])]);
    }
  };

  switch (tableName) {
    case 'conversations':
      query.where(participantClause('conversations'));
      break;
    case 'messages':
      query.whereIn('messages.conversation_id', function() {
        this.select(db.raw('id::text')).from('conversations').where(participantClause('conversations'));
      });
      break;
    case 'calls':
      query.where(function() {
        this.whereIn('calls.caller_id', identityIds)
          .orWhereIn('calls.recipient_id', identityIds)
          .orWhereIn('calls.receiver_id', identityIds);
      });
      break;
    case 'call_notifications':
      query.whereIn('call_notifications.user_id', identityIds);
      break;
    case 'signaling':
      // Signaling rows belong either to an ad-hoc call (calls.call_id) or to
      // a scheduled consult channel 'consult_<appointmentId>'.
      query.where(function() {
        this.whereIn('signaling.call_id', function() {
          this.select('call_id').from('calls').where(function() {
            this.whereIn('caller_id', identityIds)
              .orWhereIn('recipient_id', identityIds)
              .orWhereIn('receiver_id', identityIds);
          });
        }).orWhereIn('signaling.call_id', function() {
          this.select(db.raw("'consult_' || id::text")).from('telemedicine_appointments')
            .where(function() {
              this.whereIn('client_id', identityIds).orWhereIn('doctor_id', identityIds);
            });
        });
      });
      break;
    default:
      query.whereRaw('1=0');
  }
  return query;
}

/**
 * Admin (institution) scoping for participant tables: institution-tagged
 * rows, or rows belonging to the tenant's conversations/calls.
 */
function scopeParticipantTableForAdmin(query, tableName, institutionId) {
  switch (tableName) {
    case 'conversations':
      query.where('conversations.institution_id', institutionId);
      break;
    case 'messages':
      query.whereIn('messages.conversation_id', function() {
        this.select(db.raw('id::text')).from('conversations').where('institution_id', institutionId);
      });
      break;
    case 'calls':
      query.where('calls.institution_id', institutionId);
      break;
    case 'call_notifications':
      query.whereIn('call_notifications.call_id', function() {
        this.select('call_id').from('calls').where('institution_id', institutionId);
      });
      break;
    case 'signaling':
      query.where(function() {
        this.whereIn('signaling.call_id', function() {
          this.select('call_id').from('calls').where('institution_id', institutionId);
        }).orWhereIn('signaling.call_id', function() {
          this.select(db.raw("'consult_' || id::text")).from('telemedicine_appointments')
            .where('institution_id', institutionId);
        });
      });
      break;
    default:
      query.whereRaw('1=0');
  }
  return query;
}

/**
 * Check whether the requester is a participant in a conversation row
 * (participants is a jsonb array of user ids in any historical form).
 */
function isConversationParticipant(record, identityIds) {
  const participants = Array.isArray(record.participants)
    ? record.participants
    : (() => { try { return JSON.parse(record.participants || '[]'); } catch { return []; } })();
  return participants.some(p => identityIds.includes(String(p)));
}

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

  // Operational/tenant tables: only tenant admins and institution staff may
  // read them — never patients, caregivers, or doctors. License keys are
  // admin-only even within a tenant.
  if (RESTRICTED_TABLES.includes(tableName)) {
    const isAdmin = ADMIN_ROLES.includes(userType);
    const isStaff = INSTITUTION_STAFF_ROLES.includes(userType);
    if (!isAdmin && !isStaff) {
      query.whereRaw('1=0');
      return query;
    }
    if (tableName === 'licenses' && !isAdmin) {
      query.whereRaw('1=0');
      return query;
    }
  }

  // Participant-scoped collaboration tables — membership decides visibility
  // for non-admins; institution scoping for admins (strict per tenant).
  if (PARTICIPANT_TABLES.includes(tableName)) {
    if (ADMIN_ROLES.includes(userType) && user.institution_id) {
      return scopeParticipantTableForAdmin(query, tableName, user.institution_id);
    }
    if (ADMIN_ROLES.includes(userType)) {
      query.whereRaw('1=0');
      return query;
    }
    const identityIds = await getUserIdentityIds(user.id);
    return scopeParticipantTable(query, tableName, identityIds);
  }

  // Admin: scope by institution_id if the table has it
  if (ADMIN_ROLES.includes(userType)) {
    const hasInstitutionId = await tableHasColumn(tableName, 'institution_id');
    if (hasInstitutionId) {
      if (tableName === 'telemedicine_appointments') {
        // Requests from standalone (unaffiliated) clients have no tenant —
        // without this they are invisible to every admin and can never be
        // scheduled.
        query.where(function() {
          this.where(`${tableName}.institution_id`, user.institution_id)
            .orWhereNull(`${tableName}.institution_id`);
        });
      } else {
        query.where(`${tableName}.institution_id`, user.institution_id);
      }
    }
    return query;
  }

  // Institution staff (pharmacist, lab technician): institution-scoped
  // reads on tenant tables, like admins. Tables without institution_id
  // (e.g. the medications catalog) stay readable.
  if (INSTITUTION_STAFF_ROLES.includes(userType)) {
    const hasInstitutionId = await tableHasColumn(tableName, 'institution_id');
    if (hasInstitutionId) {
      if (user.institution_id) {
        query.where(`${tableName}.institution_id`, user.institution_id);
      } else {
        query.whereRaw('1=0');
      }
    }
    return query;
  }

  // Patient/client/elderly: scope to their own records
  if (PATIENT_ROLES.includes(userType)) {
    const ownerCol = OWNER_COLUMN[tableName];
    if (ownerCol) {
      if (tableName === 'telemedicine_appointments') {
        // client_id may hold either the users.id or the clients row id —
        // match every identifier form for this user.
        const identityIds = await getUserIdentityIds(user.id);
        query.whereIn(`${tableName}.client_id`, identityIds);
      } else if (ownerCol === 'id') {
        // For clients/patients table, the patient's own row
        query.where(`${tableName}.id`, user.id);
      } else if (tableName === 'assignments' && ownerCol === 'patient_id') {
        // assignments stores the client's document id in client_id (clients.id),
        // while clients.user_id holds the user's id. Scope by matching through
        // the clients table so patients can see their assigned caregivers even
        // when patient_id is not populated on the assignment row.
        query.whereIn(`${tableName}.client_id`, function() {
          this.select(db.raw('id::text')).from('clients').where('user_id', user.id);
        });
      } else {
        query.where(`${tableName}.${ownerCol}`, user.id);
      }
    }
    // If no owner column, return unscoped (e.g., medications catalog)
    return query;
  }

  // Caregiver/nurse: scope to assigned clients
  if (CAREGIVER_ROLES.includes(userType)) {
    // Special case: users table — caregiver can see all users within their
    // institution (needed for tenant-wide messaging). Sensitive fields are
    // stripped by stripSensitiveFields in the data route.
    const patientIds = user.accessiblePatientIds || await getAssignedPatientIds(user.id);

    if (tableName === 'users') {
      const hasInstitutionId = await tableHasColumn(tableName, 'institution_id');
      if (hasInstitutionId && user.institution_id) {
        query.where(`${tableName}.institution_id`, user.institution_id);
      } else {
        // Fallback: own record + assigned patients
        const allowedIds = [user.id, ...patientIds];
        query.whereIn(`${tableName}.id`, allowedIds);
      }
      return query;
    }

    const ownerCol = OWNER_COLUMN[tableName];

    // Tables that have both a caregiver_id column and a patient/client column:
    // caregiver sees records where caregiver_id = their id OR patient is assigned to them
    const DUAL_OWNER_TABLES = ['assignments', 'care_tasks', 'schedules', 'care_logs', 'medication_logs'];
    if (DUAL_OWNER_TABLES.includes(tableName)) {
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

    if (PATIENT_DATA_TABLES.includes(tableName)) {
      // Patient data tables: scope to assigned patients. For clients/patients
      // tables, assignment ids may reference either the client row id or the
      // client's user account id — match on both.
      if (patientIds.length === 0) {
        // No assignments — return nothing
        query.whereRaw('1=0');
      } else if (tableName === 'clients' || tableName === 'patients') {
        const hasUserId = tableName === 'clients' ? await tableHasColumn('clients', 'user_id') : false;
        query.where(function() {
          this.whereIn(`${tableName}.id`, patientIds);
          if (hasUserId) this.orWhereIn(`${tableName}.user_id`, patientIds);
        });
      } else {
        const col = ownerCol || 'patient_id';
        query.whereIn(`${tableName}.${col}`, patientIds);
      }
    } else if (ownerCol === 'caregiver_id' || ownerCol === 'user_id') {
      // Tables owned by the caregiver themselves
      query.where(`${tableName}.${ownerCol}`, user.id);
    }
    return query;
  }

  // Doctor: scope to their patients (via prescriptions or appointments)
  if (DOCTOR_ROLES.includes(userType)) {
    const patientIds = user.accessiblePatientIds || await getDoctorPatientIds(user.id);

    // Special case: users table — doctor can see all users within their
    // institution (needed for tenant-wide messaging). Sensitive fields are
    // stripped by stripSensitiveFields in the data route.
    if (tableName === 'users') {
      const hasInstitutionId = await tableHasColumn(tableName, 'institution_id');
      if (hasInstitutionId && user.institution_id) {
        query.where(`${tableName}.institution_id`, user.institution_id);
      } else {
        // Fallback: own record + their patients
        const allowedIds = [user.id, ...patientIds];
        query.whereIn(`${tableName}.id`, allowedIds);
      }
      return query;
    }

    // Tables that have a doctor_id column: doctor sees records where they
    // are the doctor OR where the patient is one of their patients
    const DOCTOR_OWNER_TABLES = ['telemedicine_appointments', 'telemedicine_calls', 'consultations', 'prescriptions', 'diagnostics'];
    if (DOCTOR_OWNER_TABLES.includes(tableName)) {
      const patientCol = OWNER_COLUMN[tableName] || 'patient_id';
      // doctor_id = their id OR patient/client is in their patient list
      query.where(`${tableName}.doctor_id`, user.id);
      if (patientIds.length > 0) {
        query.orWhereIn(`${tableName}.${patientCol}`, patientIds);
      }
      return query;
    }

    const ownerCol = OWNER_COLUMN[tableName];

    if (PATIENT_DATA_TABLES.includes(tableName)) {
      // Doctors see records for patients they are assigned to or have
      // clinical records with. For clients/patients tables the assignment
      // ids may be client row ids or client user ids — match on both.
      const ids = patientIds;
      if (ids.length === 0) {
        query.whereRaw('1=0');
      } else if (tableName === 'clients' || tableName === 'patients') {
        const hasUserId = tableName === 'clients' ? await tableHasColumn('clients', 'user_id') : false;
        query.where(function() {
          this.whereIn(`${tableName}.id`, ids);
          if (hasUserId) this.orWhereIn(`${tableName}.user_id`, ids);
        });
      } else {
        const col = ownerCol || 'patient_id';
        query.whereIn(`${tableName}.${col}`, ids);
      }
    } else if (ownerCol === 'doctor_id' || ownerCol === 'user_id') {
      query.where(`${tableName}.${ownerCol}`, user.id);
    }
    return query;
  }

  // Default: no access
  query.whereRaw('1=0');
  return query;
}

/**
 * Get patient IDs for a doctor (via assignments, prescriptions, appointments,
 * consultations, and direct clients.assigned_doctor links).
 *
 * Returns a mix of client row ids (clients.id) and client user ids
 * (clients.user_id) because different tables store either form in their
 * patient_id/client_id columns — scoping must match either.
 */
async function getDoctorPatientIds(doctorUserId) {
  try {
    const [prescriptions, consultations, teleAppts, assignments, directClients] = await Promise.all([
      db('prescriptions').where({ doctor_id: doctorUserId }).select('patient_id'),
      db('consultations').where({ doctor_id: doctorUserId }).select('client_id'),
      db('telemedicine_appointments').where({ doctor_id: doctorUserId }).select('client_id'),
      // Doctors are assigned to clients through the same assignments table as
      // caregivers (caregiver_id holds any staff user's id).
      db('assignments').where({ caregiver_id: doctorUserId }).whereNot('status', 'cancelled').select('patient_id', 'client_id'),
      db('clients').where({ assigned_doctor: doctorUserId }).select('id', 'user_id'),
    ]);

    const ids = new Set();
    prescriptions.forEach(r => { if (r.patient_id) ids.add(r.patient_id); });
    consultations.forEach(r => { if (r.client_id) ids.add(r.client_id); });
    teleAppts.forEach(r => { if (r.client_id) ids.add(r.client_id); });
    assignments.forEach(r => {
      if (r.patient_id) ids.add(r.patient_id);
      if (r.client_id) ids.add(r.client_id);
    });
    directClients.forEach(r => {
      if (r.id) ids.add(r.id);
      if (r.user_id) ids.add(r.user_id);
    });
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
    // Institution records are addressed by their own id
    if (tableName === 'institutions') {
      return String(record.id) === String(user.institution_id);
    }
    if (record.institution_id) {
      return String(record.institution_id) === String(user.institution_id);
    }
    // No institution_id: rows on platform-managed tables (users, licenses,
    // subscriptions…) belong to the platform/super-admin — deny. Tables
    // without a tenant column (notifications, schedules…) stay allowed.
    return !PLATFORM_MANAGED_TABLES.includes(tableName);
  }

  // users table: any authenticated user can access their own record.
  // Frontend lookups may address it by row id or firebase_uid — match both
  // (e.g. refreshUserProfile fetches /users/<firebaseUid>).
  if (tableName === 'users') {
    return record.id === user.id ||
      (!!user.firebase_uid && record.firebase_uid === user.firebase_uid);
  }

  // Participant-scoped collaboration tables — members may update rows in
  // conversations/calls they belong to (the route whitelist limits which
  // fields are actually writable). Non-participants are denied.
  if (PARTICIPANT_TABLES.includes(tableName)) {
    const identityIds = await getUserIdentityIds(user.id);
    switch (tableName) {
      case 'conversations':
        return isConversationParticipant(record, identityIds);
      case 'messages': {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(record.conversation_id))) return false;
        const conv = await db('conversations').where({ id: record.conversation_id }).first();
        return !!conv && isConversationParticipant(conv, identityIds);
      }
      case 'calls':
        return identityIds.includes(String(record.caller_id)) ||
          identityIds.includes(String(record.recipient_id)) ||
          identityIds.includes(String(record.receiver_id));
      case 'call_notifications':
        return identityIds.includes(String(record.user_id));
      case 'signaling': {
        // Consult channels ('consult_<appointmentId>') belong to the
        // appointment's client + doctor rather than a calls row.
        if (String(record.call_id || '').startsWith('consult_')) {
          const apptId = String(record.call_id).slice('consult_'.length);
          const appt = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apptId)
            ? await db('telemedicine_appointments').where({ id: apptId }).first()
            : null;
          return !!appt && (identityIds.includes(String(appt.client_id)) ||
            identityIds.includes(String(appt.doctor_id)));
        }
        const call = await db('calls').where({ call_id: record.call_id }).first();
        if (!call) return false;
        return identityIds.includes(String(call.caller_id)) ||
          identityIds.includes(String(call.recipient_id)) ||
          identityIds.includes(String(call.receiver_id));
      }
      default:
        return false;
    }
  }

  // Patient: check ownership
  if (PATIENT_ROLES.includes(userType)) {
    const ownerCol = OWNER_COLUMN[tableName];
    // No owner column → not a patient-owned table — deny rather than allow
    // blanket modification of operational/platform data.
    if (!ownerCol) return false;
    if (ownerCol === 'id') return record.id === user.id;
    const recordOwnerId = record[ownerCol];
    if ((tableName === 'telemedicine_appointments' || tableName === 'telemedicine_calls') && ownerCol === 'client_id') {
      const identityIds = await getUserIdentityIds(user.id);
      return identityIds.includes(String(recordOwnerId));
    }
    return recordOwnerId === user.id;
  }

  // Caregiver: check assignment
  if (CAREGIVER_ROLES.includes(userType)) {
    // Dual-owner tables: caregiver can modify if they are the caregiver on the
    // record OR the patient is assigned to them
    const DUAL_OWNER_TABLES = ['assignments', 'care_tasks', 'schedules', 'care_logs', 'medication_logs'];
    if (DUAL_OWNER_TABLES.includes(tableName)) {
      if (record.caregiver_id === user.id) return true;
      const patientIds = await getAssignedPatientIds(user.id);
      const col = OWNER_COLUMN[tableName] || 'patient_id';
      return patientIds.includes(record[col]);
    }
    if (PATIENT_DATA_TABLES.includes(tableName)) {
      const patientIds = await getAssignedPatientIds(user.id);
      if (tableName === 'clients' || tableName === 'patients') {
        // Assignment ids may reference the client row id or the client's
        // user account id — match either.
        return patientIds.includes(record.id) || patientIds.includes(record.user_id);
      }
      const col = OWNER_COLUMN[tableName] || 'patient_id';
      return patientIds.includes(record[col]);
    }
    const ownerCol = OWNER_COLUMN[tableName];
    if (ownerCol === 'caregiver_id' || ownerCol === 'user_id') {
      return record[ownerCol] === user.id;
    }
    // Tables without a mapped owner column: allow only when the record is
    // tagged with the caregiver's own id, and never on restricted/platform
    // tables.
    if (RESTRICTED_TABLES.includes(tableName) || PLATFORM_MANAGED_TABLES.includes(tableName)) {
      return false;
    }
    return isStaffOwnedRecord(record, user.id);
  }

  // Doctor: check patient relationship
  if (DOCTOR_ROLES.includes(userType)) {
    // Tables with a doctor_id column: doctor can modify if they are the
    // doctor on the record OR the patient is one of their patients
    const DOCTOR_OWNER_TABLES = ['telemedicine_appointments', 'telemedicine_calls', 'consultations', 'prescriptions', 'diagnostics'];
    if (DOCTOR_OWNER_TABLES.includes(tableName)) {
      if (record.doctor_id === user.id) return true;
      const patientIds = await getDoctorPatientIds(user.id);
      const col = OWNER_COLUMN[tableName] || 'patient_id';
      return patientIds.includes(record[col]);
    }
    if (PATIENT_DATA_TABLES.includes(tableName)) {
      const patientIds = await getDoctorPatientIds(user.id);
      if (tableName === 'clients' || tableName === 'patients') {
        return patientIds.includes(record.id) || patientIds.includes(record.user_id);
      }
      const col = OWNER_COLUMN[tableName] || 'patient_id';
      return patientIds.includes(record[col]);
    }
    const ownerCol = OWNER_COLUMN[tableName];
    if (ownerCol === 'doctor_id' || ownerCol === 'user_id') {
      return record[ownerCol] === user.id;
    }
    if (RESTRICTED_TABLES.includes(tableName) || PLATFORM_MANAGED_TABLES.includes(tableName)) {
      return false;
    }
    return isStaffOwnedRecord(record, user.id);
  }

  // Institution staff (pharmacist, lab technician): may modify pharmacy-ops
  // tables within their tenant; elsewhere only rows they own.
  if (INSTITUTION_STAFF_ROLES.includes(userType)) {
    if (STAFF_WRITABLE_TABLES.includes(tableName)) {
      return !!record.institution_id &&
        String(record.institution_id) === String(user.institution_id);
    }
    if (RESTRICTED_TABLES.includes(tableName) || PLATFORM_MANAGED_TABLES.includes(tableName)) {
      return false;
    }
    return isStaffOwnedRecord(record, user.id);
  }

  return false;
}

/**
 * Creation policy for the generic data API (POST + bulk insert).
 * Row-ownership forcing for patients happens in the route — this gates
 * which roles may create rows in each table at all.
 *
 * Returns { allowed: boolean, reason?: string }
 */
function canCreateRecord(user, tableName) {
  const userType = user.user_type;
  if (SUPER_ADMIN_ROLES.includes(userType)) return { allowed: true };

  // User rows are created by admins (or via dedicated /api/auth endpoints)
  if (tableName === 'users') {
    return ADMIN_ROLES.includes(userType)
      ? { allowed: true }
      : { allowed: false, reason: 'Admin access required to create user records' };
  }

  // Platform-level catalog/billing rows are super-admin only
  if (['institutions', 'licenses', 'billing_plans'].includes(tableName)) {
    return { allowed: false, reason: 'Super-admin access required for this table' };
  }

  // Tenant billing objects require an admin
  if (['subscriptions', 'client_subscriptions', 'billing_settings'].includes(tableName)) {
    return ADMIN_ROLES.includes(userType)
      ? { allowed: true }
      : { allowed: false, reason: 'Admin access required for this table' };
  }

  // Operational tables require a staff role (not patients)
  const STAFF_CREATE_TABLES = [
    'inventory', 'suppliers', 'purchase_orders', 'goods_received',
    'stock_audit', 'referrals', 'medications',
  ];
  if (STAFF_CREATE_TABLES.includes(tableName)) {
    const staff = [...ADMIN_ROLES, ...INSTITUTION_STAFF_ROLES, ...CAREGIVER_ROLES, ...DOCTOR_ROLES];
    return staff.includes(userType)
      ? { allowed: true }
      : { allowed: false, reason: 'Staff access required for this table' };
  }

  return { allowed: true };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * May this user write signaling/RTC messages on the given channel?
 * Channels: consult_<appointmentId> (telemedicine), call_<callId> (chat calls).
 * Mirrors the participation rules used for Agora token issuance.
 */
async function canSignalChannel(user, channelName) {
  if (!channelName || typeof channelName !== 'string') return false;
  if (SUPER_ADMIN_ROLES.includes(user.user_type)) return true;

  const identityIds = (await getUserIdentityIds(user.id)).map(String);
  const isAdmin = ADMIN_ROLES.includes(user.user_type);

  if (channelName.startsWith('consult_')) {
    const apptId = channelName.slice('consult_'.length);
    if (!UUID_RE.test(apptId)) return false;
    const appt = await db('telemedicine_appointments').where({ id: apptId }).first();
    if (!appt) return false;
    if (isAdmin) return appt.institution_id === user.institution_id;
    return identityIds.includes(String(appt.client_id)) ||
      identityIds.includes(String(appt.doctor_id));
  }

  if (channelName.startsWith('call_')) {
    // calls.call_id already includes the call_ prefix
    const call = await db('calls').where({ call_id: channelName }).first();
    if (!call) return false;
    if (isAdmin) return call.institution_id === user.institution_id;
    return [call.caller_id, call.recipient_id, call.receiver_id]
      .map(String).some(id => identityIds.includes(id));
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
  canCreateRecord,
  canSignalChannel,
  isStaffOwnedRecord,
  getAssignedPatientIds,
  getDoctorPatientIds,
  getUserIdentityIds,
  isConversationParticipant,
  PATIENT_DATA_TABLES,
  ADMIN_ONLY_TABLES,
  PUBLIC_TABLES,
  PARTICIPANT_TABLES,
  PATIENT_ROLES,
  CAREGIVER_ROLES,
  DOCTOR_ROLES,
  ADMIN_ROLES,
  SUPER_ADMIN_ROLES,
  INSTITUTION_STAFF_ROLES,
  RESTRICTED_TABLES,
  PLATFORM_MANAGED_TABLES,
  STAFF_WRITABLE_TABLES,
  OWNER_COLUMN,
};
