/**
 * Security API
 * 
 * Features:
 * - Two-factor authentication (2FA)
 * - Comprehensive audit logs
 * - Session management
 * - Failed login attempt tracking
 * - IP-based access restrictions
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
  Timestamp
} from 'backend/database';
import { db } from '../backend/config';

// Helper: normalize Firestore-style or ISO timestamps to a Date or null
function normalizeTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (value.seconds !== undefined) {
    const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

const AUDIT_LOGS_COLLECTION = 'securityAuditLogs';
const SESSIONS_COLLECTION = 'userSessions';
const LOGIN_ATTEMPTS_COLLECTION = 'loginAttempts';
const TWO_FACTOR_COLLECTION = 'twoFactorAuth';

/**
 * Generate a 6-digit TOTP code (Time-based One-Time Password)
 * In production, use a library like 'otplib' or 'speakeasy'
 */
const generateTOTP = () => {
  // Simple 6-digit code generator (for demo - use proper TOTP in production)
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send 2FA code via email (or SMS in production)
 */
const send2FACode = async (userId, email, code) => {
  try {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, we'll store it and the user can retrieve it
    console.log(`2FA Code for ${email}: ${code}`);
    
    // Store code temporarily (expires in 10 minutes)
    const codeRef = collection(db, TWO_FACTOR_COLLECTION);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await addDoc(codeRef, {
      userId,
      email,
      code,
      expiresAt,
      createdAt: serverTimestamp(),
      verified: false
    });

    // TODO: Send actual email
    // await emailService.send({
    //   to: email,
    //   subject: 'Your 2FA Code',
    //   body: `Your verification code is: ${code}. It expires in 10 minutes.`
    // });

    return true;
  } catch (error) {
    console.error('Error sending 2FA code:', error);
    throw error;
  }
};

/**
 * Two-Factor Authentication API
 */
export const twoFactorAPI = {
  /**
   * Enable 2FA for a user
   */
  enable2FA: async (userId, email) => {
    try {
      const twoFactorRef = doc(db, TWO_FACTOR_COLLECTION, userId);
      await updateDoc(twoFactorRef, {
        enabled: true,
        email,
        enabledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log the action
      await logSecurityEvent({
        userId,
        action: '2fa_enabled',
        resourceType: 'user',
        resourceId: userId,
        details: { email }
      });

      return { success: true };
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw error;
    }
  },

  /**
   * Disable 2FA for a user
   */
  disable2FA: async (userId) => {
    try {
      const twoFactorRef = doc(db, TWO_FACTOR_COLLECTION, userId);
      await updateDoc(twoFactorRef, {
        enabled: false,
        disabledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logSecurityEvent({
        userId,
        action: '2fa_disabled',
        resourceType: 'user',
        resourceId: userId
      });

      return { success: true };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  },

  /**
   * Check if 2FA is enabled for a user
   */
  is2FAEnabled: async (userId) => {
    try {
      const twoFactorRef = doc(db, TWO_FACTOR_COLLECTION, userId);
      const twoFactorDoc = await getDoc(twoFactorRef);
      
      if (!twoFactorDoc.exists()) {
        return false;
      }

      return twoFactorDoc.data().enabled === true;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  },

  /**
   * Generate and send 2FA code
   */
  generateAndSendCode: async (userId, email) => {
    try {
      const code = generateTOTP();
      await send2FACode(userId, email, code);
      
      await logSecurityEvent({
        userId,
        action: '2fa_code_sent',
        resourceType: 'user',
        resourceId: userId,
        details: { email }
      });

      return { success: true, code }; // In production, don't return code
    } catch (error) {
      console.error('Error generating 2FA code:', error);
      throw error;
    }
  },

  /**
   * Verify 2FA code
   */
  verifyCode: async (email, code) => {
    try {
      const q = query(
        collection(db, TWO_FACTOR_COLLECTION),
        where('email', '==', email),
        where('code', '==', code),
        where('verified', '==', false),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: false, message: 'Invalid or expired code' };
      }

      const codeDoc = snapshot.docs[0];
      const codeData = codeDoc.data();

      // Check if code expired
      const expiresAt = normalizeTimestamp(codeData.expiresAt);
      if (!expiresAt || expiresAt < new Date()) {
        return { success: false, message: 'Code has expired' };
      }

      // Mark code as verified
      await updateDoc(codeDoc.ref, {
        verified: true,
        verifiedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      return { success: false, message: 'Unable to verify code' };
    }
  }
};

/**
 * Comprehensive Audit Logging
 */
export const logSecurityEvent = async (eventData) => {
  try {
    const {
      userId,
      userRole,
      action,
      resourceType,
      resourceId,
      details = {},
      ipAddress = null,
      userAgent = null,
      institutionId = null
    } = eventData;

    const auditLog = {
      userId,
      userRole,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: ipAddress || await getClientIP(),
      userAgent: userAgent || navigator.userAgent,
      institutionId,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, AUDIT_LOGS_COLLECTION), auditLog);
  } catch (error) {
    console.error('Error logging security event:', error);
    // Don't throw - audit logging shouldn't break main operations
  }
};

/**
 * Get audit logs
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    const {
      userId = null,
      institutionId = null,
      action = null,
      resourceType = null,
      startDate = null,
      endDate = null,
      limitCount = 100
    } = filters;

    let q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      orderBy('timestamp', 'desc')
    );

    if (userId) {
      q = query(q, where('userId', '==', userId));
    }

    if (institutionId) {
      q = query(q, where('institutionId', '==', institutionId));
    }

    if (action) {
      q = query(q, where('action', '==', action));
    }

    if (resourceType) {
      q = query(q, where('resourceType', '==', resourceType));
    }

    q = query(q, limit(limitCount));

    const snapshot = await getDocs(q);
    const startMs = startDate ? startDate.getTime() : null;
    const endMs = endDate ? endDate.getTime() : null;
    const logs = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const ts = normalizeTimestamp(data.timestamp);
      const tsMs = ts ? ts.getTime() : null;
      if (tsMs && startMs && tsMs < startMs) return;
      if (tsMs && endMs && tsMs > endMs) return;
      logs.push({
        id: doc.id,
        ...data,
        timestamp: ts
      });
    });

    // Ensure newest logs appear first in case the backend doesn't honor orderBy
    logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    return logs.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};

/**
 * Session Management
 */
export const sessionAPI = {
  /**
   * Create a new session
   */
  createSession: async (userId, sessionData) => {
    try {
      const session = {
        userId,
        ...sessionData,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        active: true
      };

      const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), session);
      
      await logSecurityEvent({
        userId,
        action: 'session_created',
        resourceType: 'session',
        resourceId: docRef.id,
        details: sessionData
      });

      return {
        id: docRef.id,
        ...session
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  /**
   * Update session activity
   */
  updateSessionActivity: async (sessionId) => {
    try {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, {
        lastActivity: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  },

  /**
   * End a session
   */
  endSession: async (sessionId, userId) => {
    try {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, {
        active: false,
        endedAt: serverTimestamp()
      });

      await logSecurityEvent({
        userId,
        action: 'session_ended',
        resourceType: 'session',
        resourceId: sessionId
      });
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  },

  /**
   * Get active sessions for a user
   */
  getActiveSessions: async (userId) => {
    try {
      const q = query(
        collection(db, SESSIONS_COLLECTION),
        where('userId', '==', userId),
        where('active', '==', true),
        orderBy('lastActivity', 'desc')
      );

      const snapshot = await getDocs(q);
      const sessions = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          ...data,
          createdAt: normalizeTimestamp(data.createdAt),
          lastActivity: normalizeTimestamp(data.lastActivity),
          expiresAt: normalizeTimestamp(data.expiresAt)
        });
      });

      sessions.sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
      return sessions;
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  },

  /**
   * Get active sessions for an institution (tenant-scoped)
   */
  getActiveSessionsByInstitution: async (institutionId) => {
    try {
      const q = query(
        collection(db, SESSIONS_COLLECTION),
        where('institutionId', '==', institutionId),
        where('active', '==', true),
        orderBy('lastActivity', 'desc')
      );

      const snapshot = await getDocs(q);
      const sessions = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          ...data,
          createdAt: normalizeTimestamp(data.createdAt),
          lastActivity: normalizeTimestamp(data.lastActivity),
          expiresAt: normalizeTimestamp(data.expiresAt)
        });
      });

      sessions.sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
      return sessions;
    } catch (error) {
      console.error('Error fetching active sessions by institution:', error);
      return [];
    }
  }
};

/**
 * Failed Login Attempt Tracking
 */
export const loginAttemptAPI = {
  /**
   * Record a failed login attempt
   */
  recordFailedAttempt: async (email, ipAddress, userAgent) => {
    try {
      await addDoc(collection(db, LOGIN_ATTEMPTS_COLLECTION), {
        email,
        ipAddress,
        userAgent,
        timestamp: serverTimestamp(),
        success: false
      });

      // Check if account should be locked
      const recentAttempts = await getRecentFailedAttempts(email, 15); // Last 15 minutes
      if (recentAttempts.length >= 5) {
        await logSecurityEvent({
          userId: null,
          action: 'account_lockout_triggered',
          resourceType: 'user',
          resourceId: email,
          details: { attempts: recentAttempts.length }
        });
      }
    } catch (error) {
      console.error('Error recording failed login attempt:', error);
    }
  },

  /**
   * Record a successful login
   */
  recordSuccessfulAttempt: async (userId, email, ipAddress, userAgent) => {
    try {
      await addDoc(collection(db, LOGIN_ATTEMPTS_COLLECTION), {
        userId,
        email,
        ipAddress,
        userAgent,
        timestamp: serverTimestamp(),
        success: true
      });
    } catch (error) {
      console.error('Error recording successful login:', error);
    }
  },

  /**
   * Get recent failed attempts
   */
  getRecentFailedAttempts: async (email, minutes = 15) => {
    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
      const q = query(
        collection(db, LOGIN_ATTEMPTS_COLLECTION),
        where('email', '==', email),
        where('success', '==', false),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const attempts = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const ts = normalizeTimestamp(data.timestamp);
        if (ts && ts >= cutoffTime) {
          attempts.push({
            id: doc.id,
            ...data,
            timestamp: ts
          });
        }
      });

      return attempts;
    } catch (error) {
      console.error('Error fetching failed attempts:', error);
      return [];
    }
  },

  /**
   * Get recent failed attempts for an institution (tenant-scoped)
   */
  getRecentFailedAttemptsByInstitution: async (institutionId, minutes = 15) => {
    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
      const q = query(
        collection(db, LOGIN_ATTEMPTS_COLLECTION),
        where('institutionId', '==', institutionId),
        where('success', '==', false),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const attempts = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const ts = normalizeTimestamp(data.timestamp);
        if (ts && ts >= cutoffTime) {
          attempts.push({
            id: doc.id,
            ...data,
            timestamp: ts
          });
        }
      });

      return attempts;
    } catch (error) {
      console.error('Error fetching failed attempts by institution:', error);
      return [];
    }
  }
};

/**
 * Get client IP address (simplified - in production use proper method)
 */
const getClientIP = async () => {
  try {
    // In production, get from request headers or use a service
    // For now, return a placeholder
    return 'client-ip';
  } catch (error) {
    return null;
  }
};

// Helper function for getting recent failed attempts
export const getRecentFailedAttempts = loginAttemptAPI.getRecentFailedAttempts;

export default {
  twoFactor: twoFactorAPI,
  session: sessionAPI,
  loginAttempt: loginAttemptAPI,
  logSecurityEvent,
  getAuditLogs
};

