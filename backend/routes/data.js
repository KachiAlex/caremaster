const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const db = require('../utils/database');

const router = express.Router();

// All data routes require authentication
router.use(authenticateToken);

// Whitelist of allowed tables
const ALLOWED_TABLES = [
  'users', 'institutions',
  'appointments', 'clients', 'caregivers', 'caregiver_profiles', 'care_tasks', 'assignments',
  'messages', 'care_logs', 'care_plans', 'vital_signs', 'prescriptions',
  'diagnostics', 'notifications', 'attendance', 'invoices', 'billing_plans',
  'emergency_alerts', 'inventory', 'medications', 'patient_reports', 'subscriptions',
  'patients', 'calls', 'conversations', 'elderly_profiles',
  'licenses', 'audit_logs', 'analytics_events', 'medication_logs', 'receipts', 'transactions', 'wallets',
  'institution_id_mappings',
  'schedules',
  // Frontend collection name aliases (map to real table via COLLECTION_TO_TABLE)
  'clientAssignments', 'emergencies',
  'medicationLogs', 'auditLogs', 'careTasks', 'careLogs',
  'pharmacyNotifications', 'pharmacyInvoices', 'pharmacyInventory',
  'caregiverAssignments', 'caregiverSchedule',
  'callNotifications', 'emergencyProtocols',
  'clientActivities', 'loginLogs',
  'signaling',
  'billingPlans', 'clientSubscriptions', 'billingSettings',
  'bills',
  'patientLogs',
  'adlLogs',
  'wages',
  'reports',
  'campaigns',
  'suppliers', 'purchaseOrders', 'goodsReceived', 'stockAudit',
  'securityAuditLogs', 'userSessions', 'loginAttempts', 'twoFactorAuth',
  // Collections with no backing DB table — return empty results (see NO_TABLE_COLLECTIONS)
  'medicalHistory', 'institutionAdmins', 'caregiverClockRecords',
  'caregiverEarnings', 'caregiverPerformance', 'caregiverActivityLog',
  'doseLogs', 'sideEffects', 'failedLoginAttempts', 'blockedIps',
  'prescriptionRefills', 'messageTemplates', 'pharmacistMedicationData',
];

// Map frontend collection names to actual PostgreSQL table names
const COLLECTION_TO_TABLE = {
  clientAssignments: 'assignments',
  emergencies: 'emergency_alerts',
  medicationLogs: 'medication_logs',
  auditLogs: 'audit_logs',
  careTasks: 'care_tasks',
  careLogs: 'care_logs',
  pharmacyNotifications: 'notifications',
  pharmacyInvoices: 'invoices',
  pharmacyInventory: 'inventory',
  caregiverAssignments: 'assignments',
  caregiverSchedule: 'schedules',
  callNotifications: 'call_notifications',
  emergencyProtocols: 'emergency_protocols',
  clientActivities: 'client_activities',
  loginLogs: 'audit_logs',
};

// Collections that have no backing DB table — return empty results
// instead of 400 errors so the frontend doesn't crash
const NO_TABLE_COLLECTIONS = [
  'medicalHistory', 'institutionAdmins', 'caregiverClockRecords',
  'caregiverEarnings', 'caregiverPerformance', 'caregiverActivityLog',
  'doseLogs', 'sideEffects', 'failedLoginAttempts', 'blockedIps',
  'prescriptionRefills', 'messageTemplates', 'pharmacistMedicationData',
  // Collections used by frontend that have no backing DB table yet
  'billingPlans', 'clientSubscriptions', 'billingSettings',
  'bills', 'patientLogs', 'adlLogs', 'wages', 'reports', 'campaigns',
  'suppliers', 'purchaseOrders', 'goodsReceived', 'stockAudit',
  'securityAuditLogs', 'userSessions', 'loginAttempts', 'twoFactorAuth',
  'schedules',
];

function resolveTable(collectionName) {
  return COLLECTION_TO_TABLE[collectionName] || collectionName;
}

// Whitelisted fields per table for create/update operations
const WRITABLE_FIELDS = {
  users: ['first_name', 'last_name', 'phone', 'photo_url', 'department', 'level', 'session'],
  institutions: ['name', 'domain', 'notes', 'active'],
  appointments: ['client_id', 'caregiver_id', 'scheduled_date', 'duration', 'status', 'notes'],
  clients: ['name', 'full_name', 'email', 'phone', 'institution_id', 'status', 'address', 'date_of_birth', 'gender', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship', 'medical_conditions', 'medications', 'allergies', 'blood_type', 'genotype', 'care_level', 'insurance_provider', 'insurance_policy_number', 'national_id', 'primary_care_physician', 'physician_phone', 'notes', 'user_type', 'type', 'city', 'state', 'zip_code', 'client_id', 'assigned_caregiver', 'assigned_doctor'],
  caregivers: ['user_id', 'first_name', 'last_name', 'phone', 'email', 'specialization', 'status'],
  caregiver_profiles: ['caregiver_id', 'bio', 'certifications', 'experience_years', 'skills'],
  care_tasks: ['assignment_id', 'title', 'description', 'status', 'completed_at'],
  assignments: ['client_id', 'caregiver_id', 'institution_id', 'patient_id', 'start_date', 'end_date', 'status', 'type', 'notes', 'metadata'],
  messages: ['conversation_id', 'sender_id', 'receiver_id', 'recipient_id', 'content', 'text', 'message_type', 'attachments', 'read', 'sent_at', 'read_at', 'created_at', 'sender_id'],
  care_logs: ['assignment_id', 'caregiver_id', 'client_id', 'notes', 'mood', 'timestamp'],
  care_plans: ['client_id', 'title', 'description', 'start_date', 'end_date', 'status'],
  vital_signs: ['client_id', 'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'respiratory_rate', 'oxygen_saturation', 'recorded_at'],
  prescriptions: ['client_id', 'medication_name', 'dosage', 'frequency', 'start_date', 'end_date', 'prescribed_by'],
  diagnostics: ['client_id', 'diagnosis', 'diagnosis_date', 'notes', 'diagnosed_by'],
  notifications: ['user_id', 'title', 'message', 'type', 'read', 'created_at'],
  attendance: ['caregiver_id', 'client_id', 'clock_in', 'clock_out', 'location_lat', 'location_lng'],
  invoices: ['client_id', 'amount', 'status', 'due_date', 'paid_date'],
  billing_plans: ['name', 'description', 'amount', 'billing_cycle', 'features'],
  emergency_alerts: ['client_id', 'caregiver_id', 'alert_type', 'severity', 'status', 'message', 'created_at'],
  inventory: ['name', 'quantity', 'unit', 'reorder_level', 'cost'],
  medications: ['name', 'generic_name', 'dosage_form', 'strength', 'instructions'],
  patient_reports: ['client_id', 'report_type', 'content', 'created_by'],
  subscriptions: ['institution_id', 'plan', 'status', 'start_date', 'end_date'],
  patients: ['name', 'email', 'phone', 'institution_id', 'status', 'medical_history', 'emergency_contacts', 'notes', 'date_of_birth', 'gender', 'address', 'city', 'state', 'country', 'blood_type', 'allergies', 'medications'],
  calls: ['call_id', 'caller_id', 'recipient_id', 'receiver_id', 'call_type', 'type', 'caller_name', 'recipient_name', 'status', 'duration', 'duration_seconds', 'started_at', 'ended_at', 'answered_at', 'participants', 'institution_id', 'created_at', 'answered_at'],
  conversations: ['participants', 'conversation_type', 'type', 'title', 'last_message_at', 'last_message_preview', 'institution_id', 'last_message', 'last_message_time'],
  elderly_profiles: ['client_id', 'medical_conditions', 'allergies', 'dietary_requirements', 'mobility_status', 'notes'],
  call_notifications: ['call_id', 'recipient_id', 'sender_id', 'type', 'status', 'created_at'],
  signaling: ['call_id', 'from', 'to', 'type', 'sdp', 'candidate', 'created_at'],
  schedules: ['institution_id', 'institutionId', 'client_id', 'clientId', 'client_name', 'clientName', 'caregiver_id', 'caregiverId', 'caregiver_name', 'caregiverName', 'title', 'description', 'service_type', 'serviceType', 'type', 'priority', 'schedule_date', 'scheduleDate', 'end_date', 'endDate', 'start_time', 'startTime', 'end_time', 'endTime', 'comments', 'special_instructions', 'specialInstructions', 'status', 'created_at', 'updated_at']
};

// Allowed sort columns per table (to prevent SQL injection via orderBy)
const SORTABLE_COLUMNS = {
  users: ['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at', 'last_login'],
  institutions: ['id', 'name', 'created_at', 'updated_at'],
  appointments: ['id', 'scheduled_date', 'created_at', 'status'],
  clients: ['id', 'name', 'full_name', 'email', 'phone', 'created_at', 'updated_at'],
  patients: ['id', 'name', 'email', 'phone', 'created_at', 'updated_at'],
  caregivers: ['id', 'first_name', 'last_name', 'created_at'],
  assignments: ['id', 'start_date', 'end_date', 'status', 'created_at', 'updated_at'],
  care_logs: ['id', 'timestamp', 'created_at'],
  messages: ['id', 'created_at'],
  vital_signs: ['id', 'recorded_at', 'created_at'],
  prescriptions: ['id', 'start_date', 'created_at'],
  notifications: ['id', 'created_at'],
  invoices: ['id', 'due_date', 'created_at'],
  emergency_alerts: ['id', 'created_at', 'severity'],
  audit_logs: ['id', 'timestamp'],
  licenses: ['id', 'institution_id', 'starts_at', 'ends_at', 'status', 'active', 'created_at', 'updated_at'],
  analytics_events: ['id', 'created_at'],
  medication_logs: ['id', 'created_at'],
  receipts: ['id', 'created_at'],
  transactions: ['id', 'created_at'],
  wallets: ['id', 'created_at'],
};

function validateTable(tableName) {
  return ALLOWED_TABLES.includes(tableName);
}

function filterWritableFields(table, data) {
  const allowed = WRITABLE_FIELDS[table];
  if (!allowed) return {};
  const filtered = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowed.includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// JSON-stringify array/plain-object values so they insert correctly into jsonb
// columns. The pg driver otherwise sends JS arrays as Postgres array literals
// (e.g. {penicillin}) which jsonb rejects. No table in this schema uses native
// Postgres array columns, so any array/object value targets a jsonb column.
function serializeJsonValues(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) || (value !== null && typeof value === 'object' && !(value instanceof Date))) {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function validateSortColumn(table, column) {
  const allowed = SORTABLE_COLUMNS[table];
  if (!allowed) return 'created_at';
  if (allowed.includes(column)) return column;
  // Fallback: use the first non-id column, or 'created_at' if present
  if (allowed.includes('created_at')) return 'created_at';
  if (allowed.includes('timestamp')) return 'timestamp';
  return allowed[0] !== 'id' ? allowed[0] : (allowed[1] || 'id');
}

function mapToSnakeCase(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

function mapToCamelCase(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  // Compute convenience fields that the frontend expects
  if (result.firstName || result.lastName) {
    const fullName = [result.firstName, result.lastName].filter(Boolean).join(' ').trim();
    if (fullName && !result.name) result.name = fullName;
    if (fullName && !result.fullName) result.fullName = fullName;
  }
  return result;
}

// GET /api/data/:table - List all records with optional filtering
router.get('/:table', async (req, res) => {
  try {
    const { table } = req.params;
    if (!validateTable(table)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }

    // Collections with no backing DB table — return empty result set
    if (NO_TABLE_COLLECTIONS.includes(table)) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, limit: 100, offset: 0 }
      });
    }

    const tableName = resolveTable(table);
    const { limit = 100, offset = 0, orderBy = 'created_at', order = 'desc', ...filters } = req.query;

    const validOrderBy = validateSortColumn(tableName, orderBy);
    const validOrder = ['asc', 'desc', 'ASC', 'DESC'].includes(order) ? order : 'desc';

    let query = db(tableName);

    // Translate filters for tables that use boolean "active" instead of "status"
    const BOOLEAN_ACTIVE_TABLES = ['caregivers', 'caregiver_profiles'];
    const translatedFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'status' && BOOLEAN_ACTIVE_TABLES.includes(tableName)) {
        translatedFilters['active'] = (value === 'active' || value === 'true');
      } else {
        translatedFilters[key] = value;
      }
    }

    // Apply filters (ignore pagination/sort params)
    const ignoreKeys = ['limit', 'offset', 'orderBy', 'order', 'page'];
    for (const [key, value] of Object.entries(translatedFilters)) {
      if (!ignoreKeys.includes(key) && value !== undefined && value !== '') {
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        query = query.where(col, value);
      }
    }

    const records = await query
      .orderBy(validOrderBy, validOrder)
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const totalQuery = db(tableName);
    for (const [key, value] of Object.entries(translatedFilters)) {
      if (!ignoreKeys.includes(key) && value !== undefined && value !== '') {
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        totalQuery.where(col, value);
      }
    }
    const totalResult = await totalQuery.count('* as count').first();

    res.json({
      success: true,
      data: records.map(mapToCamelCase),
      pagination: {
        total: parseInt(totalResult.count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error(`Failed to fetch ${req.params.table}:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch records' });
  }
});

// GET /api/data/:table/:id - Get single record
router.get('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!validateTable(table)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }
    const tableName = resolveTable(table);

    let record = null;

    // Only query by id if it looks like a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      record = await db(tableName).where({ id }).first();
    }

    // Fallback: for users table, try firebase_uid if id lookup fails or id is not a UUID
    if (!record && tableName === 'users' && id) {
      record = await db('users').where({ firebase_uid: id }).first();
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, data: mapToCamelCase(record) });
  } catch (error) {
    logger.error(`Failed to fetch ${req.params.table}/${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch record' });
  }
});

// POST /api/data/:table - Create record
router.post('/:table', async (req, res) => {
  try {
    const { table } = req.params;
    if (!validateTable(table)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }
    // Collections with no backing DB table — return a fake success
    if (NO_TABLE_COLLECTIONS.includes(table)) {
      return res.status(201).json({ success: true, data: { id: 'no-table-' + Date.now(), ...req.body } });
    }
    const tableName = resolveTable(table);

    const data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));
    // Remove id if present so DB generates one
    delete data.id;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to create' });
    }

    const [record] = await db(tableName).insert(data).returning('*');

    res.status(201).json({ success: true, data: mapToCamelCase(record) });
  } catch (error) {
    logger.error(`Failed to create ${req.params.table}:`, error);
    res.status(500).json({ success: false, message: 'Failed to create record' });
  }
});

// PUT /api/data/:table/:id - Update record
router.put('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!validateTable(table)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }
    if (NO_TABLE_COLLECTIONS.includes(table)) {
      return res.json({ success: true, data: { id, ...req.body } });
    }
    const tableName = resolveTable(table);

    const data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));
    delete data.id;
    delete data.created_at;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    let query = db(tableName);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      query = query.where({ id });
    } else if (tableName === 'users') {
      query = query.where({ firebase_uid: id });
    } else if (tableName === 'caregivers') {
      const user = await db('users').where({ firebase_uid: id }).first();
      if (user) {
        query = query.where({ user_id: user.id });
      } else {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const [record] = await query.update(data).returning('*');
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, data: mapToCamelCase(record) });
  } catch (error) {
    logger.error(`Failed to update ${req.params.table}/${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to update record' });
  }
});

// DELETE /api/data/:table/:id - Delete record
router.delete('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!validateTable(table)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }
    if (NO_TABLE_COLLECTIONS.includes(table)) {
      return res.json({ success: true, data: { id, deleted: true } });
    }
    const tableName = resolveTable(table);

    let query = db(tableName);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      query = query.where({ id });
    } else if (tableName === 'users') {
      // Non-UUID IDs in users table are firebase_uids
      query = query.where({ firebase_uid: id });
    } else if (tableName === 'caregivers') {
      // For caregivers, non-UUID IDs might be firebase_uids — look up the user first
      const user = await db('users').where({ firebase_uid: id }).first();
      if (user) {
        query = query.where({ user_id: user.id });
      } else {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const count = await query.del();
    if (count === 0) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    logger.error(`Failed to delete ${req.params.table}/${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
});

// POST /api/data/:table/bulk - Bulk insert
router.post('/:table/bulk', async (req, res) => {
  try {
    const { table } = req.params;
    if (!validateTable(table)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }
    const tableName = resolveTable(table);

    const records = req.body.records || req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Records array required' });
    }

    const inserted = [];
    const failed = [];

    for (const r of records) {
      try {
        const data = filterWritableFields(tableName, mapToSnakeCase(r));
        delete data.id;

        if (Object.keys(data).length === 0) {
          failed.push({ record: r, error: 'No valid fields' });
          continue;
        }

        const [record] = await db(tableName).insert(data).returning('*');
        inserted.push(mapToCamelCase(record));
      } catch (err) {
        failed.push({ record: r, error: err.message });
        logger.warn(`Bulk insert row failed for ${table}: ${err.message}`);
      }
    }

    res.status(201).json({
      success: true,
      data: inserted,
      count: inserted.length,
      failed: failed.length
    });
  } catch (error) {
    logger.error(`Failed to bulk insert ${req.params.table}:`, error);
    res.status(500).json({ success: false, message: 'Failed to bulk insert records' });
  }
});

module.exports = router;
