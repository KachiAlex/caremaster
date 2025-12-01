/**
 * Secure Password Authentication Utility
 * SECURITY FIX: Replaces plain text password comparison with secure hashing
 */

import encryptionService from '../services/encryptionService';
import logger from '../utils/logger';

/**
 * Verify password securely using hashed comparison
 * Supports both hashed passwords (new) and plain text passwords (legacy migration)
 */
export async function verifyPasswordSecure(inputPassword, storedPassword) {
  try {
    if (!inputPassword || !storedPassword) {
      return false;
    }

    // Check if stored password is already hashed (format: salt:hash)
    if (storedPassword.includes(':')) {
      // New format: hashed password
      return encryptionService.verifyPassword(inputPassword, storedPassword);
    } else {
      // Legacy format: plain text password (for migration)
      // SECURITY: This is temporary for backward compatibility
      // TODO: Migrate all plain text passwords to hashed format
      logger.warn('⚠️ SECURITY WARNING: Plain text password detected. Migration needed.');
      
      // For now, compare and immediately hash if match (one-time migration)
      if (storedPassword === inputPassword) {
        // Hash the password for future use
        const hashedPassword = encryptionService.hashPassword(inputPassword);
        logger.info('Password matched - returning hash for migration');
        return { 
          verified: true, 
          needsMigration: true, 
          hashedPassword 
        };
      }
      return false;
    }
  } catch (error) {
    logger.error('Password verification failed', { error });
    return false;
  }
}

/**
 * Hash password for secure storage
 */
export function hashPasswordForStorage(password) {
  if (!password) {
    throw new Error('Password is required');
  }
  return encryptionService.hashPassword(password);
}

/**
 * Check if password needs migration (is plain text)
 */
export function passwordNeedsMigration(storedPassword) {
  return storedPassword && !storedPassword.includes(':');
}

export default {
  verifyPasswordSecure,
  hashPasswordForStorage,
  passwordNeedsMigration
};

