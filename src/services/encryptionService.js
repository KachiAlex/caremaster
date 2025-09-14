import CryptoJS from 'crypto-js';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';

class EncryptionService {
  constructor() {
    // Use environment variable for encryption key, fallback to generated key
    this.encryptionKey = process.env.REACT_APP_ENCRYPTION_KEY || this.generateKey();
    this.algorithm = 'AES-256-CBC';
  }

  // Generate a secure encryption key
  generateKey() {
    const key = CryptoJS.lib.WordArray.random(256/8).toString();
    logger.warn('Using generated encryption key - set REACT_APP_ENCRYPTION_KEY in production');
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
    if (!key || key.length < 32) {
      return false;
    }
    
    // Check for sufficient entropy
    const hasUpperCase = /[A-Z]/.test(key);
    const hasLowerCase = /[a-z]/.test(key);
    const hasNumbers = /\d/.test(key);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(key);
    
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars;
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
