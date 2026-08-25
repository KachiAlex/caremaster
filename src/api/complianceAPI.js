/**
 * Compliance API
 * 
 * Handles compliance workflows including:
 * - Audit trails
 * - Data retention policies
 * - Client privacy controls
 * - Compliance reporting
 * - HIPAA/NDPR compliance tracking
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'backend/database';
import { db } from '../backend/config';

const AUDIT_LOGS_COLLECTION = 'auditLogs';
const COMPLIANCE_POLICIES_COLLECTION = 'compliancePolicies';
const DATA_RETENTION_RULES_COLLECTION = 'dataRetentionRules';
const PRIVACY_CONSENTS_COLLECTION = 'privacyConsents';
const COMPLIANCE_REPORTS_COLLECTION = 'complianceReports';

// Audit log action types
export const AUDIT_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  LOGIN: 'login',
  LOGOUT: 'logout',
  ACCESS_DENIED: 'access_denied',
  DATA_SHARED: 'data_shared',
  CONSENT_GIVEN: 'consent_given',
  CONSENT_REVOKED: 'consent_revoked',
  RETENTION_APPLIED: 'retention_applied',
  DATA_ARCHIVED: 'data_archived',
  DATA_DELETED: 'data_deleted'
};

// Compliance policy types
export const POLICY_TYPES = {
  DATA_RETENTION: 'data_retention',
  PRIVACY: 'privacy',
  ACCESS_CONTROL: 'access_control',
  AUDIT: 'audit',
  DATA_SHARING: 'data_sharing'
};

/**
 * Create an audit log entry
 */
export const createAuditLog = async (auditData) => {
  try {
    const {
      userId,
      userName,
      userRole,
      institutionId,
      action,
      resourceType,
      resourceId,
      resourceName = '',
      details = {},
      ipAddress = '',
      userAgent = '',
      success = true,
      errorMessage = null
    } = auditData;

    if (!userId || !action || !resourceType) {
      throw new Error('Missing required audit log fields');
    }

    const auditLog = {
      userId,
      userName: userName || 'Unknown',
      userRole: userRole || 'unknown',
      institutionId: institutionId || null,
      action,
      resourceType,
      resourceId: resourceId || null,
      resourceName,
      details,
      ipAddress,
      userAgent,
      success,
      errorMessage,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, AUDIT_LOGS_COLLECTION), auditLog);

    return {
      id: docRef.id,
      ...auditLog
    };
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
};

/**
 * Get audit logs with filters
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    const {
      institutionId = null,
      userId = null,
      action = null,
      resourceType = null,
      startDate = null,
      endDate = null,
      limitCount = 100
    } = filters;

    let auditQuery = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      orderBy('timestamp', 'desc')
    );

    if (institutionId) {
      auditQuery = query(auditQuery, where('institutionId', '==', institutionId));
    }

    if (userId) {
      auditQuery = query(auditQuery, where('userId', '==', userId));
    }

    if (action) {
      auditQuery = query(auditQuery, where('action', '==', action));
    }

    if (resourceType) {
      auditQuery = query(auditQuery, where('resourceType', '==', resourceType));
    }

    if (startDate) {
      auditQuery = query(auditQuery, where('timestamp', '>=', Timestamp.fromDate(new Date(startDate))));
    }

    if (endDate) {
      auditQuery = query(auditQuery, where('timestamp', '<=', Timestamp.fromDate(new Date(endDate))));
    }

    auditQuery = query(auditQuery, limit(limitCount));

    const snapshot = await getDocs(auditQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

/**
 * Create or update a compliance policy
 */
export const upsertCompliancePolicy = async (policyData) => {
  try {
    const {
      institutionId,
      policyType,
      name,
      description,
      rules = {},
      isActive = true,
      effectiveDate = null,
      expiryDate = null
    } = policyData;

    if (!institutionId || !policyType || !name) {
      throw new Error('Missing required policy fields');
    }

    // Check if policy exists
    const existingQuery = query(
      collection(db, COMPLIANCE_POLICIES_COLLECTION),
      where('institutionId', '==', institutionId),
      where('policyType', '==', policyType),
      where('name', '==', name)
    );
    const existingSnapshot = await getDocs(existingQuery);

    const policy = {
      institutionId,
      policyType,
      name,
      description,
      rules,
      isActive,
      effectiveDate: effectiveDate || new Date().toISOString(),
      expiryDate,
      updatedAt: serverTimestamp(),
      createdAt: existingSnapshot.empty ? serverTimestamp() : undefined
    };

    if (existingSnapshot.empty) {
      const docRef = await addDoc(collection(db, COMPLIANCE_POLICIES_COLLECTION), policy);
      return { id: docRef.id, ...policy };
    } else {
      const existingDoc = existingSnapshot.docs[0];
      await updateDoc(doc(db, COMPLIANCE_POLICIES_COLLECTION, existingDoc.id), policy);
      return { id: existingDoc.id, ...policy };
    }
  } catch (error) {
    console.error('Error upserting compliance policy:', error);
    throw error;
  }
};

/**
 * Get compliance policies for an institution
 */
export const getCompliancePolicies = async (institutionId, policyType = null) => {
  try {
    let policiesQuery = query(
      collection(db, COMPLIANCE_POLICIES_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('updatedAt', 'desc')
    );

    if (policyType) {
      policiesQuery = query(policiesQuery, where('policyType', '==', policyType));
    }

    const snapshot = await getDocs(policiesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching compliance policies:', error);
    throw error;
  }
};

/**
 * Create a data retention rule
 */
export const createDataRetentionRule = async (ruleData) => {
  try {
    const {
      institutionId,
      dataType,
      retentionPeriodDays,
      autoArchive = false,
      autoDelete = false,
      archiveAfterDays = null,
      deleteAfterDays = null,
      description = ''
    } = ruleData;

    if (!institutionId || !dataType || !retentionPeriodDays) {
      throw new Error('Missing required retention rule fields');
    }

    const rule = {
      institutionId,
      dataType,
      retentionPeriodDays,
      autoArchive,
      autoDelete,
      archiveAfterDays: archiveAfterDays || retentionPeriodDays,
      deleteAfterDays: deleteAfterDays || (retentionPeriodDays * 2),
      description,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, DATA_RETENTION_RULES_COLLECTION), rule);

    // Log the creation
    await createAuditLog({
      userId: ruleData.createdBy || 'system',
      userName: ruleData.createdByName || 'System',
      userRole: 'admin',
      institutionId,
      action: AUDIT_ACTIONS.CREATE,
      resourceType: 'data_retention_rule',
      resourceId: docRef.id,
      resourceName: `${dataType} - ${retentionPeriodDays} days`,
      details: rule
    });

    return {
      id: docRef.id,
      ...rule
    };
  } catch (error) {
    console.error('Error creating data retention rule:', error);
    throw error;
  }
};

/**
 * Get data retention rules
 */
export const getDataRetentionRules = async (institutionId) => {
  try {
    const rulesQuery = query(
      collection(db, DATA_RETENTION_RULES_COLLECTION),
      where('institutionId', '==', institutionId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(rulesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching data retention rules:', error);
    throw error;
  }
};

/**
 * Record Client privacy consent
 */
export const recordPrivacyConsent = async (consentData) => {
  try {
    const {
      clientId,
      institutionId,
      consentType,
      granted = true,
      grantedBy = null,
      grantedByName = 'Client',
      purpose = '',
      expiryDate = null,
      notes = ''
    } = consentData;

    if (!clientId || !institutionId || !consentType) {
      throw new Error('Missing required consent fields');
    }

    const consent = {
      clientId,
      institutionId,
      consentType,
      granted,
      grantedBy,
      grantedByName,
      purpose,
      expiryDate,
      notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, PRIVACY_CONSENTS_COLLECTION), consent);

    // Log the consent
    await createAuditLog({
      userId: grantedBy || clientId,
      userName: grantedByName,
      userRole: grantedBy ? 'staff' : 'Client',
      institutionId,
      action: granted ? AUDIT_ACTIONS.CONSENT_GIVEN : AUDIT_ACTIONS.CONSENT_REVOKED,
      resourceType: 'privacy_consent',
      resourceId: docRef.id,
      resourceName: `${consentType} consent`,
      details: consent
    });

    return {
      id: docRef.id,
      ...consent
    };
  } catch (error) {
    console.error('Error recording privacy consent:', error);
    throw error;
  }
};

/**
 * Get Client privacy consents
 */
export const getPatientConsents = async (clientId, institutionId) => {
  try {
    const consentsQuery = query(
      collection(db, PRIVACY_CONSENTS_COLLECTION),
      where('clientId', '==', clientId),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(consentsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching Client consents:', error);
    throw error;
  }
};

/**
 * Generate compliance report
 */
export const generateComplianceReport = async (reportData) => {
  try {
    const {
      institutionId,
      reportType,
      startDate,
      endDate,
      generatedBy,
      generatedByName
    } = reportData;

    if (!institutionId || !reportType) {
      throw new Error('Missing required report fields');
    }

    // Get audit logs for the period
    const auditLogs = await getAuditLogs({
      institutionId,
      startDate,
      endDate,
      limitCount: 10000
    });

    // Get compliance policies
    const policies = await getCompliancePolicies(institutionId);

    // Get retention rules
    const retentionRules = await getDataRetentionRules(institutionId);

    // Calculate compliance metrics
    const metrics = {
      totalAuditEvents: auditLogs.length,
      accessDeniedCount: auditLogs.filter(log => log.action === AUDIT_ACTIONS.ACCESS_DENIED).length,
      dataExports: auditLogs.filter(log => log.action === AUDIT_ACTIONS.EXPORT).length,
      consentGiven: auditLogs.filter(log => log.action === AUDIT_ACTIONS.CONSENT_GIVEN).length,
      consentRevoked: auditLogs.filter(log => log.action === AUDIT_ACTIONS.CONSENT_REVOKED).length,
      activePolicies: policies.filter(p => p.isActive).length,
      activeRetentionRules: retentionRules.length
    };

    const report = {
      institutionId,
      reportType,
      startDate,
      endDate,
      metrics,
      auditLogs: auditLogs.slice(0, 1000), // Limit to 1000 most recent
      policies,
      retentionRules,
      generatedBy,
      generatedByName,
      generatedAt: serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, COMPLIANCE_REPORTS_COLLECTION), report);

    // Log report generation
    await createAuditLog({
      userId: generatedBy,
      userName: generatedByName,
      userRole: 'admin',
      institutionId,
      action: AUDIT_ACTIONS.EXPORT,
      resourceType: 'compliance_report',
      resourceId: docRef.id,
      resourceName: `${reportType} report`,
      details: { reportType, startDate, endDate }
    });

    return {
      id: docRef.id,
      ...report
    };
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};

/**
 * Get compliance reports
 */
export const getComplianceReports = async (institutionId, limitCount = 50) => {
  try {
    const reportsQuery = query(
      collection(db, COMPLIANCE_REPORTS_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('generatedAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(reportsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching compliance reports:', error);
    throw error;
  }
};

/**
 * Get compliance statistics
 */
export const getComplianceStats = async (institutionId, days = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const auditLogs = await getAuditLogs({
      institutionId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limitCount: 10000
    });

    const policies = await getCompliancePolicies(institutionId);
    const retentionRules = await getDataRetentionRules(institutionId);

    return {
      totalAuditEvents: auditLogs.length,
      accessDeniedCount: auditLogs.filter(log => log.action === AUDIT_ACTIONS.ACCESS_DENIED).length,
      dataExports: auditLogs.filter(log => log.action === AUDIT_ACTIONS.EXPORT).length,
      activePolicies: policies.filter(p => p.isActive).length,
      activeRetentionRules: retentionRules.length,
      complianceScore: calculateComplianceScore(auditLogs, policies, retentionRules)
    };
  } catch (error) {
    console.error('Error fetching compliance stats:', error);
    throw error;
  }
};

/**
 * Calculate compliance score (0-100)
 */
const calculateComplianceScore = (auditLogs, policies, retentionRules) => {
  let score = 100;

  // Deduct points for access denials
  const accessDenials = auditLogs.filter(log => log.action === AUDIT_ACTIONS.ACCESS_DENIED).length;
  score -= Math.min(accessDenials * 0.5, 20); // Max 20 points deduction

  // Add points for active policies
  const activePolicies = policies.filter(p => p.isActive).length;
  score += Math.min(activePolicies * 2, 10); // Max 10 points addition

  // Add points for retention rules
  score += Math.min(retentionRules.length * 2, 10); // Max 10 points addition

  return Math.max(0, Math.min(100, Math.round(score)));
};

export default {
  createAuditLog,
  getAuditLogs,
  upsertCompliancePolicy,
  getCompliancePolicies,
  createDataRetentionRule,
  getDataRetentionRules,
  recordPrivacyConsent,
  getPatientConsents,
  generateComplianceReport,
  getComplianceReports,
  getComplianceStats,
  AUDIT_ACTIONS,
  POLICY_TYPES
};

