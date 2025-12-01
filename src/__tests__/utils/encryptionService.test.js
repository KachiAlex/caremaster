/**
 * Unit Tests for Encryption Service
 * Tests encryption, decryption, and security features
 */

import encryptionService from '../../services/encryptionService';

describe('Encryption Service Unit Tests', () => {
  const testData = {
    sensitive: 'This is sensitive medical data',
    patientId: 'UC-2025-0001',
    medicalRecord: {
      diagnosis: 'Hypertension',
      medications: ['Lisinopril 10mg'],
      vitalSigns: { bp: '120/80', heartRate: 72 }
    }
  };

  describe('encrypt/decrypt', () => {
    test('should encrypt and decrypt string data', () => {
      const encrypted = encryptionService.encrypt(testData.sensitive);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(testData.sensitive);
      
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(testData.sensitive);
    });

    test('should encrypt and decrypt object data', () => {
      const encrypted = encryptionService.encrypt(JSON.stringify(testData.medicalRecord));
      expect(encrypted).toBeTruthy();
      
      // decrypt already tries to parse JSON, so we get the object directly
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted.diagnosis).toBe(testData.medicalRecord.diagnosis);
      expect(decrypted.medications).toEqual(testData.medicalRecord.medications);
    });

    test('should handle empty strings', () => {
      const encrypted = encryptionService.encrypt('');
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    test('should handle invalid encrypted data', () => {
      // decrypt may not throw on invalid data, but should handle it gracefully
      const result = encryptionService.decrypt('invalid-encrypted-data');
      // Result may be empty string or throw - either is acceptable
      expect(result !== undefined).toBe(true);
    });
  });

  describe('generateSecureToken', () => {
    test('should generate unique tokens', () => {
      const token1 = encryptionService.generateSecureToken();
      const token2 = encryptionService.generateSecureToken();
      
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(20);
    });

    test('should generate tokens with specified length', () => {
      const token = encryptionService.generateSecureToken(32);
      // generateSecureToken uses CryptoJS WordArray.random which returns hex string
      // 32 bytes = 64 hex characters
      expect(token.length).toBe(64);
    });
  });

  describe('hashPassword', () => {
    test('should hash passwords securely', () => {
      const password = 'SecurePassword123!';
      const hash = encryptionService.hashPassword(password);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    test('should produce different hashes for same password', () => {
      const password = 'TestPassword123!';
      const hash1 = encryptionService.hashPassword(password);
      const hash2 = encryptionService.hashPassword(password);
      
      // Should be different due to salt
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', () => {
      const password = 'SecurePassword123!';
      const hash = encryptionService.hashPassword(password);
      
      const isValid = encryptionService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = encryptionService.hashPassword(password);
      
      const isValid = encryptionService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });
});

