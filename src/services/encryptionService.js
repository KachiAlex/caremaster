import CryptoJS from 'crypto-js';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';

class EncryptionService {
  constructor() {
    const envKey = process.env.REACT_APP_ENCRYPTION_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!envKey) {
      // Degrade gracefully — don't crash the entire app
      this.encryptionKey = this.generateKey();
      const msg = isProduction
        ? 'CRITICAL: REACT_APP_ENCRYPTION_KEY missing in production — using ephemeral key. Encrypted data will not persist across sessions.'
        : 'Using generated encryption key in development. Set REACT_APP_ENCRYPTION_KEY for production.';
      logger.warn(msg);
    } else {
      if (!this.validateKeyStrength(envKey)) {
        logger.warn('Encryption key may be weak. Consider using a stronger key.');
      }
      this.encryptionKey = envKey;
    }

    this.algorithm = 'AES-256-CBC';
  }

  // Generate a secure encryption key (development only)
  generateKey() {
    const key = CryptoJS.lib.WordArray.random(256/8).toString();
    return key;
  }

  // Encrypt sensitive data
  encrypt(data) {
    try {
      if (!data) return data;
      
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(dataString, this.encryptionKey).toString();
      
      logger.debug('Data encrypted successfully', { 
        dataType: typeof data,
        encryptedLength: encrypted.length 
      });
      
      return encrypted;
    } catch (error) {
      logger.error('Encryption failed', { error, dataType: typeof data });
      errorHandler.handleError(error, { context: 'data_encryption' });
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    try {
      if (!encryptedData) return encryptedData;
      
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    } catch (error) {
      logger.error('Decryption failed', { error });
      errorHandler.handleError(error, { context: 'data_decryption' });
      throw new Error('Failed to decrypt data');
    }
  }

  // Encrypt health data fields
  encryptHealthData(healthData) {
    const sensitiveFields = [
      'allergies',
      'medicalConditions',
      'medicationNotes',
      'vitalSignsNotes',
      'appointmentNotes',
      'emergencyContactPhone',
      'primaryCareDoctor'
    ];

    const encrypted = { ...healthData };
    
    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    });

    return encrypted;
  }

  // Decrypt health data fields
  decryptHealthData(encryptedHealthData) {
    const sensitiveFields = [
      'allergies',
      'medicalConditions',
      'medicationNotes',
      'vitalSignsNotes',
      'appointmentNotes',
      'emergencyContactPhone',
      'primaryCareDoctor'
    ];

    const decrypted = { ...encryptedHealthData };
    
    sensitiveFields.forEach(field => {
      if (decrypted[field]) {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          logger.warn(`Failed to decrypt field: ${field}`, { error });
          // Keep encrypted value if decryption fails
        }
      }
    });

    return decrypted;
  }

  // Hash sensitive data for searching (one-way)
  hash(data) {
    try {
      return CryptoJS.SHA256(data).toString();
    } catch (error) {
      logger.error('Hashing failed', { error });
      errorHandler.handleError(error, { context: 'data_hashing' });
      throw new Error('Failed to hash data');
    }
  }

  // Generate secure random token
  generateSecureToken(length = 32) {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  // Encrypt file data
  encryptFile(fileData) {
    try {
      const encrypted = CryptoJS.AES.encrypt(fileData, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      logger.error('File encryption failed', { error });
      errorHandler.handleError(error, { context: 'file_encryption' });
      throw new Error('Failed to encrypt file');
    }
  }

  // Decrypt file data
  decryptFile(encryptedFileData) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedFileData, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      logger.error('File decryption failed', { error });
      errorHandler.handleError(error, { context: 'file_decryption' });
      throw new Error('Failed to decrypt file');
    }
  }

  // Validate encryption key strength
  validateKeyStrength(key) {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    // Minimum length requirement (256 bits = 32 bytes, but base64 encoded is longer)
    if (key.length < 32) {
      return false;
    }
    
    // Check for sufficient entropy (at least 3 of 4 character types)
    const hasUpperCase = /[A-Z]/.test(key);
    const hasLowerCase = /[a-z]/.test(key);
    const hasNumbers = /\d/.test(key);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/]/.test(key);
    
    const entropyScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;
    
    // Require at least 3 character types for strong key
    return entropyScore >= 3;
  }
  
  // Hash password securely (for custom auth - one-way hash)
  hashPassword(password) {
    try {
      if (!password) {
        throw new Error('Password is required');
      }
      
      // Use PBKDF2 for password hashing (more secure than SHA)
      const salt = CryptoJS.lib.WordArray.random(128/8);
      const iterations = 10000; // Number of iterations
      const keySize = 256/32; // Key size in words
      
      const hash = CryptoJS.PBKDF2(password, salt, {
        keySize: keySize,
        iterations: iterations
      });
      
      // Return salt and hash combined (salt:hash format)
      return salt.toString() + ':' + hash.toString();
    } catch (error) {
      logger.error('Password hashing failed', { error });
      errorHandler.handleError(error, { context: 'password_hashing' });
      throw new Error('Failed to hash password');
    }
  }
  
  // Verify password against hash
  verifyPassword(password, hashWithSalt) {
    try {
      if (!password || !hashWithSalt) {
        return false;
      }
      
      const [saltString, hashString] = hashWithSalt.split(':');
      if (!saltString || !hashString) {
        return false;
      }
      
      const salt = CryptoJS.enc.Hex.parse(saltString);
      const iterations = 10000;
      const keySize = 256/32;
      
      const hash = CryptoJS.PBKDF2(password, salt, {
        keySize: keySize,
        iterations: iterations
      });
      
      return hash.toString() === hashString;
    } catch (error) {
      logger.error('Password verification failed', { error });
      return false;
    }
  }

  // Rotate encryption key (for key rotation)
  rotateKey(newKey) {
    if (!this.validateKeyStrength(newKey)) {
      throw new Error('New encryption key does not meet security requirements');
    }
    
    this.encryptionKey = newKey;
    logger.info('Encryption key rotated successfully');
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

export default encryptionService;
