/**
 * Data Encryption Helper Utility
 * SECURITY FIX: Provides automatic encryption/decryption for sensitive patient data
 */

import encryptionService from '../services/encryptionService';
import logger from './logger';

/**
 * Sensitive fields that should be encrypted in patient records
 */
const SENSITIVE_PATIENT_FIELDS = [
  // Personal Identification
  'nationalId',
  'ssn',
  'passportNumber',
  'driversLicense',
  
  // Contact Information (can be sensitive)
  'email',
  'phone',
  'phoneNumber',
  'emergencyContactPhone',
  'emergencyContactEmail',
  
  // Medical Information
  'allergies',
  'medicalConditions',
  'medicationNotes',
  'vitalSignsNotes',
  'appointmentNotes',
  'consultationNotes',
  'diagnosis',
  'treatmentPlan',
  'medicalHistory',
  'familyHistory',
  'surgicalHistory',
  
  // Financial Information
  'insuranceNumber',
  'insuranceProvider',
  'paymentMethod',
  'creditCardNumber',
  'bankAccountNumber',
  
  // Other Sensitive Data
  'address', // Can be sensitive for privacy
  'dateOfBirth', // PII
  'gender', // Can be sensitive
];

/**
 * Sensitive fields in payment/billing records
 */
const SENSITIVE_PAYMENT_FIELDS = [
  'creditCardNumber',
  'cvv',
  'expirationDate',
  'bankAccountNumber',
  'routingNumber',
  'billingAddress',
  'paymentMethod',
  'transactionId',
];

/**
 * Encrypt sensitive fields in patient data
 * @param {object} patientData - Patient data object
 * @param {array} additionalFields - Additional fields to encrypt
 * @returns {object} Patient data with encrypted sensitive fields
 */
export function encryptPatientData(patientData, additionalFields = []) {
  if (!patientData || typeof patientData !== 'object') {
    return patientData;
  }

  const fieldsToEncrypt = [...SENSITIVE_PATIENT_FIELDS, ...additionalFields];
  const encrypted = { ...patientData };
  const encryptedFields = [];

  for (const field of fieldsToEncrypt) {
    if (encrypted[field] !== undefined && encrypted[field] !== null && encrypted[field] !== '') {
      try {
        // Only encrypt if not already encrypted (check for encryption marker)
        if (typeof encrypted[field] === 'string' && !encrypted[field].startsWith('enc:')) {
          const valueToEncrypt = typeof encrypted[field] === 'object' 
            ? JSON.stringify(encrypted[field]) 
            : String(encrypted[field]);
          
          encrypted[field] = `enc:${encryptionService.encrypt(valueToEncrypt)}`;
          encryptedFields.push(field);
        }
      } catch (error) {
        logger.error(`Failed to encrypt field: ${field}`, { error: error.message });
        // Keep original value if encryption fails
      }
    }
  }

  // Mark document as encrypted
  if (encryptedFields.length > 0) {
    encrypted._encrypted = true;
    encrypted._encryptedFields = encryptedFields;
    encrypted._encryptionVersion = '1.0';
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in patient data
 * @param {object} encryptedPatientData - Encrypted patient data object
 * @returns {object} Patient data with decrypted sensitive fields
 */
export function decryptPatientData(encryptedPatientData) {
  if (!encryptedPatientData || typeof encryptedPatientData !== 'object') {
    return encryptedPatientData;
  }

  const decrypted = { ...encryptedPatientData };
  const encryptedFields = encryptedPatientData._encryptedFields || SENSITIVE_PATIENT_FIELDS;

  for (const field of encryptedFields) {
    if (decrypted[field] !== undefined && decrypted[field] !== null) {
      try {
        // Check if field is encrypted (has 'enc:' prefix)
        if (typeof decrypted[field] === 'string' && decrypted[field].startsWith('enc:')) {
          const encryptedValue = decrypted[field].substring(4); // Remove 'enc:' prefix
          const decryptedValue = encryptionService.decrypt(encryptedValue);
          
          // Try to parse as JSON, fallback to string
          try {
            decrypted[field] = JSON.parse(decryptedValue);
          } catch {
            decrypted[field] = decryptedValue;
          }
        }
      } catch (error) {
        logger.warn(`Failed to decrypt field: ${field}`, { error: error.message });
        // Keep encrypted value if decryption fails
      }
    }
  }

  // Remove encryption metadata
  delete decrypted._encrypted;
  delete decrypted._encryptedFields;
  delete decrypted._encryptionVersion;

  return decrypted;
}

/**
 * Encrypt payment/billing information
 * @param {object} paymentData - Payment data object
 * @returns {object} Payment data with encrypted sensitive fields
 */
export function encryptPaymentData(paymentData) {
  if (!paymentData || typeof paymentData !== 'object') {
    return paymentData;
  }

  const encrypted = { ...paymentData };

  for (const field of SENSITIVE_PAYMENT_FIELDS) {
    if (encrypted[field] !== undefined && encrypted[field] !== null && encrypted[field] !== '') {
      try {
        if (typeof encrypted[field] === 'string' && !encrypted[field].startsWith('enc:')) {
          encrypted[field] = `enc:${encryptionService.encrypt(String(encrypted[field]))}`;
        }
      } catch (error) {
        logger.error(`Failed to encrypt payment field: ${field}`, { error: error.message });
      }
    }
  }

  if (Object.keys(encrypted).some(key => encrypted[key]?.startsWith('enc:'))) {
    encrypted._encrypted = true;
    encrypted._encryptionVersion = '1.0';
  }

  return encrypted;
}

/**
 * Decrypt payment/billing information
 * @param {object} encryptedPaymentData - Encrypted payment data object
 * @returns {object} Payment data with decrypted sensitive fields
 */
export function decryptPaymentData(encryptedPaymentData) {
  if (!encryptedPaymentData || typeof encryptedPaymentData !== 'object') {
    return encryptedPaymentData;
  }

  const decrypted = { ...encryptedPaymentData };

  for (const field of SENSITIVE_PAYMENT_FIELDS) {
    if (decrypted[field] !== undefined && decrypted[field] !== null) {
      try {
        if (typeof decrypted[field] === 'string' && decrypted[field].startsWith('enc:')) {
          const encryptedValue = decrypted[field].substring(4);
          decrypted[field] = encryptionService.decrypt(encryptedValue);
        }
      } catch (error) {
        logger.warn(`Failed to decrypt payment field: ${field}`, { error: error.message });
      }
    }
  }

  delete decrypted._encrypted;
  delete decrypted._encryptionVersion;

  return decrypted;
}

/**
 * Check if data contains encrypted fields
 * @param {object} data - Data object to check
 * @returns {boolean} True if data contains encrypted fields
 */
export function isEncrypted(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return data._encrypted === true || 
         Object.values(data).some(value => 
           typeof value === 'string' && value.startsWith('enc:')
         );
}

/**
 * Encrypt specific field value
 * @param {any} value - Value to encrypt
 * @returns {string} Encrypted value with 'enc:' prefix
 */
export function encryptField(value) {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  try {
    const valueToEncrypt = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `enc:${encryptionService.encrypt(valueToEncrypt)}`;
  } catch (error) {
    logger.error('Failed to encrypt field value', { error: error.message });
    throw error;
  }
}

/**
 * Decrypt specific field value
 * @param {string} encryptedValue - Encrypted value with 'enc:' prefix
 * @returns {any} Decrypted value
 */
export function decryptField(encryptedValue) {
  if (!encryptedValue || typeof encryptedValue !== 'string') {
    return encryptedValue;
  }

  if (!encryptedValue.startsWith('enc:')) {
    return encryptedValue; // Not encrypted
  }

  try {
    const encrypted = encryptedValue.substring(4);
    const decrypted = encryptionService.decrypt(encrypted);
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    logger.error('Failed to decrypt field value', { error: error.message });
    throw error;
  }
}

export default {
  encryptPatientData,
  decryptPatientData,
  encryptPaymentData,
  decryptPaymentData,
  isEncrypted,
  encryptField,
  decryptField,
  SENSITIVE_PATIENT_FIELDS,
  SENSITIVE_PAYMENT_FIELDS
};

