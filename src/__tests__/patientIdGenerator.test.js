/**
 * Unit Tests for Client ID Generator
 * Tests the generation and validation of simple, memorable Client IDs
 */

import { generateClientId, isValidPatientId, extractYearFromPatientId } from '../utils/clientIdGenerator';
import { collection, getDocs, query, where, orderBy, limit, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Mock Firebase Firestore
jest.mock('../firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn()
}));

describe('Client ID Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidPatientId', () => {
    test('should validate correct Client ID format (UC-YYYY-NNNN)', () => {
      expect(isValidPatientId('UC-2025-0001')).toBe(true);
      expect(isValidPatientId('UC-2025-1234')).toBe(true);
      expect(isValidPatientId('UC-2024-9999')).toBe(true);
    });

    test('should validate institution-specific format (UC-XXXX-YYYY-NNNN)', () => {
      expect(isValidPatientId('UC-HOSP-2025-0001')).toBe(true);
      expect(isValidPatientId('UC-GEN-2025-0001')).toBe(true);
      expect(isValidPatientId('UC-ABC-2025-1234')).toBe(true);
    });

    test('should reject invalid formats', () => {
      expect(isValidPatientId('UC-2025-001')).toBe(false); // Too few digits
      expect(isValidPatientId('UC-25-0001')).toBe(false); // Wrong year format
      expect(isValidPatientId('UC-2025-00001')).toBe(false); // Too many digits
      expect(isValidPatientId('CM-2025-0001')).toBe(false); // Wrong prefix
      expect(isValidPatientId('UC-2025')).toBe(false); // Missing number
      expect(isValidPatientId('')).toBe(false); // Empty string
      expect(isValidPatientId(null)).toBe(false); // Null
      expect(isValidPatientId(undefined)).toBe(false); // Undefined
      expect(isValidPatientId('invalid')).toBe(false); // Invalid format
    });
  });

  describe('extractYearFromPatientId', () => {
    test('should extract year from standard format', () => {
      expect(extractYearFromPatientId('UC-2025-0001')).toBe(2025);
      expect(extractYearFromPatientId('UC-2024-1234')).toBe(2024);
    });

    test('should extract year from institution format', () => {
      expect(extractYearFromPatientId('UC-HOSP-2025-0001')).toBe(2025);
      expect(extractYearFromPatientId('UC-GEN-2024-1234')).toBe(2024);
    });

    test('should return null for invalid IDs', () => {
      expect(extractYearFromPatientId('invalid')).toBe(null);
      expect(extractYearFromPatientId('UC-2025')).toBe(null);
      expect(extractYearFromPatientId('')).toBe(null);
    });
  });

  describe('generateClientId', () => {
    test('should generate Client ID in correct format', async () => {
      // Mock empty query result (no existing clients)
      const mockQuerySnapshot = {
        forEach: jest.fn() // No clients, so forEach does nothing
      };

      getDocs.mockResolvedValue(mockQuerySnapshot);
      collection.mockReturnValue({});

      const clientId = await generateClientId();

      expect(isValidPatientId(clientId)).toBe(true);
      expect(clientId).toMatch(/^UC-\d{4}-\d{4}$/);
      expect(clientId.startsWith('UC-')).toBe(true);
    });

    test('should generate sequential IDs', async () => {
      const currentYear = new Date().getFullYear();
      const prefix = `UC-${currentYear}`;

      // Mock first call - no existing clients
      const mockEmptySnapshot = {
        forEach: jest.fn() // No clients
      };

      // Mock second call - one existing Client
      const mockOnePatientSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            data: () => ({ clientId: `${prefix}-0001` })
          });
        })
      };

      getDocs
        .mockResolvedValueOnce(mockEmptySnapshot)
        .mockResolvedValueOnce(mockOnePatientSnapshot);

      collection.mockReturnValue({});

      const firstId = await generateClientId();
      expect(firstId).toBe(`${prefix}-0001`);

      const secondId = await generateClientId();
      expect(secondId).toBe(`${prefix}-0002`);
    });

    test('should generate ID with institution code when provided', async () => {
      const institutionId = 'test-institution-123';
      const currentYear = new Date().getFullYear();

      // Mock institution document
      const mockInstitutionDoc = {
        exists: () => true,
        data: () => ({ code: 'HOSP' })
      };

      getDoc.mockResolvedValue(mockInstitutionDoc);

      // Mock empty query result
      const mockQuerySnapshot = {
        forEach: jest.fn() // No clients
      };

      getDocs.mockResolvedValue(mockQuerySnapshot);
      collection.mockReturnValue({});
      doc.mockReturnValue({});

      const clientId = await generateClientId(institutionId);

      expect(isValidPatientId(clientId)).toBe(true);
      expect(clientId).toMatch(/^UC-HOSP-\d{4}-\d{4}$/);
    });

    test('should handle errors gracefully', async () => {
      getDocs.mockRejectedValue(new Error('Firestore error'));

      collection.mockReturnValue({});

      await expect(generateClientId()).rejects.toThrow();
    });

    test('should increment from highest existing number', async () => {
      const currentYear = new Date().getFullYear();
      const prefix = `UC-${currentYear}`;

      // Mock query with existing Client ID UC-2025-0042
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            data: () => ({ clientId: `${prefix}-0042` })
          });
        })
      };

      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});

      const clientId = await generateClientId();

      expect(clientId).toBe(`${prefix}-0043`);
    });
  });
});

