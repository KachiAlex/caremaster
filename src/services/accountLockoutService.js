/**
 * Account Lockout Service
 * Implements rate limiting, account lockout, and brute-force attack prevention
 */

import { db } from '../config/firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, addDoc } from 'backend/database';
import logger from '../utils/logger';

/**
 * Account Lockout Configuration
 */
const LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  failedAttemptResetHours: 24,
  progressiveLockout: true,
  suspiciousActivityThreshold: 10,
  emailNotificationRequired: true,
  ipBlockingEnabled: true
};

/**
 * Record failed login attempt
 */
export const recordFailedAttempt = async (email, ipAddress) => {
  try {
    const timestamp = Timestamp.now();
    
    // Add to failed attempts collection
    await addDoc(collection(db, 'failedLoginAttempts'), {
      email: email.toLowerCase(),
      ipAddress,
      timestamp,
      attemptTime: timestamp.toDate(),
      resolved: false
    });

    // Check if account should be locked
    await checkAndLockAccount(email, ipAddress);

    return { success: true };
  } catch (error) {
    logger.error('Failed to record login attempt', { email, error });
    throw error;
  }
};

/**
 * Get failed attempt count for email
 */
export const getFailedAttemptCount = async (email) => {
  try {
    const resetTime = new Date();
    resetTime.setHours(resetTime.getHours() - LOCKOUT_CONFIG.failedAttemptResetHours);

    const q = query(
      collection(db, 'failedLoginAttempts'),
      where('email', '==', email.toLowerCase()),
      where('resolved', '==', false),
      where('attemptTime', '>=', resetTime)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    logger.error('Failed to get failed attempt count', { email, error });
    return 0;
  }
};

/**
 * Get failed attempts from specific IP
 */
export const getFailedAttemptsFromIp = async (ipAddress) => {
  try {
    const resetTime = new Date();
    resetTime.setHours(resetTime.getHours() - 1); // Last hour

    const q = query(
      collection(db, 'failedLoginAttempts'),
      where('ipAddress', '==', ipAddress),
      where('resolved', '==', false),
      where('attemptTime', '>=', resetTime)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    logger.error('Failed to get IP attempts', { ipAddress, error });
    return 0;
  }
};

/**
 * Check and lock account if threshold exceeded
 */
export const checkAndLockAccount = async (email, ipAddress) => {
  try {
    const failedCount = await getFailedAttemptCount(email);
    const ipAttempts = await getFailedAttemptsFromIp(ipAddress);

    // Check if exceeded threshold
    if (failedCount >= LOCKOUT_CONFIG.maxFailedAttempts || 
        ipAttempts >= LOCKOUT_CONFIG.suspiciousActivityThreshold) {
      
      // Find user and lock account
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const lockUntil = new Date();
        lockUntil.setMinutes(
          lockUntil.getMinutes() + LOCKOUT_CONFIG.lockoutDurationMinutes
        );

        await updateDoc(userDoc.ref, {
          locked: true,
          lockReason: 'Too many failed login attempts',
          lockedUntil: Timestamp.fromDate(lockUntil),
          suspiciousIp: ipAddress,
          lockTimestamp: Timestamp.now(),
          lockNotificationSent: false
        });

        logger.warn('Account locked due to failed attempts', {
          email: email.substring(0, 50),
          failedCount,
          ipAttempts
        });

        // Send notification email
        if (LOCKOUT_CONFIG.emailNotificationRequired) {
          await sendAccountLockedNotification(email, lockUntil);
        }

        return { locked: true, lockUntil };
      }
    }

    return { locked: false };
  } catch (error) {
    logger.error('Error checking account lock status', { email, error });
    throw error;
  }
};

/**
 * Check if account is currently locked
 */
export const isAccountLocked = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('email', '==', email.toLowerCase()),
      where('locked', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { locked: false };
    }

    const userDoc = snapshot.docs[0].data();
    const lockUntil = userDoc.lockedUntil?.toDate();

    // Check if lockout period has expired
    if (lockUntil && lockUntil < new Date()) {
      // Unlock account
      await unlockAccount(email);
      return { locked: false };
    }

    return {
      locked: true,
      reason: userDoc.lockReason,
      lockedUntil: lockUntil,
      suspiciousIp: userDoc.suspiciousIp
    };
  } catch (error) {
    logger.error('Failed to check account lock status', { email, error });
    return { locked: false };
  }
};

/**
 * Unlock account manually (admin action)
 */
export const unlockAccount = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('User not found');
    }

    const userDoc = snapshot.docs[0];
    await updateDoc(userDoc.ref, {
      locked: false,
      lockReason: null,
      lockedUntil: null,
      unlockedBy: 'admin',
      unlockedAt: Timestamp.now()
    });

    logger.info('Account unlocked', { email: email.substring(0, 50) });

    return { success: true };
  } catch (error) {
    logger.error('Failed to unlock account', { email, error });
    throw error;
  }
};

/**
 * Clear failed attempts for email
 */
export const clearFailedAttempts = async (email) => {
  try {
    const q = query(
      collection(db, 'failedLoginAttempts'),
      where('email', '==', email.toLowerCase()),
      where('resolved', '==', false)
    );

    const snapshot = await getDocs(q);

    const updates = [];
    snapshot.forEach(docSnap => {
      updates.push(
        updateDoc(docSnap.ref, {
          resolved: true,
          resolvedAt: Timestamp.now(),
          reason: 'Successful login'
        })
      );
    });

    await Promise.all(updates);

    return { success: true, clearedCount: snapshot.size };
  } catch (error) {
    logger.error('Failed to clear attempted logins', { email, error });
    throw error;
  }
};

/**
 * Record successful login (clears failed attempts)
 */
export const recordSuccessfulLogin = async (userId, email, ipAddress, userAgent) => {
  try {
    // Clear failed attempts
    await clearFailedAttempts(email);

    // Update user last login
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await updateDoc(userDoc.ref, {
        lastLogin: Timestamp.now(),
        lastLoginIp: ipAddress,
        lastLoginUserAgent: userAgent,
        loginAttempts: 0,
        locked: false,
        lockReason: null
      });
    }

    // Log successful login
    await addDoc(collection(db, 'loginLogs'), {
      userId,
      email: email.toLowerCase(),
      ipAddress,
      userAgent,
      timestamp: Timestamp.now(),
      status: 'success'
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to record successful login', { email, error });
    throw error;
  }
};

/**
 * Detect suspicious activity patterns
 */
export const detectSuspiciousActivity = async (email, ipAddress) => {
  try {
    const suspiciousPatterns = [];

    // Check multiple failed attempts from same IP
    const ipAttempts = await getFailedAttemptsFromIp(ipAddress);
    if (ipAttempts > LOCKOUT_CONFIG.suspiciousActivityThreshold) {
      suspiciousPatterns.push('multiple_attempts_same_ip');
    }

    // Check rapid login attempts from different IPs
    const hourAgo = new Date();
    hourAgo.setHours(hourAgo.getHours() - 1);

    const q = query(
      collection(db, 'failedLoginAttempts'),
      where('email', '==', email.toLowerCase()),
      where('resolved', '==', false),
      where('attemptTime', '>=', hourAgo)
    );

    const snapshot = await getDocs(q);
    const ips = new Set(snapshot.docs.map(doc => doc.data().ipAddress));

    if (ips.size > 3) {
      suspiciousPatterns.push('multiple_ips');
    }

    if (snapshot.size > 10) {
      suspiciousPatterns.push('brute_force_attempt');
    }

    return {
      suspicious: suspiciousPatterns.length > 0,
      patterns: suspiciousPatterns,
      severity: suspiciousPatterns.length > 2 ? 'high' : 'medium'
    };
  } catch (error) {
    logger.error('Failed to detect suspicious activity', { email, error });
    return { suspicious: false, patterns: [] };
  }
};

/**
 * Block IP address
 */
export const blockIpAddress = async (ipAddress, reason = 'Suspicious activity') => {
  try {
    await addDoc(collection(db, 'blockedIps'), {
      ipAddress,
      reason,
      blockedAt: Timestamp.now(),
      active: true
    });

    logger.warn('IP address blocked', { ipAddress, reason });

    return { success: true };
  } catch (error) {
    logger.error('Failed to block IP address', { ipAddress, error });
    throw error;
  }
};

/**
 * Check if IP is blocked
 */
export const isIpBlocked = async (ipAddress) => {
  try {
    const q = query(
      collection(db, 'blockedIps'),
      where('ipAddress', '==', ipAddress),
      where('active', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.size > 0;
  } catch (error) {
    logger.error('Failed to check IP block status', { ipAddress, error });
    return false;
  }
};

/**
 * Send account locked notification email
 */
export const sendAccountLockedNotification = async (email, lockedUntil) => {
  try {
    // This should integrate with your email service
    const emailPayload = {
      to: email,
      subject: 'Your ElderX Account Has Been Locked',
      template: 'account_locked',
      data: {
        email,
        lockedUntil: lockedUntil.toLocaleString(),
        lockDurationMinutes: LOCKOUT_CONFIG.lockoutDurationMinutes,
        supportLink: 'https://support.elderx.com',
        unblockLink: `https://app.elderx.com/unlock?email=${email}`
      }
    };

    // Send via Firebase Cloud Function or email service
    // await sendEmail(emailPayload);

    logger.info('Account locked notification queued', { email: email.substring(0, 50) });

    return { success: true };
  } catch (error) {
    logger.error('Failed to send account locked notification', { email, error });
    // Don't throw - this shouldn't block the lock operation
    return { success: false };
  }
};

/**
 * Get admin dashboard security stats
 */
export const getSecurityStats = async () => {
  try {
    // Locked accounts
    const lockedQ = query(
      collection(db, 'users'),
      where('locked', '==', true)
    );
    const lockedSnapshot = await getDocs(lockedQ);

    // Recent failed attempts (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const failedQ = query(
      collection(db, 'failedLoginAttempts'),
      where('resolved', '==', false),
      where('attemptTime', '>=', oneDayAgo)
    );
    const failedSnapshot = await getDocs(failedQ);

    // Blocked IPs
    const blockedQ = query(
      collection(db, 'blockedIps'),
      where('active', '==', true)
    );
    const blockedSnapshot = await getDocs(blockedQ);

    return {
      lockedAccounts: lockedSnapshot.size,
      failedAttemptsLast24h: failedSnapshot.size,
      blockedIps: blockedSnapshot.size,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get security stats', { error });
    throw error;
  }
};

export default {
  recordFailedAttempt,
  getFailedAttemptCount,
  getFailedAttemptsFromIp,
  checkAndLockAccount,
  isAccountLocked,
  unlockAccount,
  clearFailedAttempts,
  recordSuccessfulLogin,
  detectSuspiciousActivity,
  blockIpAddress,
  isIpBlocked,
  sendAccountLockedNotification,
  getSecurityStats,
  LOCKOUT_CONFIG
};
